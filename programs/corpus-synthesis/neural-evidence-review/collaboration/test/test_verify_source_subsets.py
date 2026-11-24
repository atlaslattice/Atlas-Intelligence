import unittest, tempfile, json, os, zipfile, hashlib, sys, stat
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'src'))
from verify_source_subsets import verify_source_zip, sha

class TestArchive(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory()
  self.root=Path(self.temp.name)
 def tearDown(self): self.temp.cleanup()
 def make(self,role='MICA', *,bad=None):
  n=29 if role=='MICA' else 60
  data={f'payload/file{i:02d}.txt':f'content{i}'.encode() for i in range(n)}
  if bad=='missing':data.pop('payload/file00.txt')
  digests={k:sha(v) for k,v in data.items()}
  if bad=='tamper':digests['payload/file01.txt']='0'*64
  if bad=='extra':data['private/secret.txt']=b'not allowed'
  manifest={'files':digests} if role=='MICA' else {'sourceFiles':[{'path':k,'sha256':v} for k,v in digests.items()]}
  if bad=='duplicate':
   if role=='MICA': pass
   else:manifest['sourceFiles'][1]['path']=manifest['sourceFiles'][0]['path']
  target=self.root/'source.zip'
  with zipfile.ZipFile(target,'w') as z:
   z.writestr('SOURCE_MANIFEST.json' if role=='MICA' else 'READY_SOURCE_MANIFEST.json',json.dumps(manifest))
   for k,v in data.items():z.writestr(k,v)
   if bad=='traversal':z.writestr('../steal.txt',b'deny')
   if bad=='duplicatezip':z.writestr('payload/file00.txt',b'dup')
   if bad=='symlink':
    link=zipfile.ZipInfo('payload/link.txt');link.create_system=3;link.external_attr=(stat.S_IFLNK | 0o777)<<16
    z.writestr(link,'/etc/hosts')
  return target
 def test_01_valid_mica(self):self.assertEqual(verify_source_zip(self.make(),'MICA')['filesVerified'],29)
 def test_02_valid_omega(self):self.assertEqual(verify_source_zip(self.make('OMEGA'),'OMEGA')['filesVerified'],60)
 def test_03_tamper_mica(self):self.assertIn('HOLD',verify_source_zip(self.make(bad='tamper'),'MICA')['status'])
 def test_04_tamper_omega(self):self.assertIn('HOLD',verify_source_zip(self.make('OMEGA',bad='tamper'),'OMEGA')['status'])
 def test_05_missing(self):self.assertIn('HOLD',verify_source_zip(self.make(bad='missing'),'MICA')['status'])
 def test_06_extra(self):self.assertIn('HOLD',verify_source_zip(self.make(bad='extra'),'MICA')['status'])
 def test_07_wrong_role(self):self.assertIn('HOLD',verify_source_zip(self.make(),'OMEGA')['status'])
 def test_08_bad_expected_sha(self):self.assertIn('HOLD',verify_source_zip(self.make(),'MICA',expected_zip_sha256='f'*64)['status'])
 def test_09_traversal(self):self.assertIn('HOLD',verify_source_zip(self.make(bad='traversal'),'MICA')['status'])
 def test_10_duplicatezip(self):self.assertIn('HOLD',verify_source_zip(self.make(bad='duplicatezip'),'MICA')['status'])
 def test_11_invalid_role(self):self.assertIn('HOLD',verify_source_zip(self.make(),'NEW')['status'])
 def test_12_invalid_archive(self):
  target=self.root/'wrong.zip';target.write_text('not a ZIP')
  self.assertIn('HOLD',verify_source_zip(target,'MICA')['status'])
 def test_13_invalid_missing_file(self):self.assertIn('HOLD',verify_source_zip(self.root/'missing.zip','MICA')['status'])
 def test_14_auth_claim_false(self):
  r=verify_source_zip(self.make(),'MICA');self.assertFalse(r['verifiedHost']);self.assertFalse(r['canDeploy'])
 def test_15_symlink_rejected(self):self.assertIn('HOLD',verify_source_zip(self.make(bad='symlink'),'MICA')['status'])
 def test_16_unknown_zip_digest_not_auth(self):
  p=self.make('OMEGA');r=verify_source_zip(p,'OMEGA',expected_zip_sha256=sha(p.read_bytes()))
  self.assertFalse(r['verifiedHost']);self.assertEqual(r['actualMacroturns'],0)

if __name__=='__main__':unittest.main()
