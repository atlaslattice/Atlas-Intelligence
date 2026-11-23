#!/usr/bin/env python3
"""Finite research handoff, no implicit network/agent calls or scheduled wakes.

Every request requires an external trusted host admission and authorized provider
transport; this local queue only PREPARES work and verifies source-neutral receipts.
"""
from __future__ import annotations
import hashlib,json,collections
from datetime import datetime,timedelta,timezone
from urllib.parse import urlsplit,parse_qs,urlencode
from research_bridge import safe_topic_request,safe_arxiv_request,SourceHold,canonical,sha256

ALLOWED_STATES={'PREPARED_OFFLINE','HOST_APPROVAL_REQUIRED','FETCHED_UNVERIFIED','REVIEW_CANDIDATE','NO_MATCH','HOLD'}

def valid_request(req):
    if not isinstance(req,dict) or 'url' not in req or req.get('status')!='PREPARED_NOT_FETCHED':
        raise SourceHold('REQUEST_NOT_PREPARED')
    if req.get('kind')=='TOPIC_SINGLETON':
        expected=safe_topic_request(req.get('topicId'))
        if req!=expected:raise SourceHold('OPENALEX_REQUEST_TAMPER')
    elif req.get('kind')=='CATEGORY_QUERY_SEED':
        # Caller supplies exact query as produced by audited compiler (no arbitrary URL).
        cat=req.get('category');q=req.get('query')
        if not isinstance(q,str) or not q.startswith('cat:'+cat+' AND all:') or len(q)>140:
            raise SourceHold('ARXIV_QUERY_TAMPER')
        if urlsplit(req['url']).netloc!='export.arxiv.org' or urlsplit(req['url']).scheme!='https' or urlsplit(req['url']).fragment or urlsplit(req['url']).username:
            raise SourceHold('ARXIV_PROVIDER_TAMPER')
        qp=parse_qs(urlsplit(req['url']).query)
        if qp.get('search_query')!=[q] or qp.get('max_results')!=['5'] or qp.get('start')!=['0'] or len(qp)!=5 or qp.get('sortBy')!=['submittedDate'] or qp.get('sortOrder')!=['descending']:
            raise SourceHold('ARXIV_PARAMS_TAMPER')
        from research_bridge import ARXIV
        if not isinstance(cat,str) or not ARXIV.fullmatch(cat) or req['url'] != 'https://export.arxiv.org/api/query?'+urlencode({'search_query':q,'start':0,'max_results':5,'sortBy':'submittedDate','sortOrder':'descending'}):
            raise SourceHold('ARXIV_REQUEST_NOT_EXACT')
        if set(req)!={'provider','kind','category','query','url','delaySeconds','maxResults','status','requiresNetworkOptIn','providerTermsApply'}:
            raise SourceHold('ARXIV_REQUEST_EXTRA_FIELDS')
        if req.get('delaySeconds')!=3 or req.get('requiresNetworkOptIn') is not True:
            raise SourceHold('ARXIV_RATE_POLICY_TAMPER')
    else:raise SourceHold('UNSUPPORTED_REQUEST_KIND')
    return True

def prepare_research_visit(requests,max_items=12,allow_paid=False,network=False,already_processed=()):
    if network or allow_paid: raise SourceHold('NETWORK_AND_SPENDING_NOT_GRANTED_IN_LOCAL_ROUTER')
    if not isinstance(max_items,int) or max_items<1 or max_items>24:raise SourceHold('INVALID_BATCH_LIMIT')
    seen=set(already_processed);selected=[];stats=collections.Counter()
    for q in requests:
        valid_request(q)
        if q['url'] in seen:stats['deduplicated']+=1;continue
        seen.add(q['url']);selected.append({'requestDigest':sha256(canonical(q).encode('utf-8')),
              'provider':q['provider'],'kind':q['kind'],'url':q['url'],
              'status':'HOST_APPROVAL_REQUIRED','sourceAuthority':'NONE','requiresRightsAtReadAndReturn':True})
        if len(selected)==max_items:break
    result={'schema':'atlas.hsn.research-visit/v0.1','status':'PREPARED_OFFLINE',
            'items':selected,'counts':{'prepared':len(selected),'deduplicated':stats['deduplicated'],
                                     'executed':0,'verifiedMatches':0},
            'noAutonomousWakes':True,'noNetworking':True,'noExpenses':True,
            'hostPermissionsGranted':False,'residentExpertAssigned':False,'canonEffect':'NONE'}
    result['digest']=sha256(canonical(result).encode())
    return result

