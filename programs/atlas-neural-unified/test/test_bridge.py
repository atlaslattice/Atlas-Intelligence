import pathlib,sys,unittest,types,hashlib,numpy as np
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from atlas_neural_unified.worklearning_bridge import WorkLearningNeuralPort
from atlas_neural_unified.fabric import NeuralFabricError

A='a'*64;B='b'*64;C='c'*64
class BridgeTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  g=np.random.default_rng(37);a=g.normal(size=(1728,384)).astype('float32');a/=np.linalg.norm(a,axis=1,keepdims=True);cls.x=a
 def source(self):
  return types.SimpleNamespace(manifest={'vectors':'vectors.npz'},files={'vectors.npz':{'sha256':A}},
       node_vectors=self.x,encoder=types.SimpleNamespace(manifest_sha256=B),sha256=C)
 def test_actual_source_contract(self):
  port=WorkLearningNeuralPort.from_existing_integration(self.source());self.assertFalse(port.descriptor()['newEncoderCreated']);self.assertEqual(port.descriptor()['existingIntegrationSha256'],C)
 def test_alpha0_exact_original(self):
  port=WorkLearningNeuralPort.from_existing_integration(self.source());q=self.x[0]
  self.assertEqual(port.prepare_from_existing_query_embedding(q)['hits'][0]['hsn'],'H01.S01.N01')
  self.assertTrue(np.array_equal(port.fabric.baseline(q),port.fabric.routed_scores(q)))
 def test_no_encoder_process(self):
  original=self.source();delattr(original,'encoder')
  with self.assertRaises(NeuralFabricError):WorkLearningNeuralPort.from_existing_integration(original)
 def test_invalid_model_pin(self):
  original=self.source();original.encoder.manifest_sha256='invalid'
  with self.assertRaises(NeuralFabricError):WorkLearningNeuralPort.from_existing_integration(original)
 def test_no_source_path_injection(self):
  original=self.source();original.manifest['vectors']='../../outside'
  with self.assertRaises(NeuralFabricError):WorkLearningNeuralPort.from_existing_integration(original)
 def test_cannot_train_at_attach(self):
  port=WorkLearningNeuralPort.from_existing_integration(self.source());self.assertEqual(port.fabric.learning_steps,0)
if __name__=='__main__':unittest.main()
