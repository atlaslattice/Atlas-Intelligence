import copy
import json
from pathlib import Path
import tempfile
import unittest

from atlas_work_learning.corpus import _Families, canonical_bytes, canonicalize_items, import_corpus, load_corpus, save_corpus, text_sha256


def item(i="a", source="source-a", text="A source-grounded statement about useful work.", family=None):
    return {"id": i, "source_id": source, "source_version": "v1", "source_uri": "https://example.invalid/" + source,
            "source_sha256": text_sha256("whole-body:" + source), "text": text, "text_sha256": text_sha256(text),
            "title": "Fixture " + i, "family_id": family or source, "scope": "WORK", "author_kind": "synthetic",
            "evidence_status": "SYNTHETIC_FIXTURE", "hsn_candidates": ["H01.S01.N01"]}


class CorpusTests(unittest.TestCase):
    def test_scope_checked_before_text_capture(self):
        x = item(); x.update(scope="SOCIAL", text={"do_not_read": True})
        c = canonicalize_items([x])
        self.assertEqual(c["items"], [])
        self.assertEqual(c["held"][0]["reason"], "WORK_SCOPE_OR_ACCESS_REQUIRED")
        self.assertNotIn("do_not_read", json.dumps(c))

    def test_wrong_excerpt_hash_held(self):
        x = item(); x["text_sha256"] = "0" * 64
        c = canonicalize_items([x])
        self.assertEqual(c["manifest"]["counts"]["held"], 1)
        self.assertEqual(c["items"], [])

    def test_exact_duplicates_keep_both_source_aliases(self):
        c = canonicalize_items([item(), item("b", "source-b")])
        self.assertEqual(len(c["items"]), 1)
        self.assertEqual({a["source_id"] for a in c["items"][0]["aliases"]}, {"source-a", "source-b"})
        self.assertEqual(c["manifest"]["counts"]["duplicate_records"], 1)

    def test_source_versions_and_exact_aliases_form_transitive_family(self):
        a = item(); b = item("b", "source-a", "Different revision and text."); b["source_version"] = "v2"
        c = item("c", "source-b", b["text"])
        d = item("d", "source-b", "Independent section of aliased source.")
        result = canonicalize_items([a, b, c, d])
        self.assertEqual(len({i["family_id"] for i in result["items"]}), 1)
        self.assertEqual(len({i["split"] for i in result["items"]}), 1)

    def test_full_source_hash_connects_different_excerpts(self):
        a, b = item(), item("b", "source-b", "Different excerpt.")
        b["source_sha256"] = a["source_sha256"]
        result = canonicalize_items([a, b])
        self.assertEqual(result["items"][0]["family_id"], result["items"][1]["family_id"])

    def test_incomplete_context_remains_held(self):
        x = item(); x["context_complete"] = False
        c = canonicalize_items([x])
        self.assertEqual(c["items"], [])
        self.assertNotIn(x["text"], json.dumps(c["held"]))

    def test_duplicate_identity_holds_all_conflicting_variants(self):
        a, b = item(), item(text="Conflicting content with same ID")
        c = canonicalize_items([a, b])
        self.assertEqual(c["items"], [])
        self.assertEqual(c["manifest"]["counts"]["held"], 2)

    def test_held_conflicting_ids_still_preserve_known_lineage_bridges(self):
        a = item("a", "source-a", "Admitted A")
        b = item("b", "source-b", "Admitted B")
        h1 = item("conflict", "source-a", "Shared held bridge")
        h2 = item("conflict", "source-b", "Shared held bridge")
        c = canonicalize_items([a, b, h1, h2])
        self.assertEqual(len(c["items"]), 2)
        self.assertEqual(len({i["family_id"] for i in c["items"]}), 1)

    def test_long_lineage_does_not_depend_on_python_recursion_depth(self):
        families = _Families()
        for n in range(2000, 0, -1):
            families.union(f"f{n:04}", f"f{n-1:04}")
        self.assertEqual(families.find("f2000"), "f0000")

    def test_ambiguous_json_and_nonfinite_metadata_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "ambiguous.json"
            for raw in ('{"items":[],"items":[]}', '{"items":[],"extra":NaN}'):
                p.write_text(raw)
                with self.assertRaisesRegex(ValueError, "CORPUS_JSON"):
                    import_corpus(p, Path(tmp) / "out")

    def test_reordered_input_is_identical(self):
        values = [item(str(i), "source-" + str(i), "Distinct paragraph " + str(i)) for i in range(50)]
        self.assertEqual(canonical_bytes(canonicalize_items(values)), canonical_bytes(canonicalize_items(list(reversed(values)))))
        self.assertEqual(set(i["split"] for i in canonicalize_items(values)["items"]), {"train", "validation", "test"})

    def test_candidate_mapping_is_not_a_training_label(self):
        c = canonicalize_items([item()])
        p = c["items"][0]["hsn_candidates"][0]
        self.assertFalse(p["used_as_training_label"])
        self.assertEqual(c["items"][0]["training_label_status"], "NO_ACCEPTED_HSN_LABELS")

    def test_invalid_split_configuration_rejected(self):
        for ratios in ((1, 1, 1), (float("nan"), .1, .1), (-.1, .5, .6)):
            with self.assertRaisesRegex(ValueError, "SPLIT_RATIOS"):
                canonicalize_items([item()], split_ratios=ratios)

    def test_immutable_save_and_source_hash_check(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "input.json"; p.write_text(json.dumps([item()]))
            receipt = import_corpus(p, Path(tmp) / "out")
            c = load_corpus(receipt["corpus_path"], receipt["corpus_sha256"])
            self.assertEqual(len(c["items"]), 1)
            with self.assertRaisesRegex(ValueError, "INPUT_SHA256"):
                import_corpus(p, Path(tmp) / "out", expected_sha256="0" * 64)
            p = Path(receipt["corpus_path"]); p.write_bytes(p.read_bytes() + b" ")
            with self.assertRaisesRegex(ValueError, "CORPUS_SHA256"):
                load_corpus(p, receipt["corpus_sha256"])

    def test_load_detects_family_split_leakage_without_external_hash(self):
        a, b = item(), item("b", "source-a", "Another excerpt.")
        c = canonicalize_items([a, b]); c["items"][1]["split"] = "test" if c["items"][0]["split"] != "test" else "train"
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "bad.json"; p.write_bytes(canonical_bytes(c))
            with self.assertRaisesRegex(ValueError, "SPLIT_LEAKAGE"):
                load_corpus(p)


if __name__ == "__main__":
    unittest.main()
