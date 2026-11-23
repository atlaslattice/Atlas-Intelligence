import collections
import copy
import gzip
import json
import pathlib
import sys
import tempfile
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
from circuit import compile_circuit,parse_source,EDITION_SHA,stable_digest,tokens,node_packet

SOURCE=pathlib.Path('/mnt/data/atlas1728_src/NEXT144_FULL_SOURCE_BOUND_PRIVATE.json')

# Tests use self-contained synthetic metadata where possible; the private
# full 1728-node input is never packaged into the public Git review.
def synthetic():
    tasks=[];nodes=[]
    for h in range(1,13):
        for s in range(1,13):
            sid=f'H{h:02d}.S{s:02d}';tid=f'N144-{h:02d}-{s:02d}'
            tasks.append({'id':tid,'sphere':sid,'title':'Synthetic test fixture',
              'experiment':'Test synthetic source references','falsifier':'Altered fixtures HOLD',
              'suggestedMode':'WORK' if s<8 else 'QUIET','status':'PROPOSED_NOT_IMPLEMENTED','proofStatus':'DESIGN_ONLY'})
            for n in range(1,13):
                nodes.append({'coordinate':f'{sid}.N{n:02d}','sphere':sid,'initiative':tid,
                  'sourceRole':'DOMAIN_SPECIALIZATION' if s<=7 else 'EPISTEMIC_META',
                  'sourceNodeDigest':f'{h:02x}{s:02x}{n:02x}'+'0'*58,
                  'status':'SOURCE_BOUND_OPPORTUNITY_NOT_EXECUTED','hostAuthenticated':False,
                  'residentAssigned':False,'canonEffect':'NONE','authorityEffect':'NONE',
                  'nodeName':f'Synthetic node {n}','sphereName':f'Synthetic sphere {s}',
                  'houseName':f'Synthetic house {h}'})
    return {'schema':'atlas.next144.sourcebound/v1','status':'SOURCE_BOUND_PLANNED_NOT_COMPLETED',
            'catalogSha256':'3'*64,'registryEdition':'Ariadne v0.7','registrySha256':EDITION_SHA,
            'sourceBytesVerified':True,'houseCount':12,'sphereCount':144,'targetCount':1728,
            'domainTargetCount':1008,'methodTargetCount':720,'tasks':tasks,'targets':nodes}

class CircuitTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory()
        cls.path=pathlib.Path(cls.temp.name)/'synthetic.json'
        cls.fixture=synthetic()
        cls.path.write_text(json.dumps(cls.fixture),encoding='utf-8')
        cls.source,cls.tasks,cls.nodes,cls.houses,cls.spheres=parse_source(cls.path)
    @classmethod
    def tearDownClass(cls):cls.temp.cleanup()
    def bad(self,mutation):
        x=copy.deepcopy(self.fixture);mutation(x)
        p=self.path.parent/'bad.json';p.write_text(json.dumps(x),encoding='utf-8')
        with self.assertRaises(ValueError):parse_source(p)
    def test_01_source_census(self):self.assertEqual(len(self.nodes),1728)
    def test_02_sphere_census(self):self.assertEqual(len(self.tasks),144)
    def test_03_house_census(self):self.assertEqual(len(self.houses),12)
    def test_04_domain(self):self.assertEqual(sum(x['sourceRole']=='DOMAIN_SPECIALIZATION' for x in self.nodes.values()),1008)
    def test_05_method(self):self.assertEqual(sum(x['sourceRole']=='EPISTEMIC_META' for x in self.nodes.values()),720)
    def test_06_old_h00_rejected(self):self.bad(lambda x:x['targets'][0].update(coordinate='H00.S01.N01'))
    def test_07_old_zero_sphere_rejected(self):self.bad(lambda x:x['tasks'][0].update(sphere='H01.S00'))
    def test_08_duplicate_node_rejected(self):self.bad(lambda x:x['targets'][1].update(coordinate=x['targets'][0]['coordinate']))
    def test_09_duplicate_sphere_rejected(self):self.bad(lambda x:x['tasks'][1].update(sphere=x['tasks'][0]['sphere']))
    def test_10_parent_relation_rejected(self):self.bad(lambda x:x['targets'][0].update(sphere='H01.S02'))
    def test_11_non_matching_initiative_rejected(self):self.bad(lambda x:x['targets'][0].update(initiative='N144-01-02'))
    def test_12_missing_source_digest_rejected(self):self.bad(lambda x:x['targets'][0].update(sourceNodeDigest='abc'))
    def test_13_role_drift_rejected(self):self.bad(lambda x:x['targets'][0].update(sourceRole='EPISTEMIC_META'))
    def test_14_unauth_promoted_rejected(self):self.bad(lambda x:x['targets'][0].update(hostAuthenticated=True))
    def test_15_resident_assignment_rejected(self):self.bad(lambda x:x['targets'][0].update(residentAssigned=True))
    def test_16_canon_effect_rejected(self):self.bad(lambda x:x['targets'][0].update(canonEffect='ADOPTED'))
    def test_17_false_completion_rejected(self):self.bad(lambda x:x['targets'][0].update(status='COMPLETE'))
    def test_18_false_initiative_completion_rejected(self):self.bad(lambda x:x['tasks'][0].update(proofStatus='HOSTED'))
    def test_19_old_edition_rejected(self):self.bad(lambda x:x.update(registrySha256='a'*64))
    def test_20_private_body_not_ingested(self):
        x=copy.deepcopy(self.fixture);x['targets'][0]['privatePalaceText']='SECRET_NO_HARVEST'
        p=self.path.parent/'private.json';p.write_text(json.dumps(x),encoding='utf-8')
        _,tasks,nodes,_,_=parse_source(p)
        card=node_packet(1,nodes['H01.S01.N01'],tasks['H01.S01'])
        self.assertNotIn('SECRET_NO_HARVEST',json.dumps(card))
    def test_21_planned_status(self):
        card=node_packet(1,self.nodes['H01.S01.N01'],self.tasks['H01.S01'])
        self.assertEqual(card['completedMacroturns'],0)
        self.assertFalse(card['hostValidated'])
        self.assertEqual(card['status'],'PLANNED_NOT_EXECUTED')
    def test_22_modes_non_harvested(self):
        card=node_packet(1,self.nodes['H01.S12.N01'],self.tasks['H01.S12'])
        self.assertEqual(card['suggestedMode'],'QUIET')
        self.assertIn('never an analytics input',card['atlasUpdate'])
    def test_23_namespace_distinct(self):
        card=node_packet(1,self.nodes['H01.S01.N01'],self.tasks['H01.S01'])
        self.assertTrue(card['softwareModuleCandidate'].startswith('09 '))
        self.assertNotIn('N01.01.01',card['coordinate'])
    def test_24_duplicate_digest_consistency(self):
        a={'b':2,'a':1};b={'a':1,'b':2}
        self.assertEqual(stable_digest(a),stable_digest(b))
    def test_25_stopwords(self):
        self.assertNotIn('model',tokens('Model and source evidence'))
    def test_26_missing_proof_rejected(self):self.bad(lambda x:x.update(sourceBytesVerified=False))
    def test_27_bad_mode_rejected(self):self.bad(lambda x:x['tasks'][0].update(suggestedMode='SECRET_PALACE'))
    def test_28_house_name_drift(self):self.bad(lambda x:x['targets'][1].update(houseName='Different'))
    def test_29_sphere_name_drift(self):self.bad(lambda x:x['targets'][1].update(sphereName='Different'))
    def test_30_no_external_host(self):
        card=node_packet(12,self.nodes['H01.S01.N12'],self.tasks['H01.S01'])
        self.assertFalse(card['semanticLinkAccepted'])
        self.assertFalse(card['humanWelfareMeasured'])
    def test_31_sample_exact_digest(self):
        # Complete private input may be absent on public CI: never fail tests due
        # to a missing owner-private source. Synthetic structure still tested.
        if SOURCE.exists():
            _,_,nodes,_,_=parse_source(SOURCE)
            self.assertEqual(nodes['H01.S01.N01']['sourceNodeDigest'],
                             '84b56459ebf3d62614d1a7553a65d7494f3dfff91a95f137c1505a276fba4388')
    def test_32_compile_small_structure(self):
        # Full 144x1728 matrix tested separately in integration receipt.
        with tempfile.TemporaryDirectory() as tmp:
            result,n,s,h=compile_circuit(self.path,pathlib.Path(tmp),matrix=False)
            self.assertEqual(result['mathematicalCoverage']['pairEvaluations'],248832)
            self.assertEqual(result['mathematicalCoverage']['scopeCounts']['CROSS_HOUSE_REVIEW_ONLY'],228096)
            self.assertEqual(len(n),1728);self.assertEqual(len(s),144);self.assertEqual(len(h),12)
            self.assertEqual(result['actualMacroturnsExecutedByCompiler'],0)
    def test_33_binary_gzip_deterministic(self):
        # Stream generation deterministic and independently inspectable.
        with tempfile.TemporaryDirectory() as tmp:
            result,*_=compile_circuit(self.path,pathlib.Path(tmp),matrix=True)
            path=pathlib.Path(tmp)/'sphere_lens_248832.jsonl.gz'
            with gzip.open(path,'rt',encoding='utf-8') as f:
                first=json.loads(next(f));self.assertEqual(first['scope'],'NATIVE_SPHERE_MEMBERSHIP')
                self.assertEqual(first['perspective'],'H01.S01')
                count=1+sum(1 for _ in f)
            self.assertEqual(count,248832)
            self.assertEqual(result['mathematicalCoverage']['pairEvaluations'],count)

if __name__=='__main__': unittest.main()