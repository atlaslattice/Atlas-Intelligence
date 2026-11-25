"""Source-pinned, Work-only corpus admission and conservative family splits.

No importer fetches providers or executes imported content. Exact deduplication
retains aliases. Source identity, full-source digest and exact-text aliases join
families transitively before any split is assigned.
"""
from __future__ import annotations

import copy
import hashlib
import json
import math
import os
import re
import tempfile
from collections import Counter
from pathlib import Path
from typing import Any, Iterable

from .registry import ARIADNE_SHA256, HSN_PATTERN, SHA_PATTERN

CORPUS_SCHEMA = "atlas.work-learning.corpus/v1"
R08_REVIEW_SHA256 = "3b7152d9cf30b75cc389246b436aba85eba4f791319a77443c3b873dfe79869e"
AUTHOR_KINDS = {"human", "model", "mixed", "unknown", "synthetic"}
SPLITS = ("train", "validation", "test")


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")


def _strict_json(raw: str | bytes) -> Any:
    def unique_keys(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError("CORPUS_JSON_DUPLICATE_KEY")
            result[key] = value
        return result

    def reject_constant(_):
        raise ValueError("CORPUS_JSON_NONFINITE_VALUE")

    return json.loads(raw, object_pairs_hook=unique_keys, parse_constant=reject_constant)


def text_sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def file_sha256(path: str | Path) -> str:
    h = hashlib.sha256()
    with Path(path).open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def _atomic_json(path: Path, value: Any) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = canonical_bytes(value)
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".pending-", delete=False) as f:
        temp = Path(f.name)
        os.chmod(temp, 0o600)
        f.write(raw)
        f.flush()
        os.fsync(f.fileno())
    try:
        if path.exists() and path.read_bytes() != raw:
            raise ValueError("IMMUTABLE_CORPUS_DESTINATION_EXISTS")
        os.replace(temp, path)
    finally:
        temp.unlink(missing_ok=True)
    return hashlib.sha256(raw).hexdigest()


class _Families:
    def __init__(self):
        self.parent: dict[str, str] = {}

    def find(self, x: str) -> str:
        self.parent.setdefault(x, x)
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[x] != x:
            following = self.parent[x]
            self.parent[x] = root
            x = following
        return root

    def union(self, a: str, b: str) -> None:
        a, b = self.find(a), self.find(b)
        if a != b:
            self.parent[max(a, b)] = min(a, b)


def _required_text(item: dict, key: str, maximum: int = 8192) -> str:
    value = item.get(key)
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise ValueError(f"INVALID_{key.upper()}")
    return value


def _alias(item: dict) -> dict:
    return {k: copy.deepcopy(item[k]) for k in (
        "id", "source_id", "source_version", "source_uri", "source_sha256", "text_sha256",
        "title", "family_id", "scope", "author_kind", "evidence_status",
    )}


