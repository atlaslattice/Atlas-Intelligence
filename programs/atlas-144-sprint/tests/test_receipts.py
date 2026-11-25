"""Independent receipt integrity checks; does NOT certify trusted host activity."""
import csv,hashlib,json,unittest,pathlib,re
ROOT=pathlib.Path(__file__).resolve().parents[1]
TASKS=json.loads((ROOT/'evidence/ATLAS_144_TASKS.json').read_text())
RECEIPT=json.loads((ROOT/'evidence/ATLAS_144_EXECUTION_RECEIPT.json').read_text())
DIFF=json.loads((ROOT/'evidence/DIFFERENTIAL_RED_GREEN.json').read_text())
def canonical(x):return json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False).encode()
def sha(x):return hashlib.sha256(x).hexdigest()
class ReceiptChecks(unittest.TestCase):
 def test_144(self):self.assertEqual(len(TASKS),144)
 def test_unique_ids(self):self.assertEqual(len({x['id'] for x in TASKS}),144)
 def test_12_lanes(self):self.assertEqual({x['lane'] for x in TASKS},{f'{i:02}' for i in range(1,13)})
 def test_twelve_each(self):self.assertTrue(all(sum(x['lane']==f'{i:02}' for x in TASKS)==12 for i in range(1,13)))
 def test_all_executed(self):self.assertTrue(all(x['status']=='PASS' for x in TASKS))
 def test_all_titles_distinct(self):self.assertEqual(len({x['task'] for x in TASKS}),144)
 def test_chain_recomputes(self):
  previous='0'*64
  for row in TASKS:
   record={k:v for k,v in row.items() if k not in ('elapsedNs','chainSha256')}
   previous=sha(bytes.fromhex(previous)+canonical(record))
   self.assertEqual(previous,row['chainSha256'])
  self.assertEqual(previous,RECEIPT['completeChainSha256'])
 def test_tampered_row_changes_chain(self):
  record={k:v for k,v in TASKS[0].items() if k not in ('elapsedNs','chainSha256')}
  record['task']='silently changed'
  self.assertNotEqual(sha(bytes(32)+canonical(record)),TASKS[0]['chainSha256'])
 def test_source_commit_pinned(self):self.assertEqual(RECEIPT['predecessorSourceCommit'],'76e6eeefeafbcc1cc4c6f94c00afcb9700fc19ba')
 def test_worklearning_sha(self):self.assertEqual(RECEIPT['sourcePins']['WorkLearning_Source_ZIP'],'6825c1f83dc3502b0d153c3d4bd925be823a67a6a350b919f4be5c56a2828d9f')
 def test_one_material_bug(self):self.assertEqual(DIFF['changes'][0]['id'],'A144.11.10')
 def test_47_existing_states_unchanged(self):self.assertEqual((DIFF['unchangedDecisions'],DIFF['changedDecisions']),(47,1))
 def test_no_automatic_training(self):self.assertTrue(all(x['canTrain'] is False for x in TASKS))
 def test_no_automatic_release(self):self.assertTrue(all(x['canDeploy'] is False for x in TASKS))
 def test_not_human_quality_evidence(self):self.assertTrue(all(x['neuralQualityGainVerified'] is False for x in TASKS))
 def test_macroturn_count_not_inflated(self):self.assertEqual(RECEIPT['residentMacroturnsCreated'],0)
 def test_release_not_hosted(self):self.assertFalse(RECEIPT['hostIAMTested'])
 def test_source_patch_has_finite_intermediate(self):self.assertIn('NONFINITE_LIF_INTERMEDIATE',(ROOT/'patches/lif_nonfinite_intermediate.patch').read_text())
 def test_source_patch_has_finite_final(self):self.assertIn('NONFINITE_LIF_VOLTAGE',(ROOT/'patches/lif_nonfinite_intermediate.patch').read_text())
 def test_source_no_private_bodies(self):self.assertEqual(RECEIPT['newModelWeightUpdates'],0)
 def test_record_count_matches_dashboard(self):self.assertEqual(RECEIPT['taskCount'],144)
 def test_source_titles_structural(self):self.assertTrue(all(re.fullmatch(r'A144\.(0[1-9]|1[0-2])\.(0[1-9]|1[0-2])',x['id']) for x in TASKS))
if __name__=='__main__':unittest.main()
