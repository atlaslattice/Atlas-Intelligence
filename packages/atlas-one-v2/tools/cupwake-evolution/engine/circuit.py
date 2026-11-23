"""A finite, offline Ariadne circuit. No scheduler, model calls or host grants.

Structural review rows are coverage candidates, not semantic adjudications.
The local evidence ledger records supplied reports; hashes do not authenticate
the reporter, prove a model wake, or turn local tests into deployment evidence.
"""
from __future__ import annotations

from collections import Counter
from contextlib import contextmanager
from datetime import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import tempfile
from typing import Any


class CircuitError(ValueError):
    """A controlled rejection with a stable machine-readable reason."""

    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


SCHEMA = "cupwake.ariadne-circuit.v1"
ZERO_HASH = "0" * 64
SHA = re.compile(r"^[0-9a-f]{64}$")
SAFE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$")
HOUSES = tuple(f"H{h:02d}" for h in range(1, 13))
SPHERES = tuple(f"{h}.S{s:02d}" for h in HOUSES for s in range(1, 13))
NODES = tuple(f"{s}.N{n:02d}" for s in SPHERES for n in range(1, 13))
VISIT_OUTCOMES = frozenset({"BLOCKED", "NO_CHANGE", "SOURCE_TESTED", "IMPLEMENTED_LOCAL"})
VISIT_KEYS = frozenset({
    "eventId", "visitId", "timestamp", "outcome", "ticketIds", "evidenceRefs",
    "artifactDigests", "testCasesExecuted", "reason", "sourceSha256", "planDigest",
})
WORK_WINDOWS = (
    {"kind": "WORK", "weight": 1},
    {"kind": "RESTORATIVE_CHOICE", "weight": 1,
     "choices": ["Imagine", "Dream", "Quiet"]},
    {"kind": "COMMUNITY_CHOICE", "weight": 1,
     "choices": ["Play", "Social", "Explore", "Habitat", "Family", "Quiet"]},
)


def _require(condition: bool, code: str) -> None:
    if not condition:
        raise CircuitError(code)


def _plain(value: Any, depth: int = 0) -> None:
    """Reject non-JSON objects, excessive depth and non-finite floats."""
    _require(depth <= 32, "MAX_DATA_DEPTH")
    if type(value) is dict:
        _require(all(type(k) is str for k in value), "NON_STRING_KEY")
        for child in value.values():
            _plain(child, depth + 1)
    elif type(value) is list:
        for child in value:
            _plain(child, depth + 1)
    elif value is None or type(value) in (str, bool, int):
        return
    else:
        raise CircuitError("NON_JSON_DATA")


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _hash(value: Any) -> str:
    return hashlib.sha256(_json(value).encode("utf-8")).hexdigest()


def _string(value: Any, code: str, maximum: int = 30_000) -> str:
    _require(type(value) is str and bool(value.strip()) and len(value) <= maximum, code)
    try:
        value.encode("utf-8", errors="strict")
    except UnicodeError:
        raise CircuitError("MALFORMED_UNICODE") from None
    return value


def _digest(value: Any, code: str = "INVALID_DIGEST") -> str:
    _require(type(value) is str and bool(SHA.fullmatch(value)), code)
    return value


def _index(rows: Any, expected: tuple[str, ...], code: str) -> dict:
    _require(type(rows) is list and len(rows) == len(expected), code + "_COUNT")
    result = {}
    for row in rows:
        _require(type(row) is dict, code + "_RECORD")
        key = row.get("id")
        _require(type(key) is str and key not in result, code + "_DUPLICATE")
        result[key] = row
    _require(set(result) == set(expected), code + "_COVERAGE")
    return result


def _work_only(data: Any) -> None:
    """Only explicit declared Work records may enter this Work compiler.

    This validates a local declaration. It cannot grant or attest read rights.
    The shape deliberately has no private activity/body ingestion field.
    """
    if type(data) is dict:
        for key, value in data.items():
            compact = key.replace("_", "").lower()
            _require(compact not in {
                "privatebody", "privatecontent", "brainbody", "palacebody",
                "leisurebody", "privateactivity", "leisureevidence", "quietreceipt",
                "playbody", "socialbody", "dreambody", "imaginebody",
                "hostattested", "ratified", "deployed", "authenticatedresident",
            }, "PROTECTED_OR_AUTHORITY_FIELD")
            if compact in {"mode", "sourcemode", "evidencemode"}:
                _require(value == "WORK", "NON_WORK_SOURCE")
            _work_only(value)
    elif type(data) is list:
        for child in data:
            _work_only(child)


def _unique_pairs(pairs):
    result = {}
    for key, value in pairs:
        _require(key not in result, "DUPLICATE_JSON_KEY")
        result[key] = value
    return result


