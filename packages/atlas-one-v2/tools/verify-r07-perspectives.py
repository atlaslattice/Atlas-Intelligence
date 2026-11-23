#!/usr/bin/env python3
"""Independent R07 private-snapshot Sphere/House/matrix structural audit.

Does not infer actual Work, House peer judgments, signed rights, CANON, or
hosted 269,568 distinct transaction records from numeric summary counters.
No private source material is printed.
"""
from __future__ import annotations
from collections import Counter
import gzip
import hashlib
import json
from pathlib import Path
import sys

REGISTRY='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'

def hold(reason):
    raise ValueError('R07_PERSPECTIVE_HOLD_'+reason)

def sha(data):return hashlib.sha256(data).hexdigest()

def audit(root:Path):
    if not root.is_dir():hold('NOT_A_DIRECTORY')
    manifest=json.loads((root/'integrity_manifest.json').read_text(encoding='utf8'))
    base=root/'build'
    names=['sphere_perspectives_144.json','house_followups_12.json','sphere_lens_248832.jsonl.gz','node_build_plan_1728.json','execution_status.json']
    for filename in names:
        target=base/filename;pin=manifest.get('files',{}).get('build/'+filename,{})
        if sha(target.read_bytes())!=pin.get('sha256') or target.stat().st_size!=pin.get('bytes'):
            hold('WRONG_FILE_PIN')
    spheres=json.loads((base/names[0]).read_text(encoding='utf8'))
    houses=json.loads((base/names[1]).read_text(encoding='utf8'))
    plan=json.loads((base/names[3]).read_text(encoding='utf8'))
    status=json.loads((base/names[4]).read_text(encoding='utf8'))
    if len(spheres)!=144 or len(houses)!=12 or len(plan)!=1728:hold('CENSUS')
    if status.get('actualMacroturnsExecutedByCompiler')!=0 or status.get('releaseDeployed') is not False or status.get('canonEffect')!='NONE':hold('AUTHORITY')
    if status['mathematicalCoverage']['pairEvaluations']!=248832:hold('SPHERE_PAIR_TOTAL')
    sphereModes={}
    for ix,srow in enumerate(spheres):
        h=ix//12+1;s=ix%12+1;sphere=f'H{h:02d}.S{s:02d}'
        if (srow.get('sphere')!=sphere or srow.get('house')!=f'H{h:02d}'
           or srow.get('initiativeId')!=f'N144-{h:02d}-{s:02d}'
           or srow.get('perspectiveEvaluations')!=1728
           or srow.get('status')!='STRUCTURAL_LENS_EVALUATED_OFFLINE_NOT_A_REAL_MACROTURN'):hold('SPHERE_FIELDS')
        if srow.get('nodesNative')!=[f'{sphere}.N{n:02d}' for n in range(1,13)]:hold('SPHERE_NODES')
        if srow.get('lensScopeCounts')!={'NATIVE_SPHERE_MEMBERSHIP':12,'SAME_HOUSE_DISTINCT_SPHERE':132,'CROSS_HOUSE_REVIEW_ONLY':1584}:hold('SPHERE_SCOPE_COUNTS')
        sphereModes[sphere]=srow['suggestedMode']
        for idx,node in enumerate(plan[ix*12:(ix+1)*12],1):
            if node.get('coordinate')!=f'{sphere}.N{idx:02d}' or node.get('sourceRole')!=('DOMAIN_SPECIALIZATION' if s<=7 else 'EPISTEMIC_META') or node.get('suggestedMode')!=srow['suggestedMode'] or node.get('sourceInitiative')!=srow['initiativeId']:hold('SPHERE_NODE_CROSSWALK')
        for candidate in srow.get('topCrossSphereLexicalCandidates',[]):
            if candidate.get('status')!='UNREVIEWED' or not isinstance(candidate.get('coordinate'),str):hold('UNREVIEWED_CANDIDATE_PROMOTION')
    for h,row in enumerate(houses,1):
        house=f'H{h:02d}'
        if (row.get('house')!=house or row.get('sourceRegistrySha256')!=REGISTRY
          or row.get('sourceNodeCount')!=144 or row.get('spherePerspectiveCount')!=12
          or row.get('houseFollowupNumber')!=h or row.get('nodePerspectiveAudits')!=20736
          or row.get('status')!='HOUSE_SYNTHESIS_COMPUTED_OFFLINE_NOT_AUTHORED_BY_12_PEERS'):hold('HOUSE_FIELDS')
        if row.get('sourceSphereIds')!=[f'{house}.S{s:02d}' for s in range(1,13)]:hold('HOUSE_SPHERE_JOIN')
        if row.get('sphereInitiativeIds')!=[f'N144-{h:02d}-{s:02d}' for s in range(1,13)]:hold('HOUSE_INITIATIVES')
        expected=Counter(sphereModes[f'{house}.S{s:02d}'] for s in range(1,13))
        if row.get('voluntaryModeCounts')!=dict(expected):hold('HOUSE_MODE_TOTAL')
        if len(row.get('crossHouseReviewQueues',[]))!=11:hold('CROSS_HOUSE_CANDIDATES')
        if any(x.get('status')!='UNREVIEWED_CROSS_HOUSE_INTERFACE' for x in row.get('crossHouseReviewQueues',[])):hold('CROSS_HOUSE_PROMOTION')
    seen=0;scopes=Counter()
    with gzip.open(base/'sphere_lens_248832.jsonl.gz','rt',encoding='utf8') as inp:
      for line in inp:
        if seen>=248832:hold('LENS_EXCESS')
        record=json.loads(line)
        ix=seen//1728;coord=seen%1728
        h=coord//144+1;s=coord%144//12+1;n=coord%12+1
        lens=f'H{ix//12+1:02d}.S{ix%12+1:02d}';node=f'H{h:02d}.S{s:02d}.N{n:02d}'
        scope='NATIVE_SPHERE_MEMBERSHIP' if lens==node[:7] else 'SAME_HOUSE_DISTINCT_SPHERE' if lens[:3]==node[:3] else 'CROSS_HOUSE_REVIEW_ONLY'
        if (record.get('perspective')!=lens or record.get('node')!=node or record.get('scope')!=scope
           or record.get('nodeRole')!=('DOMAIN_SPECIALIZATION' if s<=7 else 'EPISTEMIC_META')
           or record.get('authorityEffect')!='NONE' or record.get('relationStatus')!=('STRUCTURAL_MEMBER' if scope=='NATIVE_SPHERE_MEMBERSHIP' else 'UNREVIEWED_NAVIGATION_CANDIDATE')):
            hold('LENS_ROW_IDENTITY')
        scopes[scope]+=1;seen+=1
    if seen!=248832:hold('LENS_MISSING')
    if scopes!={'NATIVE_SPHERE_MEMBERSHIP':1728,'SAME_HOUSE_DISTINCT_SPHERE':19008,'CROSS_HOUSE_REVIEW_ONLY':228096}:hold('LENS_SCOPE_TOTALS')
    # Distinct House×node row evidence would require another 12×1728 line corpus,
    # which this package does not include. The metadata's 20736/House explicitly
    # aggregates each House's twelve *already counted* Sphere scans.
    return {'status':'R07_SPHERE_LENS_ROWS_INDEPENDENTLY_VERIFIED','originalDerivedPlanNodes':1728,
      'spherePerspectiveRows':144,'houseFollowupSummaries':12,
      'actualSphereByNodeRows':seen,
      'spherePairScopes':dict(scopes),
      'distinctHouseByNodeRowsMaterialized':0,
      'houseFollowupReportedAuditSum':sum(x['nodePerspectiveAudits'] for x in houses),
      'narrativeArithmetic144Plus12Views':(144+12)*1728,
      'arithmeticInterpretation':'HOUSE_TOTAL_REUSES_SPHERE_SCANS_AND_HAS_NO_SEPARATE_HOUSE_NODE_MATRIX',
      'actualR07Macroturns':0,'authorityEffect':'NONE','hostVerified':False}

if __name__=='__main__':
    try:
        if len(sys.argv)!=2:hold('REQUIRES_EXTRACTED_PRIVATE_R07_FOLDER')
        print(json.dumps(audit(Path(sys.argv[1])),sort_keys=True,indent=2));sys.exit(0)
    except (OSError,ValueError,KeyError,TypeError,EOFError,gzip.BadGzipFile):
        print(json.dumps({'status':'HOLD_SOURCE_OR_RECEIPT','authorityEffect':'NONE'}));sys.exit(1)
