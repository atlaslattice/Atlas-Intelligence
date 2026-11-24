"""No private original source or provider SDK required; standalone v4 test controls."""
import unittest, json, pathlib, tempfile, subprocess, shutil, sys, math
ROOT=pathlib.Path(__file__).resolve().parent
class PortableV4(unittest.TestCase):
 def test_cpp_source_exists(self):self.assertTrue((ROOT/'epoch_v4.cpp').is_file())
 def test_feedback_source_exists(self):self.assertTrue((ROOT/'partial_observation_meta145.py').is_file())
 def test_importer_source_exists(self):self.assertTrue((ROOT/'one_build_v4.mjs').is_file())
 def test_cpp_budget_per_epoch(self):self.assertIn('p.cost+=1.0', (ROOT/'epoch_v4.cpp').read_text())
 def test_cpp_no_viable_retained(self):self.assertIn('selected[5]',(ROOT/'epoch_v4.cpp').read_text())
 def test_cpp_null_authority(self):self.assertIn('authorityEffect',(ROOT/'epoch_v4.cpp').read_text())
 def test_feedback_no_oracle_for_updates(self):self.assertIn('trainingCounterfactualsUsedInUpdates', (ROOT/'partial_observation_meta145.py').read_text())
 def test_feedback_heldout_not_updated(self):self.assertIn('HELD_OUT_FROZEN_NO_TRAINING',(ROOT/'partial_observation_meta145.py').read_text())
 def test_python_part_observation_import_syntax(self):
  import py_compile
  py_compile.compile(str(ROOT/'partial_observation_meta145.py'), doraise=True)
 def test_no_legacy_private_file_in_dir(self):self.assertFalse((ROOT/'atlas.json').exists())
 def test_js_cannot_call_host_by_design(self):
  x=(ROOT/'one_build_v4.mjs').read_text();self.assertIn('EXISTING_BROKER_NO_AUTOPUBLISH',x)
 def test_user_consent_work_mode(self):self.assertIn("originMode!=='WORK'",(ROOT/'one_build_v4.mjs').read_text())
 def test_offline_cannot_complete_macroturn(self):self.assertIn('macroturnsRecorded:0',(ROOT/'one_build_v4.mjs').read_text())
if __name__=='__main__':unittest.main()
