import sys, pathlib, unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from atlas_neural_unified.workboard import prepare_component_record, PreparedWorkboardIndex,WorkboardError

SHA='a'*64

def item(**kw):
 defaults=dict(source_id='work:source-1',source_revision='r1',source_digest=SHA,hsn='H05.S06.N12',
               card_id='atlas_work_card_0001',component_id='AtlasNeuralFabric')
 return prepare_component_record(**(defaults|kw))

class WorkboardTests(unittest.TestCase):
 def test_prepare_body_free(self):self.assertFalse(item()['sourceBodiesIncluded'])
 def test_prepare_source_scope(self):
  for mode in ['PLAY','IMAGINE','SOCIAL','PRIVATE','HABITAT']:
   with self.assertRaises(WorkboardError):item(source_mode=mode)
 def test_no_plaintext(self):
  with self.assertRaises(WorkboardError):item(source_text='private content')
 def test_wrong_coord(self):
  with self.assertRaises(WorkboardError):item(hsn='H00.S01.N01')
 def test_wrong_hash(self):
  with self.assertRaises(WorkboardError):item(source_digest='wrong')
 def test_idempotence(self):
  w=PreparedWorkboardIndex();a=w.put(item());b=w.put(item());self.assertEqual(a.revision,b.revision)
  self.assertEqual((a.action,b.action),('PREPARED_NEW','NO_CHANGE'))
 def test_index_revision_fingerprint(self):
  w=PreparedWorkboardIndex();before=w.index_revision;w.put(item());self.assertNotEqual(before,w.index_revision)
 def test_across_four_consumers_identical(self):
  w=PreparedWorkboardIndex();w.put(item())
  query=lambda r:True
  results=[w.lookup('H05.S06.N12',consumer=name,purpose_check=query,disclosure_check=query) for name in ['AtlasONE','AtlasGPT','SwarmChatWork','Ariadne']]
  self.assertEqual([x['references'] for x in results],[results[0]['references']]*4)
  self.assertEqual(len({x['indexRevision'] for x in results}),1)
  self.assertFalse(any(x['hostVerified'] for x in results))
 def test_denied_use_blocks(self):
  w=PreparedWorkboardIndex();w.put(item());r=w.lookup('H05.S06.N12',purpose_check=lambda _:False,disclosure_check=lambda _:True)
  self.assertEqual(r['references'],[])
 def test_denied_return_blocks(self):
  w=PreparedWorkboardIndex();w.put(item());r=w.lookup('H05.S06.N12',purpose_check=lambda _:True,disclosure_check=lambda _:False)
  self.assertEqual(r['references'],[])
 def test_unknown_permission_holds(self):
  w=PreparedWorkboardIndex();w.put(item());r=w.lookup('H05.S06.N12');self.assertEqual(r['status'],'HOLD_CURRENT_HOST_AUTHORITY_REQUIRED')
 def test_revocation_deletes_access_not_history(self):
  w=PreparedWorkboardIndex();w.put(item());before=w.index_revision;w.withdraw('work:source-1')
  r=w.lookup('H05.S06.N12',purpose_check=lambda _:True,disclosure_check=lambda _:True)
  self.assertEqual(r['references'],[]);self.assertNotEqual(before,w.index_revision)
  self.assertEqual(len(w._history),2)
 def test_repeat_revocation_no_change(self):
  w=PreparedWorkboardIndex();w.put(item());w.withdraw('work:source-1');a=w.withdraw('work:source-1');self.assertEqual(a.action,'NO_CHANGE')
 def test_immutable_card_conflict(self):
  w=PreparedWorkboardIndex();w.put(item())
  with self.assertRaises(WorkboardError):w.put(item(source_revision='r2'))
 def test_rejected_identity_change(self):
  w=PreparedWorkboardIndex(trusted_bindings={'atlas_work_card_0001':{
       'hsn':'H05.S06.N12','sourceId':'work:source-1','sourceDigest':SHA}})
  bad=item();bad['hsn']='H05.S06.N11'
  with self.assertRaisesRegex(WorkboardError,'TRUSTED_SOURCE_REFERENCE_MISMATCH'):w.put(bad)
 def test_rejected_forged_acceptance(self):
  w=PreparedWorkboardIndex();bad=item();bad['semanticAccepted']=True
  with self.assertRaises(WorkboardError):w.put(bad)
 def test_strict_inventory_requires_known_card(self):
  w=PreparedWorkboardIndex(trusted_bindings={})
  with self.assertRaises(WorkboardError):w.put(item())
 def test_no_publication(self):
  w=PreparedWorkboardIndex();w.put(item());r=w.lookup('H05.S06.N12',purpose_check=lambda _:True,disclosure_check=lambda _:True)
  self.assertFalse(r['canPublish']);self.assertFalse(r['canTrain'])
 def test_wrong_consumer(self):
  with self.assertRaises(WorkboardError):PreparedWorkboardIndex().lookup('H05.S06.N12',consumer='Play')
 def test_withheld_source_not_reinjected(self):
  w=PreparedWorkboardIndex();w.put(item());w.withdraw('work:source-1')
  with self.assertRaises(WorkboardError):w.put(item())

if __name__=='__main__':unittest.main()
