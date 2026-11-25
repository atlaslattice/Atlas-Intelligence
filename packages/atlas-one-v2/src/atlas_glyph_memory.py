#!/usr/bin/env python3
"""Atlas Sphere-145 R11: deterministic source-bound generative memory and glyph atlas.

This is *not* LLM training, real peer exchange, hosted authorization, or scientific
measurement. All transformations are review-only Work metadata computed from the
user's source-derived Ariadne v0.7 index, never from private Play/Palace bodies.
"""
from __future__ import annotations
import argparse
import collections
import csv
import dataclasses
import hashlib
import json
import math
import pathlib
import re
import statistics
import time
from typing import Any

SOURCE_SHA = '598495239d7e856af91aad87724bb9055eb813714f242975c1201755f425ec56'
MODE_SHA = 'feea3491423c986ad0fc87f75310e8e3b0a4b63f23d2217a1312dfadc7120815'
REGISTRY_SHA = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
PRIOR_META_HASH = '92e02fbaa5402a5c18276c603539865a938375d033a68f287cfefdbfbe4d5dfe'
PREV_META_FILE_SHA='d735f02bd4e0d3cad479e4984d1880d0a3bcbd8e59b01545b77b2b5a823164c2'
SCHEMA = 'atlas.sphere145.glyph-memory/v1'
MANTRA = '1,728 nodes · 144 Spheres · 12 Houses · 1 build'
HSN = re.compile(r'^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$')
SHA = re.compile(r'^[a-f0-9]{64}$')
TERMS = re.compile(r'[\w]+', re.UNICODE)
STOP = frozenset('the and or of in for to as a an on at by with from across into within their its this that study studies practice methods aspects tools theory general basics broader challenges historical contemporary human people science knowledge technology systems'.split())
Q = tuple('sala sele sili solo sulu tara tere tiri toro turu mara mere'.split())
S = tuple('gal gel gil gol gul nal nel nil nol nul thal thel'.split())
GF7_BANDS=(('Deep infrasonic',0.1,1),('Very low infrasonic',1,5),('Infrasonic',5,20),('Low audible',20,80),('Bass',80,200),('Low-mid',200,500),('Mid',500,1000),('Upper-mid',1000,2000),('Presence',2000,5000),('High audible',5000,20000),('Ultrasonic',20000,100000),('High ultrasonic',100000,1000000))
GF7_MODES=((1,1),(1,2),(2,1),(2,2),(1,3),(3,1),(2,3),(3,2),(3,3),(1,4),(4,1),(4,4))
GF7_CONTEXTS=(('aluminum',1),('aluminum',1.25),('aluminum',1.5),('aluminum',2),('steel',1),('steel',1.25),('steel',1.5),('steel',2),('borosilicate',1),('borosilicate',1.25),('borosilicate',1.5),('borosilicate',2))

class SourceHold(ValueError):
    pass

def stable_json(v:Any)->str:
    return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False)

def sha(v:Any)->str:
    return hashlib.sha256(stable_json(v).encode('utf-8')).hexdigest()

def digest_bytes(raw:bytes)->str:
    return hashlib.sha256(raw).hexdigest()

def write_json(path:pathlib.Path,data:Any)->None:
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(stable_json(data)+'\n',encoding='utf-8')

def write_jsonl(path:pathlib.Path,items:list[dict])->None:
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(''.join(stable_json(r)+'\n' for r in items),encoding='utf-8')

def tokens(text:str)->frozenset[str]:
    if not isinstance(text,str):raise SourceHold('TEXT_INVALID')
    return frozenset(t for t in TERMS.findall(text.lower()) if len(t)>=3 and t not in STOP and not t.isdecimal())

@dataclasses.dataclass(frozen=True)
class Sphere:
    id:str
    house:str
    house_name:str
    name:str
    role:str
    mode:str
    nodes:tuple[dict,...]
    terms:frozenset[str]
    source_digest:str

