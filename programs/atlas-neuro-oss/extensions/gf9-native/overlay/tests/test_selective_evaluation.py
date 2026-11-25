"""Original synthetic controls for selective evaluation; no learned inference."""
from copy import deepcopy
import hashlib
import json
import math
from statistics import NormalDist
import unittest

from atlas_work_learning.selective_evaluation import (
    fit_selective_policy, evaluate_selective_policy, paired_family_selective_bootstrap,
    wilson_error_upper,
)


def sha(value):
    return hashlib.sha256(value.encode()).hexdigest()


def pins(split):
    return {"model_sha256": sha("synthetic fixed model"), "scorer_sha256": sha("synthetic ranking score"),
            "score_name": "synthetic_margin_not_probability", "dataset_sha256": sha("dataset:"+split),
            "label_set_sha256": sha("labels:"+split), "label_protocol_sha256": sha("synthetic correctness rubric")}


def row(split, index, score, correct, *, family=None, label_kind="synthetic"):
    family = family or f"{split}-family-{index}"
    return {"id": f"{split}-case-{index}", "family_id": family, "family_sha256": sha("family:"+family),
            "source_sha256": sha("source:"+split+":"+str(index)), "split": split,
            "score": score, "correct": correct, "label_kind": label_kind}


def validation():
    return [row("validation", i, .95 if i<30 else .85 if i<80 else .20, i<80) for i in range(100)]


def test_panel():
    return [row("test", i, .95 if i<20 else .85 if i<40 else .20, i<30) for i in range(60)]


def policy(**kwargs):
    return fit_selective_policy(validation(), provenance=pins("validation"), **kwargs)


