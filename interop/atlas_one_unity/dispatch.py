"""Global Atlas ONE work routing as proposals, never autonomous dispatch.

All GitHub open items are included. House mapping stays UNREVIEWED and no
private Work/Play/CANON authority is inferred from a title or repository.
"""
from __future__ import annotations
from collections import Counter,defaultdict
from .docket import load_docket

WORKSTREAMS=(
 'W01_SOURCE_PROVENANCE','W02_IDENTITY_RIGHTS','W03_CI_VERIFICATION',
 'W04_MEMORY_CONTINUITY','W05_ARIADNE_ONTOLOGY','W06_GLYPH_ACOUSTICS',
 'W07_A2A_AGENTS','W08_ORCS_SCIENCE','W09_REGENERATIVE_SUPPLY',
 'W10_CANON_GOVERNANCE','W11_VOLUNTARY_WORLDS','W12_CIVIC_UX',
)
PATTERNS=(
 ('W03_CI_VERIFICATION',('ci','workflow','runner','github actions','test','coverage','build','github-hosted')),
 ('W02_IDENTITY_RIGHTS',('identity','rights','revocation','credential','token','permission','secret','attestation','consent','security','privacy')),
 ('W05_ARIADNE_ONTOLOGY',('ariadne','ontology','sphere','hsn','coordinate','taxonomy','crosswalk')),
 ('W06_GLYPH_ACOUSTICS',('glyph','acoustic','cymatic','phonon','resonance')),
 ('W08_ORCS_SCIENCE',('fusion','plasma','reactor','pb11','p-11b','warpx','openmc','isotope','scientific','physics')),
 ('W09_REGENERATIVE_SUPPLY',('water','supply chain','desal','fertilizer','nutrient','sustainability','agriculture','ecology','energy')),
 ('W11_VOLUNTARY_WORLDS',('iron empire','dream','palace','habitat','imagine','play','quiet','worldbuilding','story')),
 ('W04_MEMORY_CONTINUITY',('memory','rehydrat','fossil','restor','brain','continuity','checkpoint','archive')),
 ('W07_A2A_AGENTS',('a2a','agent','provider','swarmchat','swarm','interop','transport','broker')),
 ('W10_CANON_GOVERNANCE',('canon','constitution','governance','ratif','policy','council','sentinel','audit')),
 ('W01_SOURCE_PROVENANCE',('source','provenance','graph','receipt','evidence','manus','ledger','dataset','research')),
)
# These source-specified chains came from individually inspected ORCS review PRs.
EXPLICIT_PR_DEPENDENCIES=(
 ('atlaslattice/open-regenerative-compute-standard',63,65),
 ('atlaslattice/open-regenerative-compute-standard',65,66),
 ('atlaslattice/open-regenerative-compute-standard',64,67),
 ('atlaslattice/open-regenerative-compute-standard',67,68),
)

def route_workstream(title:str,repo:str)->tuple[str,str]:
    text=(title+' '+repo).lower()
    for stream,needles in PATTERNS:
        if any(n in text for n in needles):
            return stream,'LEXICAL_CANDIDATE_NOT_SEMANTIC_HSN_MAPPING'
    return 'W12_CIVIC_UX','UNCLASSIFIED_LEXICAL_DEFAULT_NOT_SEMANTIC_HSN_MAPPING'


def prepare_global_packets(docket:dict)->dict:
    records=load_docket(docket)
    if type(docket.get('observed_date')) is not str or not docket['observed_date']:
        raise ValueError('observed_date_required')
    urls={x['url'] for x in records}
    packets=[];counts=Counter()
    for x in records:
        workstream,explanation=route_workstream(x['title'],x['repository'])
        risk='P0_RUNNER_OR_TEST' if workstream=='W03_CI_VERIFICATION' else ('P1_PRIVACY_RIGHTS' if workstream=='W02_IDENTITY_RIGHTS' else 'P2_REVIEW')
        record={'id':x['repository']+'/'+x['kind']+'-'+str(x['number']),
                'url':x['url'],'title':x['title'],'repository':x['repository'],
                'kind':x['kind'],'workstream':workstream,'workstream_basis':explanation,
                'priority_heuristic':risk,'source_state':x['source_state'],
                'current_host_state':'NOT_RECHECKED_PER_ITEM','head_sha':'NOT_RECHECKED',
                'source_rights':'NOT_ATTESTED','peer_review':'NOT_ATTESTED',
                'host_ci':'NOT_ATTESTED','human_root_decision':'NOT_REQUESTED',
                'can_merge':False,'can_close':False,'can_deploy':False,
                'is_actual_work_execution':False,'hsn_semantic_mapping':'UNREVIEWED',
                'work_budget_constraint':'AT_MOST_ONE_THIRD_IF_CHOSEN',
                'private_mode_import':False}
        packets.append(record);counts[workstream]+=1
    # Directly observed prerequisite chains are review guidance only.
    deps=[]
    for repo,a,b in EXPLICIT_PR_DEPENDENCIES:
        u=f'https://github.com/{repo}/pull/{a}';v=f'https://github.com/{repo}/pull/{b}'
        if u in urls and v in urls:deps.append({'predecessor':u,'successor':v,'source':'INSPECTED_ORCS_PR_DESCRIPTION','auto_merge':False})
    # Keep every PR/issue individually addressable; never conflate children.
    return {'schema':'atlas.one.global-work-packets/v0.3','source_docket_schema':docket['schema'],
            'observed_date':docket['observed_date'],'total':len(packets),'open_prs':sum(x['kind']=='PR' for x in records),
            'open_issues':sum(x['kind']=='ISSUE' for x in records),
            'workstream_summary':dict(sorted(counts.items())),'workstreams':[{'id':name,'house_mapping':'NOT_PROVEN'} for name in WORKSTREAMS],
            'verified_source_dependency_edges':deps,'tasks_performed':0,
            'tasks_closed':0,'prs_merged':0,'real_macroturns_executed_by_router':0,
            'review_packets':packets,'publishable':False,'authority':'NONE'}