def _load(path: str | Path) -> Any:
    try:
        with Path(path).open(encoding="utf-8") as handle:
            result = json.load(handle, object_pairs_hook=_unique_pairs)
        _plain(result)
        return result
    except CircuitError:
        raise
    except (ValueError, UnicodeError, RecursionError, OSError):
        raise CircuitError("UNREADABLE_JSON") from None


def validate_registry(
    registry: dict,
    *,
    expected_source_sha256: str,
    expected_edition: str,
    original_source_bytes: bytes | None = None,
) -> dict:
    """Validate exact topology and scope roles against a supplied source pin.

    With original Ariadne bytes, also verify exact names, node definitions,
    parent IDs and source kinds against those bytes. The independently supplied
    expected digest is a trust input; this function is not a signature verifier.
    """
    _plain(registry)
    _require(type(registry) is dict, "REGISTRY_TYPE")
    _work_only(registry)
    _digest(expected_source_sha256)
    _string(expected_edition, "EDITION_REQUIRED", 256)
    _require(registry.get("sourceSha256") == expected_source_sha256, "SOURCE_DIGEST_DRIFT")
    _require(registry.get("edition") == expected_edition, "EDITION_DRIFT")
    houses = _index(registry.get("houses"), HOUSES, "HOUSE")
    spheres = _index(registry.get("spheres"), SPHERES, "SPHERE")
    nodes = _index(registry.get("nodes"), NODES, "NODE")
    for key, house in houses.items():
        _string(house.get("name"), "HOUSE_NAME")
    for key, sphere in spheres.items():
        _require(sphere.get("houseId") == key[:3], "SPHERE_PARENT")
        expected_role = "DOMAIN" if int(key[5:7]) <= 7 else "META"
        _require(sphere.get("role") == expected_role, "SPHERE_ROLE")
        _string(sphere.get("name"), "SPHERE_NAME")
    for key, node in nodes.items():
        _require(node.get("houseId") == key[:3], "NODE_HOUSE")
        _require(node.get("sphereId") == key[:7], "NODE_SPHERE")
        _require(node.get("role") == spheres[key[:7]]["role"], "NODE_ROLE_NOT_SPHERE_ROLE")
        _string(node.get("name"), "NODE_NAME")
        _string(node.get("definition"), "NODE_DEFINITION")
    proof = "DECLARED_PIN_MATCHED"
    if original_source_bytes is not None:
        _require(type(original_source_bytes) is bytes, "SOURCE_BYTES_TYPE")
        _require(len(original_source_bytes) <= 16 * 1024 * 1024, "SOURCE_BYTES_LIMIT")
        actual = hashlib.sha256(original_source_bytes).hexdigest()
        _require(actual == expected_source_sha256, "ORIGINAL_BYTES_DIGEST_DRIFT")
        try:
            original = json.loads(original_source_bytes, object_pairs_hook=_unique_pairs)
        except CircuitError:
            raise
        except (ValueError, UnicodeError, RecursionError):
            raise CircuitError("ORIGINAL_BYTES_INVALID_JSON") from None
        _plain(original)
        _require(type(original) is dict, "ORIGINAL_SOURCE_SHAPE")
        for level, index in (("houses", houses), ("spheres", spheres), ("nodes", nodes)):
            source_index = original.get(level)
            _require(type(source_index) is dict and set(source_index) == set(index), "ORIGINAL_SOURCE_COVERAGE")
            for key, item in index.items():
                source_item = source_index[key]
                _require(type(source_item) is dict, "ORIGINAL_SOURCE_RECORD")
                _require(source_item.get("id") == key and source_item.get("name") == item["name"], "ORIGINAL_SOURCE_NAME_DRIFT")
                if "definition" in item:
                    _require(source_item.get("definition", "") == item["definition"], "ORIGINAL_SOURCE_DEFINITION_DRIFT")
                if "sourcePointer" in item:
                    _require(item["sourcePointer"] == f"/{level}/{key}", "ORIGINAL_SOURCE_POINTER_DRIFT")
                if level == "spheres":
                    _require(source_item.get("parent") == item["houseId"], "ORIGINAL_SOURCE_PARENT_DRIFT")
                elif level == "nodes":
                    _require(source_item.get("parent") == item["sphereId"], "ORIGINAL_SOURCE_PARENT_DRIFT")
                    _require(source_item.get("definition") == item["definition"], "ORIGINAL_SOURCE_DEFINITION_DRIFT")
                    source_role = {"DOMAIN_SPECIALIZATION": "DOMAIN", "EPISTEMIC_META": "META"}.get(source_item.get("kind"))
                    _require(source_role == item["role"], "ORIGINAL_SOURCE_ROLE_DRIFT")
                    for normalized_key, source_key in (("includes", "includes"), ("excludes", "excludes"),
                            ("declaredSourceRecordSha256", "source_record_sha256"), ("sourceScopeStatus", "scope_status")):
                        if normalized_key in item:
                            _require(item[normalized_key] == source_item.get(source_key), "ORIGINAL_SOURCE_SCOPE_FIELD_DRIFT")
        proof = "ORIGINAL_BYTES_AND_RETAINED_SOURCE_FIELDS_MATCHED"
    roles = Counter(item["role"] for item in nodes.values())
    _require(roles == {"DOMAIN": 1008, "META": 720}, "ROLE_TOTALS")
    return {"houses": houses, "spheres": spheres, "nodes": nodes,
            "sourceProof": proof, "normalizedDigest": _hash(registry),
            "sourceSha256": expected_source_sha256, "edition": expected_edition}


