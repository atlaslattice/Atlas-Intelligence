"""Independent numeric/ranking oracles and a frozen synthetic 384D recipe.

No corpus, ontology text, model payload, upstream code, or model inference is
used. The recipe is fixed before its one experiment run and fits no weights.
"""
from fractions import Fraction
import json
import math
import struct
import sys
import unittest
from unittest.mock import patch

from atlas_work_learning import retrieval_audits as audit


def record(identifier, values):
    return {"id": identifier, "vector": list(values)}


def _float32(value):
    return struct.unpack("<f", struct.pack("<f", value))[0]


def frozen_synthetic_384_fixture():
    """24 corpus rows, 12 independent query records; zero learned parameters.

    Queries are deterministic perturbations of even-numbered synthetic rows.
    They are excluded from the corpus-row scaling operation. This is a paired
    diagnostic fixture, not 12 statistically independent observations.
    """
    corpus = []
    for i in range(24):
        raw = [(((i + 3) * (j + 11) * (j % 7 + 1) + 17 * i * i) % 997 - 498) / 499
               for j in range(384)]
        norm = math.sqrt(math.fsum(x * x for x in raw))
        corpus.append(record(f"synthetic-corpus-{i:02d}", [_float32(x / norm) for x in raw]))
    queries = []
    for i in range(12):
        raw = [x + (((i + 5) * (j + 7) % 31) - 15) / 20_000
               for j, x in enumerate(corpus[2 * i]["vector"])]
        norm = math.sqrt(math.fsum(x * x for x in raw))
        queries.append(record(f"synthetic-query-{i:02d}", [_float32(x / norm) for x in raw]))
    return corpus, queries


def frozen_near_tie_384_fixture():
    return ([record("a-near", [1.0, 0.001] + [0.0] * 382),
             record("b-near", [1.0, 0.002] + [0.0] * 382)],
            [record("near-query", [0.0, 1.0] + [0.0] * 382)])


