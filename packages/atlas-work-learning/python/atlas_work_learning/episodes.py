"""Owner-bound, append-only productive-work evidence with explicit eligibility.

Receipts establish recorded evidence references, not the truth of their contents.
No write is callable through the public read-only tool surface. Training reads
replay current holds/revocations and bind real episodes to the admitted corpus.
"""
from __future__ import annotations

import copy
import hashlib
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .corpus import AUTHOR_KINDS, canonical_bytes, text_sha256
from .registry import SHA_PATTERN

ZERO_HASH = "0" * 64
FEEDBACK_KINDS = {"explicit_preference", "software_test", "source_supported_correction", "independent_evidence", "synthetic_fixture"}
VERIFIED_STATUSES = {"REVIEWED", "VERIFIED", "SOURCE_VERIFIED", "SOURCE_SUPPORTED_CORRECTION", "INDEPENDENTLY_VERIFIED", "SOFTWARE_TEST_VERIFIED", "SYNTHETIC_FIXTURE_VERIFIED"}
OBJECTIVES = {"text_correction", "retrieval_pair", "preference"}


def _text(value: Any, name: str, maximum: int = 1_000_000) -> str:
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise ValueError(f"EPISODE_INVALID_{name.upper()}")
    return value


def _references(values: Any, name: str, *, source: bool = False) -> list[dict]:
    if not isinstance(values, list) or len(values) > 1000:
        raise ValueError(f"EPISODE_INVALID_{name.upper()}")
    result = []
    for item in values:
        if not isinstance(item, dict):
            raise ValueError("EPISODE_REFERENCE_OBJECT_REQUIRED")
        value = copy.deepcopy(item)
        fields = ("source_id", "source_version") if source else ("id",)
        for field in fields:
            _text(value.get(field), field, 8192)
        key = "source_sha256" if source else "sha256"
        if not isinstance(value.get(key), str) or not SHA_PATTERN.fullmatch(value[key]):
            raise ValueError("EPISODE_REFERENCE_HASH_REQUIRED")
        if source and value.get("scope", "WORK") != "WORK":
            raise ValueError("EPISODE_SOURCE_SCOPE_REQUIRED")
        if source:
            value["scope"] = "WORK"
        result.append(value)
    return result


def validate_episode(episode: dict, owner: str) -> dict:
    if not isinstance(episode, dict) or episode.get("scope") != "WORK":
        raise ValueError("EPISODE_WORK_SCOPE_REQUIRED")
    if episode.get("owner", owner) != owner:
        raise ValueError("EPISODE_OWNER_MISMATCH")
    e = copy.deepcopy(episode)
    e["owner"] = owner
    for k in ("id", "task_id", "family_id", "evidence_status"):
        _text(e.get(k), k, 8192)
    if e.get("split") not in {"train", "validation", "test"}:
        raise ValueError("EPISODE_SPLIT_REQUIRED")
    if e.get("author_kind") not in AUTHOR_KINDS:
        raise ValueError("EPISODE_AUTHOR_KIND_REQUIRED")
    if e.get("feedback_kind") not in FEEDBACK_KINDS:
        raise ValueError("EPISODE_FEEDBACK_KIND_REQUIRED")
    if type(e.get("training_eligible")) is not bool:
        raise ValueError("EPISODE_EXPLICIT_ELIGIBILITY_REQUIRED")
    for k in ("input_text", "attempted_output"):
        _text(e.get(k), k)
    # A held observation can be useful before any corrected output exists.
    if e.get("corrected_output") is not None:
        _text(e["corrected_output"], "corrected_output")
    for field, hash_field in (("input_text", "input_sha256"), ("attempted_output", "attempted_output_sha256"), ("corrected_output", "target_sha256")):
        if e.get(field) is not None:
            digest = text_sha256(e[field])
            if hash_field in e and e[hash_field] != digest:
                raise ValueError("EPISODE_CONTENT_HASH_MISMATCH")
            e[hash_field] = digest
    e["source_refs"] = _references(e.get("source_refs", []), "source_refs", source=True)
    e["verification_refs"] = _references(e.get("verification_refs", []), "verification_refs")
    e["artifact_refs"] = _references(e.get("artifact_refs", []), "artifact_refs")
    e["outcome_refs"] = _references(e.get("outcome_refs", []), "outcome_refs")
    item_ids = e.get("corpus_item_ids", [])
    if not isinstance(item_ids, list) or len(item_ids) > 1000:
        raise ValueError("EPISODE_CORPUS_REFERENCES_REQUIRED")
    for item_id in item_ids:
        _text(item_id, "corpus_item_id", 8192)
    if len(set(item_ids)) != len(item_ids):
        raise ValueError("EPISODE_DUPLICATE_CORPUS_REFERENCE")
    if type(e.get("is_synthetic", False)) is not bool:
        raise ValueError("EPISODE_SYNTHETIC_STATUS_INVALID")
    e["is_synthetic"] = e.get("is_synthetic", False)
    if e["is_synthetic"] != (e["feedback_kind"] == "synthetic_fixture"):
        raise ValueError("EPISODE_SYNTHETIC_LABEL_MISMATCH")
    if not e["is_synthetic"] and (not e["source_refs"] or not item_ids):
        raise ValueError("EPISODE_SOURCE_AND_CORPUS_REFERENCES_REQUIRED")
    if e["training_eligible"]:
        _assert_eligible(e)
    e.setdefault("author_identity_status", "SELF_DECLARED")
    e.setdefault("reviewer_identity_status", "SELF_DECLARED")
    e.setdefault("semantic_acceptance_status", "NOT_AUTOMATICALLY_ACCEPTED")
    # Serializability, NaN and surprising Python objects are rejected before SQL.
    if len(canonical_bytes(e)) > 4_000_000:
        raise ValueError("EPISODE_TOO_LARGE")
    return e


