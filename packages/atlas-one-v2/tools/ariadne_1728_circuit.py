#!/usr/bin/env python3
"""Offline Ariadne 1728 × 144 sphere-lens coverage compiler.

Sources: owner-selected Ariadne v0.7-derived NEXT144 manifest only. Explicit
PLANNED/UNREVIEWED outputs: this compiler does not execute model macroturns,
read private Brain/Palace, infer semantic equivalence, assign residents,
activate CANON, or deploy systems. Requires no network or credentials.
"""
from __future__ import annotations

import argparse
import collections
import csv
import gzip
import hashlib
import json
from pathlib import Path
import re

EDITION_SHA = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
COORD = re.compile(r'^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$')
SPHERE = re.compile(r'^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])$')
SHA = re.compile(r'^[0-9a-f]{64}$')
VALID_MODES = {'WORK','PLAY','SOCIAL','IMAGINE','DREAM','QUIET'}
STOP = frozenset('the and for with from into under over each source review work model models test tests about atlas open one data system systems across current method methodology evidence design sourcebound our on to in by of a an plus or while that as is are be without no node nodes sphere spheres project proposed audit analysis original version experimental experiment'.split())
NEXT1728 = [
    'Trust & Release','Broker & Messaging','Client Experience','Spatial Workboard',
    'Graph & Library','Atlas Runtime','Decision Intelligence','Continuity & Commons',
    'Research & Simulation','Reliability & Cost','CANON & Community','Pilot & Scale',
]
TOOLS = [
    ('SWARMCHAT','Room source/consent/return and dialogue or optional-mode access'),
    ('ATLAS_ONE','Typed evidence, falsifier and bounded source-only execution'),
    ('ARIADNE','Edition-pinned HSN source position and review-only edges'),
]

def digest_bytes(blob: bytes) -> str:
    return hashlib.sha256(blob).hexdigest()

