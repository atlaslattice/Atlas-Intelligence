"""Bind and compare the existing fragment-retrieval evaluation receipts.

This is a read-only diagnostic adapter, not another evaluator or serving gate.
It never encodes text, trains a model, reads a path, checks remote rights, or
changes the neural-primary serving policy. The caller must first verify the
saved files and independently retain their expected pins.

``bind_fragment_evaluation`` accepts an unmodified result from evaluation.py,
its exact query/candidate pairs, and externally supplied provenance. Required
provenance is receipt_sha256 (canonical JSON), corpus_sha256, code_sha256 and
evidence_refs [{id, sha256}]. Neural results also require the selected manifest's
checkpoint_sha256, state_sha256, complete model_config and its canonical
model_config_sha256. A parameter-state hash alone does not bind forward behavior.
Optional source_family_split_sha256 binds a caller-verified full split manifest;
its absence remains UNKNOWN. No corpus text is returned in the envelope.

``compare_evaluations(baseline, candidate)`` compares only matching, bound task
protocols. A lexical diagnostic requires allow_lexical_control=True and retains
its different route. Resource differences do not hide observed retrieval deltas:
each resource is separately MATCH, MISMATCH or UNKNOWN. Hash consistency and
caller-supplied pins do not establish authenticity, source truth, current access
rights, independent family ancestry, causal hierarchy benefit or deployment.
"""
from __future__ import annotations

from collections import defaultdict
from copy import deepcopy
from dataclasses import fields
import hashlib
import json
import math
import re
import statistics

from .evaluation import EVALUATION_SCHEMA, _protocol, validate_pair_splits
from .model import ModelConfig


ENVELOPE_SCHEMA = "atlas.work-learning.comparison-envelope/v1"
COMPARISON_SCHEMA = "atlas.work-learning.paired-comparison/v1"
TASK = "DISJOINT_FRAGMENT_EXACT_ITEM_RETRIEVAL"
_SHA = re.compile(r"[0-9a-f]{64}\Z")
_TIE_POLICY = "STABLE_CANONICAL_CANDIDATE_ID_ORDER"
_MAX_ITEMS = 100_000
_METHOD_ROUTES = {"ADDRESSED_GRAPH": "NEURAL_DIRECT", "FLAT_ADDRESSED_MODEL": "NEURAL_DIRECT",
                  "TFIDF_COSINE": "LEXICAL", "BM25": "LEXICAL"}
_MEAN_METRICS = ("hit_at_1", "hit_at_k", "mrr_at_k", "ndcg_at_k")
_METRICS = (*_MEAN_METRICS, "median_rank")
_PROTOCOL_FIELDS = ("schema", "task", "judgment_kind", "split", "k", "queries", "candidates",
                    "query_ids", "candidate_ids", "query_set_sha256", "candidate_set_sha256",
                    "family_count", "tie_policy", "independent_semantic_validation", "accepted_hsn_labels_used")
_RECEIPT_FIELDS = set(_PROTOCOL_FIELDS) | set(_METRICS) | {
    "method", "ranks", "state_sha256", "checkpoint_sha256", "registry_sha256",
    "vocabulary_size", "zero_overlap_queries", "fit_scope", "retrieval_route",
}
_SOURCE_FIELDS = ("source_id", "source_version", "source_sha256", "text_sha256")
_BINDING_FIELDS = ("id", "family_id", "split", *_SOURCE_FIELDS, "source_uri_sha256",
                   "input_text_sha256", "target_text_sha256")
_COUNT_RESOURCES = ("stored_parameter_count", "active_trainable_parameter_count", "optimizer_updates",
                    "training_pair_presentations", "candidate_score_count", "rerank_candidate_count",
                    "arithmetic_work", "peak_memory_bytes")
