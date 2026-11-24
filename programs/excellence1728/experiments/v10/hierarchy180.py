"""Atlas HSN 180: original-source-bound, hierarchical, *synthetic* research-allocation experiment.

1885 source-positioned simulations (1728 nodes, 144 spheres, 12 houses, one META145).
Each evaluates SIX local policy tracks for exactly 180 fictional years. 120 years
are used to select a policy; 60 frozen-policy years are reported as held-out.
No method here implements a live Atlas resident, accepted science, or an authenticated
Work action. All authorization remains explicit HOLD.
"""
from __future__ import annotations
import concurrent.futures as cf
import hashlib
import json
import os
import statistics
import time
from pathlib import Path

SOURCE_SHA = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
V09_META_ROOT = '25fd969eb015b731e1d4fa3d357fab4d8c7da5c87773a07c4b5b08f9463d03e1'
SCHEMA = 'atlas.hsn.hierarchy180/v1.0'
POLICIES = ('ROUND_ROBIN','EVIDENCE_FIRST','NOVELTY_FIRST','DISSENT_FIRST','BALANCED','COST_AWARE')
YEARS=180; TRAIN=120; HOLDOUT=YEARS-TRAIN; P=6
MASK = (1 << 64)-1
# Each selected-year stream is a ten-int tuple (per 1,000 points unless noted):
# risk, uncertainty, dissent, unresolved_count, resolved_count, cost_units,
# synthetic_scope_eligible (0/1), novelty, proposed_unreviewed, coherence_proxy.
RISK, UNCERT, DISSENT, UNRESOLVED, RESOLVED, COST, ELIGIBLE, NOVELTY, PROPOSED, COHERENCE = range(10)


def canonical(value):
    return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False).encode('utf-8')

def sha(value):
    return hashlib.sha256(canonical(value)).hexdigest()

