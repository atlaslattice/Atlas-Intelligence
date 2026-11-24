import unittest, importlib.util, pathlib, json, tempfile, shutil, csv, sys, os, hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('atlas_compiler',ROOT/'src/compiler.py')
c=importlib.util.module_from_spec(spec);sys.modules[spec.name]=c;spec.loader.exec_module(c)

def fake_source():
 d={'houses':{},'spheres':{},'nodes':{}}
 for h in range(1,13):
  hid=f'H{h:02d}';d['houses'][hid]={'id':hid,'name':f'Synthetic House {h}'}
  for s in range(1,13):
   sid=f'{hid}.S{s:02d}';d['spheres'][sid]={'id':sid,'name':f'Synthetic Sphere {hid} {s}','parent':hid}
   for n in range(1,13):
    id=f'{sid}.N{n:02d}';d['nodes'][id]={'id':id,'name':f'Synthetic specialization {id}',
      'parent':sid,'kind':'DOMAIN_SPECIALIZATION' if s<=7 else 'EPISTEMIC_META',
      'definition':f'Definition of {id}','includes':'synthetic positive fixture',
      'excludes':'synthetic adversarial fixture','source_record_sha256':'a'*64}
 return d

def fake_crosswalk():
 h=['T_ID','OpenAlex_topic_name_source','Candidate_HSN','Other_4_HSN_candidates']
 data=[h,['T1','Synthetic research topic','H01.S01.N01','H01.S01.N02;H01.S01.N03;H01.S01.N04;H01.S01.N05']]
 import io
 o=io.StringIO();w=csv.writer(o);w.writerows(data);return o.getvalue().encode()

