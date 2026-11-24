"""Adversarial engine checks. All completed work here is synthetic fixture work."""
from __future__ import annotations
import copy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "runtime"))
from excellence1728 import *
from excellence1728.runner import validate_measurement


def fixture_plan(source_sha):
    caps = []
    for w in range(1, 13):
        for c in range(1, 13):
            caps.append({"id": f"EX.W{w:02}.C{c:02}", "workstream_id": f"EX.W{w:02}", "title": f"Synthetic function {w}/{c}",
                         "objective": "Exercise the source-evidence state machine", "input_contract": ["Exact synthetic fixture"], "output_contract": ["Verified fixture result"],
                         "existing_targets": [{"source_id": "fixture-source", "path": "fixture.json"}], "proposed_targets": [],
                         "acceptance": ["Explicit host check passes"], "negative_cases": ["Tampered source is rejected"], "metrics": ["test correctness"], "dependencies": [], "write_resources": []})
    catalog = {"workstreams": [{"id": f"EX.W{i:02}"} for i in range(1, 13)], "capabilities": caps}
    phases = {"phases": [{"id": f"P{i:02}", "title": f"Fixture phase {i}", "depends_on": [] if i == 1 else [f"P{i-1:02}"], "action": "Check a fixture", "artifact": "Observed acceptance receipt", "acceptance_template": "The configured check succeeds", "mutates_sources": False} for i in range(1, 13)]}
    sources = {"sources": [{"id": "fixture-source", "sha256": source_sha}]}
    coverage = {"ariadne_source_sha256": source_sha, "ariadne_house_ids": [f"H{h:02}" for h in range(1, 13)],
                "ariadne_sphere_ids": [f"H{h:02}.S{s:02}" for h in range(1, 13) for s in range(1, 13)],
                "ariadne_node_ids": [f"H{h:02}.S{s:02}.N{n:02}" for h in range(1, 13) for s in range(1, 13) for n in range(1, 13)],
                "semantic_crosswalk_status": "SOURCE_REVIEW_REQUIRED", "ordinal_identity_implied": False}
    return compile_plan(catalog, phases, sources, coverage, canon_reference={"decision_id": "SYNTHETIC-TEST-ONLY"})


class EngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source_bytes = b'{"fixture": true}\n'
        cls.plan = fixture_plan(hashlib.sha256(cls.source_bytes).hexdigest())

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "fixture.json"
        self.source.write_bytes(self.source_bytes)
        self.artifact = self.root / "implementation.json"
        self.artifact.write_text('{"implemented":true}')
        self.task = "EX.W01.C01.P01"
        self.key = b"synthetic-local-receipt-key-only!!" * 2

    def runner(self, *, task=None, kind="json_parse", command=None, permissions=None, extra_artifacts=(), outcome=None):
        task = task or self.task
        checks = []
        for stage, suffix in (("IMPLEMENTED", "implementation"), ("VERIFIED", "verification"), ("INTEGRATED", "integration")):
            spec = {"id": task + ":" + suffix, "task_id": task, "stage": stage, "kind": kind,
                    "path": str(self.artifact), "artifacts": [str(self.artifact)] + [str(x) for x in extra_artifacts]}
            if outcome:
                spec.update(outcome=outcome, outcome_reason="Synthetic baseline already satisfies the declared fixture contract")
            if command is not None:
                spec.update(command=command, cwd=str(self.root), timeout_seconds=2, max_output_bytes=1024,
                            artifact_pins={raw: hashlib.sha256(Path(raw).read_bytes()).hexdigest() for raw in spec["artifacts"]})
            checks.append(spec)
        policy = {"schema": "atlas.excellence.runner-policy.v1", "plan_sha256": digest(self.plan), "allowed_roots": [str(self.root)], "source_paths": {"fixture-source": str(self.source)}, "checks": checks}
        if command is not None:
            policy["allowed_executables"] = {command[0]: hashlib.sha256(Path(command[0]).read_bytes()).hexdigest()}
        return AcceptanceRunner(self.plan, policy, expected_policy_sha256=digest(policy), receipt_key=self.key, current_permission=permissions)

    def complete(self, runner, ledger, task=None):
        task = task or self.task
        ledger.transition(task, "RUNNING")
        for stage in ("IMPLEMENTED", "VERIFIED"):
            ledger.transition(task, stage, receipt=runner.run(task, stage))

    def test_exact_dimensions_and_determinism(self):
        checked = validate_plan(self.plan)
        self.assertEqual((checked["tasks"], checked["capabilities"], checked["workstreams"]), (1728, 144, 12))
        self.assertEqual(digest(self.plan), digest(fixture_plan(hashlib.sha256(self.source_bytes).hexdigest())))
        self.assertEqual(checked["completed_tasks"], 0)

    def test_read_and_query_are_bounded_and_return_copies(self):
        task = read_task(self.plan, self.task)
        task["status"] = "VERIFIED"
        self.assertEqual(read_task(self.plan, self.task)["status"], "PLANNED")
        result = query_tasks(self.plan, "synthetic", workstream_id="EX.W01", phase_id="P01", limit=5)
        self.assertEqual(result["total"], 12)
        self.assertEqual(len(result["tasks"]), 5)
        self.assertEqual(result["next_offset"], 5)
        with self.assertRaises(ProgramError): query_tasks(self.plan, "", limit=1728)

    def test_nonfinite_and_duplicate_json_keys_rejected(self):
        for raw in ('{"a":NaN}', '{"a":1,"a":2}', '{"a":Infinity}'):
            with self.assertRaises(ProgramError): strict_loads(raw)
        with self.assertRaises(ProgramError): canonical_bytes({"a": float("inf")})

    def test_tampered_plan_hash_rejected(self):
        bad = copy.deepcopy(self.plan)
        bad["tasks"][0]["title"] = "Changed"
        with self.assertRaises(ProgramError): validate_plan(bad, expected_sha256=digest(self.plan))

    def test_cycle_and_unknown_dependency_rejected(self):
        for dep in ("EX.W01.C01.P12", "EX.W99.C99.P99"):
            bad = copy.deepcopy(self.plan)
            bad["tasks"][0]["depends_on"] = [dep]
            with self.assertRaises(ProgramError): validate_plan(bad)

    def test_status_string_cannot_complete_plan(self):
        bad = copy.deepcopy(self.plan)
        bad["tasks"][0]["status"] = "VERIFIED"
        with self.assertRaises(ProgramError): validate_plan(bad)

    def test_no_ordinal_semantic_identity(self):
        bad = copy.deepcopy(self.plan)
        bad["coverage"]["ordinal_identity_implied"] = True
        with self.assertRaises(ProgramError): validate_plan(bad)

    def test_one_third_work_budget_and_zero_macroturn_claim(self):
        batch = ready_tasks(self.plan, budget=WorkBudget(30, 0, 144))
        self.assertEqual(len(batch["task_ids"]), 10)
        self.assertEqual(batch["estimated_work_units"], 10)
        self.assertEqual(batch["genuine_macroturns_completed"], 0)
        self.assertIs(batch["host_execution_authorized"], False)
        with self.assertRaises(ProgramError): WorkBudget(30, 11)

    def test_conflicting_writes_are_not_cobatched(self):
        plan = copy.deepcopy(self.plan)
        plan["tasks"][0]["write_resources"] = ["project:shared.py"]
        plan["tasks"][12]["write_resources"] = ["project:shared.py"]
        batch = ready_tasks(plan, budget=WorkBudget(432, 0, 144))
        self.assertIn(self.task, batch["task_ids"])
        self.assertNotIn("EX.W01.C02.P01", batch["task_ids"])

    def test_unverified_dependency_is_blocked(self):
        runner = self.runner(task="EX.W01.C01.P02")
        ledger = EvidenceLedger(self.plan, runner)
        with self.assertRaises(ProgramError): ledger.transition("EX.W01.C01.P02", "RUNNING")

    def test_forged_receipt_and_wrong_stage_are_rejected(self):
        runner = self.runner()
        ledger = EvidenceLedger(self.plan, runner)
        ledger.transition(self.task, "RUNNING")
        evidence = runner.run(self.task, "IMPLEMENTED")
        bad = copy.deepcopy(evidence)
        bad["payload"]["passed"] = False
        with self.assertRaises(ProgramError): ledger.transition(self.task, "IMPLEMENTED", receipt=bad)
        with self.assertRaises(ProgramError): ledger.transition(self.task, "IMPLEMENTED", receipt=runner.run(self.task, "VERIFIED"))

    def test_duck_typed_and_subclass_runners_rejected(self):
        class Fake:
            plan_sha256 = digest(self.plan)
            def verify(self, *a): return {"passed": True}
        with self.assertRaises(ProgramError): EvidenceLedger(self.plan, Fake())
        class SubRunner(AcceptanceRunner): pass
        real = self.runner()
        fake = object.__new__(SubRunner)
        fake._plan_sha = real.plan_sha256
        with self.assertRaises(ProgramError): EvidenceLedger(self.plan, fake)

    def test_missing_host_check_does_not_complete_work(self):
        policy = {"schema": "atlas.excellence.runner-policy.v1", "plan_sha256": digest(self.plan), "allowed_roots": [str(self.root)], "source_paths": {"fixture-source": str(self.source)}, "checks": []}
        runner = AcceptanceRunner(self.plan, policy, expected_policy_sha256=digest(policy), receipt_key=self.key)
        with self.assertRaises(ProgramError): runner.run(self.task, "IMPLEMENTED")

    def test_policy_mutation_after_construction_has_no_effect(self):
        runner = self.runner()
        returned = runner._policy()
        returned["source_paths"]["fixture-source"] = "/etc/passwd"
        self.assertTrue(runner.run(self.task, "IMPLEMENTED")["payload"]["passed"])

    def test_source_tampering_prevents_acceptance(self):
        runner = self.runner()
        self.source.write_text("changed")
        with self.assertRaises(ProgramError): runner.run(self.task, "IMPLEMENTED")

    def test_artifact_changes_invalidate_completed_work_and_descendants(self):
        runner = self.runner()
        ledger = EvidenceLedger(self.plan, runner)
        self.complete(runner, ledger)
        self.assertEqual(ledger.snapshot()["verified_tasks"], 1)
        self.artifact.write_text('{"implemented":false}')
        snap = ledger.snapshot()
        self.assertEqual(snap["states"][self.task], "INVALIDATED")
        self.assertEqual(snap["states"]["EX.W01.C01.P12"], "INVALIDATED")
        self.assertEqual(snap["verified_tasks"], 0)

    def test_source_change_invalidates_affected_work(self):
        runner = self.runner()
        ledger = EvidenceLedger(self.plan, runner)
        affected = ledger.notify_source_change("fixture-source", "0" * 64)
        self.assertEqual(len(affected), 1728)

    def test_ledger_snapshot_mutation_cannot_forge_states(self):
        ledger = EvidenceLedger(self.plan, self.runner())
        snap = ledger.snapshot()
        snap["states"][self.task] = "VERIFIED"
        self.assertEqual(ledger.snapshot()["verified_tasks"], 0)

    def test_export_restore_requires_matching_checkpoint_and_key(self):
        runner = self.runner()
        ledger = EvidenceLedger(self.plan, runner)
        self.complete(runner, ledger)
        exported = ledger.export()
        restored = EvidenceLedger.restore(self.plan, runner, exported, expected_export_sha256=exported["export_sha256"])
        self.assertEqual(restored.snapshot()["verified_tasks"], 1)
        with self.assertRaises(ProgramError): EvidenceLedger.restore(self.plan, runner, exported, expected_export_sha256="0" * 64)
        altered = copy.deepcopy(exported)
        altered["events"][0]["payload"]["state"] = "VERIFIED"
        body = {k: v for k, v in altered.items() if k != "export_sha256"}
        altered["export_sha256"] = digest(body)
        with self.assertRaises(ProgramError): EvidenceLedger.restore(self.plan, runner, altered, expected_export_sha256=altered["export_sha256"])

    def test_command_output_and_timeout_are_bounded(self):
        for command in ([sys.executable, "-c", "print('x'*2000)"], [sys.executable, "-c", "import time; time.sleep(3)"]):
            runner = self.runner(kind="command", command=command)
            with self.assertRaises(ProgramError): runner.run(self.task, "IMPLEMENTED")

    def test_failed_check_does_not_advance_state(self):
        runner = self.runner(kind="command", command=[sys.executable, "-c", "raise SystemExit(1)"])
        ledger = EvidenceLedger(self.plan, runner)
        ledger.transition(self.task, "RUNNING")
        receipt = runner.run(self.task, "IMPLEMENTED")
        self.assertIs(receipt["payload"]["passed"], False)
        with self.assertRaises(ProgramError): ledger.transition(self.task, "IMPLEMENTED", receipt=receipt)

    def test_artifact_changed_by_command_cannot_inherit_test_result(self):
        command = [sys.executable, "-c", "from pathlib import Path; Path('implementation.json').write_text('{}')"]
        runner = self.runner(kind="command", command=command)
        with self.assertRaises(ProgramError): runner.run(self.task, "IMPLEMENTED")

    def test_command_script_must_be_explicitly_pinned(self):
        script = self.root / "check.py"
        script.write_text("raise SystemExit(0)\n")
        with self.assertRaises(ProgramError): self.runner(kind="command", command=[sys.executable, str(script)])
        runner = self.runner(kind="command", command=[sys.executable, str(script)], extra_artifacts=[script])
        receipt = runner.run(self.task, "IMPLEMENTED")
        self.assertTrue(runner.verify(receipt, self.task, "IMPLEMENTED")["passed"])
        script.write_text("raise SystemExit(1)\n")
        with self.assertRaises(ProgramError): runner.verify(receipt, self.task, "IMPLEMENTED")

    def test_no_change_required_can_complete_evidenced_step_without_gain(self):
        runner = self.runner(outcome="NO_CHANGE_REQUIRED")
        ledger = EvidenceLedger(self.plan, runner)
        self.complete(runner, ledger)
        receipt = review_perspective(self.plan, ledger, "H01.S01", [self.task])
        report = aggregate_meta145(self.plan, ledger, [receipt])
        self.assertEqual(report["verified_steps"], 1)
        self.assertEqual(report["compatible_gain_candidate_tasks"], [])
        self.assertEqual(report["unmeasured_tasks"], [self.task])
        self.assertEqual(report["documented_no_gain_tasks"], [self.task])

    def test_incompatible_metrics_stay_separate_and_regressions_remain(self):
        common = {"metric": "retrieval_latency", "direction": "lower", "baseline": 10, "candidate": 8,
                  "statistic": "median", "workload_sha256": "a" * 64, "environment_sha256": "b" * 64,
                  "repetitions": 3, "scope": "synthetic_only"}
        rows = [{**common, "unit": "milliseconds"}, {**common, "unit": "seconds", "candidate": 12}]
        command = [sys.executable, "-c", "print(" + repr(json.dumps({"measurements": rows})) + ")"]
        runner = self.runner(kind="benchmark_command", command=command)
        ledger = EvidenceLedger(self.plan, runner)
        self.complete(runner, ledger)
        perspective = review_perspective(self.plan, ledger, "H01.S01", [self.task])
        result = aggregate_meta145(self.plan, ledger, [perspective])
        self.assertEqual(len(result["measurement_groups"]), 2)
        improvements = [x["improved"] for g in result["measurement_groups"] for x in g["observations"]]
        self.assertIn(False, improvements)
        self.assertIs(result["speedups_multiplied"], False)
        self.assertIn(self.task, result["regressed_tasks"])
        self.assertNotIn(self.task, result["compatible_gain_candidate_tasks"])

    def test_invalid_measurement_does_not_become_a_gain(self):
        row = {"metric": "latency", "unit": "ms", "direction": "lower", "baseline": 1, "candidate": 0.1,
               "statistic": "median", "workload_sha256": "a" * 64, "environment_sha256": "b" * 64,
               "repetitions": 1, "scope": "synthetic_only"}
        with self.assertRaises(ProgramError): validate_measurement(row)
        row["repetitions"] = 3
        row["candidate"] = float("nan")
        with self.assertRaises(ProgramError): validate_measurement(row)

    def test_permission_revoked_during_acceptance_is_rechecked(self):
        calls = []
        def permission(context):
            calls.append(context)
            return len(calls) == 1
        runner = self.runner(permissions=permission)
        with self.assertRaises(ProgramError): runner.run(self.task, "IMPLEMENTED")
        self.assertEqual(len(calls), 2)

    def test_planned_meta145_keeps_all_work_pending(self):
        result = aggregate_meta145(self.plan)
        self.assertEqual(len(result["perspectives"]), 144)
        self.assertEqual(len(result["house_coverage"]), 12)
        self.assertEqual(result["verified_steps"], 0)
        self.assertEqual(result["build_ordinal"], 145)
        self.assertIs(result["canon_mutated"], False)
        self.assertIs(result["global_speedup_claimed"], False)

    def test_unverified_and_duplicate_perspectives_rejected(self):
        runner = self.runner()
        ledger = EvidenceLedger(self.plan, runner)
        with self.assertRaises(ProgramError): review_perspective(self.plan, ledger, "H01.S01", [self.task])
        self.complete(runner, ledger)
        receipt = review_perspective(self.plan, ledger, "H01.S01", [self.task])
        result = aggregate_meta145(self.plan, ledger, [receipt])
        self.assertEqual(result["accepted_perspectives"], 1)
        self.assertEqual(result["status"], "PARTIAL_OR_PLANNED")
        with self.assertRaises(ProgramError): aggregate_meta145(self.plan, ledger, [receipt, receipt])

    def test_stale_perspective_checkpoint_rejected(self):
        runner = self.runner()
        ledger = EvidenceLedger(self.plan, runner)
        self.complete(runner, ledger)
        receipt = review_perspective(self.plan, ledger, "H01.S01", [self.task])
        ledger.transition(self.task, "INTEGRATED", receipt=runner.run(self.task, "INTEGRATED"))
        with self.assertRaises(ProgramError): aggregate_meta145(self.plan, ledger, [receipt])

    def test_all_spheres_reviewing_one_task_do_not_complete_coverage(self):
        runner = self.runner()
        ledger = EvidenceLedger(self.plan, runner)
        self.complete(runner, ledger)
        # Issue one genuine local receipt per source Sphere over the same task.
        receipts = []
        first = review_perspective(self.plan, ledger, "H01.S01", [self.task])
        for sphere in self.plan["coverage"]["ariadne_sphere_ids"]:
            payload = copy.deepcopy(first["payload"])
            payload["sphere_id"] = sphere
            receipts.append(runner._seal(payload))
        # Inject a complete ledger-state fixture only at the read boundary; the
        # real sealed perspective set still covers exactly one source task.
        with patch.object(EvidenceLedger, "snapshot", return_value={"states": {t["id"]: "VERIFIED" for t in self.plan["tasks"]}}):
            result = aggregate_meta145(self.plan, ledger, receipts)
        self.assertEqual(result["verified_steps"], 1728)
        self.assertEqual(result["accepted_perspectives"], 144)
        self.assertEqual(result["reviewed_task_union_count"], 1)
        self.assertEqual(len(result["unreviewed_task_ids"]), 1727)
        self.assertEqual(result["status"], "PARTIAL_OR_PLANNED")
        self.assertEqual(result["compatible_gain_candidate_tasks"], [])
        self.assertEqual(result["unmeasured_tasks"], [self.task])


