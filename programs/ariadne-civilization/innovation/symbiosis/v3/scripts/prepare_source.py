#!/usr/bin/env python3
"""Materialize *owner-private* synthetic simulator seeds from exact derived index & v1 mesh receipt."""
import argparse, csv, hashlib, json, pathlib, sys
EXPECTED_CSV='60146fc63beba5f8d1b28ea8a6481f4e4a469827afc6ae04edfecc229c1fa4ce'
EXPECTED_LEDGER='6a1626e86cb1dc4440a23eeae815e7c15f080dde13397796dc460afdddfac2c2'
ROOT=pathlib.Path(__file__).resolve().parents[1]
def sha256(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def prepare(csvfile,ledger,out):
    if sha256(csvfile)!=EXPECTED_CSV:raise ValueError('DERIVED_CSV_HASH_MISMATCH')
    if sha256(ledger)!=EXPECTED_LEDGER:raise ValueError('MESH_LEDGER_HASH_MISMATCH')
    nodes=list(csv.DictReader(csvfile.open(encoding='utf8',newline='')))
    receipts=[json.loads(s) for s in ledger.read_text().splitlines() if s.strip()]
    if len(nodes)!=1728 or len(receipts)!=1728:raise ValueError('EXPECTED_1728')
    houses={f'H{i:02d}' for i in range(1,13)}
    spheres={f'H{i:02d}.S{j:02d}' for i in range(1,13) for j in range(1,13)}
    if {v['coordinate'][:3] for v in nodes}!=houses or {v['coordinate'][:7] for v in nodes}!=spheres:raise ValueError('COORDINATE_TOPOLOGY')
    if sum(n['node_kind']=='DOMAIN_SPECIALIZATION' for n in nodes)!=1008 or sum(n['node_kind']=='EPISTEMIC_META' for n in nodes)!=720:raise ValueError('ROLE_COUNTS')
    if len(set(n['coordinate'] for n in nodes))!=1728:raise ValueError('DUPLICATE_COORDINATE')
    if len({n['source_sha256'] for n in nodes})!=1728:raise ValueError('DUPLICATE_SOURCE_SHA')
    pairs=[]
    for i,(n,r) in enumerate(zip(nodes,receipts)):
        if n['coordinate']!=r['coordinate'] or n['source_sha256']!=r['sourceNodeSha256'] or r['positive']!=420 or r['privateModeHolds']!=420 or r['changed']+r['unchanged']!=420:raise ValueError(f'MESH_COORDINATE_OR_CARDINALITY:{i}')
        h=int(n['coordinate'][1:3]);s=int(n['coordinate'][5:7]);nn=int(n['coordinate'][9:11]);
        if h<1 or h>12 or s<1 or s>12 or nn<1 or nn>12:raise ValueError('BAD_COORD')
        kind=0 if n['node_kind']=='DOMAIN_SPECIALIZATION' else 1
        source_seed=int(n['source_sha256'][:16],16)
        pairs.append((i,h,s,kind,r['changed'],source_seed))
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(''.join(' '.join(map(str,p))+'\n' for p in pairs),encoding='ascii')
    return {'schema':'atlas.v3.source-preflight/v1','nodeCount':len(nodes),'sphereCount':144,'houseCount':12,'domainNodes':1008,'methodNodes':720,'derivedCsvSha256':EXPECTED_CSV,'priorMeshLedgerSha256':EXPECTED_LEDGER,'simulatorInputSha256':sha256(out),'originalRawAriadneBytesRecheckedInThisRun':False,'registryPin':'07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6','semanticAcceptance':0,'authorityEffect':'NONE'}
if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('source_csv',type=pathlib.Path);a.add_argument('mesh_receipts',type=pathlib.Path);a.add_argument('output',type=pathlib.Path);x=a.parse_args()
    meta=prepare(x.source_csv,x.mesh_receipts,x.output);print(json.dumps(meta,sort_keys=True));(x.output.parent/'preflight.json').write_text(json.dumps(meta,indent=2)+'\n')
