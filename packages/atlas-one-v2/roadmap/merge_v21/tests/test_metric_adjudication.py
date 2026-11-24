import unittest, pathlib, sys
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'src'))
from metric_adjudication import paired_preview

def common():
 return dict(metric_id='METRIC.H01.S01.N01',direction='higher',case_ids=[f'case-{i:03d}' for i in range(100)],
   baseline=[i<30 for i in range(100)],candidate=[i<80 for i in range(100)],
   baseline_source_sha='a'*64,candidate_source_sha='a'*64,baseline_runtime_sha='b'*40,
   candidate_runtime_sha='c'*40,negative_cases=5,hard_gate_regressions=0,mode='WORK')
class TestGain(unittest.TestCase):
 def test_synthetic_candidate_not_earned(self):
  v=paired_preview(**common());self.assertEqual(v['status'],'LOCAL_STATISTICAL_CANDIDATE_FOR_REVIEW');self.assertFalse(v['gainEarned']);self.assertEqual(v['absoluteBenefitDelta'],0.5)
 def test_no_change(self):
  x=common();x['candidate']=x['baseline'];self.assertEqual(paired_preview(**x)['status'],'NO_GAIN_ESTABLISHED')
 def test_regression(self):
  x=common();x['baseline'],x['candidate']=x['candidate'],x['baseline'];self.assertEqual(paired_preview(**x)['status'],'NO_GAIN_ESTABLISHED')
 def test_source_drift(self):
  x=common();x['candidate_source_sha']='d'*64;self.assertEqual(paired_preview(**x)['reason'],'SOURCE_EDITION_DRIFT')
 def test_rights_gate_not_offsettable(self):
  x=common();x['hard_gate_regressions']=1;self.assertEqual(paired_preview(**x)['status'],'HOLD')
 def test_negative_cases_required(self):
  x=common();x['negative_cases']=2;self.assertEqual(paired_preview(**x)['status'],'HOLD')
 def test_host_mode_denied(self):
  x=common();x['mode']='IMAGINE';self.assertEqual(paired_preview(**x)['status'],'HOLD')
 def test_unpinned_code_denied(self):
  x=common();x['candidate_runtime_sha']='x'*40;self.assertEqual(paired_preview(**x)['status'],'HOLD')
 def test_nonboolean_denied(self):
  x=common();x['candidate'][0]=1;self.assertEqual(paired_preview(**x)['status'],'HOLD')
 def test_short_holdout_denied(self):
  x=common();x['case_ids']=x['case_ids'][:20];x['baseline']=x['baseline'][:20];x['candidate']=x['candidate'][:20];self.assertEqual(paired_preview(**x)['status'],'HOLD')
 def test_duplicate_case_denied(self):
  x=common();x['case_ids'][0]=x['case_ids'][1];self.assertEqual(paired_preview(**x)['status'],'HOLD')
 def test_lower_direction(self):
  x=common();x['direction']='lower';x['baseline']=[i<80 for i in range(100)];x['candidate']=[i<20 for i in range(100)];self.assertEqual(paired_preview(**x)['status'],'LOCAL_STATISTICAL_CANDIDATE_FOR_REVIEW')
 def test_small_change_not_significant(self):
  x=common();x['candidate']=[i<32 for i in range(100)];self.assertEqual(paired_preview(**x)['status'],'NO_GAIN_ESTABLISHED')
if __name__=='__main__':unittest.main()
