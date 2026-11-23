#!/usr/bin/env python3
"""Independent Atlas telescope verifier. No network, side effects, asserts or host auth.
Checks exact source SHA, R07 role/mode counts, 12x12 actual stage hashes,
full 144-Sphere and 12-House perspective roots, and genealogy.
It NEVER verifies identity, CANON, scientific truth, real Work or consent.
"""
from __future__ import annotations
from functools import lru_cache
import hashlib
import json
from pathlib import Path
import re
import sys

SOURCE_SHA='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
SCHEMA='atlas.one.civilization-telescope/v1'
PASSES=['01 SOURCE','02 ROLE','03 IDENTITY','04 FOUR_SYSTEMS','05 IRON_EMPIRE',
        '06 GRAPH','07 PROTECTED_MODES','08 WORK_BURST','09 ADVERSARIAL',
        '10 SWARMCHAT_PORT','11 IDEMPOTENCY','12 ONE_BUILD']
SHAPE=re.compile(r'^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$')

def h(x):
    return hashlib.sha256(x if isinstance(x,bytes) else x.encode('utf8')).hexdigest()
def canonical(x):
    return json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode('utf8')
def require(cond,reason):
    if not cond:raise ValueError('HOLD_'+reason)
@lru_cache(maxsize=12)
def viewpoint(stage):
    spheres=[];houses=[]
    for pi in range(144):
        native=same=cross=0;r=2166136261
        for i in range(1728):
            if pi==i//12:native+=1
            elif pi//12==i//144:same+=1
            else:cross+=1
            r=((r ^ (i+1) ^ (stage<<12) ^ (pi+1))*16777619)&0xffffffff
        require((native,same,cross)==(12,132,1584),'SPHERE_COUNTER')
        spheres.append(dict(id=f'H{pi//12+1:02d}.S{pi%12+1:02d}',native=native,sameHouse=same,crossHouse=cross,scopeCheck=f'{r:08x}'))
    for hi in range(12):
        own=other=0;r=2166136261
        for i in range(1728):
            if i//144==hi:own+=1
            else:other+=1
            r=((r ^ (stage<<12) ^(hi+1) ^ (i+1))*16777619)&0xffffffff
        require((own,other)==(144,1584),'HOUSE_COUNTER')
        houses.append(dict(id=f'H{hi+1:02d}',own=own,other=other,scopeCheck=f'{r:08x}'))
    return h(canonical({'stage':stage,'spheres':spheres,'houses':houses}))

