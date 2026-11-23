#!/usr/bin/env python3
"""Independent Python verifier for a synthetic, non-authorizing Atlas ONE cascade.

Uses explicit conditions, NOT `assert`: Python -O must never bypass checks.
No caller-provided SHA or receipt independently authenticates a host or model turn.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

FAMILIES=("TENANT","PRINCIPAL","ROOM","MODE","PURPOSE","EDITION","DIGEST","RIGHTS_READ",
"RIGHTS_RETURN","CONSENT","NO_HARVEST","CANON","DEPLOY","RAW_BODY","REPLAY","EPOCH")
GENESIS=hashlib.sha256(b'ATLAS_ONE_CASCADE_GENESIS_V1').hexdigest()
HEX=re.compile(r'^[a-f0-9]{64}$')
COORD=re.compile(r'^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$')
FIELDS={'seq','phase','coordinate','family','previousHead','caseHash','cumulativeControls',
'burstDigest','status','authorityEffect','hostVerified','brokerPosts','modelTurns','head'}

class LedgerHold(ValueError):
    """Untrusted receipt is not structurally admissible."""

def require(value, code):
    if not value:
        raise LedgerHold(code)

def canonical(obj):
    return json.dumps(obj,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode('utf-8')
def sha(data):return hashlib.sha256(data).hexdigest()

def check(ledgerpath,summarypath):
    raw=ledgerpath.read_bytes()
    require(len(raw)<=2_000_000,'LEDGER_FILE_BUDGET')
    summary=json.loads(summarypath.read_text(encoding='utf-8'))
    require(type(summary) is dict,'SUMMARY_NOT_OBJECT')
    rows=[json.loads(x) for x in raw.splitlines() if x]
    require(len(rows)==1100 and summary.get('total')==1100,'TOTAL_COUNT')
    require(sha(raw)==summary.get('ledgerSha256'),'LEDGER_FILE_DIGEST')
    previous=GENESIS;seen=set();families=set();houses={f'H{i:02d}':0 for i in range(1,13)}
    for i,row in enumerate(rows,1):
        require(type(row) is dict and set(row)==FIELDS,'ROW_SHAPE')
        require(type(row['seq']) is int and row['seq']==i,'SEQUENCE')
        require(row['phase']==('PRIMARY_100' if i<=100 else 'DESCENDANT_1000'),'PHASE')
        require(type(row['coordinate']) is str and COORD.fullmatch(row['coordinate']),'COORDINATE')
        require(row['coordinate'] not in seen,'DUPLICATE_COORDINATE')
        require(row['family']==FAMILIES[(i-1)%len(FAMILIES)],'FAMILY_ORDER')
        require(row['previousHead']==previous,'ANCESTRY')
        source=sha(('synthetic-hsn-source-v1:'+row['coordinate']).encode())
        expected=sha(canonical({'coordinate':row['coordinate'],'family':row['family'],'sourceDigest':source}))
        require(row['caseHash']==expected,'CASE_SOURCE_HASH')
        require(type(row['cumulativeControls']) is int and row['cumulativeControls']==2*i,'CONTROL_COUNT')
        require(row['status']=='PASS_LOCAL' and row['authorityEffect']=='NONE','FALSE_AUTHORITY')
        require(row['hostVerified'] is False and row['brokerPosts']==0 and row['modelTurns']==0,'FALSE_HOST_CLAIM')
        require(type(row['burstDigest']) is str and HEX.fullmatch(row['burstDigest']),'BURST_DIGEST')
        content={k:v for k,v in row.items() if k!='head'}
        require(row['head']==sha(canonical(content)),'ROW_DIGEST')
        previous=row['head'];seen.add(row['coordinate']);families.add(row['family'])
        houses[row['coordinate'].split('.')[0]]+=1
    require(len(families)==16 and all(v>=90 for v in houses.values()),'COVERAGE')
    require(rows[99]['head']==summary['stage100']['head']==summary['stage1000']['firstNewParent'],'FIRST_HUNDRED_LINK')
    require(previous==summary['stage1000']['finalHead'],'FINAL_HEAD')
    require(summary['stage100']['accumulatedControls']==10100,'STAGE_CHECKS')
    require(summary['cumulativeControlExecutions']==1211100,'TOTAL_CHECKS')
    require(summary['guardMutantsKilled']==summary['guardFamilies']==16,'MUTATION_COVERAGE')
    require(summary['hostVerified'] is False and summary['actualAIMacroTurns']==summary['peerPosts']==0,'FALSE_ACTIVITY_CLAIM')
    return {'status':'PASS_LOCAL_CROSS_RUNTIME_LEDGER_STRUCTURE','steps':len(rows),
            'head':previous,'first100':rows[99]['head'],'houses':houses,
            'families':len(families),'ledgerSha256':sha(raw),
            'authority':'NONE','hostedVerified':False}

if __name__=='__main__':
    if len(sys.argv)!=3:raise SystemExit('usage: verify-cascade-ledger.py LEDGER.jsonl SUMMARY.json')
    try:
        print(json.dumps(check(Path(sys.argv[1]),Path(sys.argv[2])),sort_keys=True,indent=2))
    except (LedgerHold,KeyError,ValueError,TypeError,UnicodeError,OSError) as exc:
        print(json.dumps({'status':'HOLD_LEDGER_INVALID','reason':type(exc).__name__}))
        raise SystemExit(1)
