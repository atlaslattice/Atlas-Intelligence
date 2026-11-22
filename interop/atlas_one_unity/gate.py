"""Fail-closed source-to-host boundary; no real identity or authority callbacks."""
from __future__ import annotations

class GateHold(ValueError):pass


def gate_ci(run:dict)->dict:
    if type(run) is not dict:
        raise GateHold('run_not_object')
    if run.get('conclusion')=='failure' and run.get('steps')==[]:
        return {'status':'HELD_RUNNER_ADMISSION_OR_STARTUP_UNKNOWN','independent_test_pass':False,
                'root_cause':'UNKNOWN','runner_steps_observed':0,'owner_diagnostic_required':True}
    if run.get('conclusion')=='success' and type(run.get('steps')) is list and any(
       type(s) is dict and s.get('conclusion')=='success' for s in run['steps']):
        return {'status':'RUNNER_STEPS_OBSERVED_NOT_RELEASE_APPROVAL','independent_test_pass':False,
                'owner_diagnostic_required':False,'runner_steps_observed':len(run['steps'])}
    return {'status':'HELD_INCOMPLETE_RUN_EVIDENCE','independent_test_pass':False,
            'root_cause':'UNKNOWN','owner_diagnostic_required':True}


def gate_host(host:dict)->dict:
    if type(host) is not dict:raise GateHold('host_not_object')
    # Even an apparently true caller claim is not trusted signer attestation.
    return {'status':'HELD_HOST_ATTESTATION_NOT_VERIFIED','can_publish':False,
            'can_consume_private_modes':False,'can_post_work':False,'can_apply_canon':False,
            'source_revision':host.get('revision','UNPINNED') if type(host.get('revision')) is str else 'UNPINNED',
            'caller_claims_not_authority':True}


def gate_return(grant:dict,latest:dict|None)->dict:
    if type(grant) is not dict:raise GateHold('grant_not_object')
    if latest is None or type(latest) is not dict:
        return {'status':'HELD_FRESH_RETURN_RIGHTS_MISSING','allowed':False}
    if grant.get('issuer')!=latest.get('issuer') or type(grant.get('epoch')) is not int or type(latest.get('epoch')) is not int:
        return {'status':'HELD_GRANT_ISSUER_OR_EPOCH','allowed':False}
    if latest['epoch']>grant['epoch'] or latest.get('revoked') is True:
        return {'status':'HELD_REVOKED_OR_SUPERSEDED','allowed':False}
    return {'status':'HELD_TRUSTED_SIGNATURE_AND_ACCOUNT_PROOF_MISSING','allowed':False}


def gate_science(cases:list[dict])->dict:
    if type(cases) is not list:raise GateHold('cases_not_list')
    statuses=[]
    for x in cases:
        if type(x) is not dict or type(x.get('evidence_state')) is not str or x.get('evidence_state') not in {'OBSERVED','PUBLISHED','DERIVED','ASSUMED','SPECULATIVE'}:
            raise GateHold('evidence_status_invalid')
        if x.get('rights_harm') is True or x.get('physical_conservation_verified') is not True:
            statuses.append('HELD_HARD_CONSTRAINT')
        elif x['evidence_state'] in {'ASSUMED','SPECULATIVE','DERIVED'}:
            statuses.append('HELD_INDEPENDENT_VALIDATION')
        else:
            statuses.append('CANDIDATE_FOR_REVIEW_NOT_APPROVED')
    return {'cases':len(cases),'verdicts':statuses,'deployment':False,
            'canon':False,'nonoffsettable_rights_and_conservation':True}
