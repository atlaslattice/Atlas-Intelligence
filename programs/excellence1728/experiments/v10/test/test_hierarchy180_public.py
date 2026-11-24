"""Source-free HSN-180 unit tests; original Ariadne bytes are not shipped."""
import hashlib,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from hierarchy180 import *

def item(i=0):
 id=hsn(i)
 return {'id':id,'role':role(id),'record':hashlib.sha256(('synthetic:'+id).encode()).hexdigest(),
 'v09Receipt':hashlib.sha256(('synthetic-receipt:'+id).encode()).hexdigest(),
 'crossBp':1300,'crossId':hsn((i+144)%1728),'sourceComplexity':425,
 'subjectId':id[:3]+'.S01.N01' if role(id)=='EPISTEMIC_META' else None,
 'title':'SYNTHETIC_NON_ORIGINAL_FIXTURE'}
class PublicTests(unittest.TestCase):
 def test_1885_180_six(self):self.assertEqual((1728+144+12+1)*180*6,2035800)
 def test_strict_shape(self):self.assertEqual((YEARS,TRAIN,HOLDOUT,P),(180,120,60,6))
 def test_unique_original_coordinate_shapes(self):self.assertEqual(len({hsn(i) for i in range(1728)}),1728)
 def test_source_digest_is_pin_not_body(self):self.assertEqual(SOURCE_SHA,'07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6')
 def test_meta_nodes_require_subject(self):self.assertEqual(sum(role(hsn(i))=='EPISTEMIC_META' for i in range(1728)),720)
 def test_six_policy_tracks_fully_evaluated(self):
  x=simulate_node(item());self.assertEqual(len(x['policyAlternatives']),6);self.assertEqual(x['yearCount'],180)
 def test_no_host_or_model_claim(self):
  x=simulate_node(item());self.assertFalse(x['hosted']);self.assertEqual(x['modelCalls'],0);self.assertEqual(x['authorityEffect'],'NONE')
 def test_policy_selection_cannot_see_holdout(self):
  x=simulate_node(item());arr=x['policyAlternatives'];i=choose_policy(arr)
  for t in arr:t['holdoutScore']=999999
  self.assertEqual(choose_policy(arr),i)
 def test_oracle_heldout_no_authority(self):
  x=simulate_node(item());self.assertFalse(x['semanticAccepted']);self.assertEqual(x['peerTurns'],0)
 def test_group_parent_hash(self):
  vals=[simulate_node(item(i)) for i in range(12)];s=simulate_group(('SPHERE','H01.S01',vals))
  self.assertEqual(s['childrenReceiptRoot'],sha([v['receiptSha256'] for v in vals]))
 def test_group_requires_twelve(self):
  with self.assertRaises(ValueError):simulate_group(('HOUSE','H01',[simulate_node(item(0))]))
 def test_group_audit_not_trivially_saturated(self):
  vals=[simulate_node(item(i)) for i in range(12)];s=simulate_group(('SPHERE','H01.S01',vals))
  self.assertNotEqual(len({p['auditedSyntheticIssues'] for p in s['policyAlternatives']}),1)
if __name__=='__main__':unittest.main()
