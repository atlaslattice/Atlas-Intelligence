import copy
import hashlib
import json
import os
from pathlib import Path
import tempfile
import unittest

from atlas_work_learning.registry import ARIADNE_SHA256, load_registry, node_record, validate_registry


def fixture():
    d = {"houses": {}, "spheres": {}, "nodes": {}}
    for h in range(1, 13):
        hid = f"H{h:02d}"
        d["houses"][hid] = {"id": hid, "name": hid, "parent": None, "children": [f"{hid}.S{s:02d}" for s in range(1, 13)]}
        for s in range(1, 13):
            sid = f"{hid}.S{s:02d}"
            d["spheres"][sid] = {"id": sid, "name": sid, "parent": hid, "children": [f"{sid}.N{n:02d}" for n in range(1, 13)]}
            for n in range(1, 13):
                nid = f"{sid}.N{n:02d}"
                d["nodes"][nid] = {"id": nid, "name": nid, "parent": sid,
                    "kind": "DOMAIN_SPECIALIZATION" if s <= 7 else "EPISTEMIC_META",
                    "definition": "Synthetic structural fixture", "includes": "Fixture", "excludes": "Real semantic claims",
                    "source_record_sha256": hashlib.sha256(nid.encode()).hexdigest()}
    return d


class RegistryTests(unittest.TestCase):
    def test_complete_structure_and_order(self):
        r = validate_registry(fixture())
        self.assertEqual(r["node_ids"][0], "H01.S01.N01")
        self.assertEqual(r["node_ids"][-1], "H12.S12.N12")
        self.assertEqual(r["node_to_sphere"][-1], 143)
        self.assertEqual(r["sphere_to_house"][-1], 11)

    def test_transposed_role_axis_preserves_totals_but_is_rejected(self):
        d = fixture()
        for node in d["nodes"].values():
            node["kind"] = "DOMAIN_SPECIALIZATION" if int(node["id"][-2:]) <= 7 else "EPISTEMIC_META"
        self.assertEqual(sum(v["kind"] == "DOMAIN_SPECIALIZATION" for v in d["nodes"].values()), 1008)
        with self.assertRaisesRegex(ValueError, "ROLE_AXIS"):
            validate_registry(d)

    def test_cross_house_parent_rejected(self):
        d = fixture(); d["nodes"]["H01.S01.N01"]["parent"] = "H02.S01"
        with self.assertRaisesRegex(ValueError, "PARENT"):
            validate_registry(d)

    def test_missing_scope_definition_rejected(self):
        d = fixture(); del d["nodes"]["H01.S01.N01"]["excludes"]
        with self.assertRaisesRegex(ValueError, "SEMANTICS"):
            validate_registry(d)

    def test_fixture_cannot_impersonate_original_registry(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "registry.json"; p.write_text(json.dumps(fixture()))
            with self.assertRaisesRegex(ValueError, "SHA256_MISMATCH"):
                load_registry(p)
            with self.assertRaisesRegex(ValueError, "UNSUPPORTED_REGISTRY"):
                load_registry(p, hashlib.sha256(p.read_bytes()).hexdigest())

    def test_original_bytes_and_hsn_record(self):
        p = Path(os.environ.get("ATLAS_TEST_REGISTRY", "/home/agent/.codex/plugins/cache/created-by-me-remote/atlasgpt/0.5.51/hsn_navigation_v1/source/ariadne_v07_atlas.json"))
        if not p.is_file():
            self.skipTest("Owner-supplied original registry unavailable")
        r = load_registry(p)
        self.assertEqual(r["sha256"], ARIADNE_SHA256)
        self.assertEqual(node_record(r, "H01.S01.N08")["kind"], "DOMAIN_SPECIALIZATION")
        self.assertEqual(node_record(r, "H01.S08.N01")["kind"], "EPISTEMIC_META")
        with self.assertRaisesRegex(ValueError, "INVALID_HSN"):
            node_record(r, "H00.S00.N00")
        d = node_record(r, "H01.S01.N01"); d["name"] = "mutation"
        self.assertNotEqual(node_record(r, "H01.S01.N01")["name"], "mutation")


if __name__ == "__main__":
    unittest.main()
