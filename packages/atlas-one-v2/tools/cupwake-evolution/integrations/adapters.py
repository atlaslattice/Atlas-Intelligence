"""Four-system candidate transport, reusing the Ariadne identity and Work boundary.

No scheduler or network client lives here. The existing controller calls this
module. Local projections are real durable files; external callbacks are never
described as independently verified host authorization. Delivery cannot turn a
candidate into accepted science, story canon, a specialist or a model visit.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path
import re
import sqlite3
import time
import uuid
from typing import Callable

SOURCE_SHA = "07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6"
CATALOG_SHA = "2540f702c020efbfaee0532e84face21394860e57e91749bf36f2b1a3f3c2843"
EDITION = "Ariadne v0.7"
PLATFORMS = {"ATLAS", "ARIADNE", "SWARMCHAT", "IRON_EMPIRE"}
COORD = re.compile(r"H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])\Z")
IDENTIFIER = re.compile(r"[a-zA-Z0-9._:-]{1,120}\Z")
SCOPE_REASONS = {"AFFIRMATIVE_TEXT_ONLY", "EXCLUSION_TEXT_ONLY", "MIXED_SCOPE_TEXT", "IDENTITY_ONLY", "BROWSE_ONLY"}
IRON_SOURCE = {"repository": "atlaslattice/continuum-os", "commit": "38df5731f32e4bf77e8d9b8ff9026ac47b699219", "blob": "8a93c26cf2e8b8cd7d1ba180f2a30eb72f422a0f", "sha256": "baa72525a19d38d6320a84eeaddaa5966b4c7d44481a011c9191f67d4498f632", "status": "PROPOSED_NOT_LOCKED_CANON"}
IRON_OVERLAY = {"repository": "atlaslattice/open-regenerative-compute-standard", "commit": "3814624e40c7a35a360fbc60403cc59455261a98", "blob": "991d64d57164336ceefbf3f450769ab43c49fd91", "sha256": "5afae5eabc2aae466ed933d09bfb73165d5d541b238dda2346dbfe79f094e269", "status": "AUTHOR_REVIEW_REQUIRED"}


class IntegrationHold(ValueError):
    pass


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def digest(value):
    return hashlib.sha256(value if isinstance(value, bytes) else canonical(value).encode()).hexdigest()


def require(condition, reason):
    if not condition:
        raise IntegrationHold(reason)


def clone(value):
    return json.loads(canonical(value))


class SourceRegistry:
    """Only the exact original registry/catalog can create transport candidates."""

    def __init__(self, source_bytes: bytes, next144_catalog_bytes: bytes):
        require(isinstance(source_bytes, bytes) and digest(source_bytes) == SOURCE_SHA, "ORIGINAL_SOURCE_BYTES_REQUIRED")
        require(isinstance(next144_catalog_bytes, bytes) and digest(next144_catalog_bytes) == CATALOG_SHA, "PINNED_NEXT144_CATALOG_REQUIRED")
        original = json.loads(source_bytes)
        self._nodes = original["nodes"]
        require(len(self._nodes) == 1728 and len(original["spheres"]) == 144 and len(original["houses"]) == 12, "SOURCE_TOPOLOGY")
        items = json.loads(next144_catalog_bytes)["items"]
        self._catalog = {x["sphere"]: x for x in items}
        require(len(self._catalog) == 144, "CATALOG_TOPOLOGY")
        for coord, node in self._nodes.items():
            match = COORD.fullmatch(coord)
            require(match is not None and node["id"] == coord and node["parent"] == coord[:7], "SOURCE_COORDINATE")
            role = "DOMAIN_SPECIALIZATION" if int(match[2]) <= 7 else "EPISTEMIC_META"
            require(node["kind"] == role, "SPHERE_ROLE_REQUIRED")

    def identity(self, node_id):
        require(node_id in self._nodes, "SOURCE_NODE_NOT_FOUND")
        node = self._nodes[node_id]
        return {"namespace": "ARIADNE_V07", "edition": EDITION, "registrySha256": SOURCE_SHA,
                "coordinate": node_id, "houseId": node_id[:3], "sphereId": node_id[:7],
                "sourceRole": node["kind"], "declaredSourceRecordSha256": node["source_record_sha256"],
                "computedOriginalRecordSha256": digest(node), "recordDigestMeaning": "ORIGINAL_RECORD_DECLARATION_AND_RECOMPUTED_JSON_ARE_DISTINCT"}

    def scope_match(self, node_id, query):
        """Literal retrieval explanation. An exclusion hit is never inclusion."""
        require(node_id in self._nodes and isinstance(query, str), "SCOPE_QUERY")
        node = self._nodes[node_id]
        terms = {s.casefold() for s in re.findall(r"[\w'-]+", query)}
        words = lambda s: {t.casefold() for t in re.findall(r"[\w'-]+", s)}
        positive = words(node["name"] + " " + node["definition"] + " " + node["includes"])
        negative = words(node["excludes"])
        a, e = len(terms & positive), len(terms & negative)
        reason = ("BROWSE_ONLY" if not terms else "IDENTITY_ONLY" if query.strip() == node_id else
                  "MIXED_SCOPE_TEXT" if a and e else "AFFIRMATIVE_TEXT_ONLY" if a else
                  "EXCLUSION_TEXT_ONLY" if e else "BROWSE_ONLY")
        return {"reason": reason, "affirmativeTokenHits": a, "exclusionTokenHits": e,
                "semanticAcceptance": False, "authorityEffect": "NONE"}

    def projection(self, node_id, platform, run_id, pass_id, route="NODE_WORK_REVIEW", authorization=None,
                   scope_explanation=None):
        # The optional authorization value is deliberately never trusted here.
        require(platform in PLATFORMS and isinstance(run_id, str) and IDENTIFIER.fullmatch(run_id), "PROJECTION_TARGET_OR_RUN")
        require(type(pass_id) is int and pass_id >= 1, "PASS_ID")
        identity = self.identity(node_id)
        proposal = self._catalog[node_id[:7]]
        require(route in {"NODE_WORK_REVIEW", "PROPOSAL_EVIDENCE"}, "UNKNOWN_ROUTE")
        if route == "PROPOSAL_EVIDENCE":
            require(proposal["suggestedMode"] == "WORK", "VOLUNTARY_MODE_SEPARATION")
        if scope_explanation is not None:
            require(isinstance(scope_explanation, dict) and set(scope_explanation) == {"reason", "affirmativeTokenHits", "exclusionTokenHits", "semanticAcceptance", "authorityEffect"}, "SCOPE_EXPLANATION_SHAPE")
            require(scope_explanation["reason"] in SCOPE_REASONS and scope_explanation["semanticAcceptance"] is False and scope_explanation["authorityEffect"] == "NONE", "SCOPE_IS_NOT_ACCEPTANCE")
            require(all(type(scope_explanation[k]) is int and scope_explanation[k] >= 0 for k in ["affirmativeTokenHits", "exclusionTokenHits"]), "SCOPE_COUNTS")
        payload = {"schema": "atlas.four-system.projection/v1", "platform": platform, "runId": run_id, "passId": pass_id,
                   "identity": identity, "route": route, "initiative": proposal["id"] if route == "PROPOSAL_EVIDENCE" else None,
                   "sourceProposalSuggestedMode": proposal["suggestedMode"], "proposalBodyImported": False,
                   "sourceBodyImported": False, "catalogSha256": CATALOG_SHA, "mode": "WORK_REFERENCE_ONLY",
                   "status": "CANDIDATE_NOT_ACCEPTED", "semanticAcceptance": False, "canonEffect": "NONE",
                   "authorityEffect": "NONE", "hostAuthenticated": False, "residentAssigned": False,
                   "actualModelVisits": 0, "scopeMatch": clone(scope_explanation),
                   "implementationState": "NOT_IMPLEMENTED_BY_TRANSPORT"}
        if platform == "IRON_EMPIRE":
            payload["fiction"] = {"context": "SOURCE_SCHEMA_REVIEW_ONLY", "source": clone(IRON_SOURCE), "overlay": clone(IRON_OVERLAY),
                                  "isEmpiricalScience": False, "storyEdited": False, "privateModeImported": False,
                                  "creativeExecution": "REQUIRES_EXPLICIT_OPT_IN_AND_EDITORIAL_REVIEW"}
        payload_sha = digest(payload)
        request_id = "circuit-" + digest({"run": run_id, "pass": pass_id, "node": node_id, "platform": platform, "route": route})[:56]
        return {"schema": "atlas.delivery-intent/v1", "requestId": request_id, "payloadSha256": payload_sha,
                "payload": payload, "state": "PREPARED_NOT_DELIVERED", "requiredRights": ["READ", "DISPATCH", "RETURN"]}

    def verify_projection(self, envelope):
        validate_envelope(envelope)
        p = envelope["payload"]
        require(p["identity"] == self.identity(p["identity"]["coordinate"]), "SOURCE_IDENTITY_SUBSTITUTION")
        expected = self.projection(p["identity"]["coordinate"], p["platform"], p["runId"], p["passId"], p["route"], scope_explanation=p["scopeMatch"])
        require(envelope == expected, "PROJECTION_SUBSTITUTION")
        return True

    def fictional_review(self, node_id, *, opt_in=False, consent="UNKNOWN", mode="IMAGINE_LOCAL", film=None,
                         event=None, quantities=(), historical_namespace="IRON-HIST"):
        """Optional metadata-only fiction review; does not write a scene or CANON."""
        self.identity(node_id)
        require(opt_in is True and mode == "IMAGINE_LOCAL", "VOLUNTARY_FICTION_SCOPE_REQUIRED")
        require(consent == "GRANTED", "CONSENT_DENIED" if consent == "DENIED" else "CONSENT_UNKNOWN")
        require(historical_namespace == "IRON-HIST", "HISTORICAL_NAMESPACE_COLLISION")
        timeline = {"MARS_FLASHBACK": {"II"}, "MARS_SELF_GLASSING": {"II"}, "EMPEROR_PUBLIC_AUDIT": {"II"},
                    "RESTORATION_UNDERWAY": {"III", "LONG_PEACE", "IV"}, "EMPEROR_ASSASSINATION": {"III"},
                    "PRINCE_RESCUE_EXILE": {"III"}, "PRINCE_CORONATION": {"VI"}, "PRINCE_UNCROWNED": {"III", "IV", "V"},
                    "ECOLOGICAL_RECOVERY": {"LONG_PEACE", "IV", "V", "VI"}}
        require(film is None and event is None or event in timeline and film in timeline[event], "FILM_CONTINUITY_VIOLATION")
        units = set()
        require(isinstance(quantities, (list, tuple)), "QUANTITIES_SHAPE")
        for quantity in quantities:
            require(isinstance(quantity, dict) and set(quantity) == {"value", "unit"}, "QUANTITY_SCHEMA")
            require(type(quantity["value"]) in {int, float} and quantity["value"] >= 0 and quantity["value"] < float("inf"), "QUANTITY_VALUE")
            require(isinstance(quantity["unit"], str) and 0 < len(quantity["unit"]) <= 40, "QUANTITY_UNIT")
            units.add(quantity["unit"])
        require(len(units) <= 1, "MIXED_UNITS_REQUIRE_EXPLICIT_CONVERSION")
        return {"schema": "atlas.iron-empire.review/v1", "identity": self.identity(node_id), "source": clone(IRON_SOURCE),
                "status": "FICTIONAL_REVIEW_CANDIDATE", "film": film, "event": event, "historicalNamespace": historical_namespace,
                "scope": "IMAGINE_LOCAL", "consent": "GRANTED", "noWorkIndexing": True, "canonEffect": "NONE",
                "isEmpiricalScience": False, "sourceBodyImported": False, "privateModeImported": False}


def validate_envelope(envelope):
    require(type(envelope) is dict and set(envelope) == {"schema", "requestId", "payloadSha256", "payload", "state", "requiredRights"}, "ENVELOPE_SCHEMA")
    require(envelope["schema"] == "atlas.delivery-intent/v1" and envelope["state"] == "PREPARED_NOT_DELIVERED", "ENVELOPE_STATE")
    require(isinstance(envelope["requestId"], str) and re.fullmatch(r"circuit-[a-f0-9]{56}", envelope["requestId"]), "REQUEST_ID")
    p = envelope["payload"]
    require(type(p) is dict and envelope["payloadSha256"] == digest(p), "PAYLOAD_DIGEST")
    required = {"schema", "platform", "runId", "passId", "identity", "route", "initiative", "sourceProposalSuggestedMode", "proposalBodyImported", "sourceBodyImported", "catalogSha256", "mode", "status", "semanticAcceptance", "canonEffect", "authorityEffect", "hostAuthenticated", "residentAssigned", "actualModelVisits", "scopeMatch", "implementationState"}
    if p.get("platform") == "IRON_EMPIRE": required.add("fiction")
    require(set(p) == required and p["platform"] in PLATFORMS and p["schema"] == "atlas.four-system.projection/v1", "PAYLOAD_SCHEMA")
    require(p["sourceBodyImported"] is False and p["proposalBodyImported"] is False and p["semanticAcceptance"] is False
            and p["hostAuthenticated"] is False and p["residentAssigned"] is False and p["actualModelVisits"] == 0
            and p["canonEffect"] == "NONE" and p["authorityEffect"] == "NONE" and p["mode"] == "WORK_REFERENCE_ONLY"
            and p["status"] == "CANDIDATE_NOT_ACCEPTED" and p["implementationState"] == "NOT_IMPLEMENTED_BY_TRANSPORT", "AUTHORITY_OR_PRIVACY_ESCALATION")
    require(envelope["requiredRights"] == ["READ", "DISPATCH", "RETURN"], "RIGHTS_REQUIREMENT")


class LocalOwnerAuthorizer:
    """Caller-selected local filesystem permission, expressly not hosted rights."""
    def __init__(self, principal="owner", targets=PLATFORMS, expires_at=None):
        require(isinstance(principal, str) and principal, "PRINCIPAL")
        self.principal, self.targets = principal, frozenset(targets)
        self.expires_at = expires_at if expires_at is not None else time.time() + 3600
        require(type(self.expires_at) in {int, float} and math.isfinite(self.expires_at), "GRANT_EXPIRY_FINITE")
        self.revoked = False
        self.epoch = 1

    def revoke(self):
        self.revoked = True
        self.epoch += 1

    def __call__(self, envelope, phase, now):
        require(phase in {"READ", "DISPATCH", "RETURN"}, "GRANT_PHASE")
        require(not self.revoked and now < self.expires_at and envelope["payload"]["platform"] in self.targets, "LOCAL_PERMISSION_DENIED")
        return {"kind": "LOCAL_OWNER_ONLY", "principal": self.principal, "requestId": envelope["requestId"],
                "payloadSha256": envelope["payloadSha256"], "platform": envelope["payload"]["platform"],
                "phase": phase, "expiresAt": self.expires_at, "epoch": self.epoch}


def checked_grant(authorizer, envelope, phase, now):
    require(callable(authorizer), "AUTHORITATIVE_GRANT_CALLBACK_REQUIRED")
    require(type(now) in {int, float} and math.isfinite(now), "FINITE_CLOCK_REQUIRED")
    grant = authorizer(clone(envelope), phase, now)
    require(type(grant) is dict and set(grant) == {"kind", "principal", "requestId", "payloadSha256", "platform", "phase", "expiresAt", "epoch"}, "GRANT_SCHEMA")
    require(grant["requestId"] == envelope["requestId"] and grant["payloadSha256"] == envelope["payloadSha256"]
            and grant["platform"] == envelope["payload"]["platform"] and grant["phase"] == phase
            and type(grant["expiresAt"]) in {int, float} and math.isfinite(grant["expiresAt"]) and now < grant["expiresAt"]
            and type(grant["epoch"]) is int and grant["epoch"] >= 0 and isinstance(grant["principal"], str)
            and len(grant["principal"]) > 0 and grant["kind"] in {"LOCAL_OWNER_ONLY", "HOST_CALLBACK_REPORTED"}, "STALE_OR_WRONG_GRANT")
    return grant


class LocalFileAdapter:
    """Idempotent, fsync-backed local candidate materialization. No network."""
    evidence_class = "LOCAL_FILESYSTEM_READBACK"

    def __init__(self, directory):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)

    def send(self, envelope, grant):
        require(grant["kind"] == "LOCAL_OWNER_ONLY", "LOCAL_ADAPTER_REQUIRES_LOCAL_GRANT")
        platform = envelope["payload"]["platform"]
        target = self.directory / platform
        target.mkdir(exist_ok=True)
        path = target / (envelope["requestId"] + ".json")
        wire = (canonical(envelope["payload"]) + "\n").encode()
        if path.exists():
            require(path.read_bytes() == wire, "IDEMPOTENCY_PAYLOAD_CONFLICT")
        else:
            temp = target / ("." + uuid.uuid4().hex + ".tmp")
            try:
                with temp.open("xb") as out:
                    out.write(wire); out.flush(); os.fsync(out.fileno())
                # Link is atomic create-if-absent: a competing worker cannot replace a prior value.
                try:
                    os.link(temp, path)
                except FileExistsError:
                    require(path.read_bytes() == wire, "IDEMPOTENCY_PAYLOAD_CONFLICT")
                directory_fd = os.open(target, os.O_RDONLY)
                try: os.fsync(directory_fd)
                finally: os.close(directory_fd)
            finally:
                temp.unlink(missing_ok=True)
        readback = json.loads(path.read_text())
        return {"requestId": envelope["requestId"], "payloadSha256": digest(readback),
                "receiptRef": str(path.resolve()), "evidenceClass": self.evidence_class,
                "hostVerified": False, "idempotencyKeyHonored": True}

    def readback(self, envelope, receipt, grant):
        require(grant["kind"] == "LOCAL_OWNER_ONLY", "LOCAL_ADAPTER_REQUIRES_LOCAL_GRANT")
        path = self.directory / envelope["payload"]["platform"] / (envelope["requestId"] + ".json")
        return digest(json.loads(path.read_text()))


class DeliveryOutbox:
    """Durable outbox called by an existing controller, never its own scheduler.

    External implementations must enforce the grant atomically on their server
    and honor requestId idempotency. A post-send return denial is recorded rather
    than misreported as an unsent write. These callbacks are a trust boundary.
    """
    def __init__(self, db_path, registry: SourceRegistry):
        self.db_path = str(db_path)
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self.registry = registry
        with self._connect() as db:
            db.executescript("""
            CREATE TABLE IF NOT EXISTS deliveries(request_id TEXT PRIMARY KEY, payload_sha TEXT NOT NULL,
                envelope TEXT NOT NULL, state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
                worker TEXT, lease_token TEXT, lease_until REAL, receipt TEXT, last_error TEXT,
                dispatch_started INTEGER NOT NULL DEFAULT 0, dispatch_kind TEXT);
            CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT NOT NULL,
                state TEXT NOT NULL, detail TEXT NOT NULL, previous_hash TEXT NOT NULL, event_hash TEXT NOT NULL UNIQUE);
            CREATE TRIGGER IF NOT EXISTS no_event_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT,'APPEND_ONLY'); END;
            CREATE TRIGGER IF NOT EXISTS no_event_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT,'APPEND_ONLY'); END;
            """)
            columns = {x[1] for x in db.execute("PRAGMA table_info(deliveries)")}
            if "dispatch_started" not in columns: db.execute("ALTER TABLE deliveries ADD COLUMN dispatch_started INTEGER NOT NULL DEFAULT 0")
            if "dispatch_kind" not in columns: db.execute("ALTER TABLE deliveries ADD COLUMN dispatch_kind TEXT")

    def _connect(self):
        db = sqlite3.connect(self.db_path, timeout=30, isolation_level=None)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("PRAGMA synchronous=FULL")
        return db

    @staticmethod
    def _event(db, rid, state, detail):
        old = db.execute("SELECT event_hash FROM events ORDER BY seq DESC LIMIT 1").fetchone()
        previous = old[0] if old else "0" * 64
        item = {"requestId": rid, "state": state, "detail": detail, "previousHash": previous}
        db.execute("INSERT INTO events(request_id,state,detail,previous_hash,event_hash) VALUES(?,?,?,?,?)",
                   (rid, state, canonical(detail), previous, digest(item)))

    def enqueue(self, envelope):
        self.registry.verify_projection(envelope)
        envelope = clone(envelope)
        rid, sha = envelope["requestId"], envelope["payloadSha256"]
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            old = db.execute("SELECT payload_sha,envelope FROM deliveries WHERE request_id=?", (rid,)).fetchone()
            if old:
                require(old["payload_sha"] == sha and old["envelope"] == canonical(envelope), "IDEMPOTENCY_PAYLOAD_CONFLICT")
                db.commit(); return False
            db.execute("INSERT INTO deliveries(request_id,payload_sha,envelope,state) VALUES(?,?,?,?)", (rid, sha, canonical(envelope), "PREPARED"))
            self._event(db, rid, "PREPARED", {"payloadSha256": sha})
            db.commit(); return True

    def enqueue_many(self, envelopes):
        # Whole-batch validation occurs before the first mutation.
        items = list(envelopes)
        for item in items: self.registry.verify_projection(item)
        added = 0
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            for envelope in items:
                rid, sha, wire = envelope["requestId"], envelope["payloadSha256"], canonical(envelope)
                old = db.execute("SELECT payload_sha,envelope FROM deliveries WHERE request_id=?", (rid,)).fetchone()
                if old:
                    require(old["payload_sha"] == sha and old["envelope"] == wire, "IDEMPOTENCY_PAYLOAD_CONFLICT")
                    continue
                db.execute("INSERT INTO deliveries(request_id,payload_sha,envelope,state) VALUES(?,?,?,?)", (rid, sha, wire, "PREPARED"))
                self._event(db, rid, "PREPARED", {"payloadSha256": sha}); added += 1
            db.commit()
        return added

    def claim(self, worker_id, now, lease_seconds=300, exclude_ids=()):
        require(isinstance(worker_id, str) and IDENTIFIER.fullmatch(worker_id), "WORKER_ID")
        require(type(now) in {int, float} and math.isfinite(now), "FINITE_CLOCK_REQUIRED")
        require(type(lease_seconds) in {int, float} and math.isfinite(lease_seconds) and lease_seconds > 0 and math.isfinite(now+lease_seconds), "LEASE_DURATION")
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            excludes = tuple(exclude_ids)
            sql = "SELECT * FROM deliveries WHERE (state IN ('PREPARED','RETRY') OR (state='INFLIGHT' AND lease_until<=?))"
            args = [now]
            if excludes:
                sql += " AND request_id NOT IN (" + ",".join("?" for _ in excludes) + ")"
                args.extend(excludes)
            while True:
                row = db.execute(sql + " ORDER BY rowid LIMIT 1", args).fetchone()
                if not row: db.commit(); return None
                if row["state"] == "INFLIGHT" and row["dispatch_started"] and row["dispatch_kind"] == "EXTERNAL":
                    # The previous process may have committed remotely before dying.
                    # Never replay an unknown remote effect just because a lease expired.
                    db.execute("UPDATE deliveries SET state='SENT_RETURN_HELD',last_error='LOST_WORKER_AFTER_EXTERNAL_DISPATCH',lease_until=NULL WHERE request_id=?", (row["request_id"],))
                    self._event(db, row["request_id"], "SENT_RETURN_HELD", {"receiptDigest": None, "error": "LOST_WORKER_AFTER_EXTERNAL_DISPATCH"})
                    continue
                break
            if not row: db.commit(); return None
            token = uuid.uuid4().hex
            db.execute("UPDATE deliveries SET state='INFLIGHT',attempts=attempts+1,worker=?,lease_token=?,lease_until=?,dispatch_started=0,dispatch_kind=NULL WHERE request_id=?", (worker_id, token, now+lease_seconds, row["request_id"]))
            self._event(db, row["request_id"], "INFLIGHT", {"worker": worker_id, "leaseToken": token, "attempt": row["attempts"] + 1})
            db.commit()
            return {"envelope": json.loads(row["envelope"]), "leaseToken": token, "worker": worker_id, "leaseUntil": now+lease_seconds}

    def mark_dispatch(self, claim, kind):
        require(kind in {"LOCAL", "EXTERNAL"}, "DISPATCH_KIND")
        rid = claim["envelope"]["requestId"]
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT state,worker,lease_token,dispatch_started FROM deliveries WHERE request_id=?", (rid,)).fetchone()
            require(row is not None and row["state"] == "INFLIGHT" and row["worker"] == claim["worker"] and row["lease_token"] == claim["leaseToken"] and row["dispatch_started"] == 0, "STALE_OR_DISPATCHED_WORKER")
            db.execute("UPDATE deliveries SET dispatch_started=1,dispatch_kind=? WHERE request_id=?", (kind,rid))
            self._event(db, rid, "INFLIGHT", {"stage": "DISPATCH_STARTED", "kind": kind, "leaseToken": claim["leaseToken"]})
            db.commit()

    def finish(self, claim, state, receipt=None, error=None):
        require(state in {"LOCAL_DELIVERED", "CALLBACK_RECEIPT_RECORDED", "RETRY", "HELD", "SENT_RETURN_HELD"}, "FINISH_STATE")
        rid = claim["envelope"]["requestId"]
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT state,worker,lease_token,dispatch_started,dispatch_kind FROM deliveries WHERE request_id=?", (rid,)).fetchone()
            require(row is not None and row["state"] == "INFLIGHT" and row["worker"] == claim["worker"] and row["lease_token"] == claim["leaseToken"], "STALE_WORKER_LEASE")
            if state in {"LOCAL_DELIVERED", "CALLBACK_RECEIPT_RECORDED"}:
                require(type(receipt) is dict and set(receipt) == {"requestId", "payloadSha256", "receiptRef", "evidenceClass", "hostVerified", "idempotencyKeyHonored"}, "DELIVERY_RECEIPT_REQUIRED")
                expected_class = "LOCAL_FILESYSTEM_READBACK" if state == "LOCAL_DELIVERED" else "CALLBACK_REPORTED_NOT_INDEPENDENTLY_VERIFIED"
                require(receipt["requestId"] == rid and receipt["payloadSha256"] == claim["envelope"]["payloadSha256"]
                        and receipt["hostVerified"] is False and receipt["idempotencyKeyHonored"] is True
                        and receipt["evidenceClass"] == expected_class and isinstance(receipt["receiptRef"], str)
                        and 0 < len(receipt["receiptRef"]) <= 2000 and row["dispatch_started"] == 1
                        and row["dispatch_kind"] == ("LOCAL" if state == "LOCAL_DELIVERED" else "EXTERNAL"), "DELIVERY_RECEIPT_IDENTITY")
            db.execute("UPDATE deliveries SET state=?,receipt=?,last_error=?,lease_until=NULL WHERE request_id=?", (state, canonical(receipt) if receipt else None, error, rid))
            self._event(db, rid, state, {"receiptDigest": digest(receipt) if receipt else None, "error": error})
            db.commit()

    def drain(self, adapter, authorizer, worker_id, limit=None, now: Callable = time.time):
        require(adapter is not None and callable(getattr(adapter, "send", None)) and callable(getattr(adapter, "readback", None)), "DELIVERY_ADAPTER_REQUIRED")
        require(limit is None or type(limit) is int and limit >= 1, "DRAIN_LIMIT")
        # A snapshot avoids retrying one failed row forever during one invocation.
        with self._connect() as db:
            available = db.execute("SELECT count(*) FROM deliveries WHERE state IN ('PREPARED','RETRY') OR (state='INFLIGHT' AND lease_until<=?)", (now(),)).fetchone()[0]
        count = min(available, limit) if limit is not None else available
        outcomes = []
        seen = set()
        def finish_current(claim, state, receipt=None, error=None):
            try:
                self.finish(claim, state, receipt, error)
                return state
            except IntegrationHold as lost:
                if str(lost) == "STALE_WORKER_LEASE": return "LEASE_LOST"
                raise
        for _ in range(count):
            claim = self.claim(worker_id, now(), exclude_ids=seen)
            if not claim: break
            envelope = claim["envelope"]
            seen.add(envelope["requestId"])
            sent, receipt, attempted = False, None, False
            try:
                self.registry.verify_projection(envelope)
                read_grant = checked_grant(authorizer, envelope, "READ", now())
                send_grant = checked_grant(authorizer, envelope, "DISPATCH", now())
                require(read_grant["principal"] == send_grant["principal"] and read_grant["epoch"] == send_grant["epoch"] and read_grant["kind"] == send_grant["kind"], "GRANT_CHANGED_BEFORE_DISPATCH")
                if not isinstance(adapter, LocalFileAdapter):
                    require(send_grant["kind"] == "HOST_CALLBACK_REPORTED", "LOCAL_GRANT_CANNOT_AUTHORIZE_HOST")
                self.mark_dispatch(claim, "LOCAL" if isinstance(adapter, LocalFileAdapter) else "EXTERNAL")
                attempted = True
                receipt = adapter.send(clone(envelope), clone(send_grant)); sent = True
                require(type(receipt) is dict and receipt.get("requestId") == envelope["requestId"] and receipt.get("payloadSha256") == envelope["payloadSha256"] and receipt.get("idempotencyKeyHonored") is True, "ACK_IDENTITY_MISMATCH")
                return_grant = checked_grant(authorizer, envelope, "RETURN", now())
                require(return_grant["principal"] == send_grant["principal"] and return_grant["epoch"] == send_grant["epoch"] and return_grant["kind"] == send_grant["kind"], "GRANT_CHANGED_AT_RETURN")
                require(adapter.readback(clone(envelope), clone(receipt), clone(return_grant)) == envelope["payloadSha256"], "READBACK_MISMATCH")
                final_grant = checked_grant(authorizer, envelope, "RETURN", now())
                require(final_grant == return_grant, "GRANT_CHANGED_DURING_READBACK")
                state = "LOCAL_DELIVERED" if isinstance(adapter, LocalFileAdapter) else "CALLBACK_RECEIPT_RECORDED"
                # A callback reporting hostVerified:true is not independent evidence.
                receipt["hostVerified"] = False
                receipt["evidenceClass"] = "LOCAL_FILESYSTEM_READBACK" if state == "LOCAL_DELIVERED" else "CALLBACK_REPORTED_NOT_INDEPENDENTLY_VERIFIED"
                state = finish_current(claim, state, receipt)
                outcomes.append({"requestId": envelope["requestId"], "state": state})
            except IntegrationHold as error:
                state = "SENT_RETURN_HELD" if sent or attempted and not isinstance(adapter, LocalFileAdapter) else "HELD"
                state = finish_current(claim, state, None, str(error))
                outcomes.append({"requestId": envelope["requestId"], "state": state, "reason": str(error)})
            except Exception as error:
                # A remote write may precede a lost ACK; callback idempotency is
                # not independently known. Only atomic local files auto-retry.
                state = "SENT_RETURN_HELD" if sent or attempted and not isinstance(adapter, LocalFileAdapter) else "RETRY"
                state = finish_current(claim, state, None, type(error).__name__)
                outcomes.append({"requestId": envelope["requestId"], "state": state, "reason": type(error).__name__})
        return {"schema": "atlas.outbox-drain/v1", "processed": len(outcomes), "outcomes": outcomes,
                "hostedChangesVerified": 0, "modelVisitsClaimed": 0, "canonEffect": "NONE"}

    def release_hold(self, request_id, expected_state, reason):
        require(expected_state in {"HELD", "SENT_RETURN_HELD"} and isinstance(reason, str) and 0 < len(reason) <= 200, "RELEASE_REVIEW_REQUIRED")
        with self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT state FROM deliveries WHERE request_id=?", (request_id,)).fetchone()
            require(row is not None and row[0] == expected_state, "HOLD_STATE_CHANGED")
            db.execute("UPDATE deliveries SET state='RETRY',last_error=NULL WHERE request_id=?", (request_id,))
            self._event(db, request_id, "RETRY", {"reviewReason": reason})
            db.commit()

    def summary(self):
        with self._connect() as db:
            counts = {row[0]: row[1] for row in db.execute("SELECT state,count(*) FROM deliveries GROUP BY state")}
            tail = db.execute("SELECT event_hash FROM events ORDER BY seq DESC LIMIT 1").fetchone()
            return {"total": sum(counts.values()), "states": counts, "ledgerHead": tail[0] if tail else "0"*64,
                    "eventCount": db.execute("SELECT count(*) FROM events").fetchone()[0],
                    "hostedChangesVerified": 0, "actualModelVisits": 0, "canonEffect": "NONE"}

    def verify(self):
        previous = "0" * 64
        latest, attempts, claims = {}, {}, {}
        with self._connect() as db:
            for row in db.execute("SELECT * FROM events ORDER BY seq"):
                detail = json.loads(row["detail"])
                rid = row["request_id"]
                item = {"requestId": rid, "state": row["state"], "detail": detail, "previousHash": previous}
                require(row["previous_hash"] == previous and row["event_hash"] == digest(item), "EVENT_CHAIN_MISMATCH")
                previous = row["event_hash"]
                latest[rid] = {"state": row["state"], "detail": detail}
                if "attempt" in detail:
                    attempts[rid] = attempts.get(rid, 0) + 1
                    require(detail["attempt"] == attempts[rid], "ATTEMPT_SEQUENCE_MISMATCH")
                    claims[rid] = detail
            rows = list(db.execute("SELECT * FROM deliveries"))
            require(set(latest) == {r["request_id"] for r in rows}, "EVENT_DELIVERY_INVENTORY_MISMATCH")
            for row in rows:
                envelope = json.loads(row["envelope"])
                self.registry.verify_projection(envelope)
                require(row["request_id"] == envelope["requestId"] and row["payload_sha"] == envelope["payloadSha256"], "STORED_ENVELOPE_MISMATCH")
                event = latest[row["request_id"]]
                require(row["state"] == event["state"] and row["attempts"] == attempts.get(row["request_id"], 0), "DELIVERY_STATE_EVENT_MISMATCH")
                if row["state"] == "INFLIGHT":
                    claim = claims[row["request_id"]]
                    require(row["worker"] == claim["worker"] and row["lease_token"] == claim["leaseToken"], "LEASE_EVENT_MISMATCH")
                if "receiptDigest" in event["detail"]:
                    receipt = json.loads(row["receipt"]) if row["receipt"] else None
                    require((digest(receipt) if receipt else None) == event["detail"]["receiptDigest"] and row["last_error"] == event["detail"]["error"], "RECEIPT_EVENT_MISMATCH")
        return {"valid": True, "ledgerHead": previous, "trustedExternalAttestation": False}
