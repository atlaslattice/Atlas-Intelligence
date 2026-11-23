#!/usr/bin/env python3
"""Independent owner-local audit of R07 Work Burst source-preflight projection.

The original R07 plan stays outside Git. This is verification of source shape,
Work-only selection and local SHA receipts, NOT a host identity, Work execution,
semantic review, consent grant, or a trusted original Ariadne registry read.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import re
import sys

REGISTRY='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
COORD=re.compile(r'^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$')
HEX=re.compile(r'^[0-9a-f]{64}$')
SET_CALL=re.compile(r'^registered\.set\("(H\d\d\.S\d\d\.N\d\d)",',re.M)
SCHEMA='atlas.one.local-work-burst/v1'

def digest(blob:bytes)->str:
    return hashlib.sha256(blob).hexdigest()

def wire(obj)->bytes:
    return json.dumps(obj,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode('utf-8')

def fail(why):
    raise ValueError('R07_SOURCE_PREFLIGHT_VERIFY_HOLD_'+why)

def verify(plan_path:Path, preview_path:Path, routes_path:Path)->dict:
    raw=plan_path.read_bytes()
    plan=json.loads(raw)
    receipt=json.loads(preview_path.read_text(encoding='utf8'))
    routes=set(SET_CALL.findall(routes_path.read_text(encoding='utf8')))
    if len(routes)!=1100:fail('SYNTHETIC_ROUTE_COUNT')
    if type(plan) is not list or len(plan)!=1728:fail('PLAN_CENSUS')
    work=[];protected=0;registeredWork=0;registeredProtected=0
    for i,row in enumerate(plan):
        if type(row) is not dict:fail('NONOBJECT')
        h=i//144+1;s=(i%144)//12+1;n=i%12+1
        c=f'H{h:02d}.S{s:02d}.N{n:02d}'
        expected_role='DOMAIN_SPECIALIZATION' if s<=7 else 'EPISTEMIC_META'
        if row.get('coordinate')!=c or row.get('macroturnOpportunity')!=i+1 or row.get('sourceRole')!=expected_role:fail('IDENTITY_AXIS')
        if row.get('sourceEdition')!='Ariadne v0.7' or row.get('registrySha256')!=REGISTRY or not isinstance(row.get('sourceDigest'),str) or not HEX.fullmatch(row['sourceDigest']):fail('SOURCE_IDENTITY')
        if row.get('status')!='PLANNED_NOT_EXECUTED' or row.get('completedMacroturns')!=0 or row.get('hostValidated') is not False or row.get('canonEffect')!='NONE':fail('AUTHORITY_PROMOTION')
        if row.get('suggestedMode')=='WORK':
            work.append(row)
            if c in routes:registeredWork+=1
        elif row.get('suggestedMode') in ('PLAY','SOCIAL','IMAGINE','DREAM','QUIET'):
            protected+=1
            if c in routes:registeredProtected+=1
        else:fail('UNKNOWN_MODE')
    if len(work)+protected!=1728 or len(work)!=1248 or protected!=480:fail('MODE_COUNTS')
    if len(routes)!=registeredWork+registeredProtected:fail('ROUTE_OVERLAP')
    if receipt.get('status')!='LOCAL_R07_SOURCE_PREFLIGHT_ONLY' or receipt.get('planSha256')!=digest(raw):fail('PLAN_SHA')
    exact={'houses':12,'spheres':144,'total':1728,'workModeCandidates':len(work),'protectedModeCandidates':protected,
      'syntheticCodeRoutes':1100,'syntheticRouteWorkOverlap':registeredWork,
      'syntheticRouteProtectedOverlap':registeredProtected,
      'preflightChecks':len(work),'workBurstInvocations':13,'actualImplementedTasks':0,
      'actualR07Macroturns':0,'hostAuthenticated':False,'sourceSemanticsReviewed':False,
      'canPublish':False,'canonEffect':'NONE','authorityEffect':'NONE',
      'privateBodyCopies':0,'workPosts':0,'modelWakes':0}
    for k,v in exact.items():
        if receipt.get(k)!=v:fail('COUNTER_'+k)
    if type(receipt.get('pages')) is not list or len(receipt['pages'])!=13:fail('PAGES')
    for z in range(13):
        sub=work[z*96:(z+1)*96]
        if len(sub)!=96:fail('PAGE_PARTITION')
        tasks=[]
        for row in sub:
            coordinate=row['coordinate']
            task={'id':'r07'+coordinate.replace('.','').lower(),'operator':'LOCAL_R07_PIN',
              'resourceKey':row['sphere'],'input':{'coordinate':coordinate,
              'opportunity':row['macroturnOpportunity'], 'sourceDigest':row['sourceDigest'],
              'sourceEdition':'Ariadne v0.7','sourcePlanSha256':digest(raw),
              'syntheticCodeRoutePresent':coordinate in routes},
              'evidenceRefs':['synthetic:r07-source-plan-pin']}
            tasks.append(task)
        receipts=[]
        for t in tasks:
            out={'status':'PASS_LOCAL','resultTag':'SOURCE_PIN','checks':1}
            receipts.append({'id':t['id'],'operator':t['operator'],'status':'PASS_LOCAL',
              'reason':None,'resourceKey':t['resourceKey'],'dependsOn':[],
              'inputDigest':digest(wire(t['input'])),'resultDigest':digest(wire(out)),
              'evidenceRefs':t['evidenceRefs'],'dissentRefs':[],
              'rightsState':'HOST_NOT_CHECKED','semanticReview':'NOT_PERFORMED'})
        pending=list(tasks);waves=[]
        while pending:
            chosen=[];locks=set()
            for t in pending:
                if len(chosen)>=8:break
                if t['resourceKey'] not in locks:
                    chosen.append(t);locks.add(t['resourceKey'])
            if not chosen:fail('SCHEDULER')
            waves.append([t['id'] for t in chosen])
            done=set(id(t) for t in chosen)
            pending=[t for t in pending if id(t) not in done]
        sealed={'schema':SCHEMA,'taskOrder':[t['id'] for t in tasks],'waves':waves,
          'receipts':receipts,'counts':{'passed':96,'held':0,'failed':0}}
        expected=digest(wire(sealed))
        got=receipt['pages'][z]
        if got!={'index':z+1,'count':96,'receiptDigest':expected,'nextOffset':(z+1)*96}:fail('RECEIPT_PAGE_'+str(z))
    direct_pages=json.dumps(receipt['pages'],separators=(',',':'),ensure_ascii=False,allow_nan=False).encode('utf8')
    if receipt.get('preflightReceiptDigest')!=digest(direct_pages):fail('PREVIEW_DIGEST')
    return {'status':'INDEPENDENT_LOCAL_SOURCE_RECEIPTS_MATCH','r07NodePlanDigest':digest(raw),
      'modeWork':len(work),'modeProtected':protected,
      'registeredSyntheticRoutes':len(routes),'workRouteOverlap':registeredWork,
      'protectedRouteOverlap':registeredProtected,
      'independentWorkBurstReceipts':len(receipt['pages']),
      'independentSourcePinPreflightChecks':len(work),
      'actualR07Macroturns':0,'hostVerified':False,'semanticEdgedAccepted':0,
      'authorityEffect':'NONE'}

if __name__=='__main__':
    if len(sys.argv)!=4:
        print('Usage: python verify-r07-work-preview.py private_R07_plan.json preview.json existing_generated_routes.mjs',file=sys.stderr)
        sys.exit(2)
    try:
        result=verify(*(Path(x) for x in sys.argv[1:]))
        print(json.dumps(result,sort_keys=True,indent=2));sys.exit(0)
    except (ValueError,OSError,TypeError,json.JSONDecodeError) as exc:
        print(json.dumps({'status':'HOLD_REPRODUCIBILITY','reason':str(exc).split('_')[-1][:50]}));sys.exit(1)