class Corpus:
    def __init__(self,source_bytes:bytes,mode_bytes:bytes,meta_bytes:bytes,*,verified=True):
        if not (isinstance(source_bytes,bytes) and isinstance(mode_bytes,bytes) and isinstance(meta_bytes,bytes)):
            raise SourceHold('BYTES_REQUIRED')
        if verified and (digest_bytes(source_bytes)!=SOURCE_SHA or digest_bytes(mode_bytes)!=MODE_SHA or digest_bytes(meta_bytes)!=PREV_META_FILE_SHA):
            raise SourceHold('SOURCE_BYTES_CHANGED')
        try:
            rows=list(csv.DictReader(source_bytes.decode('utf-8').splitlines(),delimiter='\t'))
            modes=json.loads(mode_bytes.decode('utf-8'))
            prior=json.loads(meta_bytes.decode('utf-8'))
        except Exception as e:raise SourceHold('SOURCE_FORMAT_INVALID') from e
        if len(rows)!=1728 or len(modes.get('modes',[]))!=144 or prior.get('metaHash')!=PRIOR_META_HASH:
            raise SourceHold('SOURCE_COVERAGE_OR_PREDECESSOR_CHANGED')
        if modes.get('registryDigest')!=REGISTRY_SHA or modes.get('sourceContainsPrivateModeBodies') is not False:
            raise SourceHold('REGISTRY_OR_PRIVACY_CLAIM_CHANGED')
        mode_rows=modes['modes']; spheres=[];self.nodes=[];self.by_coordinate={}
        for i,row in enumerate(rows):
            coord=f'H{i//144+1:02}.S{(i%144)//12+1:02}.N{i%12+1:02}'
            if row.get('coordinate')!=coord or not HSN.fullmatch(coord) or not SHA.fullmatch(row.get('source_sha256','')):
                raise SourceHold('COORDINATE_OR_NODE_DIGEST_MISMATCH')
            expected_role='DOMAIN_SPECIALIZATION' if (i%144)//12<7 else 'EPISTEMIC_META'
            if row.get('node_kind')!=expected_role:raise SourceHold('SPHERE_ROLE_TOPOLOGY_MISMATCH')
            node={'coordinate':coord,'name':row['node_name'],'sha256':row['source_sha256'],'kind':expected_role}
            self.nodes.append(node);self.by_coordinate[coord]=node
        modes_seen=collections.Counter()
        for j in range(144):
            first=rows[j*12];s=f'H{j//12+1:02}.S{j%12+1:02}';h=s[:3]
            mm=mode_rows[j]
            if mm.get('sphere')!=s or mm.get('mode') not in {'WORK','PLAY','SOCIAL','IMAGINE','DREAM','QUIET'} or mm.get('taskStatus')!='PROPOSED_NOT_IMPLEMENTED':
                raise SourceHold('MODE_PROPOSAL_SHAPE_INVALID')
            slice12=rows[j*12:(j+1)*12]
            if any(r['house_name']!=first['house_name'] or r['sphere_name']!=first['sphere_name'] for r in slice12):
                raise SourceHold('HOUSE_SPHERE_NAME_INCONSISTENT')
            items=tuple(self.nodes[j*12:(j+1)*12])
            role=items[0]['kind']
            tt=tokens(first['sphere_name']+' '+' '.join(z['name'] for z in items))
            digest=sha({'sphere':s,'house':h,'name':first['sphere_name'],'role':role,'nodes':[(n['coordinate'],n['sha256']) for n in items]})
            spheres.append(Sphere(s,h,first['house_name'],first['sphere_name'],role,mm['mode'],items,tt,digest));modes_seen[mm['mode']]+=1
        if len(set(s.id for s in spheres))!=144 or modes_seen['WORK']!=104 or sum(modes_seen.values())!=144:
            raise SourceHold('SOURCE_SPHERE_UNIQUENESS_OR_MODE_INVALID')
        if len({s.house for s in spheres})!=12 or sum(s.role=='DOMAIN_SPECIALIZATION' for s in spheres)!=84:
            raise SourceHold('SOURCE_HOUSE_OR_ROLE_INVALID')
        self.spheres=tuple(spheres);self.sphere_by_id={s.id:s for s in spheres}
        self.input_sha=digest_bytes(source_bytes)
        self.mode_sha=digest_bytes(mode_bytes)
        self.source_claim=REGISTRY_SHA
        self.source_attested_original=False
        self.prior_meta=PRIOR_META_HASH
        self.modes=dict(modes_seen)

# The positional tuple Hxx.Sxx.Nxx and GF7.Bxx.Mxx.Cxx carries NO semantic or
# physical correspondence. The two systems only share a reversible code alphabet.
def glyph_coordinates(coordinate:str)->dict:
    m=HSN.fullmatch(coordinate) if isinstance(coordinate,str) else None
    if not m:raise SourceHold('HSN_COORDINATE_REQUIRED')
    h,s,n=map(int,m.groups());stems=(h-1,s-1,n-1)
    q='.'.join(Q[i] for i in stems);svoice='.'.join(S[i] for i in stems)
    band=GF7_BANDS[h-1];plate=GF7_MODES[s-1];ctx=GF7_CONTEXTS[n-1]
    return {'hsn':coordinate,'gf7PositionalAddress':f'GF7.B{h:02}.M{s:02}.C{n:02}',
        'knowledgeGlyphQCandidate':f'KG8Q:{REGISTRY_SHA[:12]}:{q}',
        'knowledgeGlyphSCandidate':f'KG8S:{REGISTRY_SHA[:12]}:{svoice}',
        'plateMnemonicQ':f'Q:{q}','plateMnemonicS':f'S:{svoice}',
        'gf7Band':f'B{h:02}','gf7BandTitle':band[0],'gf7CenterHz':math.sqrt(band[1]*band[2]),
        'gf7PlateMode':{'m':plate[0],'n':plate[1]},'gf7MaterialContext':{'material':ctx[0],'aspectBA':ctx[1]},
        'namespaceRelation':'POSITIONAL_DISPLAY_ALIAS_ONLY_NOT_SEMANTIC_EQUIVALENCE',
        'mnemonicStatus':'COINED_PROJECT_CODE_NOT_AUTHENTIC_TOLKIEN_TRANSLATION',
        'cymaticStatus':'ANALYTIC_MODEL_NOT_CALIBRATED_NOT_PHYSICAL_MEASUREMENT',
        'sourceRecordVerifiedByHost':False,'canonEffect':'NONE','permissionEffect':'NONE'}

