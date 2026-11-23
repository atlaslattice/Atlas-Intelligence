#!/usr/bin/env python3
"""Independent CSV/JSON check of a coverage artifact; optionally compare a saved
current connector observation. Performs no network call and grants no rights.
"""
import argparse
import collections
import csv
import hashlib
import json
import pathlib
import sys

REGISTRY_SHA='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
CROSSWALK_SHA='a306c7306a79754b033e9f8c41c0de5ff5176b4544a6a80b5c740e2f8d2cc903'
SCOPES=('PRIMARY','ALTERNATE','ALL_CANDIDATES')


def sha(data):return hashlib.sha256(data).hexdigest()
def canon(value):return json.dumps(value,sort_keys=True,ensure_ascii=False,separators=(',',':'))
def require(condition,reason):
    if not condition:raise ValueError(reason)


def verify(registry_path,crosswalk_path,coverage_path):
    raw_registry=pathlib.Path(registry_path).read_bytes()
    raw_crosswalk=pathlib.Path(crosswalk_path).read_bytes()
    raw_coverage=pathlib.Path(coverage_path).read_bytes()
    require(sha(raw_registry)==REGISTRY_SHA,'REGISTRY_PIN')
    require(sha(raw_crosswalk)==CROSSWALK_SHA,'CROSSWALK_PIN')
    registry=json.loads(raw_registry)
    rows=list(csv.DictReader(raw_crosswalk.decode('utf-8-sig').splitlines()))
    actual=json.loads(raw_coverage)
    require(actual['digest']==sha(canon({k:v for k,v in actual.items() if k!='digest'}).encode()),'COVERAGE_CONTENT_DIGEST')
    by_node={node:[] for node in registry['nodes']}
    for ordinal,row in enumerate(rows,1):
        targets=[row['Candidate_HSN']]+row['Other_4_HSN_candidates'].split(';')
        require(len(targets)==len(set(targets))==5,'FIVE_DISTINCT_CANDIDATES')
        for rank,target in enumerate(targets,1):
            require(registry['nodes'][target]['kind']=='DOMAIN_SPECIALIZATION','DOMAIN_TARGET_REQUIRED')
            by_node[target].append({'id':row['T_ID'],'rank':rank,'ordinal':ordinal,
                                   'score':float(row['Rank_score_NOT_probability']) if rank==1 else None,
                                   'row':row})
    require(set(actual['nodes'])==set(registry['nodes']),'EXACT_NODE_COVERAGE')
    primary={node for node,edges in by_node.items() if any(e['rank']==1 for e in edges)}
    alternate={node for node,edges in by_node.items() if any(e['rank']>1 for e in edges)}
    domain={node for node,n in registry['nodes'].items() if n['kind']=='DOMAIN_SPECIALIZATION'}
    expected_counts={
        'registryNodes':len(by_node),'domainNodes':len(domain),'epistemicNodes':len(by_node)-len(domain),
        'topicRows':len(rows),'primaryLinks':len(rows),'alternateLinks':4*len(rows),
        'allCandidateLinks':5*len(rows),'primaryCoveredNodes':len(primary),
        'alternateCoveredNodes':len(alternate),'anyCandidateCoveredNodes':len(primary|alternate),
        'alternateOnlyNodes':len(alternate-primary),'uncoveredDomainNodes':len(domain-primary-alternate),
        'sourceVerifiedExactPrimaryLinks':sum(r['verified_exact']=='True' for r in rows),
        'sourceReviewerAcceptedLinks':sum(r['reviewer_accepted']=='True' for r in rows),
        'semanticAcceptedMappings':0,
    }
    require(actual['summary']['counts']==expected_counts,'GLOBAL_COUNTS')
    require(actual['summary']['sourceStatusCounts']==dict(collections.Counter(r['Status'] for r in rows)),'STATUS_COUNTS')
    comparisons=0
    for node,scopes in actual['nodes'].items():
        require(set(scopes)==set(SCOPES),'SCOPE_COVERAGE')
        all_edges=by_node[node]
        for scope,r in scopes.items():
            selected=[e for e in all_edges if scope=='ALL_CANDIDATES' or (e['rank']==1)==(scope=='PRIMARY')]
            source_ids=[e['id'] for e in selected]
            ranked=sorted(selected,key=lambda e:(e['rank'],-(e['score'] or 0),e['id']))
            ranked_ids=[e['id'] for e in ranked]
            order=r['order']
            expected_order=source_ids if order=='SOURCE_ORDER' else ranked_ids if order=='CANDIDATE_RANK_THEN_HEURISTIC_SCORE' else sorted(source_ids)
            require(order in ('SOURCE_ORDER','CANDIDATE_RANK_THEN_HEURISTIC_SCORE','TOPIC_ID'),'ORDER')
            visible=expected_order[:r['limit']]
            counts={'primary':sum(e['rank']==1 for e in all_edges),
                    'alternate':sum(e['rank']>1 for e in all_edges),'allCandidates':len(all_edges),
                    'sourceReviewerAccepted':sum(e['rank']==1 and e['row']['reviewer_accepted']=='True' for e in all_edges),
                    'semanticAccepted':0,'visible':len(visible),'total':len(selected),'omitted':len(selected)-len(visible)}
            require(r['hsn']==node and r['scope']==scope,'IDENTITY_SCOPE')
            require(r['nodeRole']==registry['nodes'][node]['kind'] and r['nodeName']==registry['nodes'][node]['name'],'NODE_SOURCE_LABEL')
            require(r['source']['registrySha256']==REGISTRY_SHA and r['source']['crosswalkSha256']==CROSSWALK_SHA,'RECEIPT_SOURCE_PINS')
            require(r['counts']==counts,'NODE_COUNTS:'+node+':'+scope)
            require(r['sourceTopicOrder']==source_ids and r['candidateTopicOrder']==ranked_ids,'SOURCE_AND_RANK_ORDER')
            require(r['presentationTopicOrder']==visible,'PRESENTATION_ORDER')
            require(r['truncated']==(len(visible)<len(selected)) and r['capReached']==(len(visible)==r['limit']),'CAP_FLAGS')
            require(r['authorityEffect']=='NONE' and r['hostGraphVerified'] is False,'NO_AUTHORITY')
            require([t['topicId'] for t in r['topics']]==visible,'VISIBLE_TOPIC_RECORDS')
            lookup={e['id']:e for e in selected}
            for position,t in enumerate(r['topics'],1):
                e=lookup[t['topicId']]
                require((t['candidateRankWithinTopic'],t['sourceRowOrdinal'],t['primaryHeuristicScore'])==(e['rank'],e['ordinal'],e['score']),'RANK_AND_RAW_POSITION')
                require((t['sourceOrderPosition'],t['candidateOrderPosition'],t['presentationPosition'])==(source_ids.index(e['id'])+1,ranked_ids.index(e['id'])+1,position),'DISTINCT_POSITIONS')
                require(t['label']==e['row']['OpenAlex_topic_name_source'] and t['sourceStatus']==e['row']['Status'],'SOURCE_LABEL_STATUS')
                require(t['semanticAccepted'] is False,'NO_SEMANTIC_PROMOTION')
            comparisons+=1
    return {'schema':'atlas.hsn.topic-coverage-independent-verification/v1',
            'status':'LOCAL_SOURCE_AND_PROJECTION_CHECKS_PASSED',
            'sourceDigests':{'registry':REGISTRY_SHA,'crosswalk':CROSSWALK_SHA},
            'coverageSha256':sha(raw_coverage),'coverageContentDigest':actual['digest'],
            'computedNodeScopeRecordsChecked':comparisons,'counts':expected_counts,
            'sourceStatusCounts':dict(collections.Counter(r['Status'] for r in rows)),
            'actualProviderRequests':0,'hostedDeploymentVerified':False,
            'semanticReviewsCompleted':0,'authorityEffect':'NONE'}