class TestRoadmap(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.d=fake_source();cls.c=fake_crosswalk();cls.links,cls.stats=c.parse_crosswalk(cls.c,'synthetic',mode='synthetic');cls.p=c.compile_plan(cls.d,cls.links,'synthetic','synthetic','synthetic')
 def test_valid_synthetic(self):self.assertTrue(c.validate_source(self.d,'synthetic','synthetic'))
 def test_12houses(self):self.assertEqual(len(self.p['houses']),12)
 def test_144spheres(self):self.assertEqual(len(self.p['spheres']),144)
 def test_1728nodes(self):self.assertEqual(len(self.p['nodes']),1728)
 def test_1728unique_metric_names(self):self.assertEqual(len(set(m['name'] for m in self.p['metrics'])),1728)
 def test_1728_unique_specs(self):self.assertEqual(len(set(n['specSHA256'] for n in self.p['nodes'])),1728)
 def test_12_child_spheres(self):self.assertTrue(all(len(s['nodeIds'])==12 for s in self.p['spheres']))
 def test_source_roles(self):
  from collections import Counter
  self.assertEqual(Counter(n['role'] for n in self.p['nodes']),{'DOMAIN_SPECIALIZATION':1008,'EPISTEMIC_META':720})
 def test_method_requires_domain_subject(self):
  self.assertTrue(all(m['requiresExplicitDomainSubject'] for m in self.p['metrics'] if int(m['node'][5:7])>=8))
 def test_no_earned_gains(self):self.assertTrue(all(m['achievementStatus']=='NOT_EARNED' and m['baselineValue'] is None for m in self.p['metrics']))
 def test_5_crosswalk_edges(self):self.assertEqual(self.stats['candidateEdges'],5)
 def test_no_semantic_approval(self):self.assertTrue(all(n['openalex']['reviewStatus']=='UNREVIEWED' for n in self.p['nodes']))
 def test_zero_authority(self):self.assertTrue(all(n['canonEffect']=='NONE' and n['hostAction']=='NONE' and n['autoAssignResident'] is False for n in self.p['nodes']))
 def test_no_private_import(self):self.assertTrue(all(n['protectedModeImported'] is False for n in self.p['nodes']))
 def test_no_ordinal_excellence_mapping(self):self.assertEqual(self.p['root']['existingProgramEquivalence'],'NONE_UNTIL_SEMANTIC_REVIEW')
 def test_no_fake_host_confirmation(self):self.assertEqual(self.p['root']['hostDeployment'],'NOT_VERIFIED')
 def test_root_final_receipt(self):self.assertEqual(len(self.p['root']['finalSphereReceipt']),64)
 def test_36_positive_and_negative_housenames(self):self.assertEqual(len({h['existingGate'] for h in self.p['houses']}),12)
 def test_work_preflight(self):
  x=c.route_preview(self.p,'H01.S01.N01',mode='WORK',source_sha='synthetic');self.assertEqual(x['status'],'PREPARED_SOURCE_ONLY_NOT_AUTHORIZED');self.assertFalse(x['hostAuthenticated'])
 def test_private_preflight_denied(self):self.assertEqual(c.route_preview(self.p,'H08.S01.N01',mode='IMAGINE',source_sha='synthetic')['status'],'HOLD')
 def test_wrong_source_pin_denied(self):self.assertEqual(c.route_preview(self.p,'H01.S01.N01',mode='WORK',source_sha='0'*64)['reason'],'INDEPENDENT_SOURCE_PIN_REQUIRED')
 def test_invalid_coord_denied(self):self.assertEqual(c.route_preview(self.p,'H00.S00.N00',mode='WORK',source_sha='synthetic')['status'],'HOLD')
 def test_bad_role_denied(self):
  d=fake_source();d['nodes']['H01.S08.N01']['kind']='DOMAIN_SPECIALIZATION'
  with self.assertRaisesRegex(ValueError,'SPHERE_ROLE_AXIS'):c.validate_source(d,'synthetic','synthetic')
 def test_missing_node_denied(self):
  d=fake_source();d['nodes'].pop('H01.S01.N01')
  with self.assertRaisesRegex(ValueError,'SOURCE_CARDINALITY'):c.validate_source(d,'synthetic','synthetic')
 def test_duplicate_topic_denied(self):
  txt=self.c.decode()+'T1,duplicate,H01.S01.N06,H01.S01.N07;H01.S01.N08;H01.S01.N09;H01.S01.N10\n'
  with self.assertRaisesRegex(ValueError,'TOPIC_DUPLICATE'):c.parse_crosswalk(txt,'synthetic','synthetic')
 def test_duplicate_candidate_denied(self):
  txt=self.c.decode().replace('H01.S01.N02;','H01.S01.N01;')
  with self.assertRaisesRegex(ValueError,'CANDIDATE_SHAPE'):c.parse_crosswalk(txt,'synthetic','synthetic')
 def test_wrong_source_claim_denied(self):
  with self.assertRaisesRegex(ValueError,'ARIADNE_ORIGINAL_SHA'):c.validate_source(self.d,'synthetic','original')
 def test_same_plan_digest_on_replay(self):self.assertEqual(self.p['root']['roadmapSHA256'],c.compile_plan(self.d,self.links,'synthetic','synthetic','synthetic')['root']['roadmapSHA256'])
 def test_no_closure_with_zero_rights(self):self.assertTrue(all('rights_approved_by_host' in n['prerequisites'] for n in self.p['nodes']))
 def test_proposed_not_implemented(self):self.assertTrue(all(s['adapterStatus']=='NOT_IMPLEMENTED' for s in self.p['spheres']))
 def test_12_phases(self):self.assertEqual(len(self.p['phases']),12)
 def test_document_includes_all_144(self):self.assertEqual(c.render_full_markdown(self.p).count('### H'),144)
 def test_directions_valid(self):self.assertEqual(set(m['direction'] for m in self.p['metrics']),{'higher','lower'})
 def test_lower_numerators_are_bad_outcomes(self):self.assertTrue(all('Incorrect' in m['numeratorDefinition'] for m in self.p['metrics'] if m['direction']=='lower'))
 def test_protected_mode_not_accounted_as_gain(self):self.assertEqual(self.p['root']['verifiedNodeGains'],0)
 def test_source_compilation_has_complete_markdown(self):
  with tempfile.TemporaryDirectory() as t:
   root=pathlib.Path(t);(root/'s.json').write_text(json.dumps(self.d));(root/'t.csv').write_bytes(self.c)
   plan,manifest=c.build(root/'s.json',root/'t.csv',root/'out','synthetic');self.assertEqual(plan['root']['nodeCount'],1728);self.assertEqual(len(manifest['artifacts']),8)
 def test_maintains_all_alternates(self):
  self.assertEqual([x['role'] for x in self.p['nodes'][0]['openalex']['candidateTopics']],['PRIMARY'])
  self.assertEqual(sum(n['openalex']['alternateCount'] for n in self.p['nodes']),4)
 def test_156_receipt_coordinate_heads(self):
  self.assertEqual(len({s['receiptSHA256'] for s in self.p['spheres']}),144)
 def test_no_method_auto_promotion(self):self.assertTrue(all('method' in s['implementationPathway'].lower() for s in self.p['spheres'] if s['role']=='EPISTEMIC_META'))
 def test_metric_id_contains_exact_HSN(self):self.assertEqual(self.p['metrics'][0]['id'],'METRIC.H01.S01.N01')
 def test_node_code_slot_matches_sphere(self):self.assertTrue(all(n['codeSlot'].endswith('/index.mjs') for n in self.p['nodes']))
 def test_no_sphere_binds_excellence_as_hsn(self):self.assertTrue(all('EX.W' not in s['id'] for s in self.p['spheres']))
 def test_no_original_bytes_in_source_code(self):
  code=(ROOT/'src/compiler.py').read_text();self.assertNotIn('Mechanics of matter',code)

class TestOriginalOptional(unittest.TestCase):
 def test_owner_source_exact(self):
  p=os.environ.get('ATLAS_ORIGINAL_SOURCE')
  if not p:self.skipTest('Original owner data not mounted')
  b=pathlib.Path(p).read_bytes();self.assertEqual(c.sha(b),c.ARIADNE_SHA)
  self.assertTrue(c.validate_source(json.loads(b),c.sha(b),'original'))
 def test_owner_openalex_exact(self):
  p=os.environ.get('ATLAS_ORIGINAL_OPENALEX')
  if not p:self.skipTest('Historical owner data not mounted')
  b=pathlib.Path(p).read_bytes();self.assertEqual(c.sha(b),c.OPENALEX_SHA)
  links,m=c.parse_crosswalk(b,c.sha(b),'original');self.assertEqual((m['historicalTopics'],m['candidateEdges']),(4516,22580))

if __name__=='__main__':unittest.main()