def simulate_snapshot_response(plan,fixture_titles):
    """Mock transport test only; it cannot turn any row into real API evidence."""
    if plan.get('status')!='PREPARED_OFFLINE':raise SourceHold('PLAN_STATUS_DENIED')
    receipts=[]
    for x in plan['items']:
        if x['url'] not in fixture_titles:continue
        title=fixture_titles[x['url']]
        if not isinstance(title,str) or len(title)>300:raise SourceHold('BAD_MOCK_TITLE')
        receipts.append({'requestDigest':x['requestDigest'],'status':'MOCK_ONLY_NOT_FETCHED',
                        'syntheticSourceSHA256':sha256(title.encode()),
                        'subjectPreview':title,'authorityEffect':'NONE','peerReviewed':False,
                        'hostFetched':False})
    return {'schema':'atlas.hsn.synthetic-provider-fixture/v0.1','synthetic':True,'receipts':receipts,
            'count':len(receipts),'externalRequests':0,'approvedMatches':0}

def verify_opt_in_nomination(nomination,expected_slot):
    """A valid submission remains a self-declared REVIEW_CANDIDATE, never an appointment."""
    allowed={'slot','mode','optIn','sourceRefs','originalContribution','falsifier','status'}
    if not isinstance(nomination,dict) or set(nomination)!=allowed or nomination['slot']!=expected_slot:
        raise SourceHold('NOMINATION_SCOPE')
    if nomination['mode']!='WORK' or nomination['optIn'] is not True or nomination['status']!='REQUEST_REVIEW':
        raise SourceHold('NOMINATION_CONSENT')
    if not isinstance(nomination['sourceRefs'],list) or not 1<=len(nomination['sourceRefs'])<=12:
        raise SourceHold('NOMINATION_EVIDENCE_MISSING')
    if any(not isinstance(x,str) or len(x)<8 for x in nomination['sourceRefs']):raise SourceHold('NOMINATION_REFERENCE_INVALID')
    if not isinstance(nomination['originalContribution'],str) or len(nomination['originalContribution'].strip())<30:
        raise SourceHold('ORIGINALITY_EVIDENCE_NEEDED')
    if not isinstance(nomination['falsifier'],str) or len(nomination['falsifier'].strip())<15:
        raise SourceHold('FALSIFIER_NEEDED')
    return {'status':'SELF_DECLARED_NOMINATION_REVIEW_CANDIDATE','slot':expected_slot,
            'scopeOnly':True,'hostIdentityAuthenticated':False,'roleGranted':False,
            'reviewed':False,'meritScore':None,'canonEffect':'NONE'}

def to_existing_atlas_work_burst(research_visit):
    """Exact data-only input envelope for existing PR #19 LOCAL Work-burst runner.

    Does not call the runner, invoke an API, create a room or grant authority.
    It is NOT a new orchestration control plane.
    """
    if not isinstance(research_visit,dict) or research_visit.get('status')!='PREPARED_OFFLINE' or research_visit.get('hostPermissionsGranted') is not False:
        raise SourceHold('WORK_BRIDGE_VISIT_STATUS')
    items=research_visit.get('items')
    if not isinstance(items,list) or len(items)>24: raise SourceHold('WORK_BRIDGE_LIMIT')
    tasks=[]
    for i,q in enumerate(items):
        if not isinstance(q,dict) or q.get('status')!='HOST_APPROVAL_REQUIRED' or q.get('sourceAuthority')!='NONE':
            raise SourceHold('WORK_BRIDGE_ATTEMPTED_AUTHORITY')
        tasks.append({'id':f'research{i+1:02d}','operator':'LOCAL_RESEARCH_SOURCE_CHECK','mode':'WORK',
          'dependsOn':[],'resourceKey':'atlas-research-source-staging',
          'input':{'requestDigest':q['requestDigest'],'provider':q['provider'],
                   'requestKind':q['kind'],'url':q['url'],'dryRun':True},
          'evidenceRefs':['source:ariadne-v0.7-original-sha256','source:openalex-frozen-crosswalk-v2026'],
          'dissentRefs':[],'noHarvest':False})
    return {'schema':'atlas.one.local-work-burst-input/v1','status':'PREPARED_LOCAL_ONLY',
            'tasks':tasks,'maxParallel':4,'hostedVerified':False,
            'canPublish':False,'noAutomaticPosts':True,'noNetworkEffects':True}
