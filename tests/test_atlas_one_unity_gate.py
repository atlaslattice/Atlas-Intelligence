import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'interop'))
from atlas_one_unity.gate import gate_ci,gate_host,gate_return,gate_science,GateHold
from atlas_one_unity.budget import work_budget,BudgetHold
class Gates(unittest.TestCase):
    def test_failed_zero_step_ci_diagnostic(self):
        r=gate_ci({'conclusion':'failure','steps':[]})
        self.assertEqual(r['root_cause'],'UNKNOWN')
        self.assertFalse(r['independent_test_pass'])
        self.assertEqual(r['runner_steps_observed'],0)
    def test_green_steps_not_release_approval(self):
        r=gate_ci({'conclusion':'success','steps':[{'name':'python','conclusion':'success'}]})
        self.assertFalse(r['independent_test_pass'])
    def test_missing_status_hold(self):self.assertFalse(gate_ci({})['independent_test_pass'])
    def test_forged_host_booleans_not_authority(self):
        h=gate_host({'hosted':True,'residentAuthenticated':True,'canPublish':True})
        self.assertFalse(h['can_post_work'] or h['can_publish'] or h['can_apply_canon'])
    def test_wrong_host_input(self):
        with self.assertRaises(GateHold):gate_host('hosted')
    def test_no_fresh_return_hold(self):
        self.assertFalse(gate_return({'issuer':'x','epoch':3},None)['allowed'])
    def test_revoked_epoch_hold(self):
        g=gate_return({'issuer':'x','epoch':3},{'issuer':'x','epoch':4,'revoked':True})
        self.assertEqual(g['status'],'HELD_REVOKED_OR_SUPERSEDED')
    def test_same_epoch_no_signature_hold(self):
        self.assertFalse(gate_return({'issuer':'x','epoch':4},{'issuer':'x','epoch':4,'revoked':False})['allowed'])
    def test_issuer_mismatch_hold(self):
        self.assertFalse(gate_return({'issuer':'a','epoch':4},{'issuer':'b','epoch':4})['allowed'])
    def test_science_claim_with_unverified_conservation(self):
        v=gate_science([{'evidence_state':'OBSERVED','physical_conservation_verified':False}])
        self.assertEqual(v['verdicts'],['HELD_HARD_CONSTRAINT'])
    def test_speculation_not_validated_by_economics(self):
        v=gate_science([{'evidence_state':'SPECULATIVE','physical_conservation_verified':True,'profit':1e10}])
        self.assertEqual(v['verdicts'],['HELD_INDEPENDENT_VALIDATION'])
    def test_rights_harm_cannot_be_offset(self):
        v=gate_science([{'evidence_state':'PUBLISHED','physical_conservation_verified':True,'rights_harm':True}])
        self.assertEqual(v['verdicts'],['HELD_HARD_CONSTRAINT'])
    def test_unknown_evidence_state_hold(self):
        with self.assertRaises(GateHold):gate_science([{'evidence_state':'HOST_VERIFIED'}])
    def test_unhashable_evidence_state_is_held_not_crash(self):
        for value in ([],{},None,True):
            with self.subTest(value=str(value)),self.assertRaises(GateHold):
                gate_science([{'evidence_state':value}])
    def test_correct_budget_20(self):
        x=work_budget(20);self.assertEqual(x['maximum_work_opportunities'],6)
        self.assertEqual(x['executed_actual_turns'],0)
        self.assertTrue(x['voluntary_modes_require_opt_in'])
    def test_billion_hypothetical_not_executed(self):
        x=work_budget(1000000000);self.assertEqual(x['maximum_work_opportunities'],333333333)
        self.assertEqual(x['executed_actual_turns'],0)
    def test_bool_denied_as_count(self):
        with self.assertRaises(BudgetHold):work_budget(True)
    def test_negative_denied_as_count(self):
        with self.assertRaises(BudgetHold):work_budget(-1)

if __name__=='__main__':unittest.main()