class LexicalIndex:
    """Exact inverted retrieval with IDF-weighted Jaccard; no semantic claims."""
    def __init__(self,spheres:tuple[Sphere,...]):
        self.spheres=spheres
        self.idmap={s.id:i for i,s in enumerate(spheres)}
        self.posts=collections.defaultdict(int)
        self.df=collections.Counter()
        for i,s in enumerate(spheres):
            for t in s.terms:
                self.posts[t]|=1<<i
                self.df[t]+=1
        self.weights={t:1+math.log((len(spheres)+1)/(d+1)) for t,d in self.df.items()}
        self.weightsum=[sum(self.weights[t] for t in s.terms) for s in spheres]
        self.vectors=[s.terms for s in spheres]
    def _score(self,qi:int,ci:int)->float:
        # Round to ensure cross-language/deterministic serialized receipt ordering.
        a,b=self.vectors[qi],self.vectors[ci]
        inter=a&b
        if not inter:return 0.0
        numer=sum(self.weights[t] for t in inter)
        denom=self.weightsum[qi]+self.weightsum[ci]-numer
        return round(numer/denom,12) if denom>0 else 0.0
    def indexed(self,sphere_id:str,*,prior_exclusive:int|None=None,cross_house:bool=True,limit:int=5)->list[dict]:
        if sphere_id not in self.idmap or not 1<=limit<=20:raise SourceHold('SEARCH_SCOPE_INVALID')
        i=self.idmap[sphere_id];bits=0
        for t in self.vectors[i]:bits|=self.posts[t]
        if prior_exclusive is not None:
            if not 0<=prior_exclusive<=144:raise SourceHold('MEMORY_CUTOFF_INVALID')
            bits &= (1<<prior_exclusive)-1
        hits=[]
        while bits:
            low=bits & -bits;j=low.bit_length()-1;bits^=low
            if j==i or (cross_house and self.spheres[i].house==self.spheres[j].house):continue
            score=self._score(i,j)
            if score>0:hits.append((score,self.spheres[j].id,j))
        hits.sort(key=lambda x:(-x[0],x[1]))
        return [self._out(i,j,score) for score,_,j in hits[:limit]]
    def linear(self,sphere_id:str,*,prior_exclusive:int|None=None,cross_house:bool=True,limit:int=5)->list[dict]:
        if sphere_id not in self.idmap or not 1<=limit<=20:raise SourceHold('SEARCH_SCOPE_INVALID')
        i=self.idmap[sphere_id];upper=144 if prior_exclusive is None else prior_exclusive
        if not 0<=upper<=144:raise SourceHold('MEMORY_CUTOFF_INVALID')
        hits=[]
        for j in range(upper):
            if j==i or (cross_house and self.spheres[i].house==self.spheres[j].house):continue
            score=self._score(i,j)
            if score>0:hits.append((score,self.spheres[j].id,j))
        hits.sort(key=lambda x:(-x[0],x[1]))
        return [self._out(i,j,score) for score,_,j in hits[:limit]]
    def _out(self,qi,j,score):
        x,y=self.spheres[qi],self.spheres[j]
        shared=sorted(x.terms&y.terms,key=lambda t:(-self.weights[t],t))
        return {'targetSphere':y.id,'targetHouse':y.house,'score':score,
            'sharedTokens':shared[:5],'sourceSphereDigest':y.source_digest,
            'type':'CROSS_HOUSE_LEXICAL_CANDIDATE_NEEDS_REVIEW',
            'sourceSemanticEquivalence':False,'authorityEffect':'NONE'}

