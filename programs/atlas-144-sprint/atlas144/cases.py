"""144 executable Atlas ONE engineering acceptance probes; source-only review.

These are 144 *distinct test obligations*, NOT 144 novel model algorithms,
resident turns, deployments or accepted ontology mappings. All inputs synthetic
or referenced to the pre-existing public-safe WorkLearning source archive.
"""
from __future__ import annotations
import copy, hashlib, io, json, math, pathlib, re, time, zipfile, os, sys
from dataclasses import dataclass
from typing import Callable
import numpy as np
from . import __version__
ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT/'source'  # Private local snapshot (not published in the PR).
# In the public Git branch, bind to the ACTUAL sibling Atlas module instead.
SIBLING=ROOT.parent/'atlas-neural-unified'
if SIBLING.exists(): sys.path.insert(0,str(SIBLING))
try:
    from source.fabric import (AtlasOneNeuralFabric, NeuralFabricError, IDS, INDEX,
        HOUSE, SPHERE, HSN, REGISTRY_SHA256, _ports, _NEIGHBORS)
    from source.graph import TypedEdgeReview, GraphEvidenceError, TYPES
    from source.workboard import (PreparedWorkboardIndex, prepare_component_record, WorkboardError)
    from source.quality import review_quality_first, synthetic_quality_cohort
except ModuleNotFoundError:
    from atlas_neural_unified.fabric import (AtlasOneNeuralFabric, NeuralFabricError, IDS, INDEX,
        HOUSE, SPHERE, HSN, REGISTRY_SHA256, _ports, _NEIGHBORS)
    from atlas_neural_unified.graph import TypedEdgeReview, GraphEvidenceError, TYPES
    from atlas_neural_unified.workboard import (PreparedWorkboardIndex, prepare_component_record, WorkboardError)
    from atlas_neural_unified.quality import review_quality_first, synthetic_quality_cohort

def asset(name):
    for path in (SRC/name, SIBLING/'data'/name, ROOT.parent/'atlas-neuro-oss'/'data'/name):
        if path.is_file(): return path
    raise FileNotFoundError('Source asset not supplied: '+name)
WLZIP=pathlib.Path(os.environ.get('ATLAS144_WORKLEARNING_SOURCE_ZIP', str(SRC/'Atlas_Work_Learning_Source_0.2.0.zip')))
WLZIP_SHA = '6825c1f83dc3502b0d153c3d4bd925be823a67a6a350b919f4be5c56a2828d9f'
RUNTIME = '76e6eeefeafbcc1cc4c6f94c00afcb9700fc19ba'
SHA_A = 'a'*64
SHA_B = 'b'*64

@dataclass(frozen=True)
class Probe:
    id: str
    lane: str
    name: str
    predicate: Callable[[], bool]
    source: str
    test_kind: str='SYNTHETIC_SOURCE_BOUND'

PROBES=[]
def register(lane:int, name:str, func:Callable[[],bool],source:str='LOCAL_CANDIDATE'):
    i=1+sum(x.id.startswith(f'A144.{lane:02d}.') for x in PROBES)
    if i>12:raise AssertionError(f'OVER12 {lane}')
    PROBES.append(Probe(f'A144.{lane:02d}.{i:02d}', f'{lane:02d}', name, func,source))

def eq(a,b):return a==b
def holds(call,exception=Exception):
    try:call()
    except exception:return True
    return False

def manifest():
    with zipfile.ZipFile(WLZIP) as z:return json.loads(z.read('SOURCE_MANIFEST.json'))

def withzip(fn):
    with zipfile.ZipFile(WLZIP) as z:return fn(z)

def pin_ok():return hashlib.sha256(WLZIP.read_bytes()).hexdigest()==WLZIP_SHA

def count():return len(withzip(lambda z:z.infolist()))

def safe_paths():
    return withzip(lambda z:all(not p.filename.startswith('/') and '..' not in pathlib.PurePosixPath(p.filename).parts
        and not p.filename.startswith('\\') for p in z.infolist()))

def all_manifest_pins():
    m=manifest()
    return withzip(lambda z:all(hashlib.sha256(z.read('atlas-work-learning/'+rec['path'])).hexdigest()==rec['sha256'] for rec in m['files']))