class SelectiveEvaluationTests(unittest.TestCase):
    def test_validation_quality_criterion_precedes_coverage(self):
        fitted = policy()
        self.assertEqual(fitted["threshold"], .85)
        self.assertEqual(fitted["validation_metrics"]["accepted_rows"], 80)
        self.assertEqual(fitted["validation_metrics"]["row_selective_risk"], 0)
        self.assertLess(fitted["validation_metrics"]["family_risk_wilson_upper"], .10)
        rejected = fitted["thresholds_considered"][0]
        self.assertEqual(rejected["metrics"]["accepted_rows"], 100)
        self.assertFalse(rejected["meets_validation_criterion"])
        self.assertFalse(fitted["test_used_for_selection"])

    def test_shifted_high_scores_surface_failure_without_refitting(self):
        fitted = policy(); before = json.dumps(fitted, sort_keys=True)
        shifted = [row("test", i, .99 if i<30 else .10, i>=30) for i in range(60)]
        result = evaluate_selective_policy(fitted, shifted, provenance=pins("test"))
        self.assertEqual(result["metrics"]["row_coverage"], .5)
        self.assertEqual(result["metrics"]["row_selective_risk"], 1)
        self.assertEqual(result["metrics"]["family_risk_wilson_upper"], 1)
        self.assertTrue(result["observed_target_exceeded"])
        self.assertEqual(result["threshold"], .85)
        self.assertEqual(json.dumps(fitted, sort_keys=True), before)

    def test_wilson_zero_errors_has_positive_uncertainty(self):
        z = NormalDist().inv_cdf(.95)
        self.assertAlmostEqual(wilson_error_upper(0, 20), z*z/(20+z*z), places=14)
        self.assertGreater(wilson_error_upper(0, 20), 0)
        self.assertEqual(wilson_error_upper(20, 20), 1)
        self.assertIsNone(wilson_error_upper(0, 0))
        self.assertLess(wilson_error_upper(0, 100), wilson_error_upper(0, 20))

    def test_family_error_unit_preserves_correlation_warning(self):
        rows = [row("validation", i, .9, True, family="related-A") for i in range(3)]
        rows.append(row("validation", 3, .9, False, family="independent-B"))
        fitted = fit_selective_policy(rows, provenance=pins("validation"), risk_target=.99, min_selected_families=1)
        metrics = fitted["validation_metrics"]
        self.assertEqual(metrics["row_selective_risk"], .25)
        self.assertEqual(metrics["family_any_error_risk"], .5)
        self.assertEqual(metrics["accepted_families"], 2)
        self.assertIn("ACCEPTED_FAMILY", fitted["risk_unit"])

    def test_empty_acceptance_is_hold_and_unknown_risk(self):
        fitted = policy(candidate_thresholds=[2.0])
        self.assertEqual(fitted["decision"], "HOLD_NO_VALID_THRESHOLD")
        self.assertIsNone(fitted["threshold"])
        result = evaluate_selective_policy(fitted, test_panel(), provenance=pins("test"))
        self.assertEqual(result["metrics"]["row_coverage"], 0)
        self.assertIsNone(result["metrics"]["row_selective_risk"])
        self.assertIsNone(result["metrics"]["family_risk_wilson_upper"])
        self.assertIsNone(result["observed_target_exceeded"])

    def test_record_family_and_renamed_digest_leakage_reject(self):
        fitted = policy()
        for change, code in [("id", "SELECTIVE_RECORD_LEAKAGE"), ("family_id", "SELECTIVE_FAMILY_LEAKAGE"),
                             ("family_sha256", "SELECTIVE_FAMILY_DIGEST_LEAKAGE")]:
            with self.subTest(change=change):
                rows = test_panel(); rows[0][change] = validation()[0][change]
                with self.assertRaisesRegex(ValueError, code):
                    evaluate_selective_policy(fitted, rows, provenance=pins("test"))

    def test_source_score_and_label_bindings_are_explicit(self):
        fitted = policy()
        for field, code in [("scorer_sha256", "SCORE_BINDING"), ("model_sha256", "SCORE_BINDING"),
                            ("score_name", "SCORE_BINDING"), ("dataset_sha256", "DATASET_EDITION"),
                            ("label_set_sha256", "LABEL_SET")]:
            with self.subTest(field=field):
                changed = pins("test")
                changed[field] = pins("validation")[field] if field in ("dataset_sha256", "label_set_sha256") else ("other score" if field=="score_name" else sha("changed"))
                with self.assertRaisesRegex(ValueError, code):
                    evaluate_selective_policy(fitted, test_panel(), provenance=changed)

    def test_known_source_reuse_rejects_despite_renamed_disjoint_families(self):
        fitted = policy()
        self.assertEqual(fitted["validation_source_sha256s"],
                         sorted({item["source_sha256"] for item in validation()}))
        rows = test_panel()
        self.assertNotEqual(rows[0]["id"], validation()[0]["id"])
        self.assertNotEqual(rows[0]["family_id"], validation()[0]["family_id"])
        self.assertNotEqual(rows[0]["family_sha256"], validation()[0]["family_sha256"])
        rows[0]["source_sha256"] = validation()[0]["source_sha256"]
        with self.assertRaisesRegex(ValueError, "SELECTIVE_SOURCE_DIGEST_LEAKAGE"):
            evaluate_selective_policy(fitted, rows, provenance=pins("test"))

    def test_legacy_or_malformed_source_inventory_holds_even_with_valid_seal(self):
        # A matching checksum is integrity evidence, not a schema or source grant.
        for replacement in [None, [], "not-an-inventory", [True], ["bad-hash"],
                            [sha("same"), sha("same")]]:
            fitted = policy()
            fitted.pop("artifact_sha256")
            if replacement is None:
                fitted.pop("validation_source_sha256s")
            else:
                fitted["validation_source_sha256s"] = replacement
            body = json.dumps(fitted, sort_keys=True, separators=(",", ":"),
                              ensure_ascii=False, allow_nan=False).encode("utf-8")
            fitted["artifact_sha256"] = hashlib.sha256(body).hexdigest()
            with self.subTest(replacement=replacement):
                with self.assertRaisesRegex(ValueError, "SELECTIVE_SOURCE_INVENTORY_"):
                    evaluate_selective_policy(fitted, test_panel(), provenance=pins("test"))

    def test_numeric_and_binary_contract_rejects_invalid_rows(self):
        for value in [math.nan, math.inf, -math.inf, True, "0.8", 10**1000]:
            with self.subTest(score=repr(value)[:20]):
                rows = validation(); rows[0]["score"] = value
                with self.assertRaisesRegex(ValueError, "SCORE_INVALID"):
                    fit_selective_policy(rows, provenance=pins("validation"))
        for value in [0, 1, .5, "true", None]:
            rows = validation(); rows[0]["correct"] = value
            with self.assertRaisesRegex(ValueError, "BINARY_LABEL"):
                fit_selective_policy(rows, provenance=pins("validation"))

    def test_duplicate_split_alias_and_label_kind_fail_closed(self):
        changes = [lambda r:r.append(deepcopy(r[0])), lambda r:r[0].update(split="test"),
                   lambda r:r[0].update(label_kind="verified"), lambda r:r[1].update(family_sha256=r[0]["family_sha256"])]
        for change in changes:
            rows=validation(); change(rows)
            with self.assertRaises(ValueError): fit_selective_policy(rows, provenance=pins("validation"))
        with self.assertRaisesRegex(ValueError,"PROVENANCE_REQUIRED"):
            fit_selective_policy(validation(), provenance={})

    def test_budgets_confidence_and_boolean_counts_reject(self):
        for kwargs in [{"risk_target":True},{"risk_target":math.nan},{"confidence_level":.5},
                       {"confidence_level":1},{"min_selected_families":True},{"min_selected_families":0},
                       {"candidate_thresholds":[.8,.8]},{"candidate_thresholds":[math.inf]},
                       {"candidate_thresholds":list(range(257))}]:
            with self.subTest(kwargs=kwargs):
                with self.assertRaises(ValueError): policy(**kwargs)
        for args in [(True,10),(0,True),(11,10),(-1,10)]:
            with self.assertRaises(ValueError): wilson_error_upper(*args)

    def test_input_order_is_irrelevant_and_threshold_ties_are_atomic(self):
        first=policy(); other=fit_selective_policy(list(reversed(validation())),provenance=pins("validation"))
        self.assertEqual(first,other)
        rows=[row("test",i,.85,True) for i in range(4)]
        result=evaluate_selective_policy(first,rows,provenance=pins("test"))
        self.assertEqual(result["metrics"]["accepted_rows"],4)

    def test_policy_and_report_mutation_are_detected(self):
        fitted=policy(); changed=deepcopy(fitted); changed["threshold"]=-100
        with self.assertRaisesRegex(ValueError,"ARTIFACT_CHANGED"):
            evaluate_selective_policy(changed,test_panel(),provenance=pins("test"))
        report=evaluate_selective_policy(fitted,test_panel(),provenance=pins("test"))
        mutated=deepcopy(report); mutated["case_results"][0]["accepted"]=False
        with self.assertRaisesRegex(ValueError,"ARTIFACT_CHANGED"):
            paired_family_selective_bootstrap(report,mutated,samples=100)

    def test_paired_bootstrap_is_deterministic_and_preserves_zero_control(self):
        report=evaluate_selective_policy(policy(),test_panel(),provenance=pins("test"))
        one=paired_family_selective_bootstrap(report,report,samples=200,seed=97)
        two=paired_family_selective_bootstrap(report,report,samples=200,seed=97)
        self.assertEqual(one,two)
        self.assertEqual(one["risk_percentile_interval"],[0,0])
        self.assertEqual(one["coverage_percentile_interval"],[0,0])
        self.assertEqual(one["undefined_risk_replicates"],0)

    def test_paired_comparison_exposes_risk_coverage_tradeoff(self):
        lo=evaluate_selective_policy(policy(),test_panel(),provenance=pins("test"))
        hi=evaluate_selective_policy(policy(candidate_thresholds=[.9]),test_panel(),provenance=pins("test"))
        result=paired_family_selective_bootstrap(lo,hi,samples=500,seed=144)
        self.assertAlmostEqual(result["observed_risk_delta"],.25)
        self.assertAlmostEqual(result["observed_coverage_delta"],1/3)
        self.assertGreater(result["risk_percentile_interval"][0],0)
        self.assertEqual(result["families"],60)

    def test_unpaired_or_conflicting_prediction_records_reject(self):
        report=evaluate_selective_policy(policy(),test_panel(),provenance=pins("test"))
        for change in [lambda r:r.pop(),lambda r:r[0].update(correct=False),lambda r:r[0].update(score=.96)]:
            rows=test_panel(); change(rows)
            other=evaluate_selective_policy(policy(),rows,provenance=pins("test"))
            with self.assertRaisesRegex(ValueError,"UNPAIRED"):
                paired_family_selective_bootstrap(report,other,samples=100)
        for kwargs in [{"samples":True},{"samples":99},{"seed":True},{"seed":-1}]:
            with self.assertRaises(ValueError): paired_family_selective_bootstrap(report,report,**kwargs)

    def test_no_acceptance_bootstrap_does_not_impute_zero_risk(self):
        fitted=policy(candidate_thresholds=[2])
        report=evaluate_selective_policy(fitted,test_panel(),provenance=pins("test"))
        result=paired_family_selective_bootstrap(report,report,samples=100,seed=0)
        self.assertEqual(result["status"],"UNDEFINED_RISK")
        self.assertEqual(result["undefined_risk_replicates"],100)
        self.assertEqual(result["risk_percentile_interval"],[None,None])
        self.assertEqual(result["coverage_percentile_interval"],[0,0])

    def test_total_cluster_draw_budget_is_enforced_before_resampling(self):
        rows=[row("test",i,.95,True) for i in range(110)]
        report=evaluate_selective_policy(policy(),rows,provenance=pins("test"))
        with self.assertRaisesRegex(ValueError,"BOOTSTRAP_WORK_BUDGET"):
            paired_family_selective_bootstrap(report,report,samples=10_000)


if __name__ == "__main__":
    unittest.main()
