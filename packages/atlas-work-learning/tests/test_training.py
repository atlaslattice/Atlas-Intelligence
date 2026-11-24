"""Deterministic synthetic mechanism tests, separate from real corpus scores."""
from copy import deepcopy
import hashlib
from pathlib import Path
import tempfile
import unittest

from atlas_work_learning.model import AddressedGraphEncoder, ModelConfig
from atlas_work_learning.training import TrainingConfig, train_model
from atlas_work_learning.evaluation import build_corpus_pairs, evaluate_retrieval, validate_pair_splits
from test_model import fixture_registry


def fixture_corpus():
    topics = ["algebra", "forests", "circuits", "compilers", "medicine", "economics", "history", "ethics",
              "gardens", "orbits", "fossils", "languages"]
    items = []
    for i, topic in enumerate(topics):
        text = (f"{topic} questions explore {topic} methods and {topic} evidence through careful observations "
                f"{topic} models compare {topic} measurements with {topic} predictions and improve {topic} explanations")
        digest = hashlib.sha256(text.encode()).hexdigest()
        items.append({"id": f"fixture-{i:02d}", "family_id": f"family-{i:02d}",
                      "source_id": f"source-{i:02d}", "source_version": "fixture-v1", "source_sha256": digest,
                      "source_uri": f"fixture://work/{i}", "text_sha256": digest, "text": text,
                      "title": topic, "scope": "WORK", "author_kind": "synthetic", "hsn_candidates": [],
                      "split": "train" if i < 8 else "validation" if i < 10 else "test", "aliases": []})
    return {"sha256": "a" * 64, "items": items}


def fixture_known_source_correction(corpus):
    """Fictional but fully source-bound episode, testing the non-bypass path."""
    item = corpus["items"][0]
    query = "repair the algebra model equation with a corrected symmetry invariant"
    target = "algebra symmetry preserves equation balance and verifies the invariant theorem"
    return {"id": "episode:fictional-verified", "episode_id": "fictional-verified", "split": "train",
            "family_id": item["family_id"], "input_text": query, "target_text": target,
            "input_sha256": hashlib.sha256(query.encode()).hexdigest(), "target_sha256": hashlib.sha256(target.encode()).hexdigest(),
            "kind": "verified_correction", "objective": "text_correction", "training_eligible": True,
            "is_synthetic": False, "corpus_item_ids": [item["id"]],
            "source_refs": [{k: item[k] for k in ("source_id", "source_version", "source_sha256")}],
            "verification_refs": [{"uri": "fixture://checks/algebra", "sha256": "c" * 64}],
            "ledger_event_sha256": "d" * 64, "author_kind": "synthetic"}