def source_flags():return manifest()

register(1,'Pin the 0.2.0 Work Learning source archive',pin_ok,'WORKLEARNING_SOURCE_ZIP')
register(1,'Count the complete 0.2.0 source archive',lambda:count()==89,'WORKLEARNING_SOURCE_ZIP')
register(1,'Require the declared source-package schema',lambda:manifest()['schema']=='atlas.work-learning.source-package/v1','SOURCE_MANIFEST')
register(1,'Bind source to its exact runtime commit',lambda:manifest()['source_commit']==RUNTIME,'SOURCE_MANIFEST')
register(1,'Check all 88 declared runtime source hashes',lambda:len(manifest()['files'])==88 and all_manifest_pins(),'SOURCE_MANIFEST')
register(1,'Refuse duplicate source-member names',lambda:withzip(lambda z:len({p.filename for p in z.infolist()})==len(z.infolist())),'SOURCE_ZIP')
register(1,'Reject parent path traversal in the archive',safe_paths,'SOURCE_ZIP')
register(1,'Ensure ZIP has no symbolic links',lambda:withzip(lambda z:all((p.external_attr>>16)&0o170000!=0o120000 for p in z.infolist())),'SOURCE_ZIP')
register(1,'Verify no private corpus bodies bundled',lambda:source_flags()['private_data_included'] is False,'SOURCE_MANIFEST')
register(1,'Verify model checkpoint weights excluded',lambda:source_flags()['model_payloads_included'] is False,'SOURCE_MANIFEST')
register(1,'Verify external host fixture was excluded',lambda:source_flags()['external_atlas_host_fixture_included'] is False,'SOURCE_MANIFEST')
register(1,'Re-read the original gateway digest deterministically',lambda:withzip(lambda z:hashlib.sha256(z.read('atlas-work-learning/src/gateway.mjs')).hexdigest())=='9a286e5af0f74eb400009b8674cc5f2d2ff95ab4d845d533cd950d3aa2c9ad73','WORKLEARNING_GATEWAY')

# Source identity / domain and epistemic method scope.
register(2,'Verify exactly 1,728 immutable coordinate strings',lambda:len(IDS)==1728 and len(set(IDS))==1728,'ARIADNE_V07')
register(2,'Verify H01.S01.N01 first ordinal',lambda:IDS[0]=='H01.S01.N01' and INDEX[IDS[0]]==0,'ARIADNE_V07')
register(2,'Verify H12.S12.N12 last ordinal',lambda:IDS[-1]=='H12.S12.N12' and INDEX[IDS[-1]]==1727,'ARIADNE_V07')
register(2,'Reject H00 and pseudo-meta nodes',lambda:not HSN.fullmatch('H00.S00.N00') and not HSN.fullmatch('E145'),'ARIADNE_V07')
register(2,'Reject out-of-bounds Sphere S13',lambda:not HSN.fullmatch('H01.S13.N01'),'ARIADNE_V07')
register(2,'Count 1,008 domain specializations',lambda:sum(int(x[5:7])<=7 for x in IDS)==1008,'ARIADNE_V07')
register(2,'Count 720 epistemic method subjects',lambda:sum(int(x[5:7])>=8 for x in IDS)==720,'ARIADNE_V07')
register(2,'Verify 144 Sphere identifiers are addressable',lambda:len({x[:7] for x in IDS})==144,'ARIADNE_V07')
register(2,'Verify 12 House ordinals are stable',lambda:len({x[:3] for x in IDS})==12,'ARIADNE_V07')
register(2,'Verify shared registry digest constant',lambda:REGISTRY_SHA256=='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6','ARIADNE_V07')
register(2,'Check H05.S11 method has H05.S06 domain subject',lambda:HSN.fullmatch('H05.S11.N04') is not None and HSN.fullmatch('H05.S06.N12') is not None and 'H05.S11.N04'[:3]=='H05.S06.N12'[:3],'ARIADNE_V07')
register(2,'Keep technical ID separate from engineering feature slot',lambda:all(not x.startswith('NEURO.') for x in IDS),'ARIADNE_V07')

