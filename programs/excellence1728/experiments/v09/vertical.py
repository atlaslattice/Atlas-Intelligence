"""Atlas Vertical 0.9: 1728 distinct source-bound local E2E slice fixtures.
An orchestration/evidence experiment, NOT 1728 hosted knowledge experts.
Read-only; no model, I/O in worker beyond private pinned source, or external Work action.
"""
from __future__ import annotations
import concurrent.futures,collections,hashlib,json,os,re,statistics,time
from dataclasses import dataclass
from pathlib import Path

ORIGINAL_SHA='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
SCHEMA='atlas.vertical.source-bound-slice/v09'
COORD=re.compile(r'^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$')
SHA=re.compile(r'^[0-9a-f]{64}$')
WORD=re.compile(r'[a-z][a-z0-9-]{2,}')
STOP=set('the and for with into within from whose through other whose these this that whose whose would needs whose must whose where using scoped source node house sphere questions methods observations artifacts particular primary focus includes required group matter domain specialization editorial knowledge historical records design evidence general public research within some adjacent independently relevant specific topics information given explicit requires each data model system work subject state source-only method related methods question status'.split())
HOUSE_MODULES=('constraint-ledger','resource-closure','resilience-connectivity','observational-evidence-fence','typed-knowledge-edge','revocable-rights-lease','double-entry-governance','cultural-consent','dissent-preservation','sovereignty-consent','noncompensatory-rights','dimensional-feasibility')
GATES=('source_exact','record_present','node_identity','parent_identity','role_correct','definition_present','includes_present','excludes_present','house_kernel_positive','house_kernel_negative','subject_boundary','permission_hold')
SOURCE=None

