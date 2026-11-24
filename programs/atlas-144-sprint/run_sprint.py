#!/usr/bin/env python3
"""Run 144 independent, source-linked Atlas acceptance obligations.

Intentionally offline. This never trains a model, creates a resident turn,
posts a message, installs a plugin, or grants source/corpus permissions.
"""
from __future__ import annotations
import collections,csv,hashlib,json,pathlib,subprocess,sys,os,datetime
ROOT=pathlib.Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT))
from atlas144.cases import run_python_probes,WLZIP,WLZIP_SHA,RUNTIME,REGISTRY_SHA256,asset,SRC,ROOT as PROJECT_ROOT

OUT=ROOT/'evidence';OUT.mkdir(parents=True,exist_ok=True)
if not WLZIP.is_file(): raise SystemExit('SOURCE_REQUIRED: provide exact Work Learning source ZIP via ATLAS144_WORKLEARNING_SOURCE_ZIP')
NODE=ROOT/'js'/'run_48.mjs'

def sha(raw:bytes):return hashlib.sha256(raw).hexdigest()
def canonical(x):return json.dumps(x,sort_keys=True,ensure_ascii=True,separators=(',',':'),allow_nan=False).encode()


def execute():
    py=run_python_probes()
    runner=subprocess.run(['node',str(NODE)],capture_output=True,text=True,cwd=ROOT,timeout=30)
    (OUT/'JS_48_STDOUT.txt').write_text(runner.stdout)
    (OUT/'JS_48_STDERR.txt').write_text(runner.stderr)
    js=json.loads((OUT/'JS_48_RECEIPTS.json').read_text())['probes']
    cases=sorted([*py,*js],key=lambda x:x['id'])
    assert len(cases)==144, len(cases)
    assert len({x['id'] for x in cases})==144
    assert all(sum(x['lane']==f'{h:02}' for x in cases)==12 for h in range(1,13))
    assert runner.returncode==0,(runner.stdout,runner.stderr)
    counts=collections.Counter(x['status'] for x in cases)
    diff=(ROOT/'patches'/'lif_nonfinite_intermediate.patch').read_bytes()
    actual_native=(ROOT.parent/'atlas-neuro-oss'/'src'/'native_core.mjs')
    if not actual_native.is_file(): actual_native=ROOT/'js'/'native_core.mjs'
    def source_file(name,alternate):
        p=SRC/name
        return p if p.is_file() else ROOT.parent/'atlas-neural-unified'/'atlas_neural_unified'/alternate
    hashes={
      'WorkLearning_Source_ZIP':sha(WLZIP.read_bytes()),
      'AriadneOriginalRegistry':REGISTRY_SHA256,
      'UnifiedFabricSource':sha(source_file('fabric.py','fabric.py').read_bytes()),
      'UnifiedQualitySource':sha(source_file('quality.py','quality.py').read_bytes()),
      'UnifiedGraphSource':sha(source_file('graph.py','graph.py').read_bytes()),
      'UnifiedWorkboardSource':sha(source_file('workboard.py','workboard.py').read_bytes()),
      'OSS_Native_Baseline':sha((ROOT/'js'/'native_core_baseline.mjs').read_bytes()),
      'OSS_Native_Candidate':sha(actual_native.read_bytes()),
      'LIF_Overflow_Patch':sha(diff),
      'ComponentRegistry':sha(asset('COMPONENT_PORTS.json').read_bytes()),
      'OSS144_Catalogue':sha(asset('feature_candidates_144.json').read_bytes())}
    # Strict edition fence: a successful test on different bytes is a new experiment,
    # not proof that the older signed-off source edition still applies.
    expected_source_pins={
      'WorkLearning_Source_ZIP':WLZIP_SHA,
      'UnifiedFabricSource':'e172a23a93ac97077824ddba96d9618ec2077c2356dcd47df71c7a22839e73b9',
      'UnifiedQualitySource':'c5c853c2b614dc4515c5431c4ef306db843275ad2555c34e43507bb692510c55',
      'UnifiedGraphSource':'1b8794180c2ea3123d7fb8eb86a042468c0c6e382f14edaa48bd2893b3d84de1',
      'UnifiedWorkboardSource':'2ed8a9061b42bc3a45820b518ede93176588ba70ba315537c96a2f4bd42182d2',
      'OSS_Native_Candidate':'1abf2f9a29a06bf73889c1931c5ab70590c98334b1d69a2e9602d5b16b7816e0',
      'OSS_Native_Baseline':'dbe475c2d4a87e41c4d96dd35821745bc232e75485e8d7f54180a28d306fc09b',
      'ComponentRegistry':'27c51875774a0d8a528ca9d9b3e29725553300abe3301255400745873314ea61',
      'OSS144_Catalogue':'1970ba2035a6950f3b8e8de62e475747813296c28c0ec5f94a11ded5e273e93f'
    }
    drift={k:{'expected':v,'actual':hashes.get(k)} for k,v in expected_source_pins.items() if hashes.get(k)!=v}
    if drift:raise SystemExit('SOURCE_VERSION_DRIFT: '+json.dumps(drift,sort_keys=True))
    title={
      '01':'Source & reproducible build','02':'Ariadne identity & roles',
      '03':'Neural activation & geometry','04':'Typed graph & cross-domain dissent',
      '05':'Workboard memory & revocation','06':'Quality-first family evaluation',
      '07':'Shared component / OSS mapping','08':'Release & human-authority boundaries',
      '09':'Exact retrieval / cache keys','10':'Train/eval separation',
      '11':'Spiking event numerics','12':'Evidence permission & strict tools'}
    assert len(title)==12
    chain='0'*64
    for x in cases:
        x['workstream']=title[x['lane']]
        x['scope']='CHECK_EXECUTED_IN_LOCAL_SOURCE' if x['sourceRef'] not in ('HOST_RELEASE',) else 'BOUNDARY_CHECK_EXECUTED'
        x['evaluation']= 'LOCAL_SYNTHETIC_OR_SOURCE_BYTES'
        x['postToSwarmChat']=False
        x['canTrain']=False
        x['canDeploy']=False
        chain=sha(bytes.fromhex(chain)+canonical({k:v for k,v in x.items() if k!='elapsedNs'}))
        x['chainSha256']=chain
    receipt={
     'schema':'atlas.neural.144-acceptance-sprint/v1',
     'status':'LOCAL_EXECUTED_144_ACCEPTANCE_TASKS' if counts.get('PASS')==144 else 'FAILURES_RETAINED',
     'createdUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
     'taskCount':len(cases),'workstreamCount':12,'taskDistribution':{title[f'{i:02}']:12 for i in range(1,13)},
     'results':dict(counts),'completeChainSha256':chain,
     'nodeRunnerExitCode':runner.returncode,
     'sourcePins':hashes,'predecessorSourceCommit':RUNTIME,
     'predecessorPR62Head':'f0a831281fac5a75632111591b676c4e834aaadf',
     'baselineMaterialRed':{'id':'A144.11.10','behavior':'finite inputs overflow to Infinity in LIF','observed':True,
        'fix':'reject nonfinite intermediate and voltage without clamping','peerAttribution':'GF9 SwarmChat #236 first reported the overflow case'},
     'initialIncorrectTestAssumptions':[
       {'id':'A144.07.04','correction':'Three real neural ports are intentionally represented as isNeuron=true'},
       {'id':'A144.07.05','correction':'Eight protected slots intentionally have scope=PRIVATE and ingestBodies=false'}],
     'qualityClaim':'NO_NEW_HUMAN_LABEL_OR_NEURAL_QUALITY_EVALUATION',
     'featureImplementations':1,'acceptedOntologicalLinks':0,
     'residentMacroturnsCreated':0,'newModelTrainingRuns':0,'newModelWeightUpdates':0,
     'newHostedDeployments':0,'hostIAMTested':False,'workboardMessagesPosted':0,
     'publicSafe':'SOURCE_FREE_TEST_CONTRACTS_ONLY',
     'limitations':['144 obligations are tests/audits, NOT 144 added neural algorithms',
       'Only the LIF overflow reference code was changed',
       'Future host, model, corpus, and rights validation requires authorized current runtime',
       'Source ZIP contains pre-existing Atlas Work Learning code and is excluded from public export']}
    (OUT/'ATLAS_144_TASKS.json').write_text(json.dumps(cases,indent=2,ensure_ascii=True)+'\n')
    (OUT/'ATLAS_144_EXECUTION_RECEIPT.json').write_text(json.dumps(receipt,indent=2)+'\n')
    with (OUT/'ATLAS_144_TASKS.csv').open('w',newline='') as f:
        columns=['id','workstream','task','status','sourceRef','evidenceKind','detail','elapsedNs','chainSha256','canDeploy']
        w=csv.DictWriter(f,fieldnames=columns,extrasaction='ignore');w.writeheader();w.writerows(cases)
    summary={
     'matrix':{'count':len(cases),'passed':counts['PASS'],'failed':counts.get('FAIL',0),'error':counts.get('ERROR',0)},
     'workstreams':{title[f'{i:02}']:{'total':12,'passed':sum(x['status']=='PASS' for x in cases if x['lane']==f'{i:02}')} for i in range(1,13)},
     'checksum':chain,'materialFix':'LIF finite-value overflow explicit HOLD',
     'realModelImprovement':False,'hostDeployed':False}
    (OUT/'DASHBOARD_SUMMARY.json').write_text(json.dumps(summary,indent=2)+'\n')
    return receipt,cases

if __name__=='__main__':
    receipt,cases=execute()
    print(json.dumps({k:receipt[k] for k in ('status','taskCount','workstreamCount','results','completeChainSha256','featureImplementations')},indent=2))
    if receipt['status']!='LOCAL_EXECUTED_144_ACCEPTANCE_TASKS':sys.exit(1)
