"""Synthetic fixed-port checks. Requires an executor-selected pinned kernel root."""
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python"))
KERNEL_ROOT = Path(os.environ["ATLAS_TEST_NUMERIC_KERNEL_ROOT"]).resolve()
sys.path.insert(0, str(KERNEL_ROOT))
from atlas_unified144 import numeric_port as port
from atlas_unified144.corpus_coverage import canonical_sha256, SNAPSHOT_FIELDS

IPC_OBSERVATIONS = []
TRANSPORT_OBSERVATIONS = []


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


def request(operation, parameters, feature):
    return {"operation": operation, "parameters": parameters,
        "subjectResultSha256": sha("synthetic original gateway result"),
        "catalogSha256": sha("synthetic reviewed catalog"),
        "featureId": feature, "trainingRequested": False}


def pins(split):
    return {"model_sha256": sha("fixed synthetic model"), "scorer_sha256": sha("fixed scorer"),
            "score_name": "synthetic_rank_not_probability", "dataset_sha256": sha("dataset-" + split),
            "label_set_sha256": sha("labels-" + split), "label_protocol_sha256": sha("rubric")}


def rows(split):
    return [{"id": f"{split}-{i}", "family_id": f"{split}-family-{i}",
             "family_sha256": sha(f"{split}-family-{i}"), "source_sha256": sha(f"{split}-source-{i}"),
             "split": split, "score": .9 - i * .1, "correct": i != 3, "label_kind": "synthetic"}
            for i in range(4)]


def coverage_parameters():
    snapshot = {k: sha(k) for k in SNAPSHOT_FIELDS}
    inventory = {"schema": "atlas.work-learning.status/v1", "scope": "WORK", "provenance": snapshot,
        "corpus": {"discovered": 5, "admitted": 5, "held": 0, "aliases": 5, "families": 5,
                   "splits": {"train": 2, "validation": 2, "test": 1}},
        "coverage": {"whole_archive_complete": False, "current_remote_rights_reauthenticated": False,
                     "upstream_coverage": {"providerEnumerationComplete": False, "contentComplete": False,
                                           "fullCorpusComplete": False}}}
    return {"records": None, "inventory": inventory, "expected_snapshot": snapshot,
            "expected_inventory_sha256": canonical_sha256(inventory)}


def raw(request):
    return json.dumps(request, separators=(",", ":"), allow_nan=False).encode()


def node_roundtrip(value):
    before = raw(value)
    result = subprocess.run(["node", "-e",
        'let s="";process.stdin.on("data",x=>s+=x);process.stdin.on("end",()=>process.stdout.write(JSON.stringify(JSON.parse(s))));'],
        input=before, capture_output=True, timeout=5, check=True)
    TRANSPORT_OBSERVATIONS.append({"beforeSha256": hashlib.sha256(before).hexdigest(),
        "afterSha256": hashlib.sha256(result.stdout).hexdigest(), "returncode": result.returncode})
    return json.loads(result.stdout)


def fit_request():
    return request("selective_fit", {"validation_rows": rows("validation"),
        "provenance": pins("validation"), "risk_target": .99, "min_selected_families": 1,
        "candidate_thresholds": [.5, .8]}, "F109")


def evaluate_request(policy_json):
    return request("selective_evaluate", {"policyJson": policy_json,
        "test_rows": rows("test"), "provenance": pins("test")}, "F110")


def compare_request(report_json):
    return request("selective_compare", {"leftReportJson": report_json,
        "rightReportJson": report_json, "samples": 100}, "F111")


