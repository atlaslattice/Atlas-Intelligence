"""Synthetic adversarial regressions; these cases are not campaign visits."""
import concurrent.futures
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

from engine.circuit import (
    CircuitError, HOUSES, SPHERES, NODES, ZERO_HASH, append_visit, build_circuit,
    create_ledger, next_batch, validate_registry, verify_ledger,
)


def canonical_digest(value):
    data = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(data.encode()).hexdigest()


def fixture():
    registry = {"edition": "SYNTHETIC_TEST_FIXTURE", "sourceSha256": "0" * 64,
                "houses": [], "spheres": [], "nodes": []}
    original = {"houses": {}, "spheres": {}, "nodes": {}}
    for house in HOUSES:
        registry["houses"].append({"id": house, "name": "Fixture " + house})
        original["houses"][house] = {"id": house, "name": "Fixture " + house}
    for sphere in SPHERES:
        role = "DOMAIN" if int(sphere[5:7]) <= 7 else "META"
        registry["spheres"].append({"id": sphere, "name": "Fixture " + sphere,
                                    "houseId": sphere[:3], "role": role})
        original["spheres"][sphere] = {"id": sphere, "name": "Fixture " + sphere,
                                        "parent": sphere[:3]}
    for node in NODES:
        role = "DOMAIN" if int(node[5:7]) <= 7 else "META"
        row = {"id": node, "name": "Fixture " + node, "houseId": node[:3],
               "sphereId": node[:7], "role": role, "definition": "A synthetic scope for " + node,
               "includes": "Synthetic fixture", "excludes": "Real-world claims"}
        registry["nodes"].append(row)
        original["nodes"][node] = {
            "id": node, "name": row["name"], "definition": row["definition"],
            "includes": row["includes"], "excludes": row["excludes"],
            "parent": node[:7], "kind": "DOMAIN_SPECIALIZATION" if role == "DOMAIN" else "EPISTEMIC_META",
        }
    raw = json.dumps(original, ensure_ascii=False).encode()
    registry["sourceSha256"] = hashlib.sha256(raw).hexdigest()
    lenses = {"spheres": [{"id": key, "question": "Test scope " + key,
                           "checks": ["Keep exact fixture scope"], "mode": "WORK"} for key in SPHERES],
              "houses": [{"id": key, "question": "Test House " + key,
                          "checks": ["Keep dissent separate"], "mode": "WORK"} for key in HOUSES]}
    return registry, lenses, raw


class CircuitTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="cupwake-engine-tests-")
        cls.base = Path(cls.temp.name)
        cls.registry, cls.lenses, cls.raw = fixture()
        cls.kwargs = {"expected_source_sha256": cls.registry["sourceSha256"],
                      "expected_edition": cls.registry["edition"], "original_source_bytes": cls.raw}
        cls.result = build_circuit(cls.registry, cls.lenses, cls.base / "compiled", **cls.kwargs)
        cls.plan_path = cls.base / "compiled" / "macroturn_plan.json"
        cls.plan = json.loads(cls.plan_path.read_text())

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def setUp(self):
        self.case = tempfile.TemporaryDirectory(dir=self.base)
        self.case_path = Path(self.case.name)

    def tearDown(self):
        self.case.cleanup()

    def reject(self, code, function, *args, **kwargs):
        with self.assertRaises(CircuitError) as caught:
            function(*args, **kwargs)
        self.assertEqual(caught.exception.code, code)

    def build(self, registry=None, lenses=None, **kwargs):
        return build_circuit(registry or self.registry, lenses or self.lenses,
                             self.case_path / "build", **dict(self.kwargs, **kwargs))

    def new_ledger(self, plan_path=None):
        path = self.case_path / "ledger.json"
        create_ledger(plan_path or self.plan_path, path)
        return path

    def report(self, *, visit="test-visit-1", event="test-event-1", outcome="SOURCE_TESTED", tickets=None, plan=None):
        plan = plan or self.plan
        return {"eventId": event, "visitId": visit, "timestamp": "2026-11-23T22:00:00Z",
                "outcome": outcome, "ticketIds": tickets if tickets is not None else ["CW-H01.S01.N01"],
                "evidenceRefs": ["https://example.invalid/synthetic-test-evidence/" + event],
                "artifactDigests": ["a" * 64] if outcome in {"SOURCE_TESTED", "IMPLEMENTED_LOCAL"} else [],
                "testCasesExecuted": 19 if outcome in {"SOURCE_TESTED", "IMPLEMENTED_LOCAL"} else 0,
                "reason": "Synthetic test-only report; no real campaign activity.",
                "sourceSha256": plan["sourceSha256"], "planDigest": plan["planDigest"]}

    def put(self, path, value):
        path.write_text(json.dumps(value))

    def derived_plan(self, mutate):
        plan = deepcopy(self.plan)
        mutate(plan)
        plan["ticketsDigest"] = canonical_digest(plan["tickets"])
        plan["manifestCore"]["ticketsDigest"] = plan["ticketsDigest"]
        plan["planDigest"] = canonical_digest(plan["manifestCore"])
        path = self.case_path / "derived-plan.json"
        self.put(path, plan)
        return path, plan

    def test_full_cross_product_has_exact_per_lens_and_per_node_coverage(self):
        with sqlite3.connect(self.base / "compiled" / "circuit.sqlite") as db:
            self.assertEqual(dict(db.execute("SELECT kind,count(*) FROM review_candidates GROUP BY kind")),
                             {"sphere": 248832, "house": 20736})
            self.assertEqual(db.execute("SELECT count(*) FROM (SELECT kind,lens_id,count(*) n FROM review_candidates GROUP BY kind,lens_id HAVING n != 1728)").fetchone()[0], 0)
            self.assertEqual(db.execute("SELECT count(*) FROM (SELECT node_id,count(*) n FROM review_candidates GROUP BY node_id HAVING n != 156)").fetchone()[0], 0)
            self.assertEqual(db.execute("SELECT count(*) FROM tickets").fetchone()[0], 1728)

    def test_source_roles_and_candidate_status_do_not_promote_semantics(self):
        with sqlite3.connect(self.base / "compiled" / "circuit.sqlite") as db:
            self.assertEqual(dict(db.execute("SELECT role,count(*) FROM source_nodes GROUP BY role")), {"DOMAIN": 1008, "META": 720})
            self.assertEqual(db.execute("SELECT DISTINCT semantic_status FROM review_candidates").fetchall(), [("CANDIDATE_NEEDS_REVIEW",)])
            same = db.execute("SELECT structural_relation,node_role,lens_role,same_sphere,same_house,checks_json FROM review_candidates WHERE kind='sphere' AND lens_id='H01.S08' AND node_id='H01.S08.N01'").fetchone()
            self.assertEqual(same[:5], ("OWN_SPHERE", "META", "META", 1, 1))
            self.assertFalse(json.loads(same[5])["semanticEquivalenceEstablished"])
            self.assertTrue(json.loads(same[5])["originalSourceBytesMatched"])

    def test_old_seven_domain_nodes_per_sphere_rule_rejected_despite_same_totals(self):
        bad = deepcopy(self.registry)
        for node in bad["nodes"]:
            node["role"] = "DOMAIN" if int(node["id"][-2:]) <= 7 else "META"
        self.assertEqual(sum(n["role"] == "DOMAIN" for n in bad["nodes"]), 1008)
        self.reject("NODE_ROLE_NOT_SPHERE_ROLE", validate_registry, bad, **self.kwargs)

    def test_duplicate_node_is_rejected(self):
        bad = deepcopy(self.registry)
        bad["nodes"][-1] = bad["nodes"][0]
        self.reject("NODE_DUPLICATE", validate_registry, bad, **self.kwargs)

    def test_missing_node_is_rejected(self):
        bad = deepcopy(self.registry)
        bad["nodes"].pop()
        self.reject("NODE_COUNT", validate_registry, bad, **self.kwargs)

    def test_parent_scope_substitution_is_rejected(self):
        bad = deepcopy(self.registry)
        bad["nodes"][0]["sphereId"] = "H02.S01"
        self.reject("NODE_SPHERE", validate_registry, bad, **self.kwargs)

    def test_original_bytes_drift_is_rejected(self):
        self.reject("ORIGINAL_BYTES_DIGEST_DRIFT", validate_registry, self.registry,
                    **dict(self.kwargs, original_source_bytes=self.raw + b" "))

    def test_definition_drift_is_rejected_even_with_correct_source_pin(self):
        bad = deepcopy(self.registry)
        bad["nodes"][0]["definition"] = "Changed meaning"
        self.reject("ORIGINAL_SOURCE_DEFINITION_DRIFT", validate_registry, bad, **self.kwargs)

    def test_exclusion_drift_is_rejected_even_when_definition_stays_identical(self):
        bad = deepcopy(self.registry)
        bad["nodes"][0]["excludes"] = "Nothing excluded"
        self.reject("ORIGINAL_SOURCE_SCOPE_FIELD_DRIFT", validate_registry, bad, **self.kwargs)

    def test_source_edition_and_digest_are_independently_required(self):
        bad = deepcopy(self.registry)
        bad["edition"] = "OTHER_EDITION"
        self.reject("EDITION_DRIFT", validate_registry, bad, **self.kwargs)
        bad = deepcopy(self.registry)
        bad["sourceSha256"] = "b" * 64
        self.reject("SOURCE_DIGEST_DRIFT", validate_registry, bad, **self.kwargs)

    def test_missing_sphere_lens_rejects_before_output_creation(self):
        bad = deepcopy(self.lenses)
        bad["spheres"].pop()
        self.reject("LENS_SPHERES_COUNT", self.build, lenses=bad)
        self.assertFalse((self.case_path / "build" / "circuit.sqlite").exists())

    def test_private_mode_source_is_rejected(self):
        bad = deepcopy(self.lenses)
        bad["spheres"][0]["mode"] = "IMAGINE"
        self.reject("NON_WORK_SOURCE", self.build, lenses=bad)

    def test_private_body_is_rejected(self):
        bad = deepcopy(self.lenses)
        bad["spheres"][0]["privateBody"] = "Must not be ingested"
        self.reject("PROTECTED_OR_AUTHORITY_FIELD", self.build, lenses=bad)

    def test_public_proposal_mode_metadata_does_not_authorize_private_mode(self):
        from engine.circuit import _validate_lenses
        good = deepcopy(self.lenses)
        good["spheres"][0]["referenceProposal"] = {"suggestedMode": "PLAY", "status": "PROPOSED_NOT_IMPLEMENTED"}
        self.assertEqual(len(_validate_lenses(good)["spheres"]), 144)
        self.assertEqual(good["spheres"][0]["mode"], "WORK")

    def test_false_authority_field_rejected(self):
        bad = deepcopy(self.lenses)
        bad["spheres"][0]["ratified"] = True
        self.reject("PROTECTED_OR_AUTHORITY_FIELD", self.build, lenses=bad)

    def test_output_is_never_silently_overwritten(self):
        self.reject("OUTPUT_ALREADY_EXISTS", build_circuit, self.registry, self.lenses,
                    self.base / "compiled", **self.kwargs)

    def test_mutually_dependent_tickets_rejected(self):
        override = [{"nodeId": node, "dependencies": []} for node in NODES]
        override[0]["dependencies"] = [NODES[1]]
        override[1]["dependencies"] = [NODES[0]]
        self.reject("TICKET_DEPENDENCY_CYCLE", self.build, ticket_overrides=override)

    def test_tickets_cannot_arrive_already_implemented(self):
        override = [{"nodeId": node} for node in NODES]
        override[0]["status"] = "COMPLETED"
        self.reject("TICKET_FALSE_COMPLETION", self.build, ticket_overrides=override)

    def test_ticket_override_cannot_attach_false_source_fields_to_authentic_digest(self):
        for key, forged in (("sourceDefinition", "FORGED"), ("sourceRole", "FORGED"),
                            ("sourceSha256", "b" * 64), ("sourceIncludes", "FORGED"),
                            ("sourceExcludes", "FORGED"), ("sourcePointer", "/nodes/H02.S01.N01")):
            with self.subTest(field=key):
                override = [{"nodeId": node} for node in NODES]
                override[0][key] = forged
                self.reject("TICKET_SOURCE_FIELD_DRIFT", self.build, ticket_overrides=override)

    def test_new_ledger_has_no_actual_or_hosted_completion(self):
        ledger = json.loads(self.new_ledger().read_text())
        self.assertEqual(ledger["summary"]["recordedVisits"], 0)
        self.assertEqual(ledger["summary"]["hostVerifiedUpdates"], 0)
        self.assertEqual(ledger["summary"]["reportedLocalImplementations"], 0)

    def test_blocked_visit_records_a_block_without_completion_credit(self):
        path = self.new_ledger()
        result = append_visit(path, self.plan_path, self.report(outcome="BLOCKED"), expected_head=ZERO_HASH)
        self.assertEqual(result["summary"]["recordedVisits"], 1)
        self.assertEqual(result["summary"]["blockedVisits"], 1)
        self.assertEqual(result["summary"]["reportedLocalImplementations"], 0)

    def test_exact_event_retry_does_not_increment_count(self):
        path = self.new_ledger()
        report = self.report()
        first = append_visit(path, self.plan_path, report, expected_head=ZERO_HASH)
        before = path.read_bytes()
        retry = append_visit(path, self.plan_path, report, expected_head=ZERO_HASH)
        self.assertEqual(retry["status"], "IDEMPOTENT_REPLAY")
        self.assertEqual(first["head"], retry["head"])
        self.assertEqual(path.read_bytes(), before)

    def test_reused_event_with_changed_body_is_rejected(self):
        path = self.new_ledger()
        report = self.report()
        append_visit(path, self.plan_path, report, expected_head=ZERO_HASH)
        report["reason"] = "Different report under same event"
        self.reject("EVENT_ID_CONFLICT", append_visit, path, self.plan_path, report, expected_head=ZERO_HASH)

    def test_visit_cannot_be_counted_again_under_another_event(self):
        path = self.new_ledger()
        first = append_visit(path, self.plan_path, self.report(), expected_head=ZERO_HASH)
        self.reject("VISIT_ID_CONFLICT", append_visit, path, self.plan_path,
                    self.report(event="other-event"), expected_head=first["head"])

    def test_stale_head_rejected(self):
        path = self.new_ledger()
        append_visit(path, self.plan_path, self.report(), expected_head=ZERO_HASH)
        self.reject("STALE_LEDGER_HEAD", append_visit, path, self.plan_path,
                    self.report(visit="other-visit", event="other-event"), expected_head=ZERO_HASH)

    def test_large_test_count_is_not_a_large_visit_count(self):
        path = self.new_ledger()
        report = self.report()
        report["testCasesExecuted"] = 269568
        result = append_visit(path, self.plan_path, report, expected_head=ZERO_HASH)
        self.assertEqual(result["summary"]["recordedVisits"], 1)
        self.assertEqual(result["summary"]["reportedTestCases"], 269568)
        self.assertEqual(result["summary"]["hostAttestedVisits"], 0)

    def test_visit_source_substitution_rejected(self):
        path = self.new_ledger()
        report = self.report()
        report["sourceSha256"] = "b" * 64
        self.reject("VISIT_SOURCE_DRIFT", append_visit, path, self.plan_path, report, expected_head=ZERO_HASH)

    def test_visit_cannot_supply_fake_host_or_private_activity_fields(self):
        for key, value in (("hostVerifiedUpdates", 1), ("quietReceipt", "something")):
            path = self.case_path / (key + ".json")
            create_ledger(self.plan_path, path)
            report = self.report()
            report[key] = value
            self.reject("VISIT_FIELDS", append_visit, path, self.plan_path, report, expected_head=ZERO_HASH)

    def test_implementation_requires_test_and_artifact_evidence(self):
        path = self.new_ledger()
        report = self.report(outcome="IMPLEMENTED_LOCAL")
        report["artifactDigests"] = []
        self.reject("VISIT_IMPLEMENTATION_EVIDENCE_REQUIRED", append_visit, path, self.plan_path, report, expected_head=ZERO_HASH)

    def test_implementation_report_never_becomes_hosted_acceptance(self):
        path = self.new_ledger()
        result = append_visit(path, self.plan_path, self.report(outcome="IMPLEMENTED_LOCAL"), expected_head=ZERO_HASH)
        self.assertEqual(result["summary"]["reportedLocalImplementations"], 1)
        self.assertEqual(result["summary"]["hostVerifiedUpdates"], 0)
        self.assertEqual(result["summary"]["semanticallyAcceptedRelationships"], 0)

    def test_same_ticket_cannot_inflate_implementation_count(self):
        path = self.new_ledger()
        first = append_visit(path, self.plan_path, self.report(outcome="IMPLEMENTED_LOCAL"), expected_head=ZERO_HASH)
        report = self.report(visit="second-visit", event="second-event", outcome="IMPLEMENTED_LOCAL")
        self.reject("LEDGER_DUPLICATE_IMPLEMENTATION", append_visit, path, self.plan_path, report, expected_head=first["head"])
        self.assertEqual(verify_ledger(path, self.plan_path)["summary"]["recordedVisits"], 1)

    def test_same_evidence_cannot_be_renamed_into_another_implementation(self):
        path = self.new_ledger()
        report = self.report(outcome="IMPLEMENTED_LOCAL")
        first = append_visit(path, self.plan_path, report, expected_head=ZERO_HASH)
        copied = deepcopy(report)
        copied.update(eventId="renamed-event", visitId="renamed-visit", ticketIds=["CW-H01.S01.N02"])
        self.reject("LEDGER_REUSED_IMPLEMENTATION_EVIDENCE", append_visit, path, self.plan_path,
                    copied, expected_head=first["head"])
        self.assertEqual(verify_ledger(path, self.plan_path)["summary"]["reportedImplementedTickets"], 1)

    def test_one_evidence_bundle_can_explicitly_cover_multiple_tickets_once(self):
        path = self.new_ledger()
        report = self.report(outcome="IMPLEMENTED_LOCAL", tickets=["CW-H01.S01.N01", "CW-H01.S01.N02"])
        result = append_visit(path, self.plan_path, report, expected_head=ZERO_HASH)
        self.assertEqual(result["summary"]["reportedImplementedTickets"], 2)
        self.assertEqual(result["summary"]["distinctImplementationEvidenceBundles"], 1)
        self.assertEqual(result["summary"]["recordedVisits"], 1)

    def test_stored_counter_promotion_is_detected(self):
        path = self.new_ledger()
        value = json.loads(path.read_text())
        value["summary"]["hostVerifiedUpdates"] = 1
        self.put(path, value)
        self.reject("LEDGER_COUNT_PROMOTION", verify_ledger, path, self.plan_path)

    def test_changed_old_report_breaks_hash_chain(self):
        path = self.new_ledger()
        append_visit(path, self.plan_path, self.report(), expected_head=ZERO_HASH)
        value = json.loads(path.read_text())
        value["events"][0]["report"]["reason"] = "Tampered historical report"
        self.put(path, value)
        self.reject("LEDGER_HASH_MISMATCH", verify_ledger, path, self.plan_path)

    def test_ticket_change_cannot_preserve_old_plan_digest(self):
        plan = deepcopy(self.plan)
        plan["tickets"][0]["title"] = "Silent new plan"
        plan["ticketsDigest"] = canonical_digest(plan["tickets"])
        path = self.case_path / "changed-plan.json"
        self.put(path, plan)
        self.reject("PLAN_MANIFEST_BINDING", create_ledger, path, self.case_path / "ledger.json")

    def test_dependencies_need_prior_completion_not_same_report(self):
        def change(plan):
            plan["tickets"][1]["dependencies"] = [NODES[0]]
        plan_path, plan = self.derived_plan(change)
        path = self.new_ledger(plan_path)
        result = next_batch(plan_path, path, limit=3)
        self.assertNotIn("CW-" + NODES[1], [row["ticketId"] for row in result["tickets"]])
        report = self.report(outcome="IMPLEMENTED_LOCAL", tickets=["CW-" + NODES[0], "CW-" + NODES[1]], plan=plan)
        self.reject("LEDGER_DEPENDENCY_NOT_COMPLETED", append_visit, path, plan_path, report, expected_head=ZERO_HASH)
        first = append_visit(path, plan_path, self.report(outcome="IMPLEMENTED_LOCAL", plan=plan), expected_head=ZERO_HASH)
        second = self.report(visit="second-visit", event="second-event", outcome="IMPLEMENTED_LOCAL", tickets=["CW-" + NODES[1]], plan=plan)
        result = append_visit(path, plan_path, second, expected_head=first["head"])
        self.assertEqual(result["summary"]["reportedLocalImplementations"], 2)

    def test_next_batch_is_bounded_and_nonexecuting(self):
        path = self.new_ledger()
        before = path.read_bytes()
        result = next_batch(self.plan_path, path, limit=96)
        self.assertEqual(len(result["tickets"]), 96)
        self.assertEqual(path.read_bytes(), before)
        self.reject("BATCH_LIMIT", next_batch, self.plan_path, path, limit=97)
        self.reject("BATCH_LIMIT", next_batch, self.plan_path, path, limit=True)

    def test_equal_nonwork_windows_cannot_be_reallocated(self):
        plan = deepcopy(self.plan)
        plan["activityWindows"][1]["kind"] = "WORK"
        path = self.case_path / "bad-window-plan.json"
        self.put(path, plan)
        self.reject("PLAN_WINDOW_DRIFT", create_ledger, path, self.case_path / "ledger.json")

    def test_concurrent_writers_cannot_both_commit_same_head(self):
        path = self.new_ledger()
        def run(i):
            try:
                return append_visit(path, self.plan_path,
                    self.report(visit=f"concurrent-visit-{i}", event=f"concurrent-event-{i}"), expected_head=ZERO_HASH)["status"]
            except CircuitError as error:
                return error.code
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(run, [1, 2]))
        self.assertEqual(sorted(results), ["RECORDED_SELF_REPORT", "STALE_LEDGER_HEAD"])
        self.assertEqual(verify_ledger(path, self.plan_path)["summary"]["recordedVisits"], 1)

    def test_non_string_outcome_is_controlled_rejection(self):
        path = self.new_ledger()
        report = self.report()
        report["outcome"] = []
        self.reject("VISIT_OUTCOME", append_visit, path, self.plan_path, report, expected_head=ZERO_HASH)

    def test_more_than_1728_declared_visits_rejected(self):
        path = self.new_ledger()
        value = json.loads(path.read_text())
        value["events"] = [{}] * 1729
        self.put(path, value)
        self.reject("LEDGER_VISIT_LIMIT", verify_ledger, path, self.plan_path)


if __name__ == "__main__":
    unittest.main(verbosity=2)