class SourceLockedMemo:
    """Compiled *local* retrieval index; scope guard is NOT host IAM."""
    def __init__(self,index:LexicalIndex,source_sha=SOURCE_SHA,mode_sha=MODE_SHA,rights_epoch=0,scope='LOCAL_REVIEW_ONLY'):
        if source_sha!=SOURCE_SHA or mode_sha!=MODE_SHA or rights_epoch<0 or scope!='LOCAL_REVIEW_ONLY':
            raise SourceHold('MEMO_SOURCE_OR_SCOPE_DENIED')
        self.source_sha=source_sha;self.mode_sha=mode_sha
        self.rights_epoch=rights_epoch;self.scope=scope;self.valid=True
        self.results={s.id:index.indexed(s.id,limit=5) for s in index.spheres}
        self.summary_results={s.id:tuple((r['targetSphere'],r['score'],r['sourceSphereDigest'])
                        for r in self.results[s.id]) for s in index.spheres}
        self.content_digest=sha(self.results)
    def recall(self,sphere_id,*,limit=5,source_sha=SOURCE_SHA,mode_sha=MODE_SHA,rights_epoch=0,scope='LOCAL_REVIEW_ONLY'):
        if not self.valid or source_sha!=self.source_sha or mode_sha!=self.mode_sha or rights_epoch!=self.rights_epoch or scope!=self.scope:
            raise SourceHold('MEMO_STALE_OR_SCOPE_CHANGED')
        if limit!=5:raise SourceHold('MEMO_RESULT_CAP_CHANGED')
        if sphere_id not in self.results:raise SourceHold('MEMO_SPHERE_UNKNOWN')
        # Return copy so a caller cannot mutate the shared cached candidate.
        return json.loads(stable_json(self.results[sphere_id]))
    def recall_summary(self,sphere_id,*,source_sha=SOURCE_SHA,mode_sha=MODE_SHA,rights_epoch=0,scope='LOCAL_REVIEW_ONLY'):
        if not self.valid or source_sha!=self.source_sha or mode_sha!=self.mode_sha or rights_epoch!=self.rights_epoch or scope!=self.scope:
            raise SourceHold('MEMO_STALE_OR_SCOPE_CHANGED')
        if sphere_id not in self.summary_results:raise SourceHold('MEMO_SPHERE_UNKNOWN')
        # Tuples of immutable scalars; safe for repeated client reads.
        return self.summary_results[sphere_id]
    def invalidate(self):
        self.valid=False

# Synthetic simply-supported plate shape. No physical actuation or measured sand.
def synthetic_plate_field(mode_id:int,grid:int=12):
    if not isinstance(mode_id,int) or not 1<=mode_id<=12 or grid!=12:raise SourceHold('GF7_MODEL_MODE_INVALID')
    m,n=GF7_MODES[mode_id-1]
    samples=[round(math.sin(math.pi*m*i/(grid+1))*math.sin(math.pi*n*j/(grid+1)),9)
             for i in range(1,grid+1) for j in range(1,grid+1)]
    return {'mode':f'M{mode_id:02}','m':m,'n':n,'grid':[grid,grid],
            'fieldSHA256':sha(samples),'rms':round(math.sqrt(sum(v*v for v in samples)/len(samples)),9),
            'status':'SYNTHETIC_ANALYTIC_FIELD_NOT_EXPERIMENTAL_CYMATICS'}

class MemoryChain:
    """Immutable source-only Work planning episode metadata (no private bodies)."""
    def __init__(self,seed=PRIOR_META_HASH):
        if not SHA.fullmatch(seed):raise SourceHold('MEMORY_SEED_INVALID')
        self.events=[];self.head=seed;self.seen_spheres=set()
    def append(self,data:dict)->dict:
        if not isinstance(data,dict) or data.get('modeEvidence')!='SOURCE_METADATA_ONLY' or data.get('hostVerified') is not False or data.get('privateBodiesImported') is not False:
            raise SourceHold('NONWORK_OR_HOST_AUTHORITY_FORGERY')
        if data.get('status')!='UNREVIEWED_LOCAL_CANDIDATE' or data.get('canonEffect')!='NONE':
            raise SourceHold('MEMORY_AUTHORITATIVE_CLAIM_DENIED')
        if len(self.events)>=144 or data.get('step')!=len(self.events)+1:
            raise SourceHold('MEMORY_ORDER_OR_CAPACITY')
        sph=data.get('sphere')
        if not isinstance(sph,str) or not re.fullmatch(r'H(?:0[1-9]|1[0-2])\.S(?:0[1-9]|1[0-2])',sph) or sph in self.seen_spheres:
            raise SourceHold('MEMORY_DUPLICATE_OR_INVALID_SPHERE')
        if not isinstance(data.get('sourceSphereDigest'),str) or not SHA.fullmatch(data['sourceSphereDigest']):
            raise SourceHold('MEMORY_SOURCE_DIGEST_REQUIRED')
        row={'schema':SCHEMA,'previous':self.head,'payload':data,'step':len(self.events)+1}
        row['receiptHash']=sha(row)
        self.events.append(row);self.head=row['receiptHash'];self.seen_spheres.add(sph)
        return row
    @classmethod
    def restore(cls,rows:list[dict],seed=PRIOR_META_HASH):
        if not isinstance(rows,list) or len(rows)>144:raise SourceHold('MEMORY_RESTORE_BOUNDS')
        out=cls(seed)
        for row in rows:
            if not isinstance(row,dict) or row.get('schema')!=SCHEMA or row.get('previous')!=out.head:
                raise SourceHold('MEMORY_RESTORE_PROVENANCE_INVALID')
            old=dict(row)
            p=old.get('payload')
            if not isinstance(p,dict):raise SourceHold('MEMORY_RESTORE_PAYLOAD_INVALID')
            regenerated=out.append(p)
            if regenerated!=old:raise SourceHold('MEMORY_RESTORE_INTEGRITY_FAIL')
        out.verify()
        return out
    def verify(self):
        head=PRIOR_META_HASH
        for i,r in enumerate(self.events):
            if r.get('step')!=i+1 or r.get('previous')!=head or r.get('receiptHash')!=sha({k:v for k,v in r.items() if k!='receiptHash'}):
                raise SourceHold('MEMORY_RECEIPT_TAMPERED')
            if r.get('payload',{}).get('step')!=i+1:raise SourceHold('MEMORY_PAYLOAD_TAMPERED')
            head=r['receiptHash']
        if head!=self.head:raise SourceHold('MEMORY_TIP_TAMPERED')
        return True