def compare_saved_connector(registry_path,crosswalk_path,observation_path,out_dir):
    # Independent source projection audit above does not import implementation.
    # This second part specifically exercises the public comparison API against
    # the separately retained connector response, with its origin kept explicit.
    sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'src'))
    from research_bridge import FrozenTopicCoverage
    coverage=FrozenTopicCoverage(registry_path,crosswalk_path)
    raw=pathlib.Path(observation_path).read_bytes();saved=json.loads(raw)
    hsn=saved['hsn'];source_digest=sha(raw)
    topics=saved['topicsDefault']['structuredContent']
    primary=coverage.node(hsn,scope='PRIMARY',limit=4516,order='SOURCE_ORDER')
    require(topics['hsn']==hsn,'TOPIC_SOURCE_HSN')
    require(topics['total']==topics['returned']==len(topics['rows'])==primary['counts']['total'],'COMPLETE_PRIMARY_ROWS')
    require(topics['more'] is False,'PRIMARY_PAGINATION_COMPLETE')
    require([r['topic_id'] for r in topics['rows']]==primary['sourceTopicOrder'],'CONNECTOR_PRIMARY_SOURCE_ORDER')
    for host,local in zip(topics['rows'],primary['topics']):
        require(host['provenance']['sha256']==CROSSWALK_SHA and host['provenance']['live_api_verified'] is False,'TOPIC_PROVENANCE')
        require((host['rank_score_not_probability'],host['status'],host['reviewer_accepted'],host['verified_exact'])==
                (local['primaryHeuristicScore'],local['sourceStatus'],False,False),'TOPIC_SOURCE_FIELDS')
    comparisons=[]
    for cap in (0,5):
        key='graphMaxTopics'+str(cap);graph=saved[key]['structuredContent']
        require(graph['hsn']==hsn,'GRAPH_HSN')
        require(graph['proof']['sourceRegistrySha']==REGISTRY_SHA and graph['proof']['openalexCrosswalkSha']==CROSSWALK_SHA,'GRAPH_SOURCE_PINS')
        visible=[]
        for edge in graph['edges']:
            require(edge['kind']=='HEURISTIC_HSN_CANDIDATE_NOT_REVIEWED','GRAPH_EDGE_KIND')
            target=json.loads(edge['to']);origin=json.loads(edge['from'])
            require(target[-1]==hsn and origin[:3]==['research_loom','openalex:historical-crosswalk-4516','preserved-as-of-2026-11-20'],'GRAPH_EDGE_SOURCE_TUPLE')
            visible.append(origin[-1])
        r=coverage.observe_graph({'hsn':hsn,'scope':'PRIMARY','limit':cap,'visibleTopicIds':visible,
            'observationRef':'sha256:'+source_digest+'#'+key+'@'+saved['observedAtUTC'],
            'source':{k:v for k,v in coverage.source.items() if k!='proof'}})
        r['connectorObservation']={
            'observedAtUTC':saved['observedAtUTC'],'sourceFileSha256':source_digest,
            'record':key,'observedBy':saved['observedBy'],
            'meaning':'CURRENT_CONNECTOR_RESPONSE_TO_HISTORICAL_CROSSWALK',
            'servedSiteVerified':False,'liveOpenAlexVerified':False,
            'sourceEditionNormalization':'EXACT_DIGEST_BOUND_TO_LOCAL_FROZEN_EDITION_LABEL',
            'connectorCrosswalkRevision':'preserved-as-of-2026-11-20',
            'selectionAlgorithmInferred':False,
            'originalGraphHasTotal': 'total' in graph,
            'originalGraphHasOmitted': 'omitted' in graph,
        }
        path=pathlib.Path(out_dir)/f'{hsn.replace(".","_")}_primary_cap{cap}_connector_comparison.json'
        path.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        comparisons.append({'path':str(path),'sha256':sha(path.read_bytes()),
                            'counts':r['counts'],'checks':r['observationChecks']})
    return {'observationSha256':source_digest,'observedAtUTC':saved['observedAtUTC'],
            'currentConnectorObservationCompared':True,'servedSiteVerified':False,
            'liveOpenAlexVerified':False,'comparisons':comparisons}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    for name in ('registry','topics','coverage','out'):p.add_argument('--'+name,required=True)
    p.add_argument('--observation')
    a=p.parse_args()
    report=verify(a.registry,a.topics,a.coverage)
    out=pathlib.Path(a.out);out.parent.mkdir(parents=True,exist_ok=True)
    if a.observation:report['savedConnectorComparison']=compare_saved_connector(a.registry,a.topics,a.observation,out.parent)
    out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,indent=2))


if __name__=='__main__':main()
