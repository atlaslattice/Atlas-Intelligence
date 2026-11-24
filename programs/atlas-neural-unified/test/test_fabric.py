import hashlib,io,json,unittest,sys,pathlib
import numpy as np
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from atlas_neural_unified.fabric import (AtlasOneNeuralFabric,NeuralFabricError,
   IDS,INDEX,HSN,all_coordinates,_ports,_NEIGHBORS,REGISTRY_SHA256,validate_source_registry)

class NeuralFabricTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  rng=np.random.default_rng(145)
  x=rng.normal(size=(1728,384)).astype(np.float32)
  x/=np.linalg.norm(x,axis=1,keepdims=True)
  cls.x=x
  cls.query=x[0].copy()
  cls.pin=hashlib.sha256(x.tobytes()).hexdigest()
 def make(self,**kw):
  return AtlasOneNeuralFabric(self.x,vector_asset_sha256=self.pin,encoder_revision='synthetic-bge384',**kw)
 def test_ids(self):self.assertEqual((len(IDS),len(set(IDS)),IDS[0],IDS[-1]),(1728,1728,'H01.S01.N01','H12.S12.N12'))
 def test_roles(self):self.assertEqual(sum(int(x[5:7])<=7 for x in IDS),1008)
 def test_strict_coords(self):self.assertFalse(HSN.fullmatch('H00.S01.N01'));self.assertFalse(HSN.fullmatch('H01.S13.N01'))
 def test_registry_wrong_digest(self):
  with self.assertRaisesRegex(NeuralFabricError,'ARIADNE_SOURCE_BYTES_MISMATCH'):validate_source_registry(b'{}')
 def test_default_zero_exact_baseline(self):
  f=self.make();a=f.baseline(self.query);b=f.routed_scores(self.query)
  self.assertTrue(np.array_equal(a,b));self.assertEqual(f.descriptor()['trainableGateParameters'],156)
 def test_shuffle_off_exact_baseline(self):
  a=self.make(profile='SHUFFLED_MATCHED');b=self.make(profile='GEOMETREE')
  self.assertTrue(np.array_equal(a.routed_scores(self.query),b.routed_scores(self.query)))
 def test_synthetic_vector_asset_verifier(self):
  buff=io.BytesIO();np.savez(buff,nodes=self.x);raw=buff.getvalue()
  f=AtlasOneNeuralFabric(self.x,vector_asset_sha256=hashlib.sha256(raw).hexdigest(),encoder_revision='synthetic-bge384',vector_asset_bytes=raw)
  self.assertTrue(f.vector_asset_verified);self.assertFalse(f.sources.sourceVerified)
 def test_wrong_vector_sha(self):
  with self.assertRaisesRegex(NeuralFabricError,'NODE_VECTOR_SOURCE_ASSET_DIGEST'):
   self.make(vector_asset_bytes=b'invalid')
 def test_wrong_vector_shape(self):
  with self.assertRaisesRegex(NeuralFabricError,'NODE_VECTORS_INVALID'):
   AtlasOneNeuralFabric(self.x[:1727],vector_asset_sha256=self.pin,encoder_revision='fake-rank')
 def test_nonfinite_node_hold(self):
  x=self.x.copy();x[0,0]=np.inf
  with self.assertRaises(NeuralFabricError):AtlasOneNeuralFabric(x,vector_asset_sha256=self.pin,encoder_revision='fake-rank')
 def test_nonunit_node_hold(self):
  x=self.x.copy();x[0]*=2
  with self.assertRaisesRegex(NeuralFabricError,'NOT_UNIT'):AtlasOneNeuralFabric(x,vector_asset_sha256=self.pin,encoder_revision='fake-rank')
 def test_bad_query_hold(self):
  with self.assertRaisesRegex(NeuralFabricError,'QUERY_VECTOR_INVALID'):self.make().forward([1]*383)
 def test_nonunit_query_hold(self):
  with self.assertRaisesRegex(NeuralFabricError,'QUERY_NOT_UNIT'):self.make().forward(np.ones(384))
 def test_no_text_return(self):
  out=self.make().forward(self.query)
  self.assertEqual(out['status'],'PREPARED_NUMERIC_REVIEW_ONLY')
  self.assertFalse(out['canDiscloseSource']);self.assertFalse(out['canPublish'])
  self.assertTrue(out['sourceBodiesReturned'] is False)
  self.assertEqual(out['hits'][0]['hsn'],'H01.S01.N01')
 def test_topk_stable(self):
  f=self.make();a=f.forward(self.query);b=f.forward(self.query)
  self.assertEqual(a,b);self.assertEqual(len(a['hits']),10)
 def test_topk_bounds(self):
  for k in (0,21,True,2.0):
   with self.assertRaises(NeuralFabricError):self.make().forward(self.query,top_k=k)
 def test_node_neighbors(self):
  a=self.make(house_peers=True);self.assertEqual(a.ports.shape,(12,1728))
  self.assertFalse(np.any(a.ports==np.arange(1728)[None,:]))
  self.assertEqual(a.descriptor()['edgeTerms'],1728*12)
 def test_lower_cross_house(self):
  a=self.make(house_peers=False);self.assertEqual(a.ports.shape,(8,1728))
  self.assertTrue(np.all(a.ports//144==np.arange(1728)//144))
 def test_cubo_degree(self):self.assertTrue(all(len(x)==4 for x in _NEIGHBORS))
 def test_mix_changes(self):
  a=self.make(alpha=.2); self.assertGreater(float(np.max(np.abs(a.baseline(self.query)-a.routed_scores(self.query)))),1e-5)
 def test_wrong_mix_hold(self):
  for alpha in (-1,2,float('nan'),True):
   with self.assertRaises(NeuralFabricError):self.make(alpha=alpha)
 def test_shuffled_different_topology(self):
  a=self.make(profile='GEOMETREE');b=self.make(profile='SHUFFLED_MATCHED')
  self.assertNotEqual(a.descriptor()['topologyDigest'],b.descriptor()['topologyDigest'])
  self.assertEqual(a.ports.shape,b.ports.shape)
 def test_meta_not_extra_neuron(self):
  out=self.make().forward(self.query);self.assertEqual(out['meta145']['extraLatentUnits'],0)
  self.assertEqual(len(out['meta145']['houseMeans']),12)
 def test_live_source_claim_false_without_bytes(self):self.assertFalse(self.make().sources.sourceVerified)
 def test_negative_gate_train_without_eligibility(self):
  f=self.make()
  with self.assertRaisesRegex(NeuralFabricError,'TRAIN_SOURCE_NOT_ELIGIBLE'):
   f.train_synthetic_gates(np.array([self.query]),['H01.S01.N01'],steps=2)
 def test_gate_training_changes_only_156(self):
  f=self.make();before=f.nodes.copy();digest=f.state_digest()
  q=self.x[[0,12,144,288]].copy();ys=[IDS[i] for i in [0,12,144,288]]
  receipt=f.train_synthetic_gates(q,ys,fixture_kind='SYNTHETIC_TEST_ONLY',steps=30,learning_rate=.2)
  self.assertLess(receipt['finalLoss'],receipt['initialLoss']);self.assertEqual(receipt['trainableParameters'],156)
  self.assertTrue(np.array_equal(before,f.nodes));self.assertNotEqual(digest,f.state_digest())
  self.assertFalse(receipt['qualityGeneralizationMeasured'])
 def test_staged_gate_disabled_parity_after_training(self):
  f=self.make();q=self.x[[0,12]].copy();f.train_synthetic_gates(q,[IDS[0],IDS[12]],steps=3,fixture_kind='SYNTHETIC_TEST_ONLY')
  self.assertTrue(np.array_equal(f.baseline(self.query),f.routed_scores(self.query,use_gates=False)))
 def test_gate_weights_are_house_sphere_only(self):
  f=self.make();self.assertEqual((f.house_gates.shape,f.sphere_gates.shape),((12,),(144,)))
 def test_encoder_identity_kept(self):self.assertEqual(self.make().descriptor()['encoderRevision'],'synthetic-bge384')
 def test_unverified_is_not_host(self):self.assertFalse(self.make().forward(self.query)['hostedBindingVerified'])

if __name__=='__main__': unittest.main()