class AtlasGlyphMemoryEngine:
    def __init__(self,corpus:Corpus):
        self.corpus=corpus
        self.search=LexicalIndex(corpus.spheres)
        self.memory=MemoryChain()
        self.cards=[]
        self.meta=None
    def run(self):
        if self.cards:raise SourceHold('ALREADY_EXECUTED')
        for j,s in enumerate(self.corpus.spheres):
            # Most distinguishing source node by weighted content, same node
            # identity guaranteed. This is source text selection, not inference.
            focus=max(s.nodes,key=lambda n:(sum(self.search.weights.get(t,1) for t in tokens(n['name'])),n['coordinate']))
            prior=self.search.indexed(s.id,prior_exclusive=j,limit=3)
            if prior != self.search.linear(s.id,prior_exclusive=j,limit=3):raise SourceHold('INCREMENTAL_MEMORY_RETRIEVAL_PARITY')
            source_role=s.role=='EPISTEMIC_META'
            if source_role:
                artifact=f'Audit trail and falsification protocol for {focus["name"]} in {s.name}'
                probe=f'Check whether a source edition or counterexample changes the method claim in {s.name}; preserve dissent.'
                kind='EPISTEMIC_METHOD_AUDIT'
            else:
                artifact=f'Source-linked reproducibility fixture for {focus["name"]} within {s.name}'
                probe=f'Find a competing mechanism or boundary condition that would invalidate an unqualified {focus["name"]} explanation.'
                kind='DOMAIN_PROTOTYPE_HYPOTHESIS'
            prior_top=prior[0] if prior else None
            memory_question=(f'Could a method from {prior_top["targetSphere"]} be tested against {s.id} under an independently reviewed shared scope?'
                             if prior_top else f'Which observable or contradiction would best distinguish {s.id} from its nearest neighboring Sphere?')
            card={'schema':SCHEMA,'step':j+1,'sphere':s.id,'house':s.house,'houseName':s.house_name,
                'title':s.name,'role':s.role,'modeProposal':s.mode,'workExportEligible':s.mode=='WORK',
                'sourceSphereDigest':s.source_digest,'sourceNodeCount':len(s.nodes),
                'focusCoordinate':focus['coordinate'],'focusNode':focus['name'],'focusNodeSHA256':focus['sha256'],
                'uniquePerspectiveKind':kind,'transform':{'sourceObservation':'SOURCE_INDEX_TITLE_AND_NODE_LABELS',
                  'researchQuestion':f'What source-grounded mechanism or method of {s.name} changes how {focus["name"]} should be examined?',
                  'candidateArtifact':artifact,'falsifier':probe,'nextPeerQuestion':memory_question},
                'recalledEarlierSpheres':prior,'positionalGlyph':glyph_coordinates(focus['coordinate']),
                'sourceStatus':'DERIVED_SOURCE_INDEX_SHA_VERIFIED_ORIGINAL_REGISTRY_NOT_IN_BUNDLE',
                'semanticReview':'UNREVIEWED','realAgentConversations':0,'scientificValidation':False,
                'hostActions':0,'canonEffect':'NONE','fictionCanonEffect':'NONE'}
            # Change in memory is real data mutation; NOT model weight training.
            payload={'step':j+1,'sphere':s.id,'house':s.house,'modeEvidence':'SOURCE_METADATA_ONLY',
                'workExportEligible':s.mode=='WORK','sourceSphereDigest':s.source_digest,
                'focusCoordinate':focus['coordinate'],'focusNodeDigest':focus['sha256'],
                'retrievedPriorSphere':prior_top['targetSphere'] if prior_top else None,
                'candidateArtifactDigest':sha(artifact),'status':'UNREVIEWED_LOCAL_CANDIDATE',
                'hostVerified':False,'privateBodiesImported':False,'canonEffect':'NONE'}
            receipt=self.memory.append(payload)
            card['memoryBefore']=j;card['memoryAfter']=j+1
            card['memoryReceiptHash']=receipt['receiptHash'];card['priorMemoryHead']=receipt['previous']
            card['cardHash']=sha(card)
            self.cards.append(card)
        self.memory.verify()
        # Correlations are candidate edges only; all 144 perspective names and
        # source digests remain distinct even when phrases or stems repeat.
        cross=[]
        for s in self.corpus.spheres:
            for hit in self.search.indexed(s.id,cross_house=True,limit=3):
                target=self.corpus.sphere_by_id[hit['targetSphere']]
                method=(s.role=='EPISTEMIC_META' or target.role=='EPISTEMIC_META')
                word=hit['sharedTokens'][0] if hit['sharedTokens'] else 'shared terminology'
                cross.append({'from':s.id,'to':hit['targetSphere'],'score':hit['score'],
                              'sharedTokens':hit['sharedTokens'],'fromDigest':s.source_digest,
                              'toDigest':hit['sourceSphereDigest'],
                              'fromScope':s.name,'toScope':target.name,
                              'fromRole':s.role,'toRole':target.role,
                              'proposedRelationType':'METHOD_COMPARISON_CANDIDATE' if method else 'CROSS_DOMAIN_HYPOTHESIS_CANDIDATE',
                              'reviewQuestion':f'Can independently sourced evidence connect {s.name} and {target.name} without collapsing their distinct scopes?',
                              'counterexampleToSeek':f'Find a case where {word} means a different mechanism, field or method across these two Spheres.',
                              'kind':'PROPOSED_LEXICAL_CROSS_SPHERE_LINK',
                              'semanticAdjudication':'NOT_PERFORMED','authorityEffect':'NONE'})
        houses=[]
        for h in range(1,13):
            hid=f'H{h:02}'
            mine=[c for c in self.cards if c['house']==hid]
            houses.append({'house':hid,'houseName':mine[0]['houseName'],'sphereCount':12,'nodeCount':144,
                           'domainSphereCount':sum(c['role']=='DOMAIN_SPECIALIZATION' for c in mine),
                           'metaSphereCount':sum(c['role']=='EPISTEMIC_META' for c in mine),
                           'workEligible':sum(c['workExportEligible'] for c in mine),
                           'candidateEdges':sum(e['from'].startswith(hid) for e in cross),
                           'questions':[{'sphere':c['sphere'],'focus':c['focusNode'],'question':c['transform']['nextPeerQuestion']} for c in mine],
                           'houseDecision':'EVIDENCE_REQUIRED_NO_SCALAR_WELFARE_SCORE',
                           'rightsStatus':'HOST_AND_COMMUNITY_REVIEW_HELD','canonEffect':'NONE'})
        self.meta={'schema':'atlas.sphere145.glyph-memory-meta/v1','step':145,
                   'predecessorSourceMetaHash':PRIOR_META_HASH,'predecessorSphere144Memory':self.memory.head,
                   'sourceIndexSHA256':self.corpus.input_sha,'modeIndexSHA256':self.corpus.mode_sha,
                   'derivedIndexBytesExactlyPinned':self.corpus.input_sha==SOURCE_SHA and self.corpus.mode_sha==MODE_SHA,
                   'registrySHA256Claim':REGISTRY_SHA,
                   'sphereCount':len(self.cards),'nodeCount':len(self.corpus.nodes),'houseCount':len(houses),
                   'glyphAliasCount':1728,'candidateCrossHouseEdges':len(cross),
                   'memoryEvents':len(self.memory.events),'workSpheres':104,'nonWorkSpheres':40,
                   'newHostedVerifiedKnowledge':0,'realSwarmchatPosts':0,'modelWeightsChanged':False,
                   'claimStatus':'COMPUTATIONAL_TRANSFORMATIONS_UNREVIEWED',
                   'requiredHostGates':['trusted source edition','READ/RETURN epoch','signed-in consent',
                                        'real source review','revocation and rollback','CI + hosted latency'],
                   'mantra':MANTRA,'rightsEffect':'NONE','canonEffect':'NONE'}
        self.meta['metaHash']=sha(self.meta)
        return cross,houses