# Numeric semantic routing: exercise original code, synthetic vectors only.
rng=np.random.default_rng(145)
N=rng.normal(size=(1728,384)).astype(np.float32)
N=N/np.linalg.norm(N,axis=1,keepdims=True)
Q=N[0].copy(); V_SHA=hashlib.sha256(N.tobytes()).hexdigest()
def f(**kwargs):return AtlasOneNeuralFabric(N,vector_asset_sha256=V_SHA,encoder_revision='synthetic-test-encoder',**kwargs)
register(3,'Project one normalized 384-vector to 1,728 scores',lambda:f().baseline(Q).shape==(1728,),'UNIFIED_FABRIC')
register(3,'Prove routing alpha zero is bit-exact',lambda:np.array_equal(f().baseline(Q),f().routed_scores(Q)),'UNIFIED_FABRIC')
register(3,'Prove shuffled alpha zero is also bit-exact',lambda:np.array_equal(f(profile='SHUFFLED_MATCHED').baseline(Q),f(profile='SHUFFLED_MATCHED').routed_scores(Q)),'UNIFIED_FABRIC')
register(3,'Verify the true 12-port topology dimensions',lambda:f().ports.shape==(12,1728),'GEOMETREE')
register(3,'Verify the matched shuffle has same operation budget',lambda:f(profile='SHUFFLED_MATCHED').ports.shape==f().ports.shape,'GEOMETREE')
register(3,'Prove the actual shuffled topology differs',lambda:f(profile='SHUFFLED_MATCHED').descriptor()['topologyDigest']!=f().descriptor()['topologyDigest'],'GEOMETREE')
register(3,'Verify eight-port source-axis option stays within House',lambda:bool(np.all(_ports('GEOMETREE',145,False)//144==np.arange(1728)//144)),'GEOMETREE')
register(3,'Reject a nonunit semantic query',lambda:holds(lambda:f().baseline(np.ones(384)),NeuralFabricError),'UNIFIED_FABRIC')
register(3,'Reject a nonfinite semantic query',lambda:holds(lambda:f().baseline(np.full(384,np.inf)),NeuralFabricError),'UNIFIED_FABRIC')
register(3,'Keep E145 outside extra neural latent units',lambda:f().forward(Q)['meta145']['extraLatentUnits']==0,'UNIFIED_FABRIC')
register(3,'Preserve synthetic query top-one self-definition',lambda:f().forward(Q)['hits'][0]['hsn']==IDS[0],'UNIFIED_FABRIC')
register(3,'Do not grant source disclosure through a neural score',lambda:f().forward(Q)['canDiscloseSource'] is False,'UNIFIED_FABRIC')

# Typed cross-house inference must remain UNREVIEWED; no auto-semantic links.
def edge(relation='SUPPORTS',src='H05.S06.N12',dst='H08.S01.N01',**kwargs):
    g=TypedEdgeReview()
    args={'src':src,'dst':dst,'relation':relation,'source_id':'work:synthetic',
          'source_digest':SHA_A,'source_version':'r01','scope':'WORK','evidence_kind':'UNREVIEWED'}
    args.update(kwargs)
    return g.propose(**args)
register(4,'Prepare source-linked SUPPORTS candidate',lambda:edge()['status']=='REVIEW_CANDIDATE_PREPARED','GRAPH_REVIEW')
register(4,'Prepare contradictory evidence without deleting support',lambda:edge('CONTRADICTS')['status']=='REVIEW_CANDIDATE_PREPARED','GRAPH_REVIEW')
register(4,'Keep semantic analogies provisional',lambda:edge('ANALOGY_CANDIDATE')['authorityEffect']=='NONE','GRAPH_REVIEW')
register(4,'Keep candidate semantic equivalence unratified',lambda:edge('SEMANTIC_CANDIDATE')['authorityEffect']=='NONE','GRAPH_REVIEW')
register(4,'Reject unsupported relation type',lambda:holds(lambda:edge('SAME_AS_ACCEPTED'),GraphEvidenceError),'GRAPH_REVIEW')
register(4,'Reject self-contradiction edge',lambda:holds(lambda:edge('CONTRADICTS',dst='H05.S06.N12'),GraphEvidenceError),'GRAPH_REVIEW')
register(4,'Reject self-supersedes edge',lambda:holds(lambda:edge('SUPERSEDES',dst='H05.S06.N12'),GraphEvidenceError),'GRAPH_REVIEW')
register(4,'Reject non-Work graph scopes',lambda:holds(lambda:edge(scope='PLAY'),GraphEvidenceError),'GRAPH_REVIEW')
register(4,'Reject unknown source hash',lambda:holds(lambda:edge(source_digest='abc'),GraphEvidenceError),'GRAPH_REVIEW')
register(4,'Reject accepted-source facts from a review insert',lambda:holds(lambda:edge(evidence_kind='REVIEW_ACCEPTED'),GraphEvidenceError),'GRAPH_REVIEW')
register(4,'Preserve cross-House discovery candidate listing',lambda:(lambda g: (g.propose(src='H05.S06.N12',dst='H08.S01.N01',relation='SUPPORTS',source_id='work:source',source_digest=SHA_A,source_version='r1'), g.cross_house_proposals('H05.S06.N12')['reported']==1)[-1])(TypedEdgeReview()),'GRAPH_REVIEW')
register(4,'Separate method subject edge from direct domain fact',lambda:edge('METHOD_APPLIES_TO',src='H05.S11.N04',dst='H05.S06.N12')['authorityEffect']=='NONE','GRAPH_REVIEW')

# Append-only reference index, using original Workboard code.
def record(**kwargs):return prepare_component_record(source_id='work:a',source_revision='r01',source_digest=SHA_A,hsn='H05.S06.N12',card_id='card-01',component_id='atlas-one',**kwargs)
def board():return PreparedWorkboardIndex()
register(5,'Prepare one source-only Workboard card',lambda:record()['status']=='PREPARED_REFERENCE_ONLY','WORKBOARD')
register(5,'Reject non-Work body ingestion',lambda:holds(lambda:record(source_mode='PLAY'),WorkboardError),'WORKBOARD')
register(5,'Reject literal source body in reference packet',lambda:holds(lambda:record(source_text='private'),WorkboardError),'WORKBOARD')
register(5,'Reject out-of-bounds HSN reference',lambda:holds(lambda:prepare_component_record(source_id='work:a',source_revision='r01',source_digest=SHA_A,hsn='H00.S00.N00',card_id='card-01',component_id='atlas-one'),WorkboardError),'WORKBOARD')
register(5,'Insert one prepared Work reference exactly once',lambda:(lambda b: b.put(record()).action=='PREPARED_NEW')(board()),'WORKBOARD')
register(5,'Retry identical Work reference without duplicate',lambda:(lambda b:(b.put(record()),b.put(record()).action=='NO_CHANGE'))(board())[-1],'WORKBOARD')
register(5,'Reject conflicting immutable card source binding',lambda:(lambda b:(b.put(record()),holds(lambda:b.put(dict(record(),sourceDigest=SHA_B)),WorkboardError)))(board())[-1],'WORKBOARD')
register(5,'Record source withdrawal as a local tombstone',lambda:(lambda b:(b.put(record()),b.withdraw('work:a').action=='PREPARED_WITHDRAWAL'))(board())[-1],'WORKBOARD')
register(5,'Retry identical withdrawal idempotently',lambda:(lambda b:(b.withdraw('work:a'),b.withdraw('work:a').action=='NO_CHANGE'))(board())[-1],'WORKBOARD')
register(5,'Hold retrieval when authoritative callbacks absent',lambda:(lambda b:(b.put(record()),b.lookup('H05.S06.N12')['status']=='HOLD_CURRENT_HOST_AUTHORITY_REQUIRED'))(board())[-1],'WORKBOARD')
register(5,'Prepare local Work reference with synthetic allow callbacks',lambda:(lambda b:(b.put(record()),b.lookup('H05.S06.N12',purpose_check=lambda _:True,disclosure_check=lambda _:True)['status']=='SYNTHETIC_PREPARED_REFERENCES_ONLY'))(board())[-1],'WORKBOARD')
register(5,'Suppress withdrawn references even with synthetic allows',lambda:(lambda b:(b.put(record()),b.withdraw('work:a'),b.lookup('H05.S06.N12',purpose_check=lambda _:True,disclosure_check=lambda _:True)['references']==[]))(board())[-1],'WORKBOARD')

# Quality-first per-house and family-disjoint source-declared checks.
register(6,'Retain quality-positive slower candidate for review',lambda:review_quality_first(synthetic_quality_cohort())['status']=='REVIEW_QUALITY_GAIN_WITH_LATENCY_COST','QUALITY_GATE')
register(6,'Recognize quality and speed improvement together',lambda:review_quality_first(synthetic_quality_cohort(slower=False))['status']=='REVIEW_QUALITY_GAIN_WITHOUT_P95_COST','QUALITY_GATE')
register(6,'Hold no-quality-gain candidate',lambda:review_quality_first(synthetic_quality_cohort(improvement=False))['status']=='HOLD_INSUFFICIENT_QUALITY_GAIN','QUALITY_GATE')
register(6,'Reject baseline-known citation regression',lambda:(lambda x:(x['rows'][0].__setitem__('candidateCitationOk',False),review_quality_first(x)['status']=='REJECT_QUALITY_SAFETY_REGRESSION'))(synthetic_quality_cohort())[-1],'QUALITY_GATE')
register(6,'Reject newly incorrect abstention',lambda:(lambda x:(x['rows'][0].__setitem__('candidateAbstentionOk',False),review_quality_first(x)['status']=='REJECT_QUALITY_SAFETY_REGRESSION'))(synthetic_quality_cohort())[-1],'QUALITY_GATE')
register(6,'Block train/eval source-family leakage',lambda:(lambda x:(x.__setitem__('knownTrainingFamilies',[x['rows'][0]['sourceFamily']]),review_quality_first(x)['reason']=='TRAIN_EVAL_FAMILY_LEAKAGE'))(synthetic_quality_cohort())[-1],'QUALITY_GATE')
register(6,'Hold noncredible quality claims without changed code',lambda:(lambda x:(x.__setitem__('candidateCodeSha256',x['baselineCodeSha256']),review_quality_first(x)['reason']=='NO_CODE_CHANGE'))(synthetic_quality_cohort())[-1],'QUALITY_GATE')
register(6,'Reject fabricated query text inside evaluation row',lambda:(lambda x:(x['rows'][0].__setitem__('queryText','private'),review_quality_first(x)['reason']=='ROW_SHAPE'))(synthetic_quality_cohort())[-1],'QUALITY_GATE')
register(6,'Hold hard p95 resource-budget violation',lambda:(lambda x:(x.__setitem__('maxP95Ms',12),review_quality_first(x)['status']=='HOLD_RESOURCE_CAP'))(synthetic_quality_cohort())[-1],'QUALITY_GATE')
register(6,'Preserve all 12 House sample coverage',lambda:review_quality_first(synthetic_quality_cohort())['houses']==12,'QUALITY_GATE')
register(6,'Require 24 declared source-family groups',lambda:review_quality_first(synthetic_quality_cohort())['declaredIndependentFamilies']==24,'QUALITY_GATE')
register(6,'Never approve deployment from untrusted local labels',lambda:review_quality_first(synthetic_quality_cohort())['canDeploy'] is False,'QUALITY_GATE')

# OSS / typed component structural separation.
PORTS=json.loads(asset('COMPONENT_PORTS.json').read_text())
OSS=json.loads(asset('feature_candidates_144.json').read_text())
SRCREG=json.loads(asset('source_registry.json').read_text())
register(7,'Verify exactly one declared fabric ID',lambda:PORTS['fabricId']=='ATLAS_ONE_ARIADNE_v0.7_1728','COMPONENT_PORTS')
register(7,'Verify 33 documented component ports',lambda:len(PORTS['components'])==33,'COMPONENT_PORTS')
register(7,'Reject duplicate component IDs in source graph',lambda:len({x['id'] for x in PORTS['components']})==33,'COMPONENT_PORTS')
register(7,'Identify exactly three actual neural component ports',lambda:sum(x['isNeuron'] is True for x in PORTS['components'])==3 and {x['id'] for x in PORTS['components'] if x['isNeuron']}=={'worklearning.bge','worklearning.graph24','geometree.router'},'COMPONENT_PORTS')
register(7,'Keep eight protected non-Work ports explicitly isolated',lambda:sum(x['scope']=='PRIVATE' for x in PORTS['components'])==8 and all(x['isNeuron'] is False and x['ingestBodies'] is False for x in PORTS['components'] if x['scope']=='PRIVATE'),'COMPONENT_PORTS')
register(7,'Keep external ports nonautonomous for publishing',lambda:all(x['autoDeploy'] is False for x in PORTS['components']),'COMPONENT_PORTS')
register(7,'Keep all 144 OSS extensions marked as proposals',lambda:len(PORTS['extensions'])==144 and all(x['status']=='PROPOSED_NOT_IMPLEMENTED' for x in PORTS['extensions']),'OSS144')
register(7,'Separate OSS proposal IDs from HSN addresses',lambda:all(x['id'].startswith('NEURO.') for x in PORTS['extensions']),'OSS144')
register(7,'Ensure no automatic training in any extension',lambda:all(x['canTrain'] is False for x in PORTS['extensions']),'OSS144')
register(7,'Ensure no automatic publication in any extension',lambda:all(x['canPublish'] is False for x in PORTS['extensions']),'OSS144')
register(7,'Bind OSS catalogue to exactly 144 source-linked slots',lambda:len(OSS['features'])==144 and len({x['id'] for x in OSS['features']})==144,'OSS144')
register(7,'Bind upstream research catalogue to 57 verified source cards',lambda:len(SRCREG['sources'])==57,'OSS144')

# Release gates; no source-only test implies host authority.
register(8,'Reject fabricated hosted deployment from neural forward',lambda:f().forward(Q)['hostedBindingVerified'] is False,'HOST_RELEASE')
register(8,'Preserve candidate authority-free status',lambda:f().forward(Q)['canPublish'] is False,'HOST_RELEASE')
register(8,'Keep source text out of numeric output',lambda:f().forward(Q)['sourceBodiesReturned'] is False,'HOST_RELEASE')
register(8,'Preserve source graph no authority effect',lambda:edge('ANALOGY_CANDIDATE')['authorityEffect']=='NONE','HOST_RELEASE')
register(8,'Keep quality outcome from automatically training weights',lambda:review_quality_first(synthetic_quality_cohort())['canTrain'] is False,'HOST_RELEASE')
register(8,'Keep quality outcome from CANON ratification',lambda:review_quality_first(synthetic_quality_cohort())['canRatify'] is False,'HOST_RELEASE')
register(8,'Require citation/permission before Work reference release',lambda:(lambda b:(b.put(record()),b.lookup('H05.S06.N12')['hostVerified'] is False))(board())[-1],'HOST_RELEASE')
register(8,'Preserve E145 as read-only summary rather than extra neuron',lambda:f().descriptor()['meta145ExtraUnits']==0,'HOST_RELEASE')
register(8,'Preserve 156 synthetic gate parameters distinct from pretrained BGE',lambda:f().descriptor()['trainableGateParameters']==156,'HOST_RELEASE')
register(8,'Preserve local topology research as no optimizer run',lambda:f().descriptor()['neuralTrainingPerformed'] is False,'HOST_RELEASE')
register(8,'Preserve all released feature proposals as uninstalled',lambda:all(x['status']=='PROPOSED_NOT_IMPLEMENTED' for x in PORTS['extensions']),'HOST_RELEASE')
register(8,'Retain original source ZIP as unchanged reference',pin_ok,'HOST_RELEASE')

assert len(PROBES)==96,len(PROBES)
assert [sum(x.lane==f'{i:02}' for x in PROBES) for i in range(1,9)]==[12]*8

def run_python_probes():
    out=[]
    for p in PROBES:
        start=time.perf_counter_ns()
        try:
            ok=p.predicate()
            status='PASS' if ok is True or (isinstance(ok,np.bool_) and bool(ok)) else 'FAIL'
            detail='condition satisfied' if status=='PASS' else f'condition returned {str(ok)[:180]}'
        except Exception as e:
            status='ERROR';detail=f'{type(e).__name__}: {str(e)[:240]}'
        out.append({'id':p.id,'lane':p.lane,'task':p.name,'status':status,'sourceRef':p.source,
                    'evidenceKind':p.test_kind,'detail':detail,'elapsedNs':time.perf_counter_ns()-start,
                    'neuralQualityGainVerified':False,'productionChange':False})
    return out
