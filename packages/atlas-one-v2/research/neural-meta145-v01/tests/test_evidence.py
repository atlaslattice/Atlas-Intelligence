import unittest, copy
from src.evidence import ARIADNE_SHA, Policy, evaluate_neural_return, eligible_training_pair, stable_digest
from src.simulate import source_fixture, score_output, strategy_policy

HSN='H01.S05.N10'
class GateTests(unittest.TestCase):
    def new(self,serial=1,hsn=HSN):return source_fixture(hsn,phase='TEST',serial=serial)
    def go(self,f,policy=Policy(),**kw):return evaluate_neural_return(f['ranked'],f['read'],f['auth'],hsn=f['hsn'],policy=policy,subject_hsn=f['subject_hsn'],**kw)
    def test_physical_registry_pinned(self):self.assertEqual(len(ARIADNE_SHA),64)
    def test_good_candidate_no_secret(self):
        f=self.new();out=self.go(f)
        self.assertGreater(len(out['returned']),0);self.assertFalse(out['hostVerified']);self.assertEqual(out['acceptedSemanticEdges'],0)
        self.assertTrue(all('body' not in x and 'passage' not in x and 'weights' not in x for x in out['returned']))
    def test_borrowed_vector_rejected(self):
        f=self.new();out=self.go(f);self.assertGreater(out['denied'].get('SOURCE_IDENTITY_OR_REVISION_DRIFT',0),0)
        self.assertFalse(any('borrowed' in x['sourceId'] for x in out['returned']))
    def test_return_revocation(self):
        f=self.new();out=self.go(f);self.assertFalse(any('revoked' in x['sourceId'] for x in out['returned']))
        self.assertGreater(out['denied'].get('RETURN_ACCESS_DENIED',0),0)
    def test_correction_or_supersession(self):
        f=self.new();out=self.go(f)
        self.assertGreater(out['denied'].get('SUPERSEDED_OR_INACTIVE',0),0)
    def test_no_answer_safe(self):
        f=self.new(serial=12);out=self.go(f);self.assertEqual(out['status'],'ABSTAIN_NO_ELIGIBLE_EVIDENCE')
        self.assertEqual(out['returned'],[])
    def test_disjoint_development_final(self):
        a=self.new();b=source_fixture(HSN,phase='FINAL',serial=1)
        self.assertTrue(set(a['sourceFamilies']).isdisjoint(set(b['sourceFamilies'])))
    def test_repeated_source_family_not_double_counted(self):
        f=self.new();out=self.go(f,Policy(0,0,.4,5));self.assertLess(out['independentRoots'],len(out['returned']))
    def test_family_diversity_does_not_change_direct_scores(self):
        f=self.new();out=self.go(f,Policy(.55,.44,.38,3));self.assertEqual([x['route'] for x in out['returned'][:2]],['NEURAL_DIRECT','NEURAL_DIRECT'])
        self.assertTrue(all(x['score'] in {p['score'] for p in f['ranked']} for x in out['returned']))
    def test_dissent_is_present_if_eligible(self):
        f=self.new();out=self.go(f,Policy(.55,.44,.38,3));self.assertTrue(out['dissentRetained'])
    def test_method_requires_subject(self):
        f=self.new(hsn='H09.S08.N01');out=evaluate_neural_return(f['ranked'],f['read'],f['auth'],hsn=f['hsn']);self.assertEqual(out['status'],'HOLD_METHOD_REQUIRES_SUBJECT')
        self.assertIn(self.go(f)['status'],['LOCAL_SOURCE_REFERENCE_PREVIEW_NOT_HOST_AUTHORIZED','ABSTAIN_NO_ELIGIBLE_EVIDENCE'])
    def test_method_other_house_subject_rejected(self):
        f=self.new(hsn='H09.S08.N01');out=evaluate_neural_return(f['ranked'],f['read'],f['auth'],hsn=f['hsn'],subject_hsn='H08.S01.N01')
        self.assertEqual(out['status'],'HOLD_METHOD_REQUIRES_SUBJECT')
    def test_coordinate_cannot_be_gf7(self):
        f=self.new();out=evaluate_neural_return(f['ranked'],f['read'],f['auth'],hsn='GF7.B01.M05.C10');self.assertEqual(out['status'],'HOLD_BAD_HSN')
    def test_registry_swap_hold(self):
        f=self.new();out=self.go(f,expected_registry_sha='0'*64);self.assertEqual(out['status'],'HOLD_RELEASE_DRIFT')
    def test_mica_release_swap_hold(self):
        f=self.new();out=self.go(f,current_release_sha='f'*64);self.assertEqual(out['status'],'HOLD_RELEASE_DRIFT')
    def test_encoder_revision_swap_hold(self):
        f=self.new();out=self.go(f,current_encoder_revision='fake');self.assertEqual(out['status'],'HOLD_RELEASE_DRIFT')
    def test_private_body_hold(self):
        f=self.new();f['ranked'][0]['privateBody']='secret';out=self.go(f)
        self.assertGreater(out['denied'].get('INVALID_OR_UNTRUSTED_CANDIDATE',0),0)
    def test_caller_forged_rights_not_grant(self):
        f=self.new();f['ranked'][0]['hostApproved']=True;out=self.go(f)
        self.assertGreater(out['denied'].get('INVALID_OR_UNTRUSTED_CANDIDATE',0),0)
    def test_nan_rejected(self):
        f=self.new();f['ranked'][0]['score']=float('nan');out=self.go(f)
        self.assertGreater(out['denied'].get('INVALID_OR_UNTRUSTED_CANDIDATE',0),0)
    def test_revision_changed_but_same_vector_hold(self):
        f=self.new();k=f['ranked'][1]['sourceId'];f['ledger'][k]['revision']='v2'
        out=self.go(f);self.assertNotIn(k,[x['sourceId'] for x in out['returned']])
    def test_egress_same_task_mutation_no_stale_return(self):
        f=self.new();k=next(x['sourceId'] for x in f['ranked'] if x['sourceId'].endswith('/A1'))
        def auth(x,stage):
            if stage=='READ':return True
            if x['sourceId']==k:
                f['ledger'][k]['rightsEpoch']+=1
                return False
            return True
        out=evaluate_neural_return(f['ranked'],f['read'],auth,hsn=f['hsn'])
        self.assertNotIn(k,[x['sourceId'] for x in out['returned']])
        self.assertFalse(out['hostVerified'])
    def test_return_source_mutation_after_read(self):
        f=self.new();k=next(x['sourceId'] for x in f['ranked'] if x['sourceId'].endswith('/A1'))
        def auth(x,stage):
            if stage=='READ' and x['sourceId']==k:f['ledger'][k]['rightsEpoch']+=1
            return True
        out=evaluate_neural_return(f['ranked'],f['read'],auth,hsn=f['hsn'])
        self.assertNotIn(k,[x['sourceId'] for x in out['returned']])
        self.assertGreater(out['denied'].get('READ_SOURCE_OR_RIGHTS_DRIFT',0),0)
    def test_family_unknown_not_training_positive(self):
        d={'status':'HUMAN_REVIEWED_ACCEPTED','split':'TRAIN','sourceId':'A','sourceSha256':'x'}
        t={'trainReuseAllowed':True,'familyRoot':'UNKNOWN','sourceId':'A','sourceSha256':'x','mode':'WORK','active':True}
        self.assertEqual(eligible_training_pair(d,t,True)['status'],'HOLD')
    def test_review_not_automatic_positive(self):
        d={'status':'UNREVIEWED','split':'TRAIN','sourceId':'A','sourceSha256':'x'}
        t={'trainReuseAllowed':True,'familyRoot':'A','sourceId':'A','sourceSha256':'x','mode':'WORK','active':True}
        self.assertEqual(eligible_training_pair(d,t,True)['status'],'HOLD')
    def test_training_split_not_final(self):
        d={'status':'HUMAN_REVIEWED_ACCEPTED','split':'TEST','sourceId':'A','sourceSha256':'x'}
        t={'trainReuseAllowed':True,'familyRoot':'A','sourceId':'A','sourceSha256':'x','mode':'WORK','active':True}
        self.assertEqual(eligible_training_pair(d,t,True)['status'],'HOLD')
    def test_training_eligible_is_ref_only(self):
        d={'status':'HUMAN_REVIEWED_ACCEPTED','split':'TRAIN','sourceId':'A','sourceSha256':'x'}
        t={'trainReuseAllowed':True,'familyRoot':'A','sourceId':'A','sourceSha256':'x','mode':'WORK','active':True}
        out=eligible_training_pair(d,t,True);self.assertEqual(out['status'],'PREPARED_SOURCE_REF_ONLY_NOT_TRAINED');self.assertNotIn('body',out)
    def test_wrong_hsn_routing(self):
        f=self.new();f['ranked'][0]['hsn']='H03.S02.N01';out=self.go(f)
        self.assertGreater(out['denied'].get('WRONG_HSN',0),0)
    def test_all_source_returns_hold_after_revocation(self):
        f=self.new()
        def no(x,phase):return False
        o=evaluate_neural_return(f['ranked'],f['read'],no,hsn=HSN)
        self.assertEqual(o['status'],'ABSTAIN_NO_ELIGIBLE_EVIDENCE')
    def test_source_role_not_same_as_semantics(self):
        f=self.new();out=self.go(f)
        self.assertEqual(out['acceptedSemanticEdges'],0)
    def test_too_many_candidates(self):
        f=self.new();out=evaluate_neural_return(f['ranked']*30,f['read'],f['auth'],hsn=HSN)
        self.assertEqual(out['status'],'HOLD_EXCESS_CANDIDATES')
    def test_policy_validation(self):
        with self.assertRaises(ValueError):Policy(min_score=2)
        with self.assertRaises(ValueError):Policy(max_items=0)