def compare_queries(engine:AtlasGlyphMemoryEngine,rounds:int=6)->dict:
    ix=engine.search;spheres=engine.corpus.spheres
    for s in spheres:
        if ix.indexed(s.id,limit=5)!=ix.linear(s.id,limit=5):raise SourceHold('FULL_RETRIEVAL_PARITY_FAILED')
        pos=ix.idmap[s.id]
        if ix.indexed(s.id,prior_exclusive=pos,limit=3)!=ix.linear(s.id,prior_exclusive=pos,limit=3):
            raise SourceHold('MEMORY_CUTOFF_PARITY_FAILED')
    def time_batch(fn):
        start=time.perf_counter_ns()
        result=[fn(s.id,limit=5) for s in spheres]
        return (time.perf_counter_ns()-start)/1e6,sha(result)
    # Running the SAME full 144-query workload. No need to rebuild the index
    # in the warm condition; cold construction is separately measured.
    linear=[];optimized=[];cached=[];summary_baseline=[];summary_cached=[];digests=[]
    memo=SourceLockedMemo(ix)
    memo_build=[]
    for _ in range(max(3,min(8,rounds))):
        start=time.perf_counter_ns();SourceLockedMemo(ix);memo_build.append((time.perf_counter_ns()-start)/1e6)
    for _ in range(rounds):
        ms,digest=time_batch(ix.linear);linear.append(ms);digests.append(digest)
        ms,digest2=time_batch(ix.indexed);optimized.append(ms)
        if digest2!=digest:raise SourceHold('BENCHMARK_RESULT_PARITY')
        ms,digest3=time_batch(memo.recall);cached.append(ms)
        if digest3!=digest:raise SourceHold('MEMO_RECALL_RESULT_PARITY')
        start=time.perf_counter_ns()
        base_summaries=[tuple((r['targetSphere'],r['score'],r['sourceSphereDigest'])
                        for r in ix.linear(s.id,limit=5)) for s in spheres]
        summary_baseline.append((time.perf_counter_ns()-start)/1e6)
        start=time.perf_counter_ns()
        cache_summaries=[memo.recall_summary(s.id) for s in spheres]
        summary_cached.append((time.perf_counter_ns()-start)/1e6)
        if base_summaries!=cache_summaries:raise SourceHold('MEMO_SUMMARY_RESULT_PARITY')
    builds=[]
    for _ in range(max(3,min(8,rounds))):
        start=time.perf_counter_ns();LexicalIndex(spheres);builds.append((time.perf_counter_ns()-start)/1e6)
    def percentile(a,p):
        b=sorted(a);return b[max(0,min(len(b)-1,math.ceil(len(b)*p/100)-1))]
    return {'schema':'atlas.sphere145.glyph-memory-bench/v1','workload':'144 complete exact source-perspective top5 lexical cross-House retrieval queries',
            'samples':rounds,'baselineMedianMs':statistics.median(linear),'baselineP95Ms':percentile(linear,95),
            'indexedMedianMs':statistics.median(optimized),'indexedP95Ms':percentile(optimized,95),
            'indexBuildMedianMs':statistics.median(builds),'warmSpeedupX':statistics.median(linear)/statistics.median(optimized),
            'coldBuildPlusOneSpeedupX':statistics.median(linear)/(statistics.median(builds)+statistics.median(optimized)),
            'memoCacheCompileMedianMs':statistics.median(memo_build),
            'memoizedRecallMedianMs':statistics.median(cached),'memoizedRecallP95Ms':percentile(cached,95),
            'memoizedWarmSpeedupVsLinearX':statistics.median(linear)/statistics.median(cached),
            'memoizedColdCompilePlusOneSpeedupX':statistics.median(linear)/(statistics.median(builds)+statistics.median(memo_build)+statistics.median(cached)),
            'memoizedResultDigest':memo.content_digest,
            'summaryBaselineMedianMs':statistics.median(summary_baseline),
            'summaryMemoMedianMs':statistics.median(summary_cached),
            'summaryMemoSpeedupX':statistics.median(summary_baseline)/statistics.median(summary_cached),
            'memoSourceAndModeInvalidationRequired':True,
            'queryResultSHA256':digests[0],'queryParityAll144':True,
            'fidelity':'EXACT_WITHIN_SOURCE_LEXICAL_RULES_NO_SEMANTIC_PROOF',
            'hostedLatencyMeasured':False,'modelLearningMeasured':False}

