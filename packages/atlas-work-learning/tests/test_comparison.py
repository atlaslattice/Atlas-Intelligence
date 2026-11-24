"""Synthetic protocol attacks; no private corpus, training, or inference runs."""
from copy import deepcopy
import hashlib
import json
import math
import unittest

import numpy as np

from atlas_work_learning.comparison import (
    RESOURCE_FIELDS, bind_fragment_evaluation, canonical_digest, compare_evaluations,
)
from atlas_work_learning.evaluation import _protocol, retrieval_metrics
from atlas_work_learning.model import ModelConfig


REGISTRY = "a" * 64


def fixture_pairs():
    """One declared family deliberately has four times the query weight."""
    pairs = []
    for i in range(5):
        text = f"synthetic source number {i}; exact fixture text"
        pairs.append({"id": f"item-{i}", "family_id": "large" if i < 4 else "small", "split": "test",
                      "source_id": f"source-{i}", "source_version": "fixture-v1", "source_uri": f"fixture://{i}",
                      "source_sha256": hashlib.sha256(text.encode()).hexdigest(),
                      "text_sha256": hashlib.sha256(text.encode()).hexdigest(),
                      "input_text": f"fixture question {i}", "target_text": f"fixture answer {i}"})
    return pairs


def fixture_receipt(ranks=None, method="ADDRESSED_GRAPH", pairs=None):
    pairs = deepcopy(pairs if pairs is not None else fixture_pairs())
    ranks = ranks or [1, 2, 3, 4, 5]
    _, _, targets, protocol = _protocol(pairs, pairs, 2)
    # Build actual score matrices with requested known target ranks, so tests
    # use the original evaluator rather than the comparison's metric helper.
    scores = np.zeros((len(pairs), len(pairs)))
    for row, (rank, target) in enumerate(zip(ranks, targets)):
        other = [i for i in range(len(pairs)) if i != target]
        order = other[:rank - 1] + [target] + other[rank - 1:]
        for offset, candidate in enumerate(order):
            scores[row, candidate] = len(pairs) - offset
    receipt = {**protocol, **retrieval_metrics(scores, targets, k=2), "method": method}
    if method in {"ADDRESSED_GRAPH", "FLAT_ADDRESSED_MODEL"}:
        receipt.update(registry_sha256=REGISTRY,
                       checkpoint_sha256=("b" if method == "ADDRESSED_GRAPH" else "c") * 64,
                       state_sha256=("d" if method == "ADDRESSED_GRAPH" else "e") * 64)
    else:
        receipt.update(fit_scope="CANDIDATE_TEXT_ONLY", zero_overlap_queries=0)
    return receipt


def fixture_provenance(receipt):
    context = {"receipt_sha256": canonical_digest(receipt), "corpus_sha256": "f" * 64,
               "code_sha256": "1" * 64,
               "evidence_refs": [{"id": "fixture:evaluation-details", "sha256": "2" * 64}]}
    if receipt["method"] in {"ADDRESSED_GRAPH", "FLAT_ADDRESSED_MODEL"}:
        config = ModelConfig(hierarchy=receipt["method"] == "ADDRESSED_GRAPH").to_dict()
        context.update(checkpoint_sha256=receipt["checkpoint_sha256"], state_sha256=receipt["state_sha256"],
                       model_config=config, model_config_sha256=canonical_digest(config))
    return context


def bind(receipt=None, *, pairs=None, provenance=None, resources=None):
    pairs = fixture_pairs() if pairs is None else pairs
    receipt = fixture_receipt(pairs=pairs) if receipt is None else receipt
    return bind_fragment_evaluation(receipt, query_pairs=pairs, candidate_pairs=pairs,
                                    expected_registry_sha256=REGISTRY,
                                    provenance=fixture_provenance(receipt) if provenance is None else provenance,
                                    resources=resources)


def reseal(envelope):
    envelope["envelope_sha256"] = canonical_digest({k: v for k, v in envelope.items() if k != "envelope_sha256"})