def stable_digest(obj) -> str:
    return digest_bytes(json.dumps(obj,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode('utf-8'))

def tokens(s):
    return set(w for w in re.findall(r'[a-z0-9]+',s.casefold()) if len(w)>3 and w not in STOP)

def parse_source(path:Path):
    # Reject unrecognized private / operational fields to avoid silent ingestion.
    d=json.loads(path.read_text(encoding='utf-8'))
    required={'schema','status','catalogSha256','registryEdition','registrySha256','sourceBytesVerified','houseCount','sphereCount','targetCount','domainTargetCount','methodTargetCount','tasks','targets'}
    if not required.issubset(d): raise ValueError('missing mandatory source-manifest keys')
    if d['registrySha256']!=EDITION_SHA or d['registryEdition']!='Ariadne v0.7': raise ValueError('registry edition/digest mismatch')
    if d['schema']!='atlas.next144.sourcebound/v1' or not d['sourceBytesVerified']:raise ValueError('source not verified')
    if d['status']!='SOURCE_BOUND_PLANNED_NOT_COMPLETED': raise ValueError('unexpected execution-state elevation')
    if not SHA.fullmatch(d['catalogSha256']):raise ValueError('malformed catalog digest')
    if any(d[k]!=v for k,v in [('houseCount',12),('sphereCount',144),('targetCount',1728),('domainTargetCount',1008),('methodTargetCount',720)]): raise ValueError('source census does not match')
    if len(d['tasks'])!=144 or len(d['targets'])!=1728:raise ValueError('row census mismatch')
    tasks={}
    for task in d['tasks']:
        if not isinstance(task,dict) or not SPHERE.fullmatch(task.get('sphere','')):raise ValueError('invalid sphere task')
        if task.get('status')!='PROPOSED_NOT_IMPLEMENTED' or task.get('proofStatus')!='DESIGN_ONLY':raise ValueError('task contains unverified promotion')
        if task.get('suggestedMode') not in VALID_MODES:raise ValueError('unknown mode')
        if task['sphere'] in tasks:raise ValueError('duplicate sphere')
        tasks[task['sphere']]=task
    nodes={}
    house_names={}
    sphere_names={}
    for node in d['targets']:
        if not isinstance(node,dict):raise ValueError('bad node')
        id=node.get('coordinate','')
        m=COORD.fullmatch(id)
        if not m or id in nodes:raise ValueError('invalid/duplicate node coordinate')
        h, s, n=map(int,m.groups());sphere=f'H{h:02d}.S{s:02d}'
        if node.get('sphere')!=sphere or node.get('initiative')!=tasks[sphere]['id']:raise ValueError('parent/initiative mismatch')
        if not SHA.fullmatch(node.get('sourceNodeDigest','')):raise ValueError('missing node digest')
        if node.get('status')!='SOURCE_BOUND_OPPORTUNITY_NOT_EXECUTED' or node.get('hostAuthenticated') or node.get('residentAssigned') or node.get('authorityEffect')!='NONE' or node.get('canonEffect')!='NONE':raise ValueError('unexpected promoted source node')
        expected='DOMAIN_SPECIALIZATION' if s<=7 else 'EPISTEMIC_META'
        if node.get('sourceRole')!=expected:raise ValueError('source role mismatch')
        if not all(isinstance(node.get(k),str) and node[k].strip() for k in ['nodeName','sphereName','houseName']):raise ValueError('missing source description')
        if h in house_names and house_names[h]!=node['houseName']:raise ValueError('house label drift')
        if sphere in sphere_names and sphere_names[sphere]!=node['sphereName']:raise ValueError('sphere label drift')
        house_names[h]=node['houseName'];sphere_names[sphere]=node['sphereName'];nodes[id]=node
    if len(nodes)!=1728 or len(sphere_names)!=144 or len(house_names)!=12:raise ValueError('incomplete coordinate lattice')
    for h in range(1,13):
        for s in range(1,13):
            sphere=f'H{h:02d}.S{s:02d}'
            if sphere not in tasks:raise ValueError('missing sphere')
            for n in range(1,13):
                if f'{sphere}.N{n:02d}' not in nodes:raise ValueError('missing node')
    return d,tasks,nodes,house_names,sphere_names

def module_for_node(node,task):
    # Mapping to NEXT1728 software modules is a build-routing candidate, not an
    # asserted semantic match between Nmm.ww.oo software tickets and HSN IDs.
    s=node['sphere']; h=int(s[1:3]); si=int(s[5:7]);mode=task['suggestedMode']
    if mode in ('PLAY','SOCIAL','IMAGINE','DREAM','QUIET'):return 8
    if h in (9,10,11):return 11
    if h in (1,2,3,4,12):return 9
    if h==5:return 5
    if h==6:return 1
    if h==7:return 7
    if h==8:return 3
    return 6

def node_packet(i,node,task):
    mode=task['suggestedMode']
    role=node['sourceRole']; module=module_for_node(node,task)
    node_focus=node['nodeName']
    if role=='DOMAIN_SPECIALIZATION':
        question=f'For {node_focus}, what observable evidence would support or falsify the sphere initiative: {task["title"]}?'
        acceptance=f'One authorized, source-linked {node_focus} case with explicit units/scope, reproducible method, counterexample, and intact dissent'
    else:
        question=f'How should {node_focus} evaluate claims made by {task["title"]} without converting method coverage into welfare or truth?'
        acceptance=f'A typed {node_focus} method review recording calibration/falsification, scope, unsupported claims, and reviewer uncertainty'
    return {
      'macroturnOpportunity':i,'coordinate':node['coordinate'],'house':node['coordinate'][:3],
      'houseName':node['houseName'],'sphere':node['sphere'],'sphereName':node['sphereName'],
      'nodeName':node_focus,'sourceRole':role,'sourceDigest':node['sourceNodeDigest'],
      'sourceEdition':'Ariadne v0.7','registrySha256':EDITION_SHA,
      'sourceInitiative':task['id'],'initiative':task['title'],
      'sourceExperiment':task['experiment'],'sourceFalsifier':task['falsifier'],
      'suggestedMode':mode,'softwareModuleCandidate':f'{module:02d} {NEXT1728[module-1]}',
      'researchQuestion':question,'candidateBuild':f'{task["title"]}: build a source-bound, reversible review/test fixture scoped to {node_focus}',
      'acceptanceCandidate':acceptance,
      'swarmchatUpdate':('Voluntary, non-harvested mode invitation; no compulsory public receipt' if mode!='WORK' else 'Authorized Work-room provenance, exact source replies, accessibility, and revocation-aware return'),
      'atlasUpdate':('Work boundary / consent negative control; private activity is never an analytics input' if mode!='WORK' else 'Finite source-only run, exact checks and FAIL/HOLD/PASS evidence, no false hosted claims'),
      'ariadneUpdate':'Node edition/digest membership and reviewer-only proposed edges; no lexical SAME_AS or automatic authority',
      'status':'PLANNED_NOT_EXECUTED','completedMacroturns':0,
      'actualEvidenceRefs':[],'residentAssigned':False,'hostValidated':False,
      'semanticLinkAccepted':False,'humanWelfareMeasured':False,'canonEffect':'NONE',
      'rightsGate':'CURRENT_READ_AND_RETURN_CONSENT_REQUIRED',
      'nextFalsifier':task['falsifier'],
      'sourceReference':'OWNER_PRIVATE_SOURCE_POINTER_NOT_PUBLISHED',
    }

def compile_circuit(source:Path,out:Path,matrix=True):
    d,tasks,nodes,house_names,sphere_names=parse_source(source)
    out.mkdir(parents=True,exist_ok=True)
    canonical_ids=sorted(nodes)
    node_packets=[node_packet(i,nodes[key],tasks[nodes[key]['sphere']]) for i,key in enumerate(canonical_ids,1)]
    assert len(node_packets)==1728
    p=(out/'node_build_plan_1728.json');p.write_text(json.dumps(node_packets,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    header=['macroturnOpportunity','coordinate','house','houseName','sphere','sphereName','nodeName','sourceRole','suggestedMode','sourceInitiative','initiative','softwareModuleCandidate','status','sourceDigest','nextFalsifier']
    with (out/'node_build_plan_1728.csv').open('w',encoding='utf-8',newline='') as f:
        w=csv.writer(f);w.writerow(header);w.writerows([v.get(k) for k in header] for v in node_packets)
    lens_summaries=[]; total_pairs=0; scope_counts=collections.Counter();cross_candidates_count=0
    matrix_path=out/'sphere_lens_248832.jsonl.gz'
    mf=gzip.open(matrix_path,'wt',encoding='utf-8',compresslevel=6,mtime=0) if False else None
    # gzip.open does not support mtime consistently; deterministic GzipFile wrapper.
    if matrix:
        import io
        raw=matrix_path.open('wb')
        zipped=gzip.GzipFile(filename='',mode='wb',fileobj=raw,compresslevel=6,mtime=0)
        mf=io.TextIOWrapper(zipped,encoding='utf-8')
    else: mf=None
    try:
      for h in range(1,13):
        for s in range(1,13):
          sphere=f'H{h:02d}.S{s:02d}';task=tasks[sphere]
          lens_terms=tokens(' '.join([task['title'],task['experiment'],task['falsifier'],sphere_names[sphere]]))
          external=[];per_scope=collections.Counter()
          for key in canonical_ids:
            node=nodes[key]; same=node['sphere']==sphere
            if same:scope='NATIVE_SPHERE_MEMBERSHIP'
            elif key[:3]==sphere[:3]:scope='SAME_HOUSE_DISTINCT_SPHERE'
            else:scope='CROSS_HOUSE_REVIEW_ONLY'
            per_scope[scope]+=1;scope_counts[scope]+=1;total_pairs+=1
            overlap=len(lens_terms&tokens(node['nodeName']+' '+node['sphereName']))
            # Role/scope/lexical overlap are deterministic *navigation signals*;
            # they are NOT semantic equivalence, proof of benefit or review.
            pair={'perspective':sphere,'sourceInitiative':task['id'],'node':key,
                  'scope':scope,'lexicalOverlapCount':overlap,'nodeRole':node['sourceRole'],
                  'relationStatus':'STRUCTURAL_MEMBER' if same else 'UNREVIEWED_NAVIGATION_CANDIDATE',
                  'evidenceStatus':'NO_INDEPENDENT_SEMANTIC_REVIEW','authorityEffect':'NONE'}
            if mf:mf.write(json.dumps(pair,sort_keys=True,separators=(',',':'))+'\n')
            if not same and overlap>0:
                external.append((overlap,key,node['nodeName'],scope));cross_candidates_count+=1
          external.sort(key=lambda x:(-x[0],x[1]))
          lens_summaries.append({'sphere':sphere,'house':sphere[:3],'houseName':house_names[h],
             'sphereName':sphere_names[sphere],'initiativeId':task['id'],'initiativeTitle':task['title'],
             'sourceExperiment':task['experiment'],'sourceFalsifier':task['falsifier'],
             'suggestedMode':task['suggestedMode'],'nodesNative':[f'{sphere}.N{n:02d}' for n in range(1,13)],
             'perspectiveEvaluations':1728,'lensScopeCounts':dict(per_scope),
             'topCrossSphereLexicalCandidates':[{'coordinate':n,'name':name,'scope':sc,'overlap':ol,'status':'UNREVIEWED'} for ol,n,name,sc in external[:12]],
             'lexicalCrossCandidates':len(external),'status':'STRUCTURAL_LENS_EVALUATED_OFFLINE_NOT_A_REAL_MACROTURN',
             'swarmchatFocus':'Review room participation + source trace with mode boundaries',
             'atlasFocus':'Unit-test falsifier + source-run review; offline before hosted',
             'ariadneFocus':'Twelve source nodes and candidate edges with edition pins'})
    finally:
      if mf:mf.close();raw.close()
    assert total_pairs==248832, total_pairs
    assert scope_counts['NATIVE_SPHERE_MEMBERSHIP']==1728,scope_counts
    assert scope_counts['SAME_HOUSE_DISTINCT_SPHERE']==19008,scope_counts
    assert scope_counts['CROSS_HOUSE_REVIEW_ONLY']==228096,scope_counts
    (out/'sphere_perspectives_144.json').write_text(json.dumps(lens_summaries,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    with (out/'sphere_perspectives_144.csv').open('w',encoding='utf-8',newline='') as f:
        columns=['sphere','house','houseName','sphereName','initiativeId','initiativeTitle','suggestedMode','perspectiveEvaluations','lexicalCrossCandidates','status']
        w=csv.writer(f);w.writerow(columns);w.writerows([row.get(k) for k in columns] for row in lens_summaries)
    house_summaries=[]
    for h in range(1,13):
        hid=f'H{h:02d}';view=[v for v in lens_summaries if v['house']==hid]
        card={'house':hid,'houseName':house_names[h],'sourceRegistrySha256':EDITION_SHA,
         'sourceSphereIds':[v['sphere'] for v in view],
         'sphereInitiativeIds':[v['initiativeId'] for v in view],
         'sourceNodeCount':144,'spherePerspectiveCount':12,'houseFollowupNumber':h,
         'nodePerspectiveAudits':20736,
         'houseHypothesis':'How do these twelve sphere initiatives interact without losing domain, method, participation, and rights boundaries?',
         'integrationProposals':{
            'SwarmChat':'Accessible opt-in room and view integration, exact evidence deep links, non-harvested creative modes',
            'AtlasONE':'One bounded work queue per authorized HSN position with run/CI/deployment receipts and withheld claims',
            'Ariadne':'Single v0.7 source-rooted review graph with 144 positions in this House and no automatic semantic links'},
         'crossHouseReviewQueues':[{'house':f'H{j:02d}','name':house_names[j],
            'status':'UNREVIEWED_CROSS_HOUSE_INTERFACE'} for j in range(1,13) if j!=h],
         'blockingGates':['CONSENT_CURRENT','EVIDENCE_SOURCE_AND_SHA','WELFARE_NOT_A_SCORE','RIGHTS_NONOFFSETTABLE',
            'SOURCE_TESTS_NOT_CI','HOSTED_NOT_VERIFIED','CANON_UNRATIFIED'],
         'voluntaryModeCounts':dict(collections.Counter(x['suggestedMode'] for x in view)),
         'status':'HOUSE_SYNTHESIS_COMPUTED_OFFLINE_NOT_AUTHORED_BY_12_PEERS',
         'nextHumanReview':'Obtain voluntary domain/method specialist critique and one negative-control review per sphere',
        }
        house_summaries.append(card)
    (out/'house_followups_12.json').write_text(json.dumps(house_summaries,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    status={
      'schema':'atlas.ariadne.civilizational-circuit/v1','source':d['schema'],
      'registryEdition':d['registryEdition'],'registrySha256':d['registrySha256'],
      'derivedSourceCatalogSha256':d['catalogSha256'],'sourceBytesVerifiedInSource':d['sourceBytesVerified'],
      'sourceSnapshotPath':'NEXT144_FULL_SOURCE_BOUND_PRIVATE.json (owner-private; not redistributed to Git)',
      'mathematicalCoverage':{'houses':12,'spheres':144,'nodes':1728,
           'spherePerspectivesEvaluated':144,'nodesEvaluatedPerPerspective':1728,
           'pairEvaluations':total_pairs,'scopeCounts':dict(scope_counts),
           'domainNodes':1008,'epistemicMetaNodes':720,'houseFollowupsComputed':12,
           'houseNodePerspectiveAudits':12*20736,'lexicalCrossCandidates':cross_candidates_count},
      'priorWork':{'next144TasksReused':144,
                   'next1728SoftwareRoadmapIsSeparateNamespace':True,
                   'next1728SoftwareModuleNames':NEXT1728},
      'actualMacroturnsExecutedByCompiler':0,'actualModelWakesPerformedByCompiler':0,
      'actualPeerRepliesPerformedByCompiler':0,'newResidentsAssigned':0,
      'hostAuthenticated':False,'releaseDeployed':False,
      'measuredCivilizationalWelfare':False,'canonEffect':'NONE','rightsEffect':'NONE',
      'status':'COMPLETE_STRUCTURAL_BUILD_PLAN__PROPOSED_IMPLEMENTATION__NO_1728_REAL_TURNS',
      'acceptanceGates':['SOURCE_VERIFIED','PUBLIC_SAFE_GIT_REVIEW','SOURCE_ONLY_TESTS',
               'AUTHORIZED_PEER_REVIEW','CURRENT_HOST_RIGHTS','HOSTED_CI',
               'SIGNED_IN_TWO_ACCOUNT_TEST','INDEPENDENT_HOUSE_REVIEW',
               'HUMAN_AUTHORIZED_DEPLOYMENT'],
    }
    (out/'execution_status.json').write_text(json.dumps(status,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    with (out/'macroturn_1728_ledger.csv').open('w',encoding='utf-8',newline='') as f:
      w=csv.writer(f);w.writerow(['ordinal','coordinate','house','sphere','modeOpportunity','status','actualVisitId','actualSourceRefs','reviewer','hostProof','completedAt'])
      for p in node_packets:w.writerow([p['macroturnOpportunity'],p['coordinate'],p['house'],p['sphere'],p['suggestedMode'],'PLANNED_NOT_EXECUTED','','','','',''])
    return status,node_packets,lens_summaries,house_summaries

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--source',type=Path,required=True);ap.add_argument('--out',type=Path,required=True);ap.add_argument('--no-matrix',action='store_true');args=ap.parse_args()
    status,*_=compile_circuit(args.source,args.out,matrix=not args.no_matrix)
    print(json.dumps(status['mathematicalCoverage'],indent=2))
    print('RELEASE STATUS:',status['status'])

if __name__=='__main__':main()