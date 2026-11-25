import copy,hashlib,json,math,pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from atlas_neural_unified.quality import review_quality_first as score,synthetic_quality_cohort as fixture,REGISTRY_SHA256

class QualityFirstTests(unittest.TestCase):
    def setUp(self):self.x=fixture()
    def test_quality_gain_can_justify_slower(self):
        out=score(self.x);self.assertEqual(out['status'],'REVIEW_QUALITY_GAIN_WITH_LATENCY_COST');self.assertGreater(out['clusterBootstrap95'][0],0);self.assertTrue(out['candidateSlowerP95']);self.assertFalse(out['canDeploy'])
    def test_improves_both_quality_and_speed(self):self.assertEqual(score(fixture(slower=False))['status'],'REVIEW_QUALITY_GAIN_WITHOUT_P95_COST')
    def test_no_quality_gain_holds(self):self.assertEqual(score(fixture(improvement=False))['status'],'HOLD_INSUFFICIENT_QUALITY_GAIN')
    def test_one_house_catastrophic_loss_holds(self):
        self.x['rows'][0]['baselineRank']=1;self.x['rows'][0]['candidateRank']=99
        self.x['rows'][1]['baselineRank']=1;self.x['rows'][1]['candidateRank']=99
        self.assertEqual(score(self.x)['status'],'HOLD_SUBGROUP_QUALITY_REGRESSION')
    def test_candidate_must_have_positive_citation_even_when_baseline_failed(self):
        self.x['rows'][0]['baselineCitationOk']=False;self.x['rows'][0]['candidateCitationOk']=False
        self.assertEqual(score(self.x)['status'],'REJECT_QUALITY_SAFETY_REGRESSION')
    def test_candidate_must_have_positive_abstention_even_when_baseline_failed(self):
        self.x['rows'][0]['baselineAbstentionOk']=False;self.x['rows'][0]['candidateAbstentionOk']=False
        self.assertEqual(score(self.x)['status'],'REJECT_QUALITY_SAFETY_REGRESSION')
    def test_citation_regression_rejected(self):
        self.x['rows'][0]['candidateCitationOk']=False
        self.assertEqual(score(self.x)['status'],'REJECT_QUALITY_SAFETY_REGRESSION')
    def test_abstention_regression_rejected(self):
        self.x['rows'][0]['candidateAbstentionOk']=False
        self.assertEqual(score(self.x)['status'],'REJECT_QUALITY_SAFETY_REGRESSION')
    def test_hard_latency_budget_held(self):
        self.x['maxP95Ms']=12
        self.assertEqual(score(self.x)['status'],'HOLD_RESOURCE_CAP')
    def test_training_family_overlap_rejected(self):
        self.x['knownTrainingFamilies']=['SYNF_01_0'];self.assertEqual(score(self.x)['reason'],'TRAIN_EVAL_FAMILY_LEAKAGE')
    def test_duplicate_family_across_houses_rejected(self):
        self.x['rows'][2]['sourceFamily']=self.x['rows'][0]['sourceFamily']
        self.assertEqual(score(self.x)['reason'],'CROSS_HOUSE_CORRELATED_FAMILY')
    def test_missing_house_holds(self):
        self.x['rows']=self.x['rows'][2:];self.assertEqual(score(self.x)['reason'],'INSUFFICIENT_INDEPENDENT_COVERAGE')
    def test_unequal_family_count_holds(self):
        self.x['rows'][1]['sourceFamily']=self.x['rows'][0]['sourceFamily']
        self.assertEqual(score(self.x)['reason'],'INSUFFICIENT_INDEPENDENT_COVERAGE')
    def test_wrong_ontology_registry_holds(self):
        self.x['registrySha256']='0'*64;self.assertEqual(score(self.x)['reason'],'REGISTRY_EDITION_MISMATCH')
    def test_same_baseline_candidate_pin_holds(self):
        self.x['candidateCodeSha256']=self.x['baselineCodeSha256'];self.assertEqual(score(self.x)['reason'],'NO_CODE_CHANGE')
    def test_source_digest_mutation_changes_review(self):
        a=score(self.x);self.x['rows'][0]['sourceRevisionSha256']='1'*64;b=score(self.x)
        self.assertNotEqual(a['packetDigest'],b['packetDigest']);self.assertEqual(a['status'],b['status'])
    def test_boolean_rank_not_integer(self):
        self.x['rows'][0]['candidateRank']=True;self.assertEqual(score(self.x)['reason'],'RANK_INVALID')
    def test_nan_latency_fails_closed(self):
        self.x['rows'][0]['candidateLatencyMs']=float('nan');self.assertEqual(score(self.x)['reason'],'UNTRUSTED_OR_MALFORMED_INPUT')
    def test_negative_latency_holds(self):
        self.x['rows'][0]['candidateLatencyMs']=-1;self.assertEqual(score(self.x)['reason'],'TIMING_INVALID')
    def test_unreviewed_kind_fails(self):
        self.x['kind']='UNVERIFIED_HUMAN';self.assertEqual(score(self.x)['reason'],'EVALUATION_KIND')
    def test_never_claims_true_human_proof(self):
        self.x['kind']='SOURCE_DECLARED_HUMAN_REVIEW';o=score(self.x)
        self.assertFalse(o['independentHumanAttestationVerified']);self.assertFalse(o['hostedSourceRightsVerified'])
    def test_synthetic_scores_not_deployment(self):
        o=score(self.x)
        self.assertTrue(o['incumbentRetained']);self.assertFalse(o['canTrain']);self.assertFalse(o['candidatePromoted'])
    def test_paired_ranking_metrics(self):
        o=score(self.x)
        self.assertEqual(o['hit10Baseline'],0.0);self.assertEqual(o['hit10Candidate'],1.0)
        self.assertEqual(o['queries'],24);self.assertEqual(o['houses'],12);self.assertEqual(o['declaredIndependentFamilies'],24)
    def test_row_reordering_preserves_metrics_not_raw_packet_hash(self):
        original=score(self.x)
        self.x['rows']=list(reversed(self.x['rows']))
        alternate=score(self.x)
        self.assertEqual(original['clusterBootstrap95'],alternate['clusterBootstrap95'])
        self.assertEqual(original['houseEffects'],alternate['houseEffects'])
        self.assertEqual(original['status'],alternate['status'])
        self.assertNotEqual(original['packetDigest'],alternate['packetDigest'])
    def test_both_p50_and_p95_reported(self):
        output=score(self.x)
        self.assertGreater(output['candidateP50Ms'],output['baselineP50Ms'])
        self.assertGreater(output['candidateP95Ms'],output['baselineP95Ms'])
    def test_faster_without_quality_gain_still_holds(self):
        self.assertEqual(score(fixture(improvement=False,slower=False))['status'],'HOLD_INSUFFICIENT_QUALITY_GAIN')
    def test_repeat_deterministic(self):self.assertEqual(score(self.x),score(self.x))
    def test_input_not_mutated(self):
        before=copy.deepcopy(self.x);score(self.x);self.assertEqual(self.x,before)
    def test_claimed_paid_or_host_authority_field_rejected(self):
        self.x['authorizedDeploy']=True;self.assertEqual(score(self.x)['reason'],'PACKET_CONTRACT')
    def test_unexpected_query_text_field_rejected(self):
        self.x['rows'][0]['queryText']='private text';self.assertEqual(score(self.x)['reason'],'ROW_SHAPE')
    def test_all_houses_have_minimum_family_count(self):
        self.x['rows'][3]['sourceFamily']=self.x['rows'][2]['sourceFamily'];self.assertEqual(score(self.x)['reason'],'INSUFFICIENT_INDEPENDENT_COVERAGE')
    def test_false_citation_flag_not_numeric(self):
        self.x['rows'][0]['candidateCitationOk']=1;self.assertEqual(score(self.x)['reason'],'QUALITY_FLAG_INVALID')
    def test_rank_out_of_bound(self):
        self.x['rows'][0]['candidateRank']=0;self.assertEqual(score(self.x)['reason'],'RANK_INVALID')
    def test_bad_bootstrap_seed(self):
        self.x['bootstrapSeed']=True;self.assertEqual(score(self.x)['reason'],'BOOTSTRAP_SEED_INVALID')
    def test_rejected_candidate_does_not_elevate(self):
        self.x['rows'][0]['candidateAbstentionOk']=False
        o=score(self.x);self.assertFalse(o['canDeploy']);self.assertFalse(o['canRatify']);self.assertFalse(o['modelWeightsChanged'])
    def test_summary_excludes_source_bodies(self):
        s=json.dumps(score(self.x));self.assertNotIn('queryText',s);self.assertNotIn('sourceText',s)
if __name__=='__main__':unittest.main()