def sha_file(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def hsn(i):
    return f'H{i//144+1:02d}.S{(i//12)%12+1:02d}.N{i%12+1:02d}'

def role(h):
    return 'DOMAIN_SPECIALIZATION' if int(h[5:7])<=7 else 'EPISTEMIC_META'

def splitmix(x):
    x=(x+0x9e3779b97f4a7c15)&MASK
    x=((x^(x>>30))*0xbf58476d1ce4e5b9)&MASK
    x=((x^(x>>27))*0x94d049bb133111eb)&MASK
    return x^(x>>31)

def unit(seed,year,salt):
    return splitmix(seed^((year+1)*0x9e3779b97f4a7c15&MASK)^salt)%1000


def read_source_and_v09(root):
    """Load only exact original owner-private registry and original verified v09 receipts.

    V09 lexical candidates are UNREVIEWED source-structural proposals. Never promote.
    """
    root=Path(root);src=root/'ariadne_v07_original.json';slc=root/'v09_SLICES.jsonl';meta=root/'v09_META145.json'
    if sha_file(src)!=SOURCE_SHA: raise ValueError('EXACT_ARIADNE_SOURCE_REQUIRED')
    source=json.loads(src.read_text());old=json.loads(meta.read_text())
    if (len(source['houses']),len(source['spheres']),len(source['nodes'])) != (12,144,1728):raise ValueError('BAD_HSN_TOPOLOGY')
    if old.get('metaRoot')!=V09_META_ROOT or old.get('sourceSha256')!=SOURCE_SHA or old.get('hostedEndToEndPass')!=0:raise ValueError('BAD_V09_PREDECESSOR')
    items=[];receipts=[]
    with slc.open() as inp:
        for i,line in enumerate(inp):
            if i>=1728:raise ValueError('TOO_MANY_V09_RECEIPTS')
            z=json.loads(line);id=hsn(i);n=source['nodes'].get(id)
            if not isinstance(n,dict) or n.get('id')!=id or n.get('parent')!=id[:7] or n.get('kind')!=role(id):raise ValueError('ARIADNE_IDENTITY_MISMATCH:'+id)
            if z.get('id')!=id or z.get('recordSha256')!=n.get('source_record_sha256') or z.get('sourceSha256')!=SOURCE_SHA or z.get('role')!=role(id):raise ValueError('V09_TO_SOURCE_MISMATCH:'+id)
            if z.get('crossCandidateId') and (z['crossCandidateId'][:3]==id[:3] or role(z['crossCandidateId'])!=role(id)):raise ValueError('V09_CROSS_NOT_CANDIDATE')
            if z.get('hostStatus')!='HOLD_REAL_ISSUER_AND_WORK_ACL' or z.get('localStatus')!='SOURCE_PINNED_LOCAL_E2E_PASS':raise ValueError('V09_AUTHORITY_CLAIM_INVALID')
            proof=['ATLAS_VERTICAL_V09',id,SOURCE_SHA,z['recordSha256'],z['role'],z['module'],z['moduleOutputSha256'],z['subjectNodeId'],z['crossCandidateId'],z['crossSimilarityBp'],z['localStatus'],z['hostStatus'],True]
            stamp=hashlib.sha256(json.dumps(proof,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
            if stamp!=z.get('receiptSha256'):raise ValueError('V09_RECEIPT_MISMATCH:'+id)
            if role(id)=='EPISTEMIC_META' and z.get('subjectNodeId')!=id[:3]+'.S01.N01':raise ValueError('METHOD_SUBJECT_MISSING')
            def_text=n.get('definition'); inc=n.get('includes');exc=n.get('excludes')
            if not all(isinstance(k,str) and len(k.strip())>5 for k in [def_text,inc,exc,n.get('name')]):raise ValueError('SOURCE_TEXT_MISSING')
            items.append({'id':id,'role':role(id),'record':z['recordSha256'],'v09Receipt':stamp,
               'crossBp':int(z['crossSimilarityBp']),'crossId':z['crossCandidateId'],
               'sourceComplexity':min(1000,len(def_text)+len(inc)+len(exc)),
               'subjectId':z['subjectNodeId'],'title':n['name']})
            receipts.append(stamp)
    if len(items)!=1728 or old['recordRoot']!=sha(receipts):raise ValueError('V09_COVERAGE_OR_ROOT_MISMATCH')
    return items, {'ariadneSha256':SOURCE_SHA,'v09MetaRoot':V09_META_ROOT,'v09RecordRoot':old['recordRoot'],
       'v09SlicesBytesSha256':sha_file(slc),'sourceScope':'ORIGINAL_V07_EXACT_OWNER_PRIVATE'}


def year_signal(item,y):
    seed=int(item['record'][:16],16); bp=item['crossBp']; complexity=item['sourceComplexity']
    # Risk is an intentionally fault-correlated synthetic signal. This relationship
    # is a property of this toy fixture, NOT a learned empirical feature.
    latent=int(unit(seed,y,0x101)<(180+complexity//24+(60 if item['role']=='EPISTEMIC_META' else 0)))
    noise=unit(seed,y,0x102)
    risk=min(999,(530*latent+470*noise//1000) + (bp//130))
    evidence=unit(seed,y,0x103)
    novelty=min(999,(unit(seed,y,0x104)*8+bp//3)//9)
    dissent=unit(seed,y,0x105)
    scope=int(unit(seed,y,0x106)>=55) # synthetic consent/scope gate only
    return risk,evidence,novelty,dissent,latent,scope


def node_action(policy,y,signal):
    risk,evidence,novelty,dissent,latent,scope=signal
    if not scope:return 0
    if policy==0:return (1,2,3,4)[y%4]
    if policy==1:return 1 if risk>=400 or evidence<230 else (2 if dissent>610 else 4)
    if policy==2:return 3 if novelty>430 and evidence>=490 else 4
    if policy==3:return 2 if dissent>390 else (1 if risk>650 else 4)
    if policy==4:return 1 if risk>450 else (2 if dissent>625 else (3 if evidence>670 and novelty>610 else 4))
    return 1 if risk>750 else (2 if risk>580 else 4)


def node_policy_track(item,policy,observations):
    years=[];score=0;train_score=0;cost_total=0;catches=0;unresolved=0;scope_holds=0;bridge_count=0
    for y,obs in enumerate(observations):
        risk,evidence,novelty,dissent,latent,eligible=obs
        act=node_action(policy,y,obs)
        found=int(eligible and latent and (act==1 and evidence>=110 or act==2 and risk>=540 and evidence>=300))
        miss=latent-found
        resolved=int(eligible and ((act==1 and not latent and evidence>330) or (act==4 and novelty>680 and risk<490)))
        dissent_kept=int(eligible and act==2 and dissent>395)
        proposal=int(eligible and act==3 and evidence>600 and not latent and item['crossId'] is not None)
        unsupported=int(eligible and act==3 and (latent or evidence<500))
        cost=(2 if act in (1,2) else 1 if act in (3,4) else 0)
        yearly_score=8*found+3*resolved+2*dissent_kept+proposal-2*cost-4*miss-2*unsupported
        score+=yearly_score
        if y<TRAIN:train_score+=yearly_score
        cost_total+=cost;catches+=found;unresolved+=miss;scope_holds+=1-eligible;bridge_count+=proposal
        # This is a synthetic uncertainty/navigation proxy; no factual truth measure.
        uncertainty=(1000-evidence+complexity_penalty(item))//2
        coherence=max(0,1000-(abs(risk-uncertainty)+dissent)//3)
        years.append((risk,uncertainty,dissent,miss,found+resolved,cost,eligible,novelty,proposal,coherence))
    return {'policy':POLICIES[policy],'trainScore':train_score,'holdoutScore':score-train_score,
       'totalScore':score,'costUnits':cost_total,'detected':catches,'unresolved':unresolved,
       'scopeHolds':scope_holds,'unreviewedBridges':bridge_count},years


def complexity_penalty(item):return min(1000,item['sourceComplexity']//3)


def choose_policy(tracks):
    # Deliberately no heldout scores in this decision.
    return min(range(len(tracks)),key=lambda p:(-tracks[p]['trainScore'],tracks[p]['costUnits'],p))


def simulate_node(item):
    obs=[year_signal(item,y) for y in range(YEARS)]
    policies=[];series=[]
    for p in range(P):
        a,b=node_policy_track(item,p,obs);policies.append(a);series.append(b)
    best=choose_policy(policies)
    result={'schema':SCHEMA,'tier':'NODE','id':item['id'],'sourceSha256':SOURCE_SHA,
       'recordSha256':item['record'],'v09ReceiptSha256':item['v09Receipt'],
       'role':item['role'],'subjectNodeId':item['subjectId'],'sourceComplexity':item['sourceComplexity'],
       'structuralCrossHouseCandidate':item['crossId'],'structuralCrossHouseSimilarityBp':item['crossBp'],
       'policySelection':'TRAIN_FIRST_120_YEARS_ONLY','chosenPolicy':POLICIES[best],
       'policyAlternatives':policies,'yearCount':YEARS,'trainingYears':TRAIN,'heldoutYears':HOLDOUT,
       'yearlySelected':series[best],
       'hosted':False,'realYearsElapsed':0,'modelCalls':0,'peerTurns':0,'semanticAccepted':False,
       'authorityEffect':'NONE','status':'EXECUTED_SYNTHETIC_NODE_PERSPECTIVE'}
    result['receiptSha256']=sha(result)
    return result


def attention_order(policy,year,children,counts):
    if policy==0:return list(range(12))[year%12:]+list(range(12))[:year%12]
    if policy==1: return sorted(range(12),key=lambda i:(-children[i][RISK],counts[i],i))
    if policy==2: return sorted(range(12),key=lambda i:(-children[i][UNCERT],counts[i],i))
    if policy==3: return sorted(range(12),key=lambda i:(-children[i][DISSENT],counts[i],i))
    if policy==4: return sorted(range(12),key=lambda i:(-children[i][RISK]-children[i][UNCERT]//2+130*counts[i],i))
    return sorted(range(12),key=lambda i:(counts[i],-children[i][RISK],i))


def group_policy_track(child_streams,policy,group_id,child_ids):
    counts=[0]*12;years=[];train_score=0;score=0;catches=0;helds=0
    for y in range(YEARS):
        children=[c[y] for c in child_streams]
        # The policy observes current public synthetic warning signals, not latent anomaly labels.
        options=attention_order(policy,y,children,counts)
        chosen=next((j for j in options if children[j][ELIGIBLE]),None)
        if chosen is None:helds+=1
        else:counts[chosen]+=1
        # A source-independent hidden synthetic audit oracle creates genuine
        # selective uncertainty at Sphere/House/META level. Merely seeing that
        # a large House has unresolved issues MUST NOT automatically earn a
        # successful audit every year (saturation was a falsifier in v1.0-alpha).
        if chosen is None:
            caught=0
        else:
            child=children[chosen]
            childseed=int(hashlib.sha256((group_id+'|'+child_ids[chosen]).encode()).hexdigest()[:16],16)
            hidden_draw=unit(childseed,y,0xB1A5)
            threshold=max(80,min(880,90+child[RISK]//2+child[COHERENCE]//3+
                                   min(child[UNRESOLVED],8)*18-child[UNCERT]//3))
            caught=int(child[UNRESOLVED]>0 and hidden_draw<threshold)
        value=7*caught-1*(chosen is not None)
        # Fair coverage: a small, explicit penalty after training, never fake acceptance.
        score+=value
        if y<TRAIN:train_score+=value
        catches+=caught
        risk=sum(z[RISK] for z in children)//12
        uncertainty=sum(z[UNCERT] for z in children)//12
        dissent=sum(z[DISSENT] for z in children)//12
        novelty=sum(z[NOVELTY] for z in children)//12
        initial_unresolved=sum(z[UNRESOLVED] for z in children)
        unresolved=max(0,initial_unresolved-caught)
        # Only synthetic within-scope child metadata is evaluated; actual Work IAM always HOLD.
        eligible=int(sum(z[ELIGIBLE] for z in children)>=9)
        proposed=sum(z[PROPOSED] for z in children)
        coherence=max(0,1000-(max(z[RISK] for z in children)-min(z[RISK] for z in children))//3-
                      (max(z[UNCERT] for z in children)-min(z[UNCERT] for z in children))//4)
        years.append((risk,uncertainty,dissent,unresolved,caught,int(chosen is not None),eligible,novelty,proposed,coherence))
    # Diversity penalty uses ONLY first 120 years of attention for policy selection.
    # Simpler directly computed deterministic proxy: min cover vs max counts in train.
    # For training recompute counts from a fixed-seed local rerun in choose_policy? Here
    # record full allocation counts, while the objective itself is already train-only.
    return {'policy':POLICIES[policy],'trainScore':train_score,'holdoutScore':score-train_score,
       'totalScore':score,'costUnits':YEARS-helds,'auditedSyntheticIssues':catches,'syntheticScopeHolds':helds,
       'childAttentionCounts':counts},years


def simulate_group(args):
    tier,id,children=args
    if len(children)!=12 or len({x['id'] for x in children})!=12:raise ValueError('GROUP_CHILDREN_REQUIRED')
    for x in children:
        if x['yearCount']!=YEARS or len(x['yearlySelected'])!=YEARS or x.get('status','').startswith('HOLD'):raise ValueError('CHILD_YEAR_SERIES_INCOMPLETE')
    child_streams=[x['yearlySelected'] for x in children]
    tracks=[];streams=[]
    for p in range(P):
        a,b=group_policy_track(child_streams,p,id,[x['id'] for x in children]);tracks.append(a);streams.append(b)
    best=choose_policy(tracks)
    result={'schema':SCHEMA,'tier':tier,'id':id,'sourceSha256':SOURCE_SHA,'children':[x['id'] for x in children],
       'childrenReceiptRoot':sha([x['receiptSha256'] for x in children]),
       'chosenPolicy':POLICIES[best],'policySelection':'TRAIN_FIRST_120_YEARS_ONLY',
       'policyAlternatives':tracks,'yearCount':YEARS,'trainingYears':TRAIN,'heldoutYears':HOLDOUT,
       'yearlySelected':streams[best],'authorityEffect':'NONE','hosted':False,'scientificValidation':False,
       'genuinePeerTurns':0,'modelCalls':0,'status':'EXECUTED_SYNTHETIC_'+tier+'_PERSPECTIVE'}
    result['receiptSha256']=sha(result)
    return result


def run(root,out,workers=4):
    t0=time.monotonic();items,source=read_source_and_v09(root);out=Path(out);out.mkdir(parents=True,exist_ok=True)
    workers=max(1,min(12,int(workers)))
    if workers==1:nodes=[simulate_node(x) for x in items]
    else:
        with cf.ProcessPoolExecutor(max_workers=workers) as pool:nodes=list(pool.map(simulate_node,items,chunksize=12))
    if len(nodes)!=1728 or any(x['id']!=hsn(i) or x['yearCount']!=YEARS for i,x in enumerate(nodes)):raise ValueError('NODE_RESULTS_INCOMPLETE')
    sphere_args=[('SPHERE',f'H{h:02d}.S{s:02d}',nodes[((h-1)*12+(s-1))*12:((h-1)*12+s)*12]) for h in range(1,13) for s in range(1,13)]
    if workers==1:spheres=[simulate_group(x) for x in sphere_args]
    else:
        with cf.ProcessPoolExecutor(max_workers=workers) as pool:spheres=list(pool.map(simulate_group,sphere_args,chunksize=3))
    house_args=[('HOUSE',f'H{h:02d}',spheres[(h-1)*12:h*12]) for h in range(1,13)]
    if workers==1:houses=[simulate_group(x) for x in house_args]
    else:
        with cf.ProcessPoolExecutor(max_workers=workers) as pool:houses=list(pool.map(simulate_group,house_args,chunksize=1))
    meta=simulate_group(('META145','META145',houses))
    counts={'NODE':1728,'SPHERE':144,'HOUSE':12,'META145':1}
    selected=[*nodes,*spheres,*houses,meta]
    if any(x['yearCount']!=YEARS or x['authorityEffect']!='NONE' for x in selected):raise ValueError('SIMULATED_AUTHORITY_EFFECT')
    # Full objective is explicit: maximum 120-year *training* score among six fixed
    # policies per entity. Holdout is reporting only. No claim of globally optimal truth.
    report={'schema':'atlas.hsn.hierarchy180.campaign/v1','source':source,'sourceSha256':SOURCE_SHA,
       'model':'SYNTHETIC_REVIEW_ALLOCATION_AND_EPISTEMIC_ATTENTION_NOT_REAL_YEAR_OR_MODEL',
       'yearsPerSimulation':180,'selectionYears':120,'heldoutYears':60,
       'simulationCounts':counts,'simulations':len(selected),'sixPoliciesEach':P,
       'selectedTrajectoryYearSteps':sum(len(x['yearlySelected']) for x in selected),
       'actualCandidatePolicyYearSteps':sum(len(x['yearlySelected']) for x in selected)*P,
       'selectionMethod':'TRAIN_ONLY_MAXIMUM_DECLARED_SYNTHETIC_UTILITY_NOT_GLOBAL_OPTIMUM',
       'comparisonPolicy':'ROUND_ROBIN','nodeSelectedPolicyCounts':{p:sum(x['chosenPolicy']==p for x in nodes) for p in POLICIES},
       'sphereSelectedPolicyCounts':{p:sum(x['chosenPolicy']==p for x in spheres) for p in POLICIES},
       'houseSelectedPolicyCounts':{p:sum(x['chosenPolicy']==p for x in houses) for p in POLICIES},
       'metaSelectedPolicy':meta['chosenPolicy'],
       'metaTrainScore':next(x['trainScore'] for x in meta['policyAlternatives'] if x['policy']==meta['chosenPolicy']),
       'metaHeldoutScore':next(x['holdoutScore'] for x in meta['policyAlternatives'] if x['policy']==meta['chosenPolicy']),
       'metaRoundRobinHeldoutScore':meta['policyAlternatives'][0]['holdoutScore'],
       'metaHeldoutWinnerFromAllPolicies':max(meta['policyAlternatives'],key=lambda x:x['holdoutScore'])['policy'],
       'meanNodeSelectedHeldoutScore':round(statistics.mean(next(p['holdoutScore'] for p in x['policyAlternatives'] if p['policy']==x['chosenPolicy']) for x in nodes),4),
       'meanNodeRoundRobinHeldoutScore':round(statistics.mean(x['policyAlternatives'][0]['holdoutScore'] for x in nodes),4),
       'originalNodePositions':1728,'originalDomainPositions':1008,'originalMethodPositions':720,
       'acceptedScientificEdges':0,'independentlyVerifiedWorkRights':False,'hostedEndToEndPass':0,
       'actualResidentModelTurns':0,'modelWeightsUpdated':False,'canonChanged':False,'privateLeisureHarvested':False,
       'rightsGate':'HOLD_CURRENT_PUBLISHER_READ_RETURN_AND_CI',
       'nodeRoot':sha([x['receiptSha256'] for x in nodes]),
       'sphereRoot':sha([x['receiptSha256'] for x in spheres]),
       'houseRoot':sha([x['receiptSha256'] for x in houses]),
       'metaRoot':meta['receiptSha256'],'convergence':'ONE_SOURCE_BOUND_SYNTHETIC_PERSPECTIVE',
       'benchmarkClaim':'NO_HARDWARE_PERFORMANCE_CLAIM','status':'FULL_SOURCE_LOCAL_SIMULATION_NOT_HOSTED'}
    report['receiptSha256']=sha(report)
    for filename,arr in [('NODES.jsonl',nodes),('SPHERES.jsonl',spheres),('HOUSES.jsonl',houses)]:
        with (out/filename).open('wb') as f:
            for x in arr:f.write(canonical(x)+b'\n')
    (out/'META145.json').write_bytes(canonical(meta))
    (out/'SUMMARY.json').write_text(json.dumps(report,indent=2,ensure_ascii=False,sort_keys=True))
    individual=out/'nodes';individual.mkdir(exist_ok=True)
    for x in nodes:
        fn=individual/x['id'][:3]/x['id'][4:7];fn.mkdir(exist_ok=True,parents=True)
        (fn/(x['id'][-3:]+'.json')).write_bytes(canonical(x))
    (out/'TIMING_NOT_CANONICAL.json').write_text(json.dumps({'workerProcesses':workers,'wallSeconds':round(time.monotonic()-t0,3),'notInReceipt':True},indent=2))
    return report


def verify(out,deep=True):
    out=Path(out);s=json.loads((out/'SUMMARY.json').read_text());r={k:v for k,v in s.items() if k!='receiptSha256'}
    if sha(r)!=s['receiptSha256'] or s['simulationCounts']!={'NODE':1728,'SPHERE':144,'HOUSE':12,'META145':1}:raise ValueError('SUMMARY_ROOT_INVALID')
    if s['selectedTrajectoryYearSteps']!=1885*180 or s['actualCandidatePolicyYearSteps']!=1885*180*6:raise ValueError('SIMULATION_COUNT_INVALID')
    results=[]
    for name,count in [('NODES',1728),('SPHERES',144),('HOUSES',12)]:
        v=[json.loads(line) for line in (out/(name+'.jsonl')).open()]
        if len(v)!=count:raise ValueError('GROUP_COUNT_INVALID')
        for x in v:
            proof={k:z for k,z in x.items() if k!='receiptSha256'}
            if sha(proof)!=x['receiptSha256'] or len(x['yearlySelected'])!=180 or len(x['policyAlternatives'])!=6:raise ValueError('BAD_CANDIDATE_RECEIPT')
            if x['hosted'] or x['authorityEffect']!='NONE':raise ValueError('FAKE_HOST_RIGHTS')
            if x['chosenPolicy']!=POLICIES[choose_policy(x['policyAlternatives'])]:raise ValueError('HOLDOUT_LEAK_OR_WRONG_SELECTION')
        results.append(v)
    nodes,spheres,houses=results;meta=json.loads((out/'META145.json').read_text())
    if [x['id'] for x in nodes]!=[hsn(i) for i in range(1728)]:raise ValueError('NODE_ID_ORDER_INVALID')
    for xs,k in [(nodes,'nodeRoot'),(spheres,'sphereRoot'),(houses,'houseRoot')]:
        if sha([x['receiptSha256'] for x in xs])!=s[k]:raise ValueError('AGGREGATE_ROOT_MISMATCH')
    if sha({k:v for k,v in meta.items() if k!='receiptSha256'})!=meta['receiptSha256'] or meta['receiptSha256']!=s['metaRoot']:raise ValueError('META145_ROOT_MISMATCH')
    for tier,subs,parents in [('SPHERE',nodes,spheres),('HOUSE',spheres,houses),('META145',houses,[meta])]:
        for i,x in enumerate(parents):
            descendants=subs[i*12:(i+1)*12]
            if x['children']!=[v['id'] for v in descendants] or x['childrenReceiptRoot']!=sha([v['receiptSha256'] for v in descendants]):raise ValueError('CROSS_TIER_LINEAGE_FAIL')
    if deep:
        for i,x in enumerate(nodes):
            if json.loads((out/'nodes'/x['id'][:3]/x['id'][4:7]/(x['id'][-3:]+'.json')).read_text())!=x:raise ValueError('INDIVIDUAL_NODE_DIFFERENT')
    return {'status':'PASS','simulations':1885,'nodeCount':len(nodes),'sphereCount':len(spheres),'houseCount':len(houses),'metaCount':1,'yearsPerSimulation':180,'totalPolicyUpdates':s['actualCandidatePolicyYearSteps'],'sourceSHA':SOURCE_SHA,'root':s['receiptSha256']}

if __name__=='__main__':
    import argparse
    a=argparse.ArgumentParser();a.add_argument('--inputs',required=True);a.add_argument('--output',required=True);a.add_argument('--workers',type=int,default=4);args=a.parse_args()
    print(json.dumps(run(args.inputs,args.output,args.workers),indent=2))
