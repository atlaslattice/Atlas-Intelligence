#!/usr/bin/env python3
"""Verifies 12 finite shards of 21x20 synthetic Node compositions.
Not scientific validation, host authorization or agent execution.
"""
from pathlib import Path
import hashlib, json, csv, collections
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'symbiosis/reports'
CHUNKS=ROOT/'symbiosis/chunks'
INDEX=ROOT/'private-source/source-index.csv'
SRC_SHA='60146fc63beba5f8d1b28ea8a6481f4e4a469827afc6ae04edfecc229c1fa4ce'
assert hashlib.sha256(INDEX.read_bytes()).hexdigest()==SRC_SHA
with INDEX.open(newline='',encoding='utf-8') as f:
    source=list(csv.DictReader(f))
assert len(source)==1728
assert len({x['coordinate'] for x in source})==1728
count=collections.Counter(x['node_kind'] for x in source)
assert count=={'DOMAIN_SPECIALIZATION':1008,'EPISTEMIC_META':720},count
all_rows=[]; rep=[]; sphere=collections.defaultdict(lambda:collections.Counter());house=collections.defaultdict(lambda:collections.Counter());targets=collections.defaultdict(lambda:collections.Counter())
for k in range(12):
    d=CHUNKS/f'c{k}'
    r=json.loads((d/'run_receipt.json').read_text())
    assert r['startOrdinal']==k*144+1 and r['endOrdinal']==(k+1)*144
    assert r['sourceNodesExecuted']==144 and r['totalSyntheticPositiveCompositions']==60480
    assert r['totalNegativePrivateModeHolds']==60480
    assert r['sourceDerivedCsvSha256']==SRC_SHA
    lines=(d/'node_1728_receipts.jsonl').read_text().strip().splitlines()
    assert len(lines)==144
    data=[json.loads(l) for l in lines]
    for j,row in enumerate(data):
        original=source[k*144+j]
        assert row['coordinate']==original['coordinate']
        assert row['sourceNodeSha256']==original['source_sha256']
        assert row['positive']==row['privateModeHolds']==420
        assert row['changed']+row['unchanged']==420
        assert len(row['meta145ReceiptSha256'])==64
        all_rows.append(row)
    for h,v in r['houseSummaries'].items():
        house[h].update(v)
    for s,v in r['sphereSummaries'].items():
        sphere[s].update(v)
    for t,v in r['targetSummary'].items():
        targets[t].update(v)
    rep.append({'shard':k,'startOrdinal':r['startOrdinal'],'endOrdinal':r['endOrdinal'],
        'positive':r['totalSyntheticPositiveCompositions'],'denied':r['totalNegativePrivateModeHolds'],
        'changed':r['targetResultsChangedUnderSyntheticConditioning'],'unchanged':r['targetResultsUnchanged'],
        'positiveStreamSha256':r['sourceOnlyPositiveStreamDigest'],'privateModeHoldStreamSha256':r['privateModeHoldStreamDigest']})
assert len(all_rows)==1728
assert len({x['coordinate'] for x in all_rows})==1728
assert len(house)==12 and len(sphere)==144
assert all(v['nodes']==144 and v['compositions']==60480 and v['deniedProbes']==60480 for v in house.values())
assert all(v['nodes']==12 and v['compositions']==5040 and v['deniedProbes']==5040 for v in sphere.values())
assert len(targets)==20
assert all(v['calls']==21*1728 and v['changed']+v['unchanged']==v['calls'] for v in targets.values())
pos=sum(v['positive'] for v in rep);neg=sum(v['denied'] for v in rep)
changed=sum(v['changed'] for v in rep);unchanged=sum(v['unchanged'] for v in rep)
assert pos==neg==1728*21*20==725760
assert changed+unchanged==pos
OUT.mkdir(exist_ok=True)
ledger=''.join(json.dumps(x,sort_keys=True,separators=(',',':'))+'\n' for x in all_rows)
(OUT/'node_1728_receipts.jsonl').write_text(ledger)
(OUT/'shard_proofs_12.json').write_text(json.dumps(rep,indent=2)+'\n')
full={'schema':'atlas.ariadne.symbiosis.full-mesh-sweep/v0.1',
 'status':'EXECUTED_FULL_DETERMINISTIC_SYNTHETIC_21_BY_20',
 'sourceDerivedIndexSha256':SRC_SHA,'originalAriadneRegistrySha256':'07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6',
 'sourceOriginalRawBytesVerifiedHere':False,'sourceDerivedCoordinatesVerifiedHere':1728,
 'sourceKinds':dict(count),'operatorRoots':21,'extensionAlgorithms':20,'distinctDirectConfigurations':420,
 'syntheticComposedCalls':pos,'privateModeDenialChecks':neg,
 'syntheticOutputChangedRelativeToSameInputBaseline':changed,
 'syntheticOutputUnchangedRelativeToSameInputBaseline':unchanged,
 'changedFraction':round(changed/pos,6),
 'spheresWith12Nodes':144,'housesWith144Nodes':12,
 'nodeReceiptLedgerSha256':hashlib.sha256(ledger.encode()).hexdigest(),
 'shardProofCount':12,'proofs':rep,
 'byTarget':dict(sorted(targets.items())),'bySphere':dict(sorted(sphere.items())),'byHouse':dict(sorted(house.items())),
 'selfAuthenticatingSource':False,'liveHostCalls':0,'externalModelsUsed':0,
 'genuineSwarmChatMacroTurns':0,'semanticGraphEdgesApproved':0,
 'productionModulesDeployed':0,'operatorNoveltyWorldFirstProven':False,'authorityEffect':'NONE'}
(OUT/'meta145_full_receipt.json').write_text(json.dumps(full,indent=2)+'\n')
print(json.dumps({k:full[k] for k in ['sourceDerivedCoordinatesVerifiedHere','distinctDirectConfigurations','syntheticComposedCalls','privateModeDenialChecks','syntheticOutputChangedRelativeToSameInputBaseline','syntheticOutputUnchangedRelativeToSameInputBaseline','changedFraction','shardProofCount','nodeReceiptLedgerSha256']},indent=2))
