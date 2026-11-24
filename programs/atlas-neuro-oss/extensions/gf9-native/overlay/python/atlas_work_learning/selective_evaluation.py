"""Finite, source-bound evaluation of abstention policies; standard library only.

Scores are ranking statistics, never probabilities. Thresholds are selected from
validation records only. Wilson bounds here are nominal descriptive intervals,
not distribution-free risk guarantees, especially after threshold selection or
under shift. Families are the uncertainty unit: a selected family is an error
when ANY of its accepted rows is wrong. The ordinary row risk is also reported.

This original module adds an evaluator alongside the existing retrieval metrics.
It neither executes a model nor changes a checkpoint, source grant or retriever.
Inspect AI's public metric contracts informed the review; no upstream code is
copied. Artifact hashes detect changes but do not authenticate label provenance.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from copy import deepcopy
import hashlib
import json
import math
import random
import re
from statistics import NormalDist

SCHEMA = "atlas.selective-evaluation/v1"
MAX_ROWS = 10_000
MAX_THRESHOLDS = 256
MAX_BOOTSTRAP_DRAWS = 1_000_000
LABEL_KINDS = frozenset({"synthetic", "human", "model"})
ROW_KEYS = frozenset({"id", "family_id", "family_sha256", "source_sha256", "split",
                      "score", "correct", "label_kind"})
PROVENANCE_KEYS = frozenset({"model_sha256", "scorer_sha256", "score_name", "dataset_sha256",
                             "label_set_sha256", "label_protocol_sha256"})
SCORE_BINDING_KEYS = ("model_sha256", "scorer_sha256", "score_name", "label_protocol_sha256")
ASSUMPTIONS = [
    "Family identity and label provenance are supplied declarations, not independently authenticated facts.",
    "Known source hashes are disjoint across validation and test; unknown derivatives or forged family/source declarations are not detected.",
    "Wilson uncertainty treats independent sampled families as Bernoulli units; related or nonexchangeable families weaken that interpretation.",
    "A family fails when any accepted row is wrong; this is stricter than average row error and depends on the family query mix.",
    "The validation-selected Wilson criterion is descriptive, not a simultaneous or distribution-free risk-control guarantee.",
    "Held-out distribution shift can increase risk above the validation target; coverage and observed failures must remain visible.",
]


def _fail(code):
    raise ValueError(code)


def _number(value, code):
    if type(value) not in (int, float):
        _fail(code)
    try:
        result = float(value)
    except (ValueError, OverflowError):
        _fail(code)
    if not math.isfinite(result):
        _fail(code)
    return result


def _integer(value, low, high, code):
    if type(value) is not int or not low <= value <= high:
        _fail(code)
    return value


def _text(value, code):
    if type(value) is not str or not value or value != value.strip() or len(value) > 256:
        _fail(code)
    return value


def _hash(value, code):
    if type(value) is not str or re.fullmatch(r"[0-9a-f]{64}", value) is None:
        _fail(code)
    return value


def _digest(value):
    try:
        raw = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
                         allow_nan=False).encode("utf-8")
    except (TypeError, ValueError, OverflowError, RecursionError):
        _fail("SELECTIVE_ARTIFACT_DATA_INVALID")
    return hashlib.sha256(raw).hexdigest()


def _seal(value):
    result = deepcopy(value)
    result["artifact_sha256"] = _digest(result)
    return result


def _verify_seal(value, kind):
    if type(value) is not dict or value.get("schema") != SCHEMA or value.get("kind") != kind:
        _fail("SELECTIVE_ARTIFACT_SCHEMA")
    body = {k: v for k, v in value.items() if k != "artifact_sha256"}
    if _digest(body) != value.get("artifact_sha256"):
        _fail("SELECTIVE_ARTIFACT_CHANGED")


def _provenance(value):
    if type(value) is not dict or set(value) != PROVENANCE_KEYS:
        _fail("SELECTIVE_PROVENANCE_REQUIRED")
    for key in PROVENANCE_KEYS:
        (_text if key == "score_name" else _hash)(value[key], "SELECTIVE_PROVENANCE_INVALID")
    return dict(value)


def _rows(values, expected_split):
    if type(values) not in (list, tuple) or not 1 <= len(values) <= MAX_ROWS:
        _fail("SELECTIVE_ROWS_BOUNDS")
    records, ids, families, digest_to_family = [], set(), {}, {}
    for row in values:
        if type(row) is not dict or set(row) != ROW_KEYS:
            _fail("SELECTIVE_ROW_SCHEMA")
        ident = _text(row["id"], "SELECTIVE_ID_INVALID")
        family = _text(row["family_id"], "SELECTIVE_FAMILY_INVALID")
        family_digest = _hash(row["family_sha256"], "SELECTIVE_FAMILY_INVALID")
        _hash(row["source_sha256"], "SELECTIVE_SOURCE_INVALID")
        if ident in ids:
            _fail("SELECTIVE_DUPLICATE_ID")
        if type(row["split"]) is not str or row["split"] != expected_split:
            _fail("SELECTIVE_SPLIT_MISMATCH")
        if type(row["correct"]) is not bool:
            _fail("SELECTIVE_BINARY_LABEL_REQUIRED")
        if type(row["label_kind"]) is not str or row["label_kind"] not in LABEL_KINDS:
            _fail("SELECTIVE_LABEL_KIND_REQUIRED")
        if family in families and families[family] != family_digest:
            _fail("SELECTIVE_FAMILY_BINDING_CONFLICT")
        if family_digest in digest_to_family and digest_to_family[family_digest] != family:
            _fail("SELECTIVE_FAMILY_ALIAS")
        ids.add(ident); families[family] = family_digest; digest_to_family[family_digest] = family
        captured = dict(row)
        captured["score"] = _number(row["score"], "SELECTIVE_SCORE_INVALID")
        records.append(captured)
    return sorted(records, key=lambda row: row["id"])


def _confidence(value):
    level = _number(value, "SELECTIVE_CONFIDENCE_INVALID")
    if not 0.5 < level < 1:
        _fail("SELECTIVE_CONFIDENCE_INVALID")
    return level


def wilson_error_upper(errors, total, *, confidence_level=0.95):
    """One-sided nominal Wilson upper bound; no observations returns None."""
    count = _integer(total, 0, MAX_ROWS, "SELECTIVE_COUNT_INVALID")
    failures = _integer(errors, 0, count, "SELECTIVE_COUNT_INVALID")
    level = _confidence(confidence_level)
    if count == 0:
        return None
    if failures == count:
        return 1.0
    z = NormalDist().inv_cdf(level)
    proportion, z2 = failures / count, z * z
    denominator = 1 + z2 / count
    centre = (proportion + z2 / (2 * count)) / denominator
    radius = z * math.sqrt(proportion * (1 - proportion) / count + z2 / (4 * count * count)) / denominator
    return min(1.0, max(0.0, centre + radius))


def _summary(records, threshold, confidence_level):
    accepted = [row for row in records if threshold is not None and row["score"] >= threshold]
    selected = defaultdict(list)
    for row in accepted:
        selected[row["family_id"]].append(row)
    failures = sum(not row["correct"] for row in accepted)
    family_failures = sum(any(not row["correct"] for row in group) for group in selected.values())
    family_total = len({row["family_id"] for row in records})
    return {"rows": len(records), "accepted_rows": len(accepted), "row_coverage": len(accepted) / len(records),
            "row_errors": failures, "row_selective_risk": failures / len(accepted) if accepted else None,
            "families": family_total, "accepted_families": len(selected),
            "family_coverage": len(selected) / family_total,
            "family_errors": family_failures,
            "family_any_error_risk": family_failures / len(selected) if selected else None,
            "family_risk_wilson_upper": wilson_error_upper(family_failures, len(selected), confidence_level=confidence_level),
            "label_kinds": dict(sorted(Counter(row["label_kind"] for row in records).items()))}


def fit_selective_policy(validation_rows, *, provenance, risk_target=0.10,
                         confidence_level=0.95, min_selected_families=10,
                         candidate_thresholds=None):
    """Freeze a validation-only threshold. None means HOLD/accept no rows.

    A bounded explicit grid may be supplied; otherwise all distinct validation
    scores are used, up to MAX_THRESHOLDS. No test input is accepted by this API.
    """
    records = _rows(validation_rows, "validation")
    pins = _provenance(provenance)
    target = _number(risk_target, "SELECTIVE_TARGET_INVALID")
    if not 0 <= target < 1:
        _fail("SELECTIVE_TARGET_INVALID")
    level = _confidence(confidence_level)
    minimum = _integer(min_selected_families, 1, MAX_ROWS, "SELECTIVE_MINIMUM_INVALID")
    if candidate_thresholds is None:
        thresholds = sorted({row["score"] for row in records})
        strategy = "ALL_DISTINCT_VALIDATION_SCORES"
    else:
        if type(candidate_thresholds) not in (list, tuple) or not 1 <= len(candidate_thresholds) <= MAX_THRESHOLDS:
            _fail("SELECTIVE_THRESHOLD_BUDGET")
        thresholds = [_number(value, "SELECTIVE_THRESHOLD_INVALID") for value in candidate_thresholds]
        if len(set(thresholds)) != len(thresholds):
            _fail("SELECTIVE_DUPLICATE_THRESHOLD")
        thresholds.sort(); strategy = "EXPLICIT_VALIDATION_GRID"
    if not 1 <= len(thresholds) <= MAX_THRESHOLDS:
        _fail("SELECTIVE_THRESHOLD_BUDGET")
    diagnostics, feasible = [], []
    for threshold in thresholds:
        metrics = _summary(records, threshold, level)
        upper = metrics["family_risk_wilson_upper"]
        eligible = metrics["accepted_families"] >= minimum and upper is not None and upper <= target
        entry = {"threshold": threshold, "metrics": metrics, "meets_validation_criterion": eligible}
        diagnostics.append(entry)
        if eligible:
            feasible.append(entry)
    chosen = min(feasible, key=lambda entry: (-entry["metrics"]["accepted_rows"],
                                             entry["metrics"]["family_risk_wilson_upper"], entry["threshold"])) if feasible else None
    return _seal({"schema": SCHEMA, "kind": "SELECTIVE_POLICY", "phase": "VALIDATION_FROZEN",
        "decision": "SELECTED" if chosen else "HOLD_NO_VALID_THRESHOLD",
        "threshold": chosen["threshold"] if chosen else None, "comparison": "score >= threshold",
        "score_semantics": "RANKING_STATISTIC_NOT_PROBABILITY", "provenance": pins,
        "risk_target": target, "confidence_level": level, "confidence_kind": "ONE_SIDED_NOMINAL_WILSON",
        "risk_unit": "ACCEPTED_FAMILY_ANY_ERROR", "min_selected_families": minimum,
        "threshold_strategy": strategy, "thresholds_considered": diagnostics,
        "validation_rows_sha256": _digest(records),
        "validation_record_ids": [row["id"] for row in records],
        "validation_family_ids": sorted({row["family_id"] for row in records}),
        "validation_family_sha256s": sorted({row["family_sha256"] for row in records}),
        "validation_source_sha256s": sorted({row["source_sha256"] for row in records}),
        "validation_metrics": chosen["metrics"] if chosen else _summary(records, None, level),
        "test_used_for_selection": False, "assumptions": list(ASSUMPTIONS)})


def _policy(value):
    _verify_seal(value, "SELECTIVE_POLICY")
    if value.get("phase") != "VALIDATION_FROZEN" or value.get("test_used_for_selection") is not False:
        _fail("SELECTIVE_POLICY_NOT_FROZEN")
    _provenance(value.get("provenance"))
    _confidence(value.get("confidence_level"))
    target = _number(value.get("risk_target"), "SELECTIVE_TARGET_INVALID")
    if not 0 <= target < 1 or value.get("risk_unit") != "ACCEPTED_FAMILY_ANY_ERROR":
        _fail("SELECTIVE_POLICY_INVALID")
    if value.get("decision") == "SELECTED":
        _number(value.get("threshold"), "SELECTIVE_THRESHOLD_INVALID")
    elif value.get("decision") != "HOLD_NO_VALID_THRESHOLD" or value.get("threshold") is not None:
        _fail("SELECTIVE_POLICY_INVALID")
    for key in ("validation_record_ids", "validation_family_ids", "validation_family_sha256s"):
        items = value.get(key)
        if type(items) is not list or not 1 <= len(items) <= MAX_ROWS or any(type(item) is not str for item in items) or len(set(items)) != len(items):
            _fail("SELECTIVE_POLICY_INVALID")
    # A legacy policy lacking this inventory cannot establish known-source
    # separation. Do not silently treat a missing inventory as an empty set.
    sources = value.get("validation_source_sha256s")
    if type(sources) is not list or not 1 <= len(sources) <= MAX_ROWS:
        _fail("SELECTIVE_SOURCE_INVENTORY_REQUIRED")
    for source in sources:
        _hash(source, "SELECTIVE_SOURCE_INVENTORY_INVALID")
    if len(set(sources)) != len(sources):
        _fail("SELECTIVE_SOURCE_INVENTORY_INVALID")
    return value


def evaluate_selective_policy(policy, test_rows, *, provenance):
    """Evaluate a frozen policy on disjoint held-out data, without fitting it."""
    policy = _policy(policy)
    records, pins = _rows(test_rows, "test"), _provenance(provenance)
    if any(pins[key] != policy["provenance"][key] for key in SCORE_BINDING_KEYS):
        _fail("SELECTIVE_SCORE_BINDING_MISMATCH")
    if set(policy["validation_record_ids"]) & {row["id"] for row in records}:
        _fail("SELECTIVE_RECORD_LEAKAGE")
    if set(policy["validation_family_ids"]) & {row["family_id"] for row in records}:
        _fail("SELECTIVE_FAMILY_LEAKAGE")
    if set(policy["validation_family_sha256s"]) & {row["family_sha256"] for row in records}:
        _fail("SELECTIVE_FAMILY_DIGEST_LEAKAGE")
    if set(policy["validation_source_sha256s"]) & {row["source_sha256"] for row in records}:
        _fail("SELECTIVE_SOURCE_DIGEST_LEAKAGE")
    if pins["dataset_sha256"] == policy["provenance"]["dataset_sha256"]:
        _fail("SELECTIVE_DATASET_EDITION_REUSED")
    if pins["label_set_sha256"] == policy["provenance"]["label_set_sha256"]:
        _fail("SELECTIVE_LABEL_SET_REUSED")
    threshold = policy["threshold"]
    metrics = _summary(records, threshold, policy["confidence_level"])
    upper = metrics["family_risk_wilson_upper"]
    return _seal({"schema": SCHEMA, "kind": "SELECTIVE_TEST_REPORT", "phase": "HELD_OUT_TEST",
        "policy_sha256": policy["artifact_sha256"], "threshold": threshold, "policy_decision": policy["decision"],
        "risk_unit": policy["risk_unit"], "risk_target": policy["risk_target"],
        "confidence_level": policy["confidence_level"], "provenance": pins,
        "test_rows_sha256": _digest(records), "metrics": metrics,
        "observed_target_exceeded": None if upper is None else upper > policy["risk_target"],
        "case_results": [{**row, "accepted": threshold is not None and row["score"] >= threshold} for row in records],
        "test_used_for_selection": False, "assumptions": list(ASSUMPTIONS)})


def _report(value):
    _verify_seal(value, "SELECTIVE_TEST_REPORT")
    if value.get("phase") != "HELD_OUT_TEST" or value.get("test_used_for_selection") is not False:
        _fail("SELECTIVE_REPORT_NOT_HELD_OUT")
    _provenance(value.get("provenance"))
    cases = value.get("case_results")
    if type(cases) is not list or any(type(row) is not dict or set(row) != ROW_KEYS | {"accepted"} for row in cases):
        _fail("SELECTIVE_REPORT_CASES_INVALID")
    rows = _rows([{key: val for key, val in row.items() if key != "accepted"} for row in cases], "test")
    threshold = value.get("threshold")
    if threshold is not None:
        _number(threshold, "SELECTIVE_THRESHOLD_INVALID")
    indexed = {row["id"]: row for row in cases}
    for row in rows:
        accepted = indexed[row["id"]]["accepted"]
        if type(accepted) is not bool or accepted != (threshold is not None and row["score"] >= threshold):
            _fail("SELECTIVE_ACCEPTANCE_MISMATCH")
    if value.get("test_rows_sha256") != _digest(rows):
        _fail("SELECTIVE_REPORT_CASES_CHANGED")
    return indexed


def _quantile(values, probability):
    if not values:
        return None
    values = sorted(values)
    position = (len(values) - 1) * probability
    lower = math.floor(position); upper = math.ceil(position)
    return values[lower] + (values[upper] - values[lower]) * (position - lower)


def paired_family_selective_bootstrap(left_report, right_report, *, samples=1000, seed=1728,
                                      confidence_level=0.95):
    """Compare abstention policies on the same labeled scored predictions.

    Undefined risk replicates (no accepted families for either policy) are
    counted, never imputed as zero. Coverage deltas remain defined.
    """
    count = _integer(samples, 100, 10_000, "SELECTIVE_BOOTSTRAP_BUDGET")
    _integer(seed, 0, 2**64 - 1, "SELECTIVE_SEED_INVALID")
    level = _confidence(confidence_level)
    left, right = _report(left_report), _report(right_report)
    if set(left) != set(right):
        _fail("SELECTIVE_UNPAIRED_IDS")
    for key in PROVENANCE_KEYS:
        if left_report["provenance"][key] != right_report["provenance"][key]:
            _fail("SELECTIVE_UNPAIRED_DATASET")
    groups = defaultdict(list)
    for ident in sorted(left):
        a, b = left[ident], right[ident]
        for key in ("family_id", "family_sha256", "source_sha256", "correct", "label_kind", "split", "score"):
            if a[key] != b[key]:
                _fail("SELECTIVE_UNPAIRED_LABEL_OR_FAMILY")
        groups[a["family_id"]].append(ident)
    if len(groups) < 2:
        _fail("SELECTIVE_INSUFFICIENT_FAMILIES")
    if len(groups) * count > MAX_BOOTSTRAP_DRAWS:
        _fail("SELECTIVE_BOOTSTRAP_WORK_BUDGET")
    # Per-family sufficient statistics preserve all rows and paired labels.
    stats = []
    for family in sorted(groups):
        ids = groups[family]
        item = [len(ids)]
        for cases in (left, right):
            selected = [cases[ident] for ident in ids if cases[ident]["accepted"]]
            item.extend([len(selected), int(bool(selected)), int(any(not row["correct"] for row in selected))])
        stats.append(item)

    def delta(indices):
        totals = [sum(stats[i][j] for i in indices) for j in range(7)]
        rows, lrows, lfams, lerrors, rrows, rfams, rerrors = totals
        risk = lerrors / lfams - rerrors / rfams if lfams and rfams else None
        return risk, lrows / rows - rrows / rows

    rng = random.Random(seed)
    risk_values, coverage_values, undefined = [], [], 0
    for _ in range(count):
        risk, coverage = delta([rng.randrange(len(stats)) for _ in stats])
        coverage_values.append(coverage)
        if risk is None:
            undefined += 1
        else:
            risk_values.append(risk)
    observed_risk, observed_coverage = delta(range(len(stats)))
    alpha = (1 - level) / 2
    status = "COMPLETE" if not undefined else "PARTIALLY_UNDEFINED_RISK" if risk_values else "UNDEFINED_RISK"
    return _seal({"schema": SCHEMA, "kind": "PAIRED_FAMILY_SELECTIVE_BOOTSTRAP", "status": status,
        "left_report_sha256": left_report["artifact_sha256"], "right_report_sha256": right_report["artifact_sha256"],
        "families": len(stats), "samples": count, "seed": seed, "confidence_level": level,
        "metric": "FAMILY_ANY_ERROR_RISK_LEFT_MINUS_RIGHT", "coverage_metric": "ROW_COVERAGE_LEFT_MINUS_RIGHT",
        "comparison_scope": "FIXED_ABSTENTION_POLICIES_ON_IDENTICAL_LABELED_SCORED_PREDICTIONS",
        "observed_risk_delta": observed_risk, "observed_coverage_delta": observed_coverage,
        "risk_percentile_interval": [_quantile(risk_values, alpha), _quantile(risk_values, 1-alpha)],
        "coverage_percentile_interval": [_quantile(coverage_values, alpha), _quantile(coverage_values, 1-alpha)],
        "valid_risk_replicates": len(risk_values), "undefined_risk_replicates": undefined,
        "risk_interval_scope": "CONDITIONAL_ON_BOTH_POLICIES_ACCEPTING_FAMILIES" if undefined else "ALL_REPLICATES",
        "assumptions": ["Declared source families are the resampling clusters; unknown derivative overlap is not repaired.",
                        "Policies were frozen before these held-out cases; no policy is selected by this comparison.",
                        "Percentile bootstrap intervals are descriptive approximations, not distribution-free guarantees."]})