def _validate_lenses(lenses: dict) -> dict:
    _plain(lenses)
    _require(type(lenses) is dict, "LENSES_TYPE")
    _work_only(lenses)
    result = {}
    for kind, expected in (("spheres", SPHERES), ("houses", HOUSES)):
        index = _index(lenses.get(kind), expected, "LENS_" + kind.upper())
        for item in index.values():
            _string(item.get("question"), "LENS_QUESTION")
            checks = item.get("checks")
            _require(type(checks) is list and 1 <= len(checks) <= 24, "LENS_CHECKS")
            for check in checks:
                _string(check, "LENS_CHECK")
        result[kind] = index
    return result


def _tickets(registry_index: dict, overrides: list[dict] | None) -> list[dict]:
    custom = {}
    if overrides is not None:
        _plain(overrides)
        _work_only(overrides)
        _require(type(overrides) is list and len(overrides) == 1728, "TICKET_COUNT")
        for item in overrides:
            _require(type(item) is dict and type(item.get("nodeId")) is str and item["nodeId"] in NODES, "TICKET_NODE")
            _require(item["nodeId"] not in custom, "TICKET_DUPLICATE_NODE")
            _require("status" not in item or item["status"] == "PLANNED", "TICKET_FALSE_COMPLETION")
            _require("semanticStatus" not in item or item["semanticStatus"] in ("CANDIDATE_NEEDS_REVIEW", "CANDIDATE_REQUIRES_REVIEW"), "TICKET_FALSE_SEMANTIC_PROMOTION")
            custom[item["nodeId"]] = item
    result = []
    for slot, node_id in enumerate(NODES, 1):
        node = registry_index["nodes"][node_id]
        supplied = custom.get(node_id, {})
        # Authored proposals may add implementation ideas, but cannot relabel
        # the source fields underneath an authentic node digest.
        source_fields = {
            "sourceDefinition": node["definition"],
            "sourceIncludes": node.get("includes", ""),
            "sourceExcludes": node.get("excludes", ""),
            "sourcePointer": node.get("sourcePointer", f"/nodes/{node_id}"),
            "sourceRole": node["role"],
            "sourceSha256": registry_index["sourceSha256"],
            "sourceEdition": registry_index["edition"],
            "sourceNodeDigest": _hash(node),
        }
        for key, expected in source_fields.items():
            if key in supplied:
                _require(supplied[key] == expected, "TICKET_SOURCE_FIELD_DRIFT")
        defaults = {
            "nodeId": node_id,
            "title": f"Review an implementation candidate for {node['name']}",
            "product": "UNASSIGNED",
            "change": "Select a bounded change using the source definition and review lenses.",
            "acceptance": ["Preserve exact source identity and scope.",
                           "Provide a falsifier, test evidence and reviewable artifact."],
            "dependencies": [],
        }
        defaults.update(custom.get(node_id, {}))
        for key in ("title", "product", "change"):
            _string(defaults.get(key), "TICKET_" + key.upper())
        _require(type(defaults.get("acceptance")) is list and len(defaults["acceptance"]) > 0, "TICKET_ACCEPTANCE")
        for check in defaults["acceptance"]:
            _string(check, "TICKET_ACCEPTANCE_ITEM")
        dependencies = defaults.get("dependencies")
        _require(type(dependencies) is list and len(dependencies) <= 1727, "TICKET_DEPENDENCIES")
        _require(all(type(v) is str and v in NODES and v != node_id for v in dependencies), "TICKET_DEPENDENCY_TARGET")
        _require(len(set(dependencies)) == len(dependencies), "TICKET_DEPENDENCY_DUPLICATE")
        defaults.update({
            "ticketId": f"CW-{node_id}", "slot": slot, "status": "PLANNED",
            "semanticStatus": "CANDIDATE_NEEDS_REVIEW", "sourceMode": "WORK",
            "sourceNodeDigest": _hash(node),
        })
        result.append(defaults)
    if any("proposedMacroturnSlot" in item for item in result):
        _require(all(type(item.get("proposedMacroturnSlot")) is int for item in result), "TICKET_PROPOSED_SLOT_TYPE")
        _require({item["proposedMacroturnSlot"] for item in result} == set(range(1, 1729)), "TICKET_PROPOSED_SLOT_COVERAGE")
        result.sort(key=lambda item: item["proposedMacroturnSlot"])
        for item in result:
            item["slot"] = item["proposedMacroturnSlot"]
    _check_dependencies(result)
    return result