RESOURCE_FIELDS = (*_COUNT_RESOURCES, "cpu_seconds", "wall_seconds")
_PROVENANCE_KEYS = {"receipt_sha256", "corpus_sha256", "code_sha256", "evidence_refs",
                    "checkpoint_sha256", "state_sha256", "model_config", "model_config_sha256",
                    "source_family_split_sha256"}


class _Hold(ValueError):
    pass


def _require(condition, reason):
    if not condition:
        raise _Hold(reason)


def canonical_digest(value):
    """SHA-256 of finite canonical JSON, consistent with existing protocol pins."""
    raw = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _sha(value):
    return isinstance(value, str) and _SHA.fullmatch(value) is not None


def _integer(value, minimum=0, maximum=None):
    return type(value) is int and value >= minimum and (maximum is None or value <= maximum)


def _number(value):
    return type(value) in (int, float) and math.isfinite(value)


def _text(value):
    return isinstance(value, str) and bool(value.strip())


def _metrics(ranks, k):
    n = len(ranks)
    return {
        "hit_at_1": sum(r == 1 for r in ranks) / n,
        "hit_at_k": sum(r <= k for r in ranks) / n,
        "mrr_at_k": math.fsum(1 / r if r <= k else 0 for r in ranks) / n,
        "ndcg_at_k": math.fsum(1 / math.log2(r + 1) if r <= k else 0 for r in ranks) / n,
        "median_rank": float(statistics.median(ranks)),
    }


def _validate_receipt(receipt):
    _require(type(receipt) is dict, "RECEIPT_OBJECT_REQUIRED")
    _require(not (set(receipt) - _RECEIPT_FIELDS), "UNSUPPORTED_RECEIPT_FIELDS")
    _require(receipt.get("schema") == EVALUATION_SCHEMA, "UNSUPPORTED_EVALUATION_SCHEMA")
    _require(receipt.get("task") == TASK, "UNSUPPORTED_EVALUATION_TASK")
    _require(receipt.get("judgment_kind") == "SELF_SUPERVISED_DIAGNOSTIC", "UNSUPPORTED_JUDGMENT_KIND")
    _require(receipt.get("independent_semantic_validation") is False and
             receipt.get("accepted_hsn_labels_used") is False, "UNSUPPORTED_SEMANTIC_ACCEPTANCE")
    _require(receipt.get("split") in {"train", "validation", "test"}, "INVALID_EVALUATION_SPLIT")
    _require(_integer(receipt.get("k"), 1, 100), "INVALID_K")
    _require(receipt.get("tie_policy") == _TIE_POLICY, "UNSUPPORTED_TIE_POLICY")
    for key, count_key in (("query_ids", "queries"), ("candidate_ids", "candidates")):
        ids = receipt.get(key)
        _require(type(ids) is list and 1 <= len(ids) <= _MAX_ITEMS and all(_text(i) for i in ids),
                 "INVALID_" + key.upper())
        _require(len(set(ids)) == len(ids), "DUPLICATE_" + key.upper())
        _require(_integer(receipt.get(count_key), 1) and receipt[count_key] == len(ids),
                 "COUNT_MISMATCH:" + count_key)
    _require(receipt["candidate_ids"] == sorted(receipt["candidate_ids"]), "NONCANONICAL_CANDIDATE_ORDER")
    _require(set(receipt["query_ids"]).issubset(receipt["candidate_ids"]), "TARGET_NOT_IN_CANDIDATES")
    for key in ("query_set_sha256", "candidate_set_sha256"):
        _require(_sha(receipt.get(key)), "INVALID_DIGEST:" + key)
    _require(_integer(receipt.get("family_count"), 1, receipt["queries"]), "INVALID_FAMILY_COUNT")
    route = _METHOD_ROUTES.get(receipt.get("method"))
    _require(route is not None, "UNSUPPORTED_RETRIEVAL_METHOD")
    _require("retrieval_route" not in receipt or receipt["retrieval_route"] == route, "ROUTE_METHOD_MISMATCH")
    ranks = receipt.get("ranks")
    _require(type(ranks) is list and len(ranks) == receipt["queries"] and
             all(_integer(r, 1, receipt["candidates"]) for r in ranks), "INVALID_RANKS")
    measured = _metrics(ranks, receipt["k"])
    for key, expected in measured.items():
        _require(_number(receipt.get(key)) and math.isclose(receipt[key], expected, rel_tol=1e-12, abs_tol=1e-12),
                 "RANK_METRIC_MISMATCH:" + key)
    if "registry_sha256" in receipt:
        _require(_sha(receipt["registry_sha256"]), "INVALID_REGISTRY_DIGEST")
    if route == "LEXICAL":
        _require(receipt.get("checkpoint_sha256") is None and receipt.get("state_sha256") is None,
                 "LEXICAL_MODEL_IDENTITY_CONFLICT")
        _require(receipt.get("fit_scope") == "CANDIDATE_TEXT_ONLY", "UNSUPPORTED_LEXICAL_FIT_SCOPE")
    for key in ("vocabulary_size", "zero_overlap_queries"):
        if key in receipt:
            _require(_integer(receipt[key]), "INVALID_" + key.upper())
    if "zero_overlap_queries" in receipt:
        _require(receipt["zero_overlap_queries"] <= receipt["queries"], "INVALID_ZERO_OVERLAP_QUERIES")
    return route, measured


