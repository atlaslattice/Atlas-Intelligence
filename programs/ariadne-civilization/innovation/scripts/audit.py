#!/usr/bin/env python3
"""Independent local integrity audit of 20x1728 synthetic positive/negative receipts."""
from pathlib import Path
from collections import Counter,defaultdict
import hashlib,csv,json,sys
ROOT=Path(__file__).resolve().parent.parent
EXPECTED_CSV='60146fc63beba5f8d1b28ea8a6481f4e4a469827afc6ae04edfecc229c1fa4ce'
EXPECTED_REGISTRY='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
sha=lambda b:hashlib.sha256(b).hexdigest()
source=ROOT/'private-source/source-index.csv'
raw=source.read_bytes();assert sha(raw)==EXPECTED_CSV,'source bytes mismatch'
with source.open(newline='',encoding='utf-8') as f:rows=list(csv.DictReader(f))
assert len(rows)==1728 and len({r['coordinate'] for r in rows})==1728
assert Counter(r['node_kind'] for r in rows)==Counter({'DOMAIN_SPECIALIZATION':1008,'EPISTEMIC_META':720})
for r in rows:
 h,s,n=r['coordinate'].split('.')
 assert len(h)==3 and len(s)==3 and len(n)==3
 assert 1<=int(h[1:])<=12 and 1<=int(s[1:])<=12 and 1<=int(n[1:])<=12
 assert (int(s[1:])<=7)==(r['node_kind']=='DOMAIN_SPECIALIZATION')
 assert len(r['source_sha256'])==64
source_nodes={r['coordinate']:r for r in rows}
report=json.loads((ROOT/'reports/meta145_innovation_reduction.json').read_text())
assert report['sourceNodes']==1728 and report['inventionOperators']==20
assert report['adversarialMutationsRejected']==34560 and report['syntheticOperatorInvocations']==34560
assert report['totalSyntheticFunctionCalls']==69120
assert report['sourceRegistrySha256']==EXPECTED_REGISTRY
assert report['sourceDerivedCsvSha256']==EXPECTED_CSV
seen=set();seq=[];neg=[];counts=Counter();neg_counts=Counter();houses=Counter();spheres=Counter()
for name,dest,expected in [('synthetic_34560.jsonl',seq,'LOCAL_SYNTHETIC_CANDIDATE'),('negative_34560.jsonl',neg,'HOLD')]:
 contents=(ROOT/'reports'/name).read_bytes()
 for line in contents.splitlines():
  r=json.loads(line);assert r['state']==expected and r['coordinate'] in source_nodes
  if expected=='LOCAL_SYNTHETIC_CANDIDATE':
   assert r['sourceRegistrySha256']==EXPECTED_REGISTRY
   assert r['originalRecordSha256']==source_nodes[r['coordinate']]['source_sha256']
   assert r['sourceDerivedCsvSha256']==EXPECTED_CSV
   assert r['semanticEdgesAccepted']==r['realResidentTurns']==r['realModelCalls']==0
   assert r['authorityEffect']=='NONE'
   assert r['experimentId'] in report['byLab']
   counts[r['experimentId']]+=1
   houses[r['coordinate'][:3]]+=1;spheres[r['coordinate'][:7]]+=1
  else:
   assert r['externalEffects']==0 and r['authorityEffect']=='NONE'
   assert r['rawSourceRead'] is False
   assert r['experimentId'] in report['byLab']
   neg_counts[r['experimentId']]+=1
  dest.append(r)
 assert len(dest)==34560
 if name.startswith('synthetic'):assert sha(contents)==report['compositeReceiptSha256']
 else:assert sha(contents)==report['negativeReceiptSha256']
assert len(houses)==12 and len(spheres)==144
assert all(x==2880 for x in houses.values()) and all(x==240 for x in spheres.values())
assert all(counts[f'I{n:02d}']==1728 and neg_counts[f'I{n:02d}']==1728 for n in range(1,21))
assert [x['coordinate']+'|'+x['experimentId'] for x in seq]==[x['coordinate']+'|'+x['experimentId'] for x in neg]
assert report['hostVerified'] is False and report['scienceValidated'] is False
assert report['authorityEffect']=='NONE' and report['externalEffects']==0
print(json.dumps({'status':'AUDIT_PASS','originalNodes':len(rows),'positiveSyntheticCalls':len(seq),
 'negativeSyntheticCalls':len(neg),'houseRollups':len(houses),'sphereRollups':len(spheres),
 'originalRegistrySha256':EXPECTED_REGISTRY,'derivedCsvSha256':sha(raw),'compositeSha256':report['compositeReceiptSha256']},indent=2))
