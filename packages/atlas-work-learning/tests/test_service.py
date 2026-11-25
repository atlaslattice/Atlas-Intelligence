import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from atlas_work_learning.corpus import canonicalize_items, save_corpus, text_sha256
from atlas_work_learning.service import MAX_LINE_BYTES, WorkLearningService, serve
from atlas_work_learning.workspace import (_copy_input, attach_corpus, initialize_workspace, load_config,
    pinned_files, private_json, save_config, strict_json, within)


class ProtocolTests(unittest.TestCase):
    def test_duplicate_keys_and_nonfinite_json_rejected(self):
        for raw in ('{"x":1,"x":2}', '{"x":NaN}', '{"x":Infinity}'):
            with self.assertRaises(ValueError):
                strict_json(raw)

    def test_read_surface_rejects_writes_and_owner_paths(self):
        service = WorkLearningService.__new__(WorkLearningService)
        for operation, args in (("train", {}), ("record", {}), ("status", {"owner": "other"}),
                                ("search", {"query": "hello", "path": "/tmp/elsewhere"})):
            with self.assertRaises(ValueError):
                service.execute(operation, args)

    def _protocol(self, raw):
        out = io.BytesIO()
        with patch("atlas_work_learning.service.WorkLearningService") as service:
            service.return_value.execute.return_value = {"scope": "WORK"}
            serve("unused", "0" * 64, input_stream=io.BytesIO(raw), output_stream=out)
        return [json.loads(line) for line in out.getvalue().splitlines()]

    def test_frame_and_correlation(self):
        result = self._protocol(b'{"id":"a","operation":"status","arguments":{}}\n')
        self.assertEqual(result, [{"id": "a", "ok": True, "result": {"scope": "WORK"}}])

    def test_invalid_frames_do_not_execute(self):
        frames = [b'{"id":true,"operation":"status","arguments":{}}\n',
                  b'{"id":1,"id":2,"operation":"status","arguments":{}}\n',
                  b'{"id":1,"operation":"status","arguments":{}}',
                  b'{"id":1,"operation":"status","arguments":{},"owner":"other"}\n']
        for raw in frames:
            out = io.BytesIO()
            with patch("atlas_work_learning.service.WorkLearningService") as service:
                serve("unused", "0" * 64, input_stream=io.BytesIO(raw), output_stream=out)
                service.return_value.execute.assert_not_called()
            self.assertFalse(json.loads(out.getvalue())["ok"])

    def test_oversize_input_terminates_without_parsing_tail(self):
        raw = b"x" * (MAX_LINE_BYTES + 5) + b'\n{"id":2,"operation":"status","arguments":{}}\n'
        result = self._protocol(raw)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["error"]["code"], "REQUEST_TOO_LARGE_OR_UNTERMINATED")

    def test_errors_do_not_return_paths_or_user_content(self):
        out = io.BytesIO()
        with patch("atlas_work_learning.service.WorkLearningService") as service:
            service.return_value.execute.side_effect = FileNotFoundError("/private/secret.txt")
            serve("unused", "0" * 64, input_stream=io.BytesIO(b'{"id":1,"operation":"status","arguments":{}}\n'), output_stream=out)
        self.assertNotIn(b"secret", out.getvalue())
        self.assertFalse(json.loads(out.getvalue())["ok"])


class WorkspaceTests(unittest.TestCase):
    def test_validated_input_cannot_be_replaced_during_copy(self):
        with tempfile.TemporaryDirectory() as td:
            source = Path(td, "source.json")
            source.write_bytes(b"original")
            from atlas_work_learning.corpus import file_sha256
            pin = file_sha256(source)
            source.write_bytes(b"replacement")
            with self.assertRaisesRegex(ValueError, "INPUT_CHANGED_AFTER_VALIDATION"):
                _copy_input(source, Path(td, "workspace"), "corpus", expected_sha256=pin)

    def test_weights_sidecar_symlink_cannot_escape_workspace(self):
        from atlas_work_learning.corpus import file_sha256
        with tempfile.TemporaryDirectory() as td, tempfile.TemporaryDirectory() as other:
            root = Path(td)
            private_json(root / "config.json", {"fixture": True})
            sidecar = Path(other, "weights.npz")
            sidecar.write_bytes(b"private outside data")
            (root / "model").mkdir()
            (root / "model/weights.npz").symlink_to(sidecar)
            meta_sha = private_json(root / "model/manifest.json", {"weights_file": "weights.npz", "weights_sha256": file_sha256(sidecar)})
            with self.assertRaisesRegex(ValueError, "WORKSPACE_PATH_ESCAPE"):
                pinned_files(root, {"model": {"path": "model/manifest.json", "sha256": meta_sha}})

    def test_paths_cannot_escape_by_traversal_or_symlink(self):
        with tempfile.TemporaryDirectory() as td, tempfile.TemporaryDirectory() as other:
            Path(td, "alias").symlink_to(other, target_is_directory=True)
            for relative in ("../outside", "/tmp/outside", "alias/outside"):
                with self.assertRaises(ValueError):
                    within(td, relative)

    def test_immutable_output_is_replayable_but_not_overwritten(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td, "receipt.json")
            pin = private_json(path, {"value": 1}, immutable=True)
            self.assertEqual(pin, private_json(path, {"value": 1}, immutable=True))
            with self.assertRaises(ValueError):
                private_json(path, {"value": 2}, immutable=True)
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)


