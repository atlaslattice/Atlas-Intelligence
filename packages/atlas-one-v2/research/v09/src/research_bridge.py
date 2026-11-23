#!/usr/bin/env python3
"""Ariadne HSN v0.7 × frozen OpenAlex × arXiv Work-only source router.

Pure/locally executable reference compiler. Does not connect agents, publish,
issue CANON votes, or fetch from external APIs. All results are review candidates.
Original registries and historical CSV remain owner-private input parameters.
"""
from __future__ import annotations
import argparse, csv, hashlib, json, pathlib, re, sqlite3, collections, urllib.parse, math
from dataclasses import dataclass
from types import MappingProxyType

SOURCE_EDITION = 'Ariadne v0.7'
ARIADNE_SHA = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
OPENALEX_SHA = 'a306c7306a79754b033e9f8c41c0de5ff5176b4544a6a80b5c740e2f8d2cc903'
PRIOR_PLAN_SHA = '76d77d7a6e62ca1fb28ab9bedfee43131ae0d4aad2ef6435b3dbaaa51d8d4553'
CIRCUIT_PLAN_DIGEST = '82a959a5db9d79ab002c459c80067b66087fa0eaaef8d1be3b07daacf6fc54a5'
HSN = re.compile(r'^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$')
TOPIC = re.compile(r'^T\d{4,7}$')
ARXIV = re.compile(r'^(?:astro-ph(?:\.[A-Za-z-]+)?|cond-mat(?:\.[A-Za-z-]+)?|cs\.[A-Za-z-]+|econ\.[A-Za-z-]+|eess\.[A-Za-z-]+|gr-qc|hep-(?:ex|lat|ph|th)|math(?:\.[A-Za-z-]+)?|math-ph|nlin\.[A-Za-z-]+|nucl-(?:ex|th)|physics\.[A-Za-z-]+|q-bio\.[A-Za-z-]+|q-fin\.[A-Za-z-]+|quant-ph|stat\.[A-Za-z-]+)$')
FORBIDDEN_KEYS = {'residentAuthenticated','canonApproved','roleGranted','rightsVerified','hostApproved','hostGrant','verifiedGain','approvedMatch','secret','privateContext','playJournal','palaceNotes'}
SCHEMA = 'atlas.hsn.research-bridge/v0.9'
OPENALEX_EDITION = 'OpenAlex November 2026 frozen 4516'
COVERAGE_SCHEMA = 'atlas.hsn.topic-coverage/v1'
COVERAGE_SCOPES = ('PRIMARY', 'ALTERNATE', 'ALL_CANDIDATES')
COVERAGE_ORDERS = ('SOURCE_ORDER', 'CANDIDATE_RANK_THEN_HEURISTIC_SCORE', 'TOPIC_ID')

class SourceHold(ValueError):
    pass

def sha256(data:bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def canonical(x) -> str:
    return json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':'))

def verify_source(path, expected):
    raw=pathlib.Path(path).read_bytes()
    actual=sha256(raw)
    if actual!=expected: raise SourceHold('SOURCE_DIGEST_MISMATCH:'+str(pathlib.Path(path).name))
    return raw

def node_kind(r):
    return r['kind']

def load_registry(path):
    r=json.loads(verify_source(path,ARIADNE_SHA))
    if (len(r['houses']),len(r['spheres']),len(r['nodes']))!=(12,144,1728):raise SourceHold('ARIADNE_TOPOLOGY')
    roles=collections.Counter()
    for h in range(1,13):
        hk=f'H{h:02d}'
        if hk not in r['houses']:raise SourceHold('ARIADNE_HOUSE_MISSING')
        for s in range(1,13):
            sk=f'{hk}.S{s:02d}'; sph=r['spheres'][sk]
            if sph['parent']!=hk or len(sph['children'])!=12:raise SourceHold('ARIADNE_SPHERE_PARENT')
            sphere_roles=set()
            for n in range(1,13):
                nk=f'{sk}.N{n:02d}'; v=r['nodes'][nk]
                if v['parent']!=sk or v['id']!=nk or not HSN.fullmatch(nk):raise SourceHold('ARIADNE_NODE_PARENT')
                sphere_roles.add(v['kind']);roles[v['kind']]+=1
            # Role is inherited from the entire sphere, not per-node 7/5.
            if sphere_roles!=({'DOMAIN_SPECIALIZATION'} if s<=7 else {'EPISTEMIC_META'}):raise SourceHold('ARIADNE_SPHERE_ROLE')
    if roles!={'DOMAIN_SPECIALIZATION':1008,'EPISTEMIC_META':720}:raise SourceHold('ARIADNE_ROLE_TOTALS')
    return r