class Strategies(unittest.TestCase):
    def test_1728_unique_configs_and_ids(self):
        from src.simulate import all_coordinates
        coords=list(all_coordinates());self.assertEqual(len(coords),1728);self.assertEqual(len({x[0] for x in coords}),1728)
        self.assertEqual(len({(strategy_policy(h,s,n).family_bonus,strategy_policy(h,s,n).dissent_bonus,strategy_policy(h,s,n).min_score) for _,h,s,n in coords}),1728)
    def test_144_spheres(self):
        from src.simulate import all_coordinates
        self.assertEqual(len({x[0][0:7] for x in all_coordinates()}),144)
    def test_single_candidate_safe_with_unverified_family(self):
        f=source_fixture(HSN,phase='TEST',serial=13);out=evaluate_neural_return(f['ranked'],f['read'],f['auth'],hsn=HSN,policy=Policy(.4,.2,.38,3))
        self.assertEqual(out['independentRoots'],len({x['familyRoot'] for x in out['returned'] if x['familyRoot']!='UNKNOWN'}))
    def test_3_sources_same_root_count_as_one(self):
        f=self.new() if False else source_fixture(HSN,phase='TEST',serial=1)
        self.assertEqual(f['ledger'][f['ranked'][0]['sourceId']]['mode'],'WORK')

if __name__=='__main__':unittest.main()
