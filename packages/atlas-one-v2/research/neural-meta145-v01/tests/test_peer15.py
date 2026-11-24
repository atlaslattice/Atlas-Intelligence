"""15 distinct, source-only integration probes. 100% synthetic; NOT host ACL proof."""
import copy
import unittest
from src.evidence import ARIADNE_SHA,Policy,evaluate_neural_return,eligible_training_pair,eligible_training_pair_strict
from src.simulate import source_fixture

HSN='H05.S06.N12'

class FifteenPeerProbes(unittest.TestCase):
    def f(self, serial=1, hsn=HSN):
        return source_fixture(hsn, phase='PEER15', serial=serial)
    def go(self, f, policy=Policy(.4,.2,.38,3), **kwargs):
        return evaluate_neural_return(f['ranked'], f['read'], f['auth'],hsn=f['hsn'],policy=policy,subject_hsn=f['subject_hsn'],**kwargs)

    def test_01_lookup_source_id_alias_does_not_authorize_wrong_record(self):
        f=self.f(); c=next(x for x in f['ranked'] if x['sourceId'].endswith('/A1'))
        f['ledger'][c['sourceId']]['sourceId']='another-source-with-same-data'
        out=self.go(f); self.assertNotIn(c['sourceId'],[x['sourceId'] for x in out['returned']])
        self.assertGreater(out['denied'].get('SOURCE_IDENTITY_OR_REVISION_DRIFT',0),0)

    def test_02_boolean_score_rejected_as_non_numeric(self):
        f=self.f(); c=next(x for x in f['ranked'] if x['sourceId'].endswith('/A1'))
        c['score']=True
        out=self.go(f); self.assertNotIn(c['sourceId'],[x['sourceId'] for x in out['returned']])
        self.assertGreater(out['denied'].get('INVALID_OR_UNTRUSTED_CANDIDATE',0),0)

    def test_03_duplicate_exact_source_does_not_occupy_two_result_slots(self):
        f=self.f(); c=next(x for x in f['ranked'] if x['sourceId'].endswith('/A1'))
        c['score']=1.0
        f['ranked']=[copy.deepcopy(c),copy.deepcopy(c)]+f['ranked']
        out=self.go(f,Policy(0,0,.38,5))
        k=[(x['sourceId'],x['revision'],x['documentId']) for x in out['returned']]
        self.assertEqual(len(k),len(set(k)))

    def test_04_allow_callback_mutating_rights_epoch_is_not_authority(self):
        f=self.f(); c=next(x for x in f['ranked'] if x['sourceId'].endswith('/A1'))
        def auth(record,phase):
            if phase=='RETURN' and record['sourceId']==c['sourceId']:f['ledger'][c['sourceId']]['rightsEpoch']+=1
            return True
        out=evaluate_neural_return(f['ranked'],f['read'],auth,hsn=HSN)
        self.assertNotIn(c['sourceId'],[x['sourceId'] for x in out['returned']]); self.assertFalse(out['hostVerified'])

    def test_05_same_semantic_vector_with_changed_citation_must_hold(self):
        f=self.f();c=next(x for x in f['ranked'] if x['sourceId'].endswith('/A1'))
        f['ledger'][c['sourceId']]['citation']='https://example.invalid/new-reference'
        o=self.go(f);self.assertNotIn(c['sourceId'],[x['sourceId'] for x in o['returned']])

    def test_06_family_root_mutation_at_read_blocks_return(self):
        f=self.f();c=next(x for x in f['ranked'] if x['sourceId'].endswith('/A1'))
        def auth(record,phase):
            if phase=='READ' and record['sourceId']==c['sourceId']: f['ledger'][c['sourceId']]['familyRoot']='new-lineage'
            return True
        o=evaluate_neural_return(f['ranked'],f['read'],auth,hsn=HSN)
        self.assertNotIn(c['sourceId'],[x['sourceId'] for x in o['returned']])

    def test_07_method_requires_same_house_explicit_domain_subject(self):
        f=self.f(hsn='H09.S08.N11')
        o=evaluate_neural_return(f['ranked'],f['read'],f['auth'],hsn=f['hsn'],subject_hsn='H08.S01.N11')
        self.assertEqual(o['status'],'HOLD_METHOD_REQUIRES_SUBJECT')

    def test_08_cymatic_gf7_namespace_is_not_hsn_role(self):
        f=self.f();o=evaluate_neural_return(f['ranked'],f['read'],f['auth'],hsn='GF7.B05.M06.C12')
        self.assertEqual(o['status'],'HOLD_BAD_HSN')

    def test_09_work_candidate_cannot_use_imagine_source(self):
        f=self.f();c=next(x for x in f['ranked'] if x['sourceId'].endswith('/A1'))
        f['ledger'][c['sourceId']]['mode']='IMAGINE_LOCAL'
        o=self.go(f);self.assertNotIn(c['sourceId'],[x['sourceId'] for x in o['returned']])

    def test_10_contradiction_retention_keeps_unreviewed_status(self):
        f=self.f();o=self.go(f,Policy(.6,.8,.38,5))
        contradictions=[x for x in o['returned'] if x['relation']=='CONTRADICTS']
        self.assertTrue(contradictions);self.assertTrue(all(x['status']=='UNREVIEWED' for x in contradictions))

    def test_11_unknown_family_retrieval_does_not_promote_training(self):
        f=self.f();o=self.go(f,Policy(.6,.8,.38,9))
        unknown=[x for x in o['returned'] if x['familyRoot']=='UNKNOWN']
        for item in unknown:
            assert eligible_training_pair({'status':'HUMAN_REVIEWED_ACCEPTED','split':'TRAIN','sourceId':item['sourceId'],'sourceSha256':item['sourceSha256']},{'mode':'WORK','active':True,'familyRoot':'UNKNOWN','trainReuseAllowed':True,'sourceId':item['sourceId'],'sourceSha256':item['sourceSha256']},True)['status']=='HOLD'
        self.assertNotIn('acceptedSemanticEdges',o.get('returned',[{}])[0])

    def test_12_family_split_registry_is_required_before_export(self):
        # Ordinary positive-label checks are insufficient to detect A1(TRAIN)/A2(TEST) leakage.
        ev={'status':'HUMAN_REVIEWED_ACCEPTED','split':'TRAIN','sourceId':'a1','sourceSha256':'f'*64}
        trusted={'trainReuseAllowed':True,'familyRoot':'family-A','sourceId':'a1','sourceSha256':'f'*64,'mode':'WORK','active':True}
        self.assertEqual(eligible_training_pair_strict(ev,trusted,True,None)['status'],'HOLD_FAMILY_SPLIT_UNVERIFIED')
        self.assertEqual(eligible_training_pair_strict(ev,trusted,True,{'family-A':['TRAIN','TEST']})['status'],'HOLD_FAMILY_SPLIT_COLLISION')
        self.assertEqual(eligible_training_pair_strict(ev,trusted,True,{'family-A':['TRAIN']})['status'],'PREPARED_SOURCE_REF_ONLY_NOT_TRAINED')

    def test_13_test_split_does_not_become_training(self):
        ev={'status':'HUMAN_REVIEWED_ACCEPTED','split':'TEST','sourceId':'a','sourceSha256':'f'*64}
        tr={'trainReuseAllowed':True,'familyRoot':'fam','sourceId':'a','sourceSha256':'f'*64,'mode':'WORK','active':True}
        self.assertEqual(eligible_training_pair_strict(ev,tr,True,{'fam':['TEST']})['status'],'HOLD')

    def test_14_direct_graph_lexical_routes_distinct_and_no_body_return(self):
        f=self.f();o=self.go(f,Policy(0,0,.3,9))
        self.assertEqual(o['directNeuralCount']+o['graphCount']+o['lexicalBackupCount'],len(o['returned']))
        self.assertFalse(any(any(k in item for k in ['text','body','passage','embedding','weights']) for item in o['returned']))

    def test_15_all_ineligible_safely_abstains_without_source_body(self):
        f=self.f(serial=12);o=self.go(f)
        self.assertEqual(o['status'],'ABSTAIN_NO_ELIGIBLE_EVIDENCE')
        self.assertEqual(o['returned'],[]);self.assertFalse(o['hostVerified'])

if __name__=='__main__':unittest.main()
