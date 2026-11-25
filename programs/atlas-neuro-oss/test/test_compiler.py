import unittest,json, pathlib,sys,copy,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
C=json.loads((ROOT/'data/feature_candidates_144.json').read_text())
S=json.loads((ROOT/'data/source_registry.json').read_text())
class TestCorpus(unittest.TestCase):
 def test_144(self):self.assertEqual(len(C['features']),144)
 def test_12(self):self.assertEqual(len(C['engineeringModules']),12)
 def test_unique(self):self.assertEqual(len({f['id'] for f in C['features']}),144)
 def test_slot(self):self.assertEqual(len({f['reviewSlotOnly'] for f in C['features']}),144)
 def test_no_acceptance(self):self.assertTrue(all(f['semanticMappingStatus']=='UNREVIEWED_NO_SAME_AS' for f in C['features']))
 def test_no_deployed(self):self.assertTrue(all(f['adoption']=='PROPOSED_NOT_IMPLEMENTED' for f in C['features']))
 def test_notice_review(self):self.assertTrue(all(x['noticeAndCompatibilityReviewRequired'] for x in S['sources']))
 def test_archived(self):self.assertFalse(next(x for x in S['sources'] if x['repo']=='lava-nc/lava')['codeCopyEligible'])
 def test_source_two_urls(self):self.assertTrue(all(f['primaryUrl'].startswith('https://github.com/') and f['secondaryUrl'].startswith('https://github.com/') for f in C['features']))
 def test_existing_binding(self):self.assertEqual(C['sourceSnapshot']['omegaCore03ZipSha256'],'OWNER_PRIVATE_BINDING_REQUIRED')
 def test_test_naming(self):self.assertTrue(all(f['testThatWouldDisproveIt'] for f in C['features']))
 def test_no_work_post(self):self.assertEqual(C['reportedMetrics']['hostedDeployments'],0)
 def test_openai_not_official(self):self.assertIn('not official host certification',C['integrations'][-1])
 def test_unscanned_not_absent(self):self.assertEqual(sum(f['existingAtlasStatus']=='CANDIDATE_REQUIRES_EXACT_GAP_REVIEW' for f in C['features']),124)
 def test_12_each(self):
  from collections import Counter
  self.assertEqual(sorted(Counter(f['moduleId'] for f in C['features']).values()),[12]*12)
 def test_exact_hs_slots(self):self.assertEqual([C['features'][0]['reviewSlotOnly'],C['features'][-1]['reviewSlotOnly']],['H01.S01','H12.S12'])
if __name__=='__main__': unittest.main()
