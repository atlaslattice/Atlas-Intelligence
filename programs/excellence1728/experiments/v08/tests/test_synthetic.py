"""Public source-free structural regressions. Never claim these synthetic fixtures are real Ariadne bytes."""
import importlib.util,unittest,hashlib,sys
from pathlib import Path
P=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(P))
import codebase_sim as s
class SyntheticCodebasePolicyTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pins=tuple(int(hashlib.sha256(f'public-fixture-{i}'.encode()).hexdigest()[:16],16) for i in range(1728))
  s.init_workers(tuple(f'fixture-{i}' for i in range(1728)),cls.pins)
 def test_unique_combinations(self):self.assertEqual(len(s.INDEX)*len(s.CACHE)*len(s.PREFETCH),1728)
 def test_all_coordinates_mutated_once(self):self.assertEqual(len({s.events_for_year(i)[0] for i in range(1728)}),1728)
 def test_candidate_owns_no_live_authority(self):
  r=s.simulate_one(5);self.assertEqual(r['evaluated_years'],1728);self.assertEqual(r['model_calls'],0);self.assertEqual(r['peer_turns'],0)
 def test_nine_train_evolutions_not_heldout_learning(self):
  r=s.simulate_one(997);self.assertEqual([x['year'] for x in r['epochs']],[144*i for i in range(1,10)])
  self.assertEqual(r['holdout']['queries'],1296)
 def test_correctness_fence(self):
  p=s.Program((8,11,5));p._request(4,0);p._request(4,0)
  self.assertEqual(p.stats()['incorrect_results'],0)
  key=(4,0,0);p.cache[key]=0;p._request(4,0)
  self.assertEqual(p.stats()['incorrect_results'],1)
 def test_rights_epoch_invalidation(self):
  p=s.Program((8,11,5))
  for y in range(97):m,q=s.events_for_year(y);p.year(y,m,q)
  self.assertTrue(all(k[2]==1 for k in p.cache))
 def test_estimated_not_hardware(self):self.assertIn('NOT_HARDWARE_BENCHMARK',s.simulate_one(11)['holdout']['warning'])
 def test_distinct_code_repositories_not_claimed(self):self.assertEqual(s.simulate_one(155)['complete_distinct_code_repositories_built'],0)
if __name__=='__main__':unittest.main()
