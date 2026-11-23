"""Append-only, resumable computational evolution of the Cupwake circuit.

No scheduler, network client, model call, host authority or story-canon effect is
implemented here.  A completed pass means the documented deterministic predicate
ran over 1,728 × (144 + 12) positions.  It never means an independent semantic
review, a resident wake, a completed implementation, or a successful delivery.

The source edition is immutable.  Evidence revision events can invalidate derived
views, but cannot rewrite a source definition, source role, or proposed mode.
"""
from __future__ import annotations

from collections import Counter, deque
from contextlib import contextmanager
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import struct
from typing import Any, Iterable

import engine.circuit as source_circuit
from engine.circuit import (CircuitError, HOUSES, NODES, SPHERES,
                            _plain, _validate_lenses, validate_registry)

SOURCE_SHA256 = "07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6"
SOURCE_EDITION = "Ariadne v0.7"
CATALOG_SHA256 = "2540f702c020efbfaee0532e84face21394860e57e91749bf36f2b1a3f3c2843"
ZERO_HASH = "0" * 64
SCHEMA = "cupwake.evolution.v1"
PASS_NAMES = (
    "source_identity", "scope_separation", "sphere_role_axis",
    "initiative_mode_routes", "typed_relation_candidates", "dependency_closure",
    "cascade_invalidation", "version_consistency", "four_system_intentions",
    "retry_replay_contract", "telescopic_aggregation", "reproducible_seal",
)
PLATFORMS = ("ATLAS", "ARIADNE", "SWARMCHAT", "IRON_EMPIRE")
MODES = frozenset({"WORK", "PLAY", "SOCIAL", "IMAGINE", "DREAM", "QUIET"})
HEX64 = re.compile(r"^[0-9a-f]{64}$")
SAFE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$")
_TOKEN = re.compile(r"[^\W_]+", re.UNICODE)
_STOP = frozenset("a an and are as at be by for from has have in is it its of on or that the their this to was were what which with whose within will does do how any all other source node sphere house questions methods observations operational artifacts primary focus preserve connections specialization specializations".split())


class EvolutionError(ValueError):
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


def require(value: bool, code: str) -> None:
    if not value:
        raise EvolutionError(code)


def canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def digest(value: Any) -> str:
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def tokens(value: str) -> frozenset[str]:
    return frozenset(x for x in _TOKEN.findall(value.casefold()) if len(x) > 2 and x not in _STOP)


def strict_json(raw: bytes) -> Any:
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, "DUPLICATE_JSON_KEY")
            result[key] = value
        return result
    try:
        value = json.loads(raw, object_pairs_hook=pairs)
        _plain(value)
        return value
    except EvolutionError:
        raise
    except (ValueError, UnicodeError, CircuitError):
        raise EvolutionError("INVALID_JSON") from None


def _scope_code(affirmative: frozenset, exclusions: frozenset, query: frozenset) -> int:
    """0 no lexical match; 1 affirmative; 2 exclusion; 3 mixed. No semantics."""
    return int(bool(affirmative & query)) | (int(bool(exclusions & query)) << 1)