def canonical(x):return json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode()
def hashobj(x):return hashlib.sha256(canonical(x)).hexdigest()
def sha_file(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def hsn_of(i):return f'H{i//144+1:02d}.S{(i//12)%12+1:02d}.N{i%12+1:02d}'
def house_of(hsn):return int(hsn[1:3])
def sphere_of(hsn):return int(hsn[5:7])
def role_of(hsn):return 'DOMAIN_SPECIALIZATION' if sphere_of(hsn)<=7 else 'EPISTEMIC_META'
def normalize_words(txt):return frozenset(w for w in WORD.findall(str(txt).lower()) if w not in STOP)

class Catalog:
    def __init__(self,path):
        path=Path(path);raw=path.read_bytes()
        if hashlib.sha256(raw).hexdigest()!=ORIGINAL_SHA:raise ValueError('ARIADNE_SOURCE_BYTES_UNVERIFIED')
        data=json.loads(raw)
        if set(data)!={'houses','spheres','nodes','catalog'} or (len(data['houses']),len(data['spheres']),len(data['nodes']))!=(12,144,1728):raise ValueError('ARIADNE_TOPOLOGY_MISMATCH')
        self.path=path;self.source_verified=True;self.nodes=[];self.words=[];self.postings=collections.defaultdict(set)
        self.houses=data['houses'];self.spheres=data['spheres'];self.by_id={}
        for i in range(1728):
            hsn=hsn_of(i);n=data['nodes'].get(hsn)
            if not isinstance(n,dict) or n.get('id')!=hsn or n.get('parent')!=hsn[:7] or n.get('kind')!=role_of(hsn) or not SHA.fullmatch(str(n.get('source_record_sha256',''))):raise ValueError('ARIADNE_NODE_IDENTITY_'+hsn)
            for k in ('name','definition','includes','excludes'):
                if not isinstance(n.get(k),str) or len(n[k].strip())<6:raise ValueError('ARIADNE_SCOPE_MISSING_'+hsn)
            if not isinstance(self.houses.get(hsn[:3]),dict) or not isinstance(self.spheres.get(hsn[:7]),dict):raise ValueError('ARIADNE_PARENT_MISSING_'+hsn)
            self.nodes.append(n);self.by_id[hsn]=n
            terms=normalize_words(n['name']+' '+n['definition'])
            self.words.append(terms)
            for term in terms:self.postings[term].add(i)
        self.pins=tuple(n['source_record_sha256'] for n in self.nodes)
    def best_cross(self,i,optimized=True):
        """Exact best lexical Jaccard across OTHER Houses, same role; all ties deterministic.
        Neither cross-house candidate nor high lexical match is accepted semantics.
        """
        words=self.words[i]; house=i//144;role=sphere_of(hsn_of(i))<=7
        if optimized:
            pool=set()
            for t in words:pool.update(self.postings[t])
        else:pool=range(1728)
        top=None;interbest=0;unionbest=1
        for j in pool:
            if j//144==house or (sphere_of(hsn_of(j))<=7)!=role:continue
            inter=len(words & self.words[j]);
            if not inter:continue
            union=len(words | self.words[j])
            if top is None or inter*unionbest>interbest*union or (inter*unionbest==interbest*union and (inter>interbest or (inter==interbest and j<top))):
                top=j;interbest=inter;unionbest=union
        if top is None:return None,0,0,0
        return hsn_of(top),(10000*interbest)//unionbest,interbest,unionbest

def kernel(h,n):
    """Twelve distinct synthetic algorithms with POSITIVE and NEGATIVE controls.
    No domain science, social permission or physical safety is inferred.
    """
    seed=int(n['source_record_sha256'][:12],16);a=seed%89+11;b=(seed//89)%79+9
    positive=False;negative=False
    if h==1: # unit-consistent symbolic conservation equation
        positive=((a+b)-a-b)==0
        negative=((a+b)-a-(b+1))!=0
        out=('residual',0,-1)
    elif h==2: # resource accounting and overspend rejection
        supply=a+b;positive=supply-a-b==0
        negative=supply-(a+1)-b<0;out=('inventory',supply,a,b)
    elif h==3: # actual BFS path / missing-bridge falsifier
        def reachable(edges):
            seen={1};pending=[1]
            while pending:
                for nxt in edges.get(pending.pop(0),[]):
                    if nxt not in seen:seen.add(nxt);pending.append(nxt)
            return seen
        edges={1:[2],2:[3],3:[4],4:[]}
        positive=4 in reachable(edges)
        negative=4 not in reachable({1:[2],2:[],3:[4],4:[]})
        out=('reachable-original',len(reachable(edges)),'cut-rejected',negative)
    elif h==4: # observational evidence explicitly not causal
        observed={'kind':'OBSERVATIONAL','values':(a,b,a+b)}
        positive=observed['kind']=='OBSERVATIONAL' and sum(observed['values'])>0
        negative={'kind':'CAUSAL'}['kind']!='OBSERVATIONAL'
        out=('evidence-type',observed['kind'],sum(observed['values']))
    elif h==5: # typed source graph; same-as can't be assumed
        edges=[('node','sphere','CHILD_OF'),('sphere','house','CHILD_OF')]
        positive=len(edges)==2 and all(x[2]=='CHILD_OF' for x in edges)
        negative=('node','house','SAME_AS') not in edges
        out=('typed-graph',edges)
    elif h==6: # independent READ / RETURN permission version
        lease=lambda read,ret:read==ret
        positive=lease(a,a);negative=not lease(a,a+1)
        out=('permission-epoch-check',a,'changed-on-return-HOLD')
    elif h==7: # double entry balance
        debit=[a,b];credit=[a+b];positive=sum(debit)==sum(credit)
        negative=sum(debit)!=sum(credit)+1
        out=('double-entry',sum(debit),sum(credit))
    elif h==8: # creative space voluntary; no auto Work export
        allowed=lambda mode,optin:mode=='IMAGINE_LOCAL' and optin is True
        positive=allowed('IMAGINE_LOCAL',True)
        negative=not allowed('WORK_AUTOMATIC',False)
        out=('creative-isolation','optin-local-only',not allowed('WORK_AUTOMATIC',False))
    elif h==9: # preserve both supportive and dissenting evidence
        views={'SUPPORTS':a,'CHALLENGES':b}
        positive=len(views)==2 and all(views.values())
        negative=len({'SUPPORTS':a})!=len(views)
        out=('dissent-preservation',views)
    elif h==10: # sovereignty consent rule is independent of apparent utility
        allow=lambda consent:consent is True
        positive=allow(True);negative=not allow(False)
        out=('sovereignty-consent','explicit-required')
    elif h==11: # rights cannot be compensated with arbitrarily high utility
        may_execute=lambda rights,benefit:rights is True and benefit>=0
        positive=may_execute(True,a)
        negative=not may_execute(False,a+b)
        out=('rights-first',True,'hard-denial-when-missing')
    else: # unit-dimensioned toy feasibility equation
        budget=a+b;need=a;reserve=b
        admissible=lambda in_units,capacity,requirements:in_units=='synthetic-unit' and capacity>=requirements
        positive=admissible('synthetic-unit',budget,need+reserve)
        negative=not admissible('wrong-unit',budget,need+reserve)
        out=('dimensional-feasibility','synthetic-unit',budget,need,reserve)
    if not (positive and negative):raise AssertionError('HOUSE_ALGORITHM_POSITIVE_OR_NEGATIVE_FAILED')
    return HOUSE_MODULES[h-1],hashobj(out),bool(positive),bool(negative)

def local_host_authority(untrusted_claims):
    """No independent issuer or room ACL is available in this local engine.
    User-supplied identity booleans, source hashes and member keys cannot grant rights.
    """
    return 'HOLD_REAL_ISSUER_AND_WORK_ACL'


_CATALOG=None

def init_worker(path):
    global _CATALOG;_CATALOG=Catalog(path)

def node_slice(i):
    cat=_CATALOG
    if cat is None:raise RuntimeError('SOURCE_NOT_INITIALIZED')
    n=cat.nodes[i];hsn=hsn_of(i);h=house_of(hsn);role=role_of(hsn);module,kernelRoot,positive,negative=kernel(h,n)
    link,score,inter,union=cat.best_cross(i,optimized=True)
    subject=(f'H{h:02d}.S01.N01' if role=='EPISTEMIC_META' else None)
    checks={
        'source_exact':cat.source_verified,
        'record_present':isinstance(n.get('source_record_sha256'),str) and bool(SHA.fullmatch(n['source_record_sha256'])),
        'node_identity':n.get('id')==hsn,
        'parent_identity':n.get('parent')==hsn[:7],
        'role_correct':n.get('kind')==role,
        'definition_present':isinstance(n.get('definition'),str) and len(n['definition'])>6,
        'includes_present':isinstance(n.get('includes'),str) and len(n['includes'])>6,
        'excludes_present':isinstance(n.get('excludes'),str) and len(n['excludes'])>6,
        'house_kernel_positive':positive,
        'house_kernel_negative':negative,
        'subject_boundary':subject is None if role=='DOMAIN_SPECIALIZATION' else (subject in cat.by_id and subject[:3]==hsn[:3] and role_of(subject)=='DOMAIN_SPECIALIZATION'),
        'permission_hold':local_host_authority({'member_id':'self-declared','caller_allowed':True})=='HOLD_REAL_ISSUER_AND_WORK_ACL'
    }
    if set(checks)!=set(GATES) or not all(checks.values()):raise AssertionError('LOCAL_GATE_FAILED')
    metric={ 'id':hsn, 'kind':'LEXICAL_CROSS_HOUSE_SIGNAL_NOT_KNOWLEDGE_GAIN','basisPoints':score,
             'sourceBytesVerified':True,'scopeGatesPassed':len(checks),'scopeGatesTotal':len(checks),
             'differentHouseCandidate':link is not None,'sharedTerms':inter,'unionTerms':union}
    # A publication/Work host gate is not simulated into existence.
    rec={ 'schema':SCHEMA,'id':hsn,'house':hsn[:3],'sphere':hsn[:7],
          'name':n['name'],'sourceSha256':ORIGINAL_SHA,'recordSha256':n['source_record_sha256'],'role':role,
          'module':module,'moduleOutputSha256':kernelRoot,'subjectNodeId':subject,
          'subjectStatus':'LOCAL_SYNTHETIC_FIXTURE_NOT_INDEPENDENTLY_REVIEWED' if subject else 'DOMAIN_SOURCE_ONLY',
          'crossCandidateId':link,'crossSimilarityBp':score,'crossSharedTerms':inter,'crossUnionTerms':union,
          'reviewStatus':'UNREVIEWED','localStatus':'SOURCE_PINNED_LOCAL_E2E_PASS',
          'hostStatus':'HOLD_REAL_ISSUER_AND_WORK_ACL','negativeProbeHold':True,
          'sourceDefinitionAvailable':True,'sourceIncludesAvailable':True,'sourceExcludesAvailable':True,
          'metric':metric,'checks':checks,'originMode':'WORK_METADATA_ONLY',
          'actualPeerTurns':0,'providerCalls':0,'externalWrites':0,'canonChanged':False,'modelWeightsChanged':False}
    # Stable portable receipt used by independent JS/Node reconciliation.
    proof=['ATLAS_VERTICAL_V09',hsn,ORIGINAL_SHA,n['source_record_sha256'],role,module,kernelRoot,subject,link,score,rec['localStatus'],rec['hostStatus'],True]
    rec['receiptSha256']=hashlib.sha256(json.dumps(proof,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
    return rec

def run_all(source,outdir,workers=4):
    cat=Catalog(source);out=Path(outdir);out.mkdir(parents=True,exist_ok=True)
    begin=time.perf_counter()
    if workers==1:
        init_worker(source);records=[node_slice(i) for i in range(1728)]
        workerKind='ONE_PROCESS_SEQUENTIAL'
    else:
        with concurrent.futures.ProcessPoolExecutor(max_workers=workers,initializer=init_worker,initargs=(str(source),)) as pool:
            records=list(pool.map(node_slice,range(1728),chunksize=12))
        workerKind='REAL_PROCESS_POOL'
    measured=round(time.perf_counter()-begin,5)
    if len(records)!=1728 or any(r['id']!=hsn_of(i) for i,r in enumerate(records)):raise ValueError('SOURCE_SLICE_COVERAGE_FAILED')
    if any(r['localStatus']!='SOURCE_PINNED_LOCAL_E2E_PASS' or r['hostStatus']!='HOLD_REAL_ISSUER_AND_WORK_ACL' for r in records):raise ValueError('UNSUPPORTED_HOST_PROMOTION')
    spheres=[];houses=[]
    for h in range(12):
        houseGroup=records[h*144:(h+1)*144]
        for s in range(12):
            group=houseGroup[s*12:(s+1)*12]
            spheres.append({'id':f'H{h+1:02d}.S{s+1:02d}','nodeCount':12,
                'sourceRoot':hashobj([q['receiptSha256'] for q in group]),'domainOrMethod':'DOMAIN_SPECIALIZATION' if s<7 else 'EPISTEMIC_META',
                'metricMedianBp':statistics.median(q['crossSimilarityBp'] for q in group),'candidateCount':sum(q['crossCandidateId'] is not None for q in group),
                'localPass':12,'hostIntegrated':0})
        houses.append({'id':f'H{h+1:02d}','sphereCount':12,'nodeCount':144,'sourceRoot':hashobj([q['sourceRoot'] for q in spheres[h*12:(h+1)*12]]),
            'metricMedianBp':statistics.median(q['crossSimilarityBp'] for q in houseGroup),'localPass':144,'hostIntegrated':0})
    summary={'schema':'atlas.vertical.meta145/v09','sourceSha256':ORIGINAL_SHA,'nodes':1728,'spheres':144,'houses':12,
      'localSlicePass':1728,'individualFilesVerified':False,'sourceOnlyMetricCount':1728,'sourceSafetyChecks':1728*len(GATES),
      'crossHouseCandidateCount':sum(bool(x['crossCandidateId']) for x in records),'crossHouseAcceptedEdges':0,
      'domainNodes':1008,'methodNodes':720,'sourceStructuralMetricsNotCognitionQuality':True,
      'hostedEndToEndPass':0,'hostedHolds':1728,'officialExcellenceTasksCompleted':0,'modelCalls':0,
      'newPeerTurns':0,'storageWrites':0,'workPosts':0,'canonChanged':False,
      'recordRoot':hashobj([r['receiptSha256'] for r in records]),'sphereRoot':hashobj([r['sourceRoot'] for r in spheres]),
      'houseRoot':hashobj([r['sourceRoot'] for r in houses]),'status':'LOCAL_SOURCE_AND_COMPUTE_END_TO_END_NOT_HOSTED'}
    summary['metaRoot']=hashobj(summary)
    (out/'SLICES.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n' for r in records))
    (out/'SPHERES.json').write_text(json.dumps(spheres,ensure_ascii=False,sort_keys=True,indent=2))
    (out/'HOUSES.json').write_text(json.dumps(houses,ensure_ascii=False,sort_keys=True,indent=2))
    (out/'META145.json').write_text(json.dumps(summary,ensure_ascii=False,sort_keys=True,indent=2))
    (out/'RUNTIME.json').write_text(json.dumps({'seconds':measured,'workerProcessesRequested':workers,'kind':workerKind,'notCanonicalDigest':True},indent=2))
    # Individually runnable/readable result objects in deterministic House/Sphere layout.
    for r in records:
        folder=out/'slices'/r['house']/r['sphere'][4:]
        folder.mkdir(parents=True,exist_ok=True)
        (folder/(r['id'][8:]+'.json')).write_text(json.dumps(r,ensure_ascii=False,sort_keys=True,indent=2))
    return summary

def verify_local(out):
    root=Path(out);summ=json.loads((root/'META145.json').read_text());sph=json.loads((root/'SPHERES.json').read_text());h=json.loads((root/'HOUSES.json').read_text())
    rows=[json.loads(s) for s in (root/'SLICES.jsonl').read_text().splitlines()]
    assert len(rows)==1728 and len(sph)==144 and len(h)==12
    for i,r in enumerate(rows):
        assert r['id']==hsn_of(i) and r['sourceSha256']==ORIGINAL_SHA and r['localStatus']=='SOURCE_PINNED_LOCAL_E2E_PASS'
        proof=['ATLAS_VERTICAL_V09',r['id'],ORIGINAL_SHA,r['recordSha256'],r['role'],r['module'],r['moduleOutputSha256'],r['subjectNodeId'],r['crossCandidateId'],r['crossSimilarityBp'],r['localStatus'],r['hostStatus'],True]
        assert r['receiptSha256']==hashlib.sha256(json.dumps(proof,separators=(',',':')).encode()).hexdigest()
        if r['crossCandidateId']:assert r['crossCandidateId'][:3]!=r['house'] and role_of(r['crossCandidateId'])==r['role']
        path=root/'slices'/r['house']/r['sphere'][4:]/(r['id'][8:]+'.json')
        assert json.loads(path.read_text())==r
    assert summ['recordRoot']==hashobj([r['receiptSha256'] for r in rows])
    assert summ['sphereRoot']==hashobj([r['sourceRoot'] for r in sph])
    assert summ['houseRoot']==hashobj([r['sourceRoot'] for r in h])
    assert summ['metaRoot']==hashobj({k:v for k,v in summ.items() if k!='metaRoot'})
    return {'status':'PASSED','slices':1728,'sphere':144,'houses':12,'recordRoot':summ['recordRoot'],'metaRoot':summ['metaRoot']}

if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--out',required=True);p.add_argument('--workers',type=int,default=4)
    args=p.parse_args();print(json.dumps(run_all(args.source,args.out,args.workers),indent=2))
