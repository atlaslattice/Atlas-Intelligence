#!/usr/bin/env python3
"""Independent structural receipt/proof verifier. Works without network/model."""
from __future__ import annotations
import argparse,json,pathlib,sys
from atlas1728 import digest,verify_merkle_proof,assemble_merkle,SourceContractError

def verify(orders_path,proofs_path,summary_path):
    program=json.loads(pathlib.Path(orders_path).read_text())
    proofs=json.loads(pathlib.Path(proofs_path).read_text())
    summary=json.loads(pathlib.Path(summary_path).read_text())
    orders=program['orders'];items=proofs['proofs']
    root=program['workOrderMerkleRoot']
    if len(orders)!=1728 or len(items)!=1728 or root!=proofs['root'] or root!=summary['workOrderMerkleRoot']:
        raise SourceContractError('RECEIPT_MANIFEST_DRIFT')
    for i,(order,entry) in enumerate(zip(orders,items)):
        body={k:v for k,v in order.items() if k!='workOrderSha256'}
        sha=digest(body,'atlas.foundry.workorder/v1')
        if sha!=order['workOrderSha256'] or sha!=entry['leafSha256']:
            raise SourceContractError('WORK_ORDER_CONTENT_TAMPER_'+str(i))
        if order['canonical']!=entry['canonical'] or order['taskId']!=entry['taskId']:
            raise SourceContractError('TASK_ID_DRIFT_'+str(i))
        if not verify_merkle_proof(sha,entry['proof'],root):
            raise SourceContractError('MERKLE_PROOF_INVALID_'+str(i))
    computed_root,_=assemble_merkle([t['workOrderSha256'] for t in orders])
    if computed_root!=root:raise SourceContractError('WORK_ORDER_ROOT_INVALID')
    return {'status':'PASS_LOCAL_HASH_CHAIN_ONLY','workOrders':1728,'leafProofsChecked':1728,
            'rootSha256':root,'hostSignerVerified':False,'issuerAuthenticated':False,'semanticAcceptance':0}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--orders',required=True);p.add_argument('--proofs',required=True);p.add_argument('--summary',required=True)
    args=p.parse_args();print(json.dumps(verify(args.orders,args.proofs,args.summary),indent=2))
