"""No live GitHub writes or calls. All fixtures synthetic."""
import copy
import sys
import tempfile
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from scripts.workboard_integrity import audit,load,compare_snapshots,SCHEMA


def fixture():
    return {'schema':SCHEMA,'observed_date':'2026-11-22','visibility':'PUBLIC_GITHUB_METADATA_ONLY',
            'authorization':'NONE','coverage':'SOURCE_SEARCH_SNAPSHOT_NOT_CLOSED_OR_COMPLETED',
            'million_horizon':'NOT_EXECUTED','rhythm':{'beats_per_macroturn':20,'work_slots':6,
            'play_slots':3,'social_slots':3,'imagine_slots':3,'dream_slots':3,'quiet_slots':2,
            'forced_private_activity':False},
            'issues':[{'url':'https://github.com/atlaslattice/Atlas-Intelligence/issues/2','title':'Candidate','number':2,'repository':'atlaslattice/Atlas-Intelligence','type':'issue'}],
            'prs':[{'url':'https://github.com/atlaslattice/Atlas-Intelligence/pull/3','title':'Draft','number':3,'repository':'atlaslattice/Atlas-Intelligence','type':'pull_request'}],
            'aggregate':{'open_issues_observed':1,'open_prs_observed':1,
             'issue_by_repo':{'atlaslattice/Atlas-Intelligence':1},
             'pr_by_repo':{'atlaslattice/Atlas-Intelligence':1}},
            'sources':[{'cut':'old','count':100,'capped':True}]}

class WorkboardTests(unittest.TestCase):
    def verify(self,p):return audit(p)
    def test_valid_is_not_live(self):
        x=self.verify(fixture());self.assertEqual(x['status'],'INDEX_STRUCTURE_VERIFIED_NOT_LIVE');self.assertFalse(x['live_verified'])
    def test_counts(self):self.assertEqual(self.verify(fixture())['distinct_urls'],2)
    def test_reject_unauthorized(self):
        p=fixture();p['authorization']='GRANTED';self.assertIn('FORGED_AUTHORIZATION',self.verify(p)['errors'])
    def test_no_hypothetical_real_turns(self):
        p=fixture();p['million_horizon']='DONE';self.assertIn('FALSE_MACROTURN_COMPLETION',self.verify(p)['errors'])
    def test_invalid_schema(self):
        p=fixture();p['schema']='bad';self.assertIn('SCHEMA_MISMATCH',self.verify(p)['errors'])
    def test_private_sources(self):
        p=fixture();p['visibility']='ALL_PRIVATE';self.assertIn('NOT_PUBLIC_METADATA_ONLY',self.verify(p)['errors'])
    def test_missing_root(self):self.assertEqual(self.verify([])['status'],'HOLD_INVALID_ROOT')
    def test_missing_list(self):
        p=fixture();p.pop('issues');self.assertEqual(self.verify(p)['status'],'HOLD_INVALID_INDEX')
    def test_duplicates(self):
        p=fixture();p['issues'].append(p['issues'][0]);p['aggregate']['open_issues_observed']=2;p['aggregate']['issue_by_repo']['atlaslattice/Atlas-Intelligence']=2
        self.assertIn('DUPLICATE_URL',self.verify(p)['errors'])
    def test_stale_by_repo(self):
        p=fixture();p['aggregate']['issue_by_repo']={}
        self.assertIn('PER_REPO_COUNT_MISMATCH',self.verify(p)['errors'])
    def test_stale_totals(self):
        p=fixture();p['aggregate']['open_issues_observed']=12
        self.assertIn('AGGREGATE_COUNT_MISMATCH',self.verify(p)['errors'])
    def test_repo_mismatch(self):
        p=fixture();p['issues'][0]['repository']='atlaslattice/other';self.assertIn('REPO_MISMATCH',self.verify(p)['errors'])
    def test_type_mismatch(self):
        p=fixture();p['issues'][0]['type']='pull_request';self.assertIn('WRONG_RECORD_KIND',self.verify(p)['errors'])
    def test_number_bool_alias(self):
        p=fixture();p['issues'][0]['number']=True;self.assertIn('NUMBER_MISMATCH',self.verify(p)['errors'])
    def test_number_wrong(self):
        p=fixture();p['prs'][0]['number']=6;self.assertIn('NUMBER_MISMATCH',self.verify(p)['errors'])
    def test_foreign_url(self):
        p=fixture();p['prs'][0]['url']='https://github.com/notowner/x/pull/3';self.assertIn('INVALID_OR_FOREIGN_URL',self.verify(p)['errors'])
    def test_modified_url(self):
        p=fixture();p['prs'][0]['url']='https://github.com/atlaslattice/Atlas-Intelligence/pull/3#diff';self.assertIn('INVALID_OR_FOREIGN_URL',self.verify(p)['errors'])
    def test_empty_title(self):
        p=fixture();p['issues'][0]['title']=' ';self.assertIn('MISSING_TITLE',self.verify(p)['errors'])
    def test_work_exceed_one_third(self):
        p=fixture();p['rhythm']['work_slots']=7;p['rhythm']['quiet_slots']=1
        self.assertIn('WORK_SHARE_EXCEEDED_OR_INVALID',self.verify(p)['errors'])
    def test_work_bool_bad(self):
        p=fixture();p['rhythm']['work_slots']=True;self.assertIn('WORK_SHARE_EXCEEDED_OR_INVALID',self.verify(p)['errors'])
    def test_private_forced(self):
        p=fixture();p['rhythm']['forced_private_activity']=True;self.assertIn('PRIVATE_ACTIVITY_NOT_VOLUNTARY',self.verify(p)['errors'])
    def test_missing_source_cuts(self):
        p=fixture();p['sources']=[];self.assertIn('NO_SEARCH_SOURCES',self.verify(p)['errors'])
    def test_capped_warning(self):
        self.assertIn('CAPPED_SOURCE_PARTIAL_COVERAGE_POSSIBLE',self.verify(fixture())['warnings'])
    def test_compare_missing_not_closed(self):
        p=fixture();q=copy.deepcopy(p);q['issues']=[];q['aggregate']['open_issues_observed']=0;q['aggregate']['issue_by_repo']={}
        diff=compare_snapshots(p,q);self.assertEqual(len(diff['missing_from_new_cut']),1);self.assertEqual(diff['source_closures_verified'],0)
    def test_compare_new_no_merge(self):
        p=fixture();q=copy.deepcopy(p);q['prs']=[];q['aggregate']['open_prs_observed']=0;q['aggregate']['pr_by_repo']={}
        self.assertEqual(compare_snapshots(p,q)['source_merges_verified'],0)
    def test_duplicate_json_keys(self):
        with tempfile.TemporaryDirectory() as d:
            f=Path(d)/'x.json';f.write_text('{"a":1,"a":2}')
            with self.assertRaises(ValueError):load(f)
    def test_invalid_json_nan(self):
        with tempfile.TemporaryDirectory() as d:
            f=Path(d)/'x.json';f.write_text('{"bad":NaN}')
            with self.assertRaises(ValueError):load(f)
    def test_invalid_date(self):
        p=fixture();p['observed_date']='tomorrow';self.assertIn('INVALID_OBSERVATION_DATE',self.verify(p)['errors'])
    def test_source_capped_bool(self):
        p=fixture();p['sources'][0]['capped']=1;self.assertIn('INVALID_SOURCE_CUT',self.verify(p)['errors'])
    def test_no_system_side_effects(self):
        p=fixture();old=copy.deepcopy(p);audit(p);self.assertEqual(p,old)

if __name__=='__main__':unittest.main()