def load_topics(path,reg):
    raw=verify_source(path,OPENALEX_SHA)
    rows=list(csv.DictReader(raw.decode('utf-8-sig').splitlines()))
    if len(rows)!=4516 or len({r['T_ID'] for r in rows})!=4516: raise SourceHold('TOPIC_SET_CARDINALITY')
    edges=[]; seen=set()
    for source_row, row in enumerate(rows, 1):
        tid=row['T_ID']
        if not TOPIC.fullmatch(tid):raise SourceHold('BAD_TOPIC_ID')
        score=float(row['Rank_score_NOT_probability'])
        if not math.isfinite(score):raise SourceHold('NONFINITE_CANDIDATE_SCORE')
        if row['verified_exact'] not in ('True','False') or row['reviewer_accepted'] not in ('True','False'):
            raise SourceHold('SOURCE_REVIEW_FLAG_SHAPE')
        targets=[row['Candidate_HSN'], *row['Other_4_HSN_candidates'].split(';')]
        if len(targets)!=5 or len(set(targets))!=5: raise SourceHold('CANDIDATE_COUNT_OR_DUPLICATE')
        for rank,target in enumerate(targets,1):
            if target not in reg['nodes'] or reg['nodes'][target]['kind']!='DOMAIN_SPECIALIZATION':
                raise SourceHold('FORCED_EPISTEMIC_OR_BAD_TARGET')
            edges.append({'topicId':tid,'topicLabel':row['OpenAlex_topic_name_source'],
                          'candidateHsn':target,'rank':rank,
                          'score':score if rank==1 else None,
                          'scoreType':'UNCALIBRATED_HEURISTIC_NOT_PROBABILITY' if rank==1 else 'NOT_REPORTED',
                          'sourceStatus':row['Status'], 'relation':'UNREVIEWED_RELATEDNESS_CANDIDATE',
                          'sourceEdition':OPENALEX_EDITION,
                          'sourceRowOrdinal':source_row,
                          'candidateRole':'PRIMARY' if rank==1 else 'ALTERNATE',
                          'sourceVerifiedExact':row['verified_exact']=='True',
                          'sourceReviewerAccepted':row['reviewer_accepted']=='True' and rank==1,
                          'authorityEffect':'NONE','approved':False})
            seen.add(target)
    if len(edges)!=22580 or len(seen)!=969: raise SourceHold('CROSSWALK_INVARIANT')
    return rows,edges

def _freeze_source(value):
    if isinstance(value,dict):
        return MappingProxyType({key:_freeze_source(item) for key,item in value.items()})
    if isinstance(value,(list,tuple)):
        return tuple(_freeze_source(item) for item in value)
    return value

