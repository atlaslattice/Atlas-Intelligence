"""Host-owned item evidence is derived from the pinned corpus, not a result."""
import copy
import hashlib
import unittest

from atlas_work_learning.corpus import text_sha256
from atlas_work_learning.workspace import source_manifest


REGISTRY = {"id": "ariadne:v0.7", "version": "v0.7", "sha256": "0" * 64,
            "uri": "urn:fixture:registry"}


def record(identifier="item-1", version="v1", text="A verified synthetic source excerpt."):
    return {"id": identifier, "source_id": "source-1", "source_version": version,
            "source_sha256": text_sha256("full document " + version + text),
            "source_uri": "urn:fixture:source-1:" + version,
            "text": text, "text_sha256": text_sha256(text), "aliases": []}


class ItemManifestTests(unittest.TestCase):
    def manifest(self, records):
        return source_manifest({"registry": REGISTRY}, {"items": records})

    def test_no_corpus_has_explicit_empty_inventory(self):
        self.assertEqual(source_manifest({"registry": REGISTRY}),
                         {"sources": [REGISTRY], "items": []})

    def test_same_source_id_versions_keep_exact_item_bindings(self):
        old, new = record(), record("item-2", "v2", "A corrected source excerpt.")
        actual = self.manifest([old, new])
        entries = {r["id"]: r for r in actual["items"]}
        self.assertNotEqual(entries["item-1"]["sourceSha256"], entries["item-2"]["sourceSha256"])
        for row in (old, new):
            entry = entries[row["id"]]
            self.assertEqual((entry["sourceId"], entry["sourceVersion"], entry["sourceSha256"], entry["sourceUri"]),
                             tuple(row[k] for k in ("source_id", "source_version", "source_sha256", "source_uri")))
            self.assertEqual(entry["textSha256"], row["text_sha256"])
            self.assertEqual(entry["excerptSha256"], row["text_sha256"])
            self.assertFalse(entry["excerptTruncated"])

    def test_aliases_remain_dependencies_without_becoming_canonical_items(self):
        item = record()
        item["aliases"] = [{"id": "alias-2", "source_id": "alias-source", "source_version": "v3",
                            "source_sha256": "a" * 64, "source_uri": "urn:fixture:alias"}]
        actual = self.manifest([item])
        self.assertEqual(len(actual["items"]), 1)
        self.assertEqual(actual["items"][0]["id"], "item-1")
        self.assertIn("alias-source", {s["id"] for s in actual["sources"]})

    def test_prefix_uses_code_points_and_preserves_exact_unicode(self):
        text = "🧠" * 1600 + " not part of the returned prefix"
        entry = self.manifest([record(text=text)])["items"][0]
        self.assertEqual(entry["excerptSha256"], hashlib.sha256(("🧠" * 1600).encode("utf-8")).hexdigest())
        self.assertNotEqual(entry["excerptSha256"], hashlib.sha256(("🧠" * 800).encode("utf-8")).hexdigest())
        self.assertTrue(entry["excerptTruncated"])

    def test_exact_prefix_boundary_is_not_truncated(self):
        entry = self.manifest([record(text="x" * 1600)])["items"][0]
        self.assertFalse(entry["excerptTruncated"])
        self.assertEqual(entry["textSha256"], entry["excerptSha256"])

    def test_normalization_is_not_silently_applied(self):
        decomposed = self.manifest([record(text="e\u0301")])["items"][0]
        composed = self.manifest([record(text="\u00e9")])["items"][0]
        self.assertNotEqual(decomposed["excerptSha256"], composed["excerptSha256"])

    def test_deterministic_order_does_not_mutate_input_or_export_bodies(self):
        records = [record("z", "v2"), record("a", "v1")]
        before = copy.deepcopy(records)
        first = self.manifest(records)
        self.assertEqual(first, self.manifest(list(reversed(records))))
        self.assertEqual(records, before)
        for entry in first["items"]:
            self.assertNotIn("text", entry)
            self.assertNotIn("excerpt", entry)

    def test_conflicting_duplicate_item_identity_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "ITEM_MANIFEST_DUPLICATE"):
            self.manifest([record(), record(version="v2")])

    def test_full_text_identity_must_match_actual_item(self):
        forged = record()
        forged["text"] = "Changed text with old identity"
        with self.assertRaisesRegex(ValueError, "ITEM_MANIFEST_TEXT_MISMATCH"):
            self.manifest([forged])


if __name__ == "__main__":
    unittest.main()