def _validate_provenance(receipt, provenance, registry_sha256, route):
    _require(_sha(registry_sha256), "EXPECTED_REGISTRY_PIN_REQUIRED")
    _require(type(provenance) is dict and not (set(provenance) - _PROVENANCE_KEYS), "INVALID_PROVENANCE_FIELDS")
    for key in ("receipt_sha256", "corpus_sha256", "code_sha256"):
        _require(_sha(provenance.get(key)), "PROVENANCE_PIN_REQUIRED:" + key)
    _require(canonical_digest(receipt) == provenance["receipt_sha256"], "RECEIPT_PIN_MISMATCH")
    if receipt.get("registry_sha256") is not None:
        _require(receipt["registry_sha256"] == registry_sha256, "REGISTRY_PIN_MISMATCH")
    refs = provenance.get("evidence_refs")
    _require(type(refs) is list and 1 <= len(refs) <= 64, "EVIDENCE_REFS_REQUIRED")
    ids = []
    for ref in refs:
        _require(type(ref) is dict and set(ref) == {"id", "sha256"} and _text(ref["id"]) and _sha(ref["sha256"]),
                 "INVALID_EVIDENCE_REF")
        ids.append(ref["id"])
    _require(len(set(ids)) == len(ids), "DUPLICATE_EVIDENCE_REF")
    if provenance.get("source_family_split_sha256") is not None:
        _require(_sha(provenance["source_family_split_sha256"]), "INVALID_SOURCE_FAMILY_SPLIT_PIN")
    model_keys = ("checkpoint_sha256", "state_sha256", "model_config", "model_config_sha256")
    if route == "NEURAL_DIRECT":
        _require(receipt.get("registry_sha256") == registry_sha256, "NEURAL_REGISTRY_PIN_REQUIRED")
        for key in ("checkpoint_sha256", "state_sha256"):
            _require(_sha(provenance.get(key)) and _sha(receipt.get(key)), "MODEL_PIN_REQUIRED:" + key)
            _require(provenance[key] == receipt[key], "MODEL_PIN_MISMATCH:" + key)
        config = provenance.get("model_config")
        _require(type(config) is dict and set(config) == {f.name for f in fields(ModelConfig)},
                 "COMPLETE_MODEL_CONFIG_REQUIRED")
        try:
            ModelConfig(**config)
        except (TypeError, ValueError):
            raise _Hold("INVALID_MODEL_CONFIG") from None
        _require(_sha(provenance.get("model_config_sha256")) and
                 canonical_digest(config) == provenance["model_config_sha256"], "MODEL_CONFIG_PIN_MISMATCH")
        _require(config["hierarchy"] is (receipt["method"] == "ADDRESSED_GRAPH"), "MODEL_CONFIG_METHOD_MISMATCH")
    else:
        _require(all(provenance.get(key) is None for key in model_keys), "LEXICAL_MODEL_PROVENANCE_CONFLICT")


