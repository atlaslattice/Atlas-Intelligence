"""Full-module regression and offline API contract fixtures; no real API calls."""
import copy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from test_atlas_ci_admission import ci, SHA, REPO, input_for


def green():
    return {"id": 1, "status": "completed", "conclusion": "success", "runner_id": 3,
            "steps": [{"conclusion": "success"}], "logs_verified": True}


class Coverage(unittest.TestCase):
    def test_no_runs(self):
        self.assertEqual(ci.evaluate_snapshot({"runs": []})["release_gate"], "HELD")

    def test_empty_jobs_with_green_run(self):
        doc = input_for(green()); other = copy.deepcopy(doc["runs"][0]); other.update(run_id=2, jobs=[])
        doc["runs"].append(other)
        self.assertEqual(ci.evaluate_snapshot(doc)["release_gate"], "HELD")

    def test_missing_expected_pin(self):
        self.assertEqual(ci.evaluate_snapshot(input_for(green(), expected=None))["release_gate"], "HELD")

    def test_missing_pr_pin(self):
        doc = input_for(green()); doc["runs"][0]["pr_number"] = 2
        self.assertEqual(ci.evaluate_snapshot(doc)["release_gate"], "HELD")

    def test_missing_completed_status(self):
        job = green(); del job["status"]
        self.assertEqual(ci.evaluate_snapshot(input_for(job))["release_gate"], "HELD")

    def test_bad_runner_ids(self):
        for value in (True, "3", -2, 3.1):
            with self.subTest(value=value):
                job = green(); job["runner_id"] = value
                self.assertEqual(ci.evaluate_snapshot(input_for(job))["release_gate"], "HELD")

    def test_duplicate_run(self):
        doc = input_for(green()); doc["runs"].append(copy.deepcopy(doc["runs"][0]))
        with self.assertRaises(ValueError): ci.evaluate_snapshot(doc)

    def test_duplicate_job(self):
        doc = input_for(green()); doc["runs"][0]["jobs"].append(green())
        with self.assertRaises(ValueError): ci.evaluate_snapshot(doc)

    def test_malformed_steps(self):
        job = green(); job["steps"] = ["pass"]
        self.assertEqual(ci.evaluate_snapshot(input_for(job))["release_gate"], "HELD")

    def test_cli_empty_evidence_nonzero(self):
        with tempfile.TemporaryDirectory() as t:
            path = Path(t)/"snapshot.json"; path.write_text('{"runs": []}')
            result = subprocess.run([sys.executable, ci.__file__, "--snapshot", str(path)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 3)
            self.assertEqual(json.loads(result.stdout)["release_gate"], "HELD")

    def test_cli_malformed_json_nonzero_without_traceback(self):
        with tempfile.TemporaryDirectory() as t:
            path = Path(t)/"snapshot.json"; path.write_text('{')
            result = subprocess.run([sys.executable, ci.__file__, "--snapshot", str(path)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertNotIn("Traceback", result.stderr)


class LiveCollector(unittest.TestCase):
    def setUp(self):
        self.base = "https://api.github.com/repos/" + REPO + "/actions/runs/1"
        self.pr = "https://api.github.com/repos/" + REPO + "/pulls/2"
        self.jobs_url = self.base + "/attempts/3/jobs?per_page=100"
        self.metadata = {"id":1,"run_attempt":3,"head_sha":SHA,"status":"completed","conclusion":"success","event":"pull_request", "pull_requests":[{"number":2,"base":{"repo":{"full_name":REPO}}}]}
        self.job = dict(green(), run_id=1, run_attempt=3, head_sha=SHA)
        self.doc = input_for(green()); self.doc["runs"][0]["pr_number"] = 2
        self.responses = {self.base:self.metadata,self.pr:{"head":{"sha":SHA}}, self.jobs_url:{"total_count":1,"jobs":[self.job]}}
        self.calls = []

    def fake(self, url, token):
        self.calls.append(url)
        # Also recognize historical endpoint in baseline comparison; its evidence is the same fixture.
        return copy.deepcopy(self.responses[self.jobs_url if url == self.base+"/jobs?per_page=100" else url])

    def collect(self, fake=None):
        with patch.dict(os.environ, {}, clear=True), patch.object(ci, "github_json", side_effect=fake or self.fake):
            return ci.collect_live(self.doc)

    def test_attempt_pinned_and_logs_never_self_certified(self):
        doc = self.collect(); self.assertIn(self.jobs_url, self.calls)
        self.assertEqual(doc["runs"][0]["run_attempt"], 3)
        self.assertFalse(doc["runs"][0]["jobs"][0]["logs_verified"])
        self.assertEqual(ci.evaluate_snapshot(doc)["release_gate"], "HELD")

    def test_wrong_metadata_id(self):
        self.metadata["id"] = 77
        with self.assertRaises(ValueError): self.collect()

    def test_missing_attempt(self):
        del self.metadata["run_attempt"]
        with self.assertRaises(ValueError): self.collect()

    def test_mismatched_pr_association(self):
        self.metadata["pull_requests"][0]["number"] = 8
        with self.assertRaises(ValueError): self.collect()

    def test_pr_trigger_missing_pr_number(self):
        del self.doc["runs"][0]["pr_number"]
        with self.assertRaises(ValueError): self.collect()

    def test_missing_total(self):
        del self.responses[self.jobs_url]["total_count"]
        with self.assertRaises(RuntimeError): self.collect()

    def test_underreported_total(self):
        self.responses[self.jobs_url]["total_count"] = 0
        with self.assertRaises(RuntimeError): self.collect()

    def test_paginated_total(self):
        self.responses[self.jobs_url]["total_count"] = 2
        with self.assertRaises(RuntimeError): self.collect()

    def test_mismatched_job_attempt(self):
        self.job["run_attempt"] = 2
        with self.assertRaises(ValueError): self.collect()

    def test_mismatched_job_source(self):
        self.job["head_sha"] = "b" * 40
        with self.assertRaises(ValueError): self.collect()

    def test_mismatched_job_run_id(self):
        self.job["run_id"] = 7
        with self.assertRaises(ValueError): self.collect()

    def test_run_rerun_during_collection(self):
        def changing(url, token):
            result = self.fake(url, token)
            if url == self.base and self.calls.count(url) > 1: result["run_attempt"] = 4
            return result
        with self.assertRaises(RuntimeError): self.collect(changing)

    def test_head_drift_during_collection(self):
        def changing(url, token):
            result = self.fake(url, token)
            if url == self.pr and self.calls.count(url) > 1: result["head"]["sha"] = "b"*40
            return result
        with self.assertRaises(RuntimeError): self.collect(changing)

    def test_no_historical_pr_claim_for_non_pr_run(self):
        del self.doc["runs"][0]["pr_number"]
        self.doc["runs"][0]["current_pr_head_sha"] = "b"*40
        self.metadata["event"] = "push"
        self.assertIsNone(self.collect()["runs"][0]["current_pr_head_sha"])

if __name__ == "__main__": unittest.main()
