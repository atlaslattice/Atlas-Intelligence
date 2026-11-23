#!/usr/bin/env python3
"""R08 research and resident-expertise host-port contract. Offline safe-by-default.

Work agents may *prepare* queries but this library never performs network calls,
installs resident identities, wakes models, posts messages, or grants rights.
Trusted authenticated host services must handle issuer/grants, rate limits,
permissions at READ/RETURN, provider API credentials, publication and storage.
"""
from __future__ import annotations
import json, hashlib, re, urllib.parse, xml.etree.ElementTree as ET
from pathlib import Path

ALLOWED_MODE='WORK'
BASE=Path(__file__).resolve().parent.parent
ALLOW_HOSTS={'api.openalex.org','export.arxiv.org','arxiv.org','openalex.org'}
HSN=re.compile(r'^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$')
TOPIC=re.compile(r'^T\d{4,6}$')
DENIED_FIELDS={'private_body','privateRoomText','palace','brain','quiet','play','social','imagine','dream','habitat',
               'hostGranted','residentAuthenticated','canonApproved','canPublish','automaticallyPost'}

class Hold(Exception): pass

def sha(b:bytes):return hashlib.sha256(b).hexdigest()
def enc(x):return json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode('utf-8')
def _deny_forbidden(x):
    if isinstance(x,dict):
        if DENIED_FIELDS.intersection(x):raise Hold('PRIVATE_OR_AUTHORITY_FIELD')
        for k,v in x.items():_deny_forbidden(v)
    elif isinstance(x,list):
        for v in x:_deny_forbidden(v)


def verify_queue_item(item):
    if not isinstance(item,dict) or not isinstance(item.get('hsn'),str) or not HSN.fullmatch(item['hsn']):raise Hold('INVALID_HSN')
    if item.get('status')!='READY_FOR_AUTHORIZED_RESEARCH_REVIEW_NOT_DISPATCHED':raise Hold('ALREADY_DISPATCHED_OR_UNKNOWN')
    if item.get('expertAssigned') is not None or item.get('autonomousExecutionEnabled') is not False:raise Hold('FAKE_EXPERT_OR_AUTONOMY')
    if item.get('transportCallsMade')!=0:raise Hold('NOT_FRESH_QUEUE')
    if any(not TOPIC.fullmatch(t) for t in item.get('openalexTop1TopicIds',[])):raise Hold('INVALID_TOPIC_ID')
    _deny_forbidden(item)
    return True


def prepare_providers(item, max_topics=3):
    """Prepare the next read-only query candidates, not an HTTP/API request execution."""
    verify_queue_item(item)
    if not isinstance(max_topics,int) or isinstance(max_topics,bool) or max_topics<1 or max_topics>5:raise Hold('BAD_TOPIC_LIMIT')
    tops=item.get('openalexTop1TopicIds',[])
    fallbacks=item.get('openalexCandidateTopicIds',[])
    ids=list(dict.fromkeys(tops+fallbacks))[:max_topics]
    # Preserve current OpenAlex 2026 distinction: work assigned topic != semantic same-as HSN.
    q={ 'filter':'type:article|review|book|book-chapter', 'per_page':5,
        'select':'id,display_name,publication_date,primary_topic,topics,doi,type,updated_date'}
    if ids:q['filter']+=',topics.id:'+ '|'.join(ids)
    else:q['search']=item['name']
    query='https://api.openalex.org/works?'+urllib.parse.urlencode(q)
    arxiv_cats=item.get('arxivCategoriesByProvenance',{})
    categories=(arxiv_cats.get('DIRECT_NODE') or arxiv_cats.get('INHERITED_SPHERE') or arxiv_cats.get('INHERITED_HOUSE') or [])[:4]
    arxiv_query=None
    if categories:
        # Quoted text is a search hint only, not a subject proof.
        import re as _re
        term=_re.sub('[^A-Za-z0-9 ]',' ',item['name'])[:100].strip()
        arxiv_query=f'ti:"{term}"' if term else 'cat:'+categories[0]
    arxiv=(None if arxiv_query is None else 'https://export.arxiv.org/api/query?'+urllib.parse.urlencode({
        'search_query':arxiv_query,'start':0,'max_results':5,'sortBy':'submittedDate','sortOrder':'descending'}))
    return {'schema':'atlas.research.prepare/v1','hsn':item['hsn'],'topicIds':ids,
        'queries':{'openalex':query,'arxiv':arxiv},'arxivCategoryHints':categories,
        'scope':ALLOWED_MODE,'currentPermissionsRequired':True,'networkExecuted':False,
        'requestIssuerVerified':False,'residentExpertAuthenticated':False,
        'state':'PREPARED_REQUIRES_TRUSTED_HOST_REVIEW','authorityEffect':'NONE',
        'providerBudgets':{'arxivMinSecondsBetweenRequests':3,'openalexPerPage':5,'maxProviderCallsPerHSN':2},
        'retry':'NETWORK_OR_RATE_LIMIT_HOLD_DO_NOT_SPIN'}


