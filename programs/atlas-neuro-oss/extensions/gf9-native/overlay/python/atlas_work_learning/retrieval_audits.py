"""Pure offline quantization/ranking diagnostics; no model or serving mutation.

Original standard-library implementation. Source inspiration is scalar-vector
compression and rescoring in Sentence Transformers, pinned at
f1aeaea05afc91dcc47179e00f9f4f313fab7e9a, util/quantization.py (Apache-2.0).
This codec is deliberately identified separately: symmetric int8 per ROW with
a binary64 maximum-absolute-value header, not upstream per-dimension ranges.

No permission, semantic quality, deployment or training claim follows from an
audit. Input vectors stay in memory. Canonical IDs are never rewritten.
"""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import itertools
import json
import math
import struct

SCHEMA = "atlas.retrieval-quantization-audit/v1"
CODEC = "symmetric-int8-row-maxabs-f64-le/v1"
MAX_DIMENSIONS = 4096
MAX_ROWS = 4096
MAX_QUERIES = 128
MAX_VECTOR_ELEMENTS = 1_000_000
MAX_DOT_MULTIPLICATIONS = 5_000_000
MAX_PAIR_COMPARISONS = 1_000_000


def _finite_number(value, error):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(error)
    try:
        number = float(value)
    except (OverflowError, ValueError) as exc:
        raise ValueError(error) from exc
    if not math.isfinite(number):
        raise ValueError(error)
    return number


def _vector(values):
    if not isinstance(values, (list, tuple)) or not 1 <= len(values) <= MAX_DIMENSIONS:
        raise ValueError("AUDIT_VECTOR_DIMENSION")
    return tuple(_finite_number(x, "AUDIT_VECTOR_NONFINITE_OR_NONNUMERIC") for x in values)


@dataclass(frozen=True)
class QuantizedRow:
    """A diagnostic row. The header is max(abs(x)), not a possibly underflowed step."""

    maximum_abs: float
    codes: tuple[int, ...]


def quantize_symmetric_int8_row(values):
    """Round to nearest, ties to even, using ratios that cannot overflow.

    A ratio is taken BEFORE multiplying by 127. Even a binary64 subnormal can
    be represented: we do not divide maximum_abs by 127 and lose its scale.
    """
    values = _vector(values)
    maximum = max(abs(x) for x in values)
    codes = tuple(0 for _ in values) if maximum == 0 else tuple(
        int(round((x / maximum) * 127)) for x in values
    )
    return QuantizedRow(maximum, codes)


def _validate_row(row):
    if not isinstance(row, QuantizedRow):
        raise ValueError("AUDIT_CODEC_ROW")
    maximum = _finite_number(row.maximum_abs, "AUDIT_CODEC_SCALE")
    if maximum < 0 or not isinstance(row.codes, tuple) or not 1 <= len(row.codes) <= MAX_DIMENSIONS:
        raise ValueError("AUDIT_CODEC_LAYOUT")
    if any(type(x) is not int or not -127 <= x <= 127 for x in row.codes):
        raise ValueError("AUDIT_CODEC_VALUE")
    largest_code = max(abs(x) for x in row.codes)
    if (maximum == 0 and largest_code != 0) or (maximum > 0 and largest_code != 127):
        raise ValueError("AUDIT_CODEC_NONCANONICAL_SCALE")
    return maximum


def dequantize_symmetric_int8_row(row):
    maximum = _validate_row(row)
    return tuple((code / 127) * maximum for code in row.codes)


def symmetric_int8_row_payload(row):
    """Actual d+8 byte codec payload; dimension and identity are external metadata."""
    maximum = _validate_row(row)
    return struct.pack("<d", maximum) + struct.pack(f"{len(row.codes)}b", *row.codes)


def _normalise(values):
    maximum = max(abs(x) for x in values)
    if maximum == 0:
        return None
    scaled = tuple(x / maximum for x in values)
    norm = math.sqrt(math.fsum(x * x for x in scaled))
    return tuple(x / norm for x in scaled)


def _cosine_unit(a, b):
    # Clamp only possible binary64 roundoff beyond the mathematical bound.
    return min(1.0, max(-1.0, math.fsum(x * y for x, y in zip(a, b))))


def _rms(values):
    maximum = max(values, default=0.0)
    if maximum == 0:
        return 0.0
    return maximum * math.sqrt(math.fsum((x / maximum) ** 2 for x in values) / len(values))


