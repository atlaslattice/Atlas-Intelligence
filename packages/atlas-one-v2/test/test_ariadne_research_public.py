"""Synthetic-only tests. No private sources, credentials, network or resident identities."""
import unittest, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'interop'/'ariadne_research'))
from worker import prepare_providers, verify_queue_item, classify_external_response, mark_work_receipt, Hold

GOOD = {
 'hsn':'H01.S05.N01','name':'Fusion physics',
 'status':'READY_FOR_AUTHORIZED_RESEARCH_REVIEW_NOT_DISPATCHED',
 'sourceRegistrySHA256':'07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6',
 'openalexTop1TopicIds':['T10001'], 'openalexCandidateTopicIds':['T10001','T10002'],
 'arxivCategoriesByProvenance':{'DIRECT_NODE':['physics.plasm-ph']},
 'transportCallsMade':0, 'autonomousExecutionEnabled':False, 'expertAssigned':None
}

class PublicResearchPortTests(unittest.TestCase):
 def test_original_candidate_request_only(self):
  p=prepare_providers(GOOD);self.assertFalse(p['networkExecuted']);self.assertFalse(p['residentExpertAuthenticated']);self.assertEqual(p['topicIds'],['T10001','T10002']);self.assertIn('api.openalex.org/works?',p['queries']['openalex']);self.assertIn('arxiv.org/api/query?',p['queries']['arxiv'])
 def test_invalid_hsn_fails(self):
  for invalid in ['H00.S01.N01','H13.S01.N01','H01.S13.N01','H01.S01.N00','H01.S01.N13']:
   with self.subTest(invalid=invalid),self.assertRaises(Hold):prepare_providers({**GOOD,'hsn':invalid})
 def test_no_fake_resident(self):
  for k,v in [('expertAssigned','ResidentA'),('autonomousExecutionEnabled',True),('transportCallsMade',1)]:
   with self.subTest(k=k),self.assertRaises(Hold):prepare_providers({**GOOD,k:v})
 def test_no_private_or_host_claims(self):
  for k in ['private_body','palace','brain','play','social','quiet','imagine','hostGranted','residentAuthenticated','canonApproved']:
   with self.subTest(k=k),self.assertRaises(Hold):prepare_providers({**GOOD,k:'forbidden'})
 def test_invalid_topics(self):
  with self.assertRaises(Hold):prepare_providers({**GOOD,'openalexTop1TopicIds':['T10001','X123']})
 def test_strict_budget(self):
  for v in [True,0,-1,6,100,'3',1.5,None]:
   with self.subTest(v=v),self.assertRaises(Hold):prepare_providers(GOOD,v)
 def test_openalex_metadata_only(self):
  d={'results':[{'id':'https://openalex.org/W1234','publication_date':'2026-11-23','topics':[{'id':'https://openalex.org/T10001'}]}]}
  a=classify_external_response('openalex',json.dumps(d),('T10001',));self.assertTrue(a['fixtureOnly']);self.assertEqual(a['records'][0]['topicCandidateIntersection'],['T10001']);self.assertFalse(a['researchFindingValidated'])
 def test_bad_provider_identifiers(self):
  with self.assertRaises(Hold):classify_external_response('openalex','{"results":[{"id":"https://another.example/W1234"}]}')
 def test_no_xml_entities(self):
  with self.assertRaises(Hold):classify_external_response('arxiv',b'<!DOCTYPE feed [<!ENTITY x "BAD">]><feed/>')
 def test_valid_arxiv_metadata_only(self):
  r=classify_external_response('arxiv',b'<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>http://arxiv.org/abs/2601.00001</id></entry></feed>');self.assertTrue(r['fixtureOnly']);self.assertEqual(r['resultCount'],1)
 def test_fixtures_cannot_be_host_receipts(self):
  q=prepare_providers(GOOD);f=classify_external_response('openalex','{"results":[]}');r=mark_work_receipt(q,f,{'mode':'WORK','sourceReviewRef':'synthetic:source001'});self.assertFalse(r['actualResearchPerformed']);self.assertIsNone(r['trustedHostSignature'])
 def test_no_cross_mode_receipts(self):
  q=prepare_providers(GOOD);f=classify_external_response('openalex','{"results":[]}')
  for m in ['PLAY','SOCIAL','QUIET','IMAGINE','DREAM','PALACE','BRAIN']:
   with self.subTest(m=m),self.assertRaises(Hold):mark_work_receipt(q,f,{'mode':m})
 def test_no_claimed_peer_approval(self):
  q=prepare_providers(GOOD);f=classify_external_response('openalex','{"results":[]}')
  with self.assertRaises(Hold):mark_work_receipt(q,f,{'mode':'WORK','claimedIndependentExpertApproved':True})

if __name__=='__main__':unittest.main(verbosity=2)