class NumericPortTests(unittest.TestCase):
    def ipc(self, req, *, encoded=None, kernel_root=KERNEL_ROOT, args=()):
        payload = raw(req) if encoded is None else encoded
        env = {"PATH": os.environ.get("PATH", "/usr/bin:/bin"), "PYTHONDONTWRITEBYTECODE": "1",
               "PYTHONPATH": str(kernel_root) + os.pathsep + str(ROOT / "python")}
        p = subprocess.run([sys.executable, "-B", "-S", str(ROOT / "python/atlas_unified144/numeric_port.py"), *args],
                           input=payload, capture_output=True, env=env, timeout=10)
        IPC_OBSERVATIONS.append({"operation": req.get("operation") if type(req) is dict else None,
            "requestSha256": hashlib.sha256(payload).hexdigest(), "requestBytes": len(payload),
            "returncode": p.returncode, "stdoutSha256": hashlib.sha256(p.stdout).hexdigest(),
            "stdoutBytes": len(p.stdout), "stderrSha256": hashlib.sha256(p.stderr).hexdigest()})
        return p

    def success(self, req):
        p = self.ipc(req)
        self.assertEqual(p.returncode, 0, p.stderr.decode())
        self.assertEqual(p.stderr, b"")
        out = json.loads(p.stdout)
        self.assertEqual(set(out), {"schema", "operation", "subjectResultSha256", "catalogSha256", "featureId",
                                   "value", "optimizerUpdates", "modelCalls", "executingRuntimeAttested", "featureWholeImplemented"})
        for key in ("operation", "subjectResultSha256", "catalogSha256", "featureId"):
            self.assertEqual(out[key], req[key])
        self.assertEqual(out["schema"], "atlas.oss144.numeric-output/v1")
        self.assertEqual((out["optimizerUpdates"], out["modelCalls"]), (0, 0))
        self.assertIs(out["executingRuntimeAttested"], False)
        self.assertIs(out["featureWholeImplemented"], False)
        return out["value"]

    def test_eight_operations_through_actual_one_shot_interpreters(self):
        before = len(IPC_OBSERVATIONS)
        value = self.success(request("exact_leak", {"value": 0., "drive": 1., "tau": 1., "dt": 0.}, "F049"))
        self.assertEqual(value, 0)
        delta = self.success(request("delta_encode", {"samples": [0., .2, .5], "quantum": .25}, "F061"))
        self.assertEqual(delta["sample_count"], 3)
        address = self.success(request("address_metadata", {"hsn": "H12.S12.N12"}, "F088"))
        self.assertEqual(address["index"], 1727)
        q = self.success(request("quantization_audit", {"corpus": [{"id": "a", "vector": [1., 0.]},
            {"id": "b", "vector": [0., 1.]}], "queries": [{"id": "q", "vector": [1., 0.]}], "top_k": 1}, "F025"))
        self.assertEqual(q["counts"]["scored_queries"], 1)
        policy = self.success(fit_request())
        self.assertEqual(set(policy), {"artifact", "artifactJson"})
        self.assertEqual(policy["artifact"]["kind"], "SELECTIVE_POLICY")
        report = self.success(evaluate_request(policy["artifactJson"]))
        comparison = self.success(compare_request(report["artifactJson"]))
        self.assertEqual(comparison["observed_coverage_delta"], 0)
        audit = self.success(request("corpus_coverage", coverage_parameters(), None))
        self.assertEqual(audit["status"], "HOLD")
        self.assertFalse(audit["trainingExecutionAuthorized"])
        observed = IPC_OBSERVATIONS[before:]
        self.assertEqual(len(observed), 8)
        self.assertEqual({o["operation"] for o in observed}, set(port.FEATURE_BINDINGS))

    def test_other_exact_allowed_feature_bindings(self):
        req = request("address_metadata", {"hsn": "H01.S01.N01"}, "F089")
        self.assertEqual(port.dispatch_request(req)["value"]["index"], 0)

    def test_unknown_operation_and_feature_mismatch(self):
        for operation, feature in [("train", "F049"), ("exact_leak", "F050"), ("exact_leak", None),
                                   ("corpus_coverage", "F001")]:
            with self.subTest(operation=operation, feature=feature):
                with self.assertRaises(port.NumericPortError):
                    port.dispatch_request(request(operation, {}, feature))

    def test_training_flag_requires_literal_false(self):
        for value in (True, 0, None, "false"):
            req = request("exact_leak", {}, "F049"); req["trainingRequested"] = value
            with self.assertRaisesRegex(port.NumericPortError, "TRAINING_FORBIDDEN"):
                port.dispatch_request(req)

    def test_unknown_request_and_parameter_fields_reject(self):
        req = request("exact_leak", {"value": 0, "drive": 0, "tau": 1, "dt": 1}, "F049")
        wrong = copy.deepcopy(req); wrong["path"] = "/ignored"
        with self.assertRaisesRegex(port.NumericPortError, "EXACT_REQUEST_FIELDS"):
            port.dispatch_request(wrong)
        req["parameters"]["code"] = "ignored"
        with self.assertRaisesRegex(port.NumericPortError, "CLOSED_PARAMETER"):
            port.dispatch_request(req)

    def test_duplicate_keys_at_both_levels_reject(self):
        for encoded in (b'{"operation":"exact_leak","operation":"train"}',
                        b'{"parameters":{"dt":1,"dt":2}}'):
            with self.assertRaisesRegex(port.NumericPortError, "DUPLICATE_JSON_KEY"):
                port.parse_request(encoded)

    def test_nonfinite_and_unsafe_numbers_reject(self):
        for encoded in (b'{"x":NaN}', b'{"x":Infinity}', b'{"x":1e309}', b'{"x":9007199254740992}'):
            with self.assertRaises(port.NumericPortError):
                port.parse_request(encoded)

    def test_request_byte_budget_and_zero_stdout_errors(self):
        req = request("exact_leak", {}, "F049")
        for encoded in (b"x" * (port.MAX_REQUEST_BYTES + 1), b'{"x":1,"x":2}'):
            p = self.ipc(req, encoded=encoded)
            self.assertEqual(p.returncode, 2)
            self.assertEqual(p.stdout, b"")
            err = json.loads(p.stderr)
            self.assertEqual(err["schema"], "atlas.oss144.numeric-error/v1")

    def test_invalid_command_arguments_reject(self):
        p = self.ipc(request("exact_leak", {}, "F049"), args=("--path", "/ignored"))
        self.assertEqual(p.returncode, 2)
        self.assertEqual(p.stdout, b"")
        self.assertEqual(json.loads(p.stderr)["error"], "NO_COMMAND_ARGUMENTS_ALLOWED")

    def test_bootstrap_budget_cannot_be_raised(self):
        req = request("selective_compare", {"leftReportJson": "{}", "rightReportJson": "{}", "samples": 1001}, "F111")
        with self.assertRaisesRegex(port.NumericPortError, "PORT_INTEGER_BUDGET"):
            port.dispatch_request(req)

    def test_existing_kernel_numeric_guards_remain_active(self):
        req = request("exact_leak", {"value": 1e308, "drive": 0, "tau": 1, "dt": 1}, "F049")
        with self.assertRaisesRegex(port.NumericPortError, "KERNEL_REJECTED_PARAMETERS"):
            port.dispatch_request(req)

    def test_source_drift_rejected_before_execution(self):
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp) / "atlas_work_learning"; d.mkdir()
            p = d / "event_lattice.py"
            p.write_bytes((KERNEL_ROOT / "atlas_work_learning/event_lattice.py").read_bytes()
                          + b'\nraise AssertionError("must not execute")\n')
            req = request("exact_leak", {"value": 0, "drive": 0, "tau": 1, "dt": 1}, "F049")
            with patch.object(sys, "path", [tmp, *sys.path]):
                with self.assertRaisesRegex(port.NumericPortError, "KERNEL_SOURCE_PIN_MISMATCH"):
                    port.dispatch_request(req)

    def test_unverified_package_init_is_not_executed(self):
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp) / "atlas_work_learning"; d.mkdir()
            (d / "event_lattice.py").write_bytes((KERNEL_ROOT / "atlas_work_learning/event_lattice.py").read_bytes())
            (d / "__init__.py").write_text('raise AssertionError("package init must not execute")\n')
            req = request("exact_leak", {"value": 0, "drive": 0, "tau": 1, "dt": 1}, "F049")
            p = self.ipc(req, kernel_root=Path(tmp))
            self.assertEqual(p.returncode, 0, p.stderr.decode())
            self.assertEqual(json.loads(p.stdout)["value"], 0)

    def test_verified_capture_is_used_after_file_changes(self):
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp) / "atlas_work_learning"; d.mkdir()
            p = d / "event_lattice.py"
            original = (KERNEL_ROOT / "atlas_work_learning/event_lattice.py").read_bytes()
            p.write_bytes(original)
            old_reader = Path.read_bytes
            def captured_read(path):
                result = old_reader(path)
                if path == p:
                    p.write_text('raise AssertionError("new bytes must not execute")\n')
                return result
            req = request("exact_leak", {"value": 0, "drive": 0, "tau": 1, "dt": 1}, "F049")
            with patch.object(sys, "path", [tmp, *sys.path]), patch.object(Path, "read_bytes", captured_read):
                self.assertEqual(port.dispatch_request(req)["value"], 0)

    def test_source_symlink_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp) / "atlas_work_learning"; d.mkdir()
            (d / "event_lattice.py").symlink_to(KERNEL_ROOT / "atlas_work_learning/event_lattice.py")
            with patch.object(sys, "path", [tmp, *sys.path]):
                with self.assertRaisesRegex(port.NumericPortError, "KERNEL_REGULAR_FILE"):
                    port.dispatch_request(request("exact_leak", {"value": 0, "drive": 0, "tau": 1, "dt": 1}, "F049"))

    def test_subject_and_catalog_pins_are_exact_strings(self):
        for key in ("subjectResultSha256", "catalogSha256"):
            req = request("exact_leak", {}, "F049"); req[key] = "not-a-digest"
            with self.assertRaisesRegex(port.NumericPortError, "REQUEST_DIGEST_REQUIRED"):
                port.dispatch_request(req)

    def test_actual_node_roundtrip_preserves_policy_and_report_chain(self):
        policy = node_roundtrip(self.success(node_roundtrip(fit_request())))
        self.assertIs(type(policy["artifact"]["validation_metrics"]["row_coverage"]), int)
        decoded = json.loads(policy["artifactJson"])
        self.assertIs(type(decoded["validation_metrics"]["row_coverage"]), float)
        report = node_roundtrip(self.success(node_roundtrip(evaluate_request(policy["artifactJson"]))))
        self.assertIs(type(report["artifact"]["metrics"]["row_coverage"]), int)
        self.assertIs(type(json.loads(report["artifactJson"])["metrics"]["row_coverage"]), float)
        comparison = node_roundtrip(self.success(node_roundtrip(compare_request(report["artifactJson"]))))
        self.assertEqual(comparison["observed_coverage_delta"], 0)
        self.assertEqual(comparison["observed_risk_delta"], 0)
        self.assertEqual(comparison["families"], 4)

    def test_legacy_objects_and_duplicate_input_authority_reject(self):
        policy = port.dispatch_request(fit_request())["value"]
        for field in ("policy", "artifact", "artifactJson"):
            req = evaluate_request(policy["artifactJson"])
            req["parameters"][field] = policy["artifact"]
            with self.assertRaisesRegex(port.NumericPortError, "CLOSED_PARAMETER_SCHEMA"):
                port.dispatch_request(req)
        req = evaluate_request(policy["artifact"])
        with self.assertRaisesRegex(port.NumericPortError, "OPAQUE_ARTIFACT_JSON_STRING_REQUIRED"):
            port.dispatch_request(req)
        req = request("selective_compare", {"left_report": {}, "right_report": {}}, "F111")
        with self.assertRaisesRegex(port.NumericPortError, "CLOSED_PARAMETER_SCHEMA"):
            port.dispatch_request(req)

    def test_normalized_display_and_boolean_mutation_do_not_reseal(self):
        policy = port.dispatch_request(fit_request())["value"]
        normalized = node_roundtrip(policy["artifact"])
        self.assertEqual(normalized["artifact_sha256"], policy["artifact"]["artifact_sha256"])
        with self.assertRaisesRegex(port.NumericPortError, "KERNEL_REJECTED_PARAMETERS"):
            port.dispatch_request(evaluate_request(json.dumps(normalized)))
        changed = json.loads(policy["artifactJson"])
        changed["test_used_for_selection"] = 0
        with self.assertRaisesRegex(port.NumericPortError, "KERNEL_REJECTED_PARAMETERS"):
            port.dispatch_request(evaluate_request(json.dumps(changed)))
        report = port.dispatch_request(evaluate_request(policy["artifactJson"]))["value"]
        changed = json.loads(report["artifactJson"])
        changed["metrics"]["row_coverage"] = True
        with self.assertRaisesRegex(port.NumericPortError, "KERNEL_REJECTED_PARAMETERS"):
            port.dispatch_request(compare_request(json.dumps(changed)))

    def test_opaque_artifact_parser_rejects_duplicate_nonfinite_and_nonobject(self):
        for encoded in ('{"x":1,"x":2}', '{"x":NaN}', '{"x":1e309}', '{"x":9007199254740992}',
                        '{"x":{"y":1,"y":2}}', '[]', '{'):
            with self.subTest(encoded=encoded), self.assertRaises(port.NumericPortError):
                port.dispatch_request(evaluate_request(encoded))

    def test_opaque_string_budget_is_exact_path_and_whole_request_bounded(self):
        policy = port.dispatch_request(fit_request())["value"]
        padded = policy["artifactJson"] + " " * 9000
        self.assertGreater(len(padded), 8192)
        report = port.dispatch_request(evaluate_request(padded))["value"]
        self.assertEqual(report["artifact"]["kind"], "SELECTIVE_TEST_REPORT")
        req = evaluate_request(policy["artifactJson"])
        req["parameters"]["provenance"]["score_name"] = "x" * 8193
        with self.assertRaisesRegex(port.NumericPortError, "JSON_STRING_BUDGET"):
            port.dispatch_request(req)
        for text in ("x" * (port.MAX_ARTIFACT_BYTES + 1), json.dumps({"padding": "é" * 25000}, ensure_ascii=False)):
            with self.assertRaises(port.NumericPortError):
                port.dispatch_request(evaluate_request(text))
        with self.assertRaisesRegex(port.NumericPortError, "JSON_STRING_BUDGET"):
            port.dispatch_request(evaluate_request(json.dumps({"padding": "x" * 8193})))
        large = report["artifactJson"] + " " * 33000
        with self.assertRaisesRegex(port.NumericPortError, "REQUEST_BYTE_BUDGET"):
            port.dispatch_bytes(raw(compare_request(large)))

    def test_opaque_continuation_preserves_heldout_source_and_family_guards(self):
        policy = port.dispatch_request(fit_request())["value"]
        for key in ("family_id", "source_sha256"):
            req = evaluate_request(policy["artifactJson"])
            req["parameters"]["test_rows"][0][key] = rows("validation")[0][key]
            with self.assertRaisesRegex(port.NumericPortError, "KERNEL_REJECTED_PARAMETERS"):
                port.dispatch_request(req)

    def test_lone_surrogate_returns_fixed_error_without_traceback(self):
        req = request("quantization_audit", {"corpus": [{"id": "\ud800", "vector": [1., 0.]}],
            "queries": [{"id": "q", "vector": [1., 0.]}], "top_k": 1}, "F025")
        result = self.ipc(req)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(result.stdout, b"")
        self.assertEqual(json.loads(result.stderr)["error"], "INVALID_JSON_UNICODE")


if __name__ == "__main__":
    result = unittest.main(verbosity=2, exit=False).result
    receipt_path = os.environ.get("ATLAS_TEST_NUMERIC_OBSERVATIONS")
    if receipt_path:
        Path(receipt_path).write_text(json.dumps(IPC_OBSERVATIONS, indent=2) + "\n")
    transport_path = os.environ.get("ATLAS_TEST_NUMERIC_TRANSPORT_OBSERVATIONS")
    if transport_path:
        Path(transport_path).write_text(json.dumps(TRANSPORT_OBSERVATIONS, indent=2) + "\n")
    raise SystemExit(not result.wasSuccessful())