class TrainingTests(unittest.TestCase):
    def fit(self, directory, *, corpus=None, corrections=None, hierarchy=True, initial_model=None, updates=6):
        return train_model(fixture_registry(), corpus or fixture_corpus(), directory,
                           model_config=ModelConfig(feature_dim=24, embedding_dim=6, seed=9, hierarchy=hierarchy),
                           training_config=TrainingConfig(updates=updates, batch_size=4, anchor_batch_size=4, validation_every=2,
                                                          validation_max_queries=2, seed=7),
                           correction_pairs=corrections, initial_model=initial_model, _test_fixture=True)

    def load(self, report, which="final_checkpoint"):
        pin = report[which]
        return AddressedGraphEncoder.load(pin["directory"], fixture_registry(), expected_corpus_sha256=report["corpus_sha256"],
                                          expected_manifest_sha256=pin["manifest_sha256"], _test_fixture=True)

    def test_deterministic_replay_updates_all_nodes_and_hierarchy(self):
        with tempfile.TemporaryDirectory() as directory:
            one = self.fit(Path(directory) / "one")
            two = self.fit(Path(directory) / "two")
            self.assertEqual(one["loss_history"], two["loss_history"])
            self.assertEqual(one["final_checkpoint"]["state_sha256"], two["final_checkpoint"]["state_sha256"])
            self.assertEqual(one["selected_checkpoint"]["state_sha256"], two["selected_checkpoint"]["state_sha256"])
            self.assertEqual(one["actual_updates"], 6)
            self.assertEqual(one["node_rows_updated_at_final"], 8)
            self.assertEqual(one["definition_anchors_seen"], 8)
            self.assertGreater(one["parameter_movement_at_final"]["sphere_gates"]["l2"], 0)
            self.assertGreater(one["parameter_movement_at_final"]["house_gates"]["l2"], 0)
            self.assertEqual(one["test_evaluation"], "NOT_PERFORMED_BY_TRAINING")
            self.assertFalse(one["validation_selection"]["held_out_test_used"])
            self.assertEqual(one["test_fixture"], True)

    def test_test_body_cannot_select_or_change_training(self):
        with tempfile.TemporaryDirectory() as directory:
            before = fixture_corpus()
            after = deepcopy(before)
            after["sha256"] = "b" * 64
            for i in after["items"]:
                if i["split"] == "test":
                    i["text"] = i["text"].replace("questions", "hypotheses").replace("predictions", "measurements")
                    i["text_sha256"] = hashlib.sha256(i["text"].encode()).hexdigest()
            one = self.fit(Path(directory) / "one", corpus=before)
            two = self.fit(Path(directory) / "two", corpus=after)
            self.assertEqual(one["loss_history"], two["loss_history"])
            self.assertEqual(one["final_checkpoint"]["state_sha256"], two["final_checkpoint"]["state_sha256"])
            self.assertEqual(one["validation_selection"], two["validation_selection"])

    def test_flat_control_and_postselection_evaluation(self):
        with tempfile.TemporaryDirectory() as directory:
            report = self.fit(Path(directory) / "flat", hierarchy=False)
            self.assertEqual(report["parameter_movement_at_final"]["sphere_gates"]["changed_scalars"], 0)
            self.assertEqual(report["parameter_movement_at_final"]["house_gates"]["changed_scalars"], 0)
            self.assertEqual(report["node_rows_updated_at_final"], 8)
            model = self.load(report, "selected_checkpoint")
            test = [p for p in build_corpus_pairs(fixture_corpus()["items"]) if p["split"] == "test"]
            result = evaluate_retrieval(model, test)
            self.assertEqual(result["queries"], 2)
            self.assertEqual(result["method"], "FLAT_ADDRESSED_MODEL")
            self.assertFalse(result["independent_semantic_validation"])

    def test_source_bound_correction_changes_objective_and_parameters(self):
        corpus = fixture_corpus()
        correction = fixture_known_source_correction(corpus)
        with tempfile.TemporaryDirectory() as directory:
            one = self.fit(Path(directory) / "without", corpus=corpus)
            two = self.fit(Path(directory) / "with", corpus=corpus, corrections=[correction])
            self.assertNotEqual(one["final_checkpoint"]["state_sha256"], two["final_checkpoint"]["state_sha256"])
            self.assertEqual(two["correction_presentations"][correction["episode_id"]], 6)
            self.assertTrue(all(x["verified_correction_presentations"] >= 1 for x in two["loss_history"]))
            self.assertNotEqual(one["loss_history"][0]["pair_loss"], two["loss_history"][0]["pair_loss"])
            # This is a synthetic mechanism test even though it exercises the
            # complete (non-synthetic-bypass) source-verification code path.
            self.assertTrue(two["test_fixture"])

    def test_correction_wrong_edition_heldout_and_unverified_fail(self):
        corpus = fixture_corpus()
        with tempfile.TemporaryDirectory() as directory:
            correction = fixture_known_source_correction(corpus)
            correction["source_refs"][0]["source_version"] = "wrong"
            with self.assertRaisesRegex(ValueError, "SOURCE_EDITION"):
                self.fit(Path(directory) / "edition", corpus=corpus, corrections=[correction])
            correction = fixture_known_source_correction(corpus)
            correction["family_id"] = corpus["items"][-1]["family_id"]
            with self.assertRaisesRegex(ValueError, "HELD_OUT"):
                self.fit(Path(directory) / "held", corpus=corpus, corrections=[correction])
            correction = fixture_known_source_correction(corpus)
            correction["training_eligible"] = False
            with self.assertRaisesRegex(ValueError, "ELIGIBILITY"):
                self.fit(Path(directory) / "unverified", corpus=corpus, corrections=[correction])

    def test_explicit_continuation_pins_parent_and_resets_optimizer(self):
        with tempfile.TemporaryDirectory() as directory:
            first = self.fit(Path(directory) / "first")
            parent = self.load(first)
            parent_digest = parent.state_digest()
            continuation = self.fit(Path(directory) / "continuation", initial_model=parent, updates=2)
            self.assertEqual(continuation["parent_state_sha256"], parent_digest)
            self.assertEqual(continuation["initial_state_sha256"], parent_digest)
            self.assertEqual(parent.state_digest(), parent_digest)
            self.assertNotEqual(continuation["final_checkpoint"]["state_sha256"], parent_digest)
            self.assertEqual(continuation["optimizer_state"], "RESET_ADAM_MOMENTS_FOR_EXPLICIT_NEW_FINITE_RUN")
            bad = fixture_corpus(); bad["sha256"] = "b" * 64
            with self.assertRaisesRegex(ValueError, "CORPUS_PIN"):
                self.fit(Path(directory) / "wrong-corpus", corpus=bad, initial_model=parent)

    def test_split_leak_and_budget_fail_before_training(self):
        corpus = fixture_corpus()
        corpus["items"][-1]["family_id"] = corpus["items"][0]["family_id"]
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, "SPLIT_LEAKAGE"):
                self.fit(directory, corpus=corpus)
        for kwargs in ({"updates": 181}, {"updates": 0}, {"batch_size": 1}, {"learning_rate": float("nan")}, {"updates": True}):
            with self.assertRaises(ValueError):
                TrainingConfig(**kwargs)
        pairs = build_corpus_pairs(fixture_corpus()["items"])
        pairs[-1]["target_text"] = pairs[0]["input_text"]
        with self.assertRaisesRegex(ValueError, "SPLIT_LEAKAGE:fragment"):
            validate_pair_splits(pairs)

    def test_duplicate_fragment_preprocessing_is_shared_and_reported(self):
        corpus = fixture_corpus()
        common = "shared heading repeated across different source documents"
        for i in (0, 10):
            corpus["items"][i]["text"] = common + " " + " ".join(["separate" + str(i)] * 14)
        result = build_corpus_pairs(corpus["items"], with_manifest=True)
        self.assertEqual(result["pairs"], build_corpus_pairs(corpus["items"]))
        self.assertEqual(result["manifest"]["omitted_by_reason"]["REPEATED_NORMALIZED_FRAGMENT_ACROSS_SPLITS"], 2)
        self.assertNotIn("fixture-00", {p["id"] for p in result["pairs"]})
        self.assertNotIn("fixture-10", {p["id"] for p in result["pairs"]})
        validate_pair_splits(result["pairs"])


if __name__ == "__main__":
    unittest.main()
