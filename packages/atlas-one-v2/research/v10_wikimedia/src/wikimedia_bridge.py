#!/usr/bin/env python3
"""Ariadne Wikimedia evidence adapter: inert, provenance-bearing candidates ONLY.

Public-source module: no network traffic, no CANON adoption, no resident identity.
Wikipedia editorial text and Wikidata structured data have different licenses.
"""
from __future__ import annotations
import hashlib, json, re, sqlite3, urllib.parse
from pathlib import Path
from datetime import datetime, timezone

ARIADNE_SHA = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
SCHEMA = 'atlas.ariadne.wikimedia-candidate/v1'
QID = re.compile(r'^Q[1-9]\d{0,11}$')
TOPIC_ID = re.compile(r'^T\d{4,7}$')
HSN = re.compile(r'^H(?:0[1-9]|1[0-2])\.S(?:0[1-9]|1[0-2])\.N(?:0[1-9]|1[0-2])$')
HEX = re.compile(r'^[a-f0-9]{64}$')
PROPERTY = re.compile(r'^P[1-9]\d{0,8}$')
ALLOWED_PROPERTIES = frozenset({'P31','P279','P361','P101','P921','P356','P818','P1476','P1433','P1343'})
FORBIDDEN = frozenset({'canonApproved','sameAsVerified','roleGranted','residentAuthenticated','hostAuthorized',
  'verifiedGain','privateContext','palaceNotes','playJournal','brainMemory','personCredential','humanRatified'})

class WikimediaHold(ValueError): pass

def digest(data):
    if isinstance(data, str): data=data.encode('utf-8','strict')
    return hashlib.sha256(data).hexdigest()

def canonical(data):
    return json.dumps(data,sort_keys=True,ensure_ascii=False,separators=(',',':'),allow_nan=False)

def _obj(x):return isinstance(x,dict) and not FORBIDDEN.intersection(x)

def _ensure(condition,why):
    if not condition:raise WikimediaHold(why)

def normalize_wikipedia_url(value, language='en'):
    """Only a canonical language Wikipedia article URL. Never trust topic name as QID."""
    _ensure(isinstance(value,str) and len(value)<=400 and value==value.strip(),'BAD_WIKIPEDIA_URL')
    p=urllib.parse.urlsplit(value)
    _ensure(p.scheme=='https' and p.hostname==f'{language}.wikipedia.org' and p.port is None
            and not p.username and not p.password and not p.query and not p.fragment,
            'WIKIPEDIA_HOST_OR_QUERY_DENIED')
    _ensure(p.path.startswith('/wiki/') and p.path.count('/')==2,'ARTICLE_PATH_REQUIRED')
    encoded=p.path[6:]; raw=urllib.parse.unquote(encoded,errors='strict')
    _ensure(raw and len(raw)<220 and not re.search(r'[\x00-\x1f\x7f]',raw) and '/' not in raw and '\\' not in raw,
            'INVALID_ARTICLE_TITLE')
    _ensure(not re.match(r'^(?:Special|User|Template|File|Category|Talk|Wikipedia|MediaWiki):',raw,re.I),
            'NONARTICLE_NAMESPACE')
    title=raw.replace('_',' ')
    # Quote only the path segment to avoid URL query or path re-interpretation.
    safe=urllib.parse.quote(title.replace(' ','_'),safe='():,-')
    return {'language':language,'title':title,'articleUrl':f'https://{language}.wikipedia.org/wiki/{safe}'}

def inspect_topic_candidate_display(candidates,visible_count=8):
    """Prevent a truncated view from masquerading as the complete crosswalk.

    This is a structural check of unreviewed candidates, NOT source-semantic review.
    """
    _ensure(isinstance(candidates,list) and len(candidates)<=4516,'TOPIC_CANDIDATE_COLLECTION_INVALID')
    _ensure(isinstance(visible_count,int) and 0<=visible_count<=len(candidates),'VISIBLE_COUNT_INVALID')
    ids=set();primaries=0
    for item in candidates:
        _ensure(_obj(item) and isinstance(item.get('id'),str) and TOPIC_ID.fullmatch(item['id']) and
                isinstance(item.get('rank'),int) and 1<=item['rank']<=5 and item.get('status')=='HISTORICAL_CANDIDATE_NOT_EQUIVALENCE',
                'CANDIDATE_ROW_INVALID')
        _ensure(item['id'] not in ids,'DUPLICATE_TOPIC_NODE_CANDIDATE')
        ids.add(item['id'])
        if item['rank']==1:primaries+=1
    shown=candidates[:visible_count]
    return {'totalCandidates':len(candidates),'primaryCandidates':primaries,
            'alternateCandidates':len(candidates)-primaries,'visibleCandidates':len(shown),
            'omittedCandidates':len(candidates)-len(shown),
            'omittedPrimaryCandidates':primaries-sum(x['rank']==1 for x in shown),
            'allCandidatesUnreviewed':True,'semanticApproval':False}