@unittest.skipUnless(os.environ.get("ATLAS_TEST_REGISTRY"), "set ATLAS_TEST_REGISTRY to the pinned original private registry")
class RealWorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / "workspace"
        self.records = []
        for i, text in enumerate(("Ariadne preserves source definitions for typed ontology nodes and explicit coordinates.",
                                   "Productive verified corrections are separate from preferences and automatic model output.")):
            self.records.append({"id": f"item{i}", "source_id": f"source{i}", "source_version": "v1",
                "source_uri": f"https://example.invalid/source/{i}", "source_sha256": text_sha256("document " + text),
                "text": text, "text_sha256": text_sha256(text), "title": f"Document {i}", "family_id": f"family{i}",
                "scope": "WORK", "author_kind": "unknown", "evidence_status": "SOURCE_QUOTE_VERIFIED", "hsn_candidates": []})
        manifest = save_corpus(canonicalize_items(self.records), Path(self.temp.name) / "admission")
        self.initial = initialize_workspace(self.root, os.environ["ATLAS_TEST_REGISTRY"], corpus_path=manifest["corpus_path"], owner="fixture-owner")
        self.service = WorkLearningService(self.root, expected_config_sha256=self.initial["configSha256"])

    def tearDown(self):
        self.temp.cleanup()

    def test_original_roles_search_and_provenance(self):
        domain = self.service.execute("node", {"hsn": "H01.S07.N12"})
        method = self.service.execute("node", {"hsn": "H01.S08.N01"})
        self.assertEqual(domain["source"]["kind"], "DOMAIN_SPECIALIZATION")
        self.assertEqual(method["source"]["kind"], "EPISTEMIC_META")
        search = self.service.execute("search", {"query": "Ariadne ontology", "limit": 1, "target": "corpus"})
        self.assertEqual(search["primaryMethod"], "neural")
        self.assertEqual(search["method"], "lexical")
        self.assertTrue(search["fallbackUsed"])
        self.assertEqual(search["fallbackReason"], "NEURAL_STATE_UNAVAILABLE_OR_WITHHELD")
        self.assertEqual(search["hits"][0]["id"], "item0")
        self.assertEqual(search["provenance"]["itemRefs"][0]["textSha256"], self.records[0]["text_sha256"])
        self.assertEqual(search["hits"][0]["excerpt"], self.records[0]["text"])

    def test_read_operations_leave_evidence_file_unchanged(self):
        from atlas_work_learning.corpus import file_sha256
        path = self.root / "evidence/episodes.sqlite"
        before = file_sha256(path)
        for operation, args in (("status", {}), ("episodes", {"limit": 5, "offset": 0}), ("evaluation", {})):
            self.service.execute(operation, args)
        self.assertEqual(file_sha256(path), before)

    def test_config_and_source_changes_fail_closed(self):
        config, old = load_config(self.root)
        config["retrieval"]["basis"] = "new revision"
        save_config(self.root, config)
        with self.assertRaisesRegex(ValueError, "CONFIG_PIN_MISMATCH"):
            self.service.execute("status", {})

    def test_overlong_owner_cannot_publish_partial_configuration(self):
        other = Path(self.temp.name) / "invalid-owner-workspace"
        with self.assertRaisesRegex(ValueError, "WORKSPACE_OWNER_REQUIRED"):
            initialize_workspace(other, os.environ["ATLAS_TEST_REGISTRY"], owner="x" * 201)
        self.assertFalse((other / "config.json").exists())

    def test_validated_corpus_replacement_does_not_change_active_config(self):
        from atlas_work_learning.corpus import file_sha256
        config, original_config = load_config(self.root)
        source = Path(self.temp.name) / "incoming.json"
        source.write_bytes(within(self.root, config["corpus"]["path"]).read_bytes())
        expected = file_sha256(source)
        def raced_copy(path, *args, **kwargs):
            if Path(path) == source:
                source.write_bytes(source.read_bytes() + b" ")
            return _copy_input(path, *args, **kwargs)
        with patch("atlas_work_learning.workspace._copy_input", side_effect=raced_copy):
            with self.assertRaisesRegex(ValueError, "INPUT_CHANGED_AFTER_VALIDATION"):
                attach_corpus(self.root, source, expected_sha256=expected)
        self.assertEqual(load_config(self.root)[1], original_config)

    def test_corpus_tampering_is_detected_after_cache(self):
        config, _ = load_config(self.root)
        path = within(self.root, config["corpus"]["path"])
        path.write_bytes(path.read_bytes() + b" ")
        with self.assertRaisesRegex(ValueError, "FILE_PIN_MISMATCH"):
            self.service.execute("search", {"query": "Ariadne"})

    def test_revoked_source_does_not_return_from_cached_index(self):
        from atlas_work_learning.episodes import EpisodeLedger
        ledger = EpisodeLedger(self.root / "evidence/episodes.sqlite", owner="fixture-owner")
        ledger.revoke_source("source0", "fixture revocation", actor_id="fixture-owner")
        ledger.close()
        result = self.service.execute("search", {"query": "Ariadne ontology"})
        self.assertEqual(result["hits"], [])

    def test_return_time_ledger_change_is_rejected(self):
        with patch.object(self.service, "check_integrity", side_effect=[{"head_sha256": "a" * 64}, {"head_sha256": "b" * 64}]):
            with self.assertRaisesRegex(ValueError, "LEDGER_CHANGED_DURING_READ"):
                self.service.execute("search", {"query": "Ariadne"})


if __name__ == "__main__":
    unittest.main()