def _resources(resources):
    if resources is None:
        resources = {}
    _require(type(resources) is dict and not (set(resources) - set(RESOURCE_FIELDS)), "INVALID_RESOURCE_FIELDS")
    normalized = {}
    for key in RESOURCE_FIELDS:
        value = resources.get(key)
        if value is not None:
            _require((_integer(value) if key in _COUNT_RESOURCES else _number(value) and value >= 0),
                     "INVALID_RESOURCE_VALUE:" + key)
        normalized[key] = value
    return normalized


def _pair_bindings(pairs):
    result = []
    _require(type(pairs) is list and 1 <= len(pairs) <= _MAX_ITEMS, "PAIR_LIST_REQUIRED")
    for pair in pairs:
        _require(type(pair) is dict, "PAIR_OBJECT_REQUIRED")
        for key in ("id", "family_id", "source_id", "source_version", "source_uri", "input_text", "target_text"):
            _require(_text(pair.get(key)), "PAIR_BINDING_REQUIRED:" + key)
        for key in ("source_sha256", "text_sha256"):
            _require(_sha(pair.get(key)), "PAIR_BINDING_REQUIRED:" + key)
        _require(pair.get("split") in {"train", "validation", "test"}, "PAIR_SPLIT_REQUIRED")
        row = {key: pair[key] for key in ("id", "family_id", "split", *_SOURCE_FIELDS)}
        for key in ("source_uri", "input_text", "target_text"):
            row[key + "_sha256"] = hashlib.sha256(pair[key].encode("utf-8")).hexdigest()
        result.append(row)
    _require(len({p["id"] for p in result}) == len(result), "DUPLICATE_PAIR_ID")
    return result


def _validate_bindings(receipt, query_bindings, candidate_bindings):
    for rows, key in ((query_bindings, "query_ids"), (candidate_bindings, "candidate_ids")):
        _require(type(rows) is list and len(rows) == len(receipt[key]), "BINDING_COUNT_MISMATCH:" + key)
        for row, expected_id in zip(rows, receipt[key]):
            _require(type(row) is dict and set(row) == set(_BINDING_FIELDS), "INVALID_SOURCE_BINDING")
            _require(row["id"] == expected_id and row["split"] == receipt["split"], "BINDING_ID_SPLIT_MISMATCH")
            _require(all(_text(row[k]) for k in ("family_id", "source_id", "source_version")), "INVALID_SOURCE_BINDING")
            _require(all(_sha(row[k]) for k in _BINDING_FIELDS if k.endswith("_sha256")), "INVALID_SOURCE_BINDING_DIGEST")
    _require(len({p["family_id"] for p in query_bindings}) == receipt["family_count"], "FAMILY_COUNT_BINDING_MISMATCH")
    by_id = {p["id"]: p for p in candidate_bindings}
    for query in query_bindings:
        _require(query == by_id[query["id"]], "QUERY_TARGET_SOURCE_BINDING_MISMATCH")


def _hold(reason, *, schema=ENVELOPE_SCHEMA):
    return {"schema": schema, "status": "HOLD", "reasons": [reason], "paired_deltas": None,
            "source_validity": "NOT_ESTABLISHED", "causal_hierarchy_benefit_established": False,
            "serving_policy_changed": False, "training_performed": False, "deployment_performed": False}