def openalex_topic_anchor(raw):
    """Recognize an authoritative *topic metadata* link, not a semantic HSN match."""
    _ensure(_obj(raw),'TOPIC_RECORD_INVALID')
    tid=raw.get('id','');tid=tid.rsplit('/',1)[-1] if isinstance(tid,str) else ''
    _ensure(bool(TOPIC_ID.fullmatch(tid)),'OPENALEX_TOPIC_ID_INVALID')
    ids=raw.get('ids',{})
    _ensure(_obj(ids),'TOPIC_IDS_INVALID')
    article=ids.get('wikipedia')
    if not article:return {'topicId':tid,'status':'NO_WIKIPEDIA_ANCHOR','article':None}
    normalized=normalize_wikipedia_url(article)
    return {'topicId':tid,'status':'TOPIC_PAGE_ANCHOR_UNREVIEWED','article':normalized,
            'topicMetadataDigest':digest(canonical({'id':tid,'ids':ids}))}

def page_metadata_request(article):
    _ensure(_obj(article) and article.get('language')=='en','ARTICLE_REFERENCE_INVALID')
    title=normalize_wikipedia_url(article['articleUrl'])['title']
    return f'https://en.wikipedia.org/w/rest.php/v1/page/{urllib.parse.quote(title.replace(" ","_"),safe="():,-")}'

def qid_lookup_request(title):
    normalized=normalize_wikipedia_url('https://en.wikipedia.org/wiki/'+urllib.parse.quote(title.replace(' ','_'),safe='():,-'))
    args=[('action','query'),('prop','info|pageprops|revisions'),('ppprop','wikibase_item'),
          ('rvprop','ids|timestamp'),('rvlimit','1'),('titles',normalized['title']),('redirects','1'),('formatversion','2'),('format','json')]
    return 'https://en.wikipedia.org/w/api.php?'+urllib.parse.urlencode(args)

def page_structure_request(revision_id):
    """Read Wikimedia's own parser output for one exact revision, not a homebrew wiki parser."""
    _ensure(isinstance(revision_id,int) and revision_id>0,'PAGE_REVISION_REQUIRED')
    args=[('action','parse'),('oldid',str(revision_id)),
          ('prop','sections|categories|externallinks'),('formatversion','2'),('format','json')]
    return 'https://en.wikipedia.org/w/api.php?'+urllib.parse.urlencode(args)

def parse_page_structure_response(data,expected_revision):
    _ensure(_obj(data) and _obj(data.get('parse')),'STRUCTURE_RESPONSE_INVALID')
    v=data['parse']
    _ensure(v.get('revid')==expected_revision,'STRUCTURE_REVISION_CHANGED')
    for key in ('sections','categories','externallinks'):
        _ensure(isinstance(v.get(key,[]),list),'STRUCTURE_LIST_INVALID')
    sections=[];categories=[];links=[]
    for item in v.get('sections',[])[:40]:
        if _obj(item) and isinstance(item.get('line'),str):
            sections.append({'heading':item['line'][:140],'level':str(item.get('level',''))[:4]})
    for item in v.get('categories',[])[:40]:
        if _obj(item):
            value=item.get('*',item.get('category'))
            if isinstance(value,str) and len(value)<200:categories.append(value)
    for item in v.get('externallinks',[])[:60]:
        if isinstance(item,str) and len(item)<600:
            try:
                host=urllib.parse.urlsplit(item).hostname
                if host and host not in links and len(host)<120:links.append(host)
            except ValueError:pass
    return {'provider':'Wikipedia MediaWiki parse','revisionId':expected_revision,
            'sections':sections,'categories':categories,'externalLinkHosts':links,
            'status':'STRUCTURAL_LINK_HINTS_NOT_VERIFIED_REFERENCES',
            'rawArticleTextStored':False,'scientificCitationsVerified':0}

