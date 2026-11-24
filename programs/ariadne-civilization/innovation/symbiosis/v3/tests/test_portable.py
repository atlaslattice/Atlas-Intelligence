"""Portable synthetic fixture tests. No original owner source or network needed."""
import hashlib,json,pathlib,shutil,struct,subprocess,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class LongHorizonPortable(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  if shutil.which('g++') is None:raise unittest.SkipTest('g++ unavailable')
  cls.d=tempfile.TemporaryDirectory()
  cls.dir=pathlib.Path(cls.d.name);cls.exe=cls.dir/'sim'
  subprocess.run(['g++','-O2','-std=c++17',str(ROOT/'src/long_horizon.cpp'),'-o',str(cls.exe)],check=True)
  cls.good=cls.dir/'synthetic.tsv'
  cls.good.write_text(''.join(f'{i} {i//144+1} {(i%144)//12+1} {int((i%144)//12>=7)} {i%421} {int(hashlib.sha256(str(i).encode()).hexdigest()[:16],16)}\n' for i in range(1728)))
 @classmethod
 def tearDownClass(cls):cls.d.cleanup()
 def call(self,house='1',repeat='8',index=None):
  path=index or self.good;return subprocess.run([str(self.exe),str(path),house,repeat,str(self.dir/'o.bin'),str(self.dir/'o.json')],text=True,capture_output=True)
 def test_positive_144_nodes(self):
  x=self.call();self.assertEqual(x.returncode,0,x.stderr);r=json.loads((self.dir/'o.json').read_text());self.assertEqual(r['sourceNodes'],144)
 def test_1728_year_horizon(self):
  self.call();r=json.loads((self.dir/'o.json').read_text());self.assertEqual(r['fictionalYearsPerScenario'],1728);self.assertEqual(r['epochsPerScenario']*r['fictionalYearsPerEpoch'],1728)
 def test_no_external_claims(self):
  self.call();r=json.loads((self.dir/'o.json').read_text());self.assertEqual((r['actualMacroturns'],r['externalModelCalls'],r['semanticEdgesAccepted']), (0,0,0))
 def test_exact_binary_record_cardinality(self):
  self.call();self.assertEqual((self.dir/'o.bin').stat().st_size,144*8*20)
 def test_holds_survive(self):
  self.call();r=json.loads((self.dir/'o.json').read_text());self.assertEqual(r['aggregate']['noViable'],r['aggregate']['wins'][3]);self.assertGreater(r['aggregate']['noViable'],0)
 def test_model_no_forced_perfection(self):
  self.call();r=json.loads((self.dir/'o.json').read_text());self.assertLess(sum(r['aggregate']['wins'][:3]),r['aggregate']['cases'])
 def test_same_seed_deterministic(self):
  self.call();a=hashlib.sha256((self.dir/'o.bin').read_bytes()).hexdigest();self.call();self.assertEqual(a,hashlib.sha256((self.dir/'o.bin').read_bytes()).hexdigest())
 def test_unsupported_house_holds(self):self.assertNotEqual(self.call('13').returncode,0)
 def test_unsupported_repeats_holds(self):self.assertNotEqual(self.call('1','1729').returncode,0)
 def test_missing_input_holds(self):self.assertNotEqual(self.call(index=self.dir/'absent').returncode,0)
 def test_wrong_source_cardinality_holds(self):
  bad=self.dir/'one.tsv';bad.write_text('0 1 1 0 100 1\n');self.assertNotEqual(self.call(index=bad).returncode,0)
 def test_wrong_type_holds(self):
  bad=self.dir/'badtype.tsv';rows=self.good.read_text().splitlines();rows[0]=rows[0].replace(' 0 0 ',' 1 0 ',1);bad.write_text('\n'.join(rows)+'\n');self.assertNotEqual(self.call(index=bad).returncode,0)
 def test_all_three_strategy_budgets_equal(self):
  self.call();r=json.loads((self.dir/'o.json').read_text());self.assertEqual(len(r['modelPolicyNames']),3);self.assertEqual(sum(r['aggregate']['wins']),r['aggregate']['cases'])
 def test_every_binary_record_has_magic(self):
  self.call();raw=(self.dir/'o.bin').read_bytes();self.assertTrue(all(struct.unpack_from('<H',raw,i+18)[0]==0xA145 for i in range(0,len(raw),20)))
 def test_orig_raw_source_not_attested(self):
  self.call();r=json.loads((self.dir/'o.json').read_text());self.assertIs(r['sourceCoordinatesOriginalRegistryReverified'],False)
if __name__=='__main__':unittest.main()
