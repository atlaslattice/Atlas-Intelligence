import unittest,sys,pathlib,copy
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
from research_bridge import safe_topic_request,safe_arxiv_request,SourceHold
from research_runner import valid_request,prepare_research_visit,simulate_snapshot_response,verify_opt_in_nomination
from iron_empire_continuity import review_beats

class WorkQueueAndFiction(unittest.TestCase):
 def setUp(self):
  self.topic=safe_topic_request('T10346')
  self.ax=safe_arxiv_request('physics.plasm-ph','Plasma confinement')
  self.nom={'slot':'expert:H01.S05.N10','mode':'WORK','optIn':True,
            'sourceRefs':['synthetic:public-source-fixture'],
            'originalContribution':'A concrete original analysis and reproduction with bounded comparison',
            'falsifier':'A calibrated counterexample would reject the claimed relation',
            'status':'REQUEST_REVIEW'}
  self.beat={'film':'II','event':'EMPEROR_PUBLIC_AUDIT','description':'An accountable audit',
             'claims':[],'sourceRef':'synthetic:film-source','mode':'WORK','status':'EDITORIAL_PROPOSAL'}
 def test_topic_valid(self):self.assertTrue(valid_request(self.topic))
 def test_arxiv_valid(self):self.assertTrue(valid_request(self.ax))
 def test_arxiv_unauthorized_extra(self):
  r={**self.ax,'secret':'should-not-be-here'}
  with self.assertRaises(SourceHold):valid_request(r)
 def test_arxiv_redirect(self):
  r={**self.ax,'url':'https://example.com/api/query'}
  with self.assertRaises(SourceHold):valid_request(r)
 def test_arxiv_query_mismatch(self):
  r={**self.ax,'query':'cat:physics.plasm-ph AND all:secret'}
  with self.assertRaises(SourceHold):valid_request(r)
 def test_arxiv_url_added_param(self):
  r={**self.ax,'url':self.ax['url']+'&privateData=leak'}
  with self.assertRaises(SourceHold):valid_request(r)
 def test_arxiv_category_mismatch(self):
  r={**self.ax,'category':'cs.AI'}
  with self.assertRaises(SourceHold):valid_request(r)
 def test_no_live_network(self):
  o=prepare_research_visit([self.ax,self.topic]);self.assertTrue(o['noNetworking']);self.assertEqual(o['counts']['executed'],0)
 def test_finite_24(self):self.assertEqual(prepare_research_visit([self.topic]*30)['counts']['prepared'],1)
 def test_prior_dedup(self):
  x=prepare_research_visit([self.topic],already_processed=[self.topic['url']]);self.assertEqual(x['counts']['prepared'],0)
 def test_network_attempt_rejected(self):
  with self.assertRaises(SourceHold):prepare_research_visit([self.topic],network=True)
 def test_paid_attempt_rejected(self):
  with self.assertRaises(SourceHold):prepare_research_visit([self.topic],allow_paid=True)
 def test_mock_receipts_not_auth(self):
  p=prepare_research_visit([self.topic]);r=simulate_snapshot_response(p,{self.topic['url']:'Synthetic title'})
  self.assertEqual(r['externalRequests'],0);self.assertEqual(r['receipts'][0]['status'],'MOCK_ONLY_NOT_FETCHED')
 def test_mock_bodies_not_injected(self):
  p=prepare_research_visit([self.topic]);
  with self.assertRaises(SourceHold):simulate_snapshot_response(p,{self.topic['url']:1})
 def test_nomination_review_only(self):
  r=verify_opt_in_nomination(self.nom,self.nom['slot']);self.assertFalse(r['roleGranted']);self.assertFalse(r['hostIdentityAuthenticated'])
 def test_nomination_not_volume_merit(self):
  x={**self.nom,'messageCount':1000000}
  with self.assertRaises(SourceHold):verify_opt_in_nomination(x,self.nom['slot'])
 def test_nomination_wrong_slot(self):
  with self.assertRaises(SourceHold):verify_opt_in_nomination(self.nom,'expert:H09.S12.N11')
 def test_nomination_private_mode_denied(self):
  with self.assertRaises(SourceHold):verify_opt_in_nomination({**self.nom,'mode':'PALACE'},self.nom['slot'])
 def test_nomination_no_falsifier(self):
  with self.assertRaises(SourceHold):verify_opt_in_nomination({**self.nom,'falsifier':'ok'},self.nom['slot'])
 def test_iron_valid_proposal_no_canon(self):
  r=review_beats([self.beat]);self.assertEqual(len(r['acceptedCandidates']),1);self.assertFalse(r['storyCanonChanged'])
 def test_iron_crowning_film_v_denied(self):
  r=review_beats([{**self.beat,'film':'V','event':'PRINCE_CORONATION'}]);self.assertEqual(r['heldCandidates'][0]['reason'],'FILM_CONTINUITY_VIOLATION')
 def test_iron_self_name_previ_denied(self):
  r=review_beats([{**self.beat,'film':'IV','event':'TRUE_SPECIES_SELF_NAME_REVEAL'}]);self.assertEqual(r['heldCandidates'][0]['reason'],'FILM_CONTINUITY_VIOLATION')
 def test_iron_film_vi_self_name_proposal(self):
  r=review_beats([{**self.beat,'film':'VI','event':'TRUE_SPECIES_SELF_NAME_REVEAL'}]);self.assertEqual(len(r['acceptedCandidates']),1)
 def test_iron_no_mars_full_restoration_iii(self):
  r=review_beats([{**self.beat,'film':'III','event':'RESTORATION_UNDERWAY','claims':['MARS_FULLY_RESTORED_IN_FILM_III']}]);self.assertEqual(r['heldCandidates'][0]['reason'],'FORBIDDEN_SCIENCE_OR_RIGHTS_CLAIM')
 def test_iron_no_real_acoustic_mind_control(self):
  r=review_beats([{**self.beat,'event':'MECHANISM_HYPOTHESIS','claims':['ACTUAL_PSYCHIC_CONTROL_TECHNOLOGY']}]);self.assertEqual(len(r['heldCandidates']),1)
 def test_iron_rights_non_extermination(self):
  r=review_beats([{**self.beat,'film':'V','event':'FREE_BUG_ALLY','claims':['EXTERMINATE_ALL_BUGS']}]);self.assertEqual(len(r['heldCandidates']),1)
 def test_iron_no_private_palace(self):
  r=review_beats([{**self.beat,'mode':'PALACE'}]);self.assertEqual(r['heldCandidates'][0]['reason'],'PRIVACY_OR_CANON_PROMOTION_DENIED')
 def test_iron_unknown_claim_structure(self):
  r=review_beats([{**self.beat,'claims':[{'bad':'object'}]}]);self.assertEqual(len(r['heldCandidates']),1)
 def test_iron_does_not_mutate_original(self):
  x=[copy.deepcopy(self.beat)];before=copy.deepcopy(x);review_beats(x);self.assertEqual(x,before)

