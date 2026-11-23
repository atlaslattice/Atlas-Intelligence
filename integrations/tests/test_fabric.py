import json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from atlas_fabric import ReceiptGraph,run_uws_readonly,cycle_plan,dream_packet,compare_brains,query_sheldonbrain
from parser_bridge import normalize
from atlas_ari_dual_brain import messages,BASELINE
from atlas_graph import build
class AtlasFabricTests(unittest.TestCase):
 def test_uws_is_read_only(self):
  self.assertEqual(run_uws_readonly(["drive","files","list"])["state"],"DRY_RUN")
  self.assertEqual(run_uws_readonly(["drive","files","delete"],execute=True)["state"],"DENIED")
  self.assertEqual(query_sheldonbrain("source receipts")["state"],"DRY_RUN")
 def test_graph_is_functional_and_noncrowning(self):
  g=ReceiptGraph()
  source=build(g)
  self.assertEqual(len(g.linked(source)),len(BASELINE["source_links"]))
  self.assertTrue(g.search("Nothing Dies"))
  with self.assertRaises(ValueError):
   g.add_node(node_id="c",kind="Claim",title="Autocanon",source="x",receipt="x",status="canon")
 def test_dream_protocol(self):
  self.assertEqual([x["phase"] for x in cycle_plan()],["DREAM","PLAY","WORK"])
  self.assertEqual(dream_packet(["source:1"],"unexpected idea")["status"],"NON_CANON")
 def test_parser_excludes_hidden_trace(self):
  raw={"conversations":[{"conversation":{"id":"a"},"responses":[
    {"response":{"sender":"human","message":"Hi"}},
    {"response":{"sender":"assistant","message":"Hello","thinking_trace":"private"}}]}]}
  r=normalize(raw,"sha256:abc")
  self.assertEqual(len(r),2)
  self.assertNotIn("thinking_trace",json.dumps(r))
 def test_two_brain_prompt_nonbinding(self):
  self.assertIn("Nothing Dies",messages("Question","primary")[0]["content"])
  self.assertEqual(compare_brains({}, {})["state"],"INSUFFICIENT_EVIDENCE")
 def test_preserved_shugs_is_simulation_not_proof(self):
  source=json.loads((ROOT/"experimental/shugs_lattice_optimum_original.json").read_text())
  self.assertIn("145",source["lattice_optimum"])
  self.assertGreater(source["lattice_optimum"]["145"]["mean_gue_ks"],0)
 def test_no_fake_server_verification(self):
  server=(ROOT.parent/"server.ts").read_text()
  self.assertNotIn("[✓ VERIFIED]",server)
  self.assertIn("provider_dispatch_not_implemented",server)
if __name__=="__main__":unittest.main()