def _assert_eligible(e: dict) -> None:
    if not e.get("corrected_output") or not e.get("verification_refs") or e.get("evidence_status") not in VERIFIED_STATUSES:
        raise ValueError("EPISODE_REVIEWED_VERIFIED_OUTCOME_REQUIRED")
    if e.get("split") != "train":
        raise ValueError("EPISODE_HELDOUT_NOT_TRAINABLE")
    _text(e.get("reviewer_id"), "reviewer_id", 200)
    if e.get("is_synthetic") and e.get("evidence_status") != "SYNTHETIC_FIXTURE_VERIFIED":
        raise ValueError("EPISODE_SYNTHETIC_EVIDENCE_STATUS_REQUIRED")


class EpisodeLedger:
    def __init__(self, path: str | Path, owner: str = "owner-local", *, readonly: bool = False):
        self.owner = _text(owner, "owner", 200)
        self.path = Path(path)
        if type(readonly) is not bool:
            raise ValueError("LEDGER_READONLY_BOOLEAN_REQUIRED")
        self.readonly = readonly
        if readonly:
            # URI mode=ro provides an SQLite-enforced boundary as well as the
            # application guards below. Opening a missing ledger creates nothing.
            if not self.path.is_file():
                raise ValueError("LEDGER_NOT_FOUND")
            self.connection = sqlite3.connect(self.path.resolve().as_uri() + "?mode=ro", uri=True,
                                              timeout=20, isolation_level=None)
            self.connection.row_factory = sqlite3.Row
            try:
                self.verify_chain()
            except Exception:
                self.connection.close()
                raise
            return
        self.path.parent.mkdir(parents=True, exist_ok=True)
        try:
            fd = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_RDWR, 0o600)
            os.close(fd)
        except FileExistsError:
            pass
        self.connection = sqlite3.connect(str(self.path), timeout=20, isolation_level=None)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("PRAGMA foreign_keys=ON")
        self.connection.executescript("""
            CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS events(
                sequence INTEGER PRIMARY KEY,
                event_type TEXT NOT NULL,
                created_at TEXT NOT NULL,
                owner TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                previous_sha256 TEXT NOT NULL,
                event_sha256 TEXT UNIQUE NOT NULL
            );
            CREATE TRIGGER IF NOT EXISTS events_no_update BEFORE UPDATE ON events
              BEGIN SELECT RAISE(ABORT,'APPEND_ONLY_LEDGER'); END;
            CREATE TRIGGER IF NOT EXISTS events_no_delete BEFORE DELETE ON events
              BEGIN SELECT RAISE(ABORT,'APPEND_ONLY_LEDGER'); END;
        """)
        self.connection.execute("BEGIN IMMEDIATE")
        try:
            self.connection.execute("INSERT OR IGNORE INTO metadata VALUES('owner',?)", (owner,))
            self.connection.execute("INSERT OR IGNORE INTO metadata VALUES('schema','atlas.work-learning.episodes/v1')")
            actual = dict(self.connection.execute("SELECT key,value FROM metadata").fetchall())
            if actual.get("owner") != owner or actual.get("schema") != "atlas.work-learning.episodes/v1":
                raise ValueError("LEDGER_OWNER_OR_SCHEMA_MISMATCH")
            self.connection.execute("COMMIT")
        except Exception:
            self.connection.execute("ROLLBACK")
            self.connection.close()
            raise
        try:
            self.verify_chain()
        except Exception:
            self.connection.close()
            raise

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()

    def close(self):
        self.connection.close()

    def _guard_write(self, actor_id: str | None = None) -> str:
        if self.readonly:
            raise ValueError("READ_ONLY_LEDGER")
        actor = self.owner if actor_id is None else _text(actor_id, "actor_id", 200)
        if actor != self.owner:
            raise ValueError("LEDGER_ACTOR_OWNER_MISMATCH")
        return actor

    @staticmethod
    def _event_digest(sequence: int, event_type: str, created_at: str, owner: str,
                      payload: dict, previous: str) -> str:
        return hashlib.sha256(canonical_bytes({"schema": "atlas.work-learning.event/v1", "sequence": sequence,
                    "event_type": event_type, "created_at": created_at, "owner": owner,
                    "payload": payload, "previous_sha256": previous})).hexdigest()

    def verify_chain(self) -> dict:
        metadata = dict(self.connection.execute("SELECT key,value FROM metadata").fetchall())
        if metadata.get("owner") != self.owner or metadata.get("schema") != "atlas.work-learning.episodes/v1":
            raise ValueError("LEDGER_OWNER_OR_SCHEMA_MISMATCH")
        previous, count = ZERO_HASH, 0
        for row in self.connection.execute("SELECT * FROM events ORDER BY sequence"):
            count += 1
            if row["sequence"] != count or row["previous_sha256"] != previous or row["owner"] != self.owner:
                raise ValueError("LEDGER_CHAIN_LINK_MISMATCH")
            payload = json.loads(row["payload_json"])
            digest = self._event_digest(count, row["event_type"], row["created_at"], row["owner"], payload, previous)
            if digest != row["event_sha256"] or canonical_bytes(payload).decode() != row["payload_json"]:
                raise ValueError("LEDGER_EVENT_HASH_MISMATCH")
            previous = digest
        return {"valid": True, "events": count, "head_sha256": previous, "owner": self.owner,
                "scope": "WORK", "trust": "LOCAL_HASH_CHAIN_NOT_EXTERNAL_WITNESS"}

    def _state(self) -> tuple[dict, dict]:
        self.verify_chain()
        episodes, source_status = {}, {}
        for row in self.connection.execute("SELECT * FROM events ORDER BY sequence"):
            payload = json.loads(row["payload_json"])
            if row["event_type"] == "EPISODE_RECORDED":
                episode = validate_episode(payload["episode"], self.owner)
                if episode["id"] in episodes:
                    raise ValueError("LEDGER_DUPLICATE_EPISODE")
                episodes[episode["id"]] = {"episode": episode, "status": "ELIGIBLE" if episode["training_eligible"] else "HELD",
                                            "sequence": row["sequence"], "event_sha256": row["event_sha256"],
                                            "recorded_at": row["created_at"], "status_reason": "INITIAL_OWNER_LOCAL_RECORD"}
            elif row["event_type"] == "EPISODE_STATUS":
                if payload.get("actor_id") != self.owner:
                    raise ValueError("LEDGER_ACTOR_OWNER_MISMATCH")
                if payload["episode_id"] not in episodes:
                    raise ValueError("LEDGER_STATUS_UNKNOWN_EPISODE")
                target = episodes[payload["episode_id"]]
                if target["status"] == "REVOKED" or payload["status"] not in {"ELIGIBLE", "HELD", "REVOKED"}:
                    raise ValueError("LEDGER_INVALID_STATUS_TRANSITION")
                if payload["status"] == "ELIGIBLE":
                    _assert_eligible(target["episode"])
                target.update(status=payload["status"], status_reason=payload["reason"], status_event_sha256=row["event_sha256"])
            elif row["event_type"] == "SOURCE_REVOKED":
                if payload.get("actor_id") != self.owner:
                    raise ValueError("LEDGER_ACTOR_OWNER_MISMATCH")
                source_status[payload["source_id"]] = payload
            else:
                raise ValueError("LEDGER_UNKNOWN_EVENT_TYPE")
        return episodes, source_status

    def _insert(self, event_type: str, payload: dict) -> dict:
        self._guard_write()
        head = self.verify_chain()
        sequence = head["events"] + 1
        created = datetime.now(timezone.utc).isoformat()
        digest = self._event_digest(sequence, event_type, created, self.owner, payload, head["head_sha256"])
        self.connection.execute("INSERT INTO events VALUES(?,?,?,?,?,?,?)",
            (sequence, event_type, created, self.owner, canonical_bytes(payload).decode(), head["head_sha256"], digest))
        return {"sequence": sequence, "event_sha256": digest, "event_type": event_type}

    def append_episode(self, episode: dict) -> dict:
        self._guard_write()
        value = validate_episode(episode, self.owner)
        self.connection.execute("BEGIN IMMEDIATE")
        try:
            existing, revoked = self._state()
            if value["id"] in existing:
                if canonical_bytes(existing[value["id"]]["episode"]) == canonical_bytes(value):
                    self.connection.execute("COMMIT")
                    return {"sequence": existing[value["id"]]["sequence"], "event_sha256": existing[value["id"]]["event_sha256"],
                            "episode_id": value["id"], "status": existing[value["id"]]["status"], "idempotent": True}
                raise ValueError("EPISODE_ID_CONFLICT")
            if value["training_eligible"] and any(r["source_id"] in revoked for r in value["source_refs"]):
                raise ValueError("EPISODE_SOURCE_REVOKED")
            event = self._insert("EPISODE_RECORDED", {"episode": value})
            self.connection.execute("COMMIT")
            return {**event, "episode_id": value["id"], "status": "ELIGIBLE" if value["training_eligible"] else "HELD", "idempotent": False}
        except Exception:
            self.connection.execute("ROLLBACK")
            raise

    def set_status(self, episode_id: str, status: str, reason: str, actor_id: str | None = None) -> dict:
        actor_id = self._guard_write(actor_id)
        _text(episode_id, "id", 8192); _text(reason, "reason", 8192)
        if status == "HOLD":
            status = "HELD"
        if status not in {"ELIGIBLE", "HELD", "REVOKED"}:
            raise ValueError("EPISODE_INVALID_STATUS")
        self.connection.execute("BEGIN IMMEDIATE")
        try:
            episodes, revoked = self._state()
            if episode_id not in episodes:
                raise ValueError("UNKNOWN_EPISODE")
            target = episodes[episode_id]
            if target["status"] == "REVOKED":
                raise ValueError("EPISODE_REVOCATION_IS_TERMINAL")
            if status == "ELIGIBLE":
                _assert_eligible(target["episode"])
                if any(r["source_id"] in revoked for r in target["episode"]["source_refs"]):
                    raise ValueError("EPISODE_SOURCE_REVOKED")
            event = self._insert("EPISODE_STATUS", {"episode_id": episode_id, "status": status, "reason": reason,
                                                   "actor_id": actor_id, "actor_identity_status": "OWNER_LOCAL_CLAIM"})
            self.connection.execute("COMMIT")
            return {**event, "episode_id": episode_id, "status": status}
        except Exception:
            self.connection.execute("ROLLBACK")
            raise

    def revoke_source(self, source_id: str, reason: str, actor_id: str | None = None) -> dict:
        actor_id = self._guard_write(actor_id)
        _text(source_id, "source_id", 8192); _text(reason, "reason", 8192)
        self.connection.execute("BEGIN IMMEDIATE")
        try:
            self._state()
            event = self._insert("SOURCE_REVOKED", {"source_id": source_id, "reason": reason, "actor_id": actor_id,
                                                   "actor_identity_status": "OWNER_LOCAL_CLAIM"})
            self.connection.execute("COMMIT")
            return {**event, "source_id": source_id, "status": "REVOKED"}
        except Exception:
            self.connection.execute("ROLLBACK")
            raise

    def list_episodes(self, limit: int = 50, offset: int = 0, include_text: bool = False) -> list[dict]:
        if type(limit) is not int or not 1 <= limit <= 50 or type(offset) is not int or offset < 0:
            raise ValueError("EPISODE_INVALID_PAGE")
        episodes, revoked = self._state()
        result = []
        for state in list(episodes.values())[offset:offset + limit]:
            value = copy.deepcopy(state)
            value["source_revoked"] = any(r["source_id"] in revoked for r in value["episode"]["source_refs"])
            if not include_text:
                # Records may retain extra owner-local evidence fields. Public
                # summaries allow-list metadata rather than trusting every
                # unrecognized field to be free of task or source bodies.
                e = value["episode"]
                fields = ("id", "task_id", "owner", "scope", "family_id", "split", "author_kind",
                          "author_identity_status", "reviewer_id", "reviewer_identity_status",
                          "feedback_kind", "evidence_status", "semantic_acceptance_status",
                          "training_eligible", "is_synthetic", "input_sha256", "attempted_output_sha256",
                          "target_sha256", "corpus_item_ids")
                value["episode"] = {key: e[key] for key in fields if key in e}
                value["episode"]["source_refs"] = [
                    {key: ref[key] for key in ("source_id", "source_version", "source_sha256", "scope") if key in ref}
                    for ref in e["source_refs"]]
                for key in ("verification_refs", "artifact_refs", "outcome_refs"):
                    value["episode"][key] = [{k: ref[k] for k in ("id", "sha256")} for ref in e[key]]
            result.append(value)
        return result

    def training_pairs(self, objective: str = "text_correction", corpus_items: list[dict] | dict | None = None,
                       allow_synthetic: bool = False) -> list[dict]:
        if objective not in OBJECTIVES:
            raise ValueError("EPISODE_UNKNOWN_TRAINING_OBJECTIVE")
        episodes, revoked = self._state()
        by_id = {} if corpus_items is None else corpus_items if isinstance(corpus_items, dict) else {x["id"]: x for x in corpus_items}
        nontraining_families = {x["family_id"] for x in by_id.values() if x.get("split") != "train"}
        pairs = []
        for state in episodes.values():
            e = state["episode"]
            if state["status"] != "ELIGIBLE" or e["split"] != "train" or e["family_id"] in nontraining_families:
                continue
            if any(r["source_id"] in revoked for r in e["source_refs"]):
                continue
            if e["feedback_kind"] == "explicit_preference" and objective != "preference":
                continue
            if objective == "preference" and e["feedback_kind"] != "explicit_preference":
                continue
            if e["is_synthetic"]:
                if not allow_synthetic:
                    continue
            else:
                if not e["corpus_item_ids"] or any(i not in by_id for i in e["corpus_item_ids"]):
                    continue
                referenced = [by_id[i] for i in e["corpus_item_ids"]]
                if any(x.get("scope") != "WORK" or x.get("split") != "train" or x.get("family_id") != e["family_id"] or text_sha256(x["text"]) != x.get("text_sha256") for x in referenced):
                    continue
                if any(x["source_id"] in revoked or any(a["source_id"] in revoked for a in x.get("aliases", [])) for x in referenced):
                    continue
                known = {(x["source_id"], x["source_version"], x["source_sha256"]) for x in referenced}
                known.update((a["source_id"], a["source_version"], a["source_sha256"]) for x in referenced for a in x.get("aliases", []))
                if any((r["source_id"], r["source_version"], r["source_sha256"]) not in known for r in e["source_refs"]):
                    continue
            _assert_eligible(e)
            pairs.append({"id": "episode:" + e["id"], "episode_id": e["id"], "input_text": e["input_text"],
                          "target_text": e["corrected_output"], "attempted_output": e["attempted_output"],
                          "input_sha256": e["input_sha256"], "target_sha256": e["target_sha256"],
                          "family_id": e["family_id"], "split": "train", "kind": "verified_correction",
                          "objective": objective, "training_eligible": True, "is_synthetic": e["is_synthetic"],
                          "feedback_kind": e["feedback_kind"], "evidence_status": e["evidence_status"],
                          "source_refs": e["source_refs"], "corpus_item_ids": e["corpus_item_ids"],
                          "author_kind": e["author_kind"], "verification_refs": e["verification_refs"],
                          "ledger_event_sha256": state["event_sha256"]})
        return pairs

    def status(self) -> dict:
        episodes, revoked = self._state()
        counts = {status.lower(): sum(s["status"] == status for s in episodes.values()) for status in ("ELIGIBLE", "HELD", "REVOKED")}
        return {"schema": "atlas.work-learning.episode-status/v1", "owner": self.owner, "scope": "WORK",
                "episodes": len(episodes), **counts, "revoked_sources": len(revoked), "revoked_source_ids": sorted(revoked),
                "synthetic_episodes": sum(s["episode"]["is_synthetic"] for s in episodes.values()),
                "chain": self.verify_chain(), "eligibility_note": "Eligible status still requires current training-corpus binding"}

    def active_revoked_sources(self) -> list[str]:
        """Current revocations for read-time withholding; this is not unlearning."""
        return sorted(self._state()[1])
