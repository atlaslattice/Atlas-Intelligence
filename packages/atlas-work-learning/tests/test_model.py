"""Mechanism-only fixtures; none of these are real corpus learning results."""
from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest

import numpy as np

from atlas_work_learning.model import AddressedGraphEncoder, ModelConfig, search_corpus
from atlas_work_learning.evaluation import retrieval_metrics, lexical_baseline


def fixture_registry():
    topics = ["algebra equation symmetry", "geometry shape theorem", "forests rainfall carbon", "wetlands species ecology",
              "circuits voltage current", "computers compiler program", "history sources chronology", "ethics evidence deliberation"]
    nodes = []
    for i, topic in enumerate(topics):
        h, s, n = i // 4 + 1, (i % 4) // 2 + 1, i % 2 + 1
        nodes.append({"id": f"H{h:02d}.S{s:02d}.N{n:02d}", "name": topic.split()[0],
                      "definition": topic, "includes": topic + " inquiry principles", "excludes": "unrelated claims",
                      "kind": "DOMAIN_SPECIALIZATION" if s == 1 else "EPISTEMIC_META"})
    return {"sha256": "f" * 64, "edition": "explicit-test-fixture", "nodes": nodes,
            "node_ids": [n["id"] for n in nodes], "node_to_sphere": [i // 2 for i in range(8)],
            "sphere_to_house": [0, 0, 1, 1]}


class ModelTests(unittest.TestCase):
    def model(self, hierarchy=True):
        return AddressedGraphEncoder(fixture_registry(), ModelConfig(feature_dim=12, embedding_dim=4, seed=5, hierarchy=hierarchy), _test_fixture=True)

    def test_manual_gradient_matches_central_difference_for_every_parameter(self):
        model = self.model()
        inputs = ["algebra symmetry", "species forests", "voltage circuits"]
        targets = ["equation theorem", "carbon wetlands", "current computers"]
        args = {"anchor_indices": [0, 3, 5, 7], "anchor_weight": 0.17}
        loss, gradients, parts = model.loss_and_gradients(inputs, targets, **args)
        self.assertTrue(np.isfinite(loss))
        self.assertGreater(parts["anchor_loss"], 0)
        epsilon = 1e-6
        for name, value in model.parameters.items():
            for index in np.ndindex(value.shape):
                original = value[index]
                value[index] = original + epsilon
                high = model.loss_and_gradients(inputs, targets, **args)[0]
                value[index] = original - epsilon
                low = model.loss_and_gradients(inputs, targets, **args)[0]
                value[index] = original
                numerical = (high - low) / (2 * epsilon)
                self.assertAlmostEqual(numerical, gradients[name][index], delta=3e-7,
                                       msg=f"{name}{index}: analytic={gradients[name][index]}, numerical={numerical}")
        self.assertTrue(np.any(gradients["nodes"]))
        self.assertTrue(np.any(gradients["sphere_gates"]))
        self.assertTrue(np.any(gradients["house_gates"]))

    def test_flat_control_uses_no_hierarchy_gate_gradient(self):
        model = self.model(False)
        _, grads, _ = model.loss_and_gradients(["algebra equation", "circuits voltage"], ["geometry symmetry", "current computers"], anchor_indices=[0, 4])
        self.assertTrue(np.any(grads["nodes"]))
        np.testing.assert_array_equal(grads["sphere_gates"], 0)
        np.testing.assert_array_equal(grads["house_gates"], 0)

    def test_checkpoint_roundtrip_and_source_corpus_weight_drift(self):
        model = self.model()
        with tempfile.TemporaryDirectory() as directory:
            saved = model.save(directory, corpus_sha256="a" * 64)
            loaded = AddressedGraphEncoder.load(directory, fixture_registry(), expected_corpus_sha256="a" * 64,
                                               expected_manifest_sha256=saved["manifest_sha256"], _test_fixture=True)
            np.testing.assert_array_equal(model.encode(["algebra circuits"]), loaded.encode(["algebra circuits"]))
            self.assertEqual(model.state_digest(), loaded.state_digest())
            self.assertEqual(loaded.corpus_sha256, "a" * 64)
            with self.assertRaisesRegex(ValueError, "CORPUS_PIN"):
                AddressedGraphEncoder.load(directory, fixture_registry(), expected_corpus_sha256="b" * 64, _test_fixture=True)
            changed = fixture_registry(); changed["sha256"] = "0" * 64
            with self.assertRaisesRegex(ValueError, "REGISTRY_PIN"):
                AddressedGraphEncoder.load(directory, changed, _test_fixture=True)
            with self.assertRaisesRegex(ValueError, "MANIFEST_PIN"):
                AddressedGraphEncoder.load(directory, fixture_registry(), expected_manifest_sha256="0" * 64, _test_fixture=True)
            changed = fixture_registry(); changed["sphere_to_house"] = [0, 1, 0, 1]
            with self.assertRaisesRegex(ValueError, "ADDRESS_PIN"):
                AddressedGraphEncoder.load(directory, changed, _test_fixture=True)
            weights = Path(directory) / "weights.npz"
            weights.write_bytes(weights.read_bytes() + b"changed")
            with self.assertRaisesRegex(ValueError, "WEIGHTS_PIN"):
                AddressedGraphEncoder.load(directory, fixture_registry(), _test_fixture=True)

    def test_checkpoint_metadata_is_bound_to_pin(self):
        model = self.model()
        with tempfile.TemporaryDirectory() as directory:
            saved = model.save(directory, corpus_sha256="a" * 64)
            path = Path(directory) / "manifest.json"
            metadata = json.loads(path.read_text()); metadata["config"]["residual_scale"] = 0.7
            path.write_text(json.dumps(metadata))
            with self.assertRaisesRegex(ValueError, "MANIFEST_PIN"):
                AddressedGraphEncoder.load(directory, fixture_registry(), expected_manifest_sha256=saved["manifest_sha256"], _test_fixture=True)

    def test_address_and_semantics_are_not_redefined(self):
        registry = fixture_registry()
        source = deepcopy(registry["nodes"][0])
        model = AddressedGraphEncoder(registry, ModelConfig(feature_dim=12, embedding_dim=4), _test_fixture=True)
        registry["nodes"][0]["name"] = "external mutation"
        result = model.node(source["id"])
        self.assertEqual(result["source"], source)
        self.assertFalse(result["semantic_acceptance"])
        self.assertFalse(model.descriptor()["physical_geometry_equivalence"])
        hits = model.search_nodes("algebra", 2)
        self.assertEqual(len(hits), 2)
        self.assertTrue(all(h["semantic_status"] == "CANDIDATE_UNREVIEWED" for h in hits))
        self.assertTrue(all(h["kind"] in {"DOMAIN_SPECIALIZATION", "EPISTEMIC_META"} for h in hits))
        with self.assertRaisesRegex(ValueError, "ORIGINAL_ARIADNE"):
            AddressedGraphEncoder(fixture_registry())
        mismatched = fixture_registry(); mismatched["node_ids"][0] = "H12.S12.N12"
        with self.assertRaisesRegex(ValueError, "RECORD_ADDRESS"):
            AddressedGraphEncoder(mismatched, _test_fixture=True)

    def test_empty_queries_abstain_and_invalid_arguments_fail(self):
        model = self.model()
        model.parameters["bias"][:] = 0.2
        self.assertEqual(model.search_nodes("!?", 2), [])
        self.assertEqual(search_corpus(model, "", [{"id": "a", "text": "algebra"}]), [])
        for limit in (0, 21, True, 1.5):
            with self.assertRaises(ValueError):
                model.search_nodes("algebra", limit)
        with self.assertRaises(ValueError):
            ModelConfig(feature_dim=12.5)
        with self.assertRaises(ValueError):
            ModelConfig(seed=-1)

    def test_retrieval_metrics_and_lexical_control(self):
        scores = np.array([[.9, .5, .1], [.9, .5, .1], [.9, .5, .1]])
        m = retrieval_metrics(scores, [0, 1, 2], k=2)
        self.assertAlmostEqual(m["hit_at_1"], 1 / 3)
        self.assertAlmostEqual(m["hit_at_k"], 2 / 3)
        self.assertAlmostEqual(m["mrr_at_k"], .5)
        pairs = [{"id": "a", "family_id": "a", "split": "test", "input_text": "red cedar", "target_text": "red cedar forest"},
                 {"id": "b", "family_id": "b", "split": "test", "input_text": "electric current", "target_text": "electric current voltage"}]
        lexical = lexical_baseline(pairs)
        self.assertEqual(lexical["hit_at_1"], 1)
        self.assertEqual(lexical["judgment_kind"], "SELF_SUPERVISED_DIAGNOSTIC")


if __name__ == "__main__":
    unittest.main()