@dataclass(frozen=True,init=False,eq=False)
class FrozenTopicCoverage:
    """Offline source projection; no provider calls, graph authority or acceptance.

    Construction verifies both original byte digests through the existing source
    loaders. Scope is mandatory: a primary-candidate graph cannot establish
    coverage of alternates. Source review flags remain source assertions only.
    """
    def __init__(self, registry_path, crosswalk_path):
        registry=load_registry(registry_path)
        rows,edges=load_topics(crosswalk_path,registry)
        immutable_edges=tuple(_freeze_source(edge) for edge in edges)
        by_node={hsn:[] for hsn in registry['nodes']}
        for edge in immutable_edges:
            by_node[edge['candidateHsn']].append(edge)
        object.__setattr__(self,'registry',_freeze_source(registry))
        object.__setattr__(self,'rows',_freeze_source(rows))
        object.__setattr__(self,'edges',immutable_edges)
        object.__setattr__(self,'by_node',MappingProxyType({k:tuple(v) for k,v in by_node.items()}))
        object.__setattr__(self,'source',_freeze_source({
            'registryEdition':SOURCE_EDITION, 'registrySha256':ARIADNE_SHA,
            'crosswalkEdition':OPENALEX_EDITION, 'crosswalkSha256':OPENALEX_SHA,
            'proof':'EXACT_FROZEN_BYTES_VERIFIED_LOCALLY',
        }))

    @staticmethod
    def _candidate_key(edge):
        return (edge['rank'], -(edge['score'] or 0), edge['topicId'])

    def _select(self, hsn, scope, limit, order):
        if not isinstance(hsn,str) or not HSN.fullmatch(hsn) or hsn not in self.by_node:
            raise SourceHold('COVERAGE_NODE_UNKNOWN')
        if scope not in COVERAGE_SCOPES:raise SourceHold('COVERAGE_SCOPE_REQUIRED')
        if type(limit) is not int or not 0<=limit<=4516:raise SourceHold('COVERAGE_CAP_INVALID')
        if order not in COVERAGE_ORDERS:raise SourceHold('COVERAGE_ORDER_INVALID')
        all_edges=self.by_node[hsn]
        selected=[e for e in all_edges if scope=='ALL_CANDIDATES' or e['candidateRole']==scope]
        key=(lambda e:e['sourceRowOrdinal']) if order=='SOURCE_ORDER' else self._candidate_key if order=='CANDIDATE_RANK_THEN_HEURISTIC_SCORE' else (lambda e:e['topicId'])
        return all_edges,selected,sorted(selected,key=key)

    def _receipt(self, hsn, scope, limit, order, visible=None):
        all_edges,selected,ordered=self._select(hsn,scope,limit,order)
        by_id={e['topicId']:e for e in selected}
        if len(by_id)!=len(selected):raise SourceHold('COVERAGE_DUPLICATE_TOPIC_IN_NODE')
        source_order=[e['topicId'] for e in sorted(selected,key=lambda e:e['sourceRowOrdinal'])]
        candidate_order=[e['topicId'] for e in sorted(selected,key=self._candidate_key)]
        source_pos={tid:i for i,tid in enumerate(source_order,1)}
        candidate_pos={tid:i for i,tid in enumerate(candidate_order,1)}
        chosen=ordered[:limit] if visible is None else [by_id[tid] for tid in visible]
        counts={'primary':sum(e['candidateRole']=='PRIMARY' for e in all_edges),
                'alternate':sum(e['candidateRole']=='ALTERNATE' for e in all_edges),
                'allCandidates':len(all_edges),
                'sourceReviewerAccepted':sum(e['sourceReviewerAccepted'] for e in all_edges),
                'semanticAccepted':0,'visible':len(chosen),'total':len(selected),
                'omitted':len(selected)-len(chosen)}
        topics=[{'topicId':e['topicId'],'label':e['topicLabel'],
                 'candidateRole':e['candidateRole'],'candidateRankWithinTopic':e['rank'],
                 'primaryHeuristicScore':e['score'],'scoreType':e['scoreType'],
                 'sourceStatus':e['sourceStatus'],'sourceRowOrdinal':e['sourceRowOrdinal'],
                 'sourceOrderPosition':source_pos[e['topicId']],
                 'candidateOrderPosition':candidate_pos[e['topicId']],
                 'presentationPosition':i,'sourceVerifiedExact':e['sourceVerifiedExact'],
                 'sourceReviewerAccepted':e['sourceReviewerAccepted'],'semanticAccepted':False}
                for i,e in enumerate(chosen,1)]
        node=self.registry['nodes'][hsn]
        return {'schema':COVERAGE_SCHEMA,'status':'LOCAL_SOURCE_PROJECTION',
                'source':dict(self.source),'hsn':hsn,'nodeName':node['name'],'nodeRole':node['kind'],
                'scope':scope,'denominator':'HISTORICAL_'+scope+'_LINKS',
                'order':order,'limit':limit,'counts':counts,
                'capReached':len(chosen)==limit,'truncated':counts['omitted']>0,
                'sourceTopicOrder':source_order,'candidateTopicOrder':candidate_order,
                'presentationTopicOrder':[e['topicId'] for e in chosen],'topics':topics,
                'sourceSetComplete':True,'historicalOnly':True,
                'semanticAcceptance':'NOT_ESTABLISHED','hostGraphVerified':False,
                'mode':'WORK','privacy':'OWNER_PRIVATE_GENERATED_METADATA','authorityEffect':'NONE'}

    def node(self, hsn, *, scope, limit=5, order='TOPIC_ID'):
        return self._receipt(hsn,scope,limit,order)

    def observe_graph(self, observation):
        """Compare caller-supplied visible IDs with exact frozen source scope.

        A reference identifies the separately retained observation; this function
        does not authenticate its origin or assert a live hosted capability.
        An undersized selection is retained as a finding, never hidden as a cap.
        """
        required={'hsn','scope','limit','visibleTopicIds','observationRef','source'}
        if type(observation) is not dict or set(observation)!=required:
            raise SourceHold('GRAPH_OBSERVATION_SHAPE')
        if observation['source']!={k:v for k,v in self.source.items() if k!='proof'}:
            raise SourceHold('GRAPH_OBSERVATION_SOURCE_MISMATCH')
        ref=observation['observationRef']
        if not isinstance(ref,str) or not ref.strip() or len(ref)>2048:
            raise SourceHold('GRAPH_OBSERVATION_REFERENCE_REQUIRED')
        visible=observation['visibleTopicIds']
        if type(visible) is not list or any(not isinstance(t,str) or not TOPIC.fullmatch(t) for t in visible):
            raise SourceHold('GRAPH_VISIBLE_IDS_INVALID')
        if len(set(visible))!=len(visible):raise SourceHold('GRAPH_VISIBLE_IDS_DUPLICATE')
        _,selected,_=self._select(observation['hsn'],observation['scope'],observation['limit'],'TOPIC_ID')
        if len(visible)>observation['limit']:raise SourceHold('GRAPH_VISIBLE_EXCEEDS_CAP')
        if not set(visible)<=set(e['topicId'] for e in selected):raise SourceHold('GRAPH_VISIBLE_OUTSIDE_SCOPE')
        r=self._receipt(observation['hsn'],observation['scope'],observation['limit'],'TOPIC_ID',visible)
        r.update(status='SOURCE_CHECKED_GRAPH_OBSERVATION_NOT_HOST_ATTESTATION',
                 order='OBSERVED_RETURN_ORDER',observationRef=ref,
                 observationTrust='CALLER_SUPPLIED_REFERENCE_NOT_INDEPENDENT_HOST_AUTHENTICATION')
        expected=min(r['limit'],r['counts']['total'])
        r['observationChecks']={
            'countExpectedAtCap':expected,'countMatchesCap':len(visible)==expected,
            'displaySortedByTopicId':visible==sorted(visible),
            'matchesSourceOrderPrefix':visible==r['sourceTopicOrder'][:len(visible)],
            'matchesCandidateOrderPrefix':visible==r['candidateTopicOrder'][:len(visible)],
            'matchesTopicIdOrderPrefix':visible==sorted(r['sourceTopicOrder'])[:len(visible)],
        }
        return r

    def summary(self):
        primary={n for n,a in self.by_node.items() if any(e['candidateRole']=='PRIMARY' for e in a)}
        alternate={n for n,a in self.by_node.items() if any(e['candidateRole']=='ALTERNATE' for e in a)}
        domain={n for n,v in self.registry['nodes'].items() if v['kind']=='DOMAIN_SPECIALIZATION'}
        edges=[e for a in self.by_node.values() for e in a]
        return {'schema':COVERAGE_SCHEMA,'source':dict(self.source),
                'status':'LOCAL_FROZEN_CROSSWALK_COVERAGE','counts':{
                    'registryNodes':len(self.by_node),'domainNodes':len(domain),
                    'epistemicNodes':len(self.by_node)-len(domain),'topicRows':len(self.rows),
                    'primaryLinks':sum(e['candidateRole']=='PRIMARY' for e in edges),
                    'alternateLinks':sum(e['candidateRole']=='ALTERNATE' for e in edges),
                    'allCandidateLinks':len(edges),'primaryCoveredNodes':len(primary),
                    'alternateCoveredNodes':len(alternate),'anyCandidateCoveredNodes':len(primary|alternate),
                    'alternateOnlyNodes':len(alternate-primary),
                    'uncoveredDomainNodes':len(domain-primary-alternate),
                    'sourceVerifiedExactPrimaryLinks':sum(e['sourceVerifiedExact'] for e in edges if e['rank']==1),
                    'sourceReviewerAcceptedLinks':sum(e['sourceReviewerAccepted'] for e in edges),
                    'semanticAcceptedMappings':0},
                'sourceStatusCounts':dict(sorted(collections.Counter(r['Status'] for r in self.rows).items())),
                'authorityEffect':'NONE','hostGraphVerified':False,'actualProviderRequests':0}

    def write(self, out_path, *, limit=5, order='TOPIC_ID'):
        """Write owner-private derived metadata; never include raw input bytes."""
        # Validate selectors even when an input fixture happens to be empty.
        self._select(next(iter(self.by_node)), 'PRIMARY', limit, order)
        output={'schema':'atlas.hsn.topic-coverage-index/v1','summary':self.summary(),
                'projection':{'limit':limit,'order':order,'scopes':list(COVERAGE_SCOPES)},
                'nodes':{hsn:{scope:self.node(hsn,scope=scope,limit=limit,order=order)
                             for scope in COVERAGE_SCOPES} for hsn in sorted(self.by_node)},
                'privacy':'OWNER_PRIVATE_GENERATED_METADATA','authorityEffect':'NONE'}
        output['digest']=sha256(canonical(output).encode())
        path=pathlib.Path(out_path);path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(canonical(output)+'\n',encoding='utf-8')
        return {'path':str(path),'sha256':sha256(path.read_bytes()),'digest':output['digest'],
                'counts':output['summary']['counts'],'source':dict(self.source),
                'actualProviderRequests':0,'authorityEffect':'NONE'}

