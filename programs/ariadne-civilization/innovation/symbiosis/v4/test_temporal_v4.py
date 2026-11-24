"""Source-only temporal bootstrap critique; synthetic controls, no private source reads."""
import unittest, pathlib, sys
import numpy as np
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
from temporal_review import bootstrap,lag_stat,null_control

class TemporalV4(unittest.TestCase):
    def test_constant_zero_ci(self):
        x=bootstrap(np.zeros((12,432)),block=48,draws=75)
        self.assertEqual(x['twoWayBlockBootstrap95'],[0.0,0.0])
    def test_constant_positive_ci(self):
        x=bootstrap(np.full((12,432),.01),block=96,draws=75)
        self.assertAlmostEqual(x['meanSyntheticDelta'],.01)
        self.assertTrue(all(abs(v-.01)<1e-10 for v in x['twoWayBlockBootstrap95']))
    def test_wrong_rows_holds(self):
        with self.assertRaises(AssertionError):bootstrap(np.zeros((11,432)),draws=25)
    def test_wrong_time_holds(self):
        with self.assertRaises(AssertionError):bootstrap(np.zeros((12,431)),draws=25)
    def test_bad_block_holds(self):
        with self.assertRaises(AssertionError):bootstrap(np.zeros((12,432)),block=17,draws=25)
    def test_repeatability(self):
        q=np.arange(12*432,dtype=float).reshape(12,432)*1e-7
        self.assertEqual(bootstrap(q,block=24,seed=314,draws=80),bootstrap(q,block=24,seed=314,draws=80))
    def test_zero_lag(self):self.assertEqual(lag_stat(np.zeros(432),1),0)
    def test_lag_signal(self):
        v=np.arange(432,dtype=float)
        self.assertAlmostEqual(lag_stat(v,1),1)
    def test_lag_bounds(self):
        with self.assertRaises(AssertionError):lag_stat(np.arange(10),10)
    @classmethod
    def setUpClass(cls):cls.null=null_control(worlds=24,draws=120,rho=.94)
    def test_shared_temporal_shocks_break_iid_ci(self):
        n=self.null['falseZeroExclusionCounts'];self.assertGreater(n['1'],12)
    def test_longer_blocks_not_magic(self):
        n=self.null['falseZeroExclusionCounts'];self.assertGreater(n['48'],0)
    def test_temporal_null_separate_from_science(self):
        self.assertEqual(self.null['status'],'SYNTHETIC_NULL_ONLY')
        self.assertEqual(self.null['trueEffect'],0)
        self.assertTrue(self.null['calibrationNotGuaranteedByAnyBlock'])
if __name__=='__main__': unittest.main()