def bind_fragment_evaluation(receipt, *, query_pairs, candidate_pairs=None, expected_registry_sha256,
                             provenance, resources=None):
    """Bind a saved fragment receipt to verified caller inputs, without a rerun.

    Query order must be exactly the recorded order. Candidate pairs are sorted
    by ID as in the original evaluator. Missing/inconsistent task bindings HOLD.
    Resources are reported observations (keys in RESOURCE_FIELDS); missing
    values stay None/UNKNOWN. The returned envelope contains hashes, never text.
    """
    try:
        route, _ = _validate_receipt(receipt)
        _validate_provenance(receipt, provenance, expected_registry_sha256, route)
        q_bindings = _pair_bindings(query_pairs)
        candidates = query_pairs if candidate_pairs is None else candidate_pairs
        _pair_bindings(candidates)
        candidates = sorted(candidates, key=lambda p: p["id"])
        c_bindings = _pair_bindings(candidates)
        validate_pair_splits(query_pairs + candidates)
        _, _, _, expected = _protocol(query_pairs, candidates, receipt["k"])
        for key, value in expected.items():
            _require(receipt.get(key) == value, "PROTOCOL_BINDING_MISMATCH:" + key)
        _validate_bindings(receipt, q_bindings, c_bindings)
        envelope = {
            "schema": ENVELOPE_SCHEMA, "status": "BOUND_LOCAL_SNAPSHOT",
            "receipt": deepcopy(receipt), "registry_sha256": expected_registry_sha256,
            "retrieval_route": route, "query_bindings": q_bindings, "candidate_bindings": c_bindings,
            "source_binding_sha256": canonical_digest({"queries": q_bindings, "candidates": c_bindings}),
            "provenance": deepcopy(provenance), "resources": _resources(resources),
            "source_validity": "SUPPLIED_PIN_CONSISTENCY_ONLY_CURRENT_AUTHORIZATION_UNVERIFIED",
        }
        envelope["envelope_sha256"] = canonical_digest(envelope)
        return envelope
    except _Hold as error:
        return _hold(str(error))
    except (TypeError, ValueError, KeyError, OverflowError):
        return _hold("MALFORMED_OR_INCONSISTENT_SUPPLIED_INPUT")


def _validate_envelope(envelope):
    _require(type(envelope) is dict and envelope.get("schema") == ENVELOPE_SCHEMA and
             envelope.get("status") == "BOUND_LOCAL_SNAPSHOT", "BOUND_ENVELOPE_REQUIRED")
    _require(_sha(envelope.get("envelope_sha256")) and canonical_digest(
        {k: v for k, v in envelope.items() if k != "envelope_sha256"}) == envelope["envelope_sha256"], "ENVELOPE_PIN_MISMATCH")
    receipt = envelope.get("receipt")
    route, measured = _validate_receipt(receipt)
    _require(envelope.get("retrieval_route") == route, "ENVELOPE_ROUTE_MISMATCH")
    _validate_provenance(receipt, envelope.get("provenance"), envelope.get("registry_sha256"), route)
    q, c = envelope.get("query_bindings"), envelope.get("candidate_bindings")
    _validate_bindings(receipt, q, c)
    _require(envelope.get("source_binding_sha256") == canonical_digest({"queries": q, "candidates": c}),
             "SOURCE_BINDING_PIN_MISMATCH")
    # The adapter always emits every resource key, using None for unknowns.
    # Validate that normalized form here; accepting an omitted/None object and
    # then using the unnormalized value later would turn malformed input into
    # an exception instead of a HOLD.
    _require(type(envelope.get("resources")) is dict and
             set(envelope["resources"]) == set(RESOURCE_FIELDS), "INVALID_BOUND_RESOURCE_FIELDS")
    _resources(envelope.get("resources"))
    _require(envelope.get("source_validity") == "SUPPLIED_PIN_CONSISTENCY_ONLY_CURRENT_AUTHORIZATION_UNVERIFIED",
             "UNSUPPORTED_SOURCE_VALIDITY_CLAIM")
    return measured


