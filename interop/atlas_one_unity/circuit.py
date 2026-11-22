"""Atlas v0.2 eight-event circuit + GF7 cross-index + Noosphere contracts.

Uses existing imported project code. Requires explicit supplied *public-source*
modules; never imports private broker/AtlasGPT content or contacts a network.
"""
from __future__ import annotations
import copy,hashlib,json
from .coordinates import index_pair,ARIADNE_DIGEST
from .gate import gate_host,gate_ci,gate_return,gate_science
from .docket import classify_backlog

class UnityHold(ValueError):pass


def unified_review(fabric:dict, packet:dict, *,atlas_circuit,
                   noosphere,backlog:list[dict],host_snapshot:dict|None=None,
                   ci_run:dict|None=None,science_cases:list[dict]|None=None,
                   return_grant:dict|None=None,fresh_grant:dict|None=None)->dict:
    if not hasattr(atlas_circuit,'run_circuit') or not hasattr(atlas_circuit,'verify_receipt'):
        raise UnityHold('atlas_circuit_not_pinned')
    if not hasattr(noosphere,'validate_ingestion'):
        raise UnityHold('noosphere_contract_not_pinned')
    # Freeze caller-owned data through decoded JSON before any structural checks.
    try:
        f=json.loads(json.dumps(fabric,allow_nan=False,sort_keys=True))
        p=json.loads(json.dumps(packet,allow_nan=False,sort_keys=True))
    except (TypeError,ValueError,OverflowError) as e:
        raise UnityHold('non_json_work_candidate') from e
    if p.get('input_scope')!='PUBLIC_WORK_METADATA' or p.get('model_calls')!=0 or p.get('posted_messages')!=0:
        raise UnityHold('private_or_executing_input_denied')
    receipt=atlas_circuit.run_circuit(f,p)
    if not atlas_circuit.verify_receipt(receipt) or receipt.get('actual_model_turns')!=0 or receipt.get('post_count')!=0:
        raise UnityHold('atlas_receipt_not_source_only')
    # Real Noosphere validator invoked only on a synthetic, PUBLIC metadata packet.
    metadata={'source_root':'synthetic:atlas-one-review','raw_export_status':'raw_partial'}
    orig=copy.deepcopy(metadata)
    ingest=noosphere.validate_ingestion(metadata)
    if metadata!=orig or ingest.authority!='none' or ingest.state not in ('SOURCE_REPORTED_ONLY','QUARANTINED'):
        raise UnityHold('noosphere_contract_disagrees')
    # Arbitrary index mapping is a *proposal* and cannot create semantic same-as.
    hsn='H01.S01.N01'
    candidate=index_pair(hsn,source_edition='v0.7',source_digest=ARIADNE_DIGEST)
    if candidate['semantic_same_as'] is not False:raise UnityHold('forbidden_semantic_equivalence')
    counts=classify_backlog(backlog)
    host=gate_host(host_snapshot or {'revision':'UNATTESTED'})
    ci=gate_ci(ci_run or {'conclusion':'unknown','steps':[]})
    rights=gate_return(return_grant or {'issuer':'UNTRUSTED','epoch':0},fresh_grant)
    science=gate_science(science_cases or [])
    if receipt.get('run_state')!='LOCAL_PREPARED_UNPOSTED':raise UnityHold('wrong_execution_state')
    proof={'schema':'atlas.one.source-unity.review/v0.3','atlas_v02_terminal_sha256':receipt['terminal_sha256'],
           'atlas_events':len(receipt['events']),'noosphere_ingest_state':ingest.state,
           'noosphere_bytes_independently_verified':False,
           'coordinate_pair':candidate,'backlog':counts,
           'host':host,'ci':ci,'return_gate':rights,'science':science,
           'can_publish':False,'can_post_work':False,'can_merge_prs':False,
           'can_close_issues':False,'canon':False,'deployed':False,'authority':'NONE',
           'actual_model_calls':0,'actual_broker_posts':0,'private_modes_read':False,
           'source_only':True}
    blob=json.dumps(proof,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode()
    proof['local_receipt_sha256']=hashlib.sha256(blob).hexdigest()
    return proof
