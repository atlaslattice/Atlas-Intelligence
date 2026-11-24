import unittest,os,json,tempfile,shutil,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from verify import verify
SOURCE=os.environ.get('ATLAS_ARIADNE_ORIGINAL_FILE');OUT=os.environ.get('ATLAS_CIVILIZATION_OUTPUT')
@unittest.skipUnless(SOURCE and OUT,'Owner-private original Ariadne and materialized results not mounted')
class Independent(unittest.TestCase):
 def test_original_source(self):
  out=verify(SOURCE,OUT)
  self.assertEqual(out['sourceNodes'],1728)
  self.assertEqual(out['sphereExecutions'],144)
  self.assertEqual(out['modules'],12)
  self.assertFalse(out['deployed'])
 def withMutation(self,path,fn):
  with tempfile.TemporaryDirectory() as t:
   shutil.copytree(OUT,Path(t)/'output',dirs_exist_ok=True)
   p=Path(t)/'output'/path;d=json.loads(p.read_text());fn(d);p.write_text(json.dumps(d)+'\n')
   with self.assertRaises(ValueError):verify(SOURCE,Path(t)/'output')
 def test_changed_node_definition_fails(self):self.withMutation('nodes_1728.json',lambda d:d[0].update(definition='FAKE'))
 def test_changed_sphere_digest_fails(self):self.withMutation('sphere_execution_144.json',lambda d:d[1].update(sourcePerspectiveSha256='a'*64))
 def test_forged_local_authority_fails(self):self.withMutation('meta145_unified_build.json',lambda d:d.update(siteDeployed=True))
 def test_forged_module_rights_fails(self):self.withMutation('functional_modules_12.json',lambda d:d[10].update(hostDeployed=True))
 def test_manifest_self_hash_fails(self):self.withMutation('build_receipt.json',lambda d:d.update(actualResidentMacroturns=1728))
 def test_wrong_registry_bytes_fails(self):
  with tempfile.NamedTemporaryFile(delete=True) as f:
   f.write(b'{"fake":true}');f.flush()
   with self.assertRaises(ValueError):verify(f.name,OUT)
if __name__=='__main__':unittest.main()
