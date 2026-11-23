import sys,pathlib,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'src'))
from civilization_12pass import POLICIES,review_one
from wikimedia_bridge import WikimediaHold

ROW=('sphere','H01.S05','H01.S05.N10','OWN_SPHERE','DOMAIN','DOMAIN',1,1,
     '{"originalSourceBytesMatched":true}', 'STRUCTURAL_EVALUATED','CANDIDATE_NEEDS_REVIEW','a'*64)
class TwelvePassTests(unittest.TestCase):
    def test_all_twelve_passes_have_unique_identity(self):
        self.assertEqual(len(POLICIES),12)
        self.assertEqual(len(set(x[0] for x in POLICIES)),12)
        self.assertEqual(len(set(x[1] for x in POLICIES)),12)
    def test_all_passes_are_source_only(self):
        out={p:review_one(p,ROW,{'H01'}) for p,_ in POLICIES}
        self.assertEqual(len(out),12)
        for x in out.values():self.assertNotIn(x,('APPROVED','SAME_AS','VERIFIED_CANON','REAL_PEER'))
    def test_role_rule_is_sphere_not_node(self):
        self.assertEqual(review_one('03',ROW,{'H01'}),'ROLE_STRUCTURAL')
        altered=list(ROW);altered[4]='META';self.assertEqual(review_one('03',altered,{'H01'}),'HOLD_ROLE')
        meta=list(ROW);meta[2]='H01.S08.N10';meta[4]='META';self.assertEqual(review_one('03',meta,{'H01'}),'ROLE_STRUCTURAL')
    def test_no_semantic_promotion(self):
        changed=list(ROW);changed[10]='SAME_AS'
        self.assertEqual(review_one('05',changed,{'H01'}),'HOLD_PROMOTED_SEMANTICS')
    def test_mismatched_ancestry(self):self.assertEqual(review_one('02',ROW,{'H02'}),'HOLD_PARENT')
    def test_missing_digest(self):
        altered=list(ROW);altered[-1]='broken';self.assertEqual(review_one('01',altered,{'H01'}),'HOLD_SOURCE')
    def test_wikipedia_requires_real_revision(self):self.assertEqual(review_one('07',ROW,{'H01'}),'WIKIPEDIA_PAGE_REVISION_REQUIRED')
    def test_wikidata_requires_qid_and_references(self):self.assertEqual(review_one('08',ROW,{'H01'}),'WIKIDATA_QID_AND_REFERENCES_REQUIRED')
    def test_arxiv_subject_vs_method(self):
        self.assertEqual(review_one('09',ROW,{'H01'}),'ARXIV_CATEGORY_CONTEXT_REQUIRED')
        meta=list(ROW);meta[4]='META';self.assertEqual(review_one('09',meta,{'H01'}),'META_NO_SUBJECT_IDENTITY')
    def test_fiction_is_noncanonical(self):self.assertEqual(review_one('12',ROW,{'H01'}),'FICTION_EDITORIAL_NOT_CANON')
    def test_invalid_coordinate_holds(self):
        x=list(ROW);x[2]='H00.S00.N00';self.assertEqual(review_one('04',x,{'H01'}),'HOLD_INVALID_COORDINATE')
    def test_bad_policy_throws(self):
        with self.assertRaises(WikimediaHold):review_one('99',ROW,{'H01'})
if __name__=='__main__':unittest.main()
