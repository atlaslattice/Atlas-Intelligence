"""Public-safe synthetic-only tests. No original Ariadne node/source bytes."""
from __future__ import annotations
import csv,hashlib,io,json,pathlib,sys,unittest,copy
ROOT=pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'src'))
import atlas_glyph_memory as a

def synthetic():
    records=[];mode=[]
    for h in range(1,13):
        for s in range(1,13):
            sphere=f'H{h:02}.S{s:02}'
            mode.append({'id':f'N144-{h:02}-{s:02}','sphere':sphere,'mode':'WORK' if len(mode)<104 else 'IMAGINE','taskStatus':'PROPOSED_NOT_IMPLEMENTED'})
            for n in range(1,13):
                c=f'{sphere}.N{n:02}'
                records.append({'coordinate':c,'house_name':f'Synthetic House {h:02}',
                    'sphere_name':f'Synthetic Focus {h:02} {s:02}',
                    'node_name':f'Synthetic Method {s:02} Branch {n:02}',
                    'node_kind':'DOMAIN_SPECIALIZATION' if s<=7 else 'EPISTEMIC_META',
                    'source_sha256':hashlib.sha256(c.encode()).hexdigest()})
    io_obj=io.StringIO();writer=csv.DictWriter(io_obj,fieldnames=records[0].keys(),delimiter='\t',lineterminator='\n');writer.writeheader();writer.writerows(records)
    mock_modes={'schema':'synthetic-test-only','registryDigest':a.REGISTRY_SHA,'sourceContainsPrivateModeBodies':False,'modes':mode}
    return io_obj.getvalue().encode(),json.dumps(mock_modes).encode(),json.dumps({'metaHash':a.PRIOR_META_HASH}).encode()

class PublicSyntheticTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
    cls.b=synthetic();cls.c=a.Corpus(*cls.b,verified=False);cls.engine=a.AtlasGlyphMemoryEngine(cls.c)
    cls.edges,cls.houses=cls.engine.run();cls.cache=a.SourceLockedMemo(cls.engine.search)
 def test_p01_complete_source_shape(self):self.assertEqual(len(self.c.nodes),1728)
 def test_p02_144_unique_sphere(self):self.assertEqual(len(self.c.spheres),144)
 def test_p03_12_houses(self):self.assertEqual(len(self.houses),12)
 def test_p04_84_domain_60_meta_spheres(self):self.assertEqual(sum(s.role=='DOMAIN_SPECIALIZATION' for s in self.c.spheres),84)
 def test_p05_104_work_40_held(self):self.assertEqual((self.c.modes['WORK'],self.c.modes['IMAGINE']),(104,40))
 def test_p06_synthetic_not_verified_as_original(self):self.assertFalse(self.c.source_attested_original)
 def test_p07_default_refuses_forged_source_bytes(self):
    with self.assertRaises(a.SourceHold):a.Corpus(*self.b)
 def test_p08_144_distinct_memory_nodes(self):self.assertEqual(len(set(x['sphere'] for x in self.engine.cards)),144)
 def test_p09_homogeneous_spheres(self):self.assertTrue(all(len(set(n['kind'] for n in s.nodes))==1 for s in self.c.spheres))
 def test_p10_indexed_vs_linear(self):
    for s in self.c.spheres:self.assertEqual(self.engine.search.indexed(s.id),self.engine.search.linear(s.id))
 def test_p11_memory_cutoff(self):
    for j,s in enumerate(self.c.spheres):self.assertEqual(self.engine.search.indexed(s.id,prior_exclusive=j),self.engine.search.linear(s.id,prior_exclusive=j))
 def test_p12_memory_events_are_real_data_only(self):self.assertEqual(len(self.engine.memory.events),144)
 def test_p13_memory_restore_exact(self):self.assertEqual(a.MemoryChain.restore(self.engine.memory.events).head,self.engine.memory.head)
 def test_p14_memory_rejects_altered_payload(self):
    rows=copy.deepcopy(self.engine.memory.events);rows[-1]['payload']['sourceSphereDigest']='0'*64
    with self.assertRaises(a.SourceHold):a.MemoryChain.restore(rows)
 def test_p15_memory_rejects_forged_authority(self):
    row=copy.deepcopy(self.engine.memory.events[0]['payload']);row['hostVerified']=True
    with self.assertRaises(a.SourceHold):a.MemoryChain().append(row)
 def test_p16_cache_matches_full_detail(self):
    for s in self.c.spheres:self.assertEqual(self.cache.recall(s.id),self.engine.search.linear(s.id))
 def test_p17_cache_matches_summary(self):
    for s in self.c.spheres:
        a1=self.cache.recall_summary(s.id)
        a2=tuple((r['targetSphere'],r['score'],r['sourceSphereDigest']) for r in self.engine.search.linear(s.id))
        self.assertEqual(a1,a2)
 def test_p18_cache_denies_epoch_change(self):
    with self.assertRaises(a.SourceHold):self.cache.recall_summary('H01.S01',rights_epoch=9)
 def test_p19_cache_denies_mode_change(self):
    with self.assertRaises(a.SourceHold):self.cache.recall('H01.S01',mode_sha='b'*64)
 def test_p20_cache_cannot_be_mutated(self):self.assertIsInstance(self.cache.recall_summary('H01.S01'),tuple)
 def test_p21_glyph_reversible_display(self):
    g=a.glyph_coordinates('H08.S01.N10');self.assertEqual(g['gf7PositionalAddress'],'GF7.B08.M01.C10')
 def test_p22_glyph_mnemonic_grounded_stems(self):self.assertEqual(a.glyph_coordinates('H08.S01.N10')['plateMnemonicQ'],'Q:tiri.sala.turu')
 def test_p23_no_kg8_gf7_semantic_equivalence(self):self.assertIn('NOT_SEMANTIC_EQUIVALENCE',a.glyph_coordinates('H08.S01.N10')['namespaceRelation'])
 def test_p24_12_distinct_synthetic_fields(self):self.assertEqual(len({a.synthetic_plate_field(x)['fieldSHA256'] for x in range(1,13)}),12)
 def test_p25_work_intents_are_not_posts(self):
    x=a.prepare_safe_work_intents(self.engine.cards);self.assertEqual(len(x),104);self.assertTrue(all(r['postsPerformed']==0 for r in x))
 def test_p26_nonwork_never_exported(self):
    xs={r['sphere'] for r in a.prepare_safe_work_intents(self.engine.cards)}
    self.assertTrue(all(s.id not in xs for s in self.c.spheres if s.mode!='WORK'))
 def test_p27_no_canon_claim(self):self.assertEqual(self.engine.meta['canonEffect'],'NONE')
 def test_p28_no_weight_training_claim(self):self.assertFalse(self.engine.meta['modelWeightsChanged'])
 def test_p29_source_identity_unique(self):self.assertEqual(len(set(s.source_digest for s in self.c.spheres)),144)
 def test_p30_crosshouse_edges_unreviewed(self):self.assertTrue(all(r['semanticAdjudication']=='NOT_PERFORMED' for r in self.edges))
 def test_p31_no_private_bodies_in_output(self):self.assertTrue(all(r['payload']['privateBodiesImported']==False for r in self.engine.memory.events))
 def test_p32_frozen_metadata_only(self):self.assertEqual(self.c.source_claim,a.REGISTRY_SHA)

 def test_p33_cross_source_roles_preserved(self):
    self.assertTrue(all(e['fromRole'] in ('DOMAIN_SPECIALIZATION','EPISTEMIC_META') and e['toRole'] in ('DOMAIN_SPECIALIZATION','EPISTEMIC_META') for e in self.edges))
 def test_p34_all_links_have_counterexample(self):self.assertEqual(len([e for e in self.edges if e['counterexampleToSeek']]),len(self.edges))

if __name__=='__main__':unittest.main()
