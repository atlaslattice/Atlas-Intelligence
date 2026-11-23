"""Public-safe synthetic regressions. No original Ariadne titles or bodies.

Tests patch module trust constants ONLY inside the fixture harness. Production
has no caller-provided pin override, and a separate test verifies that the real
production pin rejects these synthetic bytes. These are computational tests,
not resident visits, semantic approvals or delivery receipts.
"""
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import shutil
import sqlite3
import struct
import tempfile
import unittest
from unittest.mock import patch

import evolution.engine as module
from evolution.engine import EvolutionEngine, EvolutionError, PASS_NAMES, canonical, digest
from engine.circuit import HOUSES, SPHERES, NODES

PRODUCTION_PIN = module.SOURCE_SHA256
PRODUCTION_CATALOG_PIN = module.CATALOG_SHA256
PRODUCTION_EDITION = module.SOURCE_EDITION


def fixture():
    edition = "SYNTHETIC_EVOLUTION_FIXTURE_ONLY"
    registry = {"edition": edition, "sourceSha256": "0" * 64, "houses": [], "spheres": [], "nodes": []}
    original = {"houses": {}, "spheres": {}, "nodes": {}}
    for house in HOUSES:
        row = {"id": house, "name": "Synthetic fixture " + house}
        registry["houses"].append(row)
        original["houses"][house] = row.copy()
    for sphere in SPHERES:
        role = "DOMAIN" if int(sphere[5:7]) <= 7 else "META"
        row = {"id": sphere, "name": "Synthetic fixture " + sphere, "houseId": sphere[:3], "role": role}
        registry["spheres"].append(row)
        original["spheres"][sphere] = {"id": sphere, "name": row["name"], "parent": sphere[:3]}
    for node in NODES:
        role = "DOMAIN" if int(node[5:7]) <= 7 else "META"
        row = {"id": node, "name": "Synthetic fixture " + node, "houseId": node[:3], "sphereId": node[:7],
               "role": role, "definition": "Affirmative quasar fixture " + node,
               "includes": "Synthetic inclusion zephyr", "excludes": "Forbidden nebulium counterexample"}
        original["nodes"][node] = {"id": node, "name": row["name"], "parent": node[:7],
            "kind": "DOMAIN_SPECIALIZATION" if role == "DOMAIN" else "EPISTEMIC_META",
            "definition": row["definition"], "includes": row["includes"], "excludes": row["excludes"],
            "source_record_sha256": digest({"fixture": node}), "scope_status": "SYNTHETIC_FIXTURE"}
        row.update({"declaredSourceRecordSha256": original["nodes"][node]["source_record_sha256"],
                    "sourceScopeStatus": "SYNTHETIC_FIXTURE", "sourcePointer": "/nodes/" + node})
        registry["nodes"].append(row)
    raw = canonical(original).encode()
    registry["sourceSha256"] = hashlib.sha256(raw).hexdigest()
    modes = ["PLAY", "SOCIAL", "IMAGINE", "DREAM", "QUIET"]
    items = [{"id": "SYNTHETIC-" + sphere, "sphere": sphere,
              "title": "Synthetic proposal " + sphere, "experiment": "Synthetic experiment",
              "falsifier": "Synthetic mismatch", "suggestedMode": "WORK" if i < 104 else modes[i % 5],
              "status": "PROPOSED_NOT_IMPLEMENTED", "publicSafeDesignOnly": True} for i, sphere in enumerate(SPHERES)]
    catalog = {"sourceRegistryDigest": registry["sourceSha256"], "sourceRegistryEdition": edition, "items": items}
    catalog_raw = canonical(catalog).encode()
    catalog_pin = hashlib.sha256(catalog_raw).hexdigest()
    lenses = {"spheres": [{"id": sphere, "question": "Quasar nebulium fixture " + sphere,
        "checks": ["Synthetic candidate remains unassessed"], "mode": "WORK",
        "referenceProposal": items[i], "sourceCatalogSha256": catalog_pin} for i, sphere in enumerate(SPHERES)],
        "houses": [{"id": house, "question": "Quasar fixture " + house,
        "checks": ["Synthetic scope boundary"], "mode": "WORK"} for house in HOUSES]}
    return registry, lenses, raw, catalog_raw


class EvolutionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="cupwake-evolution-fixtures-")
        cls.root = Path(cls.temp.name)
        cls.registry, cls.lenses, cls.raw, cls.catalog = fixture()
        cls.constants = {"SOURCE_SHA256": cls.registry["sourceSha256"],
                         "CATALOG_SHA256": hashlib.sha256(cls.catalog).hexdigest(),
                         "SOURCE_EDITION": cls.registry["edition"]}
        cls.patch = patch.multiple(module, **cls.constants)
        cls.patch.start()
        cls.complete_path = cls.root / "complete.sqlite"
        with EvolutionEngine(cls.complete_path, cls.registry, cls.lenses, cls.raw, cls.catalog) as engine:
            cls.receipts = engine.run_all()
            cls.complete_head = engine.head
            cls.complete_verification = engine.verify()

    @classmethod
    def tearDownClass(cls):
        cls.patch.stop()
        cls.temp.cleanup()

    def setUp(self):
        self.temp_case = tempfile.TemporaryDirectory(dir=self.root)
        self.case = Path(self.temp_case.name)
        self.engines = []

    def tearDown(self):
        for engine in self.engines:
            engine.close()
        self.temp_case.cleanup()

    def engine(self, *, complete=False, registry=None, lenses=None, raw=None, catalog=None, dependencies=None):
        path = self.case / f"case-{len(self.engines)}.sqlite"
        if complete:
            shutil.copy2(self.complete_path, path)
        result = EvolutionEngine(path, registry or self.registry, lenses or self.lenses,
                                 self.raw if raw is None else raw, self.catalog if catalog is None else catalog,
                                 dependencies=dependencies)
        self.engines.append(result)
        return result

    def reject(self, code, operation, *args, **kwargs):
        with self.assertRaises(EvolutionError) as caught:
            operation(*args, **kwargs)
        self.assertEqual(caught.exception.code, code)

    def test_complete_cycle_counts_distinct_computations_and_compact_rows(self):
        engine = self.engine(complete=True)
        report = engine.summary()
        self.assertEqual(report["completedPasses"], 12)
        self.assertEqual(report["storedNodePassRows"], 20736)
        self.assertEqual(report["actualPredicateEvaluations"], 3234816)
        self.assertEqual(report["spherePredicateEvaluations"], 2985984)
        self.assertEqual(report["housePredicateEvaluations"], 248832)
        self.assertEqual([x["name"] for x in self.receipts], list(PASS_NAMES))
        self.assertEqual(len({x["cellMatrixSha256"] for x in self.receipts}), 12)

    def test_every_pass_has_every_source_node_and_every_lens_position(self):
        engine = self.engine(complete=True)
        self.assertEqual(engine.db.execute("SELECT COUNT(*) FROM node_passes WHERE LENGTH(cell_vector)!=312").fetchone()[0], 0)
        self.assertEqual(engine.db.execute("SELECT COUNT(*) FROM (SELECT pass_id,COUNT(*) n FROM node_passes GROUP BY pass_id HAVING n!=1728)").fetchone()[0], 0)
        self.assertEqual(engine.db.execute("SELECT COUNT(*) FROM aggregates").fetchone()[0], 1884)

    def test_full_verifier_recomputes_chain_vectors_and_aggregates(self):
        self.assertEqual(self.complete_verification["status"], "LOCAL_HASH_AND_COUNT_VERIFIED")
        self.assertEqual(self.complete_verification["nodePassRows"], 20736)

    def test_synthetic_bytes_rejected_by_unmodified_production_pins(self):
        with patch.multiple(module, SOURCE_SHA256=PRODUCTION_PIN, CATALOG_SHA256=PRODUCTION_CATALOG_PIN, SOURCE_EDITION=PRODUCTION_EDITION):
            self.reject("SOURCE_DIGEST_DRIFT", self.engine)

    def test_altered_original_bytes_rejected_even_with_same_registry(self):
        self.reject("ORIGINAL_BYTES_DIGEST_DRIFT", self.engine, raw=self.raw + b" ")

    def test_altered_catalog_bytes_rejected(self):
        self.reject("CATALOG_BYTES_DIGEST_DRIFT", self.engine, catalog=self.catalog + b" ")

    def test_source_scope_tamper_rejected(self):
        registry = deepcopy(self.registry)
        registry["nodes"][0]["excludes"] = "Altered exclusion"
        self.reject("ORIGINAL_SOURCE_SCOPE_FIELD_DRIFT", self.engine, registry=registry)

    def test_old_node_axis_role_rule_rejected(self):
        registry = deepcopy(self.registry)
        for node in registry["nodes"]:
            node["role"] = "DOMAIN" if int(node["id"][-2:]) <= 7 else "META"
        self.reject("NODE_ROLE_NOT_SPHERE_ROLE", self.engine, registry=registry)

    def test_relabelled_optional_proposal_rejected(self):
        lenses = deepcopy(self.lenses)
        lenses["spheres"][-1]["referenceProposal"]["suggestedMode"] = "WORK"
        self.reject("LENS_PROPOSAL_DRIFT", self.engine, lenses=lenses)

    def test_authority_field_in_input_rejected(self):
        registry = deepcopy(self.registry)
        registry["hostAttested"] = True
        self.reject("PROTECTED_OR_AUTHORITY_FIELD", self.engine, registry=registry)

    def test_caller_mutation_after_initialization_does_not_change_frozen_source(self):
        registry = deepcopy(self.registry)
        engine = self.engine(registry=registry)
        registry["nodes"][0]["definition"] = "Outside mutation"
        self.assertNotEqual(engine.nodes[NODES[0]]["definition"], "Outside mutation")

    def test_scope_affirmative_exclusion_mixed_and_nohit_stay_unapproved(self):
        engine = self.engine()
        queries = {"quasar": "AFFIRMATIVE_TEXT_ONLY", "nebulium": "EXCLUSION_TEXT_ONLY",
                   "quasar nebulium": "MIXED_SCOPE_TEXT", "unfindablezz": "NO_SCOPE_TEXT_MATCH"}
        for query, expected in queries.items():
            result = engine.scope_match(NODES[0], query)
            self.assertEqual(result["classification"], expected)
            self.assertFalse(result["semanticApproval"])
            self.assertFalse(result["workAuthority"])

    def test_four_system_slots_are_identity_only_and_require_sealed_cycle(self):
        empty = self.engine()
        self.reject("UNSEALED_CYCLE", lambda: list(empty.outbox_slots()))
        complete = self.engine(complete=True)
        slots = list(complete.outbox_slots())
        self.assertEqual(len(slots), 6912)
        self.assertEqual(len({(x["nodeId"], x["platform"]) for x in slots}), 6912)
        self.assertTrue(all(set(x) == {"nodeId", "passId", "runId", "platform", "route"} for x in slots))

    def test_mode_totals_and_noncompletion_counts_remain_truthful(self):
        engine = self.engine(complete=True)
        summary = engine.summary()
        self.assertEqual(summary["workInitiativeNodes"], 1248)
        self.assertEqual(summary["heldOptionalInitiativeNodes"], 480)
        for key in ("actualModelInvocations", "actualMacroturns", "semanticAcceptances", "implementedNodes", "hostDeliveries"):
            self.assertEqual(summary[key], 0)
        value = json.loads(engine.db.execute("SELECT result_json FROM node_passes WHERE pass_id=12 AND node_id=?", (NODES[-1],)).fetchone()[0])
        self.assertEqual(value["initiativeRoute"], "HOLD_VOLUNTARY_MODE_SEPARATION")
        self.assertEqual(value["independentNodeReview"], "CANDIDATE_REQUIRES_SEPARATE_AUTHORIZATION")

    def test_injected_midpass_failure_rolls_back_every_row_and_head(self):
        engine = self.engine()
        engine.begin_cycle("fault-test")
        head = engine.head
        self.reject("INJECTED_FAILURE", engine.run_next, expected_head=head, fail_after_nodes=173)
        self.assertEqual(engine.head, head)
        self.assertEqual(engine.db.execute("SELECT COUNT(*) FROM node_passes").fetchone()[0], 0)
        self.assertEqual(engine.summary()["completedPasses"], 0)
        self.assertEqual(engine.run_next(expected_head=head)["stage"], 1)
        self.assertEqual(engine.verify()["passes"], 1)

    def test_stale_head_cannot_advance_pass(self):
        engine = self.engine()
        old = engine.head
        engine.begin_cycle("stale-test")
        self.reject("STALE_HEAD", engine.run_next, expected_head=old)

    def test_completed_run_replay_adds_no_passes_or_receipts(self):
        engine = self.engine(complete=True)
        head = engine.head
        self.assertEqual(engine.run_all(), [])
        self.assertEqual(engine.head, head)
        self.assertEqual(engine.summary()["completedPasses"], 12)

    def test_explicit_next_cycle_appends_and_continues_prior_node_chain(self):
        engine = self.engine(complete=True)
        engine.begin_cycle("cycle-002", expected_head=engine.head)
        result = engine.run_next(expected_head=engine.head)
        self.assertEqual((result["passId"], result["cycle"], result["stage"]), (13, 2, 1))
        self.assertEqual(engine.verify()["passes"], 13)

    def test_new_cycle_cannot_overlap_existing_cycle(self):
        engine = self.engine()
        engine.begin_cycle("one")
        self.reject("CYCLE_IN_PROGRESS", engine.begin_cycle, "two", expected_head=engine.head)

    def test_begin_cycle_retry_is_idempotent(self):
        engine = self.engine()
        first = engine.begin_cycle("one")
        head = engine.head
        self.assertEqual(engine.begin_cycle("one"), first)
        self.assertEqual(engine.head, head)

    def test_wrong_input_revision_rejected(self):
        engine = self.engine()
        self.reject("REVISION_BUNDLE_DRIFT", engine.begin_cycle, "bad", input_bundle_digest="f" * 64)

    def test_node_revision_telescopes_and_invalidates_reverse_dependencies(self):
        graph = {NODES[1]: [NODES[0]], "H02.S01.N01": [NODES[1]]}
        engine = self.engine(dependencies=graph)
        body = engine.impact([{"kind": "NODE", "id": NODES[0], "revision": "a" * 64}])
        self.assertEqual(body["directNodes"], [NODES[0]])
        self.assertEqual(body["dependentNodes"], [NODES[1], "H02.S01.N01"])
        self.assertEqual(body["spheres"], ["H01.S01", "H02.S01"])
        self.assertEqual(body["houses"], ["H01", "H02"])

    def test_sphere_house_and_build_invalidation_expand_exact_hierarchy(self):
        engine = self.engine()
        for kind, scope_id, expected in (("SPHERE", "H01.S01", 12), ("HOUSE", "H01", 144), ("BUILD", "BUILD", 1728)):
            self.assertEqual(len(engine.impact([{"kind": kind, "id": scope_id, "revision": "a" * 64}])["nodes"]), expected)

    def test_dependency_cycle_is_rejected_without_recursion(self):
        self.reject("DEPENDENCY_CYCLE", self.engine, dependencies={NODES[0]: [NODES[1]], NODES[1]: [NODES[0]]})

    def test_unknown_dependency_target_rejected(self):
        self.reject("DEPENDENCY_TARGET", self.engine, dependencies={NODES[0]: ["H99.S99.N99"]})

    def test_invalidation_is_idempotent_and_collision_detected(self):
        engine = self.engine()
        changes = [{"kind": "NODE", "id": NODES[0], "revision": "a" * 64}]
        first = engine.invalidate("one", changes, expected_head=engine.head)
        head = engine.head
        self.assertEqual(engine.invalidate("one", changes), first)
        self.assertEqual(engine.head, head)
        self.reject("EVENT_ID_COLLISION", engine.invalidate, "one", [{**changes[0], "revision": "b" * 64}])

    def test_source_mutation_is_not_an_invalidation_kind(self):
        engine = self.engine()
        self.reject("IMMUTABLE_SOURCE_OR_UNKNOWN_CHANGE_KIND", engine.impact, [{"kind": "SOURCE", "id": "BUILD", "revision": "a" * 64}])

    def test_private_body_in_revision_event_is_rejected(self):
        engine = self.engine()
        self.reject("CHANGE_FIELDS", engine.impact, [{"kind": "NODE", "id": NODES[0], "revision": "a" * 64, "privateBody": "never ingest"}])

    def test_revision_while_cycle_open_rejected(self):
        engine = self.engine()
        engine.begin_cycle("one")
        self.reject("REVISION_DURING_CYCLE", engine.invalidate, "one", [{"kind": "NODE", "id": NODES[0], "revision": "a" * 64}])

    def test_revised_cycle_retains_source_and_separate_overlay_digest(self):
        engine = self.engine(complete=True)
        prior = engine.current_input_bundle_digest()
        engine.invalidate("new-evidence", [{"kind": "NODE", "id": NODES[0], "revision": "c" * 64}], expected_head=engine.head)
        self.assertNotEqual(engine.current_input_bundle_digest(), prior)
        engine.begin_cycle("cycle-002", expected_head=engine.head)
        result = engine.run_next()
        self.assertEqual(result["dirtyNodes"], 1)
        self.assertEqual(result["sourceSha256"], self.registry["sourceSha256"])
        self.assertEqual(engine.verify()["passes"], 13)

    def test_matrix_tamper_is_rejected_by_actual_predicate_recomputation(self):
        engine = self.engine(complete=True)
        engine.db.execute("UPDATE node_passes SET cell_vector=? WHERE pass_id=1 AND node_id=?", (struct.pack("<156H", *([999] * 156)), NODES[0]))
        self.reject("CELL_PREDICATE_DRIFT", engine.verify)

    def test_wrong_source_role_rejected_even_with_rehashed_node_record(self):
        engine = self.engine(complete=True)
        row = engine.db.execute("SELECT result_json FROM node_passes WHERE pass_id=1 AND node_id=?", (NODES[0],)).fetchone()
        value = json.loads(row[0])
        value["sourceRole"] = "META"
        engine.db.execute("UPDATE node_passes SET result_json=?,result_hash=? WHERE pass_id=1 AND node_id=?", (canonical(value), digest(value), NODES[0]))
        self.reject("NODE_SOURCE_ROLE_MODE", engine.verify)

    def test_forged_semantic_approval_rejected_even_with_rehashed_node(self):
        engine = self.engine(complete=True)
        row = engine.db.execute("SELECT result_json FROM node_passes WHERE pass_id=1 AND node_id=?", (NODES[0],)).fetchone()
        value = json.loads(row[0]); value["semanticStatus"] = "APPROVED"
        engine.db.execute("UPDATE node_passes SET result_json=?,result_hash=? WHERE pass_id=1 AND node_id=?", (canonical(value), digest(value), NODES[0]))
        self.reject("FALSE_PROMOTION", engine.verify)

    def test_changed_aggregate_is_detected(self):
        engine = self.engine(complete=True)
        engine.db.execute("UPDATE aggregates SET content_hash=? WHERE pass_id=1 AND kind='BUILD'", ("f" * 64,))
        self.reject("AGGREGATE_HASH", engine.verify)

    def test_stale_external_head_detects_valid_old_snapshot(self):
        engine = self.engine(complete=True)
        self.reject("STALE_HEAD", engine.verify, expected_head="e" * 64)

    def test_overlay_tamper_without_event_is_rejected(self):
        engine = self.engine()
        engine.db.execute("INSERT INTO overlays VALUES('NODE',?,?,?)", (NODES[0], "d" * 64, "forged"))
        self.reject("OVERLAY_HISTORY", engine.verify)

    def test_exact_node_payload_binds_declared_hash_edition_routes_and_counts(self):
        engine = self.engine(complete=True)
        original_json = engine.db.execute("SELECT result_json FROM node_passes WHERE pass_id=1 AND node_id=?", (NODES[0],)).fetchone()[0]
        original = json.loads(original_json)
        changes = {"originalDeclaredRecordSha256": "0" * 64, "sourceEdition": "FORGED_EDITION",
                   "initiativeRoute": "AUTHORIZED", "independentNodeReview": "APPROVED",
                   "cellCount": 99999, "sphereCells": 99999, "houseCells": 99999,
                   "inputBundleDigest": "0" * 64, "stageName": "FAKE_STAGE"}
        for key, changed in changes.items():
            with self.subTest(field=key):
                value = {**original, key: changed}
                engine.db.execute("UPDATE node_passes SET result_json=?,result_hash=? WHERE pass_id=1 AND node_id=?", (canonical(value), digest(value), NODES[0]))
                self.reject("NODE_PAYLOAD_DRIFT", engine.verify)
        engine.db.execute("UPDATE node_passes SET result_json=?,result_hash=? WHERE pass_id=1 AND node_id=?", (original_json, digest(original), NODES[0]))

    def test_rehashed_false_sphere_counter_in_receipt_is_rejected(self):
        engine = self.engine()
        engine.begin_cycle("receipt-case")
        engine.run_next()
        event = engine.db.execute("SELECT * FROM events WHERE kind='PASS'").fetchone()
        value = json.loads(event["body"])
        value["spherePredicateEvaluations"] = 99999999
        event_hash = digest({"kind": "PASS", "eventKey": event["event_key"], "previousHash": event["previous_hash"], "body": value})
        engine.db.execute("UPDATE events SET body=?,event_hash=? WHERE seq=?", (canonical(value), event_hash, event["seq"]))
        engine.db.execute("UPDATE passes SET receipt=?,event_hash=? WHERE pass_id=1", (canonical(value), event_hash))
        engine.db.execute("UPDATE metadata SET value=? WHERE key='head'", (event_hash,))
        self.reject("PASS_RECEIPT_DRIFT", engine.verify)

    def test_implementation_and_validator_bytes_are_bound_into_run_identity(self):
        engine = self.engine()
        expected = digest({"schema": module.SCHEMA, "source": module.SOURCE_SHA256,
            "registry": engine.index["normalizedDigest"], "catalog": module.CATALOG_SHA256,
            "lenses": digest(self.lenses), "dependencies": engine.dependencies,
            "implementationSha256": hashlib.sha256(Path(module.__file__).read_bytes()).hexdigest(),
            "sourceValidatorSha256": hashlib.sha256(Path(module.source_circuit.__file__).read_bytes()).hexdigest()})
        self.assertEqual(engine.input_digest, expected)
        engine.db.execute("UPDATE metadata SET value=? WHERE key='implementation_sha256'", ("0" * 64,))
        self.reject("METADATA_PIN_DRIFT", engine.verify)

    def test_changed_input_bundle_reopening_existing_db_rejected(self):
        engine = self.engine()
        engine.db.execute("UPDATE metadata SET value=? WHERE key='input_digest'", ("0" * 64,))
        self.reject("INPUT_BUNDLE_DRIFT", EvolutionEngine, engine.path, self.registry, self.lenses, self.raw, self.catalog)


if __name__ == "__main__":
    unittest.main()