def arxiv_routes(reg):
    """Only original source placements; scope inheritance never means equivalence."""
    out=[]
    for coord,node in sorted(reg['nodes'].items()):
        sphere=node['parent'];house=sphere[:3];seen=set();count=0
        for scope,entity in [('NODE',node),('SPHERE',reg['spheres'][sphere]),('HOUSE',reg['houses'][house])]:
            for placement in entity.get('placements',[]):
                k=placement.get('key','')
                if not k.startswith('arXiv|'): continue
                cat=k.split('|',1)[1]
                if not ARXIV.fullmatch(cat): continue  # discard invalid seeds
                if cat in seen:continue
                seen.add(cat);count+=1
                out.append({'hsn':coord,'category':cat,'sourceScope':scope,
                            'scopeRelation':'DIRECT_SOURCE_PLACEMENT' if scope=='NODE' else 'INHERITED_ROUTING_CANDIDATE',
                            'topicEquivalence':'NOT_ESTABLISHED','reviewStatus':'UNREVIEWED',
                            'authorityEffect':'NONE'})
    return out

def safe_topic_request(topic_id):
    if not isinstance(topic_id,str) or not TOPIC.fullmatch(topic_id):raise SourceHold('BAD_TOPIC_ID')
    # Singleton metadata lookup, no search or paid endpoint by default.
    return {'provider':'OpenAlex','kind':'TOPIC_SINGLETON','topicId':topic_id,
            'url':'https://api.openalex.org/topics/'+topic_id,
            'costClass':'FREE_SINGLETON_AS_DOCUMENTED','status':'PREPARED_NOT_FETCHED',
            'allowedHosts':['api.openalex.org'],'requiresNetworkOptIn':True}

