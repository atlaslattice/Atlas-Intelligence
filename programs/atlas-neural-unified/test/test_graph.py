import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from atlas_neural_unified.graph import TypedEdgeReview,GraphEvidenceError

A='a'*64
class GraphTests(unittest.TestCase):
 def test_reversible_candidate_only(self):
  g=TypedEdgeReview();g.propose(src='H01.S01.N01',dst='H05.S06.N12',relation='ANALOGY_CANDIDATE',source_id='work:source1',source_digest=A,source_version='v1')
  x=g.cross_house_proposals('H01.S01.N01');self.assertEqual(len(x['edges']),1);self.assertFalse(x['neuralScoresChanged']);self.assertEqual(x['positiveTrainingLabels'],0)
 def test_dissent_retention(self):
  g=TypedEdgeReview();g.propose(src='H02.S01.N01',dst='H03.S01.N01',relation='CONTRADICTS',source_id='work:citation1',source_digest=A,source_version='v1')
  self.assertEqual(g.cross_house_proposals('H02.S01.N01')['edges'][0]['relation'],'CONTRADICTS')
 def test_repeated_idempotent(self):
  g=TypedEdgeReview();a=dict(src='H01.S01.N01',dst='H02.S01.N01',relation='SUPPORTS',source_id='work:x',source_digest=A,source_version='v1')
  g.propose(**a);self.assertEqual(g.propose(**a)['edgeCount'],1)
 def test_revision_separate(self):
  g=TypedEdgeReview();base=dict(src='H01.S01.N01',dst='H02.S01.N01',relation='SUPERSEDES',source_id='work:x',source_digest=A)
  g.propose(**base,source_version='v1');self.assertEqual(g.propose(**base,source_version='v2')['edgeCount'],2)
 def test_no_glyph_namespace_coercion(self):
  with self.assertRaises(GraphEvidenceError):TypedEdgeReview().propose(src='GF7.B01.M01.C01',dst='H02.S01.N01',relation='SUPPORTS',source_id='work:x',source_digest=A,source_version='v1')
 def test_privacy_barrier(self):
  with self.assertRaises(GraphEvidenceError):TypedEdgeReview().propose(src='H01.S01.N01',dst='H02.S01.N01',relation='SUPPORTS',source_id='work:x',source_digest=A,source_version='v1',scope='IMAGINE')
 def test_no_self_contradiction(self):
  with self.assertRaises(GraphEvidenceError):TypedEdgeReview().propose(src='H01.S01.N01',dst='H01.S01.N01',relation='CONTRADICTS',source_id='work:x',source_digest=A,source_version='v1')
 def test_no_auto_truth(self):
  with self.assertRaises(GraphEvidenceError):TypedEdgeReview().propose(src='H01.S01.N01',dst='H02.S01.N01',relation='SUPPORTS',source_id='work:x',source_digest=A,source_version='v1',evidence_kind='HUMAN_ACCEPTED')
 def test_unbacked_source(self):
  with self.assertRaises(GraphEvidenceError):TypedEdgeReview().propose(src='H01.S01.N01',dst='H02.S01.N01',relation='SUPPORTS',source_id='work:x',source_digest='incorrect',source_version='v1')
 def test_no_fake_semantic_acceptance(self):
  g=TypedEdgeReview();g.propose(src='H01.S01.N01',dst='H02.S01.N01',relation='SEMANTIC_CANDIDATE',source_id='work:x',source_digest=A,source_version='v1')
  r=g.cross_house_proposals('H01.S01.N01');self.assertFalse(r['semanticAccepted'])
if __name__=='__main__':unittest.main()
