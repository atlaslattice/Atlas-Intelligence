import json,sys,pathlib,unittest
BASE=pathlib.Path(__file__).resolve().parents[1]
class PortsTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.j=json.loads((BASE/'data'/'COMPONENT_PORTS.json').read_text())
 def test_one_fabric_id(self):self.assertEqual(len(set(x['fabricId'] for x in self.j['components'])),1)
 def test_total_components(self):self.assertEqual(len(self.j['components']),33)
 def test_oss_144_not_implemented(self):self.assertEqual(len(self.j['extensions']),144);self.assertTrue(all(x['status']=='PROPOSED_NOT_IMPLEMENTED' for x in self.j['extensions']))
 def test_no_automatic_permission(self):self.assertTrue(all(x['hostAuthorizationEffect']=='NONE' for x in self.j['components']))
 def test_no_automatic_training(self):self.assertTrue(all(not x['autoTrain'] for x in self.j['components']))
 def test_private_modes_isolated(self):
  protected=[x for x in self.j['components'] if x['scope']=='PRIVATE'];self.assertEqual(len(protected),8)
  self.assertTrue(all(x['ingestBodies'] is False and x['input']=='NONE' for x in protected))
 def test_only_real_kernel_modes_labeled_neuron(self):self.assertEqual([x['id'] for x in self.j['components'] if x['isNeuron']],['worklearning.bge','worklearning.graph24','geometree.router'])
 def test_meta_not_node(self):self.assertFalse(next(x['isNeuron'] for x in self.j['components'] if x['id']=='meta145.e145'))
 def test_oss_ids_are_not_hsn(self):self.assertTrue(all(x['id'].startswith('NEURO.M') for x in self.j['extensions']))
 def test_canon_is_external_gate(self):self.assertEqual(next(x['kind'] for x in self.j['components'] if x['id']=='canon.constitution'),'EXTERNAL_HARD_GATE')
 def test_neural_release_source_pins(self):self.assertEqual(self.j['baselineWorkLearningRuntime'],'76e6eeefeafbcc1cc4c6f94c00afcb9700fc19ba')

if __name__=='__main__':unittest.main()
