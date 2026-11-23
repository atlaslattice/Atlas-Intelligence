"""Bounded, independent tests of deterministic Ariadne source-only circuit."""
import os
import hashlib
import importlib.util
import json
import sqlite3
from contextlib import closing
import tempfile
import unittest
from pathlib import Path

HERE=Path(__file__).resolve().parents[1]
P=(HERE/'code'/'civilization_circuit.py') if (HERE/'code'/'civilization_circuit.py').exists() else HERE/'tools'/'civilization_circuit.py'
spec=importlib.util.spec_from_file_location('atlas_circuit',P)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
REG=Path(os.environ.get('ATLAS_ARIADNE_ORIGINAL_FILE',str(HERE/'private_input'/'ariadne_v07_atlas.json')))
OUT=Path(os.environ.get('ATLAS_1728_CIRCUIT_DIR',str(HERE/'outputs')))

class CircuitTests(unittest.TestCase):
    def test_original_source_exact_sha(self):
        if not REG.exists():self.skipTest('owner original source not mounted')
        self.assertEqual(hashlib.sha256(REG.read_bytes()).hexdigest(),m.SOURCE_SHA)
        r=m.load_original(REG)
        self.assertEqual([len(r[x]) for x in ('houses','spheres','nodes')],[12,144,1728])
    def test_wrong_byte_fails_closed(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'atlas.json';p.write_bytes(b'{"nodes":{}}')
            with self.assertRaisesRegex(m.SourceHold,'SOURCE_DIGEST_MISMATCH'):m.load_original(p)
    def test_input_roles_separate(self):
        if not REG.exists():self.skipTest('owner original source not mounted')
        r=m.load_original(REG)
        self.assertEqual(sum(x['kind']=='DOMAIN_SPECIALIZATION' for x in r['nodes'].values()),1008)
        self.assertEqual(sum(x['kind']=='EPISTEMIC_META' for x in r['nodes'].values()),720)
    def test_all_comparison_and_receipts_sha(self):
        if not (OUT/'manifest.json').exists():self.skipTest('owner output not mounted')
        self.assertTrue(m.verify(OUT)['verified'])
    def test_candidate_links_not_accepted(self):
        if not (OUT/'manifest.json').exists():self.skipTest('owner output not mounted')
        d=json.loads((OUT/'manifest.json').read_text())
        self.assertEqual(d['peerReviewsVerified'],0)
        self.assertEqual(d['semanticallyAcceptedCrossLinks'],0)
        self.assertEqual(d['genuineResidentMacroturns'],0)
        self.assertEqual(d['epistemicMethodCrossPairsNoEquivalence'],102960)
    def test_review_gaps_are_not_fabricated(self):
        if not (OUT/'sphere_reviews_144.json').exists():self.skipTest('owner output not mounted')
        q=json.loads((OUT/'sphere_reviews_144.json').read_text())
        self.assertEqual(len(q),144)
        self.assertTrue(all(len(x['homeNodes'])==12 for x in q))
        self.assertTrue(all(all(c['nodeKind']=='DOMAIN_SPECIALIZATION' for c in x['shortlist']) for x in q))
        self.assertTrue(any(not x['shortlist'] for x in q))
    def test_real_world_role_false_friend(self):
        if not (OUT/'sphere_node_248832.sqlite').exists():self.skipTest('owner output not mounted')
        with closing(sqlite3.connect(OUT/'sphere_node_248832.sqlite')) as c:
            row=c.execute("SELECT risk,disposition FROM evaluations WHERE sphere_id='H01.S05' AND node_id='H08.S01.N10'").fetchone()
            self.assertEqual(row[0],'MUSICAL_INSTRUMENT_FALSE_FRIEND')
            self.assertNotEqual(row[1],'SAME_AS')
    def test_fiction_never_evidence_or_automatic_work(self):
        if not (OUT/'iron_empire_opt_in_seeds_12.json').exists():self.skipTest('owner output not mounted')
        d=json.loads((OUT/'iron_empire_opt_in_seeds_12.json').read_text())
        self.assertEqual(len(d),12)
        self.assertTrue(all(x['mode']=='IMAGINE_OR_PLAY_ONLY' and x['optInRequired'] and x['privacy']['noWorkHarvest'] and x['canonEffect']=='NONE' for x in d))
    def test_manifest_readback_corruption_caught(self):
        if not (OUT/'manifest.json').exists():self.skipTest('owner output not mounted')
        with tempfile.TemporaryDirectory() as d:
            dst=Path(d)
            dst.joinpath('manifest.json').write_bytes((OUT/'manifest.json').read_bytes())
            for name,details in json.loads((OUT/'manifest.json').read_text())['artifacts'].items():
                # tiny empty files trigger SHA failure, without copying the 42 MB matrix
                dst.joinpath(name).write_text('bad')
            with self.assertRaisesRegex(m.SourceHold,'ARTIFACT_SHA_INVALID'):m.verify(dst)

if __name__=='__main__':unittest.main()