def _check_dependencies(tickets: list[dict]) -> None:
    graph = {}
    for row in tickets:
        parents = row.get("dependencies")
        _require(type(parents) is list and len(parents) <= 1727, "TICKET_DEPENDENCIES")
        _require(all(type(value) is str and value in NODES and value != row["nodeId"] for value in parents), "TICKET_DEPENDENCY_TARGET")
        _require(len(set(parents)) == len(parents), "TICKET_DEPENDENCY_DUPLICATE")
        graph[row["nodeId"]] = parents
    # Iterative Kahn traversal avoids recursion on a long legitimate chain.
    pending = {key: len(values) for key, values in graph.items()}
    children = {key: [] for key in graph}
    for key, parents in graph.items():
        for parent in parents:
            children[parent].append(key)
    ready = [key for key in graph if pending[key] == 0]
    seen = 0
    while ready:
        key = ready.pop()
        seen += 1
        for child in children[key]:
            pending[child] -= 1
            if pending[child] == 0:
                ready.append(child)
    _require(seen == len(graph), "TICKET_DEPENDENCY_CYCLE")


def _write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")


def build_circuit(
    registry: dict,
    lenses: dict,
    output_dir: str | Path,
    *,
    expected_source_sha256: str,
    expected_edition: str,
    original_source_bytes: bytes | None = None,
    ticket_overrides: list[dict] | None = None,
) -> dict:
    """Compile all 269,568 source-pinned structural review candidates.

    This executes finite enumeration/validation, not 269,568 independent expert
    opinions. The semantic meaning of every cross-scope relationship remains a
    review candidate. Optional ticket overrides contain authored build actions.
    """
    index = validate_registry(registry, expected_source_sha256=expected_source_sha256,
                              expected_edition=expected_edition,
                              original_source_bytes=original_source_bytes)
    lens_index = _validate_lenses(lenses)
    tickets = _tickets(index, ticket_overrides)
    base = {
        "schema": SCHEMA, "edition": expected_edition,
        "sourceSha256": expected_source_sha256,
        "normalizedRegistryDigest": index["normalizedDigest"],
        "lensesDigest": _hash(lenses), "ticketsDigest": _hash(tickets),
        "counts": {"houses": 12, "spheres": 144, "nodes": 1728,
                   "sphereNodeCandidates": 248832, "houseNodeCandidates": 20736,
                   "totalStructuralEvaluations": 269568, "plannedMacroturnSlots": 1728,
                   "recordedVisits": 0, "implementedUpdates": 0,
                   "semanticallyAcceptedRelationships": 0, "hostVerifiedUpdates": 0},
        "sourceProof": index["sourceProof"],
        "evaluationStatus": "STRUCTURAL_EVALUATED",
        "semanticStatus": "CANDIDATE_NEEDS_REVIEW",
        "roleRule": "S01-S07 DOMAIN; S08-S12 META; all 12 nodes inherit their sphere role",
        "roleCounts": {"DOMAIN": 1008, "META": 720},
        "activityWindows": list(WORK_WINDOWS),
        "activityMeaning": "Planned equal windows; no elapsed-time or private-activity measurement. Work-like Explore counts against Work. Unused non-Work windows cannot become Work.",
        "authority": "LOCAL_SOURCE_ONLY; no scheduler, resident authentication, host rights, semantic acceptance, CANON or deployment",
    }
    plan_digest = _hash(base)
    manifest = dict(base, planDigest=plan_digest)
    plan = {"schema": SCHEMA, "sourceSha256": expected_source_sha256,
            "edition": expected_edition, "planDigest": plan_digest,
            "ticketsDigest": base["ticketsDigest"], "tickets": tickets,
            "manifestCore": base,
            "activityWindows": list(WORK_WINDOWS), "slotMeaning": "PLANNED opportunity, not a completed visit"}
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    names = ("circuit.sqlite", "circuit_manifest.json", "macroturn_plan.json", "tickets.jsonl")
    _require(not any((out / name).exists() for name in names), "OUTPUT_ALREADY_EXISTS")
    with tempfile.TemporaryDirectory(prefix=".circuit-build-", dir=out) as temporary:
        temp = Path(temporary)
        connection = sqlite3.connect(temp / "circuit.sqlite")
        try:
            connection.executescript("""
                PRAGMA foreign_keys=ON;
                CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
                CREATE TABLE source_nodes (
                    id TEXT PRIMARY KEY, house_id TEXT NOT NULL, sphere_id TEXT NOT NULL,
                    name TEXT NOT NULL, definition TEXT NOT NULL, role TEXT NOT NULL,
                    record_digest TEXT NOT NULL);
                CREATE TABLE lenses (
                    kind TEXT NOT NULL, id TEXT NOT NULL, question TEXT NOT NULL,
                    checks_json TEXT NOT NULL, record_json TEXT NOT NULL, digest TEXT NOT NULL,
                    PRIMARY KEY(kind,id));
                CREATE TABLE review_candidates (
                    kind TEXT NOT NULL, lens_id TEXT NOT NULL, node_id TEXT NOT NULL,
                    structural_relation TEXT NOT NULL,
                    node_role TEXT NOT NULL, lens_role TEXT NOT NULL,
                    same_sphere INTEGER, same_house INTEGER NOT NULL,
                    checks_json TEXT NOT NULL,
                    evaluation_status TEXT NOT NULL, semantic_status TEXT NOT NULL,
                    evaluation_digest TEXT NOT NULL,
                    PRIMARY KEY(kind,lens_id,node_id),
                    FOREIGN KEY(kind,lens_id) REFERENCES lenses(kind,id),
                    FOREIGN KEY(node_id) REFERENCES source_nodes(id));
                CREATE INDEX candidate_node ON review_candidates(node_id,kind);
                CREATE TABLE tickets (
                    node_id TEXT PRIMARY KEY, ticket_id TEXT UNIQUE NOT NULL,
                    slot INTEGER UNIQUE NOT NULL, payload_json TEXT NOT NULL,
                    FOREIGN KEY(node_id) REFERENCES source_nodes(id));
            """)
            with connection:
                connection.execute("INSERT INTO metadata VALUES (?,?)", ("manifest", _json(manifest)))
                for node_id in NODES:
                    node = index["nodes"][node_id]
                    connection.execute("INSERT INTO source_nodes VALUES (?,?,?,?,?,?,?)", (
                        node_id, node["houseId"], node["sphereId"], node["name"],
                        node["definition"], node["role"], _hash(node)))
                node_digests = {node_id: _hash(index["nodes"][node_id]) for node_id in NODES}
                for kind, group in (("sphere", "spheres"), ("house", "houses")):
                    for lens_id in sorted(lens_index[group]):
                        lens = lens_index[group][lens_id]
                        lens_digest = _hash(lens)
                        connection.execute("INSERT INTO lenses VALUES (?,?,?,?,?,?)", (
                            kind, lens_id, lens["question"], _json(lens["checks"]), _json(lens), lens_digest))
                        rows = []
                        for node_id in NODES:
                            node = index["nodes"][node_id]
                            relation = ("OWN_SPHERE" if kind == "sphere" and node["sphereId"] == lens_id
                                        else "SAME_HOUSE" if node["houseId"] == lens_id[:3]
                                        else "CROSS_HOUSE")
                            lens_role = index["spheres"][lens_id]["role"] if kind == "sphere" else "HOUSE"
                            checks = {
                                "sourceCoordinateValidated": True,
                                "sourceParentValidated": True,
                                "sphereHomogeneousRoleValidated": True,
                                "lensDefinitionPresent": True,
                                "declaredSourcePinMatched": True,
                                "originalSourceBytesMatched": index["sourceProof"] == "ORIGINAL_BYTES_AND_RETAINED_SOURCE_FIELDS_MATCHED",
                                "workSourceDeclarationOnly": True,
                                "semanticEquivalenceEstablished": False,
                            }
                            receipt = {"kind": kind, "lensId": lens_id, "nodeId": node_id,
                                       "sourceSha256": expected_source_sha256,
                                       "lensDigest": lens_digest, "nodeDigest": node_digests[node_id],
                                       "structuralRelation": relation,
                                       "nodeRole": node["role"], "lensRole": lens_role,
                                       "checks": checks,
                                       "semanticStatus": "CANDIDATE_NEEDS_REVIEW"}
                            rows.append((kind, lens_id, node_id, relation, node["role"], lens_role,
                                         int(node["sphereId"] == lens_id) if kind == "sphere" else None,
                                         int(node["houseId"] == lens_id[:3]), _json(checks), "STRUCTURAL_EVALUATED",
                                         "CANDIDATE_NEEDS_REVIEW", _hash(receipt)))
                        connection.executemany("INSERT INTO review_candidates VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", rows)
                connection.executemany("INSERT INTO tickets VALUES (?,?,?,?)", (
                    (item["nodeId"], item["ticketId"], item["slot"], _json(item)) for item in tickets))
                counts = dict(connection.execute("SELECT kind, count(*) FROM review_candidates GROUP BY kind"))
                _require(counts == {"sphere": 248832, "house": 20736}, "COMPILED_COUNT_MISMATCH")
                _require(connection.execute("PRAGMA foreign_key_check").fetchone() is None, "DATABASE_RELATION_FAILURE")
                _require(connection.execute("PRAGMA integrity_check").fetchone() == ("ok",), "DATABASE_INTEGRITY_FAILURE")
        finally:
            connection.close()
        _write_json(temp / "circuit_manifest.json", manifest)
        _write_json(temp / "macroturn_plan.json", plan)
        with (temp / "tickets.jsonl").open("w", encoding="utf-8") as handle:
            for ticket in tickets:
                handle.write(_json(ticket) + "\n")
        for name in names:
            os.replace(temp / name, out / name)
    return dict(manifest, files={name: str((out / name).resolve()) for name in names})


