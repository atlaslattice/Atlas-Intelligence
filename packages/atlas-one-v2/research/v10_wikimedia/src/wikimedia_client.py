#!/usr/bin/env python3
"""Opt-in, bounded Wikimedia read-only fetcher. Network OFF by default.

Requires explicit offline plan, human contact URL, real caller authorization,
API-policy acknowledgment, and tiny request budget. No worker/scheduler.
"""
from __future__ import annotations
import argparse, json, os, pathlib, time, urllib.parse, urllib.request, urllib.error
from wikimedia_bridge import WikimediaHold, canonical, digest,QID,normalize_wikipedia_url

ALLOWED_HOSTS = frozenset({'www.wikidata.org','en.wikipedia.org'})
ALLOWED_PREFIXES = {'www.wikidata.org':('/w/api.php',),
                    'en.wikipedia.org':('/w/api.php','/w/rest.php/v1/page/')}

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,request,fp,code,msg,headers,newurl):
        raise WikimediaHold('REDIRECT_REQUIRES_EXPLICIT_REVIEW')

def safe_fetch_url(url):
    if not isinstance(url,str) or len(url)>900:raise WikimediaHold('URL_INVALID')
    p=urllib.parse.urlsplit(url)
    if p.scheme!='https' or p.hostname not in ALLOWED_HOSTS or p.port is not None or p.username or p.password or p.fragment:
        raise WikimediaHold('PROVIDER_HOST_DENIED')
    if not any(p.path.startswith(prefix) for prefix in ALLOWED_PREFIXES[p.hostname]):
        raise WikimediaHold('PROVIDER_PATH_DENIED')
    if p.hostname=='www.wikidata.org':
        params=urllib.parse.parse_qs(p.query,keep_blank_values=True)
        if params.get('action')!=['wbgetentities'] or params.get('format')!=['json'] or set(params)-{'action','ids','props','languages','sitefilter','format'}:
            raise WikimediaHold('WIKIDATA_UNSAFE_ACTION')
        if not isinstance(params.get('ids'),list) or len(params['ids'])!=1 or not QID.fullmatch(params['ids'][0]):
            raise WikimediaHold('ENTITY_ID_REQUIRED')
        if params.get('props')!=['info|labels|descriptions|claims|sitelinks'] or params.get('languages')!=['en'] or params.get('sitefilter')!=['enwiki']:
            raise WikimediaHold('WIKIDATA_QUERY_SCOPE_DENIED')
    if p.hostname=='en.wikipedia.org':
        if p.path.startswith('/w/rest.php/v1/page/'):
            if p.query:raise WikimediaHold('PAGE_QUERY_DENIED')
            normalize_wikipedia_url('https://en.wikipedia.org/wiki/'+p.path.split('/page/',1)[1])
        if p.path=='/w/api.php':
            params=urllib.parse.parse_qs(p.query)
            if params.get('action') not in (['query'],['parse']) or params.get('format')!=['json'] or set(params)-{'action','prop','ppprop','rvprop','rvlimit','titles','redirects','formatversion','format','oldid'}:
                raise WikimediaHold('WIKIPEDIA_UNSAFE_ACTION')
            if params.get('action')==['parse']:
                if set(params)!={'action','oldid','prop','formatversion','format'} or params.get('prop')!=['sections|categories|externallinks'] or params.get('formatversion')!=['2'] or not params.get('oldid',[''])[0].isdigit():
                    raise WikimediaHold('WIKIPEDIA_PARSE_SCOPE_DENIED')
                return url
            if params.get('formatversion')!=['2'] or params.get('prop')!=['info|pageprops|revisions'] or params.get('ppprop')!=['wikibase_item'] or params.get('rvprop')!=['ids|timestamp'] or params.get('rvlimit')!=['1'] or params.get('redirects')!=['1'] or len(params.get('titles',[]))!=1:
                raise WikimediaHold('WIKIPEDIA_QUERY_SCOPE_DENIED')
    return url

def prepare_fetch_batch(urls,contact,*,max_requests=3,min_interval_s=3.0,authorized=False,accepted_policy=False):
    if authorized is not True or accepted_policy is not True:
        raise WikimediaHold('EXPLICIT_OPERATOR_AUTHORIZATION_REQUIRED')
    if not isinstance(contact,str) or not (contact.startswith('https://') and len(contact)<200 and urllib.parse.urlsplit(contact).hostname):
        raise WikimediaHold('CONTACT_URL_REQUIRED')
    if not isinstance(max_requests,int) or not 1<=max_requests<=3 or min_interval_s<3.0:
        raise WikimediaHold('BOUND_OR_THROTTLE_INVALID')
    if not isinstance(urls,list) or len(urls)>max_requests:raise WikimediaHold('BATCH_OVER_BUDGET')
    urls=[safe_fetch_url(x) for x in urls]
    if len(urls)!=len(set(urls)):raise WikimediaHold('DUPLICATE_PROVIDER_REQUEST')
    return {'schema':'atlas.wikimedia.readonly-fetch-batch/v1','urls':urls,
            'userAgent':f'AtlasHSNResearch/0.10 ({contact}) Python-urllib',
            'maxRequests':max_requests,'minIntervalSeconds':min_interval_s,'enabledByOperator':True,
            'noExternalWrites':True,'canPromoteCanon':False,'hostRightsAttested':False}