class QuantizationAuditTests(unittest.TestCase):
    def test_integer_fraction_oracle_and_actual_payload_layout(self):
        values = (8, -8, 2, -2, 0)
        expected_codes = tuple(round(Fraction(x, 8) * 127) for x in values)
        row = audit.quantize_symmetric_int8_row(values)
        self.assertEqual(row.codes, expected_codes)
        rebuilt = audit.dequantize_symmetric_int8_row(row)
        for actual, code in zip(rebuilt, expected_codes):
            self.assertAlmostEqual(actual, float(Fraction(code * 8, 127)), places=14)
        payload = audit.symmetric_int8_row_payload(row)
        self.assertEqual(len(payload), len(values) + 8)
        self.assertEqual(struct.unpack("<d", payload[:8])[0], 8.0)
        self.assertEqual(struct.unpack("5b", payload[8:]), expected_codes)

    def test_ties_to_even_at_exactly_representable_scaled_half_steps(self):
        row = audit.quantize_symmetric_int8_row([127, .5, 1.5, 2.5, -.5, -1.5, -2.5])
        self.assertEqual(row.codes, (127, 0, 2, 2, 0, -2, -2))

    def test_manual_axis_ranking_control(self):
        result = audit.audit_symmetric_int8(
            [record("a", [1, 0]), record("b", [0, 1]), record("c", [-1, 0])],
            [record("q", [1, 0])], top_k=2)
        query = result["queries"][0]
        self.assertEqual(query["original_top_ids"], ["a", "b"])
        self.assertEqual(query["quantized_top_ids"], ["a", "b"])
        self.assertEqual(result["ranking"]["top1_agreement_count"], 1)
        self.assertEqual(result["numeric"]["maximum_absolute_error"], 0)

    def test_real_rank_loss_is_reported_not_masked(self):
        corpus, queries = frozen_near_tie_384_fixture()
        result = audit.audit_symmetric_int8(corpus, queries, top_k=1,
                                           near_tie_tolerance=.002, expected_dimension=384)
        query = result["queries"][0]
        self.assertEqual(query["original_top_ids"], ["b-near"])
        self.assertEqual(query["quantized_top_ids"], ["a-near"])
        self.assertEqual(query["top_k_overlap_recall"], 0)
        self.assertEqual(query["order_flip_count"], 1)
        self.assertEqual(query["near_tie_flip_count"], 1)
        self.assertEqual(result["ranking"]["top1_agreement_count"], 0)
        self.assertEqual(result["payload"]["actual_codec_payload_bytes"], 2 * (384 + 8))

    def test_near_tie_threshold_does_not_change_the_ranking(self):
        corpus, queries = frozen_near_tie_384_fixture()
        loose = audit.audit_symmetric_int8(corpus, queries, top_k=1, near_tie_tolerance=.002)
        strict = audit.audit_symmetric_int8(corpus, queries, top_k=1, near_tie_tolerance=0)
        self.assertEqual(loose["queries"][0]["quantized_top_ids"], strict["queries"][0]["quantized_top_ids"])
        self.assertEqual(strict["ranking"]["outside_near_tie_flip_count"], 1)
        self.assertEqual(strict["ranking"]["near_tie_flip_count"], 0)

    def test_stable_ids_and_input_permutation_invariance(self):
        corpus = [record("b", [1, 2]), record("a", [1, 2]), record("c", [-1, 0])]
        queries = [record("z", [1, 0]), record("y", [0, 1])]
        left = audit.audit_symmetric_int8(corpus, queries, top_k=2)
        right = audit.audit_symmetric_int8(corpus[::-1], queries[::-1], top_k=2)
        self.assertEqual(left, right)
        self.assertEqual(left["queries"][0]["original_top_ids"], ["a", "b"])

    def test_zeros_are_excluded_and_held_explicitly(self):
        result = audit.audit_symmetric_int8([record("zero", [0, 0]), record("axis", [1, 0])],
                                            [record("zero-query", [0, 0]), record("axis-query", [1, 0])])
        self.assertEqual(result["counts"]["zero_corpus_rows"], 1)
        self.assertEqual(result["counts"]["scored_queries"], 1)
        self.assertEqual(result["counts"]["held_queries"], 1)
        self.assertEqual(result["queries"][1]["status"], "HOLD_ZERO_QUERY")
        self.assertEqual(audit.quantize_symmetric_int8_row([0, -0.0]).codes, (0, 0))

    def test_all_zero_corpus_does_not_fabricate_metrics(self):
        result = audit.audit_symmetric_int8([record("zero", [0, 0])], [record("q", [1, 0])])
        self.assertEqual(result["status"], "HOLD_NO_SCORABLE_RANKINGS")
        self.assertIsNone(result["ranking"]["mean_top_k_overlap_recall"])
        self.assertEqual(result["queries"][0]["status"], "HOLD_NO_SCORABLE_CORPUS")

    def test_extreme_and_subnormal_long_vectors_remain_finite(self):
        maximum = sys.float_info.max
        minimum = math.ulp(0.0)
        rows = [record("large", [maximum, -maximum / 2] * 2048),
                record("small", [minimum, -minimum] * 2048)]
        result = audit.audit_symmetric_int8(rows, [record("q", [1.0, -0.5] * 2048)], top_k=2)
        encoded = json.dumps(result, allow_nan=False)
        self.assertNotIn("NaN", encoded)
        self.assertEqual(result["counts"]["scored_queries"], 1)
        tiny = audit.quantize_symmetric_int8_row([minimum, -minimum])
        self.assertEqual(audit.dequantize_symmetric_int8_row(tiny), (minimum, -minimum))

    def test_component_error_bound_on_deterministic_rational_rows(self):
        rows = [record(f"row-{i}", [((i + 3) * (j + 7) % 127 - 63) / 64 for j in range(37)])
                for i in range(9)]
        result = audit.audit_symmetric_int8(rows, [record("q", [1 / 37] * 37)], top_k=3)
        self.assertLessEqual(result["numeric"]["maximum_error_over_row_maximum"], 1 / 254 + 1e-15)

    def test_subnormal_reconstruction_error_does_not_hide_behind_ideal_bound(self):
        unit = math.ulp(0.0)
        result = audit.audit_symmetric_int8([record("tiny", [128 * unit, 64 * unit])],
                                            [record("q", [1, 0])], top_k=1)
        self.assertEqual(result["numeric"]["maximum_absolute_error"], unit)
        self.assertEqual(result["numeric"]["maximum_error_over_row_maximum"], 1 / 128)
        self.assertGreater(result["numeric"]["maximum_error_over_row_maximum"],
                           result["numeric"]["ideal_nearest_rounding_normalized_error_bound"])
        self.assertIn("IDEAL_REAL_ARITHMETIC_ONLY", result["numeric"]["bound_scope"])

    def test_nonfinite_boolean_and_overflow_inputs_are_rejected(self):
        for bad in [float("nan"), float("inf"), -float("inf"), True, "1", 10 ** 1000]:
            with self.subTest(bad_type=type(bad).__name__):
                with self.assertRaises(ValueError):
                    audit.quantize_symmetric_int8_row([1, bad])
                with self.assertRaises(ValueError):
                    audit.audit_symmetric_int8([record("a", [1, 0])], [record("q", [0, bad])])

    def test_shape_id_and_record_contract(self):
        invalid = [[], [record("a", [])], [record("a", [1]), record("a", [2])],
                   [record(" bad ", [1])], [{"id": "a", "vector": [1], "unexpected": 1}],
                   [record("a", [1]), record("b", [1, 2])]]
        for corpus in invalid:
            with self.subTest(corpus=corpus):
                with self.assertRaises(ValueError):
                    audit.audit_symmetric_int8(corpus, [record("q", [1])])
        with self.assertRaises(ValueError):
            audit.audit_symmetric_int8([record("a", [1])], [record("q", [1])], expected_dimension=384)

    def test_configuration_contract_and_work_budgets(self):
        corpus, queries = [record("a", [1, 0]), record("b", [0, 1])], [record("q", [1, 0])]
        for option in [{"top_k": True}, {"top_k": 0}, {"top_k": 65},
                       {"near_tie_tolerance": True}, {"near_tie_tolerance": float("nan")},
                       {"near_tie_tolerance": -1}, {"expected_dimension": False}]:
            with self.subTest(option=option), self.assertRaises(ValueError):
                audit.audit_symmetric_int8(corpus, queries, **option)
        with patch.object(audit, "MAX_DOT_MULTIPLICATIONS", 7), self.assertRaisesRegex(ValueError, "DOT_BUDGET"):
            audit.audit_symmetric_int8(corpus, queries)
        with patch.object(audit, "MAX_PAIR_COMPARISONS", 0), self.assertRaisesRegex(ValueError, "PAIR_BUDGET"):
            audit.audit_symmetric_int8(corpus, queries)
        with patch.object(audit, "MAX_VECTOR_ELEMENTS", 3), self.assertRaisesRegex(ValueError, "ELEMENT_BUDGET"):
            audit.audit_symmetric_int8(corpus, queries)

    def test_corrupted_codec_objects_are_rejected(self):
        for row in [audit.QuantizedRow(0, (1,)), audit.QuantizedRow(1, (1,)),
                    audit.QuantizedRow(float("nan"), (127,)), audit.QuantizedRow(1, (-128,)),
                    audit.QuantizedRow(1, (True,)), audit.QuantizedRow(1, [127])]:
            with self.subTest(row=row), self.assertRaises(ValueError):
                audit.dequantize_symmetric_int8_row(row)


if __name__ == "__main__":
    unittest.main()