def _validate_plan(plan: dict) -> None:
    _plain(plan)
    _require(type(plan) is dict and plan.get("schema") == SCHEMA, "PLAN_SCHEMA")
    _digest(plan.get("sourceSha256"))
    _digest(plan.get("planDigest"))
    core = plan.get("manifestCore")
    _require(type(core) is dict and _hash(core) == plan["planDigest"], "PLAN_MANIFEST_DRIFT")
    _require(all(core.get(key) == plan.get(key) for key in ("sourceSha256", "edition", "ticketsDigest")), "PLAN_MANIFEST_BINDING")
    tickets = plan.get("tickets")
    _require(type(tickets) is list and len(tickets) == 1728, "PLAN_TICKET_COUNT")
    _require(all(type(row) is dict for row in tickets), "PLAN_TICKET_TYPE")
    _work_only(tickets)
    _require(_hash(tickets) == plan.get("ticketsDigest"), "PLAN_TICKETS_DRIFT")
    _require(all(type(row.get("nodeId")) is str for row in tickets)
             and {row["nodeId"] for row in tickets} == set(NODES), "PLAN_TICKET_COVERAGE")
    _require([row.get("slot") for row in tickets] == list(range(1, 1729)), "PLAN_SLOT_DRIFT")
    for row in tickets:
        _require(row.get("ticketId") == "CW-" + row["nodeId"] and row.get("status") == "PLANNED", "PLAN_TICKET_DRIFT")
        _require(row.get("semanticStatus") == "CANDIDATE_NEEDS_REVIEW", "PLAN_SEMANTIC_PROMOTION")
    _check_dependencies(tickets)
    _require(plan.get("activityWindows") == list(WORK_WINDOWS), "PLAN_WINDOW_DRIFT")


