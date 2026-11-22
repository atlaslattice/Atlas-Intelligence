"""373-item open GitHub docket: exact URLs, no automatic merge, no task inflation."""
from __future__ import annotations
import json,re
from collections import Counter,defaultdict

class GitHubDocketHold(ValueError):pass
_URL=re.compile(r'https://github\.com/(atlaslattice/[A-Za-z0-9_.-]+)/(pull|issues)/([1-9]\d*)\Z')


def load_docket(payload:dict)->list[dict]:
    if type(payload) is not dict or payload.get('schema')!='atlas.one.github-global-work-docket.v0.1':
        raise GitHubDocketHold('schema_unknown')
    if payload.get('github_incomplete_results') is not False:
        raise GitHubDocketHold('source_incomplete')
    records=payload.get('records')
    if type(records) is not list:
        raise GitHubDocketHold('records_missing')
    totals=payload.get('github_total_counts')
    if type(totals) is not dict or set(totals)!={'pr','issue'} or any(type(x) is not int or x<0 for x in totals.values()):
        raise GitHubDocketHold('counts_untrusted')
    lens=payload.get('source_page_lengths')
    if lens is not None:
        if type(lens) is not dict or set(lens)!={'pr','issue'}:
            raise GitHubDocketHold('source_page_lengths_invalid')
        for kind in ('pr','issue'):
            pages=lens[kind]
            if type(pages) is not list or not pages or any(type(k) is not int or k<0 or k>100 for k in pages) or sum(pages)!=totals[kind]:
                raise GitHubDocketHold('source_page_count_mismatch')
    seen=set();counts=Counter();out=[]
    for r in records:
        if type(r) is not dict:
            raise GitHubDocketHold('record_not_object')
        kind,url,repo,n=r.get('kind'),r.get('url'),r.get('repository'),r.get('number')
        if type(url) is not str or type(repo) is not str or type(n) is not int or kind not in ('PR','ISSUE'):
            raise GitHubDocketHold('record_shape')
        m=_URL.fullmatch(url)
        if m is None or repo!=m.group(1) or n!=int(m.group(3)) or (kind=='PR')!=(m.group(2)=='pull'):
            raise GitHubDocketHold('url_identity_conflict')
        if url in seen or r.get('state')!='open':
            raise GitHubDocketHold('duplicate_or_closed')
        if type(r.get('title')) is not str or not r['title'] or len(r['title'])>350 or type(r.get('theme','unclassified')) is not str:
            raise GitHubDocketHold('title_untrusted')
        seen.add(url);counts[kind]+=1
        out.append({'kind':kind,'url':url,'repository':repo,'number':n,'title':r['title'],
                    'theme':r.get('theme','unclassified'),'source_state':'PUBLIC_SEARCH_OPEN_AT_CUT',
                    'live_state':'NOT_RECHECKED','automatic_merge_allowed':False,
                    'automatic_issue_close_allowed':False})
    if counts['PR']!=totals['pr'] or counts['ISSUE']!=totals['issue']:
        raise GitHubDocketHold('total_count_mismatch')
    return out


def classify_backlog(records:list[dict])->dict:
    if type(records) is not list:
        raise GitHubDocketHold('not_a_list')
    counts=Counter(r['kind'] for r in records)
    groups=defaultdict(lambda:Counter())
    for r in records:
        groups[r['repository']][r['kind']]+=1
    return {'observed_open_prs':counts['PR'],'observed_open_issues':counts['ISSUE'],
            'observed_total':len(records),'repos':dict(sorted((k,dict(v)) for k,v in groups.items())),
            'release_claim':'NONTRANSACTIONAL_SNAPSHOT_ONLY','completions_from_inventory':0}


def dependency_order(edges:list[tuple[str,str]])->list[str]:
    """Return source-defined prerequisite order; never infer from title similarity.

    Pairs (prerequisite URL, dependent URL). Cycles HOLD instead of merging.
    """
    adj=defaultdict(set);pred=Counter();all_nodes=set()
    for a,b in edges:
        if not(type(a) is str and type(b) is str and _URL.fullmatch(a) and _URL.fullmatch(b)):
            raise GitHubDocketHold('dependency_url_invalid')
        all_nodes.update((a,b))
        if b not in adj[a]:adj[a].add(b);pred[b]+=1
    ready=sorted(x for x in all_nodes if pred[x]==0);output=[]
    while ready:
        x=ready.pop(0);output.append(x)
        for y in sorted(adj[x]):
            pred[y]-=1
            if pred[y]==0:ready.append(y);ready.sort()
    if len(output)!=len(all_nodes):raise GitHubDocketHold('dependency_cycle')
    return output