def execute_fetch_batch(batch,output_dir,*,transport=None,sleeper=time.sleep):
    """Explicitly invoked only; fail closed on 429/503; never auto-retry.

    Real transport returns tuple(status_code, bytes, retry_after); testing replaces it.
    """
    if not isinstance(batch,dict) or batch.get('schema')!='atlas.wikimedia.readonly-fetch-batch/v1' or batch.get('enabledByOperator') is not True:
        raise WikimediaHold('BATCH_NOT_AUTHORIZED')
    urls=batch['urls'];budget=batch['maxRequests']
    if not isinstance(urls,list) or not isinstance(budget,int) or not 1<=budget<=3 or not isinstance(batch.get('minIntervalSeconds'),(int,float)) or batch['minIntervalSeconds']<3.0 or len(urls)>budget:
        raise WikimediaHold('BATCH_OVER_BUDGET')
    for url in urls:safe_fetch_url(url)
    if not isinstance(batch.get('userAgent'),str) or not batch['userAgent'].startswith('AtlasHSNResearch/'):
        raise WikimediaHold('CLIENT_IDENTITY_REQUIRED')
    root=pathlib.Path(output_dir);root.mkdir(mode=0o700,parents=True,exist_ok=True)
    if transport is None:
        def transport(url,ua):
            req=urllib.request.Request(url,headers={'User-Agent':ua,'Accept':'application/json'})
            opener=urllib.request.build_opener(NoRedirect())
            try:
                with opener.open(req,timeout=10) as response:
                    data=response.read(1_500_001)
                    return response.status,data,response.headers.get('Retry-After')
            except urllib.error.HTTPError as exc:
                return exc.code,b'',exc.headers.get('Retry-After')
    results=[]
    for i,url in enumerate(urls):
        if i:sleeper(batch['minIntervalSeconds'])
        try:status,payload,retry_after=transport(url,batch['userAgent'])
        except WikimediaHold:raise
        except Exception:
            results.append({'url':url,'status':'TRANSPORT_UNAVAILABLE','bodyStored':False});break
        if status in (429,503):
            results.append({'url':url,'status':'STOPPED_RATE_LIMIT_OR_UNAVAILABLE','httpStatus':status,
                            'retryAfter':str(retry_after or ''),'bodyStored':False});break
        if status!=200:
            results.append({'url':url,'status':'HTTP_FAILURE','httpStatus':status,'bodyStored':False});break
        if not isinstance(payload,bytes) or len(payload)>1_500_000:raise WikimediaHold('PROVIDER_BYTES_EXCEEDED')
        try:doc=json.loads(payload.decode('utf8','strict'))
        except (UnicodeError,ValueError):raise WikimediaHold('NON_JSON_PROVIDER_RESPONSE')
        if not isinstance(doc,dict):raise WikimediaHold('PROVIDER_RESPONSE_NOT_OBJECT')
        name=digest(url)[:24]+'.json'
        path=root/name
        # Source bytes and licenses belong ONLY in the private sink. No public echo.
        flags=os.O_WRONLY|os.O_CREAT|os.O_EXCL
        fd=os.open(path,flags,0o600)
        with os.fdopen(fd,'wb') as f:f.write(payload)
        results.append({'url':url,'status':'PRIVATE_RAW_SNAPSHOT_STORED','httpStatus':status,
                        'snapshotDigest':digest(payload),'bytes':len(payload),'file':name,
                        'bodyStoredPrivately':True})
    return {'schema':'atlas.wikimedia.fetch-receipt/v1','results':results,'actualRequests':len(results),
            'canonEffect':'NONE','humanReviewed':False,'wikidataStatementsVerified':0,
            'rightsVerifiedByHost':False,'automaticResume':False}

def cli():
    p=argparse.ArgumentParser(description='Read-only bounded Wikimedia snapshots; OFF unless explicitly enabled')
    p.add_argument('--plan',required=True,help='JSON list of preapproved URLs; no discovery')
    p.add_argument('--output-dir',required=True)
    p.add_argument('--contact',required=True,help='Real operator-contact HTTPS URL')
    p.add_argument('--enable-fetch',action='store_true')
    p.add_argument('--accept-wikimedia-policy',action='store_true')
    p.add_argument('--max-requests',type=int,default=3)
    args=p.parse_args()
    if not args.enable_fetch or not args.accept_wikimedia_policy:
        p.error('No network attempted. Requires both --enable-fetch and --accept-wikimedia-policy')
    urls=json.loads(pathlib.Path(args.plan).read_text(encoding='utf8'))
    batch=prepare_fetch_batch(urls,args.contact,max_requests=args.max_requests,authorized=True,accepted_policy=True)
    result=execute_fetch_batch(batch,args.output_dir)
    print(canonical(result))
if __name__=='__main__':cli()