class MemoryTests(unittest.TestCase):
    def setUp(self):
        self.context = {"input_sha256": "1" * 64, "implementation_sha256": "2" * 64, "policy_sha256": "3" * 64, "source_pins": {"source": "4" * 64}, "scope": "SYNTHETIC-TEST-ONLY"}
        self.live = copy.deepcopy(self.context)
        self.allowed = True
        self.calls = []
        def permission(ctx, op):
            self.calls.append(op)
            return self.allowed
        self.memory = FunctionalMemory(receipt_key=b"synthetic-only-memory-key-32-bytes!!", current_permission=permission, current_context=lambda c: self.live)

    def test_reuse_and_copy_isolation(self):
        self.memory.put(self.context, {"answer": [1, 2]})
        first = self.memory.get(self.context)
        first["value"]["answer"].append(999)
        self.assertEqual(self.memory.get(self.context)["value"], {"answer": [1, 2]})
        self.assertEqual(self.calls[-2:], ["read_start", "read_return"])

    def test_permissions_never_cached(self):
        self.memory.put(self.context, "cached")
        self.allowed = False
        with self.assertRaises(ProgramError): self.memory.get(self.context)

    def test_return_revocation_blocks_cached_value(self):
        self.memory.put(self.context, "cached")
        self.memory._current_permission = lambda c, op: op != "read_return"
        with self.assertRaises(ProgramError): self.memory.get(self.context)

    def test_source_and_implementation_staleness_rejected(self):
        self.memory.put(self.context, "cached")
        self.live["source_pins"]["source"] = "5" * 64
        with self.assertRaises(ProgramError): self.memory.get(self.context)
        self.live = copy.deepcopy(self.context)
        self.live["implementation_sha256"] = "6" * 64
        with self.assertRaises(ProgramError): self.memory.get(self.context)

    def test_tampered_payload_rejected(self):
        stored = self.memory.put(self.context, "cached")
        raw, tag = self.memory._entries[stored["key"]]
        self.memory._entries[stored["key"]] = (raw.replace(b'cached', b'forged'), tag)
        with self.assertRaises(ProgramError): self.memory.get(self.context)

    def test_source_invalidation_and_miss(self):
        self.memory.put(self.context, "cached")
        self.assertEqual(self.memory.invalidate_source("source")["count"], 1)
        self.assertIs(self.memory.get(self.context)["hit"], False)


if __name__ == "__main__":
    unittest.main(verbosity=2)