def safe_arxiv_request(category,subject):
    if not ARXIV.fullmatch(category): raise SourceHold('BAD_ARXIV_CATEGORY')
    if not isinstance(subject,str):raise SourceHold('BAD_SUBJECT')
    words=[w for w in re.findall(r'[A-Za-z]{4,}',subject.lower()) if w not in {'theory','study','analysis','methods','systems','science','history','design','learning'}]
    if not words: words=['research']
    # Category plus bounded lexical hint limits broad pulls; still unverified relevance.
    q=f'cat:{category} AND all:{words[0]}'
    url='https://export.arxiv.org/api/query?'+urllib.parse.urlencode({'search_query':q,'start':0,'max_results':5,'sortBy':'submittedDate','sortOrder':'descending'})
    return {'provider':'arXiv','kind':'CATEGORY_QUERY_SEED','category':category,'query':q,'url':url,
            'delaySeconds':3,'maxResults':5,'status':'PREPARED_NOT_FETCHED','requiresNetworkOptIn':True,
            'providerTermsApply':True}

def select_next_batch(requests,max_items=24,previous=None):
    """Finite idempotent queue. This DOES NOT issue the requests."""
    if not isinstance(max_items,int) or not 1<=max_items<=24:raise SourceHold('BATCH_LIMIT')
    seen=set(previous or ());selected=[];blocked=0
    for x in requests:
        if x['kind'] not in ('TOPIC_SINGLETON','CATEGORY_QUERY_SEED'):raise SourceHold('UNSAFE_QUERY_KIND')
        if x.get('costClass') not in (None,'FREE_SINGLETON_AS_DOCUMENTED'):raise SourceHold('PAID_QUERY_DENIED')
        if x['url'] in seen:blocked+=1;continue
        seen.add(x['url']);selected.append(x)
        if len(selected)==max_items:break
    return {'schema':'atlas.hsn.research-batch/v1','status':'PREPARED_OFFLINE','prepared':selected,
            'alreadySeen':blocked,'actualApiRequests':0,'tokensSpent':0,'paidSpendUSD':0,
            'residentWakes':0,'externalEffects':False,'requiresSeparateHostOptIn':True}

def accept_research_receipt(receipt,requested_url,mode='WORK'):
    """Untrusted external record intake; no semantic promotion or authority."""
    if mode!='WORK' or not isinstance(receipt,dict) or FORBIDDEN_KEYS.intersection(receipt):raise SourceHold('PRIVATE_MODE_OR_AUTHORITY_DENIED')
    required={'requestUrl','provider','sourceId','retrievedAt','title','sourceDigest','reviewState'}
    if not required.issubset(receipt) or set(receipt)-required-{'doi','arxivId','publishedAt','updatedAt','license','locator','counterevidenceRefs'}:
        raise SourceHold('RESEARCH_RECEIPT_SHAPE')
    if receipt['requestUrl']!=requested_url or receipt['reviewState'] not in ('UNREVIEWED','CHALLENGED','NO_MATCH'):
        raise SourceHold('RESEARCH_RECEIPT_SCOPE')
    if not re.fullmatch('[a-f0-9]{64}',receipt['sourceDigest'] or ''):raise SourceHold('BAD_SOURCE_DIGEST')
    if receipt['provider'] not in ('arXiv','OpenAlex'):raise SourceHold('BAD_PROVIDER')
    parsed=urllib.parse.urlparse(requested_url)
    if parsed.scheme!='https' or parsed.netloc not in ('api.openalex.org','export.arxiv.org') or parsed.username or parsed.password or parsed.fragment:
        raise SourceHold('PROVIDER_URL_DENIED')
    if parsed.netloc=='api.openalex.org' and (not re.fullmatch(r'/topics/T\d{4,7}',parsed.path) or parsed.query):
        raise SourceHold('PROVIDER_PATH_DENIED')
    if parsed.netloc=='export.arxiv.org' and parsed.path!='/api/query':
        raise SourceHold('PROVIDER_PATH_DENIED')
    if receipt['provider']=='OpenAlex' and parsed.netloc!='api.openalex.org' or receipt['provider']=='arXiv' and parsed.netloc!='export.arxiv.org':
        raise SourceHold('PROVIDER_MISMATCH')
    return {'status':'RESEARCH_METADATA_RECEIPT_UNVERIFIED','sourceId':receipt['sourceId'],
            'sourceDigest':receipt['sourceDigest'],'provider':receipt['provider'],
            'semanticApproval':False,'authorityEffect':'NONE','hostRightsVerified':False}

