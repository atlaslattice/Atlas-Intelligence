"""MICA Atlas neural eval: exact paired binary-overlap bounds without panel rows.

No source passage or final panel is required. This computes *conditional* bounds
from the published marginal hit counts. It DOES NOT replay model predictions,
recompute nDCG, run significance tests under valid independence assumptions,
or certify generalization from one ontology family.
"""
from __future__ import annotations

from dataclasses import dataclass
from math import comb
from typing import Mapping


def exact_two_sided_mcnemar(a_only: int, b_only: int) -> float:
    """Exact conditional binomial two-sided p for independent discordant pairs."""
    if not all(isinstance(v, int) and not isinstance(v, bool) and v >= 0 for v in (a_only, b_only)):
        raise ValueError("NONNEGATIVE_COUNTS_REQUIRED")
    n = a_only + b_only
    if n == 0:
        return 1.0
    tail = sum(comb(n, k) for k in range(min(a_only, b_only) + 1)) / 2**n
    return min(1.0, 2 * tail)


def possible_joint_outcomes(n: int, a_hits: int, b_hits: int) -> dict:
    """Exhaustive 2×2 paired hit configurations consistent with given margins.

    The exact per-query outcomes are unknown. Do not invent their overlap.
    """
    if any(not isinstance(x, int) or isinstance(x, bool) for x in (n, a_hits, b_hits)):
        raise ValueError("INTEGER_COUNTS_REQUIRED")
    if not (1 <= n <= 10_000 and 0 <= a_hits <= n and 0 <= b_hits <= n):
        raise ValueError("COUNTS_OUT_OF_RANGE")
    rows = []
    for overlap in range(max(0, a_hits + b_hits - n), min(a_hits, b_hits) + 1):
        a_only, b_only = a_hits - overlap, b_hits - overlap
        neither = n - overlap - a_only - b_only
        rows.append({"both_hit": overlap, "a_only": a_only, "b_only": b_only,
                     "neither_hit": neither, "discordant": a_only + b_only,
                     "conditional_two_sided_mcnemar_p": exact_two_sided_mcnemar(a_only, b_only)})
    return {
        "queries": n, "a_hits": a_hits, "b_hits": b_hits,
        "a_hit_rate": a_hits/n, "b_hit_rate": b_hits/n,
        "absolute_hit_rate_lift": (a_hits-b_hits)/n,
        "joint_outcomes_unknown": True,
        "feasible_paired_outcomes": rows,
        "p_min_given_query_independence": min(x["conditional_two_sided_mcnemar_p"] for x in rows),
        "p_max_given_query_independence": max(x["conditional_two_sided_mcnemar_p"] for x in rows),
        "inference_warning": (
            "Even exact paired p-values assume independent query pairs. "
            "One model-authored ontology family does not validate cross-family generalization; "
            "marginal counts cannot reconstruct per-query overlap or nDCG uncertainty."
        ),
    }


def guard_family_split(records: list[Mapping]) -> dict:
    """Fail closed on family leakage before mining or tuning.

    Explicit verified root family IDs are required; textual HSN similarity and
    embedding proximity cannot establish source independence.
    """
    if not isinstance(records, list) or not records:
        return {"status": "HOLD_MISSING_RECORDS"}
    accepted = set()
    seen_ids = set()
    for row in records:
        if not isinstance(row, dict) or set(row) != {"source_id", "root_family_id", "root_verified", "partition"}:
            return {"status": "HOLD_INVALID_RECORD"}
        id_, family, verified, part = (row[k] for k in ("source_id", "root_family_id", "root_verified", "partition"))
        if not isinstance(id_, str) or not id_ or id_ in seen_ids:
            return {"status": "HOLD_DUPLICATE_OR_MISSING_SOURCE"}
        seen_ids.add(id_)
        if verified is not True or not isinstance(family, str) or not family:
            return {"status": "HOLD_UNKNOWN_FAMILY"}
        if part not in {"train", "dev", "test"}:
            return {"status": "HOLD_INVALID_PARTITION"}
        accepted.add((family,part))
    placements = {}
    for family,part in accepted:
        placements.setdefault(family,set()).add(part)
    leaked = sorted(k for k,v in placements.items() if len(v)>1)
    if leaked:
        return {"status":"HOLD_FAMILY_LEAKAGE", "leak_family_count":len(leaked)}
    return {"status":"FAMILY_SPLITS_STRUCTURALLY_DISJOINT", "independent_root_families":len(placements),
            "source_records":len(records),"hostRightsVerified":False,"sourceRootAttested":False,
            "note":"Verifying family label provenance and training reuse rights requires a trusted source."}


def guard_comparison_protocol(arms: list[Mapping]) -> dict:
    """A structural ablation contract, not an observed hierarchy quality gain."""
    if not isinstance(arms,list) or len(arms)<2:
        return {"status":"HOLD_NEED_MULTIPLE_ARMS"}
    required={"arm", "eval_manifest", "candidate_manifest", "source_family_manifest", "encoder_revision", "active_trainable_params", "training_examples", "training_steps", "rerank_budget", "route", "training_split_frozen"}
    pairs=[]
    for a in arms:
        if not isinstance(a,dict) or set(a)!=required:
            return {"status":"HOLD_ABLATION_SHAPE"}
        if a["arm"] not in {"dense", "flat", "true_hierarchy", "shuffled_hierarchy", "typed_edge_ablation"}:
            return {"status":"HOLD_UNKNOWN_ARM"}
        if not all(isinstance(a[k],str) and a[k] for k in ("eval_manifest","candidate_manifest","source_family_manifest","encoder_revision","route")):
            return {"status":"HOLD_UNPINNED_PROTOCOL"}
        if not all(isinstance(a[k],int) and not isinstance(a[k],bool) and a[k]>=0 for k in ("active_trainable_params","training_examples","training_steps","rerank_budget")):
            return {"status":"HOLD_INVALID_BUDGET"}
        if a["training_split_frozen"] is not True:
            return {"status":"HOLD_UNFROZEN_SPLIT"}
        pairs.append(a)
    if len({a["arm"] for a in arms})!=len(arms):
        return {"status":"HOLD_DUPLICATE_ARM"}
    for field in ("eval_manifest","candidate_manifest","source_family_manifest","encoder_revision","training_examples","training_steps","rerank_budget","route"):
        if len({a[field] for a in arms})>1:
            return {"status":"HOLD_INCOMPARABLE_PROTOCOL", "mismatched_field":field}
    # Dense baseline is expected to have no learned adapter; compare hierarchy arms
    # against matched flat/shuffled controls rather than requiring dense parameter equality.
    learned=[a for a in arms if a["arm"]!="dense"]
    if len({a["active_trainable_params"] for a in learned})>1:
        return {"status":"HOLD_UNMATCHED_ACTIVE_PARAMS"}
    return {"status":"COMPARABLE_PROTOCOL_METADATA_ONLY", "arms":[a["arm"] for a in arms],
            "modelWeightsReviewed":False,"actualTrainingPerformed":False,"humanGeneralizationProven":False}
