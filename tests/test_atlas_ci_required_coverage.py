import copy
import unittest
from scripts import atlas_ci_required_coverage as c

class Coverage(unittest.TestCase):
    def setUp(self):
        self.head='a'*40; self.base='b'*40; self.blob='c'*40; self.repo='atlaslattice/Atlas-Intelligence'; self.path='.github/workflows/test.yml'
        self.m=dict(schema='atlas.ci.required/v1',repository=self.repo,pr_number=14,head_sha=self.head,base_sha=self.base,workflows=[dict(path=self.path,workflow_blob_sha=self.blob,jobs=[dict(name='tests',required_steps=['test'])])])
        self.j=dict(id=20,name='tests',run_id=10,attempt=2,head_sha=self.head,runner_id=4,status='completed',conclusion='success',steps=[dict(name='test',number=1,status='completed',conclusion='success')],logs_verified=False)
        self.r=dict(path=self.path,workflow_blob_sha=self.blob,run_id=10,attempt=2,head_sha=self.head,status='completed',conclusion='success',jobs=[self.j])
        self.o=dict(schema='atlas.ci.observation/v1',repository=self.repo,pr_number=14,current_pr_head_sha=self.head,base_sha=self.base,runs=[self.r])
        self.l=dict(run_id=10,attempt=2,job_id=20,repository=self.repo,pr_number=14,head_sha=self.head,workflow_path=self.path,workflow_blob_sha=self.blob,job_name='tests',job_digest=c.digest(self.j),log_sha256='d'*64,log_bytes=12,verification='INDEPENDENT_LOG_REVIEW')
        self.receipts=dict(schema='atlas.ci.log-receipts/v1',records=[self.l])
    def pins(self): return {k:c.digest(v) for k,v in [('manifest',self.m),('observation',self.o),('receipts',self.receipts)]}
    def result(self,pins=None): return c.assess(self.m,self.o,self.receipts,external_pins=self.pins() if pins is None else pins)
    def held(self): self.assertEqual(self.result()['status'],'HELD')
    def test_complete(self):
        x=self.result();self.assertEqual(x['status'],'PINNED_COVERAGE_CONSISTENT');self.assertFalse(x['host_attested']);self.assertFalse(x['release_authority']);self.assertEqual(x['jobs'],1)
    def test_missing_pins(self): self.assertEqual(self.result({})['status'],'HELD')
    def test_stale_manifest_pin(self):
        p=self.pins();self.m['base_sha']='f'*40;self.assertEqual(self.result(p)['status'],'HELD')
    def test_stale_observation_pin(self):
        p=self.pins();self.j['runner_id']=5;self.assertEqual(self.result(p)['status'],'HELD')
    def test_stale_receipt_pin(self):
        p=self.pins();self.l['log_bytes']=100;self.assertEqual(self.result(p)['status'],'HELD')
    def test_missing_workflow(self):
        w=copy.deepcopy(self.m['workflows'][0]);w['path']='.github/workflows/other.yml';self.m['workflows'].append(w);self.held()
    def test_missing_job(self): self.m['workflows'][0]['jobs'].append(dict(name='matrix 2',required_steps=['test']));self.held()
    def test_empty_jobs(self): self.r['jobs']=[];self.held()
    def test_duplicate_workflow(self): self.o['runs'].append(copy.deepcopy(self.r));self.held()
    def test_duplicate_job(self): self.r['jobs'].append(copy.deepcopy(self.j));self.held()
    def test_duplicate_receipt(self): self.receipts['records'].append(copy.deepcopy(self.l));self.held()
    def test_stale_head(self): self.o['current_pr_head_sha']='e'*40;self.held()
    def test_stale_base(self): self.o['base_sha']='e'*40;self.held()
    def test_wrong_workflow_blob(self): self.r['workflow_blob_sha']='e'*40;self.held()
    def test_missing_required_step(self): self.m['workflows'][0]['jobs'][0]['required_steps'].append('lint');self.held()
    def test_duplicate_step(self): self.j['steps'].append(copy.deepcopy(self.j['steps'][0]));self.held()
    def test_missing_step_status(self): self.j['steps'][0].pop('status');self.held()
    def test_wrong_job_attempt(self): self.j['attempt']=1;self.held()
    def test_wrong_receipt_attempt(self): self.l['attempt']=1;self.held()
    def test_receipt_wrong_head(self): self.l['head_sha']='e'*40;self.held()
    def test_log_self_assertion(self): self.j['logs_verified']=True;self.receipts['records']=[];self.held()
    def test_job_digest_mismatch(self): self.j['runner_id']=6;self.held()
    def test_empty_log(self): self.l['log_bytes']=0;self.held()
    def test_malformed_log_digest(self): self.l['log_sha256']='bad';self.held()
    def test_boolean_id(self): self.l['attempt']=True;self.held()
    def test_run_failure(self): self.r['conclusion']='failure';self.held()
    def test_missing_runner(self): self.j.pop('runner_id');self.held()
    def test_no_release_authority_even_if_pins_match(self): self.assertFalse(self.result()['release_authority'])
    def test_two_workflows(self):
        w=copy.deepcopy(self.m['workflows'][0]);w['path']='.github/workflows/lint.yml';self.m['workflows'].append(w)
        r=copy.deepcopy(self.r);r.update(path=w['path'],run_id=11);r['jobs'][0].update(id=21,run_id=11);self.o['runs'].append(r)
        l=copy.deepcopy(self.l);l.update(run_id=11,job_id=21,workflow_path=w['path'],job_digest=c.digest(r['jobs'][0]));self.receipts['records'].append(l)
        self.assertEqual(self.result()['jobs'],2)
