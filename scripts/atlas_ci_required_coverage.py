"""Offline, strict CI coverage and log-receipt consistency check.
Caller must independently authenticate and authorize all three input pins.
Digest agreement proves consistency, never authentication or release authority.
No network, filesystem reads, credentials, or raw log ingestion in evaluator.
"""
from __future__ import annotations
import hashlib
import json
from scripts.atlas_ci_admission import REPOS, full_sha, positive_id, evaluate_job


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'),
                                    ensure_ascii=True, allow_nan=False).encode('ascii')).hexdigest()


def sha256(value):
    return type(value) is str and len(value) == 64 and all(c in '0123456789abcdef' for c in value)


def require(condition, reason):
    if not condition:
        raise ValueError(reason)


def unique(items, key):
    require(type(items) is list and 0 < len(items) <= 1000, 'EMPTY_OR_OVERSIZED_LIST')
    result = {}
    for item in items:
        require(type(item) is dict, 'MALFORMED_RECORD')
        identity = key(item)
        require(identity not in result, 'DUPLICATE_IDENTITY')
        result[identity] = item
    return result


def workflow_path(value):
    return (type(value) is str and value.startswith('.github/workflows/')
            and len(value.split('/')) == 3 and value.endswith(('.yml', '.yaml'))
            and '\\' not in value and '\x00' not in value)


def label(value):
    return type(value) is str and 0 < len(value) <= 256 and bool(value.strip())


def _verify(manifest, observation, receipts, pins):
    require(type(pins) is dict and set(pins) == {'manifest','observation','receipts'}, 'MISSING_EXTERNAL_PINS')
    for key, obj in (('manifest',manifest),('observation',observation),('receipts',receipts)):
        require(sha256(pins[key]) and digest(obj) == pins[key], 'PIN_MISMATCH_'+key.upper())
    require(manifest['schema']=='atlas.ci.required/v1' and observation['schema']=='atlas.ci.observation/v1'
            and receipts['schema']=='atlas.ci.log-receipts/v1', 'SCHEMA_MISMATCH')
    repo, pr, head = (manifest[k] for k in ('repository','pr_number','head_sha'))
    require(repo in REPOS and positive_id(pr) and full_sha(head), 'INVALID_TARGET')
    require(observation['repository']==repo and type(observation['pr_number']) is int
            and observation['pr_number']==pr and observation['current_pr_head_sha']==head
            and observation['base_sha']==manifest['base_sha'] and full_sha(manifest['base_sha']), 'STALE_TARGET')
    required = unique(manifest['workflows'], lambda w:w['path'])
    observed = unique(observation['runs'], lambda w:w['path'])
    require(set(required)==set(observed), 'WORKFLOW_COVERAGE_MISMATCH')
    log_index = unique(receipts['records'], lambda r:(r['run_id'],r['attempt'],r['job_id']))
    used, run_ids, job_ids = set(), set(), set()
    for path, spec in required.items():
        run = observed[path]
        require(workflow_path(path) and full_sha(spec['workflow_blob_sha']) and
                run['workflow_blob_sha']==spec['workflow_blob_sha'], 'WORKFLOW_SOURCE_MISMATCH')
        rid, attempt = run['run_id'],run['attempt']
        require(positive_id(rid) and positive_id(attempt) and rid not in run_ids, 'RUN_IDENTITY_INVALID')
        run_ids.add(rid)
        require(run['head_sha']==head and run['status']=='completed' and run['conclusion']=='success', 'RUN_NOT_CURRENT_SUCCESS')
        required_jobs=unique(spec['jobs'],lambda j:j['name'])
        jobs=unique(run['jobs'],lambda j:j['name'])
        require(set(required_jobs)==set(jobs), 'JOB_COVERAGE_MISMATCH')
        for name, job_spec in required_jobs.items():
            job=jobs[name]; jid=job['id']
            require(label(name) and positive_id(jid) and jid not in job_ids, 'JOB_IDENTITY_INVALID')
            job_ids.add(jid)
            require(type(job['run_id']) is int and job['run_id']==rid and type(job['attempt']) is int
                    and job['attempt']==attempt and job['head_sha']==head, 'JOB_SOURCE_OR_ATTEMPT_MISMATCH')
            # Never trust the job's own logs_verified boolean; receipts are a separate input.
            require(evaluate_job(dict(job,logs_verified=True))=='HOSTED_EXECUTION_ACCEPTED', 'JOB_NOT_EXECUTED_SUCCESS')
            steps=unique(job['steps'],lambda s:s['name'])
            expected=job_spec['required_steps']
            require(type(expected) is list and 0<len(expected)<=1000 and all(label(x) for x in expected)
                    and len(set(expected))==len(expected), 'INVALID_REQUIRED_STEPS')
            require(set(expected)<=set(steps), 'REQUIRED_STEP_MISSING')
            numbers=set()
            for step in steps.values():
                require(label(step['name']) and positive_id(step['number']) and step['number'] not in numbers
                        and step['status']=='completed' and step['conclusion']=='success', 'STEP_NOT_EXECUTED_SUCCESS')
                numbers.add(step['number'])
            key=(rid,attempt,jid); receipt=log_index.get(key)
            require(receipt is not None, 'MISSING_LOG_RECEIPT')
            require(all(positive_id(receipt[k]) for k in ('run_id','attempt','job_id')) and
                    receipt['repository']==repo and type(receipt['pr_number']) is int and receipt['pr_number']==pr
                    and receipt['head_sha']==head and receipt['workflow_path']==path
                    and receipt['workflow_blob_sha']==spec['workflow_blob_sha'] and receipt['job_name']==name
                    and receipt['job_digest']==digest(job) and sha256(receipt['log_sha256'])
                    and positive_id(receipt['log_bytes']) and receipt['verification']=='INDEPENDENT_LOG_REVIEW', 'LOG_RECEIPT_BINDING_MISMATCH')
            used.add(key)
    require(used==set(log_index), 'UNEXPECTED_LOG_RECEIPT')
    return len(run_ids),len(job_ids)


def assess(manifest, observation, receipts, *, external_pins):
    """Return a bounded consistency result; no claim that caller pins are authenticated."""
    try:
        runs,jobs=_verify(manifest,observation,receipts,external_pins)
    except (ValueError,TypeError,KeyError,AttributeError,OverflowError,RecursionError) as error:
        return {'status':'HELD','reason':str(error) if type(error) is ValueError and str(error).isupper() else 'MALFORMED_EVIDENCE',
                'host_attested':False,'release_authority':False}
    return {'status':'PINNED_COVERAGE_CONSISTENT','runs':runs,'jobs':jobs,
            'host_attested':False,'release_authority':False,
            'limit':'External authentication, independent required-check selection and log review remain caller responsibilities.'}