def entity_request(qid):
    _ensure(isinstance(qid,str) and bool(QID.fullmatch(qid)),'INVALID_WIKIDATA_ID')
    args=[('action','wbgetentities'),('ids',qid),('props','info|labels|descriptions|claims|sitelinks'),
          ('languages','en'),('sitefilter','enwiki'),('format','json')]
    return 'https://www.wikidata.org/w/api.php?'+urllib.parse.urlencode(args)

def _license(url, title):
    _ensure(isinstance(url,str) and isinstance(title,str),'MISSING_LICENSE')
    # Wikipedia licenses are per-page and versioned; never presume a universal version.
    p=urllib.parse.urlsplit(url if url.startswith('https://') else 'https:'+url if url.startswith('//') else '')
    _ensure(p.scheme=='https' and p.netloc=='creativecommons.org' and p.path.startswith('/licenses/by-sa/'),
            'LICENSE_REVIEW_REQUIRED')
    return {'id':'WIKIPEDIA_CC_BY_SA_REQUIRES_ATTRIBUTION_AND_SHAREALIKE','name':title,'url':url if url.startswith('https:') else 'https:'+url}

def _extract_headings(source, limit=24):
    """Lossy heading hints only, never authoritative wikitext transclusion parsing."""
    _ensure(isinstance(source,str),'SOURCE_WIKITEXT_REQUIRED')
    titles=[]
    for line in source.splitlines():
        m=re.match(r'^(={2,6})\s*(.{1,160}?)\s*\1\s*$',line)
        if m and not any(c in m.group(2) for c in '{}<>[]'):
            titles.append({'level':len(m.group(1)),'heading':m.group(2).strip()[:120]})
            if len(titles)>=limit:break
    return titles

def parse_page_response(data, expected_article):
    _ensure(_obj(data),'WIKIPEDIA_RESPONSE_INVALID')
    norm=normalize_wikipedia_url(expected_article)
    _ensure(isinstance(data.get('id'),int) and data['id']>0,'PAGE_ID_REQUIRED')
    latest=data.get('latest',{})
    _ensure(_obj(latest) and isinstance(latest.get('id'),int) and latest['id']>0 and isinstance(latest.get('timestamp'),str),
            'PAGE_REVISION_REQUIRED')
    _ensure(data.get('title')==norm['title'],'TITLE_REWRITE_REQUIRES_REVIEW')
    _ensure(data.get('content_model')=='wikitext','UNSUPPORTED_CONTENT_MODEL')
    lic=data.get('license')
    _ensure(_obj(lic),'PAGE_LICENSE_REQUIRED')
    license_record=_license(lic.get('url'),lic.get('title'))
    source=data.get('source')
    _ensure(isinstance(source,str) and len(source)<=2_000_000,'BOUNDED_ARTICLE_SOURCE_REQUIRED')
    return {'provider':'Wikipedia','pageId':data['id'],'revisionId':latest['id'],
            'revisionTimestamp':latest['timestamp'],'title':norm['title'],'url':norm['articleUrl'],
            'sourceSHA256':digest(source),'sourceBytes':len(source.encode('utf-8')),
            'headings':_extract_headings(source),'license':license_record,
            'attribution':{'credit':'Wikipedia contributors','articleUrl':norm['articleUrl'],
                'revisionUrl':norm['articleUrl']+'?oldid='+str(latest['id']),
                'historyUrl':norm['articleUrl']+'?action=history','licenseUrl':license_record['url']},
            'textStored':False,'parsingStatus':'LOSSY_HEADINGS_ONLY_NOT_FULL_WIKITEXT'}

