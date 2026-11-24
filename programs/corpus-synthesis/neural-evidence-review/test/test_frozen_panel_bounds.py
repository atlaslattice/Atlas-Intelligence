import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('bounds',Path(__file__).parents[1]/'src'/'frozen_panel_bounds.py')
a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)

class BoundsTests(unittest.TestCase):
    def test_01_mica_bge_tfidf_has_two_possible_overlaps(self):
        x=a.possible_joint_outcomes(24,23,18)
        self.assertEqual([y['both_hit'] for y in x['feasible_paired_outcomes']],[17,18])
    def test_02_mica_paired_conditional_p_min(self):
        self.assertEqual(a.possible_joint_outcomes(24,23,18)['p_min_given_query_independence'],0.0625)
    def test_03_mica_paired_conditional_p_max(self):
        self.assertEqual(a.possible_joint_outcomes(24,23,18)['p_max_given_query_independence'],0.125)
    def test_04_hit_rate_lift_is_five_over_24(self):
        self.assertEqual(a.possible_joint_outcomes(24,23,18)['absolute_hit_rate_lift'],5/24)
    def test_05_recovered_gnn_feasible_overlap(self):
        self.assertEqual([y['both_hit'] for y in a.possible_joint_outcomes(24,23,5)['feasible_paired_outcomes']],[4,5])
    def test_06_no_rows_means_joint_unknown(self):
        self.assertTrue(a.possible_joint_outcomes(24,23,18)['joint_outcomes_unknown'])
    def test_07_all_tie(self):
        self.assertEqual(a.exact_two_sided_mcnemar(0,0),1.0)
    def test_08_invalid_negative(self):
        with self.assertRaises(ValueError): a.exact_two_sided_mcnemar(-1,1)
    def test_09_bool_not_count(self):
        with self.assertRaises(ValueError): a.possible_joint_outcomes(24,True,18)
    def test_10_out_of_range(self):
        with self.assertRaises(ValueError): a.possible_joint_outcomes(24,25,18)
    def test_11_one_family_same_partition_allowed(self):
        r=[{'source_id':'A1','root_family_id':'A','root_verified':True,'partition':'train'},
           {'source_id':'A2','root_family_id':'A','root_verified':True,'partition':'train'}]
        self.assertEqual(a.guard_family_split(r)['status'],'FAMILY_SPLITS_STRUCTURALLY_DISJOINT')
    def test_12_family_crosses_split_hold(self):
        r=[{'source_id':'A1','root_family_id':'A','root_verified':True,'partition':'train'},
           {'source_id':'A2','root_family_id':'A','root_verified':True,'partition':'test'}]
        self.assertEqual(a.guard_family_split(r)['status'],'HOLD_FAMILY_LEAKAGE')
    def test_13_unknown_ancestry_hold(self):
        self.assertEqual(a.guard_family_split([{'source_id':'A1','root_family_id':None,'root_verified':False,'partition':'train'}])['status'],'HOLD_UNKNOWN_FAMILY')
    def test_14_duplicate_source_hold(self):
        r=[{'source_id':'A1','root_family_id':'A','root_verified':True,'partition':'train'}]*2
        self.assertEqual(a.guard_family_split(r)['status'],'HOLD_DUPLICATE_OR_MISSING_SOURCE')
    def test_15_unknown_partition_hold(self):
        self.assertEqual(a.guard_family_split([{'source_id':'A1','root_family_id':'A','root_verified':True,'partition':'future'}])['status'],'HOLD_INVALID_PARTITION')
    def test_16_verified_root_not_sufficient_for_real_rights(self):
        x=a.guard_family_split([{'source_id':'A1','root_family_id':'A','root_verified':True,'partition':'test'}]);self.assertFalse(x['hostRightsVerified'])
    def arm(self,arm='flat',**kw):
        x=dict(arm=arm,eval_manifest='panel-new',candidate_manifest='candidates',source_family_manifest='families',encoder_revision='encoder',active_trainable_params=123,training_examples=100,training_steps=5,rerank_budget=10,route='neural',training_split_frozen=True); x.update(kw); return x
    def test_17_flat_true_shuffled_matching_structural(self):
        self.assertEqual(a.guard_comparison_protocol([self.arm('flat'),self.arm('true_hierarchy'),self.arm('shuffled_hierarchy')])['status'],'COMPARABLE_PROTOCOL_METADATA_ONLY')
    def test_18_stored_equal_active_different_hold(self):
        self.assertEqual(a.guard_comparison_protocol([self.arm('flat',active_trainable_params=47640),self.arm('true_hierarchy',active_trainable_params=47796)])['status'],'HOLD_UNMATCHED_ACTIVE_PARAMS')
    def test_19_different_eval_panel_hold(self):
        self.assertEqual(a.guard_comparison_protocol([self.arm('flat'),self.arm('true_hierarchy',eval_manifest='other')])['status'],'HOLD_INCOMPARABLE_PROTOCOL')
    def test_20_unfrozen_training_split_hold(self):
        self.assertEqual(a.guard_comparison_protocol([self.arm('flat',training_split_frozen=False),self.arm('true_hierarchy')])['status'],'HOLD_UNFROZEN_SPLIT')
    def test_21_different_encoder_revision_hold(self):
        self.assertEqual(a.guard_comparison_protocol([self.arm('flat'),self.arm('true_hierarchy',encoder_revision='different')])['status'],'HOLD_INCOMPARABLE_PROTOCOL')
    def test_22_different_work_budget_hold(self):
        self.assertEqual(a.guard_comparison_protocol([self.arm('flat'),self.arm('true_hierarchy',training_steps=6)])['status'],'HOLD_INCOMPARABLE_PROTOCOL')
    def test_23_missing_arm_hold(self):
        self.assertEqual(a.guard_comparison_protocol([self.arm('flat')])['status'],'HOLD_NEED_MULTIPLE_ARMS')
    def test_24_duplicate_arm_hold(self):
        self.assertEqual(a.guard_comparison_protocol([self.arm('flat'),self.arm('flat')])['status'],'HOLD_DUPLICATE_ARM')
    def test_25_retrieval_route_mismatch_hold(self):
        self.assertEqual(a.guard_comparison_protocol([self.arm('flat'),self.arm('true_hierarchy',route='graph')])['status'],'HOLD_INCOMPARABLE_PROTOCOL')
    def test_26_unpinned_family_manifest_hold(self):
        self.assertEqual(a.guard_comparison_protocol([self.arm('flat',source_family_manifest=''),self.arm('true_hierarchy')])['status'],'HOLD_UNPINNED_PROTOCOL')

if __name__=='__main__': unittest.main()