def benchmark_cymatic_signature_reuse(nodes:list[dict],rounds:int=4)->dict:
    """Same analytic 12x12 wavefield SHA for all 1,728 positional GF7 aliases."""
    if len(nodes)!=1728:raise SourceHold('PLATE_INPUT_1728_REQUIRED')
    modes=[int(n['coordinate'][5:7]) for n in nodes]
    def naive():return [synthetic_plate_field(i)['fieldSHA256'] for i in modes]
    def optimized():
        bank={i:synthetic_plate_field(i)['fieldSHA256'] for i in range(1,13)}
        return [bank[i] for i in modes]
    if naive()!=optimized():raise SourceHold('PLATE_MODE_REUSE_PARITY')
    naive_samples=[];cached_samples=[]
    for _ in range(rounds):
        start=time.perf_counter_ns();a=naive();naive_samples.append((time.perf_counter_ns()-start)/1e6)
        start=time.perf_counter_ns();b=optimized();cached_samples.append((time.perf_counter_ns()-start)/1e6)
        if a!=b:raise SourceHold('PLATE_MODE_REUSE_PARITY')
    return {'grid':'12x12 source-only analytic mode sample','positionalAliases':1728,
            'uniqueModeFieldComputations':12,'frequencyPhysics':'ANALYTIC_UNCALIBRATED',
            'linearMedianMs':statistics.median(naive_samples),'memoizedMedianMs':statistics.median(cached_samples),
            'speedupX':statistics.median(naive_samples)/statistics.median(cached_samples),
            'exactOutputDigest':sha(a),'physicalMeasurements':0,
            'nodeToGF7SemanticMappingVerified':False}

