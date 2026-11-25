"""Frozen, source-family separated retrieval diagnostics and lexical controls.

The target is the held-out item's other text fragment. These are reproducible
self-supervised diagnostics, not human judgments of factual or HSN semantics.
"""
from __future__ import annotations

from collections import Counter
import hashlib
import json
import math
import re

import numpy as np
from scipy import sparse


PAIR_SCHEMA = "atlas.work-learning.fragment-pairs/v1"
EVALUATION_SCHEMA = "atlas.work-learning.retrieval-evaluation/v1"
_WORDS = re.compile(r"\w+", re.UNICODE)


def _digest(value):
    raw = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def build_corpus_pairs(items, *, min_tokens=12, max_query_tokens=64, max_target_tokens=192, with_manifest=False):
    """Split each source excerpt into non-overlapping prefix/remainder views.

    The split position is one third of its whitespace tokens, bounded by the
    query limit. The target begins exactly there. Short/empty fragments are
    omitted. IDs and split/family/source identity survive without HSN labels.
    """
    if not 6 <= min_tokens <= 4096 or not 2 <= max_query_tokens <= 512 or not 2 <= max_target_tokens <= 4096:
        raise ValueError("INVALID_FRAGMENT_BUDGET")
    result, seen, omitted = [], set(), []
    for item in sorted(items, key=lambda x: x["id"]):
        if item["id"] in seen:
            raise ValueError("DUPLICATE_PAIR_ITEM_ID")
        seen.add(item["id"])
        if item.get("scope", "WORK") != "WORK" or item.get("split") not in {"train", "validation", "test"}:
            raise ValueError("PAIR_WORK_SPLIT_REQUIRED")
        words = item["text"].split()
        if len(words) < min_tokens:
            omitted.append({"id": item["id"], "split": item["split"], "reason": "TOO_FEW_TOKENS"})
            continue
        boundary = min(max_query_tokens, max(2, len(words) // 3))
        query = " ".join(words[:boundary])
        target = " ".join(words[boundary:boundary + max_target_tokens])
        if not _WORDS.search(query) or not _WORDS.search(target):
            omitted.append({"id": item["id"], "split": item["split"], "reason": "EMPTY_WORD_FRAGMENT"})
            continue
        fields = ("id", "family_id", "split", "source_id", "source_version", "source_sha256", "text_sha256", "source_uri", "author_kind")
        pair = {k: item.get(k) for k in fields}
        pair.update({"input_text": query, "target_text": target, "kind": "self_supervised_fragment",
                     "schema": PAIR_SCHEMA, "training_eligible": item["split"] == "train",
                     "fragment_boundary_tokens": boundary,
                     "query_tokens": boundary, "target_tokens": min(len(words) - boundary, max_target_tokens),
                     "hsn_labels_used": False})
        result.append(pair)
    # Exclude both sides of a repeated query/target across split boundaries.
    # This is a fixed leakage check before fitting, never score-driven tuning.
    validate_pair_splits(result, check_fragments=False)
    fragment_splits = {}
    for p in result:
        for field in ("input_text", "target_text"):
            key = _fragment_key(p[field])
            fragment_splits.setdefault(key, set()).add(p["split"])
    repeated = {key for key, splits in fragment_splits.items() if len(splits) > 1}
    kept = []
    for p in result:
        if any(_fragment_key(p[field]) in repeated for field in ("input_text", "target_text")):
            omitted.append({"id": p["id"], "split": p["split"], "reason": "REPEATED_NORMALIZED_FRAGMENT_ACROSS_SPLITS"})
        else:
            kept.append(p)
    manifest = {"schema": PAIR_SCHEMA, "items": len(items), "retained_pairs": len(kept),
                "retained_by_split": dict(Counter(p["split"] for p in kept)),
                "omitted_by_reason": dict(Counter(p["reason"] for p in omitted)),
                "omitted": sorted(omitted, key=lambda p: p["id"]),
                "fragment_policy": {"min_tokens": min_tokens, "max_query_tokens": max_query_tokens,
                                    "max_target_tokens": max_target_tokens, "nonoverlapping_token_positions": True,
                                    "cross_split_duplicate_policy": "EXCLUDE_ALL_CASEFOLDED_WORD_IDENTICAL_FRAGMENT_PAIRS",
                                    "uses_retrieval_scores": False}}
    return {"pairs": kept, "manifest": manifest} if with_manifest else kept


def _fragment_key(text):
    return hashlib.sha256(" ".join(_WORDS.findall(text.casefold())).encode()).hexdigest()


def validate_pair_splits(pairs, *, check_fragments=True):
    """Fail if known identity, lineage or exact views leak across split bounds."""
    identities = {}
    counts = Counter()
    for p in pairs:
        split = p.get("split")
        if split not in {"train", "validation", "test"} or not isinstance(p.get("family_id"), str) or not p["family_id"]:
            raise ValueError("PAIR_FAMILY_SPLIT_REQUIRED")
        counts[split] += 1
        links = [("id", p.get("id")), ("family", p["family_id"]), ("source", p.get("source_id")),
                 ("source_hash", p.get("source_sha256")), ("text_hash", p.get("text_sha256"))]
        for field in ("input_text", "target_text"):
            if not isinstance(p.get(field), str) or not _WORDS.search(p[field]):
                raise ValueError("PAIR_NONEMPTY_TEXT_REQUIRED")
            if check_fragments:
                links.append(("fragment", _fragment_key(p[field])))
        for kind, value in links:
            if value is None:
                continue
            key = (kind, value)
            if key in identities and identities[key] != split:
                raise ValueError("PAIR_SPLIT_LEAKAGE:" + kind)
            identities[key] = split
    return dict(counts)


def fixed_validation_panel(pairs, *, max_queries=64, seed=1728):
    """Choose a fixed ID-hash panel before training; targets stay full split."""
    if not isinstance(max_queries, int) or not 1 <= max_queries <= 10000:
        raise ValueError("INVALID_VALIDATION_PANEL_BUDGET")
    if any(p.get("split") != "validation" for p in pairs):
        raise ValueError("VALIDATION_PANEL_SPLIT_REQUIRED")
    return sorted(pairs, key=lambda p: (hashlib.sha256(f"{seed}:{p['id']}".encode()).hexdigest(), p["id"]))[:max_queries]


def retrieval_metrics(scores, target_indices, *, k=10):
    """Stable tie handling, one declared positive per query, full ranks retained."""
    scores = np.asarray(scores, dtype=float)
    targets = np.asarray(target_indices, dtype=np.int64)
    if scores.ndim != 2 or targets.shape != (scores.shape[0],) or scores.shape[1] < 1:
        raise ValueError("INVALID_RETRIEVAL_MATRIX")
    if not 1 <= k <= 100 or np.any(targets < 0) or np.any(targets >= scores.shape[1]) or not np.all(np.isfinite(scores)):
        raise ValueError("INVALID_RETRIEVAL_VALUES")
    order = np.argsort(-scores, axis=1, kind="stable")
    ranks = np.argmax(order == targets[:, None], axis=1) + 1
    admitted = ranks <= k
    return {"queries": len(ranks), "candidates": scores.shape[1], "k": k,
            "hit_at_1": float(np.mean(ranks == 1)) if len(ranks) else None,
            "hit_at_k": float(np.mean(admitted)) if len(ranks) else None,
            "mrr_at_k": float(np.mean(np.where(admitted, 1.0 / ranks, 0.0))) if len(ranks) else None,
            "ndcg_at_k": float(np.mean(np.where(admitted, 1.0 / np.log2(ranks + 1), 0.0))) if len(ranks) else None,
            "median_rank": float(np.median(ranks)) if len(ranks) else None,
            "ranks": ranks.tolist(), "tie_policy": "STABLE_CANONICAL_CANDIDATE_ID_ORDER"}


def _protocol(pairs, candidate_pairs, k):
    queries = list(pairs)
    candidates = sorted(list(candidate_pairs if candidate_pairs is not None else pairs), key=lambda p: p["id"])
    if not queries or not candidates:
        raise ValueError("EMPTY_EVALUATION_SPLIT")
    if len({p["id"] for p in candidates}) != len(candidates) or len({p["id"] for p in queries}) != len(queries):
        raise ValueError("DUPLICATE_EVALUATION_ID")
    splits = {p.get("split") for p in queries + candidates}
    if len(splits) != 1 or next(iter(splits)) not in {"train", "validation", "test"}:
        raise ValueError("EVALUATION_SINGLE_SPLIT_REQUIRED")
    index = {p["id"]: i for i, p in enumerate(candidates)}
    if any(p["id"] not in index for p in queries):
        raise ValueError("EVALUATION_TARGET_MISSING")
    for p in queries:
        c = candidates[index[p["id"]]]
        if p["target_text"] != c["target_text"] or p.get("family_id") != c.get("family_id"):
            raise ValueError("EVALUATION_TARGET_IDENTITY_MISMATCH")
    receipt = {"schema": EVALUATION_SCHEMA, "split": next(iter(splits)), "k": k,
               "task": "DISJOINT_FRAGMENT_EXACT_ITEM_RETRIEVAL", "judgment_kind": "SELF_SUPERVISED_DIAGNOSTIC",
               "independent_semantic_validation": False, "accepted_hsn_labels_used": False,
               "query_ids": [p["id"] for p in queries], "candidate_ids": [p["id"] for p in candidates],
               "query_set_sha256": _digest([{k: p.get(k) for k in ("id", "family_id", "input_text", "target_text")} for p in queries]),
               "candidate_set_sha256": _digest([{k: p.get(k) for k in ("id", "family_id", "target_text")} for p in candidates]),
               "family_count": len({p["family_id"] for p in queries})}
    return queries, candidates, [index[p["id"]] for p in queries], receipt


def evaluate_retrieval(model, pairs, candidate_pairs=None, *, k=10):
    queries, candidates, targets, receipt = _protocol(pairs, candidate_pairs, k)
    q = model.encode([p["input_text"] for p in queries])
    c = model.encode([p["target_text"] for p in candidates])
    if np.any(np.linalg.norm(q, axis=1) == 0) or np.any(np.linalg.norm(c, axis=1) == 0):
        raise ValueError("ZERO_EVALUATION_REPRESENTATION")
    return {**receipt, **retrieval_metrics(q @ c.T, targets, k=k),
            "method": "ADDRESSED_GRAPH" if model.config.hierarchy else "FLAT_ADDRESSED_MODEL",
            "state_sha256": model.state_digest(), "checkpoint_sha256": model.checkpoint_sha256,
            "registry_sha256": model.registry_sha256}


def lexical_baseline(pairs, candidate_pairs=None, *, k=10):
    """TF-IDF cosine with vocabulary/IDF fitted only to candidate fragments.

    Indexing the held-out retrieval documents is allowed for this retrieval
    control. Neither queries nor relevance answers fit its vocabulary or IDF.
    """
    queries, candidates, targets, receipt = _protocol(pairs, candidate_pairs, k)
    docs = [Counter(_WORDS.findall(p["target_text"].casefold())) for p in candidates]
    vocab = {word: i for i, word in enumerate(sorted({w for d in docs for w in d}))}
    df = np.zeros(len(vocab))
    for d in docs:
        for w in d:
            df[vocab[w]] += 1
    idf = np.log((1 + len(docs)) / (1 + df)) + 1

    def matrix(counters):
        rows, cols, values = [], [], []
        for i, counter in enumerate(counters):
            for word, count in counter.items():
                if word in vocab:
                    j = vocab[word]
                    rows.append(i); cols.append(j); values.append((1 + math.log(count)) * idf[j])
        x = sparse.csr_matrix((values, (rows, cols)), shape=(len(counters), len(vocab)), dtype=np.float64)
        length = np.sqrt(np.asarray(x.multiply(x).sum(axis=1)).ravel())
        return sparse.diags(1 / np.maximum(length, 1e-12)) @ x, length

    c, _ = matrix(docs)
    q, norm = matrix([Counter(_WORDS.findall(p["input_text"].casefold())) for p in queries])
    result = retrieval_metrics((q @ c.T).toarray(), targets, k=k)
    return {**receipt, **result, "method": "TFIDF_COSINE", "vocabulary_size": len(vocab),
            "zero_overlap_queries": int(np.sum(norm == 0)), "fit_scope": "CANDIDATE_TEXT_ONLY"}
