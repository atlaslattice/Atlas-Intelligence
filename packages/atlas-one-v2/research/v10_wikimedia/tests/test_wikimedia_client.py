import sys,pathlib,unittest,tempfile,json
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'src'))
from wikimedia_bridge import WikimediaHold,entity_request,page_structure_request
from wikimedia_client import *

CONTACT='https://github.com/atlaslattice/Atlas-Intelligence'
GOOD=entity_request('Q42')
class ClientTests(unittest.TestCase):
    def test_readonly_templates(self):self.assertEqual(safe_fetch_url(GOOD),GOOD)
    def test_strict_revision_parse_url_allowed(self):
        self.assertEqual(safe_fetch_url(page_structure_request(6789)),page_structure_request(6789))
    def test_broad_parse_denied(self):
        with self.assertRaises(WikimediaHold):safe_fetch_url(page_structure_request(6789).replace('oldid=6789','page=Earth'))
    def test_write_denied(self):
        for x in ['https://www.wikidata.org/w/api.php?action=wbsetclaim&ids=Q42&format=json',
                  'https://evil.example/w/api.php?action=wbgetentities&ids=Q42&format=json',
                  'https://en.wikipedia.org/w/rest.php/v1/page/Earth?debug=1',
                  'http://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q42&format=json',
                  'https://en.wikipedia.org/w/api.php?action=edit&title=Earth&format=json']:
            with self.subTest(url=x),self.assertRaises(WikimediaHold):safe_fetch_url(x)
    def test_optin_and_contact_required(self):
        with self.assertRaises(WikimediaHold):prepare_fetch_batch([GOOD],CONTACT)
        with self.assertRaises(WikimediaHold):prepare_fetch_batch([GOOD],'anonymous',authorized=True,accepted_policy=True)
        x=prepare_fetch_batch([GOOD],CONTACT,authorized=True,accepted_policy=True)
        self.assertFalse(x['canPromoteCanon'])
    def test_budget_and_throttle(self):
        with self.assertRaises(WikimediaHold):prepare_fetch_batch([GOOD]*4,CONTACT,max_requests=4,authorized=True,accepted_policy=True)
        with self.assertRaises(WikimediaHold):prepare_fetch_batch([GOOD],CONTACT,min_interval_s=0.01,authorized=True,accepted_policy=True)
    def test_malformed_manual_batch_cannot_raise_quota(self):
        with tempfile.TemporaryDirectory() as p:
            b=prepare_fetch_batch([GOOD],CONTACT,authorized=True,accepted_policy=True)
            b['maxRequests']=1000
            with self.assertRaises(WikimediaHold):execute_fetch_batch(b,p,transport=lambda u,a:(200,b'{}',None))
    def test_wikidata_query_shape_not_broadenable(self):
        with self.assertRaises(WikimediaHold):safe_fetch_url(GOOD.replace('Q42','Q1%7CQ2'))
    def test_dedup(self):
        with self.assertRaises(WikimediaHold):prepare_fetch_batch([GOOD,GOOD],CONTACT,authorized=True,accepted_policy=True)
    def test_offline_fake_transport_writes_private_file(self):
        with tempfile.TemporaryDirectory() as p:
            batch=prepare_fetch_batch([GOOD],CONTACT,authorized=True,accepted_policy=True)
            r=execute_fetch_batch(batch,p,transport=lambda u,ua:(200,b'{"entities":{}}',None),sleeper=lambda t:None)
            self.assertEqual(r['actualRequests'],1);self.assertEqual(r['results'][0]['status'],'PRIVATE_RAW_SNAPSHOT_STORED')
            self.assertEqual((pathlib.Path(p)/r['results'][0]['file']).read_bytes(),b'{"entities":{}}')
            self.assertEqual(r['wikidataStatementsVerified'],0)
    def test_rate_limit_stops_with_no_retry(self):
        with tempfile.TemporaryDirectory() as p:
            b=prepare_fetch_batch([GOOD],CONTACT,authorized=True,accepted_policy=True)
            r=execute_fetch_batch(b,p,transport=lambda u,ua:(429,b'',"10"),sleeper=lambda t:None)
            self.assertEqual(r['results'][0]['retryAfter'],'10');self.assertEqual(list(pathlib.Path(p).glob('*.json')),[])
    def test_bad_json_rejected(self):
        with tempfile.TemporaryDirectory() as p:
            b=prepare_fetch_batch([GOOD],CONTACT,authorized=True,accepted_policy=True)
            with self.assertRaises(WikimediaHold):execute_fetch_batch(b,p,transport=lambda u,ua:(200,b'<html>',None),sleeper=lambda t:None)
    def test_network_failure_not_success(self):
        with tempfile.TemporaryDirectory() as p:
            b=prepare_fetch_batch([GOOD],CONTACT,authorized=True,accepted_policy=True)
            def fail(u,a):raise OSError('no network')
            r=execute_fetch_batch(b,p,transport=fail,sleeper=lambda t:None)
            self.assertEqual(r['results'][0]['status'],'TRANSPORT_UNAVAILABLE')
    def test_no_auto_retry(self):
        with tempfile.TemporaryDirectory() as p:
            b=prepare_fetch_batch([GOOD],CONTACT,authorized=True,accepted_policy=True)
            calls=[]
            def f(u,a):calls.append(1);return (503,b'',None)
            r=execute_fetch_batch(b,p,transport=f,sleeper=lambda t:None)
            self.assertEqual(len(calls),1)
            self.assertEqual(r['results'][0]['status'],'STOPPED_RATE_LIMIT_OR_UNAVAILABLE')

if __name__=='__main__':unittest.main()