def prepare_safe_work_intents(cards:list[dict])->list[dict]:
    """No messages, authentication, source bodies or host effects."""
    rows=[]
    for c in cards:
        if c['workExportEligible'] is not True:continue
        if c['modeProposal']!='WORK' or c['hostActions']!=0:raise SourceHold('WORK_INTENT_MODE_VIOLATION')
        rows.append({'schema':'atlas.glyphmemory.work-intent/v1','sphere':c['sphere'],
                     'focusCoordinate':c['focusCoordinate'],'sourceSphereDigest':c['sourceSphereDigest'],
                     'memoryReceiptHash':c['memoryReceiptHash'],
                     'candidateArtifactSHA256':sha(c['transform']['candidateArtifact']),
                     'status':'PREPARED_NOT_POSTED_HOST_RIGHTS_UNKNOWN',
                     'readAndReturnVerification':'REQUIRED_BEFORE_ANY_PUBLISH',
                     'publisher':'EXISTING_SWARMCHAT_HOST_NOT_INVOKED',
                     'hostAuthenticated':False,'postsPerformed':0,'rightsEffect':'NONE','canonEffect':'NONE'})
    if len(rows)!=104:raise SourceHold('WORK_INTENT_COUNT_DRIFT')
    return rows

def build(root:pathlib.Path,rounds:int=6):
    inputs=root/'inputs';outputs=root/'outputs'
    corpus=Corpus((inputs/'source_index.tsv').read_bytes(),(inputs/'sphere_mode_metadata.json').read_bytes(),
                  (inputs/'prior_meta145.json').read_bytes())
    engine=AtlasGlyphMemoryEngine(corpus)
    cross,houses=engine.run()
    b=compare_queries(engine,rounds)
    b['cymaticModeReuse']=benchmark_cymatic_signature_reuse(corpus.nodes,max(3,min(8,rounds)))
    write_jsonl(outputs/'sphere_reviews_144.jsonl',engine.cards)
    write_jsonl(outputs/'memory_events_144.jsonl',engine.memory.events)
    write_json(outputs/'cross_house_candidate_graph.json',cross)
    write_json(outputs/'house_reviews_12.json',houses)
    write_json(outputs/'work_handoff_intents_104.json',prepare_safe_work_intents(engine.cards))
    write_json(outputs/'performance.json',b)
    pattern_by_mode={i:synthetic_plate_field(i) for i in range(1,13)}
    write_json(outputs/'synthetic_plate_modes_12.json',pattern_by_mode)
    write_jsonl(outputs/'glyph_crosswalk_1728.jsonl',[
        {'coordinate':n['coordinate'],'sourceNodeSHA256':n['sha256'],
         'syntheticModePatternDigest':pattern_by_mode[int(n['coordinate'][5:7])]['fieldSHA256'],
         **glyph_coordinates(n['coordinate'])} for n in corpus.nodes])
    meta={**engine.meta,'candidateGraphDigest':sha(cross),'houseReviewDigest':sha(houses),
          # Benchmark timings vary by load; do NOT hash them into the deterministic build head.
          'performanceParityDigest':b['queryResultSHA256'],
          'syntheticPatternBankDigest':sha(pattern_by_mode),'syntheticPlateFieldsComputed':12,
          'plateAliasesReferenced':1728,'all1728PlateFieldsPhysicallyMeasured':False,
          'memoryReceiptCount':len(engine.memory.events),
          'sourceClaimsVerified':False,'syntheticPositionAliasesAreNotSemanticEdges':True}
    meta.pop('metaHash',None)  # inherited intermediate hash is not part of final receipt
    meta['metaHash']=sha(meta)
    write_json(outputs/'meta_build_145_glyph_memory.json',meta)
    return {'meta':meta,'benchmark':b,'topEdges':cross[:5]}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--root',default=str(pathlib.Path(__file__).resolve().parent.parent))
    parser.add_argument('--rounds',type=int,default=6);p=parser.parse_args()
    print(json.dumps(build(pathlib.Path(p.root),p.rounds),indent=2,ensure_ascii=False))

if __name__=='__main__':main()
