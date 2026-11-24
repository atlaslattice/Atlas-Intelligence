import importlib.util,json,os,pathlib,tempfile,unittest,shutil
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('merge_check',pathlib.Path(__file__).with_name('check.py'))
checker=importlib.util.module_from_spec(spec);spec.loader.exec_module(checker)
R=os.environ.get('MERGE_ROADMAP_ROOT','');U=os.environ.get('MERGE_UNIFIED_ROOT','')
S=os.environ.get('MERGE_ARIADNE_SOURCE','');T=os.environ.get('MERGE_OPENALEX_SOURCE','')
READY=all([R,U,S,T]) and all(pathlib.Path(v).exists() for v in [R,U,S,T])

class PortableContract(unittest.TestCase):
 def test_h08_mode_restriction_in_code(self):
  body=(ROOT/'src/compiler.py').read_text()
  self.assertIn('OPTIONAL_LOCAL_IMAGINE_OPT_IN_ONLY;NO_WORK_AUTO_INVOKE',body)
  self.assertIn('WORK_METADATA_ONLY_NO_CREATIVE_BODY',body)
  self.assertIn("'privateCreativeBodyExportAllowed':False",body)
 def test_distinct_source_and_excellence_namespaces(self):
  self.assertNotEqual(checker.ARIADNE,checker.EXCELLENCE)
  self.assertEqual(len(checker.CAPABILITIES),12)
 def test_no_external_runtime_tools(self):
  body=pathlib.Path(__file__).with_name('check.py').read_text()
  for s in ('requests.get(', 'httpx.', 'subprocess.run(', 'git push', 'permissionGranted=True'):
   self.assertNotIn(s,body)
 def test_private_bytes_not_in_public_bundle(self):
  names=[x.name for x in ROOT.rglob('*') if x.is_file()]
  self.assertNotIn('ariadne_original_v07.json',names)
  self.assertNotIn('openalex_historical_4516.csv',names)

@unittest.skipUnless(READY,'Requires owner-private source inputs for exact integration audit')
class OriginalSourceMerge(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.base=checker.compare(R,U,S,T)
 def test_1728_exact_nodes_match(self):
  r,n=self.base
  self.assertEqual(r['nodesMatched'],1728)
  self.assertEqual(len({x['coordinate'] for x in n}),1728)
 def test_full_144_and_twelve_modules(self):
  r,_=self.base
  self.assertEqual((r['spheresMatched'],r['housesMatched']),(144,12))
  self.assertEqual(r['separateOptionalCreativeH08SpherePaths'],12)
 def test_1728_metric_namespace_not_colliding(self):
  r,n=self.base
  self.assertEqual(r['metricNamespacesSeparated'],1728)
  self.assertTrue(all(x['roadmapMetricId']!=x['gf9AlgorithmMetricId'] for x in n))
 def test_no_false_implementation_promotions(self):
  r,n=self.base
  self.assertFalse(r['productionMergeReady'])
  self.assertEqual(r['nodeBehaviorImprovementsIndependentlyValidated'],0)
  self.assertTrue(all(x['status']=='SOURCE_COMPATIBLE_NOT_BEHAVIORALLY_INTEGRATED' for x in n))
 def test_tamper_source_bytes_fail_closed(self):
  with tempfile.TemporaryDirectory() as t:
   b=bytearray(pathlib.Path(S).read_bytes());b[-12]^=1;p=pathlib.Path(t)/'modified.json';p.write_bytes(b)
   with self.assertRaisesRegex(ValueError,'SOURCE_BYTES_CHANGED'):checker.compare(R,U,p,T)
 def _mutate_root(self,f,mut):
  with tempfile.TemporaryDirectory() as t:
   x=pathlib.Path(t)
   for name in ['ROADMAP_ROOT.json','HOUSE_MODULES_12.json','SPHERE_PATHWAYS_144.jsonl','NODE_SEEDS_1728.jsonl','METRICS_1728.jsonl']:
    src=pathlib.Path(R)/name; dst=x/name
    if name==f:
     if name.endswith('.jsonl'):
      lines=src.read_text().splitlines();v=json.loads(lines[0]);mut(v);lines[0]=json.dumps(v);dst.write_text('\n'.join(lines)+'\n')
     else:
      v=json.loads(src.read_text());mut(v);dst.write_text(json.dumps(v)+'\n')
    else:dst.symlink_to(src)
   checker.compare(x,U,S,T)
 def test_excellence_positional_equivalence_is_denied(self):
  with self.assertRaisesRegex(ValueError,'TASK_NAMESPACE_COLLISION'):
   self._mutate_root('ROADMAP_ROOT.json',lambda v:v.update(existingProgramEquivalence='SAME_AS'))
 def test_false_metric_gain_is_denied(self):
  with self.assertRaisesRegex(ValueError,'FALSE_GAIN_CLAIM'):
   self._mutate_root('METRICS_1728.jsonl',lambda v:v.update(achievementStatus='EARNED'))
 def test_h08_wrong_mode_is_denied(self):
  # The first affected path is H08.S01, not the first H01 line.
  with tempfile.TemporaryDirectory() as t:
   x=pathlib.Path(t)
   for f in ['ROADMAP_ROOT.json','HOUSE_MODULES_12.json','SPHERE_PATHWAYS_144.jsonl','NODE_SEEDS_1728.jsonl','METRICS_1728.jsonl']:
    src=pathlib.Path(R)/f
    if f!='SPHERE_PATHWAYS_144.jsonl':(x/f).symlink_to(src)
    else:
     vals=[json.loads(z) for z in src.read_text().splitlines() if z.strip()]
     vals[84]['rightsMode']='WORK_SOURCE_METADATA_ONLY'
     (x/f).write_text(''.join(json.dumps(z)+'\n' for z in vals))
   with self.assertRaisesRegex(ValueError,'H08_MODE_CONFLICT'):checker.compare(x,U,S,T)

if __name__=='__main__':unittest.main()
