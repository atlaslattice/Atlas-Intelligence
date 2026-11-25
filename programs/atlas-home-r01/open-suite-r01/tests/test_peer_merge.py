import unittest
from pathlib import Path
import os
from src.catalog_service import AtlasCatalog
from tools_peer_reconcile import reconcile
P=Path(os.environ.get('ATLAS_PEER_ZIP','/nonexistent/atlas-owner-peer-metadata.zip'))
class PeerMergeTests(unittest.TestCase):
 def test_source_only_crosswalk_without_peer(self):
  import json
  src=Path(__file__).resolve().parents[1] / 'data/peer_desktop55_crosswalk.json'
  p=json.loads(src.read_text())
  self.assertEqual(p['semantic_unique_projects'],63)
  self.assertFalse(p['release_promotion'])
  self.assertEqual(p['counts']['STAGED_PEER_ONLY_NOT_CURATED'],19)
  self.assertTrue(all(not x['can_install'] and not x['license_approved'] for x in p['records']))
 @unittest.skipUnless(P.exists(), 'owner peer ZIP unavailable: exact source replay HELD')
 def test_exact_peer_and_aliases(self):
  r=reconcile(P)
  self.assertEqual(r['semantic_unique_projects'],63)
  self.assertEqual(r['base_catalog_apps'],44)
  self.assertEqual(r['peer_catalog_apps'],55)
  self.assertEqual(r['counts']['ARTCRAFT_ALIAS_NO_DUPLICATE_INSTALL'],17)
  self.assertEqual(len(r['records']),55)
  self.assertTrue(all(a['can_install'] is False for a in r['records']))
 @unittest.skipUnless(P.exists(), 'owner peer ZIP unavailable')
 def test_artcraft_stays_preview(self):
  r=reconcile(P);art=[a for a in r['records'] if a['disposition']=='ARTCRAFT_ALIAS_NO_DUPLICATE_INSTALL']
  self.assertEqual(len(art),17);self.assertTrue(all(a['preview_only'] is True for a in art))
 @unittest.skipUnless(P.exists(), 'owner peer ZIP unavailable')
 def test_staged_peer_unapproved(self):
  r=reconcile(P);staged=[a for a in r['records'] if a['disposition']=='STAGED_PEER_ONLY_NOT_CURATED']
  self.assertEqual(len(staged),19);self.assertTrue(all(a['atlas_id'] is None and a['can_install'] is False for a in staged))
 @unittest.skipUnless(P.exists(), 'owner peer ZIP unavailable')
 def test_wrong_digest_refused(self):
  import tempfile
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'peer.zip';p.write_bytes(P.read_bytes()+b'\x00')
   with self.assertRaises(ValueError):reconcile(p)
if __name__=='__main__':unittest.main()