def parse_pageprops_response(data, expected_page_id):
    _ensure(_obj(data) and _obj(data.get('query')),'PAGEPROPS_RESPONSE_INVALID')
    pages=data['query'].get('pages')
    _ensure(isinstance(pages,list) and len(pages)==1 and _obj(pages[0]),'PAGEPROPS_CARDINALITY_INVALID')
    p=pages[0]
    _ensure(p.get('pageid')==expected_page_id,'PAGE_ID_MISMATCH')
    _ensure(_obj(p.get('pageprops')),'PAGEPROPS_SHAPE_INVALID')
    revs=p.get('revisions',[])
    _ensure(isinstance(revs,list) and len(revs)==1 and _obj(revs[0]) and isinstance(revs[0].get('revid'),int) and revs[0]['revid']>0,'PAGEPROPS_REVISION_REQUIRED')
    qid=p['pageprops'].get('wikibase_item')
    _ensure(isinstance(qid,str) and bool(QID.fullmatch(qid)),'WIKIDATA_ID_NOT_RESOLVED')
    return {'pageId':expected_page_id,'revisionId':revs[0]['revid'],'qid':qid,'wikibaseItemStatus':'PAGEPROPS_SOURCE_REPORTED'}

def _claim_value(mainsnak):
    if not _obj(mainsnak) or mainsnak.get('snaktype')!='value':return None
    d=mainsnak.get('datavalue')
    if not _obj(d):return None
    v=d.get('value')
    if d.get('type')=='wikibase-entityid' and _obj(v) and QID.fullmatch(str(v.get('id',''))):
        return {'type':'QID','value':v['id']}
    if d.get('type')=='string' and isinstance(v,str) and len(v)<200:
        return {'type':'string','value':v}
    # Time/quantity need modeling units and uncertainty; no unsourced conversion.
    return None

def parse_entity_response(data,qid,max_statements=80):
    _ensure(_obj(data) and isinstance(qid,str) and QID.fullmatch(qid),'ENTITY_RESPONSE_INVALID')
    entities=data.get('entities')
    _ensure(_obj(entities) and _obj(entities.get(qid)),'ENTITY_ID_MISMATCH')
    v=entities[qid];_ensure(v.get('id')==qid and isinstance(v.get('lastrevid'),int) and v['lastrevid']>0,'ENTITY_REVISION_INVALID')
    title=v.get('sitelinks',{}).get('enwiki',{}).get('title')
    _ensure(isinstance(title,str) and len(title)<220,'ENWIKI_SITELINK_REQUIRED')
    labels=v.get('labels',{})
    label=labels.get('en',{}).get('value','') if isinstance(labels,dict) else ''
    _ensure(isinstance(label,str) and len(label)<350,'LABEL_INVALID')
    claims=v.get('claims',{});_ensure(_obj(claims),'CLAIMS_INVALID')
    out=[];has_human=False
    for prop in sorted(ALLOWED_PROPERTIES):
        raw=claims.get(prop,[])
        _ensure(isinstance(raw,list),'CLAIM_PROPERTY_SHAPE')
        for claim in raw:
            _ensure(_obj(claim) and claim.get('mainsnak',{}).get('property')==prop,'CLAIM_SHAPE')
            val=_claim_value(claim['mainsnak'])
            if not val:continue
            if prop=='P31' and val=={'type':'QID','value':'Q5'}:has_human=True
            if len(out)>=max_statements:break
            out.append({'property':prop,'value':val,'rank':claim.get('rank','normal'),
                        'statementId':claim.get('id',''),
                        'referenceCount':len(claim.get('references',[]) or []),
                        'status':'STRUCTURED_SOURCE_CANDIDATE_NOT_VERIFIED'})
    _ensure(not has_human,'BIOGRAPHICAL_ITEM_REQUIRES_SEPARATE_PRIVACY_REVIEW')
    return {'provider':'Wikidata','qid':qid,'revisionId':v['lastrevid'],'label':label,
            'enwikiTitle':title,'license':{'id':'CC0_STRUCTURED_DATA','url':'https://creativecommons.org/publicdomain/zero/1.0/'},
            'statements':out,'statementCount':len(out),'statementsTruncated':len(out)>=max_statements,
            'authorityEffect':'NONE'}

