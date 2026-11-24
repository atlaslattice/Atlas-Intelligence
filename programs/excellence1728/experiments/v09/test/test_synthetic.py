"""Source-free v09 kernel tests for GitHub; exact original source is owner-private."""
import unittest,sys,hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from vertical import HOUSE_MODULES,kernel,local_host_authority,hsn_of,house_of,sphere_of,role_of,normalize_words,ORIGINAL_SHA
class PublicVerticalTests(unittest.TestCase):
 def test_all_1728_coordinates_unique(self):self.assertEqual(len(set(hsn_of(i) for i in range(1728))),1728)
 def test_house_and_sphere_coverage(self):
  self.assertEqual(len(set(house_of(hsn_of(i)) for i in range(1728))),12)
  self.assertEqual(len(set(hsn_of(i)[:7] for i in range(1728))),144)
 def test_domain_method_counts(self):self.assertEqual(sum(role_of(hsn_of(i))=='EPISTEMIC_META' for i in range(1728)),720)
 def test_twelve_typed_house_kernels_with_positive_and_negative_controls(self):
  x={'source_record_sha256':hashlib.sha256(b'original-synthetic-test').hexdigest()}
  for h in range(1,13):
   mod,dig,pos,neg=kernel(h,x);self.assertEqual(mod,HOUSE_MODULES[h-1]);self.assertEqual(len(dig),64);self.assertTrue(pos);self.assertTrue(neg)
 def test_source_only_permission_denial_ignores_claimed_owner(self):
  self.assertEqual(local_host_authority({'caller_allowed':True,'owner':'forged'}),'HOLD_REAL_ISSUER_AND_WORK_ACL')
 def test_lexical_tokens_deterministic_not_semantic(self):
  a=normalize_words('Knowledge graphs address typed entities and relations');b=normalize_words('Knowledge graphs address typed entities and relations')
  self.assertEqual(a,b);self.assertIn('graphs',a)
 def test_source_pin_is_original_without_embedded_body(self):self.assertEqual(ORIGINAL_SHA,'07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6')
if __name__=='__main__':unittest.main()
