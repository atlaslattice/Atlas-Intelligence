import unittest,json,pathlib,math,sys
sys.path.insert(0,str(pathlib.Path(__file__).parent));from chladni_check import evaluate
p=json.loads(pathlib.Path(__file__).with_name('published_chladni_2026.json').read_text())
class TestChladni(unittest.TestCase):
 def test_external_pairs_are_real_data_not_claimed_atlas(self):
  x=evaluate(p);self.assertEqual(x['status'],'PUBLISHED_PAIRS_COMPUTED');self.assertEqual(x['sampleCount'],5)
  self.assertAlmostEqual(x['rmseHz'],131.44182561118,places=7)
  self.assertFalse(x['physicalGlyphMappingEstablished']);self.assertFalse(x['atlasPhysicalExperimentPerformed'])
 def test_claim_atlas_measurements_without_data_fails(self):
  x={**p,'measuredByAtlas':True};self.assertEqual(evaluate(x)['status'],'HOLD_UNVERIFIED_PHYSICAL_SOURCE')
 def test_no_arbitrary_hexagram_frequency_allowed(self):
  x={**p,'atlasGlyphToHzCalibration':'assigned-by-symbolism'}
  self.assertEqual(evaluate(x)['status'],'HOLD_UNVERIFIED_PHYSICAL_SOURCE')
 def test_bad_and_missing_pairs_hold(self):
  self.assertEqual(evaluate({**p,'pairs':[]})['status'],'HOLD_INSUFFICIENT_DATA')
  z=json.loads(json.dumps(p));z['pairs'][0]['experimentalHz']=float('nan')
  self.assertEqual(evaluate(z)['status'],'HOLD_INVALID_FREQUENCIES')
if __name__=='__main__':unittest.main()
