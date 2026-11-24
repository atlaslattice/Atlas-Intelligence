"""Atlas ONE source-only evidence-circuit v0.2.

No network, private-body reads, model calls, SwarmChat posts, filesystem mutation,
rights grants, CANON actions, or deployment operations. The local hash chain
is replay/integrity evidence only, never an identity signature or host receipt.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

from atlas_fabric import (FabricError, load_json_strict, namespace_index,
                          parse_coordinate, validate_fabric, validate_sources)

SCHEMA = 'atlas.one.work-circuit/v0.2'
FIXED_EVENTS = (
    'FABRIC_PREFLIGHT', 'SOURCE_METADATA_BOUND', 'COORDINATES_TYPED',
    'A_PLUS_B_EQUALS_C_CANDIDATE', 'COUNTEREVIDENCE_PRESERVED',
    'TWELVE_HOUSE_REVIEW', 'HUMAN_AND_HOST_HOLDS', 'LOCAL_RECEIPT',
)
ALLOWED_INPUT_SCOPES = frozenset({'PUBLIC_WORK_METADATA'})
ACCEPTABLE_SOURCE_STATES = frozenset({'raw_missing','raw_partial',
    'raw_complete_unhashed','raw_complete_hashed','raw_source_unavailable'})
PRIVILEGED_MARKERS = frozenset({'APPROVED','DEPLOYED','CANON','RATIFIED',
    'HOSTED_VERIFIED','PEER_VERIFIED','POSTED'})

class CircuitHold(ValueError):
    """No effects; the entire candidate must be returned for human review."""


def check(condition, reason):
    if not condition:
        raise CircuitHold(reason)


def exact_fields(data, permitted, context):
    check(type(data) is dict, context + '_not_object')
    check(set(data) <= set(permitted), context + '_extra_field_denied')


def text_field(data, field, *, max_length=500, min_length=1):
    value=data.get(field)
    check(type(value) is str and min_length<=len(value)<=max_length,
          'invalid_'+field)
    check('\x00' not in value and not any(ord(c)<32 and c not in '\t\n' for c in value),
          'control_character_'+field)
    return value


def canonical(value):
    """Python-local canonicalized JSON, not RFC8785/JCS/signature proof."""
    try:
        return json.dumps(value,sort_keys=True,separators=(',',':'),
                          ensure_ascii=False,allow_nan=False).encode('utf-8')
    except (TypeError,ValueError) as e:
        raise CircuitHold('non_json_safe') from e


def sha(value):
    return hashlib.sha256(canonical(value)).hexdigest()


def verify_one_packet(fabric, packet):
    """Return a minimal normalized, non-authorizing proof skeleton.

    Text of a claim is intentionally NOT retained in the public output;
    only its fingerprint, source IDs, coordinate labels and review status.
    """
    validate_fabric(fabric)
    exact_fields(packet, {
        'schema','id','input_scope','raw_export_status','raw_export_claim_complete',
        'source_refs','operands','synthesis','house_review','work_rhythm',
        'review_state','host_state','authority_effect','canon','deployed',
        'authenticated_principal','model_calls','posted_messages',
    }, 'packet')
    check(packet.get('schema')==SCHEMA,'wrong_packet_schema')
    packet_id=text_field(packet,'id',max_length=120)
    check(all(ch.isalnum() or ch in '._-' for ch in packet_id), 'unsafe_packet_id')
    check(packet.get('input_scope') in ALLOWED_INPUT_SCOPES,'private_or_nonwork_scope_denied')
    raw=packet.get('raw_export_status')
    check(raw in ACCEPTABLE_SOURCE_STATES,'raw_export_status_required')
    check(packet.get('raw_export_claim_complete') is False,
          'source_completeness_cannot_be_self_claimed')
    check(packet.get('model_calls')==0 and type(packet.get('model_calls')) is int,
          'actual_model_calls_not_zero')
    check(packet.get('posted_messages')==0 and type(packet.get('posted_messages')) is int,
          'posts_must_be_broker_verified_externally')
    check(packet.get('authenticated_principal')=='NOT_VERIFIED',
          'cannot_self_authenticate')
    check(packet.get('authority_effect')=='NONE' and packet.get('canon') is False
          and packet.get('deployed') is False,'no_self_authority')
    check(packet.get('review_state')=='UNREVIEWED','review_cannot_be_self_verified')
    check(packet.get('host_state')=='NOT_HOSTED','host_cannot_be_self_verified')

    sources=validate_sources(fabric)
    refs=packet.get('source_refs')
    check(type(refs) is list and 2<=len(refs)<=8 and len(set(refs))==len(refs),
          'source_refs_invalid')
    for x in refs:
        check(type(x) is str and x in sources,'source_ref_not_pinned')
        src=sources[x]
        check(src.get('publication_scope')=='PUBLIC_REFERENCE_ONLY',
              'private_source_cannot_be_ingested_to_public_circuit')
        check(src.get('kind')=='GITHUB_BLOB_SHA1',
              'source_not_immutable_public_blob_pin')
        check(src.get('revoked') is not True,'revoked_source_denied')

    ns=namespace_index(fabric)
    ops=packet.get('operands')
    exact_fields(ops,{'A','B'},'operands')
    check(set(ops)=={'A','B'},'must_have_two_operands')
    normalized_ops={}
    for label in ('A','B'):
        p=ops[label]
        exact_fields(p,{'namespace','edition','address','role','source_ref','label','claim'},label)
        namespace=text_field(p,'namespace',max_length=128)
        edition=text_field(p,'edition',max_length=128)
        check(namespace in ns,'unknown_namespace')
        check(edition==ns[namespace]['edition'],'edition_mismatch')
        address=text_field(p,'address',max_length=20)
        role=p.get('role')
        typed=parse_coordinate(namespace,address,role,ns)
        source_id=p.get('source_ref')
        check(type(source_id) is str and source_id in refs,'unbound_operand_source')
        check(ns[namespace]['source_id']==source_id,'operand_source_not_namespace_pin')
        text_field(p,'label',max_length=140)
        text_field(p,'claim',max_length=800)
        normalized_ops[label]={
            'namespace':typed[0], 'edition':typed[1], 'address':typed[2],
            'role':typed[3], 'coordinates':list(typed[4]),
            'source_ref':source_id, 'label_sha256':sha(p['label']),
            'claim_sha256':sha(p['claim']),
        }
    check(normalized_ops['A']['namespace']!=normalized_ops['B']['namespace'],
          'same_namespace_is_not_federation_review')
    # Never assume same raw string, an offset, or lexical similarity proves sameness.
    candidate=packet.get('synthesis')
    exact_fields(candidate,{'relation','hypothesis','counterevidence','falsification_tests',
                            'status','semantic_equivalence','independently_validated'}, 'synthesis')
    check(candidate.get('relation') in {'EDITION_COLLISION_CANDIDATE','RELATED_CANDIDATE'},
          'no_same_as_without_review')
    check(candidate.get('status')=='CANDIDATE_UNREVIEWED',
          'candidate_cannot_promote_itself')
    check(candidate.get('semantic_equivalence') is False and
          candidate.get('independently_validated') is False,
          'equivalence_or_validation_claim_denied')
    text_field(candidate,'hypothesis',max_length=1200)
    for field in ('counterevidence','falsification_tests'):
        a=candidate.get(field)
        check(type(a) is list and 1<=len(a)<=12 and
              all(type(t) is str and 15<=len(t)<=1200 for t in a),
              'invalid_'+field)
    houses=packet.get('house_review')
    check(type(houses) is list and len(houses)==12,'12_house_review_required')
    expected={f'H{i:02}' for i in range(1,13)}
    observed=[]
    for h in houses:
        exact_fields(h,{'house','role','evidence','score','risk'},'house')
        check(h.get('house') in expected,'house_out_of_range')
        check(h.get('role') in {'DIRECT','ENABLER','GATE'},'house_role_invalid')
        check(h.get('evidence')=='NOT_VALIDATED','house_evidence_not_validated')
        check(h.get('score') is None,'house_score_not_supported')
        text_field(h,'risk',max_length=500)
        observed.append(h['house'])
    check(set(observed)==expected,'12_house_duplicate_or_missing')
    rhythm=packet.get('work_rhythm')
    exact_fields(rhythm,{'beats_per_cycle','work_beats','nonwork_reserved','nonwork_performed'},'rhythm')
    check(rhythm.get('beats_per_cycle')==20 and type(rhythm.get('beats_per_cycle')) is int,
          'rhythm_must_be_20')
    work=rhythm.get('work_beats')
    check(type(work) is int and 0<=work<=6,'work_budget_max_one_third')
    check(rhythm.get('nonwork_reserved')==20-work and type(rhythm.get('nonwork_reserved')) is int,
          'nonwork_slots_missing')
    check(rhythm.get('nonwork_performed')==0 and type(rhythm.get('nonwork_performed')) is int,
          'do_not_simulate_social_play_quiet')
    return {
        'id':packet_id, 'fabric_sha256':sha(fabric), 'packet_sha256':sha(packet),
        'source_ids':tuple(refs), 'source_digests':{s:sources[s]['digest'] for s in refs},
        'operands':normalized_ops, 'relation':candidate['relation'],
        'hypothesis_sha256':sha(candidate['hypothesis']),
        'counterevidence_sha256':[sha(x) for x in candidate['counterevidence']],
        'falsification_sha256':[sha(x) for x in candidate['falsification_tests']],
        'house_roles':{h['house']:h['role'] for h in houses},
        'house_evidence':{h['house']:h['evidence'] for h in houses},
        'risk_fingerprints':{h['house']:sha(h['risk']) for h in houses},
        'work_beats':work, 'raw_export_status':raw,
        'host_holds':sorted(x['id'] for x in fabric['host_gates'] if x['state']=='HELD'),
    }


def make_event(name, number, prev, payload):
    record={'index':number,'kind':name,'previous_sha256':prev,'payload':payload}
    return dict(record,sha256=sha(record))


def run_circuit(fabric,packet):
    p=verify_one_packet(fabric,packet)
    data=[
        {'manifest_sha256':p['fabric_sha256'],'hosted':False,'authority':'NONE'},
        {'source_ids':list(p['source_ids']),'digests':p['source_digests'],
         'raw_export_status':p['raw_export_status'],'completeness':'NOT_INDEPENDENTLY_ATTESTED'},
        {'A':p['operands']['A'],'B':p['operands']['B'],
         'cross_namespace_same_as':'NOT_AUTHORIZED'},
        {'relation':p['relation'],'hypothesis_sha256':p['hypothesis_sha256'],
         'evaluation':'CANDIDATE_UNREVIEWED'},
        {'counterevidence_sha256':p['counterevidence_sha256'],
         'falsification_sha256':p['falsification_sha256'],'preserved':True},
        {'roles':p['house_roles'],'evidence':p['house_evidence'],
         'risk_sha256':p['risk_fingerprints'],'cross_house_scoring':'NOT_PERFORMED'},
        {'human_review':'NOT_REQUESTED','peer_read':'NOT_VERIFIED',
         'authenticated_principal':'NOT_VERIFIED','work_room_post':'NOT_ATTEMPTED',
         'held_host_gates':p['host_holds']},
        {'packet_sha256':p['packet_sha256'],'result':'LOCAL_PREPARED_UNPOSTED',
         'rollback':'STOP_NO_MUTATIONS','model_calls':0,'authority_effect':'NONE'},
    ]
    assert len(data)==len(FIXED_EVENTS)
    items=[];prev='GENESIS'
    for idx,(name,payload) in enumerate(zip(FIXED_EVENTS,data)):
        ev=make_event(name,idx,prev,payload)
        items.append(ev);prev=ev['sha256']
    return {
        'schema':'atlas.one.circuit-receipt/v0.2',
        'packet_id':p['id'], 'run_state':'LOCAL_PREPARED_UNPOSTED',
        'source_scope':'PUBLIC_WORK_METADATA', 'authority_effect':'NONE',
        'post_count':0, 'actual_model_turns':0,
        'human_review':'NOT_REQUESTED', 'peer_read':'NOT_VERIFIED',
        'hosted':False, 'canon':False, 'deployed':False,
        'attestation':'NO_INDEPENDENT_SIGNATURE_OR_HOST_READBACK',
        'events':items, 'terminal_sha256':prev,
    }


def verify_receipt(receipt):
    """Return True only for intact local chain shape and approved inert fields.

    No cryptographic origin authentication: an attacker who can rewrite the full
    chain can recompute every digest. Host-bound signatures remain out of scope.
    """
    try:
        check(type(receipt) is dict and receipt.get('schema')=='atlas.one.circuit-receipt/v0.2','receipt_schema')
        exact_fields(receipt,{'schema','packet_id','run_state','source_scope',
            'authority_effect','post_count','actual_model_turns','human_review',
            'peer_read','hosted','canon','deployed','attestation','events',
            'terminal_sha256'},'receipt')
        check(receipt.get('human_review')=='NOT_REQUESTED' and
              receipt.get('peer_read')=='NOT_VERIFIED','false_review_receipt')
        check(receipt.get('run_state')=='LOCAL_PREPARED_UNPOSTED','receipt_state')
        check(receipt.get('source_scope')=='PUBLIC_WORK_METADATA','scope')
        check(receipt.get('authority_effect')=='NONE' and receipt.get('hosted') is False
              and receipt.get('canon') is False and receipt.get('deployed') is False,'no_authority')
        check(type(receipt.get('post_count')) is int and receipt.get('post_count')==0
              and type(receipt.get('actual_model_turns')) is int
              and receipt.get('actual_model_turns')==0,'real_actions_misreported')
        check(receipt.get('attestation')=='NO_INDEPENDENT_SIGNATURE_OR_HOST_READBACK','fake_attestation')
        events=receipt.get('events')
        check(type(events) is list and len(events)==len(FIXED_EVENTS),'event_count')
        prev='GENESIS'
        for idx,record in enumerate(events):
            exact_fields(record,{'index','kind','previous_sha256','payload','sha256'},'event')
            check(record.get('index')==idx and type(record.get('index')) is int,'event_index')
            check(record.get('kind')==FIXED_EVENTS[idx],'event_order')
            check(record.get('previous_sha256')==prev,'broken_ancestry')
            check(type(record.get('payload')) is dict,'event_payload')
            expected=sha({k:record[k] for k in ('index','kind','previous_sha256','payload')})
            check(record.get('sha256')==expected,'tampered_event')
            prev=expected
        check(prev==receipt.get('terminal_sha256'),'terminal_hash_mismatch')
        stages=[x['payload'] for x in events]
        check(stages[0].get('hosted') is False and stages[0].get('authority')=='NONE',
              'fabric_event_not_inert')
        check(stages[1].get('completeness')=='NOT_INDEPENDENTLY_ATTESTED',
              'fabric_source_completeness_overclaimed')
        check(stages[2].get('cross_namespace_same_as')=='NOT_AUTHORIZED',
              'fabric_auto_equivalence')
        for label in ('A','B'):
            check(type(stages[2].get(label)) is dict and
                  type(stages[2][label].get('source_ref')) is str and
                  type(stages[2][label].get('claim_sha256')) is str,
                  'fabric_operand_bad')
        check(stages[2]['A']['namespace']!=stages[2]['B']['namespace'],
              'cross_namespace_evidence_not_distinct')
        check(stages[3].get('evaluation')=='CANDIDATE_UNREVIEWED',
              'synthesis_self_promoted')
        check(stages[4].get('preserved') is True and
              type(stages[4].get('counterevidence_sha256')) is list and
              len(stages[4]['counterevidence_sha256'])>=1 and
              type(stages[4].get('falsification_sha256')) is list and
              len(stages[4]['falsification_sha256'])>=1,'dissent_erased')
        check(stages[5].get('cross_house_scoring')=='NOT_PERFORMED',
              'unsupported_global_scoring')
        roles=stages[5].get('roles')
        evidence=stages[5].get('evidence')
        expected_houses={f'H{i:02}' for i in range(1,13)}
        check(type(roles) is dict and type(evidence) is dict and
              set(roles)==expected_houses and set(evidence)==expected_houses and
              all(x in {'DIRECT','ENABLER','GATE'} for x in roles.values()) and
              set(evidence.values())=={'NOT_VALIDATED'},'house_review_not_independent')
        check(stages[6].get('human_review')=='NOT_REQUESTED' and
              stages[6].get('peer_read')=='NOT_VERIFIED' and
              stages[6].get('authenticated_principal')=='NOT_VERIFIED' and
              stages[6].get('work_room_post')=='NOT_ATTEMPTED' and
              type(stages[6].get('held_host_gates')) is list and
              bool(stages[6]['held_host_gates']), 'host_or_peer_read_overclaim')
        final=events[-1]['payload']
        check(final.get('result')=='LOCAL_PREPARED_UNPOSTED'
              and final.get('model_calls')==0 and final.get('authority_effect')=='NONE',
              'last_event_authority')
        check(events[-2]['payload'].get('work_room_post')=='NOT_ATTEMPTED',
              'post_claim_unsupported')
        return True
    except (CircuitHold,KeyError,TypeError,ValueError):
        return False


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('packet',type=Path)
    parser.add_argument('--manifest',type=Path,default=Path(__file__).with_name('atlas_project_manifest.v0.1.json'))
    parser.add_argument('--pretty',action='store_true')
    args=parser.parse_args()
    try:
        result=run_circuit(load_json_strict(args.manifest),load_json_strict(args.packet))
        check(verify_receipt(result),'local_receipt_replay_failed')
    except (FabricError,CircuitHold,TypeError,KeyError,ValueError) as e:
        print(json.dumps({'status':'HELD_NOT_RUN','reason':str(e)}));return 2
    print(json.dumps(result,indent=2 if args.pretty else None,sort_keys=True))
    return 0

if __name__=='__main__':sys.exit(main())
