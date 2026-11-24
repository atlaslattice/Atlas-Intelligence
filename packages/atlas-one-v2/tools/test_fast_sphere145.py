"""Public-safe synthetic fixture; never contains original private Ariadne index."""
import csv,hashlib,io,json,re,unittest
from fast_sphere145 import IndexedSpherePerspectives,SphereSourceHold,REGISTRY_SHA

def make():
 rows=[];modes=[]
 for h in range(1,13):
  for s in range(1,13):
   sp=f'H{h:02}.S{s:02}'
   modes.append({'sphere':sp,'mode':'WORK' if len(modes)<104 else 'IMAGINE'})
   for n in range(1,13):
    rows.append({'coordinate':f'{sp}.N{n:02}','house_name':f'House {h}','sphere_name':f'Sphere {h} {s}',
     'node_name':f'Synthetic node {n}','node_kind':'DOMAIN_SPECIALIZATION' if s<=7 else 'EPISTEMIC_META',
     'source_sha256':hashlib.sha256(f'{h}/{s}/{n}'.encode()).hexdigest()})
 out=io.StringIO();w=csv.DictWriter(out,fieldnames=list(rows[0]),delimiter='\t',lineterminator='\n');w.writeheader();w.writerows(rows)
 source=out.getvalue().encode('utf8');mode=json.dumps({'registryDigest':REGISTRY_SHA,'modes':modes},sort_keys=True).encode()
 return source,mode
class FastTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.raw,cls.mode=make();cls.srcHash=hashlib.sha256(cls.raw).hexdigest();cls.modeHash=hashlib.sha256(cls.mode).hexdigest()
 def i(self,raw=None,mode=None,srcHash=None,modeHash=None):
  return IndexedSpherePerspectives(self.raw if raw is None else raw,self.srcHash if srcHash is None else srcHash,
     self.mode if mode is None else mode,self.modeHash if modeHash is None else modeHash)
 def test_inventory(self):
  a,b,c=self.i().profiles();self.assertEqual((len(a),len(b),c['evaluations']),(144,12,269568));self.assertEqual(sum(x['protectedComparisons'] for x in a),144*480)
 def test_exact_parity_with_brute_force_baseline(self):
  idx=self.i();a,b,c=idx.profiles()
  rows=list(csv.DictReader(io.StringIO(self.raw.decode()),delimiter='\t'))
  tokens=[set(re.findall(r'[\w]+',(r['node_name']+' '+r['sphere_name']).lower())) for r in rows]
  for j,sphere in enumerate(a):
   union=set().union(*tokens[j*12:(j+1)*12]);expect=sum(bool(union & ts) for ts in tokens)
   self.assertEqual(sphere['candidateLexicalMatches'],expect)
  for j,house in enumerate(b):
   union=set().union(*tokens[j*144:(j+1)*144]);expect=sum(bool(union & ts) for ts in tokens)
   self.assertEqual(house['lexicalCandidates'],expect)
 def test_status_never_claims_host(self):
  s=self.i().sourceStatus();self.assertFalse(s['liveWorkRightsVerified']);self.assertEqual(s['postsPerformed'],0);self.assertFalse(s['originalRegistryBytesAttested'])
 def test_sha_mismatch_hold(self):
  with self.assertRaises(SphereSourceHold):self.i(srcHash='0'*64)
  with self.assertRaises(SphereSourceHold):self.i(modeHash='0'*64)
 def test_nonbytes_hold(self):
  with self.assertRaises(SphereSourceHold):self.i(raw='not bytes')
 def test_unsupported_edition_hold(self):
  with self.assertRaises(SphereSourceHold):IndexedSpherePerspectives(self.raw,self.srcHash,self.mode,self.modeHash,registry_sha='0'*64)
 def test_wrong_role_hold(self):
  s=self.raw.replace(b'DOMAIN_SPECIALIZATION',b'EPISTEMIC_META',1)
  with self.assertRaises(SphereSourceHold):self.i(raw=s,srcHash=hashlib.sha256(s).hexdigest())
 def test_swapped_mode_same_count_hold_source_digest_changes(self):
  obj=json.loads(self.mode);obj['modes'][0]['mode']='IMAGINE';obj['modes'][-1]['mode']='WORK'
  x=json.dumps(obj).encode()
  with self.assertRaises(SphereSourceHold):self.i(mode=x)
 def test_wrong_node_sha_hold(self):
  s=self.raw.replace(hashlib.sha256(b'1/1/1').hexdigest().encode(),b'bad',1)
  with self.assertRaises(SphereSourceHold):self.i(raw=s,srcHash=hashlib.sha256(s).hexdigest())
 def test_json_mode_duplicate_hold(self):
  obj=json.loads(self.mode);obj['modes'][1]['sphere']=obj['modes'][0]['sphere'];x=json.dumps(obj).encode()
  with self.assertRaises(SphereSourceHold):self.i(mode=x,modeHash=hashlib.sha256(x).hexdigest())
 def test_bad_unicode_hold(self):
  with self.assertRaises(SphereSourceHold):self.i(raw=b'\xff',srcHash=hashlib.sha256(b'\xff').hexdigest())
 def test_deterministic(self):self.assertEqual(self.i().profiles(),self.i().profiles())
 def test_meta_nodes_uniform_sphere(self):
  a,_,_=self.i().profiles();self.assertEqual(a[7]['oppositeKindComparisons'],1008);self.assertEqual(a[0]['oppositeKindComparisons'],720)
 def test_protected_mode_stays_metadata(self):self.assertEqual(self.i().sourceStatus()['authorityEffect'],'NONE')
if __name__=='__main__':unittest.main()
