"""Project source-to-review integration actually calls the real Atlas v0.2 circuit."""
import copy,sys,unittest,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'interop'))
import atlas_one_circuit as atlas
from atlas_fabric import load_json_strict
from atlas_one_unity.circuit import unified_review,UnityHold

class SourceOnlyNoosphere:
    @staticmethod
    def validate_ingestion(packet):
        class Result:
            state='SOURCE_REPORTED_ONLY';authority='none';payload=copy.deepcopy(packet)
        return Result()

class UnityCircuit(unittest.TestCase):
    def setUp(self):
        self.fabric=load_json_strict(ROOT/'interop/atlas_project_manifest.v0.1.json')
        self.packet=load_json_strict(ROOT/'interop/atlas_collision_h01.work.v0.2.json')
    def review(self,**kwargs):
        return unified_review(self.fabric,self.packet,atlas_circuit=atlas,
                              noosphere=SourceOnlyNoosphere(),backlog=[],**kwargs)
    def test_actual_eight_event_circuit(self):
        out=self.review();self.assertEqual(out['atlas_events'],8)
        self.assertEqual(out['authority'],'NONE');self.assertFalse(out['deployed'])
        self.assertEqual(out['coordinate_pair']['relationship'],
                         'ARBITRARY_REVERSIBLE_INDEX_ALIGNMENT_NOT_SEMANTIC_EQUIVALENCE')
        self.assertEqual(out['actual_model_calls'],0)
    def test_no_actual_broker_post(self):
        self.assertFalse(self.review()['can_post_work'])
        self.assertEqual(self.review()['actual_broker_posts'],0)
    def test_source_only_receipt_replays(self):
        self.assertEqual(self.review()['local_receipt_sha256'],self.review()['local_receipt_sha256'])
    def test_no_source_metadata_mutation(self):
        p=copy.deepcopy(self.packet);f=copy.deepcopy(self.fabric);self.review();
        self.assertEqual(p,self.packet);self.assertEqual(f,self.fabric)
    def test_private_mode_denied(self):
        self.packet['input_scope']='PLAY'
        with self.assertRaises(UnityHold):self.review()
    def test_model_turn_forgery_denied(self):
        self.packet['model_calls']=1
        with self.assertRaises(UnityHold):self.review()
    def test_post_forgery_denied(self):
        self.packet['posted_messages']=1
        with self.assertRaises(UnityHold):self.review()
    def test_wrong_noosphere_interface_denied(self):
        with self.assertRaises(UnityHold):unified_review(self.fabric,self.packet,atlas_circuit=atlas,noosphere=object(),backlog=[])
    def test_noosphere_authority_forgery_denied(self):
        class Forged:
            @staticmethod
            def validate_ingestion(p):
                class R: state='SOURCE_REPORTED_ONLY';authority='human_root'
                return R()
        with self.assertRaises(UnityHold):unified_review(self.fabric,self.packet,atlas_circuit=atlas,noosphere=Forged(),backlog=[])
    def test_host_impersonation_cannot_authorize(self):
        x=self.review(host_snapshot={'hosted':True,'residentAuthenticated':True,'canPublish':True})
        self.assertFalse(x['can_publish'])
    def test_revoked_return_denied(self):
        x=self.review(return_grant={'issuer':'host','epoch':3},fresh_grant={'issuer':'host','epoch':4,'revoked':True})
        self.assertEqual(x['return_gate']['status'],'HELD_REVOKED_OR_SUPERSEDED')
    def test_ci_failure_not_a_python_assertion(self):
        x=self.review(ci_run={'conclusion':'failure','steps':[]})
        self.assertEqual(x['ci']['root_cause'],'UNKNOWN')
    def test_science_cannot_overwrite_conservation(self):
        x=self.review(science_cases=[{'evidence_state':'SPECULATIVE','physical_conservation_verified':False}])
        self.assertEqual(x['science']['verdicts'],['HELD_HARD_CONSTRAINT'])
    def test_public_module_import_requires_git_pin(self):
        from atlas_one_unity.demo import load_noosphere
        from pathlib import Path
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'code.py';p.write_text('a=1\n')
            with self.assertRaisesRegex(RuntimeError,'blob_not_on_audited_allowlist'):
                load_noosphere(p,'0'*40)
            with self.assertRaisesRegex(RuntimeError,'git_blob_mismatch'):
                load_noosphere(p,'70dc375cb7d6ed931b40c3b2b82642d5312cdcb3')
            with self.assertRaisesRegex(RuntimeError,'git_blob_required'):
                load_noosphere(p,'not-a-digest')
    def test_never_merge_close_from_listing(self):
        x=self.review();self.assertFalse(x['can_merge_prs']);self.assertFalse(x['can_close_issues'])

if __name__=='__main__':unittest.main()
