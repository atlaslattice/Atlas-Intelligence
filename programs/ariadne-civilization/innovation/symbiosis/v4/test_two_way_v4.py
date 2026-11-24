"""Standalone peer-inspired null-world and two-way bootstrap checks, no owner data."""
import unittest, pathlib, sys, numpy as np
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
from two_way_review import two_way_diff,null_control,scores_for_policy

class TwoWayPeerReview(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.null=null_control(worlds=30,draws=300)
 def test_zero_returns_zero(self):
  v=two_way_diff(np.zeros((12,432)),draws=50)
  self.assertEqual(v['delta'],0)
  self.assertEqual(v['twoWayHouseChallenge95'],[0.0,0.0])
 def test_constant_positive_returns_same(self):
  v=two_way_diff(np.ones((12,432))*.01,draws=50)
  self.assertAlmostEqual(v['delta'],.01,places=9)
 def test_negative_house_preserved(self):
  m=np.ones((12,432))*.001;m[0]=-0.01
  self.assertEqual(two_way_diff(m,draws=50)['negativeHouseCount'],1)
 def test_bootstrap_has_12_clusters(self):self.assertEqual(two_way_diff(np.zeros((12,432)),draws=50)['samplingUnits']['houses'],12)
 def test_bootstrap_has_432_challenges(self):self.assertEqual(two_way_diff(np.zeros((12,432)),draws=50)['samplingUnits']['sharedChallengeIndices'],432)
 def test_wrong_house_dim_holds(self):
  with self.assertRaises(AssertionError):two_way_diff(np.zeros((11,432)),draws=20)
 def test_wrong_challenge_dim_holds(self):
  with self.assertRaises(AssertionError):two_way_diff(np.zeros((12,431)),draws=20)
 def test_shared_shock_false_precision_exposed(self):self.assertGreater(self.null['falseExclusions']['HOUSE_ONLY'],20)
 def test_two_way_improves_null_coverage(self):self.assertLess(self.null['falseExclusions']['TWO_WAY'],11)
 def test_one_source_action_per_sphere(self):
  arr=np.zeros((1728,432,4));arr[:,:,2]=0.75
  out=scores_for_policy(arr,[2]*144)
  self.assertEqual(out.shape,(12,432));self.assertTrue(np.all(out==.75))
 def test_reject_out_of_bounds_action(self):
  arr=np.zeros((1728,432,4))
  with self.assertRaises(AssertionError):scores_for_policy(arr,[4]*144)
 def test_reject_missing_sphere(self):
  arr=np.zeros((1728,432,4))
  with self.assertRaises(AssertionError):scores_for_policy(arr,[0]*143)
if __name__=='__main__':unittest.main()