def _records(rows, maximum, error):
    if not isinstance(rows, (list, tuple)) or not 1 <= len(rows) <= maximum:
        raise ValueError(error)
    result = {}
    elements = 0
    for row in rows:
        if not isinstance(row, dict) or set(row) != {"id", "vector"}:
            raise ValueError("AUDIT_RECORD_FIELDS")
        identifier = row["id"]
        if (not isinstance(identifier, str) or not 1 <= len(identifier) <= 256
                or identifier.strip() != identifier or any(ord(c) < 32 or ord(c) == 127 for c in identifier)):
            raise ValueError("AUDIT_ID")
        if identifier in result:
            raise ValueError("AUDIT_DUPLICATE_ID")
        vector = _vector(row["vector"])
        elements += len(vector)
        if elements > MAX_VECTOR_ELEMENTS:
            raise ValueError("AUDIT_ELEMENT_BUDGET")
        result[identifier] = vector
    return dict(sorted(result.items()))


def _digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"),
                                     ensure_ascii=True, allow_nan=False).encode()).hexdigest()


def audit_symmetric_int8(corpus, queries, *, top_k=10, near_tie_tolerance=1e-6, expected_dimension=None):
    """Compare original and reconstructed cosine rankings on caller-frozen rows.

    Queries remain unquantized. Zero rows are counted and excluded from cosine
    ranking; zero queries get a HOLD. Stable ties use unchanged string IDs.
    Pair flips are assessed only within each union of the two top-k sets.
    No statistical independence, production speedup or semantic claim is made.
    """
    if type(top_k) is not int or not 1 <= top_k <= 64:
        raise ValueError("AUDIT_TOP_K")
    tolerance = _finite_number(near_tie_tolerance, "AUDIT_NEAR_TIE_TOLERANCE")
    if not 0 <= tolerance <= 2:
        raise ValueError("AUDIT_NEAR_TIE_TOLERANCE")
    if expected_dimension is not None and (type(expected_dimension) is not int
            or not 1 <= expected_dimension <= MAX_DIMENSIONS):
        raise ValueError("AUDIT_EXPECTED_DIMENSION")
    corpus = _records(corpus, MAX_ROWS, "AUDIT_CORPUS_BOUNDS")
    queries = _records(queries, MAX_QUERIES, "AUDIT_QUERY_BOUNDS")
    dimension = len(next(iter(corpus.values())))
    if any(len(v) != dimension for v in [*corpus.values(), *queries.values()]):
        raise ValueError("AUDIT_DIMENSION_MISMATCH")
    if expected_dimension is not None and dimension != expected_dimension:
        raise ValueError("AUDIT_EXPECTED_DIMENSION_MISMATCH")
    if 2 * len(corpus) * len(queries) * dimension > MAX_DOT_MULTIPLICATIONS:
        raise ValueError("AUDIT_DOT_BUDGET")
    union_bound = min(2 * top_k, len(corpus))
    if len(queries) * union_bound * (union_bound - 1) // 2 > MAX_PAIR_COMPARISONS:
        raise ValueError("AUDIT_PAIR_BUDGET")

    reference, reconstructed, row_metrics = {}, {}, []
    payload_hasher = hashlib.sha256()
    payload_bytes = 0
    for identifier, values in corpus.items():
        row = quantize_symmetric_int8_row(values)
        rebuilt = dequantize_symmetric_int8_row(row)
        payload = symmetric_int8_row_payload(row)
        payload_hasher.update(payload)
        payload_bytes += len(payload)
        original_unit, rebuilt_unit = _normalise(values), _normalise(rebuilt)
        reference[identifier], reconstructed[identifier] = original_unit, rebuilt_unit
        errors = [abs(x - y) for x, y in zip(values, rebuilt)]
        relative_errors = [e / row.maximum_abs for e in errors] if row.maximum_abs else [0.0] * dimension
        angle = (math.degrees(math.acos(_cosine_unit(original_unit, rebuilt_unit)))
                 if original_unit is not None else None)
        row_metrics.append({"id": identifier, "zero_vector": original_unit is None,
                            "maximum_absolute_error": max(errors), "rms_absolute_error": _rms(errors),
                            "rms_error_over_row_maximum": _rms(relative_errors),
                            "maximum_error_over_row_maximum": max(relative_errors),
                            "angular_error_degrees": angle})

    eligible = [identifier for identifier in reference if reference[identifier] is not None]
    k = min(top_k, len(eligible))
    results = []
    for query_id, values in queries.items():
        unit = _normalise(values)
        if unit is None or not eligible:
            results.append({"query_id": query_id, "status": "HOLD_ZERO_QUERY" if unit is None
                            else "HOLD_NO_SCORABLE_CORPUS"})
            continue
        before = {i: _cosine_unit(unit, reference[i]) for i in eligible}
        after = {i: _cosine_unit(unit, reconstructed[i]) for i in eligible}
        original_order = sorted(eligible, key=lambda i: (-before[i], i))
        rebuilt_order = sorted(eligible, key=lambda i: (-after[i], i))
        original_rank = {i: n for n, i in enumerate(original_order)}
        rebuilt_rank = {i: n for n, i in enumerate(rebuilt_order)}
        original_top, rebuilt_top = original_order[:k], rebuilt_order[:k]
        union = sorted(set(original_top) | set(rebuilt_top))
        flips = []
        for left, right in itertools.combinations(union, 2):
            if (original_rank[left] < original_rank[right]) != (rebuilt_rank[left] < rebuilt_rank[right]):
                gap = abs(before[left] - before[right])
                flips.append({"ids": [left, right], "original_score_gap": gap,
                              "near_tie": gap <= tolerance, "original_exact_score_tie": gap == 0})
        results.append({
            "query_id": query_id, "status": "SCORED", "effective_k": k,
            "original_top_ids": original_top, "quantized_top_ids": rebuilt_top,
            "top1_agreement": original_top[0] == rebuilt_top[0],
            "ordered_top_k_agreement": original_top == rebuilt_top,
            "top_k_overlap_recall": len(set(original_top) & set(rebuilt_top)) / k,
            "maximum_cosine_score_error": max(abs(before[i] - after[i]) for i in eligible),
            "mean_absolute_rank_displacement": math.fsum(abs(original_rank[i] - rebuilt_rank[i])
                                                          for i in eligible) / len(eligible),
            "pair_scope": "UNION_OF_ORIGINAL_AND_RECONSTRUCTED_TOP_K",
            "pair_comparisons": len(union) * (len(union) - 1) // 2,
            "order_flip_count": len(flips), "near_tie_flip_count": sum(f["near_tie"] for f in flips),
            "outside_near_tie_flip_count": sum(not f["near_tie"] for f in flips),
            "original_exact_score_tie_flip_count": sum(f["original_exact_score_tie"] for f in flips),
            "order_flips": flips,
        })

    scored = [row for row in results if row["status"] == "SCORED"]
    vector_elements = len(corpus) * dimension
    identity = {"corpus": [[i, [x.hex() for x in v]] for i, v in corpus.items()],
                "queries": [[i, [x.hex() for x in v]] for i, v in queries.items()]}
    output = {
        "schema": SCHEMA, "codec": CODEC, "status": "COMPLETED" if scored else "HOLD_NO_SCORABLE_RANKINGS",
        "input_sha256": _digest(identity), "codec_payload_sha256": payload_hasher.hexdigest(),
        "configuration": {"top_k": top_k, "near_tie_tolerance": tolerance, "dimensions": dimension,
                          "expected_dimension": expected_dimension, "query_quantization": False},
        "counts": {"corpus_rows": len(corpus), "query_rows": len(queries),
                   "zero_corpus_rows": len(corpus) - len(eligible), "scored_queries": len(scored),
                   "held_queries": len(queries) - len(scored)},
        "numeric": {"reference_math": "UNQUANTIZED_BINARY64_COSINE_WITH_STABLE_ID_TIES",
                    "maximum_absolute_error": max(r["maximum_absolute_error"] for r in row_metrics),
                    "global_rms_absolute_error": _rms([r["rms_absolute_error"] for r in row_metrics]),
                    "maximum_error_over_row_maximum": max(r["maximum_error_over_row_maximum"] for r in row_metrics),
                    "ideal_nearest_rounding_normalized_error_bound": 1 / 254,
                    "bound_scope": "IDEAL_REAL_ARITHMETIC_ONLY; binary64 subnormal reconstruction can exceed it"},
        "ranking": {"top1_agreement_count": sum(r["top1_agreement"] for r in scored),
                    "ordered_top_k_agreement_count": sum(r["ordered_top_k_agreement"] for r in scored),
                    "mean_top_k_overlap_recall": math.fsum(r["top_k_overlap_recall"] for r in scored) / len(scored) if scored else None,
                    "order_flip_count": sum(r["order_flip_count"] for r in scored),
                    "near_tie_flip_count": sum(r["near_tie_flip_count"] for r in scored),
                    "outside_near_tie_flip_count": sum(r["outside_near_tie_flip_count"] for r in scored)},
        "payload": {"int8_code_bytes": vector_elements, "binary64_row_header_bytes": len(corpus) * 8,
                    "actual_codec_payload_bytes": payload_bytes,
                    "hypothetical_float32_vector_payload_bytes": vector_elements * 4,
                    "hypothetical_float64_vector_payload_bytes": vector_elements * 8,
                    "ratio_to_hypothetical_float32_payload": payload_bytes / (vector_elements * 4),
                    "excludes": ["IDs", "dimensions", "index structures", "Python object overhead", "alignment", "query vectors"],
                    "process_memory_measured": False},
        "rows": row_metrics, "queries": results,
        "limits": {"synthetic_or_real_input_authority_verified": False, "serving_admission": "NOT_EVALUATED",
                   "statistically_independent_trials": False, "model_inference_calls": 0,
                   "training_updates": 0, "files_written_by_audit": 0,
                   "semantic_understanding_established": False},
    }
    output["audit_sha256"] = _digest(output)
    return output