def load_plan(path,registry):
    x=json.loads(verify_source(path,PRIOR_PLAN_SHA))
    if len(x['dimensions'])!=1728:raise SourceHold('INVALID_PRIOR_PLAN')
    byid={v['coordinate']:v for v in x['dimensions']}
    if set(byid)!=set(registry['nodes']):raise SourceHold('PRIOR_PLAN_EDITIONS_NOT_MATCHED')
    return x,byid

def jsonl_dump(path,rows):
    with open(path,'w',encoding='utf-8',newline='\n') as f:
        for x in rows:f.write(canonical(x)+'\n')

def build(registry_path,crosswalk_path,prior_plan_path,sqlite_path,out_path):
    """Deterministic, source-locked research router. No networking or hosted changes."""
    out=pathlib.Path(out_path);out.mkdir(parents=True,exist_ok=True)
    coverage=FrozenTopicCoverage(registry_path,crosswalk_path)
    reg=coverage.registry;topics=coverage.rows;edges=coverage.edges
    prior,prior_by=load_plan(prior_plan_path,reg)
    with sqlite3.connect(sqlite_path) as cx:
        meta_row=cx.execute("SELECT value FROM metadata WHERE key='manifest'").fetchone()
        if not meta_row:raise SourceHold('CIRCUIT_MANIFEST_MISSING')
        cm=json.loads(meta_row[0])
        if cm.get('planDigest')!=CIRCUIT_PLAN_DIGEST or cm.get('sourceSha256')!=ARIADNE_SHA or cm.get('sourceProof')!='ORIGINAL_BYTES_AND_RETAINED_SOURCE_FIELDS_MATCHED':raise SourceHold('CIRCUIT_SOURCE_PIN_MISMATCH')
        evaluations=cx.execute('SELECT count(*) FROM review_candidates').fetchone()[0]
        spheres=cx.execute("SELECT count(*) FROM review_candidates WHERE kind='sphere'").fetchone()[0]
        houses=cx.execute("SELECT count(*) FROM review_candidates WHERE kind='house'").fetchone()[0]
    if (evaluations,spheres,houses)!=(269568,248832,20736): raise SourceHold('CIRCUIT_REPLAY_NOT_COMPLETE')
    bynode=collections.defaultdict(list)
    for edge in edges:bynode[edge['candidateHsn']].append(edge)
    for arr in bynode.values():arr.sort(key=lambda x:(x['rank'], -(x['score'] or 0),x['topicId']))
    routes=arxiv_routes(reg)
    byroute=collections.defaultdict(list)
    for r in routes:byroute[r['hsn']].append(r)
    nodes=[];roles=[];story=[];unique_arxiv=set();hcounts=collections.Counter();scounts=collections.Counter()
    for hsn,node in sorted(reg['nodes'].items()):
        sp=node['parent'];house=sp[:3];method=node['kind']=='EPISTEMIC_META'
        arr=bynode[hsn];choices=arr[:8] if not method else []
        rts=byroute[hsn]
        for route in rts:unique_arxiv.add(route['category'])
        path=prior_by[hsn]
        if path['node_name']!=node['name']:raise SourceHold('PRIOR_NODE_LABEL_MISMATCH')
        status='METHOD_ONLY_REQUIRES_EXPLICIT_SUBJECT' if method else 'NO_OPENALEX_CANDIDATE_REVIEW_NEEDED' if not arr else 'TOPIC_CANDIDATES_UNREVIEWED'
        nodes.append({'hsn':hsn,'house':house,'houseName':reg['houses'][house]['name'],
          'sphere':sp,'sphereName':reg['spheres'][sp]['name'],'nodeName':node['name'],
          'role':node['kind'],'topicCandidateCount':len(arr),
          'topTopicCandidates':[{'id':a['topicId'],'label':a['topicLabel'],'rank':a['rank'],'status':a['sourceStatus']} for a in choices],
          'topicCoverage':coverage.node(hsn,scope='ALL_CANDIDATES',limit=8,
                                       order='CANDIDATE_RANK_THEN_HEURISTIC_SCORE'),
          'arxivCandidateCount':len(rts),
          'arxivCategories':[{'category':a['category'],'scope':a['sourceScope']} for a in rts[:10]],
          'literatureStatus':status,'sourceRegistryDigest':ARIADNE_SHA,
          'implementation':'NOT_STARTED','residentRole':'UNASSIGNED_OPT_IN','acceptedOpenAlexMappings':0,
          'researchExecution':'NOT_RUN','rightsAuthority':'NONE'})
        roles.append({'id':'expert:'+hsn,'scope':'NODE','hsn':hsn,'title':node['name'],'kind':node['kind'],
                      'appointment':'UNASSIGNED_OPT_IN','evidenceNeeded':['AUTHENTICATED_OPT_IN','SOURCE_PINNED_ORIGINAL_WORK','TESTABLE_FALSIFIER','HOST_RIGHTS_AT_READ_AND_RETURN'],
                      'authority':'NONE','sourceDigest':ARIADNE_SHA})
        hcounts[house]+=1;scounts[sp]+=1
        ip=path['projects']['Iron Empire']
        story.append({'hsn':hsn,'house':house,'sourceNode':node['name'],'project':'Iron Empire',
          'draftAction':ip.get('design_action'),'falsifier':ip.get('negative_test'),
          'sourceStatus':'INHERITED_UNRATIFIED_WORK_CANDIDATE',
          'fictionalScience':'UNVERIFIED_IN_WORLD_HYPOTHESIS',
          'status':'PROPOSED_NOT_CANON','actualStoryPatch':False,
          'inputEdition':ARIADNE_SHA,'rights':'OWNER_EDITORIAL_REVIEW_REQUIRED'})
    for h,house in sorted(reg['houses'].items()):
        roles.append({'id':'expert:'+h,'scope':'HOUSE','hsn':h,'title':house['name'],
                      'appointment':'UNASSIGNED_OPT_IN','authority':'NONE','evidenceNeeded':['AUTHENTICATED_OPT_IN','PEER_SOURCE_REVIEW','RIGHTS_CONSENT'],
                      'sourceDigest':ARIADNE_SHA})
    for s,sphere in sorted(reg['spheres'].items()):
        roles.append({'id':'expert:'+s,'scope':'SPHERE','hsn':s,'title':sphere['name'],
                      'appointment':'UNASSIGNED_OPT_IN','authority':'NONE','evidenceNeeded':['AUTHENTICATED_OPT_IN','PEER_SOURCE_REVIEW','CORRECT_ROLE_INHERITANCE'],
                      'sourceDigest':ARIADNE_SHA})
    if len(roles)!=1884:raise SourceHold('EXPERT_SLOT_COUNT_MISMATCH')
    spheres_out=[]
    for s in sorted(reg['spheres']):
        original=next(x for x in prior['spheres'] if x['sphere']==s)
        spheres_out.append({'sphere':s,'name':reg['spheres'][s]['name'],'house':s[:3],
                            'sourceRole':'DOMAIN' if int(s[5:7])<=7 else 'META',
                            'reviewsOfAllNodes':1728,'actualResidentReviews':0,
                            'candidateLiteratureTargets':sum(len(bynode[f'{s}.N{n:02d}']) for n in range(1,13)),
                            'researchLens':original.get('projects',{}).get('Ariadne',{}),
                            'reviewOutcome':'SOURCE_BOUND_PROPOSED',
                            'residentSpecialist':'UNASSIGNED_OPT_IN'})
    houses_out=[]
    for h in sorted(reg['houses']):
        item=next(x for x in prior['houses'] if x['house']==h)
        houses_out.append({'house':h,'name':reg['houses'][h]['name'],
                           '12SpherePerspectiveCount':12,'12SphereNodeSources':144,
                           'reviewsOfAllNodes':1728,'houseRequirementRows':1728,
                           'actualHouseAgentReviews':0,'domainNodes':84,'epistemicNodes':60,
                           'followup':item.get('house_followup'),
                           'sourceOutcomes':'REVIEW_CANDIDATE_ONLY','residentExpert':'UNASSIGNED_OPT_IN'})
    # Per-topic queries are deduplicated across all HSN nodes, not 4516 * node count.
    topic_requests=[safe_topic_request(r['T_ID']) for r in topics]
    # Original arXiv placements, never generate non-existent categories by title.
    arxiv_requests=[safe_arxiv_request(cat,'research') for cat in sorted(unique_arxiv)]
    no_topics=[n['hsn'] for n in nodes if n['role']=='DOMAIN_SPECIALIZATION' and not n['topicCandidateCount']]
    if len(no_topics)!=39:raise SourceHold('UNCOVERED_DOMAIN_COUNT_MISMATCH')
    # Per-node category query candidates. Never force a method/meta address
    # into an arXiv subject or inherit whole-House topics as equivalence.
    node_arxiv_requests=[]
    for node_record in nodes:
        if node_record['role']!='DOMAIN_SPECIALIZATION':continue
        coord=node_record['hsn']
        for route in byroute[coord]:
            req=safe_arxiv_request(route['category'],node_record['nodeName'])
            node_arxiv_requests.append({'hsn':coord,'sourceScope':route['sourceScope'],
                'routingStatus':'UNREVIEWED_CATEGORY_SCOPE_SEED',
                'queryStatus':'HOLD_FOR_HOST_AND_SUBJECT_REVIEW',
                'request':req,'noLiveSearch':True,'semanticEquivalence':False})
    # Source-only artifacts; the original owner registry stays outside generated public-safe PR.
    jsonl_dump(out/'research_nodes_1728.jsonl',nodes)
    jsonl_dump(out/'unreviewed_topic_edges_22580.jsonl',(dict(edge) for edge in edges))
    jsonl_dump(out/'arxiv_scope_routes.jsonl',routes)
    jsonl_dump(out/'arxiv_query_templates.jsonl',arxiv_requests)
    jsonl_dump(out/'arxiv_node_queries.jsonl',node_arxiv_requests)
    jsonl_dump(out/'openalex_topic_requests_4516.jsonl',topic_requests)
    jsonl_dump(out/'resident_expert_slots_1884.jsonl',roles)
    jsonl_dump(out/'iron_empire_proposals_1728.jsonl',story)
    jsonl_dump(out/'sphere_research_followups_144.jsonl',spheres_out)
    jsonl_dump(out/'house_research_followups_12.jsonl',houses_out)
    (out/'openalex_uncovered_domain_nodes_39.json').write_text(json.dumps(no_topics,indent=2)+'\n',encoding='utf-8')
    example=select_next_batch(topic_requests,max_items=18)
    (out/'example_work_batch_18_NO_NETWORK.json').write_text(json.dumps(example,indent=2)+'\n',encoding='utf-8')
    counts={'registryHouses':12,'registrySpheres':144,'registryNodes':1728,'domainNodes':1008,'epistemicNodes':720,
      'sphereSweeps':144,'houseFollowups':12,'sphereLensEvaluations':spheres,'houseLensEvaluations':houses,
      'totalStructuralEvaluations':evaluations,'openAlexTopics':len(topics),'unreviewedTopicEdges':len(edges),
      'mappedDomainNodes':sum(bool(bynode[n]) for n,v in reg['nodes'].items() if v['kind']=='DOMAIN_SPECIALIZATION'),'unmappedDomainNodes':len(no_topics),'forcedMetaTopicMatches':0,
      'arxivScopeRoutes':len(routes),'arxivNodeQueryCandidates':len(node_arxiv_requests),'arxivDistinctCategorySeeds':len(unique_arxiv),
      'expertSlotsUnassigned':len(roles),'ironEmpireStoryCandidates':len(story),
      'realResearchRequests':0,'realResidentAppointments':0,'verifiedScientificClaims':0,'acceptedCanonUpdates':0}
    counts['topicCoverage']=coverage.summary()['counts']
    receipt={'schema':SCHEMA,'status':'LOCAL_RESEARCH_CROSSWALK_COMPILED_NOT_HOSTED',
      'sourceDigests':{'ariadneOriginal':ARIADNE_SHA,'openalexFrozen':OPENALEX_SHA,
                      'priorPlan':sha256(pathlib.Path(prior_plan_path).read_bytes())},
      'counts':counts,'mode':'WORK_ONLY','privacy':'PRIVATE_SOURCE_NOT_PUBLISHED',
      'sourceGraphMeaning':'TOPOLOGY_REPLAY_AND_HEURISTIC_RESEARCH_CANDIDATES_NOT_SEMANTIC_CERTIFICATION',
      'noNetworkCalls':True,'noResidentWakes':True,'noRoleAssignments':True,
      'authorityEffect':'NONE','sourceRouteSchema':SCHEMA}
    receipt['digest']=sha256(canonical(receipt).encode())
    (out/'RESEARCH_BUILD_RECEIPT.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    return receipt

def cli():
    ap=argparse.ArgumentParser(description=__doc__)
    sub=ap.add_subparsers(dest='action',required=True)
    b=sub.add_parser('build');
    for name in ('registry','topics','plan','circuit','out'):b.add_argument('--'+name,required=True)
    p=sub.add_parser('topic-url');p.add_argument('topic_id')
    q=sub.add_parser('arxiv-url');q.add_argument('category');q.add_argument('subject')
    c=sub.add_parser('coverage',help='Compile explicit-scope owner-private coverage; no provider requests')
    for name in ('registry','topics','out'):c.add_argument('--'+name,required=True)
    c.add_argument('--limit',type=int,default=5);c.add_argument('--order',choices=COVERAGE_ORDERS,default='TOPIC_ID')
    a=ap.parse_args()
    if a.action=='build':print(json.dumps(build(a.registry,a.topics,a.plan,a.circuit,a.out),indent=2))
    elif a.action=='topic-url':print(json.dumps(safe_topic_request(a.topic_id),indent=2))
    elif a.action=='arxiv-url':print(json.dumps(safe_arxiv_request(a.category,a.subject),indent=2))
    elif a.action=='coverage':print(json.dumps(FrozenTopicCoverage(a.registry,a.topics).write(a.out,limit=a.limit,order=a.order),indent=2))
if __name__=='__main__':cli()
