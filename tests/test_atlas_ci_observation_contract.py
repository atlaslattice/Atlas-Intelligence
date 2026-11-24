"""New R03 regression controls. No network or credentials."""
import copy
import unittest
from test_atlas_ci_admission import ci, input_for, REPO
import test_atlas_ci_integration as test_integration

class ObservationContract(unittest.TestCase):
    def failed(self, **fields):
        return dict(id=1,status='completed',conclusion='failure',**fields)
    def test_projected_job_is_not_observed_zero(self):
        job={'id':138180761031,'name':'portable-boundaries','status':'completed','conclusion':'failure','run_id':45315353100,'logs_url':None,'steps':None}
        r=ci.evaluate_snapshot(input_for(job))
        self.assertEqual(r['jobs'][0]['job_state'],'HELD_INCOMPLETE_OBSERVATION')
        self.assertIsNone(r['jobs'][0]['runner_id'])
        self.assertIsNone(r['jobs'][0]['executed_steps'])
        self.assertFalse(r['cross_repository_admission_pattern'])
    def test_explicit_zero_and_empty_steps_observed(self):
        self.assertEqual(ci.evaluate_job(self.failed(runner_id=0,steps=[])),'HELD_PRE_RUNNER_UNKNOWN')
    def test_missing_runner_even_with_empty_steps(self):
        self.assertEqual(ci.evaluate_job(self.failed(steps=[])),'HELD_INCOMPLETE_OBSERVATION')
    def test_missing_steps_even_with_zero_runner(self):
        self.assertEqual(ci.evaluate_job(self.failed(runner_id=0)),'HELD_INCOMPLETE_OBSERVATION')
    def test_null_steps_even_with_zero_runner(self):
        self.assertEqual(ci.evaluate_job(self.failed(runner_id=0,steps=None)),'HELD_INCOMPLETE_OBSERVATION')
    def test_boolean_runner_not_zero(self):
        self.assertEqual(ci.evaluate_job(self.failed(runner_id=False,steps=[])),'HELD_INCOMPLETE_OBSERVATION')
    def test_unknown_status_not_pre_runner_proof(self):
        job=self.failed(runner_id=0,steps=[]); del job['status']
        self.assertNotEqual(ci.evaluate_job(job),'HELD_PRE_RUNNER_UNKNOWN')
    def test_unknown_and_zero_preserve_distinct_counts(self):
        d=input_for(self.failed(runner_id=0,steps=[])); a=copy.deepcopy(d['runs'][0]); a.update(repository='atlaslattice/noosphere-archive',run_id=2,jobs=[self.failed(steps=None)])
        d['runs'].append(a); r=ci.evaluate_snapshot(d)
        self.assertFalse(r['cross_repository_admission_pattern'])
        self.assertEqual(r['jobs'][0]['executed_steps'],0)
        self.assertIsNone(r['jobs'][1]['executed_steps'])
    def test_valid_full_name(self):
        self.assertTrue(ci.pr_link_matches({'number':2,'base':{'repo':{'full_name':REPO}}},2,REPO))
    def test_lightweight_url(self):
        self.assertTrue(ci.pr_link_matches({'number':2,'base':{'repo':{'url':'https://api.github.com/repos/'+REPO}}},2,REPO))
    def test_conflicting_repo_link(self):
        self.assertFalse(ci.pr_link_matches({'number':2,'base':{'repo':{'url':'https://api.github.com/repos/'+REPO,'full_name':'other/repo'}}},2,REPO))
    def test_name_only_not_identity(self):
        self.assertFalse(ci.pr_link_matches({'number':2,'base':{'repo':{'name':'Atlas-Intelligence'}}},2,REPO))
    def test_url_suffix_not_identity(self):
        self.assertFalse(ci.pr_link_matches({'number':2,'base':{'repo':{'url':'https://api.github.com/repos/'+REPO+'/other'}}},2,REPO))
    def test_malformed_link(self):
        for link in (None,{'number':2,'base':None},{'number':2,'base':{'repo':None}}):
            self.assertFalse(ci.pr_link_matches(link,2,REPO))
    def test_boolean_pr_number(self):
        self.assertFalse(ci.pr_link_matches({'number':True,'base':{'repo':{'full_name':REPO}}},1,REPO))

class AttemptContract(unittest.TestCase):
    def fixture(self):
        f=test_integration.LiveCollector(); f.setUp(); return f
    def test_documented_job_without_attempt_field(self):
        f=self.fixture(); del f.job['run_attempt']; doc=f.collect()
        self.assertEqual(doc['runs'][0]['job_attempt_binding'],'ATTEMPT_ENDPOINT_AND_RUN_RECHECK')
        self.assertFalse(doc['runs'][0]['jobs'][0]['logs_verified'])
    def test_explicit_null_attempt_is_not_omission(self):
        f=self.fixture(); f.job['run_attempt']=None
        with self.assertRaises(ValueError): f.collect()
    def test_lightweight_pr_link_end_to_end(self):
        f=self.fixture(); f.metadata['pull_requests'][0]['base']['repo']={'url':'https://api.github.com/repos/'+REPO}
        self.assertEqual(f.collect()['runs'][0]['current_pr_head_sha'],f.metadata['head_sha'])
    def test_conflicting_pr_link_fails(self):
        f=self.fixture(); f.metadata['pull_requests'][0]['base']['repo']['url']='https://api.github.com/repos/other/repo'
        with self.assertRaises(ValueError): f.collect()
    def test_absent_attempt_never_certifies_logs(self):
        f=self.fixture(); del f.job['run_attempt']; self.assertEqual(ci.evaluate_snapshot(f.collect())['release_gate'],'HELD')
    def test_bool_run_id_rejected(self):
        f=self.fixture(); f.job['run_id']=True
        with self.assertRaises(ValueError): f.collect()