def _validate_item(raw: Any) -> dict:
    if not isinstance(raw, dict):
        raise ValueError("ITEM_OBJECT_REQUIRED")
    # Scope is checked before text is read, hashed or emitted in a hold record.
    if raw.get("scope") != "WORK" or raw.get("revoked") is True or raw.get("access_status") in {"DENIED", "REVOKED"}:
        raise ValueError("WORK_SCOPE_OR_ACCESS_REQUIRED")
    item = copy.deepcopy(raw)
    for k in ("id", "source_id", "source_version", "source_uri", "title", "family_id", "evidence_status"):
        _required_text(item, k)
    for k in ("source_sha256", "text_sha256"):
        if not isinstance(item.get(k), str) or not SHA_PATTERN.fullmatch(item[k]):
            raise ValueError(f"INVALID_{k.upper()}")
    _required_text(item, "text", 2_000_000)
    if text_sha256(item["text"]) != item["text_sha256"]:
        raise ValueError("TEXT_SHA256_MISMATCH")
    if item.get("author_kind") not in AUTHOR_KINDS:
        raise ValueError("AUTHOR_KIND_REQUIRED")
    candidates = item.get("hsn_candidates", [])
    if not isinstance(candidates, list) or len(candidates) > 1728:
        raise ValueError("INVALID_HSN_CANDIDATES")
    normalized = []
    for c in candidates:
        c = {"hsn": c, "status": "CANDIDATE_UNREVIEWED"} if isinstance(c, str) else copy.deepcopy(c)
        if not isinstance(c, dict) or not HSN_PATTERN.fullmatch(c.get("hsn", c.get("coordinate", ""))):
            raise ValueError("INVALID_HSN_CANDIDATE")
        c["hsn"] = c.get("hsn", c.get("coordinate"))
        # Candidate source labels are provenance only, never supervised targets.
        c.setdefault("status", "CANDIDATE_UNREVIEWED")
        c["used_as_training_label"] = False
        normalized.append(c)
    item["hsn_candidates"] = normalized
    aliases = item.get("aliases", [])
    if not isinstance(aliases, list):
        raise ValueError("INVALID_ALIASES")
    checked_aliases = []
    for alias in aliases:
        if not isinstance(alias, dict) or alias.get("scope") != "WORK":
            raise ValueError("ALIAS_WORK_SCOPE_REQUIRED")
        a = copy.deepcopy(alias)
        for k in ("id", "source_id", "source_version", "source_uri", "family_id"):
            _required_text(a, k)
        for k in ("source_sha256", "text_sha256"):
            if not SHA_PATTERN.fullmatch(a.get(k, "")):
                raise ValueError("ALIAS_HASH_REQUIRED")
        if a["text_sha256"] != item["text_sha256"]:
            raise ValueError("ALIAS_TEXT_HASH_MISMATCH")
        checked_aliases.append(a)
    item["aliases"] = checked_aliases
    related = item.get("related_family_ids", [])
    if not isinstance(related, list) or any(not isinstance(v, str) or not v.strip() for v in related):
        raise ValueError("INVALID_RELATED_FAMILIES")
    return item