class EvolutionEngine:
    """An edition-bound local computation store, with explicit repeat cycles.

    ``run_all`` resumes the currently open cycle and is a no-op when that cycle
    is already sealed.  Start another twelve passes explicitly with
    ``begin_cycle``.  SQLite BEGIN IMMEDIATE and expected-head leases serialize
    local writers.  The unsigned hash chain is an integrity check, not identity
    authentication or a defense against an attacker who rewrites the whole DB.
    """

    def __init__(self, db_path: str | Path, registry: dict, lenses: dict,
                 original_source_bytes: bytes, catalog_bytes: bytes,
                 *, dependencies: dict[str, list[str]] | None = None):
        require(type(original_source_bytes) is bytes, "ORIGINAL_BYTES_REQUIRED")
        require(type(catalog_bytes) is bytes, "CATALOG_BYTES_REQUIRED")
        # Freeze caller-owned mutable containers before retaining their values.
        try:
            _plain(registry)
            _plain(lenses)
            registry = strict_json(canonical(registry).encode("utf-8"))
            lenses = strict_json(canonical(lenses).encode("utf-8"))
        except CircuitError as exc:
            raise EvolutionError(exc.code) from None
        try:
            self.index = validate_registry(registry, expected_source_sha256=SOURCE_SHA256,
                expected_edition=SOURCE_EDITION, original_source_bytes=original_source_bytes)
            self.lenses = _validate_lenses(lenses)
        except CircuitError as exc:
            raise EvolutionError(exc.code) from None
        require(hashlib.sha256(catalog_bytes).hexdigest() == CATALOG_SHA256, "CATALOG_BYTES_DIGEST_DRIFT")
        catalog = strict_json(catalog_bytes)
        require(catalog.get("sourceRegistryDigest") == SOURCE_SHA256, "CATALOG_SOURCE_DRIFT")
        require(catalog.get("sourceRegistryEdition") == SOURCE_EDITION, "CATALOG_EDITION_DRIFT")
        require(type(catalog.get("items")) is list and len(catalog["items"]) == 144, "CATALOG_COUNT")
        self.proposals = {}
        for item in catalog["items"]:
            require(type(item) is dict and item.get("sphere") in SPHERES, "CATALOG_SPHERE")
            require(item["sphere"] not in self.proposals, "CATALOG_DUPLICATE")
            require(item.get("suggestedMode") in MODES, "CATALOG_MODE")
            require(item.get("status") == "PROPOSED_NOT_IMPLEMENTED", "CATALOG_PROMOTION")
            self.proposals[item["sphere"]] = item
        require(set(self.proposals) == set(SPHERES), "CATALOG_COVERAGE")
        # Match the complete referenced proposal, not just its coordinate.
        for key, lens in self.lenses["spheres"].items():
            require(lens.get("referenceProposal") == self.proposals[key], "LENS_PROPOSAL_DRIFT")
            require(lens.get("sourceCatalogSha256") == CATALOG_SHA256, "LENS_CATALOG_PIN")

        self.original = strict_json(original_source_bytes)
        self.nodes = self.index["nodes"]
        self.node_ids = tuple(NODES)
        self.lens_ids = tuple(SPHERES) + tuple(HOUSES)
        self.lens_roles = [self.index["spheres"][x]["role"] for x in SPHERES] + ["HOUSE"] * 12
        self.lens_tokens = [tokens(self.lenses["spheres"][x]["question"]) for x in SPHERES] + [tokens(self.lenses["houses"][x]["question"]) for x in HOUSES]
        self.scope = {key: (tokens(node["definition"] + " " + node.get("includes", "")),
                            tokens(node.get("excludes", ""))) for key, node in self.nodes.items()}
        self.original_record_digests = {key: digest(self.original["nodes"][key]) for key in NODES}
        self.normalized_record_digests = {key: digest(self.nodes[key]) for key in NODES}
        self.dependencies, self.dependents, self.ancestors = self._dependencies(dependencies or {})
        self.implementation_digest = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
        self.validation_implementation_digest = hashlib.sha256(Path(source_circuit.__file__).read_bytes()).hexdigest()
        self.input_digest = digest({"schema": SCHEMA, "source": SOURCE_SHA256,
            "registry": self.index["normalizedDigest"], "catalog": CATALOG_SHA256,
            "lenses": digest(lenses), "dependencies": self.dependencies,
            "implementationSha256": self.implementation_digest,
            "sourceValidatorSha256": self.validation_implementation_digest})
        self.run_id = "CWE-" + self.input_digest[:24]
        self.path = Path(db_path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(str(self.path), timeout=15, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA synchronous=FULL")
        try:
            self._initialize()
        except BaseException:
            self.db.close()
            raise

    def close(self):
        self.db.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    @contextmanager
    def _transaction(self):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            yield
            self.db.execute("COMMIT")
        except BaseException:
            self.db.execute("ROLLBACK")
            raise

    def _initialize(self):
        # DDL cannot be submitted through executescript inside a transaction.
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY,kind TEXT NOT NULL,
          event_key TEXT UNIQUE NOT NULL,previous_hash TEXT NOT NULL,event_hash TEXT UNIQUE NOT NULL,body TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS cycles(cycle INTEGER PRIMARY KEY,cycle_id TEXT UNIQUE NOT NULL,
          input_digest TEXT NOT NULL,status TEXT NOT NULL,completed_passes INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS passes(pass_id INTEGER PRIMARY KEY,cycle INTEGER NOT NULL REFERENCES cycles(cycle),
          stage INTEGER NOT NULL,name TEXT NOT NULL,event_hash TEXT NOT NULL,receipt TEXT NOT NULL,UNIQUE(cycle,stage));
        CREATE TABLE IF NOT EXISTS node_passes(pass_id INTEGER NOT NULL REFERENCES passes(pass_id) DEFERRABLE INITIALLY DEFERRED,
          node_id TEXT NOT NULL,previous_hash TEXT NOT NULL,result_hash TEXT NOT NULL,result_json TEXT NOT NULL,
          cell_vector BLOB NOT NULL,cell_digest TEXT NOT NULL,PRIMARY KEY(pass_id,node_id));
        CREATE TABLE IF NOT EXISTS aggregates(pass_id INTEGER NOT NULL REFERENCES passes(pass_id),
          kind TEXT NOT NULL,scope_id TEXT NOT NULL,children INTEGER NOT NULL,content_hash TEXT NOT NULL,
          PRIMARY KEY(pass_id,kind,scope_id));
        CREATE TABLE IF NOT EXISTS overlays(kind TEXT NOT NULL,scope_id TEXT NOT NULL,revision TEXT NOT NULL,
          event_key TEXT NOT NULL,PRIMARY KEY(kind,scope_id));
        CREATE TABLE IF NOT EXISTS invalidations(event_key TEXT PRIMARY KEY,body TEXT NOT NULL);
        """)
        with self._transaction():
            found = self.db.execute("SELECT value FROM metadata WHERE key='input_digest'").fetchone()
            if found:
                require(found[0] == self.input_digest, "INPUT_BUNDLE_DRIFT")
                require(self._get("schema") == SCHEMA, "SCHEMA_DRIFT")
            else:
                values = {"schema": SCHEMA, "input_digest": self.input_digest, "source_sha256": SOURCE_SHA256,
                          "catalog_sha256": CATALOG_SHA256, "head": ZERO_HASH, "run_id": self.run_id,
                          "implementation_sha256": self.implementation_digest,
                          "source_validator_sha256": self.validation_implementation_digest}
                self.db.executemany("INSERT INTO metadata VALUES(?,?)", values.items())

    @staticmethod
    def _dependencies(supplied):
        require(type(supplied) is dict, "DEPENDENCIES_TYPE")
        require(set(supplied) <= set(NODES), "DEPENDENCY_UNKNOWN_NODE")
        graph = {}
        children = {x: [] for x in NODES}
        for node in NODES:
            values = supplied.get(node, [])
            require(type(values) is list and all(type(v) is str and v in NODES and v != node for v in values), "DEPENDENCY_TARGET")
            require(len(values) == len(set(values)), "DEPENDENCY_DUPLICATE")
            graph[node] = sorted(values)
            for parent in values:
                children[parent].append(node)
        counts = {x: len(graph[x]) for x in NODES}
        ready = deque(x for x in NODES if counts[x] == 0)
        order = []
        while ready:
            node = ready.popleft()
            order.append(node)
            for child in children[node]:
                counts[child] -= 1
                if counts[child] == 0:
                    ready.append(child)
        require(len(order) == 1728, "DEPENDENCY_CYCLE")
        ancestors = {x: set() for x in NODES}
        for node in order:
            for parent in graph[node]:
                ancestors[node].add(parent)
                ancestors[node].update(ancestors[parent])
        return graph, children, ancestors

    def _get(self, key):
        row = self.db.execute("SELECT value FROM metadata WHERE key=?", (key,)).fetchone()
        return row[0] if row else None

    @property
    def head(self):
        return self._get("head")

    def _lease(self, expected_head):
        if expected_head is not None:
            require(type(expected_head) is str and bool(HEX64.fullmatch(expected_head)), "INVALID_EXPECTED_HEAD")
            require(expected_head == self.head, "STALE_HEAD")

    def _event(self, kind, event_key, body):
        previous = self.head
        record = {"kind": kind, "eventKey": event_key, "previousHash": previous, "body": body}
        event_hash = digest(record)
        self.db.execute("INSERT INTO events(kind,event_key,previous_hash,event_hash,body) VALUES(?,?,?,?,?)",
                        (kind, event_key, previous, event_hash, canonical(body)))
        self.db.execute("UPDATE metadata SET value=? WHERE key='head'", (event_hash,))
        return event_hash

    def current_input_bundle_digest(self):
        overlays = [dict(x) for x in self.db.execute("SELECT kind,scope_id,revision FROM overlays ORDER BY kind,scope_id")]
        return digest({"frozenInputs": self.input_digest, "evidenceRevisions": overlays})

    def begin_cycle(self, cycle_id: str, *, expected_head: str | None = None,
                    input_bundle_digest: str | None = None):
        require(type(cycle_id) is str and bool(SAFE_ID.fullmatch(cycle_id)), "INVALID_CYCLE_ID")
        with self._transaction():
            existing = self.db.execute("SELECT * FROM cycles WHERE cycle_id=?", (cycle_id,)).fetchone()
            if existing:
                require(input_bundle_digest in (None, existing["input_digest"]), "CYCLE_ID_COLLISION")
                return dict(existing)
            self._lease(expected_head)
            last = self.db.execute("SELECT * FROM cycles ORDER BY cycle DESC LIMIT 1").fetchone()
            require(not last or last["status"] == "COMPLETE", "CYCLE_IN_PROGRESS")
            bundle = self.current_input_bundle_digest()
            require(input_bundle_digest in (None, bundle), "REVISION_BUNDLE_DRIFT")
            cycle = (last["cycle"] + 1) if last else 1
            self.db.execute("INSERT INTO cycles(cycle,cycle_id,input_digest,status) VALUES(?,?,?,'OPEN')", (cycle, cycle_id, bundle))
            self._event("BEGIN_CYCLE", "cycle:" + cycle_id,
                        {"cycle": cycle, "cycleId": cycle_id, "inputBundleDigest": bundle, "sourceSha256": SOURCE_SHA256,
                         "evidenceRevisions": [dict(x) for x in self.db.execute("SELECT kind,scope_id,revision FROM overlays ORDER BY kind,scope_id")]})
            return dict(self.db.execute("SELECT * FROM cycles WHERE cycle=?", (cycle,)).fetchone())

    def impact(self, changes: list[dict]):
        """Return the actual source hierarchy and reverse dependency closure.

        Revision IDs refer to new evidence/lens versions only.  They are not
        accepted source changes or an instruction to run any external system.
        """
        require(type(changes) is list and bool(changes), "CHANGES_REQUIRED")
        initial = set()
        normalized = []
        seen = set()
        for item in changes:
            require(type(item) is dict and set(item) == {"kind", "id", "revision"}, "CHANGE_FIELDS")
            kind, scope_id, revision = item["kind"], item["id"], item["revision"]
            require(type(revision) is str and bool(HEX64.fullmatch(revision)), "REVISION_DIGEST")
            require(type(kind) is str and type(scope_id) is str, "CHANGE_SCOPE")
            require((kind, scope_id) not in seen, "DUPLICATE_CHANGE_SCOPE")
            seen.add((kind, scope_id))
            if kind == "NODE":
                require(scope_id in NODES, "CHANGE_NODE")
                initial.add(scope_id)
            elif kind == "SPHERE":
                require(scope_id in SPHERES, "CHANGE_SPHERE")
                initial.update(x for x in NODES if x[:7] == scope_id)
            elif kind == "HOUSE":
                require(scope_id in HOUSES, "CHANGE_HOUSE")
                initial.update(x for x in NODES if x[:3] == scope_id)
            elif kind == "BUILD":
                require(scope_id == "BUILD", "CHANGE_BUILD")
                initial.update(NODES)
            else:
                raise EvolutionError("IMMUTABLE_SOURCE_OR_UNKNOWN_CHANGE_KIND")
            normalized.append({"kind": kind, "id": scope_id, "revision": revision})
        affected = set(initial)
        ready = deque(sorted(initial))
        while ready:
            current = ready.popleft()
            for child in self.dependents[current]:
                if child not in affected:
                    affected.add(child)
                    ready.append(child)
        return {"changes": sorted(normalized, key=lambda x: (x["kind"], x["id"])),
                "directNodes": sorted(initial), "dependentNodes": sorted(affected - initial),
                "nodes": sorted(affected), "spheres": sorted({x[:7] for x in affected}),
                "houses": sorted({x[:3] for x in affected}), "build": "BUILD",
                "effect": "DERIVED_VIEWS_INVALIDATED_SOURCE_UNCHANGED"}

    def invalidate(self, event_id: str, changes: list[dict], *, expected_head: str | None = None):
        require(type(event_id) is str and bool(SAFE_ID.fullmatch(event_id)), "INVALID_EVENT_ID")
        body = self.impact(changes)
        with self._transaction():
            previous = self.db.execute("SELECT body FROM invalidations WHERE event_key=?", (event_id,)).fetchone()
            if previous:
                require(previous[0] == canonical(body), "EVENT_ID_COLLISION")
                return body
            self._lease(expected_head)
            active = self.db.execute("SELECT 1 FROM cycles WHERE status='OPEN'").fetchone()
            require(not active, "REVISION_DURING_CYCLE")
            for item in body["changes"]:
                self.db.execute("INSERT INTO overlays VALUES(?,?,?,?) ON CONFLICT(kind,scope_id) DO UPDATE SET revision=excluded.revision,event_key=excluded.event_key",
                                (item["kind"], item["id"], item["revision"], event_id))
            self.db.execute("INSERT INTO invalidations VALUES(?,?)", (event_id, canonical(body)))
            self._event("INVALIDATE", "invalidation:" + event_id, body)
        return body

    def scope_match(self, node_id: str, query: str):
        require(node_id in self.nodes and type(query) is str, "INVALID_SCOPE_QUERY")
        affirmative, exclusions = self.scope[node_id]
        query_tokens = tokens(query)
        code = _scope_code(affirmative, exclusions, query_tokens)
        names = ("NO_SCOPE_TEXT_MATCH", "AFFIRMATIVE_TEXT_ONLY", "EXCLUSION_TEXT_ONLY", "MIXED_SCOPE_TEXT")
        return {"nodeId": node_id, "classification": names[code],
                "affirmativeMatches": sorted(affirmative & query_tokens),
                "exclusionMatches": sorted(exclusions & query_tokens),
                "semanticApproval": False, "workAuthority": False,
                "method": "LITERAL_CASEFOLDED_TOKEN_OVERLAP"}

    def _dirty(self):
        overlays = list(self.db.execute("SELECT kind,scope_id,revision FROM overlays"))
        if not overlays:
            return set(NODES)
        changes = [{"kind": x[0], "id": x[1], "revision": x[2]} for x in overlays]
        return set(self.impact(changes)["nodes"])

    def _node_result(self, node_id, cycle, stage, pass_id, bundle, previous, cell_digest):
        node = self.nodes[node_id]
        return {
            "nodeId": node_id, "sourceSha256": SOURCE_SHA256, "sourceEdition": SOURCE_EDITION,
            "originalRecordCanonicalSha256": self.original_record_digests[node_id],
            "originalDeclaredRecordSha256": node.get("declaredSourceRecordSha256"),
            "normalizedRecordSha256": self.normalized_record_digests[node_id],
            "sourceRole": node["role"], "sourceSuggestedMode": self.proposals[node["sphereId"]]["suggestedMode"],
            "initiativeRoute": "WORK_REVIEW_CANDIDATE" if self.proposals[node["sphereId"]]["suggestedMode"] == "WORK" else "HOLD_VOLUNTARY_MODE_SEPARATION",
            "independentNodeReview": "CANDIDATE_REQUIRES_SEPARATE_AUTHORIZATION",
            "cycle": cycle, "stage": stage, "passId": pass_id, "stageName": PASS_NAMES[stage-1],
            "inputBundleDigest": bundle, "previousNodeHash": previous, "cellDigest": cell_digest,
            "cellCount": 156, "sphereCells": 144, "houseCells": 12,
            "semanticStatus": "UNASSESSED_CANDIDATE", "implementationStatus": "NOT_IMPLEMENTED_BY_PASS",
            "sourceStatus": "EXACT_ORIGINAL_BYTES_VERIFIED", "deliveryStatus": "NOT_SENT",
        }

    def _stage_cells(self, stage, node_id, previous, dirty, bundle, cycle):
        node = self.nodes[node_id]
        node_role, sphere_id, house_id = node["role"], node["sphereId"], node["houseId"]
        mode = self.proposals[sphere_id]["suggestedMode"]
        own_work = mode == "WORK"
        positive, negative = self.scope[node_id]
        dependency_scopes = {x[:7] for x in self.ancestors[node_id]}
        dependency_houses = {x[:3] for x in self.ancestors[node_id]}
        dirty_spheres = {x[:7] for x in dirty} if stage == 7 else set()
        dirty_houses = {x[:3] for x in dirty} if stage == 7 else set()
        vector = []
        for index, lens_id in enumerate(self.lens_ids):
            sphere_lens = index < 144
            same_scope = lens_id == (sphere_id if sphere_lens else house_id)
            same_house = lens_id[:3] == house_id
            lens_role = self.lens_roles[index]
            lens_work = self.proposals[lens_id]["suggestedMode"] == "WORK" if sphere_lens else True
            if stage == 1:
                # 1=original pin;2=normalized pin retained;4=scope equality;8=house equality.
                value = 1 | 2 | (4 * same_scope) | (8 * same_house)
            elif stage == 2:
                value = _scope_code(positive, negative, self.lens_tokens[index])
            elif stage == 3:
                # Role axis belongs to the whole Sphere; method links need subjects.
                value = (1 if node_role == "DOMAIN" else 2) | (4 if lens_role == "DOMAIN" else 8 if lens_role == "META" else 16) | (32 * same_house)
            elif stage == 4:
                # Independent node Work review remains possible; initiative routes separate.
                value = int(own_work) | (int(lens_work) << 1) | 4
            elif stage == 5:
                # 1=own scope;2=method/subject candidate;3=cross-domain;4=cross-meta;5=House lens.
                value = (5 if not sphere_lens else 1 if same_scope else
                         2 if node_role != lens_role else 3 if node_role == "DOMAIN" else 4)
            elif stage == 6:
                relevant = lens_id in (dependency_scopes if sphere_lens else dependency_houses)
                value = int(relevant) | (2 * bool(self.ancestors[node_id])) | 4
            elif stage == 7:
                # Node and lens impact is data-derived, then telescoped to parent summaries.
                lens_dirty = lens_id in (dirty_spheres if sphere_lens else dirty_houses)
                value = int(node_id in dirty) | (2 * lens_dirty) | (4 * same_scope)
            elif stage == 8:
                value = int(bool(previous)) | (2 * bool(HEX64.fullmatch(bundle))) | (4 * (cycle >= 1)) | (8 * same_scope)
            elif stage == 9:
                # Four owner-local review intentions; optional initiative dispatch stays held.
                value = 15 | (16 * own_work) | (32 * lens_work)
            elif stage == 10:
                # Recorded states remain replayable candidates, with no delivery claim.
                value = int(bool(previous)) | 2 | (4 * (mode in MODES)) | (8 * (lens_role in {"DOMAIN", "META", "HOUSE"}))
            elif stage == 11:
                # Membership flags are reduced into source-hierarchy content hashes below.
                value = int(same_scope) | (2 * same_house) | (4 * (node_role == "META"))
            else:
                original = self.original["nodes"][node_id]
                value = int(bool(previous)) | (2 * (original["id"] == node_id)) | \
                        (4 * (node_role == ("DOMAIN" if int(sphere_id[5:7]) <= 7 else "META"))) | \
                        (8 * (mode in MODES)) | \
                        (16 * (node.get("declaredSourceRecordSha256") == original.get("source_record_sha256"))) | \
                        (32 * same_scope)
            vector.append(value)
        return struct.pack("<156H", *vector)

    def _pass_receipt(self, cycle, stage, pass_id, value_counts, vector_digest,
                      build_hash, previous_node_count, dirty_count, prior_passes_reverified):
        return {
            "schema": SCHEMA, "runId": self.run_id, "cycle": cycle["cycle"], "cycleId": cycle["cycle_id"],
            "stage": stage, "passId": pass_id, "name": PASS_NAMES[stage-1], "status": "COMPUTATIONAL_PASS_COMPLETE",
            "sourceSha256": SOURCE_SHA256, "inputBundleDigest": cycle["input_digest"],
                "implementationSha256": self.implementation_digest,
                "sourceValidatorSha256": self.validation_implementation_digest,
            "nodeRows": 1728, "spherePredicateEvaluations": 248832, "housePredicateEvaluations": 20736,
            "totalPredicateEvaluations": 269568, "storedCellVectors": 1728, "cellsPerVector": 156,
            "cellVectorBytes": 1728 * 312, "resultCodeCounts": {str(k): v for k, v in sorted(value_counts.items())},
            "cellMatrixSha256": vector_digest, "buildHash": build_hash,
            "sphereAggregates": 144, "houseAggregates": 12, "buildAggregates": 1,
            "priorNodeResultsReferenced": previous_node_count,
            "dirtyNodes": dirty_count, "actualModelInvocations": 0, "actualMacroturns": 0,
            "semanticAcceptances": 0, "implementedNodes": 0, "hostDeliveries": 0,
            "countMeaning": "FRESH_DETERMINISTIC_STAGE_PREDICATES_NOT_MODEL_TURNS_OR_SEMANTIC_REVIEWS",
            "priorPassesReverifiedForSeal": prior_passes_reverified,
        }

    def run_next(self, *, expected_head: str | None = None, fail_after_nodes: int | None = None):
        """Commit one complete pass or none. ``fail_after_nodes`` is fault injection."""
        require(fail_after_nodes is None or type(fail_after_nodes) is int and 1 <= fail_after_nodes <= 1728, "INVALID_FAULT_POINT")
        with self._transaction():
            self._lease(expected_head)
            cycle = self.db.execute("SELECT * FROM cycles ORDER BY cycle DESC LIMIT 1").fetchone()
            require(cycle is not None, "BEGIN_CYCLE_REQUIRED")
            if cycle["status"] == "COMPLETE":
                return None
            require(cycle["input_digest"] == self.current_input_bundle_digest(), "MID_CYCLE_INPUT_DRIFT")
            stage = cycle["completed_passes"] + 1
            pass_id = (cycle["cycle"] - 1) * 12 + stage
            # The sealing pass replays the prior persisted computations before
            # appending its own complete matrix. Replays are not extra passes.
            preseal = self.verify(expected_head=self.head) if stage == 12 else None
            previous_pass = pass_id - 1
            previous_hashes = {x["node_id"]: x["result_hash"] for x in self.db.execute("SELECT node_id,result_hash FROM node_passes WHERE pass_id=?", (previous_pass,))}
            require(not previous_pass or len(previous_hashes) == 1728, "PREVIOUS_PASS_COVERAGE")
            dirty = self._dirty()
            node_hashes = {}
            vector_hash = hashlib.sha256()
            value_counts = Counter()
            for ordinal, node_id in enumerate(NODES, 1):
                node = self.nodes[node_id]
                previous = previous_hashes.get(node_id, ZERO_HASH)
                vector = self._stage_cells(stage, node_id, previous, dirty, cycle["input_digest"], cycle["cycle"])
                cell_digest = hashlib.sha256(vector).hexdigest()
                vector_hash.update(node_id.encode("ascii") + vector)
                value_counts.update(struct.unpack("<156H", vector))
                result = self._node_result(node_id, cycle["cycle"], stage, pass_id,
                                           cycle["input_digest"], previous, cell_digest)
                result_hash = digest(result)
                node_hashes[node_id] = result_hash
                self.db.execute("INSERT INTO node_passes VALUES(?,?,?,?,?,?,?)",
                                (pass_id, node_id, previous, result_hash, canonical(result), vector, cell_digest))
                if fail_after_nodes == ordinal:
                    raise EvolutionError("INJECTED_FAILURE")

            sphere_hashes = {sphere: digest([[x, node_hashes[x]] for x in NODES if x[:7] == sphere]) for sphere in SPHERES}
            house_hashes = {house: digest([[x, sphere_hashes[x]] for x in SPHERES if x[:3] == house]) for house in HOUSES}
            build_hash = digest([[x, house_hashes[x]] for x in HOUSES])
            receipt = self._pass_receipt(cycle, stage, pass_id, value_counts, vector_hash.hexdigest(),
                                         build_hash, len(previous_hashes), len(dirty),
                                         preseal["passes"] if preseal else 0)
            event_hash = self._event("PASS", f"pass:{pass_id}", receipt)
            self.db.execute("INSERT INTO passes VALUES(?,?,?,?,?,?)",
                            (pass_id, cycle["cycle"], stage, PASS_NAMES[stage-1], event_hash, canonical(receipt)))
            self.db.executemany("INSERT INTO aggregates VALUES(?,?,?,?,?)",
                [(pass_id, "SPHERE", key, 12, value) for key, value in sphere_hashes.items()] +
                [(pass_id, "HOUSE", key, 12, value) for key, value in house_hashes.items()] +
                [(pass_id, "BUILD", "BUILD", 12, build_hash)])
            self.db.execute("UPDATE cycles SET completed_passes=?,status=? WHERE cycle=?",
                            (stage, "COMPLETE" if stage == 12 else "OPEN", cycle["cycle"]))
            return {**receipt, "receiptHash": event_hash}

    def run_all(self, *, cycle_id: str = "cycle-001", progress=None):
        if not self.db.execute("SELECT 1 FROM cycles").fetchone():
            self.begin_cycle(cycle_id, expected_head=self.head)
        outputs = []
        while True:
            result = self.run_next(expected_head=self.head)
            if result is None:
                break
            outputs.append(result)
            if progress is not None:
                progress(result)
        return outputs

    def outbox_slots(self) -> Iterable[dict]:
        last = self.db.execute("SELECT * FROM cycles ORDER BY cycle DESC LIMIT 1").fetchone()
        require(last is not None and last["status"] == "COMPLETE", "UNSEALED_CYCLE")
        pass_id = last["cycle"] * 12
        for node_id in NODES:
            for platform in PLATFORMS:
                yield {"nodeId": node_id, "passId": pass_id, "runId": self.run_id,
                       "platform": platform, "route": "NODE_WORK_REVIEW"}

    def summary(self):
        cycles = [dict(x) for x in self.db.execute("SELECT * FROM cycles ORDER BY cycle")]
        passes = self.db.execute("SELECT COUNT(*) FROM passes").fetchone()[0]
        rows = self.db.execute("SELECT COUNT(*) FROM node_passes").fetchone()[0]
        return {"schema": SCHEMA, "runId": self.run_id, "head": self.head,
                "sourceSha256": SOURCE_SHA256, "inputBundleDigest": self.current_input_bundle_digest(),
                "implementationSha256": self.implementation_digest,
                "sourceValidatorSha256": self.validation_implementation_digest,
                "cycles": cycles, "completedPasses": passes, "storedNodePassRows": rows,
                "storedCellVectorRows": rows, "actualPredicateEvaluations": rows * 156,
                "spherePredicateEvaluations": rows * 144, "housePredicateEvaluations": rows * 12,
                "canonicalNodes": 1728, "canonicalSpheres": 144, "canonicalHouses": 12,
                "domainNodes": 1008, "metaNodes": 720,
                "workInitiativeNodes": sum(self.proposals[x[:7]]["suggestedMode"] == "WORK" for x in NODES),
                "heldOptionalInitiativeNodes": sum(self.proposals[x[:7]]["suggestedMode"] != "WORK" for x in NODES),
                "actualModelInvocations": 0, "actualMacroturns": 0,
                "semanticAcceptances": 0, "implementedNodes": 0, "hostDeliveries": 0,
                "note": "Counts record deterministic source-bound computations; no execution authority is granted."}

    def verify(self, *, expected_head: str | None = None):
        """Recompute stored hashes, matrix contents and all hierarchical reductions."""
        self._lease(expected_head)
        expected_metadata = {"schema": SCHEMA, "input_digest": self.input_digest,
            "source_sha256": SOURCE_SHA256, "catalog_sha256": CATALOG_SHA256,
            "run_id": self.run_id, "implementation_sha256": self.implementation_digest,
            "source_validator_sha256": self.validation_implementation_digest}
        require(all(self._get(key) == value for key, value in expected_metadata.items()), "METADATA_PIN_DRIFT")
        require(self.db.execute("PRAGMA integrity_check").fetchone()[0] == "ok", "SQLITE_INTEGRITY")
        require(not self.db.execute("PRAGMA foreign_key_check").fetchall(), "SQLITE_FOREIGN_KEYS")
        previous = ZERO_HASH
        event_count = 0
        events = {}
        cycle_inputs = {}
        overlay_state = {}
        for row in self.db.execute("SELECT * FROM events ORDER BY seq"):
            require(row["seq"] == event_count + 1, "EVENT_SEQUENCE")
            require(row["kind"] in {"BEGIN_CYCLE", "INVALIDATE", "PASS"}, "EVENT_KIND")
            body = strict_json(row["body"].encode("utf-8"))
            require(row["previous_hash"] == previous, "EVENT_CHAIN_PREVIOUS")
            record = {"kind": row["kind"], "eventKey": row["event_key"], "previousHash": previous, "body": body}
            require(digest(record) == row["event_hash"], "EVENT_HASH")
            events[row["event_hash"]] = body
            if row["kind"] == "INVALIDATE":
                require(row["event_key"].startswith("invalidation:"), "INVALIDATION_EVENT_KEY")
                require(self.impact(body["changes"]) == body, "INVALIDATION_IMPACT_DRIFT")
                for item in body["changes"]:
                    overlay_state[(item["kind"], item["id"])] = item["revision"]
            elif row["kind"] == "BEGIN_CYCLE":
                require(set(body) == {"cycle", "cycleId", "inputBundleDigest", "sourceSha256", "evidenceRevisions"}, "CYCLE_EVENT_FIELDS")
                require(row["event_key"] == "cycle:" + body["cycleId"] and body["cycle"] == len(cycle_inputs) + 1, "CYCLE_EVENT_IDENTITY")
                require(body["sourceSha256"] == SOURCE_SHA256, "CYCLE_SOURCE_PIN")
                expected_overlay = [{"kind": k[0], "scope_id": k[1], "revision": v} for k, v in sorted(overlay_state.items())]
                require(body["evidenceRevisions"] == expected_overlay, "CYCLE_OVERLAY_HISTORY")
                require(body["inputBundleDigest"] == digest({"frozenInputs": self.input_digest, "evidenceRevisions": expected_overlay}), "CYCLE_INPUT_HASH")
                cycle_inputs[body["cycle"]] = body
            else:
                require(row["event_key"] == "pass:" + str(body.get("passId")), "PASS_EVENT_KEY")
            previous = row["event_hash"]
            event_count += 1
        require(previous == self.head, "HEAD_HASH")
        prior = {}
        pass_count = 0
        for row in self.db.execute("SELECT * FROM passes ORDER BY pass_id"):
            pass_count += 1
            require(row["pass_id"] == pass_count, "PASS_SEQUENCE")
            receipt = strict_json(row["receipt"].encode("utf-8"))
            require(events.get(row["event_hash"]) == receipt, "PASS_EVENT_BINDING")
            require(receipt["name"] == PASS_NAMES[row["stage"]-1], "PASS_STAGE_NAME")
            require(row["stage"] == (pass_count - 1) % 12 + 1 and row["cycle"] == (pass_count - 1) // 12 + 1, "PASS_STAGE_SEQUENCE")
            cycle_input = cycle_inputs.get(row["cycle"])
            require(cycle_input is not None and receipt["inputBundleDigest"] == cycle_input["inputBundleDigest"], "PASS_CYCLE_INPUT")
            revisions = cycle_input["evidenceRevisions"]
            dirty = set(self.impact([{"kind": x["kind"], "id": x["scope_id"], "revision": x["revision"]} for x in revisions])["nodes"]) if revisions else set(NODES)
            expected_ids = set(NODES)
            matrix_hash = hashlib.sha256()
            node_hashes = {}
            codes = Counter()
            for node_row in self.db.execute("SELECT * FROM node_passes WHERE pass_id=? ORDER BY node_id", (pass_count,)):
                node_id = node_row["node_id"]
                require(node_id in expected_ids, "NODE_COVERAGE")
                expected_ids.remove(node_id)
                value = strict_json(node_row["result_json"].encode("utf-8"))
                require(value["nodeId"] == node_id and value["passId"] == pass_count and value["stage"] == row["stage"] and value["cycle"] == row["cycle"], "NODE_PASS_IDENTITY")
                require(node_row["previous_hash"] == prior.get(node_id, ZERO_HASH) == value["previousNodeHash"], "NODE_CHAIN")
                require(value["sourceSha256"] == SOURCE_SHA256 and value["normalizedRecordSha256"] == self.normalized_record_digests[node_id] and value["originalRecordCanonicalSha256"] == self.original_record_digests[node_id], "NODE_SOURCE_PIN")
                require(value["sourceRole"] == self.nodes[node_id]["role"] and value["sourceSuggestedMode"] == self.proposals[node_id[:7]]["suggestedMode"], "NODE_SOURCE_ROLE_MODE")
                require(value["semanticStatus"] == "UNASSESSED_CANDIDATE" and value["implementationStatus"] == "NOT_IMPLEMENTED_BY_PASS" and value["deliveryStatus"] == "NOT_SENT", "FALSE_PROMOTION")
                vector = node_row["cell_vector"]
                require(type(vector) is bytes and len(vector) == 312, "CELL_VECTOR_SHAPE")
                expected_vector = self._stage_cells(row["stage"], node_id, prior.get(node_id, ZERO_HASH), dirty,
                                                    cycle_input["inputBundleDigest"], row["cycle"])
                require(vector == expected_vector, "CELL_PREDICATE_DRIFT")
                require(hashlib.sha256(vector).hexdigest() == node_row["cell_digest"] == value["cellDigest"], "CELL_HASH")
                expected_payload = self._node_result(node_id, row["cycle"], row["stage"], pass_count,
                                                     cycle_input["inputBundleDigest"], prior.get(node_id, ZERO_HASH),
                                                     hashlib.sha256(expected_vector).hexdigest())
                require(value == expected_payload, "NODE_PAYLOAD_DRIFT")
                require(digest(value) == node_row["result_hash"], "NODE_HASH")
                node_hashes[node_id] = node_row["result_hash"]
                codes.update(struct.unpack("<156H", vector))
                matrix_hash.update(node_id.encode("ascii") + vector)
            require(not expected_ids, "NODE_COVERAGE")
            require(matrix_hash.hexdigest() == receipt["cellMatrixSha256"], "MATRIX_HASH")
            require({str(k): v for k, v in sorted(codes.items())} == receipt["resultCodeCounts"], "CODE_COUNTS")
            require(receipt["totalPredicateEvaluations"] == 269568 and receipt["nodeRows"] == 1728, "EVALUATION_COUNTS")
            require(all(receipt[key] == 0 for key in ("actualModelInvocations", "actualMacroturns", "semanticAcceptances", "implementedNodes", "hostDeliveries")), "RECEIPT_FALSE_CLAIM")
            sphere_hashes = {key: digest([[x, node_hashes[x]] for x in NODES if x[:7] == key]) for key in SPHERES}
            house_hashes = {key: digest([[x, sphere_hashes[x]] for x in SPHERES if x[:3] == key]) for key in HOUSES}
            build_hash = digest([[x, house_hashes[x]] for x in HOUSES])
            require(build_hash == receipt["buildHash"], "BUILD_HASH")
            expected_receipt = self._pass_receipt(
                {"cycle": row["cycle"], "cycle_id": cycle_input["cycleId"], "input_digest": cycle_input["inputBundleDigest"]},
                row["stage"], pass_count, codes, matrix_hash.hexdigest(), build_hash,
                len(prior), len(dirty), pass_count - 1 if row["stage"] == 12 else 0)
            require(receipt == expected_receipt, "PASS_RECEIPT_DRIFT")
            aggregates = {(x["kind"], x["scope_id"]): (x["children"], x["content_hash"]) for x in self.db.execute("SELECT * FROM aggregates WHERE pass_id=?", (pass_count,))}
            expected = {("SPHERE", key): (12, val) for key, val in sphere_hashes.items()}
            expected.update({("HOUSE", key): (12, val) for key, val in house_hashes.items()})
            expected[("BUILD", "BUILD")] = (12, build_hash)
            require(aggregates == expected, "AGGREGATE_HASH")
            prior = node_hashes
        for cycle in self.db.execute("SELECT * FROM cycles ORDER BY cycle"):
            count = self.db.execute("SELECT COUNT(*) FROM passes WHERE cycle=?", (cycle["cycle"],)).fetchone()[0]
            require(count == cycle["completed_passes"] and cycle["status"] == ("COMPLETE" if count == 12 else "OPEN"), "CYCLE_STATUS")
            require(cycle["cycle"] in cycle_inputs and cycle["input_digest"] == cycle_inputs[cycle["cycle"]]["inputBundleDigest"], "CYCLE_INPUT_BINDING")
            require(cycle["cycle_id"] == cycle_inputs[cycle["cycle"]]["cycleId"], "CYCLE_ID_BINDING")
        require(self.db.execute("SELECT COUNT(*) FROM cycles").fetchone()[0] == len(cycle_inputs), "CYCLE_EVENT_COVERAGE")
        require(sum(1 for x in self.db.execute("SELECT kind FROM events WHERE kind='PASS'")) == pass_count, "PASS_EVENT_COVERAGE")
        actual_overlays = {(x["kind"], x["scope_id"]): x["revision"] for x in self.db.execute("SELECT * FROM overlays")}
        require(actual_overlays == overlay_state, "OVERLAY_HISTORY")
        return {"status": "LOCAL_HASH_AND_COUNT_VERIFIED", "eventCount": event_count, "passes": pass_count,
                "nodePassRows": pass_count * 1728, "predicateEvaluations": pass_count * 269568,
                "head": self.head, "authority": "UNSIGNED_LOCAL_INTEGRITY_ONLY"}


def main(argv=None):
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("run", "verify", "summary", "begin-cycle", "slots"))
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--db", type=Path)
    parser.add_argument("--cycle-id", default="cycle-001")
    parser.add_argument("--expected-head")
    args = parser.parse_args(argv)
    root = args.root
    db = args.db or root / "output" / "evolution.sqlite"
    with EvolutionEngine(db, strict_json((root / "inputs/registry.json").read_bytes()),
                         strict_json((root / "design/lenses.json").read_bytes()),
                         (root / "inputs/ariadne_v07_atlas.json").read_bytes(),
                         (root / "peer-inputs/next144-civilizational-capabilities.json").read_bytes()) as engine:
        if args.command == "run":
            engine.run_all(cycle_id=args.cycle_id, progress=lambda x: print(canonical(x), flush=True))
            print(canonical(engine.summary()))
        elif args.command == "verify":
            print(canonical(engine.verify(expected_head=args.expected_head)))
        elif args.command == "summary":
            print(canonical(engine.summary()))
        elif args.command == "begin-cycle":
            print(canonical(engine.begin_cycle(args.cycle_id, expected_head=args.expected_head)))
        else:
            for slot in engine.outbox_slots():
                print(canonical(slot))


if __name__ == "__main__":
    main()