def classify_external_response(provider,body,expected_topic_ids=()):
    """Parse a *fixture* with no trusted authority. Caller MUST not count it as a live fetch.
    The return is nonauthorizing metadata; no texts or abstracts are returned.
    """
    if not isinstance(body,(bytes,str)):raise Hold('BAD_RESPONSE_BYTES')
    b=body if isinstance(body,bytes) else body.encode('utf8')
    if len(b)>2_000_000:raise Hold('RESPONSE_TOO_LARGE')
    if provider=='openalex':
        try:d=json.loads(b)
        except Exception:raise Hold('INVALID_OPENALEX_JSON') from None
        if not isinstance(d,dict) or not isinstance(d.get('results'),list):raise Hold('INVALID_OPENALEX_RESULT')
        if len(d['results'])>20:raise Hold('TOO_MANY_RESULTS')
        res=[]
        for z in d['results']:
            if not isinstance(z,dict) or not isinstance(z.get('id'),str) or not re.fullmatch(r'https://openalex.org/W\d+',z['id']):raise Hold('WORK_ID_FORMAT')
            tids=[str(t.get('id','')).split('/')[-1] for t in z.get('topics',[]) if isinstance(t,dict)]
            if any(not TOPIC.fullmatch(t) for t in tids):raise Hold('BAD_TOPIC_RESPONSE')
            # Never infer that full HSN semantic identity has been established.
            res.append({'providerId':z['id'],'topicIds':tids,'topicCandidateIntersection':sorted(set(tids)&set(expected_topic_ids)),
                  'publishedDate':z.get('publication_date'),'providerType':z.get('type'),'effect':'METADATA_ONLY'})
    elif provider=='arxiv':
        if b'<!DOCTYPE' in b.upper() or b'<!ENTITY' in b.upper():raise Hold('XML_ENTITY_REJECTED')
        try:root=ET.fromstring(b)
        except Exception:raise Hold('INVALID_ARXIV_ATOM') from None
        ns={'atom':'http://www.w3.org/2005/Atom'}
        res=[]
        for e in root.findall('atom:entry',ns):
            idtext=e.findtext('atom:id',default='',namespaces=ns)
            if not re.fullmatch(r'https?://arxiv.org/abs/[A-Za-z0-9.\-]+',idtext):raise Hold('BAD_ARXIV_ID')
            pub=e.findtext('atom:published',default='',namespaces=ns)
            res.append({'providerId':idtext,'publishedDate':pub,'effect':'METADATA_ONLY'})
        if len(res)>20:raise Hold('TOO_MANY_RESULTS')
    else:raise Hold('PROVIDER_NOT_ALLOWED')
    return {'schema':'atlas.research.fixture-parse/v1','provider':provider,'resultCount':len(res),
        'records':res,'rawFixtureSHA256':sha(b),'fixtureOnly':True,
        'currentRightsVerified':False,'residentAuthenticated':False,'researchFindingValidated':False,
        'authorityEffect':'NONE'}


def mark_work_receipt(job,fixture,source_review):
    """Never grants actual Work execution. Even complete local evidence needs host proof."""
    if job.get('networkExecuted') is not False or job.get('state')!='PREPARED_REQUIRES_TRUSTED_HOST_REVIEW':raise Hold('UNTRUSTED_PREPARE')
    if fixture.get('fixtureOnly') is not True:raise Hold('NON_FIXTURE_FORBIDDEN')
    if not isinstance(source_review,dict) or source_review.get('mode')!='WORK':raise Hold('WORK_SCOPE_REQUIRED')
    _deny_forbidden(source_review)
    if source_review.get('claimedIndependentExpertApproved'):raise Hold('FORGED_PEER_ACCEPTANCE')
    return {'schema':'atlas.research.work-receipt-draft/v1','hsn':job['hsn'],
       'provider':fixture['provider'],'fixtureSHA256':fixture['rawFixtureSHA256'],
       'resultCount':fixture['resultCount'],'sourceReviewRef':source_review.get('sourceReviewRef'),
       'receiptDigest':sha(enc([job['hsn'],fixture['rawFixtureSHA256'],source_review.get('sourceReviewRef')])),
       'trustedHostSignature':None,'actualResearchPerformed':False,
       'semanticAccepted':False,'peerIdentityVerified':False,
       'state':'LOCAL_FIXTURE_ONLY__REQUIRES_HOST_READ_RETURN_AND_EXPERT_REVIEW','canonEffect':'NONE'}

if __name__=='__main__':
    q=BASE/'outputs/RESEARCH_DISPATCH_QUEUE_1728.jsonl'
    with q.open() as f:sample=[json.loads(next(f)) for _ in range(12)]
    result=[prepare_providers(x) for x in sample]
    (BASE/'outputs/RESEARCH_PLANS_SAMPLE_12.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print('Prepared',len(result),'offline provider request envelopes; HTTP calls=0')