@contextmanager
def _lock(path: Path):
    # Linux/Unix local file lock, not a distributed lock or hosted mutex.
    import fcntl
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.with_suffix(path.suffix + ".lock").open("a+") as handle:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


def _atomic_json(path: Path, value: Any) -> None:
    fd, temporary = tempfile.mkstemp(prefix=".ledger-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(_json(value) + "\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def _summary(events: list[dict]) -> dict:
    completed = {ticket for event in events if event["report"]["outcome"] == "IMPLEMENTED_LOCAL"
                 for ticket in event["report"]["ticketIds"]}
    implementation_bundles = {_implementation_evidence_digest(event["report"])
                              for event in events if event["report"]["outcome"] == "IMPLEMENTED_LOCAL"}
    return {
        "recordedVisits": len(events),
        "blockedVisits": sum(event["report"]["outcome"] == "BLOCKED" for event in events),
        "noChangeVisits": sum(event["report"]["outcome"] == "NO_CHANGE" for event in events),
        "reportedLocalImplementations": len(completed),
        "reportedImplementedTickets": len(completed),
        "distinctImplementationEvidenceBundles": len(implementation_bundles),
        "reportedTestCases": sum(event["report"]["testCasesExecuted"] for event in events),
        "plannedSlots": 1728,
        "hostAttestedVisits": 0, "hostVerifiedUpdates": 0,
        "semanticallyAcceptedRelationships": 0,
        "countMeaning": "Local implementation count is a ticket-report count, not independent innovations; evidence bundles are separately deduplicated. No independent authentication or acceptance.",
    }


def _implementation_evidence_digest(report: dict) -> str:
    return _hash({"artifactDigests": sorted(report["artifactDigests"]),
                  "evidenceRefs": sorted(report["evidenceRefs"])})


def create_ledger(plan_path: str | Path, ledger_path: str | Path) -> dict:
    plan = _load(plan_path)
    _validate_plan(plan)
    path = Path(ledger_path)
    with _lock(path):
        _require(not path.exists(), "LEDGER_ALREADY_EXISTS")
        ledger = {"schema": SCHEMA, "planDigest": plan["planDigest"],
                  "sourceSha256": plan["sourceSha256"], "events": [],
                  "head": ZERO_HASH, "summary": _summary([])}
        _atomic_json(path, ledger)
    return ledger


def _validate_report(report: dict, plan: dict) -> None:
    _plain(report)
    _require(type(report) is dict and set(report) == VISIT_KEYS, "VISIT_FIELDS")
    _work_only(report)
    for key in ("eventId", "visitId"):
        _require(type(report[key]) is str and bool(SAFE_ID.fullmatch(report[key])), "VISIT_ID")
    _require(report["sourceSha256"] == plan["sourceSha256"], "VISIT_SOURCE_DRIFT")
    _require(report["planDigest"] == plan["planDigest"], "VISIT_PLAN_DRIFT")
    _require(type(report["outcome"]) is str and report["outcome"] in VISIT_OUTCOMES, "VISIT_OUTCOME")
    try:
        parsed = datetime.fromisoformat(report["timestamp"].replace("Z", "+00:00"))
        _require(parsed.tzinfo is not None and parsed.utcoffset() is not None, "VISIT_TIMESTAMP")
    except (ValueError, AttributeError, TypeError):
        raise CircuitError("VISIT_TIMESTAMP") from None
    ticket_ids = report["ticketIds"]
    valid_tickets = {row["ticketId"] for row in plan["tickets"]}
    _require(type(ticket_ids) is list and len(ticket_ids) <= 96, "VISIT_TICKET_LIMIT")
    _require(all(type(v) is str and v in valid_tickets for v in ticket_ids), "VISIT_TICKET_UNKNOWN")
    _require(len(set(ticket_ids)) == len(ticket_ids), "VISIT_TICKET_DUPLICATE")
    _string(report["reason"], "VISIT_REASON", 8000)
    count = report["testCasesExecuted"]
    _require(type(count) is int and 0 <= count <= 10_000_000, "VISIT_TEST_COUNT")
    refs = report["evidenceRefs"]
    _require(type(refs) is list and 1 <= len(refs) <= 48, "VISIT_EVIDENCE_REQUIRED")
    for ref in refs:
        _string(ref, "VISIT_EVIDENCE_REF", 4096)
        _require(ref.startswith(("https://", "swarmchat:", "library:", "artifact:sha256:")), "VISIT_EVIDENCE_SCHEME")
    digests = report["artifactDigests"]
    _require(type(digests) is list and len(digests) <= 48, "VISIT_ARTIFACTS")
    for digest in digests:
        _digest(digest)
    _require(len(set(refs)) == len(refs) and len(set(digests)) == len(digests), "VISIT_EVIDENCE_DUPLICATE")
    if report["outcome"] in {"SOURCE_TESTED", "IMPLEMENTED_LOCAL"}:
        _require(bool(ticket_ids) and bool(digests) and count > 0, "VISIT_IMPLEMENTATION_EVIDENCE_REQUIRED")
    elif report["outcome"] in {"BLOCKED", "NO_CHANGE"}:
        _require(not digests or bool(refs), "VISIT_BLOCK_EVIDENCE")


def _verify(ledger: dict, plan: dict, expected_head: str | None = None) -> dict:
    _plain(ledger)
    _require(type(ledger) is dict and set(ledger) == {"schema", "planDigest", "sourceSha256", "events", "head", "summary"}, "LEDGER_FIELDS")
    _require(ledger.get("schema") == SCHEMA and ledger.get("planDigest") == plan["planDigest"]
             and ledger.get("sourceSha256") == plan["sourceSha256"], "LEDGER_BINDING")
    events = ledger.get("events")
    _require(type(events) is list and len(events) <= 1728, "LEDGER_VISIT_LIMIT")
    head = ZERO_HASH
    visit_ids, event_ids, completed, implementation_evidence = set(), set(), set(), set()
    ticket_map = {row["ticketId"]: row for row in plan["tickets"]}
    for number, event in enumerate(events, 1):
        _require(type(event) is dict and set(event) == {"ordinal", "previous", "report", "hash"}, "LEDGER_EVENT_FIELDS")
        _require(event["ordinal"] == number and event["previous"] == head, "LEDGER_CHAIN_ORDER")
        report = event["report"]
        _validate_report(report, plan)
        _require(report["visitId"] not in visit_ids and report["eventId"] not in event_ids, "LEDGER_DUPLICATE_VISIT")
        visit_ids.add(report["visitId"])
        event_ids.add(report["eventId"])
        if report["outcome"] == "IMPLEMENTED_LOCAL":
            _require(not completed.intersection(report["ticketIds"]), "LEDGER_DUPLICATE_IMPLEMENTATION")
            fingerprint = _implementation_evidence_digest(report)
            _require(fingerprint not in implementation_evidence, "LEDGER_REUSED_IMPLEMENTATION_EVIDENCE")
            implementation_evidence.add(fingerprint)
            # Dependencies must have prior recorded local implementation; merely
            # mentioning both parent and child in one report is insufficient.
            for ticket in report["ticketIds"]:
                required = {"CW-" + node for node in ticket_map[ticket]["dependencies"]}
                _require(required <= completed, "LEDGER_DEPENDENCY_NOT_COMPLETED")
            completed.update(report["ticketIds"])
        payload = {"ordinal": number, "previous": head, "report": report}
        head = _hash(payload)
        _require(event["hash"] == head, "LEDGER_HASH_MISMATCH")
    _require(ledger["head"] == head, "LEDGER_HEAD_MISMATCH")
    if expected_head is not None:
        _digest(expected_head)
        _require(head == expected_head, "STALE_LEDGER_HEAD")
    _require(ledger["summary"] == _summary(events), "LEDGER_COUNT_PROMOTION")
    return ledger


def verify_ledger(ledger_path: str | Path, plan_path: str | Path, *, expected_head: str | None = None) -> dict:
    plan = _load(plan_path)
    _validate_plan(plan)
    return _verify(_load(ledger_path), plan, expected_head)


def ledger_summary(ledger_path: str | Path, plan_path: str | Path) -> dict:
    return verify_ledger(ledger_path, plan_path)["summary"]


def append_visit(
    ledger_path: str | Path, plan_path: str | Path, report: dict, *, expected_head: str
) -> dict:
    """Atomically append a declared visit; exact retries never add a visit.

    expected_head is an optimistic concurrency pin. An exact event retry may
    return its prior receipt even after subsequent records, without writing.
    """
    plan = _load(plan_path)
    _validate_plan(plan)
    _validate_report(report, plan)
    path = Path(ledger_path)
    with _lock(path):
        ledger = _verify(_load(path), plan)
        for event in ledger["events"]:
            if event["report"]["eventId"] == report["eventId"]:
                _require(event["report"] == report, "EVENT_ID_CONFLICT")
                return {"status": "IDEMPOTENT_REPLAY", "event": event,
                        "head": ledger["head"], "summary": ledger["summary"]}
        _require(ledger["head"] == expected_head, "STALE_LEDGER_HEAD")
        _require(len(ledger["events"]) < 1728, "LEDGER_VISIT_LIMIT")
        _require(all(event["report"]["visitId"] != report["visitId"] for event in ledger["events"]), "VISIT_ID_CONFLICT")
        payload = {"ordinal": len(ledger["events"]) + 1, "previous": ledger["head"], "report": report}
        event = dict(payload, hash=_hash(payload))
        ledger["events"].append(event)
        ledger["head"] = event["hash"]
        ledger["summary"] = _summary(ledger["events"])
        _verify(ledger, plan)
        _atomic_json(path, ledger)
    return {"status": "RECORDED_SELF_REPORT", "event": event,
            "head": ledger["head"], "summary": ledger["summary"]}


def next_batch(
    plan_path: str | Path, ledger_path: str | Path, *, limit: int = 12,
    expected_head: str | None = None
) -> dict:
    """Return at most 96 dependency-ready planned tickets, without running them."""
    _require(type(limit) is int and 1 <= limit <= 96, "BATCH_LIMIT")
    plan = _load(plan_path)
    _validate_plan(plan)
    ledger = _verify(_load(ledger_path), plan, expected_head)
    if len(ledger["events"]) >= 1728:
        return {"schema": SCHEMA, "planDigest": plan["planDigest"], "head": ledger["head"],
                "status": "CAMPAIGN_VISIT_LIMIT_REACHED", "tickets": [],
                "authority": "A new campaign requires new user authorization; no automatic extension"}
    completed = {ticket for event in ledger["events"] if event["report"]["outcome"] == "IMPLEMENTED_LOCAL"
                 for ticket in event["report"]["ticketIds"]}
    ready, blocked = [], 0
    for ticket in plan["tickets"]:
        if ticket["ticketId"] in completed:
            continue
        if {"CW-" + node for node in ticket["dependencies"]} <= completed:
            if len(ready) < limit:
                ready.append(ticket)
        else:
            blocked += 1
    return {"schema": SCHEMA, "planDigest": plan["planDigest"], "head": ledger["head"],
            "status": "LOCAL_CANDIDATE_BATCH_ONLY", "tickets": ready,
            "dependencyBlocked": blocked, "remainingUnimplemented": 1728 - len(completed),
            "authority": "No execution, lease, host rights, model wake or acceptance granted"}