def canonicalize_items(items: Iterable[dict], *, input_pins: list[dict] | None = None,
                       seed: int = 1728, split_ratios=(0.8, 0.1, 0.1), coverage: dict | None = None) -> dict:
    if not isinstance(seed, int) or isinstance(seed, bool):
        raise ValueError("INVALID_SPLIT_SEED")
    if len(split_ratios) != 3 or any(not isinstance(v, (int, float)) or not math.isfinite(v) or v < 0 for v in split_ratios) or abs(sum(split_ratios) - 1) > 1e-9:
        raise ValueError("INVALID_SPLIT_RATIOS")
    prepared, held = [], []
    input_count = 0
    for raw in items:
        input_count += 1
        try:
            item = _validate_item(raw)
            prepared.append(item)
        except (ValueError, TypeError) as exc:
            held.append({"id": raw.get("id") if isinstance(raw, dict) else None, "reason": str(exc)})
    id_counts = Counter(item["id"] for item in prepared)
    duplicates = {i for i, count in id_counts.items() if count > 1}
    for item in prepared:
        if item["id"] in duplicates:
            held.append({"id": item["id"], "reason": "DUPLICATE_OR_CONFLICTING_ITEM_ID"})
    lineage_items = prepared
    prepared = [item for item in prepared if item["id"] not in duplicates]
    families = _Families()
    # Include context-held Work records in lineage construction to avoid aliases
    # creating a hidden bridge between independently assigned splits.
    for item in lineage_items:
        links = ["family:" + item["family_id"], "source:" + item["source_id"],
                 "body:" + item["source_sha256"], "text:" + item["text_sha256"]]
        links.extend("family:" + f for f in item.get("related_family_ids", []))
        for a in item["aliases"]:
            links.extend(["family:" + a["family_id"], "source:" + a["source_id"], "body:" + a["source_sha256"]])
        for v in links[1:]:
            families.union(links[0], v)
    components: dict[str, list[str]] = {}
    for key in families.parent:
        components.setdefault(families.find(key), []).append(key)
    component_ids = {key: "family:" + hashlib.sha256(canonical_bytes(sorted(vals))).hexdigest()
                     for key, vals in components.items()}
    unique: dict[str, dict] = {}
    for item in sorted(prepared, key=lambda d: d["id"]):
        original_family = item["family_id"]
        family = component_ids[families.find("family:" + original_family)]
        bucket = int(hashlib.sha256(f"{seed}:{family}".encode()).hexdigest()[:16], 16) / 2**64
        split = "train" if bucket < split_ratios[0] else "validation" if bucket < sum(split_ratios[:2]) else "test"
        if item.get("context_complete") is False or item.get("admission_status") in {"HELD", "REVOKED"}:
            held.append({"id": item["id"], "reason": item.get("hold_reason", "CONTEXT_INCOMPLETE"),
                         "text_sha256": item["text_sha256"], "family_id": family})
            continue
        aliases = [_alias(item), *item.pop("aliases")]
        item["declared_family_id"] = original_family
        item["family_id"] = family
        item["split"] = split
        item["training_label_status"] = "NO_ACCEPTED_HSN_LABELS"
        key = item["text_sha256"]
        if key not in unique:
            item["aliases"] = aliases
            unique[key] = item
        else:
            previous = unique[key]
            if previous["text"] != item["text"] or previous["family_id"] != family or previous["split"] != split:
                raise ValueError("DEDUPLICATION_IDENTITY_CONFLICT")
            previous["aliases"].extend(aliases)
            # Preserve candidate provenance from every source without elevating it.
            previous["hsn_candidates"].extend(item["hsn_candidates"])
    result_items = sorted(unique.values(), key=lambda d: d["id"])
    for item in result_items:
        item["aliases"] = sorted({canonical_bytes(a): a for a in item["aliases"]}.values(), key=lambda a: canonical_bytes(a))
        item["hsn_candidates"] = sorted({canonical_bytes(a): a for a in item["hsn_candidates"]}.values(), key=lambda a: canonical_bytes(a))
    split_counts = {s: sum(i["split"] == s for i in result_items) for s in SPLITS}
    manifest = {
        "schema": "atlas.work-learning.corpus-manifest/v1", "input_pins": input_pins or [],
        "scope": "OWNER_PRIVATE_WORK", "coverage": coverage or {"whole_archive_complete": False},
        "counts": {"discovered": input_count, "validated_work_records": len(prepared),
                   "admitted": len(result_items), "held": len(held),
                   "duplicate_records": len(prepared) - len(result_items) - sum(i.get("context_complete") is False or i.get("admission_status") in {"HELD", "REVOKED"} for i in prepared),
                   "aliases": sum(len(i["aliases"]) for i in result_items),
                   "families": len({i["family_id"] for i in result_items}), "splits": split_counts},
        "split_policy": {"seed": seed, "ratios": list(split_ratios),
                         "method": "TRANSITIVE_DECLARED_FAMILY_SOURCE_ID_FULL_SOURCE_HASH_EXACT_TEXT_HASH",
                         "semantic_family_completeness": "NOT_ESTABLISHED", "held_out_used_for_training": False},
        "semantic_acceptance": False, "source_bodies_are_inert": True,
    }
    return {"schema": CORPUS_SCHEMA, "items": result_items, "held": sorted(held, key=lambda h: str(h.get("id"))), "manifest": manifest}


def save_corpus(corpus: dict, output_dir: str | Path) -> dict:
    output = Path(output_dir)
    digest = hashlib.sha256(canonical_bytes(corpus)).hexdigest()
    path = output / f"corpus-{digest[:16]}.json"
    _atomic_json(path, corpus)
    manifest = {**corpus["manifest"], "corpus_path": str(path.resolve()), "corpus_sha256": digest,
                "corpus_bytes": path.stat().st_size}
    manifest_path = output / f"manifest-{digest[:16]}.json"
    _atomic_json(manifest_path, manifest)
    return {**manifest, "manifest_path": str(manifest_path.resolve()), "manifest_sha256": file_sha256(manifest_path)}