def verify(planpath:Path,reportpath:Path,preflightpath:Path|None=None):
    raw=planpath.read_bytes();digest=h(raw)
    plan=json.loads(raw);r=json.loads(reportpath.read_text(encoding='utf8'))
    require(type(plan) is list and len(plan)==1728,'PLAN_COUNT')
    work=protected=domain=meta=0
    for i,node in enumerate(plan):
        require(type(node) is dict,'NODE_NOT_OBJECT')
        coord=f'H{i//144+1:02d}.S{i%144//12+1:02d}.N{i%12+1:02d}'
        role='DOMAIN_SPECIALIZATION' if i%144//12<7 else 'EPISTEMIC_META'
        require(node.get('coordinate')==coord and node.get('sourceRole')==role,'SOURCE_AXIS')
        require(node.get('sourceEdition')=='Ariadne v0.7' and node.get('registrySha256')==SOURCE_SHA,'SOURCE_EDITION')
        require(node.get('status')=='PLANNED_NOT_EXECUTED' and node.get('completedMacroturns')==0,'FALSE_COMPLETION')
        if role=='DOMAIN_SPECIALIZATION':domain+=1
        else:meta+=1
        if node.get('suggestedMode')=='WORK':work+=1
        elif node.get('suggestedMode') in {'PLAY','SOCIAL','IMAGINE','DREAM','QUIET'}:protected+=1
        else:require(False,'UNKNOWN_MODE')
    require((domain,meta,work,protected)==(1008,720,1248,480),'SOURCE_COUNTS')
    require(type(r) is dict and r.get('schema')==SCHEMA and r.get('status')=='TWELVE_SOURCE_ONLY_ROUNDS_COMPLETE','STATUS')
    rounds=r.get('rounds')
    require(type(rounds) is int and 1<=rounds<=10000,'ROUNDS')
    require(r.get('stageReceiptCount')==12*rounds and r.get('localEvaluationRounds')==rounds,'STAGE_COUNT')
    require(r.get('perspectiveComputations')==269568*12*rounds and r.get('perspectiveSummaryObjectsComputed')==156*12*rounds and r.get('perspectiveDigestReceiptsStored')==12*rounds,'PERSPECTIVE_COUNT')
    require(r.get('actualSourcePinChecks')==1248*rounds and r.get('adversarialNegativeChecks')==6912*rounds,'R07_CHECK_COUNT')
    require(r.get('originalNodePlanTasksCompleted')==0 and r.get('hostVerified') is False and r.get('workPosts')==0 and r.get('modelTurns')==0 and r.get('privateContentImported') is False and r.get('canPublish') is False and r.get('canonEffect')=='NONE','FORGED_AUTHORITY')
    rr=r.get('history');receipts=r.get('stageReceipts')
    require(type(rr) is list and len(rr)==rounds,'ROUND_RECORDS')
    require(type(receipts) is list and len(receipts)==12*rounds,'STAGE_RECORDS')
    stageDigests={i:viewpoint(i) for i in range(1,13)}
    prev=None;genesis=h('ATLAS_CIVILIZATION_TELESCOPE_GENESIS_V1')
    preflight=None
    if preflightpath is not None:
        preflight=json.loads(preflightpath.read_text(encoding='utf8'))
        require(preflight.get('status')=='LOCAL_R07_SOURCE_PREFLIGHT_ONLY' and preflight.get('planSha256')==digest,'PREFLIGHT_SOURCE')
    for j,summary in enumerate(rr):
        require(type(summary) is dict and summary.get('round')==j+1 and summary.get('sourcePlanSha256')==digest,'ROUND_IDENTITY')
        expectedFirst=prev if prev is not None else genesis
        require(summary.get('previousHead')==expectedFirst and summary.get('stageCount')==12,'ROUND_ANCESTRY')
        require(summary.get('comparisons')==3234816 and summary.get('workPreflightChecks')==1248 and summary.get('adversarialChecks')==6912 and summary.get('sourceOnly') is True and summary.get('actualHostEffects')==0,'ROUND_COUNTERS')
        stepPrev=expectedFirst
        for stage in range(1,13):
            e=receipts[j*12+stage-1]
            require(type(e) is dict and e.get('round')==j+1 and e.get('stage')==stage and e.get('pass')==PASSES[stage-1],'STEP_IDENTITY')
            require(e.get('previousHead')==stepPrev and e.get('sourceSha')==digest,'STEP_CHAIN')
            require(e.get('checks')==269568 and e.get('surveyDigest')==stageDigests[stage],'STEP_SURVEY')
            require(e.get('reviewedNodePositions')==1728 and e.get('sphereViewpoints')==144 and e.get('houseViewpoints')==12 and e.get('authorityEffect')=='NONE' and e.get('implementedTasks')==0 and e.get('hostVerified') is False,'STEP_PERMISSIONS')
            require(type(e.get('detail')) is dict and e['detail'].get('status')=='PASS_LOCAL','STEP_LOCAL_PASS')
            if stage==8:
                require(e['detail'].get('batches')==13 and e['detail'].get('checks')==1248,'BURST_CHECKS')
                if preflight:
                    require(e['detail'].get('fingerprintRoot')==preflight.get('preflightReceiptDigest'),'BURST_DIGEST')
            if stage==9:require(e['detail'].get('attacksRejected')==6912 and e['detail'].get('reviewed')==1728,'ADVERSARY_CHECKS')
            if stage==12:require(e['detail'].get('oneBuild') is True and e['detail'].get('nodeProposals')==1728 and e['detail'].get('realHostEffects')==0,'ONE_BUILD')
            actual=e.get('head');body={k:v for k,v in e.items() if k not in ('round','head')}
            require(type(actual) is str and actual==h(canonical(body)),'STEP_HASH')
            stepPrev=actual
        require(summary.get('head')==stepPrev,'ROUND_HEAD');prev=stepPrev
    require(r.get('finalHead')==prev,'TERMINAL_HEAD')
    return {'status':'INDEPENDENT_LOCAL_TELESCOPE_REPLAY', 'rounds':rounds,
       'stageReceipts':len(receipts),'perspectiveComputations':269568*12*rounds,
       'comparedHouseSphereRows':156*12*rounds,'sourcePlanDigest':digest,
       'finalHead':prev,'work':work,'protected':protected,
       'actualWorkTasksImplemented':0,'hostVerified':False,'authorityEffect':'NONE'}

if __name__=='__main__':
    if len(sys.argv) not in (3,4):
        print('Usage: verify-telescope.py /private/r07-plan.json /private/report.json [private-r07-preflight.json]',file=sys.stderr);sys.exit(2)
    try:
        result=verify(Path(sys.argv[1]),Path(sys.argv[2]),Path(sys.argv[3]) if len(sys.argv)==4 else None)
        print(json.dumps(result,indent=2,sort_keys=True));sys.exit(0)
    except (ValueError,TypeError,KeyError,OSError,json.JSONDecodeError):
        print(json.dumps({'status':'HOLD_SOURCE_OR_RECEIPT','hostVerified':False,'authorityEffect':'NONE'}));sys.exit(1)
