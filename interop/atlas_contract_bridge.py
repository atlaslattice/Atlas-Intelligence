"""Read-only Atlas ONE / Noosphere / GoldenTrace source contract probe.

Validates actual imported public source modules supplied by the caller. Importing
code executes it: import *only* trusted, reviewed, pinned local checkouts.
No credentials, private data, network calls or real Work-room messages.
"""
from __future__ import annotations
import argparse
import copy
import hashlib
import importlib.util
import json
import sys
from pathlib import Path

from atlas_fabric import load_json_strict
from atlas_one_circuit import run_circuit, verify_receipt


class ContractProbeHold(ValueError):pass


def require(ok, reason):
    if not ok:raise ContractProbeHold(reason)


def module_from_pinned_path(name,path):
    path=Path(path).resolve(strict=True)
    require(path.is_file() and path.suffix=='.py','external_module_path_invalid')
    spec=importlib.util.spec_from_file_location(name,path)
    require(spec is not None and spec.loader is not None,'external_module_loader_missing')
    module=importlib.util.module_from_spec(spec)
    sys.modules[name]=module
    spec.loader.exec_module(module)
    return module,hashlib.sha256(path.read_bytes()).hexdigest()


def noosphere_handshake(noosphere):
    require(hasattr(noosphere,'validate_ingestion'),'noosphere_ingest_contract_missing')
    partial={'source_root':'public:synthetic','raw_export_status':'raw_partial'}
    expected=copy.deepcopy(partial)
    result=noosphere.validate_ingestion(partial)
    require(partial==expected and result.payload==expected,'noosphere_mutated_input')
    require(result.state in {'QUARANTINED','SOURCE_REPORTED_ONLY'},'noosphere_claimed_complete')
    require(result.authority=='none','noosphere_granted_authority')
    missing=noosphere.validate_ingestion({'source_root':'public:synthetic'})
    require(missing.state=='QUARANTINED','noosphere_accepted_missing_raw_export')
    hashed=noosphere.validate_ingestion({'source_root':'public:synthetic',
        'raw_export_status':'raw_complete_hashed',
        'whole_export_sha256':'a'*64,
        'source_root_manifest':{'synthetic.txt':'b'*64}})
    require(hashed.state in {'QUARANTINED','SOURCE_REPORTED_ONLY'},
            'noosphere_claimed_independent_byte_verification')
    # A source-reported hash and a partial source must remain separate in the
    # Atlas adapter, even if Noosphere uses one SOURCE_REPORTED_ONLY status.
    return {'status':'SOURCE_CONTRACT_REVIEW_ONLY','partial':'INCOMPLETE_HELD',
            'missing':'QUARANTINED','hashed':'UNVERIFIED_FORMAT_ONLY',
            'authority_effect':'NONE','actual_source_bytes_verified':False}


def golden_trace_handshake(legacy_emitter_module,local_receipt):
    require(hasattr(legacy_emitter_module,'GoldenTraceEmitter'), 'legacy_emitter_missing')
    require(verify_receipt(local_receipt),'local_circuit_receipt_invalid')
    e=legacy_emitter_module.GoldenTraceEmitter(repo='Atlas-Intelligence',
        module='interop/atlas_one_circuit')
    event=e.emit(event_type='invariant_check',sphere_tag='H12.S07',
        aluminum_layer='L3-Engine',
        payload={'synthetic_fixture':True,'receipt_sha256':local_receipt['terminal_sha256'],
                 'review':'LOCAL_PREPARED_UNPOSTED'},invariants_checked=['INV-0'])
    before=copy.deepcopy(event)
    require(e.verify_chain() is True,'legacy_chain_replay_failed')
    require(event==before,'legacy_emitter_verifier_mutated_event')
    require(event.get('integrity',{}).get('hash_algorithm')=='sha3-256',
            'legacy_hash_algorithm_not_sha3')
    require(event.get('payload',{}).get('receipt_sha256')==local_receipt['terminal_sha256'],
            'provenance_ref_missing')
    require(event.get('event_type')=='invariant_check','legacy_event_wrong_type')
    return {'status':'LOCAL_HASH_BRIDGE_ONLY',
            'hash_algorithm':'sha3-256',
            'link_to_circuit_terminal_sha256':local_receipt['terminal_sha256'],
            'host_attestation':'NONE','signature':'NOT_PRESENT',
            'canon':False,'deployed':False}


def run_probe(noosphere_module,golden_module,fabric,packet):
    trace=run_circuit(fabric,packet)
    require(verify_receipt(trace),'local_circuit_receipt_replay_failed')
    n=noosphere_handshake(noosphere_module)
    g=golden_trace_handshake(golden_module,trace)
    return {'schema':'atlas.one.crossrepo-contract-probe/v0.1',
        'result':'SOURCE_CONTRACT_HANDSHAKE_ONLY_NOT_HOSTED',
        'noosphere':n,'goldentrace':g,
        'source_isolation':'NO_PRIVATE_BODY_IMPORT',
        'actual_model_calls':0,'work_room_posts':0,
        'runtime_attestation':'NOT_ATTESTED',
        'authority_effect':'NONE'}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--noosphere',type=Path,required=True)
    p.add_argument('--goldentrace',type=Path,required=True)
    p.add_argument('--manifest',type=Path,default=Path(__file__).with_name('atlas_project_manifest.v0.1.json'))
    p.add_argument('--packet',type=Path,default=Path(__file__).with_name('atlas_collision_h01.work.v0.2.json'))
    args=p.parse_args()
    try:
        n,n_hash=module_from_pinned_path('noosphere_contract_probe',args.noosphere)
        g,g_hash=module_from_pinned_path('goldentrace_contract_probe',args.goldentrace)
        receipt=run_probe(n,g,load_json_strict(args.manifest),load_json_strict(args.packet))
        receipt['public_source_file_hashes_sha256']={
            'noosphere_source':n_hash,'legacy_goldentrace_source':g_hash}
        print(json.dumps(receipt,sort_keys=True))
        return 0
    except (ContractProbeHold,OSError,ValueError,TypeError,KeyError) as e:
        print(json.dumps({'result':'HELD_CONTRACT_PROBE_NOT_VERIFIED','reason':str(e)}))
        return 2

if __name__=='__main__':sys.exit(main())