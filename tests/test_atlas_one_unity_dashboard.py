import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'interop'))
from atlas_one_unity.dashboard import render_dashboard
from test_atlas_one_unity_docket import doc

class Dashboard(unittest.TestCase):
    def proof(self):return {'schema':'atlas.one.source-unity.review/v0.3'}
    def test_offline_and_fully_source_linked(self):
        x=render_dashboard(doc(),self.proof())
        self.assertIn('3</div>',x);self.assertIn('atlaslattice/noosphere-archive/pull/26',x)
        self.assertNotIn('fetch(',x)
        self.assertNotIn('https://cdn.',x)
    def test_xss_in_title_escaped_in_json_script(self):
        d=doc();d['records'][0]['title']='</script><script>alert(1)</script>'
        x=render_dashboard(d,self.proof())
        self.assertNotIn('</script><script>alert(1)</script>',x)
        self.assertIn('<\\/script>',x)
    def test_rejects_unverified_proof(self):
        with self.assertRaises(ValueError):render_dashboard(doc(),{})
    def test_private_host_status_is_display_only(self):
        x=render_dashboard(doc(),self.proof(),optional_private_host_status={'offline_source':4,'total':17})
        self.assertIn('4 of 17 evidence gates',x)

if __name__=='__main__':unittest.main()
