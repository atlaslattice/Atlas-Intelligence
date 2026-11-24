"""Pure-stdlib negative controls for the Atlas CI admission checker."""
import importlib.util
from pathlib import Path
import unittest

src = Path(__file__).resolve().parents[1] / "scripts" / "atlas_ci_admission.py"
spec = importlib.util.spec_from_file_location("atlas_ci_admission", src)
ci = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ci)
SHA = "a" * 40
REPO = "atlaslattice/Atlas-Intelligence"

def input_for(job, repo=REPO, expected=SHA, actual=SHA):
    return {"runs": [{
        "repository": repo, "run_id": 1,
        "workflow": ".github/workflows/example.yml",
        "head_sha": actual, "expected_head_sha": expected, "jobs": [job],
    }]}

class AdmissionTests(unittest.TestCase):
    def test_zero_steps_not_a_test_failure(self):
        job = {"id": 1, "status": "completed", "conclusion": "failure", "runner_id": 0, "steps": []}
        result = ci.evaluate_snapshot(input_for(job))
        self.assertEqual(result["jobs"][0]["job_state"], "HELD_PRE_RUNNER_UNKNOWN")
        self.assertEqual(result["release_gate"], "HELD")

    def test_null_steps_are_incomplete_observation(self):
        self.assertEqual(ci.evaluate_job({"id": 1, "conclusion": "failure", "steps": None}), "HELD_INCOMPLETE_OBSERVATION")

    def test_no_runner_not_accepted_even_if_steps_claimed(self):
        self.assertNotEqual(ci.evaluate_job({
            "id": 1, "conclusion": "success", "runner_id": 0,
            "steps": [{"conclusion": "success"}], "logs_verified": True,
        }), "HOSTED_EXECUTION_ACCEPTED")

    def test_host_test_failure_is_separate_from_startup(self):
        self.assertEqual(ci.evaluate_job({
            "id": 1, "conclusion": "failure", "runner_id": 3,
            "steps": [{"conclusion": "failure"}],
        }), "EXECUTED_HOST_FAILURE")

    def test_successful_steps_without_logs_do_not_certify_host(self):
        self.assertEqual(ci.evaluate_job({
            "id": 1, "conclusion": "success", "runner_id": 3,
            "steps": [{"conclusion": "success"}],
        }), "HOST_STEPS_PASS_LOGS_UNVERIFIED")

    def test_all_proofs_required(self):
        job = {"id": 1, "status": "completed", "conclusion": "success",
               "runner_id": 3, "steps": [{"conclusion": "success"}], "logs_verified": True}
        self.assertEqual(ci.evaluate_snapshot(input_for(job))["release_gate"], "CI_EXECUTED_SCOPE_ONLY")

    def test_sha_mismatch_fails_closed(self):
        job = {"id": 1, "conclusion": "success", "runner_id": 3,
               "steps": [{"conclusion": "success"}], "logs_verified": True}
        self.assertEqual(ci.evaluate_snapshot(input_for(job, actual="b" * 40))["release_gate"], "HELD")

    def test_current_pr_head_drift_blocks_old_green_run(self):
        job = {"id": 1, "conclusion": "success", "runner_id": 3,
               "steps": [{"conclusion": "success"}], "logs_verified": True}
        evidence = input_for(job)
        evidence["runs"][0]["current_pr_head_sha"] = "b" * 40
        result = ci.evaluate_snapshot(evidence)
        self.assertEqual(result["release_gate"], "HELD")
        self.assertEqual(result["jobs"][0]["source_status"], "STALE_PR_HEAD")

    def test_unknown_repository_rejected(self):
        with self.assertRaises(ValueError):
            ci.evaluate_snapshot(input_for({"id": 1, "steps": []}, repo="unknown/private"))

    def test_external_api_rejected_before_network(self):
        with self.assertRaises(ValueError):
            ci.github_json("https://example.com/api")

    def test_non_atlas_repository_rejected_before_network(self):
        with self.assertRaises(ValueError):
            ci.github_json("https://api.github.com/repos/unknown/private/actions/runs/1")

    def test_cross_repo_pattern_is_not_root_cause(self):
        a = input_for({"id": 1, "status": "completed", "runner_id": 0, "conclusion": "failure", "steps": []})["runs"][0]
        b = input_for({"id": 2, "status": "completed", "runner_id": 0, "conclusion": "failure", "steps": []},
                      repo="atlaslattice/noosphere-archive")["runs"][0]
        result = ci.evaluate_snapshot({"runs": [a, b]})
        self.assertTrue(result["cross_repository_admission_pattern"])
        self.assertEqual(result["root_cause"], "UNKNOWN")

    def test_queued_not_a_failure(self):
        self.assertEqual(ci.evaluate_job({"id": 1, "status": "queued", "steps": []}), "PENDING")

if __name__ == "__main__":
    unittest.main()