def prepare_hsn_candidate(hsn_record,topic_anchor,page_record,pageprops,entity,*,mode='WORK',consent=False):
    _ensure(mode=='WORK' and consent is True,'WORK_RIGHTS_OR_CONSENT_REQUIRED')
    _ensure(all(_obj(x) for x in (hsn_record,topic_anchor,page_record,pageprops,entity)),'RECORD_SHAPE_OR_PRIVATE_FIELD')
    coord=hsn_record.get('coordinate')
    _ensure(isinstance(coord,str) and bool(HSN.fullmatch(coord)),'HSN_COORDINATE_INVALID')
    _ensure(hsn_record.get('registryDigest')==ARIADNE_SHA and HEX.fullmatch(hsn_record.get('nodeDigest','')),
            'ARIADNE_SOURCE_PIN_REQUIRED')
    _ensure(hsn_record.get('role')=='DOMAIN_SPECIALIZATION','META_REQUIRES_EXPLICIT_SUBJECT_SCOPE')
    _ensure(topic_anchor.get('status')=='TOPIC_PAGE_ANCHOR_UNREVIEWED','TOPIC_ARTICLE_ANCHOR_MISSING')
    url=topic_anchor['article']['articleUrl']
    _ensure(page_record.get('url')==url,'PAGE_URL_CHANGED')
    _ensure(pageprops.get('pageId')==page_record.get('pageId') and pageprops.get('revisionId')==page_record.get('revisionId'),'PAGEPROPS_REVISION_MISMATCH')
    _ensure(pageprops.get('qid')==entity.get('qid'),'WIKIDATA_ID_CONFLICT')
    _ensure(entity.get('enwikiTitle')==page_record.get('title'),'SITELINK_TITLE_CONFLICT')
    _ensure(isinstance(topic_anchor.get('topicMetadataDigest'),str) and HEX.fullmatch(topic_anchor['topicMetadataDigest']),'TOPIC_METADATA_DIGEST_REQUIRED')
    _ensure(entity.get('license',{}).get('id')=='CC0_STRUCTURED_DATA','STRUCTURED_DATA_LICENSE_MISSING')
    t=topic_anchor['topicId']
    payload={'schema':SCHEMA,'hsn':coord,'registryDigest':ARIADNE_SHA,'nodeDigest':hsn_record['nodeDigest'],
         'openalexTopicId':t,'openalexMetadataDigest':topic_anchor['topicMetadataDigest'],'openalexAnchorStatus':'UNREVIEWED','wikipediaPageId':page_record['pageId'],
         'wikipediaRevision':page_record['revisionId'],'wikipediaSourceSHA256':page_record['sourceSHA256'],
         'wikipediaUrl':url,'wikipediaLicense':page_record['license'],
         'wikidataId':entity['qid'],'wikidataRevision':entity['revisionId'],
         'wikidataLicense':entity['license'],'wikidataStatementCount':entity['statementCount'],
         'relation':'ABOUTNESS_CANDIDATE_ONLY','status':'REVIEW_CANDIDATE_NOT_CANON',
         'semanticEquivalent':False,'sourceAuthoritative':False,'humanAccepted':False,
         'rightsVerifiedByHost':False,'noRawArticleTextInCandidate':True,'canonEffect':'NONE',
         'requiresIndependentCitationVerification':True}
    return {**payload,'candidateDigest':digest(canonical(payload))}

DDL = '''CREATE TABLE IF NOT EXISTS sources(provider TEXT NOT NULL,source_id TEXT NOT NULL,revision INTEGER NOT NULL,digest TEXT NOT NULL,license_id TEXT NOT NULL,meta_json TEXT NOT NULL,PRIMARY KEY(provider,source_id,revision));
CREATE TABLE IF NOT EXISTS wikidata_statements(qid TEXT NOT NULL,revision INTEGER NOT NULL,statement_id TEXT NOT NULL,property TEXT NOT NULL,value_json TEXT NOT NULL,rank TEXT NOT NULL,reference_count INTEGER NOT NULL,review_status TEXT NOT NULL,PRIMARY KEY(qid,revision,statement_id));
CREATE TABLE IF NOT EXISTS candidates(candidate_digest TEXT PRIMARY KEY,hsn TEXT NOT NULL,topic_id TEXT NOT NULL,qid TEXT NOT NULL,source_page_id INTEGER NOT NULL,source_revision INTEGER NOT NULL,status TEXT NOT NULL,record_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS decisions(candidate_digest TEXT NOT NULL,review_id TEXT NOT NULL,review_type TEXT NOT NULL,review_note_digest TEXT NOT NULL,source_rights_epoch TEXT NOT NULL,PRIMARY KEY(candidate_digest,review_id));'''

