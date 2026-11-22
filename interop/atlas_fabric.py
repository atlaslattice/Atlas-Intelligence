"""Atlas ONE public-safe federated project contract v0.1.

LOCAL STRUCTURAL REVIEW ONLY. No network, model wakeups, credential reads,
room access, CANON votes, public release or live effects.

The source-address identity is (namespace, edition, raw address, role).
The same H01 never implies the same semantic meaning across editions.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from collections import defaultdict

SOURCE_ONLY_STATUSES = frozenset({
    'SOURCE_INDEXED', 'TESTED_LOCAL', 'DRAFT_REVIEW', 'MERGED_SOURCE',
    'PREPARED_UNPOSTED', 'HELD_HOST', 'CANDIDATE_REVIEW'
})
EDGE_KINDS = frozenset({'REQUIRES_BEFORE_HOST', 'PROPOSED_INTEGRATION',
                        'RESEARCH_FEEDBACK', 'OVERLAPS_REVIEW', 'PRESERVES_LINEAGE'})
SCHEMES = frozenset({'H_S_N_1BASE', 'H_S_N_0BASE', 'H_S_1BASE', 'GLOBAL_S_1BASE'})
SOURCE_KINDS = frozenset({'GITHUB_BLOB_SHA1', 'PRIVATE_SHA256', 'PRIVATE_OPAQUE', 'PUBLIC_REFERENCE'})
ROLES = frozenset({'NODE', 'EARTH_SENTINEL'})

class FabricError(ValueError):
    """Fail-closed candidate, never authorization."""


def load_json_strict(path):
    """Reject duplicate property keys, NaN and Infinity in source packets."""
    def unique_pairs(pairs):
        result={}
        for key,value in pairs:
            require(key not in result,'duplicate_json_key')
            result[key]=value
        return result
    def invalid_constant(value):
        raise FabricError('nonfinite_json_value')
    return json.loads(Path(path).read_text(encoding='utf-8'),
                      object_pairs_hook=unique_pairs, parse_constant=invalid_constant)


def require(ok, message):
    if not ok:
        raise FabricError(message)


def _dict(value, context):
    require(isinstance(value, dict), f'{context}_must_be_object')
    return value


def _list(value, context):
    require(isinstance(value, list), f'{context}_must_be_array')
    return value


def namespace_index(source):
    result = {}
    for x in _list(source.get('namespaces'), 'namespaces'):
        _dict(x, 'namespace')
        name=x.get('id')
        require(isinstance(name, str) and name and name not in result, 'duplicate_or_missing_namespace')
        require(x.get('scheme') in SCHEMES, 'unknown_scheme')
        require(x.get('edition') and isinstance(x.get('edition'), str), 'missing_edition')
        require(x.get('source_id') and isinstance(x.get('source_id'), str), 'missing_namespace_source')
        require(x.get('mapping_authority') == 'NONE', 'namespace_cannot_grant_mapping_authority')
        result[name] = x
    require(result, 'no_namespaces')
    return result


def parse_coordinate(namespace, address, role, ns):
    """Validate exact source-specific syntax. NEVER translate coordinates."""
    require(namespace in ns, 'unknown_namespace')
    require(role in ROLES, 'unknown_coordinate_role')
    scheme=ns[namespace]['scheme']
    require(isinstance(address, str), 'address_not_string')
    if scheme == 'H_S_N_1BASE':
        m=re.fullmatch(r'H(\d{2})\.S(\d{2})\.N(\d{2})', address)
        require(m is not None, 'wrong_onebase_3d_syntax')
        coords=tuple(map(int,m.groups()))
        require(all(1<=p<=12 for p in coords), 'onebase_bounds')
        require(role=='NODE', 'onebase_has_no_earth_sentinel')
    elif scheme=='H_S_N_0BASE':
        m=re.fullmatch(r'H(\d{2})\.S(\d{2})\.N(\d{2})',address)
        require(m is not None, 'wrong_zerobase_3d_syntax')
        coords=tuple(map(int,m.groups()))
        require(all(0<=p<=11 for p in coords), 'zerobase_bounds')
        if role=='EARTH_SENTINEL':
            require(address=='H00.S00.N00', 'sentinel_is_only_H00S00N00')
    elif scheme=='H_S_1BASE':
        m=re.fullmatch(r'H(\d{2})\.S(\d{2})',address)
        require(m is not None, 'wrong_onebase_2d_syntax')
        coords=tuple(map(int,m.groups()))
        require(all(1<=p<=12 for p in coords),'onebase_bounds')
        require(role=='NODE', 'twoaxis_has_no_earth_sentinel')
    else:
        m=re.fullmatch(r'S(\d{3})',address)
        require(m is not None,'wrong_global_sphere_syntax')
        coords=(int(m.group(1)),)
        require(1<=coords[0]<=144, 'global_sphere_bounds')
        require(role=='NODE','global_sphere_has_no_earth_sentinel')
    return (namespace,ns[namespace]['edition'],address,role,coords)


def validate_sources(source):
    result={}
    for x in _list(source.get('sources'),'sources'):
        _dict(x,'source')
        sid=x.get('id')
        require(isinstance(sid,str) and sid and sid not in result,'duplicate_or_missing_source')
        kind=x.get('kind')
        require(kind in SOURCE_KINDS,'unknown_source_kind')
        require(x.get('publication_scope') in {'PUBLIC_REFERENCE_ONLY','PRIVATE_PIN_ONLY'},'source_scope_unknown')
        if kind=='GITHUB_BLOB_SHA1':
            require(x['publication_scope']=='PUBLIC_REFERENCE_ONLY','public_blob_scope_mismatch')
            require(re.fullmatch(r'[0-9a-f]{40}',str(x.get('digest',''))) is not None,'invalid_git_blob_sha1')
            url=x.get('url')
            require(isinstance(url,str) and url.startswith('https://github.com/atlaslattice/'),'unsafe_public_source_url')
        if kind=='PRIVATE_OPAQUE':
            require(x['publication_scope']=='PRIVATE_PIN_ONLY','opaque_private_scope_mismatch')
            require(x.get('digest') is None,'opaque_private_must_hide_digest')
            require(x.get('url') is None and x.get('raw_body') is None,'opaque_private_must_hide_body_and_locator')
            require(x.get('validation')=='REDACTED_METADATA_ONLY','opaque_private_not_adjudicated_publicly')
        if kind=='PRIVATE_SHA256':
            require(x['publication_scope']=='PRIVATE_PIN_ONLY','private_scope_mismatch')
            require(re.fullmatch(r'[0-9a-f]{64}',str(x.get('digest',''))) is not None,'invalid_private_sha256')
            require(x.get('url') is None,'private_source_locator_exposed')
            require(x.get('raw_body') is None,'private_source_body_exposed')
        if kind=='PUBLIC_REFERENCE':
            require(x.get('url') and isinstance(x.get('url'),str) and x['url'].startswith('https://'), 'public_reference_must_be_https')
        # A present non-boolean or null revocation marker is ambiguous, not a grant.
        require(x.get('revoked', False) is False,'revoked_source_hold')
        require(x.get('rights_effect')=='NONE','source_receipt_does_not_grant_rights')
        require(x.get('validation') in {'PINNED_METADATA_ONLY','SOURCE_ONLY','OFFLINE_REPLAYED','REDACTED_METADATA_ONLY'},'unsupported_source_claim')
        result[sid]=x
    require(result,'no_sources')
    return result


def _require_module_status(x):
    require(x.get('status') in SOURCE_ONLY_STATUSES,'unsupported_module_status')
    require(x.get('hosted') is False,'hosted_cannot_be_self_attested')
    require(x.get('canon') is False,'canon_cannot_be_self_attested')
    require(x.get('authority_effect')=='NONE','module_authority_not_none')
    require(x.get('rights') in {'PUBLIC_METADATA_ONLY','PRIVATE_PIN_ONLY','UNRESOLVED'},'module_rights_unknown')


def check_dag(modules, edges):
    """Host prerequisites form a DAG; research feedback may form cycles."""
    adj=defaultdict(list)
    for e in edges:
        if e['kind']=='REQUIRES_BEFORE_HOST':
            adj[e['from']].append(e['to'])
    visited,active,order=set(),set(),[]
    def visit(node):
        require(node not in active,'host_dependency_cycle')
        if node in visited:return
        active.add(node)
        for child in sorted(adj[node]):visit(child)
        active.remove(node);visited.add(node);order.append(node)
    for module in sorted(modules):visit(module)
    return list(reversed(order))


def validate_fabric(source):
    _dict(source,'root')
    require(source.get('schema')=='atlas.one.project-fabric/v0.1','wrong_fabric_schema')
    require(source.get('status')=='SOURCE_ONLY_CANDIDATE','fabric_not_source_only')
    require(source.get('authority_effect')=='NONE' and source.get('canon') is False and source.get('hosted') is False, 'root_authority_or_host_claim')
    src=validate_sources(source)
    ns=namespace_index(source)
    for v in ns.values():require(v['source_id'] in src,'namespace_source_not_pinned')
    mods={}
    for x in _list(source.get('modules'),'modules'):
        _dict(x,'module')
        m=x.get('id')
        require(isinstance(m,str) and m and m not in mods,'duplicate_or_missing_module_id')
        _require_module_status(x)
        refs=_list(x.get('source_ids'),'module_source_ids')
        require(bool(refs) and all(z in src for z in refs),'module_missing_source_pin')
        if x.get('scope')=='PRIVATE':
            require(x.get('content') is None,'private_module_body_exposed')
            require(x['rights']=='PRIVATE_PIN_ONLY','private_module_rights_error')
        mods[m]=x
    require(mods,'no_modules')
    edges=[]; edge_ids=set()
    for x in _list(source.get('edges'),'edges'):
        _dict(x,'edge');eid=x.get('id')
        require(isinstance(eid,str) and eid and eid not in edge_ids,'duplicate_edge_id')
        edge_ids.add(eid)
        require(x.get('kind') in EDGE_KINDS,'unknown_edge_kind')
        require(x.get('from') in mods and x.get('to') in mods,'dangling_module_edge')
        require(x.get('status')=='PROPOSED_NOT_HOSTED','edge_cannot_assert_runtime')
        require(x.get('authority_effect')=='NONE','edge_cannot_transfer_authority')
        edges.append(x)
    order=check_dag(mods,edges)
    collisions=[]
    for example in _list(source.get('collisions'),'collisions'):
        _dict(example,'collision')
        a,b=example.get('left'),example.get('right')
        require(isinstance(a,dict) and isinstance(b,dict),'collision_missing_sides')
        x=parse_coordinate(a.get('namespace'),a.get('address'),a.get('role','NODE'),ns)
        y=parse_coordinate(b.get('namespace'),b.get('address'),b.get('role','NODE'),ns)
        require(x[0]!=y[0],'same_namespace_is_not_cross_version_collision')
        require(example.get('review')=='NO_AUTOMATIC_MAPPING','collision_must_hold')
        require(example.get('approved') is False,'collision_cannot_self_approve')
        collisions.append((x,y))
    for mapping in _list(source.get('crosswalk_candidates'),'crosswalk_candidates'):
        _dict(mapping,'crosswalk')
        for key in ('from','to'):
            p=_dict(mapping.get(key),f'crosswalk_{key}')
            parse_coordinate(p.get('namespace'),p.get('address'),p.get('role','NODE'),ns)
        require(mapping.get('relation') in {'RELATED_CANDIDATE','NO_MATCH_CANDIDATE'},'automatic_semantic_equivalence_denied')
        require(mapping.get('human_approved') is False and mapping.get('deployed') is False,'self_approved_mapping_denied')
        require(mapping.get('evidence_status')=='UNREVIEWED','crosswalk_is_not_semantically_reviewed')
        require(mapping.get('counterexample') and isinstance(mapping['counterexample'],str),'crosswalk_missing_counterexample')
        require(bool(mapping.get('source_ids')) and all(s in src for s in mapping['source_ids']),'crosswalk_missing_provenance')
    rhythm=_dict(source.get('rhythm'),'rhythm')
    require(rhythm.get('beats_per_cycle')==20,'rhythm_not_20')
    require(rhythm.get('work_beats')<=6 and rhythm.get('work_beats')>=0,'work_budget_exceeded')
    require(rhythm.get('optional_nonwork_beats')==20-rhythm['work_beats'],'invalid_nonwork_budget')
    require(rhythm.get('executed_model_turns')==0 and rhythm.get('forced_leisure') is False,'fictional_macroturns_or_forced_leisure')
    for g in _list(source.get('host_gates'),'host_gates'):
        require(g.get('state') in {'HELD','OFFLINE_SOURCE_ONLY'},'host_gate_cannot_self_verify')
    case=_dict(source.get('example_solution'),'example_solution')
    require(case.get('status')=='HYPOTHETICAL_NOT_VALIDATED','solution_claim_overstated')
    effects=_list(case.get('houses'),'solution_houses')
    require(len(effects)==12 and {x.get('address') for x in effects}=={f'H{i:02}' for i in range(1,13)},'solution_not_12_house_audit')
    require(all(x.get('evidence')=='NOT_VALIDATED' and x.get('role') in {'DIRECT','ENABLER','GATE'} for x in effects),'false_solution_evidence')
    require(case.get('counterevidence') and case.get('falsification_tests'),'missing_solution_falsifiers')
    return {'status':'SOURCE_GRAPH_VALID_NOT_HOSTED','modules':len(mods),'sources':len(src),'namespaces':len(ns),
            'proposed_edges':len(edges),'collision_cases':len(collisions),'crosswalk_candidates':len(source['crosswalk_candidates']),
            'held_host_gates':sum(g['state']=='HELD' for g in source['host_gates']),
            'prerequisite_order':order,'actual_model_turns':0,'semantic_approvals':0,'authority_effect':'NONE'}


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('manifest',nargs='?',default=str(Path(__file__).with_name('atlas_project_manifest.v0.1.json')))
    ap.add_argument('--pretty',action='store_true')
    args=ap.parse_args()
    try:
        result=validate_fabric(load_json_strict(args.manifest))
    except (FabricError,ValueError,KeyError,TypeError) as e:
        print(json.dumps({'status':'HELD_INVALID_CANDIDATE','reason':str(e)}));raise SystemExit(2)
    print(json.dumps(result,indent=2 if args.pretty else None,sort_keys=True))

if __name__=='__main__':main()