if __name__=='__main__':unittest.main()

class ExistingBurstAdapter(unittest.TestCase):
 def setUp(self):
  from research_runner import prepare_research_visit
  from research_bridge import safe_topic_request
  self.plan=prepare_research_visit([safe_topic_request('T10346'),safe_topic_request('T10037')])
 def test_ready(self):
  from research_runner import to_existing_atlas_work_burst
  x=to_existing_atlas_work_burst(self.plan)
  self.assertEqual(len(x['tasks']),2);self.assertEqual(x['tasks'][0]['operator'],'LOCAL_RESEARCH_SOURCE_CHECK')
 def test_not_hosted(self):
  from research_runner import to_existing_atlas_work_burst
  x=to_existing_atlas_work_burst(self.plan)
  self.assertFalse(x['hostedVerified']);self.assertFalse(x['canPublish']);self.assertTrue(x['noNetworkEffects'])
 def test_shared_resource_lock(self):
  from research_runner import to_existing_atlas_work_burst
  x=to_existing_atlas_work_burst(self.plan)
  self.assertEqual(x['tasks'][0]['resourceKey'],x['tasks'][1]['resourceKey'])
 def test_no_auto_role(self):
  from research_runner import to_existing_atlas_work_burst
  x=to_existing_atlas_work_burst(self.plan)
  self.assertTrue(all('residentIdentity' not in t for t in x['tasks']))
 def test_invalid_host_promotion_denied(self):
  from research_runner import to_existing_atlas_work_burst
  p={**self.plan,'hostPermissionsGranted':True}
  with self.assertRaises(SourceHold):to_existing_atlas_work_burst(p)
 def test_invalid_item_promotion_denied(self):
  from research_runner import to_existing_atlas_work_burst
  p={**self.plan,'items':[{**self.plan['items'][0],'sourceAuthority':'CANON'}]}
  with self.assertRaises(SourceHold):to_existing_atlas_work_burst(p)