def _resource_comparison(baseline, candidate):
    rows = {}
    for key in RESOURCE_FIELDS:
        left, right = baseline["resources"].get(key), candidate["resources"].get(key)
        status = "UNKNOWN" if left is None or right is None else "MATCH" if left == right else "MISMATCH"
        rows[key] = {"baseline": left, "candidate": right, "status": status}
    states = {v["status"] for v in rows.values()}
    overall = "MISMATCH" if "MISMATCH" in states else "UNKNOWN" if "UNKNOWN" in states else "MATCH"
    return {"status": overall, "fields": rows,
            "meaning": "SUPPLIED_OBSERVATIONS_ONLY; equal stored parameters do not match active parameters or compute",
            "causal_resource_control_established": False, "speedup_established": False}


def compare_evaluations(baseline, candidate, *, allow_lexical_control=False):
    """Compare candidate minus baseline on one exact bound fragment protocol.

    This consumes saved observations only. A successful comparison is explicitly
    descriptive, even if resource observations match. No p-values, confidence
    intervals, source independence, semantic acceptance or policy promotion are
    manufactured. Family-macro means give each declared family equal weight.
    """
    try:
        _require(type(allow_lexical_control) is bool, "LEXICAL_CONTROL_FLAG_MUST_BE_BOOLEAN")
        b_metrics, c_metrics = _validate_envelope(baseline), _validate_envelope(candidate)
        b, c = baseline["receipt"], candidate["receipt"]
        for key in _PROTOCOL_FIELDS:
            _require(b.get(key) == c.get(key), "PAIRED_PROTOCOL_MISMATCH:" + key)
        _require(baseline["registry_sha256"] == candidate["registry_sha256"], "PAIRED_REGISTRY_MISMATCH")
        _require(baseline["provenance"]["corpus_sha256"] == candidate["provenance"]["corpus_sha256"],
                 "PAIRED_CORPUS_MISMATCH")
        _require(baseline["source_binding_sha256"] == candidate["source_binding_sha256"], "PAIRED_SOURCE_BINDING_MISMATCH")
        b_split = baseline["provenance"].get("source_family_split_sha256")
        c_split = candidate["provenance"].get("source_family_split_sha256")
        _require(b_split is None or c_split is None or b_split == c_split, "PAIRED_SOURCE_FAMILY_SPLIT_MISMATCH")
        routes = (baseline["retrieval_route"], candidate["retrieval_route"])
        _require("LEXICAL" not in routes or allow_lexical_control, "EXPLICIT_LEXICAL_CONTROL_REQUIRED")
        delta = {key: c_metrics[key] - b_metrics[key] for key in _METRICS}
        paired, family_indices = [], defaultdict(list)
        for i, binding in enumerate(baseline["query_bindings"]):
            br, cr, k = b["ranks"][i], c["ranks"][i], b["k"]
            bm, cm = _metrics([br], k), _metrics([cr], k)
            paired.append({"query_id": binding["id"], "target_id": binding["id"], "family_id": binding["family_id"],
                           "baseline_rank": br, "candidate_rank": cr, "rank_delta": cr - br,
                           **{key + "_delta": cm[key] - bm[key] for key in _MEAN_METRICS}})
            family_indices[binding["family_id"]].append(i)
        family_rows = []
        for family_id in sorted(family_indices):
            indices = family_indices[family_id]
            bm = _metrics([b["ranks"][i] for i in indices], b["k"])
            cm = _metrics([c["ranks"][i] for i in indices], c["k"])
            family_rows.append({"family_id": family_id, "queries": len(indices), "baseline": bm, "candidate": cm,
                                "candidate_minus_baseline": {key: cm[key] - bm[key] for key in _METRICS}})
        macro = {}
        for side in ("baseline", "candidate"):
            macro[side] = {key: math.fsum(row[side][key] for row in family_rows) / len(family_rows)
                           for key in _MEAN_METRICS}
        macro["candidate_minus_baseline"] = {key: macro["candidate"][key] - macro["baseline"][key] for key in _MEAN_METRICS}
        summary = {
            "rank_improved": sum(p["rank_delta"] < 0 for p in paired),
            "rank_regressed": sum(p["rank_delta"] > 0 for p in paired),
            "rank_tied": sum(p["rank_delta"] == 0 for p in paired),
            "ndcg_improved": sum(p["ndcg_at_k_delta"] > 0 for p in paired),
            "ndcg_regressed": sum(p["ndcg_at_k_delta"] < 0 for p in paired),
            "ndcg_tied": sum(p["ndcg_at_k_delta"] == 0 for p in paired),
            "family_ndcg_improved": sum(r["candidate_minus_baseline"]["ndcg_at_k"] > 0 for r in family_rows),
            "family_ndcg_regressed": sum(r["candidate_minus_baseline"]["ndcg_at_k"] < 0 for r in family_rows),
            "family_ndcg_tied": sum(r["candidate_minus_baseline"]["ndcg_at_k"] == 0 for r in family_rows),
        }
        return {
            "schema": COMPARISON_SCHEMA, "status": "COMPARABLE_DIAGNOSTIC", "reasons": [],
            "task": TASK, "judgment_kind": b["judgment_kind"], "split": b["split"], "k": b["k"],
            "queries": b["queries"], "candidates": b["candidates"],
            "query_set_sha256": b["query_set_sha256"], "candidate_set_sha256": b["candidate_set_sha256"],
            "registry_sha256": baseline["registry_sha256"], "corpus_sha256": baseline["provenance"]["corpus_sha256"],
            "source_binding_sha256": baseline["source_binding_sha256"],
            "baseline_identity": {"method": b["method"], "route": routes[0], "envelope_sha256": baseline["envelope_sha256"],
                                  "provenance": deepcopy(baseline["provenance"])},
            "candidate_identity": {"method": c["method"], "route": routes[1], "envelope_sha256": candidate["envelope_sha256"],
                                   "provenance": deepcopy(candidate["provenance"])},
            "comparison_kind": "EXPLICIT_LEXICAL_DIAGNOSTIC" if "LEXICAL" in routes else "DIRECT_NEURAL_DIAGNOSTIC",
            "micro": {"baseline": b_metrics, "candidate": c_metrics, "candidate_minus_baseline": delta},
            "family_macro": macro, "family_rows": family_rows, "paired_deltas": paired, "paired_summary": summary,
            "declared_family_count": len(family_rows), "independent_family_count": None,
            "family_ancestry_validation": "NOT_ESTABLISHED", "family_weighting": "EQUAL_WEIGHT_PER_DECLARED_FAMILY",
            "split_manifest_matching": "MATCH_SUPPLIED_PIN" if b_split is not None and c_split is not None else "UNKNOWN",
            "resource_matching": _resource_comparison(baseline, candidate),
            "source_validity": "SUPPLIED_PIN_CONSISTENCY_ONLY_CURRENT_AUTHORIZATION_UNVERIFIED",
            "source_truth_established": False, "historical_code_execution_attested": False,
            "causal_hierarchy_benefit_established": False, "independent_semantic_validation": False,
            "serving_policy_changed": False, "training_performed": False, "deployment_performed": False,
            "test_reuse_meaning": "REANALYSIS_OF_SAVED_RANKS_NOT_FRESH_EVALUATION",
            "sign_convention": "candidate minus baseline; positive Hit/MRR/nDCG deltas favor candidate; negative rank and median-rank deltas favor candidate",
        }
    except _Hold as error:
        return _hold(str(error), schema=COMPARISON_SCHEMA)
    except (TypeError, ValueError, KeyError, OverflowError):
        return _hold("MALFORMED_OR_INCONSISTENT_SUPPLIED_INPUT", schema=COMPARISON_SCHEMA)