class ComparisonTests(unittest.TestCase):
    def assertHeld(self, result, reason=None):
        self.assertEqual(result["status"], "HOLD", result)
        self.assertIsNone(result["paired_deltas"])
        self.assertFalse(result["causal_hierarchy_benefit_established"])
        self.assertFalse(result["serving_policy_changed"])
        if reason is not None:
            self.assertIn(reason, result["reasons"][0])

    def test_existing_evaluator_receipt_binds_without_text_or_input_mutation(self):
        pairs, receipt = fixture_pairs(), fixture_receipt()
        provenance = fixture_provenance(receipt)
        original = deepcopy((pairs, receipt, provenance))
        bound = bind(receipt, pairs=pairs, provenance=provenance)
        self.assertEqual(bound["status"], "BOUND_LOCAL_SNAPSHOT")
        self.assertEqual(bound["retrieval_route"], "NEURAL_DIRECT")
        self.assertEqual((pairs, receipt, provenance), original)
        serialized = json.dumps(bound)
        for pair in pairs:
            self.assertNotIn(pair["input_text"], serialized)
            self.assertNotIn(pair["target_text"], serialized)
            self.assertNotIn(pair["source_uri"], serialized)

    def test_signed_rows_and_family_macro_expose_reversal(self):
        baseline = bind(fixture_receipt([3, 3, 3, 3, 1], "FLAT_ADDRESSED_MODEL"))
        candidate = bind(fixture_receipt([2, 2, 2, 2, 3]))
        result = compare_evaluations(baseline, candidate)
        self.assertEqual(result["status"], "COMPARABLE_DIAGNOSTIC")
        self.assertGreater(result["micro"]["candidate_minus_baseline"]["ndcg_at_k"], 0)
        self.assertLess(result["family_macro"]["candidate_minus_baseline"]["ndcg_at_k"], 0)
        self.assertEqual([r["queries"] for r in result["family_rows"]], [4, 1])
        self.assertAlmostEqual(result["family_macro"]["baseline"]["ndcg_at_k"], 0.5)
        self.assertAlmostEqual(result["family_macro"]["candidate"]["ndcg_at_k"], 0.5 / math.log2(3))
        self.assertEqual([r["rank_delta"] for r in result["paired_deltas"]], [-1, -1, -1, -1, 2])
        self.assertEqual(result["paired_summary"]["rank_improved"], 4)
        self.assertEqual(result["paired_summary"]["rank_regressed"], 1)
        self.assertEqual(result["paired_summary"]["family_ndcg_improved"], 1)
        self.assertEqual(result["paired_summary"]["family_ndcg_regressed"], 1)
        self.assertEqual(result["declared_family_count"], 2)
        self.assertIsNone(result["independent_family_count"])
        self.assertFalse(result["independent_semantic_validation"])
        self.assertFalse(result["causal_hierarchy_benefit_established"])
        self.assertEqual(result["test_reuse_meaning"], "REANALYSIS_OF_SAVED_RANKS_NOT_FRESH_EVALUATION")

    def test_model_checkpoints_may_differ_but_each_needs_its_own_expected_pin(self):
        left = bind(fixture_receipt(method="FLAT_ADDRESSED_MODEL"))
        right = bind()
        result = compare_evaluations(left, right)
        self.assertEqual(result["status"], "COMPARABLE_DIAGNOSTIC")
        self.assertNotEqual(result["baseline_identity"]["provenance"]["checkpoint_sha256"],
                            result["candidate_identity"]["provenance"]["checkpoint_sha256"])
        altered = fixture_receipt()
        provenance = fixture_provenance(altered)
        altered["checkpoint_sha256"] = "3" * 64
        provenance["receipt_sha256"] = canonical_digest(altered)
        self.assertHeld(bind(altered, provenance=provenance), "MODEL_PIN_MISMATCH:checkpoint_sha256")

    def test_equal_parameter_state_does_not_erase_different_forward_configuration(self):
        flat = fixture_receipt(method="FLAT_ADDRESSED_MODEL")
        graph = fixture_receipt()
        flat["state_sha256"] = graph["state_sha256"]
        b, c = bind(flat), bind(graph)
        self.assertEqual(compare_evaluations(b, c)["status"], "COMPARABLE_DIAGNOSTIC")
        self.assertNotEqual(b["provenance"]["model_config_sha256"], c["provenance"]["model_config_sha256"])
        self.assertNotEqual(b["envelope_sha256"], c["envelope_sha256"])

    def test_changed_query_order_is_not_silently_realigned(self):
        receipt = fixture_receipt()
        receipt["query_ids"][0], receipt["query_ids"][1] = receipt["query_ids"][1], receipt["query_ids"][0]
        self.assertHeld(bind(receipt), "PROTOCOL_BINDING_MISMATCH:query_ids")
        # An internally valid reordered evaluation is still a different paired
        # protocol: the comparator does not silently join/reindex saved ranks.
        pairs = list(reversed(fixture_pairs()))
        bound = bind(fixture_receipt(pairs=pairs), pairs=pairs)
        self.assertEqual(bound["status"], "BOUND_LOCAL_SNAPSHOT")
        self.assertHeld(compare_evaluations(bind(), bound), "PAIRED_PROTOCOL_MISMATCH:query_ids")

    def test_changed_candidate_order_and_duplicate_ids_are_rejected(self):
        for key in ("query_ids", "candidate_ids"):
            with self.subTest(key=key):
                receipt = fixture_receipt()
                receipt[key][1] = receipt[key][0]
                self.assertHeld(bind(receipt), "DUPLICATE_")
        receipt = fixture_receipt()
        receipt["candidate_ids"].reverse()
        self.assertHeld(bind(receipt), "NONCANONICAL_CANDIDATE_ORDER")

    def test_changed_payload_digest_and_target_binding_are_rejected(self):
        for key in ("query_set_sha256", "candidate_set_sha256"):
            with self.subTest(key=key):
                receipt = fixture_receipt(); receipt[key] = "3" * 64
                self.assertHeld(bind(receipt), "PROTOCOL_BINDING_MISMATCH:" + key)
        pairs = fixture_pairs(); pairs[0]["target_text"] = "altered positive label"
        self.assertHeld(bind(fixture_receipt(), pairs=pairs), "PROTOCOL_BINDING_MISMATCH:")
        receipt = fixture_receipt(); receipt["target_ids"] = list(reversed(receipt["query_ids"]))
        self.assertHeld(bind(receipt), "UNSUPPORTED_RECEIPT_FIELDS")

    def test_same_text_different_source_revision_cannot_be_compared_as_same_evidence(self):
        pairs = fixture_pairs(); pairs[0]["source_version"] = "corrected-v2"
        # Original evaluator hashes do not include this field. The additional
        # source binding must catch it even when ranks and text are identical.
        altered = bind(fixture_receipt(), pairs=pairs)
        self.assertEqual(altered["status"], "BOUND_LOCAL_SNAPSHOT")
        self.assertHeld(compare_evaluations(bind(), altered), "PAIRED_SOURCE_BINDING_MISMATCH")
        self.assertFalse(compare_evaluations(bind(), bind())["source_truth_established"])

    def test_source_and_family_bindings_are_required(self):
        for field in ("family_id", "source_id", "source_version", "source_sha256", "text_sha256", "source_uri"):
            with self.subTest(field=field):
                pairs = fixture_pairs(); del pairs[0][field]
                self.assertHeld(bind(fixture_receipt(), pairs=pairs), "PAIR_BINDING_REQUIRED:")
        receipt = fixture_receipt(); receipt["family_count"] = 1
        self.assertHeld(bind(receipt), "PROTOCOL_BINDING_MISMATCH:family_count")

    def test_source_and_family_mismatch_between_query_and_target_holds(self):
        query, candidates = fixture_pairs(), fixture_pairs()
        candidates[0]["source_sha256"] = "3" * 64
        receipt = fixture_receipt()
        result = bind_fragment_evaluation(receipt, query_pairs=query, candidate_pairs=candidates,
                                          expected_registry_sha256=REGISTRY, provenance=fixture_provenance(receipt))
        self.assertHeld(result, "QUERY_TARGET_SOURCE_BINDING_MISMATCH")

    def test_ranks_require_real_bounded_integers(self):
        for value in (True, 0, -1, 6, 1.0, float("nan"), "1", None):
            with self.subTest(value=value):
                receipt = fixture_receipt(); receipt["ranks"][0] = value
                # Deliberately retain the expected original pin; rank validation
                # must fail before any attempt to serialize NaN.
                self.assertHeld(bind(receipt, provenance=fixture_provenance(fixture_receipt())), "INVALID_RANKS")
        receipt = fixture_receipt(); receipt["ranks"].pop()
        self.assertHeld(bind(receipt), "INVALID_RANKS")

    def test_metrics_are_recomputed_and_nonfinite_claims_hold(self):
        for key in ("hit_at_1", "hit_at_k", "mrr_at_k", "ndcg_at_k", "median_rank"):
            for value in (float("nan"), float("inf"), True, "0.5", -1, 0.999123):
                with self.subTest(key=key, value=value):
                    receipt = fixture_receipt(); receipt[key] = value
                    self.assertHeld(bind(receipt, provenance=fixture_provenance(fixture_receipt())),
                                    "RANK_METRIC_MISMATCH:" + key)

    def test_counts_k_and_empty_protocol_are_not_truthiness_checks(self):
        for key, value in (("queries", True), ("candidates", 4), ("k", True), ("k", 0),
                           ("k", 101), ("family_count", 0)):
            with self.subTest(key=key, value=value):
                receipt = fixture_receipt(); receipt[key] = value
                self.assertHeld(bind(receipt))
        receipt = fixture_receipt(); receipt["query_ids"] = []
        self.assertHeld(bind(receipt), "INVALID_QUERY_IDS")

    def test_unknown_tasks_and_judgments_cannot_enter_a_common_leaderboard(self):
        changes = {"schema": "mica.neural.final-silver/v1", "task": "ONTOLOGY_KNOWN_TARGET_RETRIEVAL",
                   "judgment_kind": "MODEL_REVIEWED_SILVER", "tie_policy": "unknown",
                   "independent_semantic_validation": True, "accepted_hsn_labels_used": True}
        for key, value in changes.items():
            with self.subTest(key=key):
                receipt = fixture_receipt(); receipt[key] = value
                self.assertHeld(bind(receipt), "UNSUPPORTED_")

    def test_required_provenance_cannot_be_invented_from_state_hash(self):
        receipt = fixture_receipt()
        for key in ("receipt_sha256", "corpus_sha256", "code_sha256", "evidence_refs", "checkpoint_sha256",
                    "state_sha256", "model_config", "model_config_sha256"):
            with self.subTest(key=key):
                provenance = fixture_provenance(receipt); del provenance[key]
                self.assertHeld(bind(receipt, provenance=provenance))
        provenance = fixture_provenance(receipt); provenance["receipt_sha256"] = "3" * 64
        self.assertHeld(bind(receipt, provenance=provenance), "RECEIPT_PIN_MISMATCH")

    def test_config_pin_and_known_forward_method_are_checked(self):
        receipt = fixture_receipt()
        provenance = fixture_provenance(receipt)
        provenance["model_config"]["hierarchy"] = False
        self.assertHeld(bind(receipt, provenance=provenance), "MODEL_CONFIG_PIN_MISMATCH")
        provenance["model_config_sha256"] = canonical_digest(provenance["model_config"])
        self.assertHeld(bind(receipt, provenance=provenance), "MODEL_CONFIG_METHOD_MISMATCH")
        provenance = fixture_provenance(receipt); provenance["model_config"].pop("max_tokens")
        provenance["model_config_sha256"] = canonical_digest(provenance["model_config"])
        self.assertHeld(bind(receipt, provenance=provenance), "COMPLETE_MODEL_CONFIG_REQUIRED")

    def test_registry_and_corpus_mismatches_hold(self):
        receipt = fixture_receipt(); receipt["registry_sha256"] = "3" * 64
        self.assertHeld(bind(receipt), "REGISTRY_PIN_MISMATCH")
        provenance = fixture_provenance(fixture_receipt()); provenance["corpus_sha256"] = "3" * 64
        self.assertHeld(compare_evaluations(bind(), bind(provenance=provenance)), "PAIRED_CORPUS_MISMATCH")

    def test_missing_resources_remain_unknown_and_zero_is_observed(self):
        result = compare_evaluations(bind(), bind(resources={"rerank_candidate_count": 0}))
        self.assertEqual(result["status"], "COMPARABLE_DIAGNOSTIC")
        self.assertEqual(result["resource_matching"]["status"], "UNKNOWN")
        self.assertEqual(result["resource_matching"]["fields"]["rerank_candidate_count"]["candidate"], 0)
        self.assertIsNone(result["resource_matching"]["fields"]["rerank_candidate_count"]["baseline"])
        self.assertEqual(result["resource_matching"]["fields"]["cpu_seconds"]["status"], "UNKNOWN")
        self.assertFalse(result["resource_matching"]["speedup_established"])

    def test_equal_stored_but_unequal_active_parameters_expose_mismatch_without_hiding_deltas(self):
        baseline = bind(fixture_receipt(method="FLAT_ADDRESSED_MODEL"), resources={
            "stored_parameter_count": 47796, "active_trainable_parameter_count": 47640, "optimizer_updates": 180})
        candidate = bind(resources={"stored_parameter_count": 47796, "active_trainable_parameter_count": 47796,
                                    "optimizer_updates": 180})
        result = compare_evaluations(baseline, candidate)
        self.assertEqual(result["status"], "COMPARABLE_DIAGNOSTIC")
        self.assertEqual(len(result["paired_deltas"]), 5)
        resources = result["resource_matching"]
        self.assertEqual(resources["status"], "MISMATCH")
        self.assertEqual(resources["fields"]["stored_parameter_count"]["status"], "MATCH")
        self.assertEqual(resources["fields"]["active_trainable_parameter_count"]["status"], "MISMATCH")
        self.assertFalse(resources["causal_resource_control_established"])

    def test_even_complete_equal_resource_numbers_are_not_a_causal_certificate(self):
        resources = {key: 1 for key in RESOURCE_FIELDS}
        result = compare_evaluations(bind(resources=resources), bind(resources=resources))
        self.assertEqual(result["resource_matching"]["status"], "MATCH")
        self.assertFalse(result["resource_matching"]["causal_resource_control_established"])
        self.assertFalse(result["causal_hierarchy_benefit_established"])

    def test_invalid_resource_values_are_not_dropped(self):
        for value in (True, -1, float("inf"), float("nan"), "47796", 1.5):
            with self.subTest(value=value):
                self.assertHeld(bind(resources={"active_trainable_parameter_count": value}), "INVALID_RESOURCE_VALUE")
        self.assertHeld(bind(resources={"imaginary_gpu_years": 1728}), "INVALID_RESOURCE_FIELDS")

    def test_malformed_resealed_resource_envelopes_hold_without_an_exception(self):
        for value in (None, [], {}, {"cpu_seconds": 0}):
            with self.subTest(value=value):
                envelope = bind(); envelope["resources"] = value; reseal(envelope)
                self.assertHeld(compare_evaluations(bind(), envelope), "INVALID_BOUND_RESOURCE_FIELDS")
        envelope = bind(); del envelope["resources"]; reseal(envelope)
        self.assertHeld(compare_evaluations(bind(), envelope), "INVALID_BOUND_RESOURCE_FIELDS")

    def test_lexical_control_requires_explicit_permission_and_cannot_masquerade_as_neural(self):
        lexical = bind(fixture_receipt(method="BM25"))
        self.assertEqual(lexical["status"], "BOUND_LOCAL_SNAPSHOT")
        self.assertHeld(compare_evaluations(lexical, bind()), "EXPLICIT_LEXICAL_CONTROL_REQUIRED")
        explicit = compare_evaluations(lexical, bind(), allow_lexical_control=True)
        self.assertEqual(explicit["status"], "COMPARABLE_DIAGNOSTIC")
        self.assertEqual(explicit["comparison_kind"], "EXPLICIT_LEXICAL_DIAGNOSTIC")
        self.assertEqual(explicit["baseline_identity"]["route"], "LEXICAL")
        self.assertFalse(explicit["serving_policy_changed"])
        receipt = fixture_receipt(method="BM25"); receipt["retrieval_route"] = "NEURAL_DIRECT"
        self.assertHeld(bind(receipt), "ROUTE_METHOD_MISMATCH")

    def test_graph_expansion_is_not_direct_neural_recall(self):
        receipt = fixture_receipt(); receipt["retrieval_route"] = "GRAPH_EXPANDED"
        self.assertHeld(bind(receipt), "ROUTE_METHOD_MISMATCH")
        envelope = bind(); envelope["retrieval_route"] = "GRAPH_EXPANDED"; reseal(envelope)
        self.assertHeld(compare_evaluations(bind(), envelope), "ENVELOPE_ROUTE_MISMATCH")

    def test_split_provenance_is_explicit_unknown_or_matched_not_inferred_from_node_count(self):
        unknown = compare_evaluations(bind(), bind())
        self.assertEqual(unknown["split_manifest_matching"], "UNKNOWN")
        first = fixture_provenance(fixture_receipt()); first["source_family_split_sha256"] = "4" * 64
        second = deepcopy(first)
        matched = compare_evaluations(bind(provenance=first), bind(provenance=second))
        self.assertEqual(matched["split_manifest_matching"], "MATCH_SUPPLIED_PIN")
        second["source_family_split_sha256"] = "5" * 64
        self.assertHeld(compare_evaluations(bind(provenance=first), bind(provenance=second)),
                        "PAIRED_SOURCE_FAMILY_SPLIT_MISMATCH")

    def test_envelope_mutation_and_self_consistent_metric_rehash_do_not_pass(self):
        envelope = bind(); envelope["receipt"]["ranks"][0] = 2
        self.assertHeld(compare_evaluations(bind(), envelope), "ENVELOPE_PIN_MISMATCH")
        # Resealing only the wrapper must not bypass the separately retained
        # receipt pin or the independent ranks-to-metrics reconciliation.
        reseal(envelope)
        self.assertHeld(compare_evaluations(bind(), envelope), "RANK_METRIC_MISMATCH:")
        envelope = bind(); envelope["provenance"]["checkpoint_sha256"] = "3" * 64; reseal(envelope)
        self.assertHeld(compare_evaluations(bind(), envelope), "MODEL_PIN_MISMATCH:checkpoint_sha256")

    def test_bound_source_digest_and_family_count_are_revalidated_on_comparison(self):
        envelope = bind(); envelope["query_bindings"][0]["family_id"] = "new-family"; reseal(envelope)
        self.assertHeld(compare_evaluations(bind(), envelope), "FAMILY_COUNT_BINDING_MISMATCH")
        envelope = bind(); envelope["source_binding_sha256"] = "3" * 64; reseal(envelope)
        self.assertHeld(compare_evaluations(bind(), envelope), "SOURCE_BINDING_PIN_MISMATCH")

    def test_adapter_holds_missing_bindings_instead_of_accepting_a_raw_receipt(self):
        self.assertHeld(compare_evaluations(fixture_receipt(), fixture_receipt()), "BOUND_ENVELOPE_REQUIRED")
        self.assertHeld(bind_fragment_evaluation(fixture_receipt(), query_pairs=[],
                                                expected_registry_sha256=REGISTRY,
                                                provenance=fixture_provenance(fixture_receipt())), "PAIR_LIST_REQUIRED")

    def test_evidence_refs_must_be_distinct_and_complete(self):
        receipt = fixture_receipt(); p = fixture_provenance(receipt)
        p["evidence_refs"].append(deepcopy(p["evidence_refs"][0]))
        self.assertHeld(bind(receipt, provenance=p), "DUPLICATE_EVIDENCE_REF")
        p = fixture_provenance(receipt); p["evidence_refs"][0].pop("sha256")
        self.assertHeld(bind(receipt, provenance=p), "INVALID_EVIDENCE_REF")


if __name__ == "__main__":
    unittest.main()
