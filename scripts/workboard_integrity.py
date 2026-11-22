"""Read-only, fail-closed integrity checks for the Atlas GitHub Workboard source cut.

Index verification is NOT independent current-status or issue-closure verification.
No network, GitHub writes, private source ingestion or automatic reconciliations.
"""
from __future__ import annotations
import argparse
from collections import Counter
import datetime as dt
import json
from pathlib import Path
import re
from typing import Any

SCHEMA = 'atlas.git-open-backlog.source-cut/v0.1'
URL = re.compile(r'^https://github\.com/(atlaslattice/[A-Za-z0-9._-]+)/(issues|pull)/([1-9][0-9]*)$')


def _pairs(pairs):
    o={}
    for k,v in pairs:
        if k in o: raise ValueError('DUPLICATE_JSON_KEY:'+k)
        o[k]=v
    return o

def _constant(c):
    raise ValueError('INVALID_NONFINITE_JSON:'+c)

def load(path: str | Path):
    return json.loads(Path(path).read_text(encoding='utf-8'), object_pairs_hook=_pairs,
                      parse_constant=_constant)


def _safe_dict(x):
    return type(x) is dict


def audit(snapshot: dict[str,Any]) -> dict[str,Any]:
    errors=[]; warnings=[]
    if not _safe_dict(snapshot):
        return {'status':'HOLD_INVALID_ROOT','errors':['ROOT_MUST_BE_OBJECT'],'index_only':True,'live_verified':False}
    if snapshot.get('schema')!=SCHEMA: errors.append('SCHEMA_MISMATCH')
    if snapshot.get('visibility')!='PUBLIC_GITHUB_METADATA_ONLY':errors.append('NOT_PUBLIC_METADATA_ONLY')
    if snapshot.get('authorization')!='NONE':errors.append('FORGED_AUTHORIZATION')
    if snapshot.get('coverage')!='SOURCE_SEARCH_SNAPSHOT_NOT_CLOSED_OR_COMPLETED':errors.append('FORGED_COMPLETENESS')
    if snapshot.get('million_horizon')!='NOT_EXECUTED':errors.append('FALSE_MACROTURN_COMPLETION')
    try:dt.date.fromisoformat(snapshot['observed_date'])
    except (ValueError,KeyError,TypeError):errors.append('INVALID_OBSERVATION_DATE')
    rhythm=snapshot.get('rhythm',{})
    if not _safe_dict(rhythm): rhythm={}
    beats=rhythm.get('beats_per_macroturn');work=rhythm.get('work_slots')
    if type(beats) is not int or type(work) is not int or beats<1 or work<0 or work>beats/3:
        errors.append('WORK_SHARE_EXCEEDED_OR_INVALID')
    expected_nonwork=sum(rhythm.get(k,0) if type(rhythm.get(k)) is int else -1000000
                         for k in ('play_slots','social_slots','imagine_slots','dream_slots','quiet_slots'))
    if type(beats) is int and type(work) is int and expected_nonwork!=beats-work:
        errors.append('RHYTHM_SUM_MISMATCH')
    if rhythm.get('forced_private_activity') is not False:
        errors.append('PRIVATE_ACTIVITY_NOT_VOLUNTARY')
    issues=snapshot.get('issues');prs=snapshot.get('prs');agg=snapshot.get('aggregate')
    if type(issues) is not list or type(prs) is not list or not _safe_dict(agg):
        return {'status':'HOLD_INVALID_INDEX','errors':errors+['MISSING_LIST_OR_AGGREGATE'],'index_only':True,'live_verified':False}
    seen=set();counts={}
    for kind,arr,expect in [('issue',issues,'issues'),('pull_request',prs,'pull')]:
        group=Counter()
        for j,item in enumerate(arr):
            if not _safe_dict(item):
                errors.append('INVALID_ROW_TYPE');continue
            u=item.get('url','')
            m=URL.fullmatch(u) if type(u) is str else None
            if not m:
                errors.append('INVALID_OR_FOREIGN_URL');continue
            repo,actual,num=m.groups()
            if actual!=expect or item.get('type')!=kind:errors.append('WRONG_RECORD_KIND')
            if item.get('repository')!=repo: errors.append('REPO_MISMATCH')
            if type(item.get('number')) is not int or item['number']!=int(num): errors.append('NUMBER_MISMATCH')
            if type(item.get('title')) is not str or not item['title'].strip():errors.append('MISSING_TITLE')
            if u in seen:errors.append('DUPLICATE_URL')
            seen.add(u);group[repo]+=1
        counts[kind]=dict(sorted(group.items()))
    if (type(agg.get('open_issues_observed')) is not int or
        type(agg.get('open_prs_observed')) is not int):
        errors.append('AGGREGATE_COUNT_TYPE_INVALID')
    if agg.get('open_issues_observed')!=len(issues) or agg.get('open_prs_observed')!=len(prs):
        errors.append('AGGREGATE_COUNT_MISMATCH')
    for field in ('issue_by_repo','pr_by_repo'):
        d=agg.get(field)
        if type(d) is not dict or any(type(v) is not int or v<0 for v in d.values()):
            errors.append('PER_REPO_COUNT_TYPE_INVALID')
    if agg.get('issue_by_repo')!=counts['issue'] or agg.get('pr_by_repo')!=counts['pull_request']:
        errors.append('PER_REPO_COUNT_MISMATCH')
    sources=snapshot.get('sources')
    if type(sources) is not list or not sources:
        errors.append('NO_SEARCH_SOURCES')
    else:
        for src in sources:
            if not _safe_dict(src) or type(src.get('count')) is not int or src['count']<0 or type(src.get('capped')) is not bool:
                errors.append('INVALID_SOURCE_CUT');break
        if any(_safe_dict(x) and x.get('capped') is True for x in sources):
            warnings.append('CAPPED_SOURCE_PARTIAL_COVERAGE_POSSIBLE')
    return {'status':'INDEX_STRUCTURE_VERIFIED_NOT_LIVE' if not errors else 'HOLD_INVALID_INDEX',
            'errors':sorted(set(errors)),'warnings':warnings,
            'count_issue_urls':len(issues),'count_pr_urls':len(prs),
            'distinct_urls':len(seen),'repositories_with_open_records':len(set(counts['issue'])|set(counts['pull_request'])),
            'index_only':True,'live_verified':False,'work_was_executed':False,
            'any_issue_closed_by_audit':False,'any_pr_merged_by_audit':False,
            'human_root_grant':'NONE'}


def compare_snapshots(previous:dict,new:dict)->dict:
    """Source-set deltas only; missing URL cannot be declared closed."""
    a=audit(previous);b=audit(new)
    if any(x['errors'] for x in (a,b)):
        return {'status':'HOLD_INVALID_SNAPSHOT','source_closures_verified':0}
    old={v['url'] for k in ('issues','prs') for v in previous[k]}
    cur={v['url'] for k in ('issues','prs') for v in new[k]}
    return {'status':'SOURCE_SET_DIFFERENCE_NOT_GITHUB_LIVE_CLOSURE',
            'new_urls':sorted(cur-old),'missing_from_new_cut':sorted(old-cur),
            'source_closures_verified':0,'source_merges_verified':0,
            'requires_current_authenticated_git_state':True}


def main():
    p=argparse.ArgumentParser();p.add_argument('snapshot')
    a=p.parse_args(); print(json.dumps(audit(load(a.snapshot)),indent=2))

if __name__=='__main__':main()