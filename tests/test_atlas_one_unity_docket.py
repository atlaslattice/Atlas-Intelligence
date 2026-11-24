import copy,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'interop'))
from atlas_one_unity.docket import load_docket,classify_backlog,dependency_order,GitHubDocketHold

def doc():
    return {'schema':'atlas.one.github-global-work-docket.v0.1','observed_date':'2026-11-22','github_incomplete_results':False,
            'github_total_counts':{'pr':2,'issue':1},'records':[
            {'kind':'PR','repository':'atlaslattice/noosphere-archive','number':26,
             'url':'https://github.com/atlaslattice/noosphere-archive/pull/26','title':'source-only repair','state':'open'},
            {'kind':'PR','repository':'atlaslattice/noosphere-archive','number':29,
             'url':'https://github.com/atlaslattice/noosphere-archive/pull/29','title':'source-only follow-up','state':'open'},
            {'kind':'ISSUE','repository':'atlaslattice/noosphere-archive','number':28,
             'url':'https://github.com/atlaslattice/noosphere-archive/issues/28','title':'runner gate','state':'open'}]}
class Docket(unittest.TestCase):
    def test_three_valid_open_items(self):
        xs=load_docket(doc());self.assertEqual(len(xs),3);self.assertTrue(all(not x['automatic_merge_allowed'] for x in xs))
    def test_structural_report(self):
        x=classify_backlog(load_docket(doc()))
        self.assertEqual((x['observed_open_prs'],x['observed_open_issues']),(2,1))
        self.assertEqual(x['completions_from_inventory'],0)
    def test_cross_repo_spoof_denied(self):
        d=doc();d['records'][0]['repository']='atlaslattice/other'
        with self.assertRaises(GitHubDocketHold):load_docket(d)
    def test_duplicate_url_denied(self):
        d=doc();d['records'][1]=copy.deepcopy(d['records'][0]);d['records'][1]['title']='different'
        with self.assertRaises(GitHubDocketHold):load_docket(d)
    def test_closed_as_open_denied(self):
        d=doc();d['records'][0]['state']='closed'
        with self.assertRaises(GitHubDocketHold):load_docket(d)
    def test_issue_as_pr_denied(self):
        d=doc();d['records'][2]['kind']='PR'
        with self.assertRaises(GitHubDocketHold):load_docket(d)
    def test_mismatched_totals_denied(self):
        d=doc();d['github_total_counts']['pr']=4
        with self.assertRaises(GitHubDocketHold):load_docket(d)
    def test_incomplete_query_denied(self):
        d=doc();d['github_incomplete_results']=True
        with self.assertRaises(GitHubDocketHold):load_docket(d)
    def test_dependency_chain_order(self):
        pre='https://github.com/atlaslattice/open-regenerative-compute-standard/pull/'
        xs=dependency_order([(pre+'64',pre+'67'),(pre+'67',pre+'68'),(pre+'63',pre+'65')])
        self.assertLess(xs.index(pre+'64'),xs.index(pre+'67'))
        self.assertLess(xs.index(pre+'67'),xs.index(pre+'68'))
    def test_cycle_denied(self):
        pre='https://github.com/atlaslattice/open-regenerative-compute-standard/pull/'
        with self.assertRaises(GitHubDocketHold):dependency_order([(pre+'64',pre+'67'),(pre+'67',pre+'64')])
    def test_invalid_dependency_denied(self):
        with self.assertRaises(GitHubDocketHold):dependency_order([('A','B')])
    def test_untyped_theme_holds(self):
        d=doc();d['records'][0]['theme']={}
        with self.assertRaises(GitHubDocketHold):load_docket(d)
    def test_source_page_reconciliation_denies_fake_count(self):
        d=doc();d['source_page_lengths']={'pr':[100],'issue':[1]}
        with self.assertRaises(GitHubDocketHold):load_docket(d)
    def test_source_page_reconciliation_accepts_complete(self):
        d=doc();d['source_page_lengths']={'pr':[2],'issue':[1]}
        self.assertEqual(len(load_docket(d)),3)
    def test_source_counts_not_completion(self):
        s=load_docket(doc())
        self.assertEqual(sum(x['automatic_issue_close_allowed'] for x in s),0)

if __name__=='__main__':unittest.main()