def import_corpus(input_path: str | Path, output_dir: str | Path, *, expected_sha256: str | None = None,
                  seed: int = 1728, split_ratios=(0.8, 0.1, 0.1)) -> dict:
    path = Path(input_path)
    digest = file_sha256(path)
    if expected_sha256 is not None and digest != expected_sha256:
        raise ValueError("CORPUS_INPUT_SHA256_MISMATCH")
    if path.suffix.lower() == ".jsonl":
        items = [_strict_json(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
        coverage = None
    else:
        raw = _strict_json(path.read_text(encoding="utf-8"))
        items = raw if isinstance(raw, list) else raw.get("items")
        coverage = raw.get("manifest", {}).get("coverage") if isinstance(raw, dict) else None
    if not isinstance(items, list):
        raise ValueError("CORPUS_ITEMS_REQUIRED")
    corpus = canonicalize_items(items, input_pins=[{"path": str(path.resolve()), "sha256": digest}],
                                seed=seed, split_ratios=split_ratios, coverage=coverage)
    return save_corpus(corpus, output_dir)


def load_corpus(path: str | Path, expected_sha256: str | None = None) -> dict:
    raw = Path(path).read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if expected_sha256 is not None and digest != expected_sha256:
        raise ValueError("CORPUS_SHA256_MISMATCH")
    corpus = _strict_json(raw.decode("utf-8"))
    if corpus.get("schema") != CORPUS_SCHEMA or not isinstance(corpus.get("items"), list):
        raise ValueError("CORPUS_SCHEMA_MISMATCH")
    families: dict[str, str] = {}
    identities: dict[str, str] = {}
    seen_ids, seen_hashes = set(), set()
    for item in corpus["items"]:
        _validate_item(item)
        if item.get("split") not in SPLITS or item["id"] in seen_ids or item["text_sha256"] in seen_hashes:
            raise ValueError("CORPUS_SPLIT_OR_DUPLICATE_INVALID")
        if item.get("context_complete") is False or item.get("admission_status") in {"HELD", "REVOKED"}:
            raise ValueError("HELD_ITEM_IN_ADMITTED_CORPUS")
        seen_ids.add(item["id"]); seen_hashes.add(item["text_sha256"])
        for key in [item["family_id"], *[a["family_id"] for a in item["aliases"]]]:
            if key in families and families[key] != item["split"]:
                raise ValueError("CORPUS_FAMILY_SPLIT_LEAKAGE")
            families[key] = item["split"]
        for alias in [_alias(item), *item["aliases"]]:
            for key in ("source:" + alias["source_id"], "body:" + alias["source_sha256"]):
                if key in identities and identities[key] != item["split"]:
                    raise ValueError("CORPUS_SOURCE_SPLIT_LEAKAGE")
                identities[key] = item["split"]
    corpus["sha256"] = digest
    return corpus


def prepare_r08(review_path: str | Path, input_root: str | Path, output_dir: str | Path, *,
                expected_review_sha256: str = R08_REVIEW_SHA256, seed: int = 1728) -> dict:
    """Replay only the admitted R05/R08 Work source subset, retaining all holds.

    ``input_root`` is the extracted R05 ``atlas_corpus`` directory. The larger
    sealed corpus is never opened. Full snapshot bytes are pinned; only documents
    explicitly referenced by the R08 packet become selected source bodies.
    """
    review_path, root = Path(review_path), Path(input_root)
    if file_sha256(review_path) != expected_review_sha256:
        raise ValueError("R08_REVIEW_SHA256_MISMATCH")
    review = json.loads(review_path.read_text(encoding="utf-8"))
    if review.get("schema") != "atlas.corpus.delta-review/v1" or review.get("scope") != "OWNER_PRIVATE_WORK":
        raise ValueError("R08_WORK_PACKET_REQUIRED")
    receipt_path = review_path.parent / "export-receipt.json"
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    pins = [{"path": str(review_path.resolve()), "sha256": expected_review_sha256},
            {"path": str(receipt_path.resolve()), "sha256": file_sha256(receipt_path)}]
    corpus_file, routes_file = None, None
    if len(receipt["inputFiles"]) != 4:
        raise ValueError("R08_INPUT_SET_MISMATCH")
    seen_pin_keys = set()
    for entry in receipt["inputFiles"]:
        path = (root / entry["path"]).resolve()
        if not path.is_relative_to(root.resolve()) or file_sha256(path) != entry["sha256"] or path.stat().st_size != entry["bytes"]:
            raise ValueError("R08_INPUT_PIN_MISMATCH")
        pins.append({"path": str(path), "sha256": entry["sha256"], "bytes": entry["bytes"]})
        if entry["path"].endswith("corpus-index.json"):
            corpus_file = path
            pin_key = "corpusSha256"
        elif entry["path"].endswith("engineering-delta-index.json"):
            pin_key = "engineeringSha256"
        elif entry["path"].endswith("hsn-delta-routes.json"):
            routes_file = path
            pin_key = "routesSha256"
        elif entry["path"].endswith("ontology_ariadne_v07_original.json"):
            pin_key = "originalOntologySha256"
        else:
            raise ValueError("R08_UNEXPECTED_INPUT")
        if pin_key in seen_pin_keys or entry["sha256"] != review["inputPins"].get(pin_key):
            raise ValueError("R08_REVIEW_RECEIPT_PIN_MISMATCH")
        seen_pin_keys.add(pin_key)
    if review["inputPins"].get("originalOntologySha256") != ARIADNE_SHA256 or corpus_file is None:
        raise ValueError("R08_SOURCE_BINDING_MISMATCH")
    ready, held = review["candidates"], review["heldCandidates"]
    all_candidates = ready + held
    selected_ids = {p["documentId"] for c in all_candidates for p in c["sourcePins"]}
    source_file = json.loads(corpus_file.read_text(encoding="utf-8"))
    selected: dict[str, dict] = {}
    for record in source_file["records"]:
        if record.get("id") in selected_ids:
            if record["id"] in selected:
                raise ValueError("R08_AMBIGUOUS_SOURCE_DOCUMENT")
            if record.get("kind") not in {"document", "archive_member"} or record.get("status") not in {"INDEXED", "INDEXED_SELECTED_MEMBERS"} or record.get("access_status") != "CONTROLLER_AUTHORIZED_WORK" or record.get("revoked") is True:
                raise ValueError("R08_SOURCE_NOT_ADMITTED_WORK")
            if text_sha256(record["text"]) != record["text_sha256"]:
                raise ValueError("R08_FULL_TEXT_HASH_MISMATCH")
            selected[record["id"]] = record
    if set(selected) != selected_ids:
        raise ValueError("R08_SOURCE_DOCUMENT_MISSING")
    del source_file
    routes = json.loads(routes_file.read_text(encoding="utf-8"))["routes"]
    expected_original_ids = {i for c in all_candidates for i in c["originalIds"]}
    route_ids = set()
    for route in routes:
        if route["delta_id"] in route_ids:
            raise ValueError("R08_DUPLICATE_ORIGINAL_OCCURRENCE")
        route_ids.add(route["delta_id"])
        d = selected.get(route["document_id"])
        a = route["anchor"]
        if d is None or route.get("source_admission") != "ADMITTED_WORK_SNAPSHOT" or (route["source_id"], route["version_id"], route["text_sha256"]) != (d["source_id"], d["version_id"], d["text_sha256"]):
            raise ValueError("R08_ORIGINAL_ROUTE_SOURCE_MISMATCH")
        start, end = a["document_start_character"], a["document_end_character"]
        if type(start) is not int or type(end) is not int or not 0 <= start < end <= len(d["text"]):
            raise ValueError("R08_ORIGINAL_ROUTE_OFFSETS_INVALID")
        if d["text"][start:end] != a["excerpt"] or text_sha256(a["excerpt"]) != route["excerpt_sha256"]:
            raise ValueError("R08_ORIGINAL_ROUTE_SPAN_MISMATCH")
    if route_ids != expected_original_ids or len(routes) != review["counts"]["inputRecords"]:
        raise ValueError("R08_ORIGINAL_OCCURRENCE_SET_MISMATCH")
    occurrence_count = len(routes)
    del routes
    canonical, span_count = [], 0
    ready_ids = {c["id"] for c in ready}
    for candidate in all_candidates:
        text = candidate["statement"]
        if text_sha256(text) != candidate["quoteSha256"]:
            raise ValueError("R08_QUOTE_HASH_MISMATCH")
        aliases = []
        for p in candidate["sourcePins"]:
            d = selected[p["documentId"]]
            if p.get("scope") != "WORK" or (p["sourceId"], p["version"], p["sourceSha256"]) != (d["source_id"], d["version_id"], d["text_sha256"]):
                raise ValueError("R08_CITATION_SOURCE_MISMATCH")
            if p.get("offsetUnit") != "UTF16_CODE_UNITS" or type(p.get("start")) is not int or type(p.get("end")) is not int or not 0 <= p["start"] < p["end"]:
                raise ValueError("R08_CITATION_OFFSETS_INVALID")
            body16 = d["text"].encode("utf-16-le")
            if p["end"] * 2 > len(body16):
                raise ValueError("R08_CITATION_OUTSIDE_SOURCE")
            try:
                excerpt = body16[p["start"] * 2:p["end"] * 2].decode("utf-16-le")
            except UnicodeDecodeError as exc:
                raise ValueError("R08_CITATION_SPLITS_SURROGATE") from exc
            if excerpt != text or p["quoteSha256"] != candidate["quoteSha256"]:
                raise ValueError("R08_EXCERPT_SPAN_MISMATCH")
            span_count += 1
            aliases.append({"id": p["id"], "source_id": p["sourceId"], "source_version": p["version"],
                            "source_uri": p["sourceUri"], "source_sha256": p["sourceSha256"],
                            "text_sha256": candidate["quoteSha256"], "title": d["title"],
                            "family_id": "source:" + p["sourceId"], "scope": "WORK", "author_kind": "unknown",
                            "evidence_status": "EXACT_SOURCE_QUOTE_CLAIM_UNVERIFIED", "document_id": p["documentId"],
                            "citation": copy.deepcopy(p)})
        if not aliases:
            raise ValueError("R08_SOURCE_PIN_REQUIRED")
        first = aliases[0]
        routing = candidate.get("routing", {})
        hsn = []
        for role, key in (("DOMAIN", "domainCandidates"), ("METHOD", "methodCandidates")):
            for proposal in routing.get(key, []):
                address = proposal.get("coordinate", proposal.get("hsn")) if isinstance(proposal, dict) else proposal
                if address and HSN_PATTERN.fullmatch(address):
                    hsn.append({"hsn": address, "role": role, "status": "CANDIDATE_UNREVIEWED", "source_proposal": proposal})
        canonical.append({**{k: first[k] for k in ("source_id", "source_version", "source_uri", "source_sha256", "title", "family_id", "scope", "author_kind", "evidence_status")},
                          "id": candidate["id"], "text": text, "text_sha256": candidate["quoteSha256"],
                          "aliases": aliases, "hsn_candidates": hsn, "original_ids": candidate.get("originalIds", []),
                          "context_complete": candidate["id"] in ready_ids and candidate.get("contextComplete") is True,
                          "admission_status": "ADMITTED" if candidate["id"] in ready_ids else "HELD",
                          "hold_reason": "UPSTREAM_REQUIRED_CONTEXT_OR_SUBSTANCE_HELD",
                          "source_contexts": candidate.get("contexts", []), "companions": candidate.get("companions", {}),
                          "semantic_acceptance": False, "author_identity_established": False,
                          "current_remote_rights_reauthenticated": False})
    coverage = {"whole_archive_complete": False, "basis": "EXISTING_R05_R08_WORK_SUBSET",
                "upstream_coverage": review.get("coverage", {}), "source_documents_verified": len(selected),
                "source_identities": len({d["source_id"] for d in selected.values()}),
                "source_versions": len({(d["source_id"], d["version_id"]) for d in selected.values()}),
                "distinct_citation_spans_verified": span_count, "original_occurrence_spans_verified": occurrence_count,
                "exact_source_spans_verified": occurrence_count, "upstream_occurrences": review["counts"]["inputRecords"],
                "current_remote_rights_reauthenticated": False, "historical_snapshot_owner_local_use": True,
                "independent_semantic_labels": 0, "independent_author_identity_verified": False}
    result = canonicalize_items(canonical, input_pins=pins, seed=seed, coverage=coverage)
    return save_corpus(result, output_dir)
