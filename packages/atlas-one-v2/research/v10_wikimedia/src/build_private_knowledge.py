#!/usr/bin/env python3
"""Private source-locked Ariadne+OpenAlex+arXiv+Wikimedia research evidence store.

Reuses v0.9 authoritative *source identities* and candidate crosswalk, never auto-CANON.
Inputs are owner-private and intentionally not shipped in public code repositories.
"""
from __future__ import annotations
import argparse,collections,csv,json,pathlib,sqlite3,sys
from wikimedia_bridge import ARIADNE_SHA,initialize_evidence_db,digest,canonical,WikimediaHold


def generate(registry_path,crosswalk_path,r09_output_dir,output_dir,v09_src):
    sys.path.insert(0,str(pathlib.Path(v09_src).resolve()))
    from research_bridge import load_registry,load_topics,arxiv_routes,safe_topic_request
    reg=load_registry(registry_path)
    topics,edges=load_topics(crosswalk_path,reg)
    existing=pathlib.Path(r09_output_dir)
    research_nodes=[json.loads(line) for line in (existing/'research_nodes_1728.jsonl').read_text(encoding='utf8').splitlines()]
    expert_slots=[json.loads(line) for line in (existing/'resident_expert_slots_1884.jsonl').read_text(encoding='utf8').splitlines()]
    if len(research_nodes)!=1728 or len(expert_slots)!=1884:raise WikimediaHold('BASE_RESEARCH_CARDINALITY')
    by_node={n['hsn']:n for n in research_nodes}
    if set(by_node)!=set(reg['nodes']):raise WikimediaHold('MISMATCH_RESEARCH_NODE_IDS')
    out=pathlib.Path(output_dir);out.mkdir(parents=True,exist_ok=True)
    db=initialize_evidence_db(out/'atlas_evidence_ontology.sqlite')
    db.executescript('''
    CREATE TABLE IF NOT EXISTS hsn_nodes(hsn TEXT PRIMARY KEY,house TEXT NOT NULL,sphere TEXT NOT NULL,role TEXT NOT NULL,name TEXT NOT NULL,source_record_digest TEXT NOT NULL,source_registry_digest TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS openalex_topics(topic_id TEXT PRIMARY KEY,label TEXT NOT NULL,subfield_id TEXT,source_status TEXT NOT NULL,metadata_request_url TEXT NOT NULL,metadata_fetch_state TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS topic_hsn_candidates(topic_id TEXT NOT NULL,hsn TEXT NOT NULL,rank INTEGER NOT NULL,original_status TEXT NOT NULL,relation TEXT NOT NULL,reviewed INTEGER NOT NULL,PRIMARY KEY(topic_id,rank));
    CREATE TABLE IF NOT EXISTS arxiv_route_candidates(hsn TEXT NOT NULL,category TEXT NOT NULL,scope TEXT NOT NULL,status TEXT NOT NULL,PRIMARY KEY(hsn,category));
    CREATE TABLE IF NOT EXISTS specialist_roles(role_id TEXT PRIMARY KEY,scope TEXT NOT NULL,address TEXT NOT NULL,status TEXT NOT NULL,authority TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS edition_pins(namespace TEXT PRIMARY KEY,sha256 TEXT NOT NULL,source_status TEXT NOT NULL);
    ''')
    with db:
        db.execute('INSERT INTO edition_pins VALUES (?,?,?)',('Ariadne v0.7',ARIADNE_SHA,'ORIGINAL_BYTES_VERIFIED_LOCAL'))
        db.execute('INSERT INTO edition_pins VALUES (?,?,?)',('OpenAlex 4516 frozen','a306c7306a79754b033e9f8c41c0de5ff5176b4544a6a80b5c740e2f8d2cc903','HISTORICAL_CANDIDATES_NOT_CURRENT_METADATA'))
        for k,x in reg['nodes'].items():
            db.execute('INSERT INTO hsn_nodes VALUES (?,?,?,?,?,?,?)',(k,k[:3],k[:7],x['kind'],x['name'],x['source_record_sha256'],ARIADNE_SHA))
        for t in topics:
            tid=t['T_ID'];req=safe_topic_request(tid)
            db.execute('INSERT INTO openalex_topics VALUES (?,?,?,?,?,?)',(tid,t['OpenAlex_topic_name_source'],t['Source_subfield_ID'],t['Status'],req['url'],'NOT_FETCHED'))
        for edge in edges:
            db.execute('INSERT INTO topic_hsn_candidates VALUES (?,?,?,?,?,?)',(edge['topicId'],edge['candidateHsn'],edge['rank'],edge['sourceStatus'],edge['relation'],0))
        for route in arxiv_routes(reg):
            db.execute('INSERT OR IGNORE INTO arxiv_route_candidates VALUES (?,?,?,?)',(route['hsn'],route['category'],route['sourceScope'],route['reviewStatus']))
        for role in expert_slots:
            db.execute('INSERT INTO specialist_roles VALUES (?,?,?,?,?)',(role['id'],role['scope'],role['hsn'],role['appointment'],role['authority']))
    byedges=collections.defaultdict(list)
    for e in edges:byedges[e['candidateHsn']].append(e)
    nodes=[];qids=0;metadata_urls=[];uncovered=[];has_domain_candidate=0
    for k,x in sorted(reg['nodes'].items()):
        d=by_node[k];record=sorted(byedges[k],key=lambda e:(e['rank'],e['topicId']))
        meta=x['kind']=='EPISTEMIC_META'
        if not meta and record:has_domain_candidate+=1
        if not meta and not record:uncovered.append(k)
        nodes.append({'coordinate':k,'sourceNodeName':x['name'],'sourceRole':x['kind'],
          'sphere':k[:7],'house':k[:3],'nodeSourceSHA256':x['source_record_sha256'],
          'openalexCandidateCount':len(record),'topOpenalexTopics':[{'id':e['topicId'],'label':e['topicLabel'],
            'rank':e['rank'],'status':'HISTORICAL_CANDIDATE_NOT_EQUIVALENCE'} for e in record[:8]] if not meta else [],
          'wikipedia':{'status':'WAITING_FOR_VERIFIED_OPENALEX_IDS_WIKIPEDIA','pageId':None,
             'revisionId':None,'url':None},
          'wikidata':{'status':'WAITING_FOR_PAGEPROPS_QID','qid':None},
          'nextStage':'REVIEW_METHOD_SCOPE_WITH_SUBJECT' if meta else 'DISCOVER_EXTERNAL_TOPIC' if not record else 'VERIFY_OPENALEX_WIKIPEDIA_ANCHOR',
          'sourceRegistryDigest':ARIADNE_SHA,'researchExecution':'NOT_STARTED',
          'candidateApproval':False,'residentRole':'UNASSIGNED_OPT_IN','canonEffect':'NONE'})
    if has_domain_candidate!=969 or len(uncovered)!=39:raise WikimediaHold('SOURCE_GAP_COUNTS')
    topic_reqs=[safe_topic_request(t['T_ID']) for t in topics]
    spheres=[]
    for sk,x in sorted(reg['spheres'].items()):
        subjects=[k for k in x['children'] if reg['nodes'][k]['kind']=='DOMAIN_SPECIALIZATION']
        sphere_coverage=sum(bool(byedges[k]) for k in subjects)
        spheres.append({'sphere':sk,'name':x['name'],'role':'DOMAIN' if int(sk[5:7])<=7 else 'META',
          'addresses':x['children'],'domainNodesWithCandidate':sphere_coverage,
          'wikipediaPageLinksVerified':0,'nextResearchAction':'DISCOVER_WIKIPEDIA_CANDIDATES_THROUGH_OPENALEX' if subjects else 'WAIT_FOR_EXPLICIT_SUBJECT',
          'resident':'UNASSIGNED_OPT_IN','houseFollowup':sk[:3],'sourceStatus':'CANDIDATE_ONLY'})
    houses=[]
    for hk,x in sorted(reg['houses'].items()):
        houses.append({'house':hk,'name':x['name'],'sphereCount':12,'nodeCount':144,
          'relevantScienceCandidates':sum(len(byedges[k]) for k in reg['nodes'] if k.startswith(hk) and reg['nodes'][k]['kind']=='DOMAIN_SPECIALIZATION'),
          'perspective':'Review extracted claims, community rights, source links and false-friends in this House',
          'resident':'UNASSIGNED_OPT_IN','status':'STRUCTURAL_FOLLOWUP_NO_AUTHENTICATED_HOUSE_PEER'})
    if len(nodes)!=1728 or len(spheres)!=144 or len(houses)!=12 or len(topic_reqs)!=4516:
        raise WikimediaHold('COMPILED_COUNT_INVALID')
    def save_jsonl(name,rows):
        with (out/name).open('w',encoding='utf8',newline='\n') as f:
            for r in rows:f.write(canonical(r)+'\n')
    save_jsonl('wikimedia_node_work_orders_1728.jsonl',nodes)
    save_jsonl('openalex_to_wikipedia_metadata_queue_4516.jsonl',topic_reqs)
    save_jsonl('sphere_wikimedia_reviews_144.jsonl',spheres)
    save_jsonl('house_wikimedia_followups_12.jsonl',houses)
    (out/'uncovered_domain_nodes_39.json').write_text(json.dumps(uncovered,indent=2)+'\n',encoding='utf8')
    count=lambda t:db.execute(f'SELECT count(*) FROM {t}').fetchone()[0]
    receipt={'schema':'atlas.ariadne.wikimedia-research-v1','status':'SOURCE_BOUND_PRIVATE_OFFLINE_CANDIDATES',
      'counts':{'nodes':count('hsn_nodes'),'topics':count('openalex_topics'),
        'topicToHsnCandidateEdges':count('topic_hsn_candidates'),'arxivRouteCandidates':count('arxiv_route_candidates'),
        'expertSlotsUnassigned':count('specialist_roles'),'domainWithOpenalexCandidate':has_domain_candidate,
        'domainWithoutOpenalexCandidate':len(uncovered),'wikipediaArticlesActuallyFetched':0,'wikidataEntitiesActuallyFetched':0,
        'canonicalFactsApproved':0,'nodeResearchWorkOrders':len(nodes),'sphereReviewsPrepared':len(spheres),'houseFollowupsPrepared':len(houses)},
      'sourceDigests':{'ariadne':ARIADNE_SHA,'frozenOpenalex':'a306c7306a79754b033e9f8c41c0de5ff5176b4544a6a80b5c740e2f8d2cc903'},
      'licensePolicy':{'wikipedia':'COPYRIGHT_CC_BY_SA_ATTRIBUTION_AND_SHAREALIKE_REQUIRED','wikidata':'CC0_STRUCTURED_DATA','sourceTextImported':False},
      'externalEffect':'NONE','residentAppointments':0,'ontologyModifications':0,'canonicalMeaning':'PROVENANCE_STORE_NOT_NORMATIVE_CANON'}
    receipt['digest']=digest(canonical(receipt))
    (out/'KNOWLEDGE_COMPILE_RECEIPT.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf8')
    db.close()
    return receipt

if __name__=='__main__':
    a=argparse.ArgumentParser()
    for name in ('registry','crosswalk','r09-output','out','v09-src'):a.add_argument('--'+name,required=True)
    ns=a.parse_args()
    print(canonical(generate(ns.registry,ns.crosswalk,ns.r09_output,ns.out,ns.v09_src)))