def initialize_evidence_db(path):
    db=sqlite3.connect(path);db.executescript(DDL);db.commit();return db

def store_unreviewed_candidate(db,candidate,page,entity):
    _ensure(_obj(candidate) and candidate.get('schema')==SCHEMA,'CANDIDATE_SCHEMA_INVALID')
    _ensure(candidate.get('status')=='REVIEW_CANDIDATE_NOT_CANON' and candidate.get('canonEffect')=='NONE' and
            candidate.get('humanAccepted') is False and candidate.get('semanticEquivalent') is False,
            'UNAUTHORIZED_PROMOTION')
    d=candidate['candidateDigest'];payload={k:v for k,v in candidate.items() if k!='candidateDigest'}
    _ensure(digest(canonical(payload))==d,'CANDIDATE_TAMPERED')
    _ensure(page.get('pageId')==candidate.get('wikipediaPageId') and page.get('revisionId')==candidate.get('wikipediaRevision') and page.get('sourceSHA256')==candidate.get('wikipediaSourceSHA256'),'SOURCE_PAGE_SNAPSHOT_CHANGED')
    _ensure(entity.get('qid')==candidate.get('wikidataId') and entity.get('revisionId')==candidate.get('wikidataRevision'),'SOURCE_ENTITY_SNAPSHOT_CHANGED')
    _ensure(isinstance(entity.get('statements'),list) and len(entity['statements'])<=80,'BOUNDED_STATEMENT_RECORDS_REQUIRED')
    pmeta={'url':page['url'],'license':page['license'],'sourceBytes':page['sourceBytes'],'textStored':False}
    emeta={'qid':entity['qid'],'license':entity['license'],'statementCount':entity['statementCount']}
    with db:
        db.execute('INSERT OR IGNORE INTO sources VALUES (?,?,?,?,?,?)',('Wikipedia',str(page['pageId']),page['revisionId'],page['sourceSHA256'],page['license']['id'],canonical(pmeta)))
        db.execute('INSERT OR IGNORE INTO sources VALUES (?,?,?,?,?,?)',('Wikidata',entity['qid'],entity['revisionId'],digest(canonical(entity)),entity['license']['id'],canonical(emeta)))
        for ix,stmt in enumerate(entity['statements']):
            _ensure(_obj(stmt) and stmt.get('property') in ALLOWED_PROPERTIES and stmt.get('status')=='STRUCTURED_SOURCE_CANDIDATE_NOT_VERIFIED' and stmt.get('rank') in ('preferred','normal','deprecated') and isinstance(stmt.get('referenceCount'),int) and stmt['referenceCount']>=0,'UNSAFE_WIKIDATA_STATEMENT')
            statement_id=stmt.get('statementId') or digest(canonical({'i':ix,'statement':stmt}))[:40]
            _ensure(isinstance(statement_id,str) and len(statement_id)<200,'STATEMENT_ID_INVALID')
            db.execute('INSERT OR IGNORE INTO wikidata_statements VALUES (?,?,?,?,?,?,?,?)',(entity['qid'],entity['revisionId'],statement_id,stmt['property'],canonical(stmt['value']),stmt['rank'],stmt['referenceCount'],'UNREVIEWED_SOURCE_ONLY'))
        old=db.execute('SELECT record_json FROM candidates WHERE candidate_digest=?',(d,)).fetchone()
        _ensure(old is None or old[0]==canonical(candidate),'CONFLICTING_CANDIDATE_RECORD')
        db.execute('INSERT OR IGNORE INTO candidates VALUES (?,?,?,?,?,?,?,?)',(d,candidate['hsn'],candidate['openalexTopicId'],candidate['wikidataId'],page['pageId'],page['revisionId'],candidate['status'],canonical(candidate)))
    return {'status':'STORED_CANDIDATE_ONLY','candidateDigest':d,'canonTablesCreated':False,'sources':db.execute('SELECT count(*) FROM sources').fetchone()[0],
            'candidates':db.execute('SELECT count(*) FROM candidates').fetchone()[0],
            'wikidataStatementsUnreviewed':db.execute('SELECT count(*) FROM wikidata_statements').fetchone()[0]}
