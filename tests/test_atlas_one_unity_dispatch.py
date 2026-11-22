import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'interop'))
from atlas_one_unity.dispatch import prepare_global_packets,route_workstream,WORKSTREAMS
from test_atlas_one_unity_docket import doc
class Dispatch(unittest.TestCase):
    def test_every_record_retained(self):
        d=prepare_global_packets(doc());self.assertEqual(d['total'],3)
        self.assertEqual(d['open_prs'],2);self.assertEqual(d['open_issues'],1)
        self.assertEqual(len(d['review_packets']),3)
    def test_all_twelve_workstreams_distinct(self):
        self.assertEqual(len(WORKSTREAMS),12);self.assertEqual(len(set(WORKSTREAMS)),12)
    def test_heurstic_not_hsn(self):
        d=prepare_global_packets(doc())
        self.assertTrue(all(x['hsn_semantic_mapping']=='UNREVIEWED' for x in d['review_packets']))
    def test_no_auto_merges_or_false_task_count(self):
        d=prepare_global_packets(doc())
        self.assertEqual(d['prs_merged'],0);self.assertEqual(d['tasks_closed'],0)
        self.assertEqual(d['real_macroturns_executed_by_router'],0)
        self.assertTrue(all(not x['can_merge'] and not x['can_close'] for x in d['review_packets']))
    def test_one_third_budget_is_a_constraint(self):
        d=prepare_global_packets(doc())
        self.assertTrue(all(x['work_budget_constraint'].startswith('AT_MOST') for x in d['review_packets']))
    def test_source_only_private_mode_exclusion(self):
        d=prepare_global_packets(doc())
        self.assertTrue(all(x['private_mode_import'] is False for x in d['review_packets']))
    def test_lexical_heuristic_explicit(self):
        a,b=route_workstream('Ariadne H12 source edition','atlaslattice/Atlas-Intelligence')
        self.assertEqual(a,'W05_ARIADNE_ONTOLOGY');self.assertIn('LEXICAL_',b)
    def test_issue_gates_not_authority(self):
        d=prepare_global_packets(doc())
        self.assertEqual(d['authority'],'NONE');self.assertFalse(d['publishable'])

if __name__=='__main__':unittest.main()
