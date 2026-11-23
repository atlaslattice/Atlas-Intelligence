"""Atlas ONE civilizational review circuit v1.0.

Source-only, independently reproducible deterministic sweep of original Ariadne v0.7:
144 perspective spheres x 1,728 nodes = 248,832 structured evaluations.
No claims of genuine agent turns, calibrated semantics, canonical adoption,
resident identity, actual hosted rights, private data ingestion, or welfare scores.

Never distributes original private source bytes; accepts --registry as input.
"""
from __future__ import annotations
import argparse
from collections import Counter, defaultdict
from contextlib import closing
from datetime import datetime
import hashlib
import json
import math
from pathlib import Path
import re
import sqlite3
import sys
import unicodedata

VERSION="atlas.civilization.circuit/v1"
SOURCE_SHA="07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6"
NODE_RE=re.compile(r"^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$")
SPHERE_RE=re.compile(r"^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])$")
HOUSE_RE=re.compile(r"^H(0[1-9]|1[0-2])$")
# Lexical terms are untrusted hints. Generic words here are never evidence of similarity.
STOP={"and","or","the","a","an","of","for","in","within","to","from","by","on","with","its","our","their","as","at","through","into","about","that","this","these","those","all","other","part","whole","scope","evidence","research","source","sources","model","models","systems","system","science","study","studies","scientific","history","journalism","learning","design","methods","method","knowledge","analysis","practice","practices","management","issues","concepts","theory","theories","approaches","perspectives","structures","relationships","processes","applied","applications","development","general","specific","fields","issues","questions","work","review","human","different","social","public","material","data","information","physical","ai"}
SAFE_LABELS={'H01':'Physical evidence, resources and energy provenance',
'H02':'Water and food stocks, access and consequences',
'H03':'Ecology, restoration and infrastructures',
'H04':'Health evidence, privacy and consent',
'H05':'Education, access and knowledge transfer',
'H06':'Security, dual use and accountable restraint',
'H07':'Markets, governance, incentives and externalities',
'H08':'Cultural pluralism, art and expression',
'H09':'Philosophical uncertainty, reasoning and meaning',
'H10':'Indigenous data sovereignty and community participation',
'H11':'Rights, consent and non-offsettable harms',
'H12':'Space, aerospace and off-world ecology'}

class SourceHold(ValueError):pass

def jbytes(obj):return json.dumps(obj,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False).encode('utf8')
def digest(obj):return hashlib.sha256(jbytes(obj)).hexdigest()
def clean_tokens(text):
    text=unicodedata.normalize('NFKC',text).lower()
    return {w for w in re.findall(r"[a-z][a-z0-9]+",text) if len(w)>=3 and w not in STOP}

def load_original(registry_path):
    b=Path(registry_path).read_bytes()
    if hashlib.sha256(b).hexdigest()!=SOURCE_SHA:raise SourceHold('SOURCE_DIGEST_MISMATCH')
    d=json.loads(b)
    if not isinstance(d,dict) or any(not isinstance(d.get(k),dict) for k in ('houses','spheres','nodes')):
        raise SourceHold('SOURCE_STRUCTURE_INVALID')
    if tuple(map(lambda k:len(d[k]),('houses','spheres','nodes'))) != (12,144,1728):
        raise SourceHold('SOURCE_CARDINALITY_INVALID')
    counts=Counter()
    for cid,n in d['nodes'].items():
        if not NODE_RE.fullmatch(cid) or n.get('id')!=cid or n.get('parent')!=cid[:7] or n.get('kind') not in ('DOMAIN_SPECIALIZATION','EPISTEMIC_META'):
            raise SourceHold('NODE_ID_ROLE_PARENT_INVALID')
        if not re.fullmatch('[a-f0-9]{64}', n.get('source_record_sha256','')):raise SourceHold('NODE_DIGEST_INVALID')
        counts[n['kind']]+=1
    if counts != {'DOMAIN_SPECIALIZATION':1008,'EPISTEMIC_META':720}:raise SourceHold('EPISTEMIC_DOMAIN_ROLE_COUNT_INVALID')
    for cid,s in d['spheres'].items():
        if not SPHERE_RE.fullmatch(cid) or s.get('parent')!=cid[:3] or len(s.get('children',[]))!=12:
            raise SourceHold('SPHERE_STRUCTURE_INVALID')
        if set(s['children'])!={f'{cid}.N{i:02d}' for i in range(1,13)}:raise SourceHold('SPHERE_NODES_INCOMPLETE')
    for cid,h in d['houses'].items():
        if not HOUSE_RE.fullmatch(cid) or len(h.get('children',[]))!=12:raise SourceHold('HOUSE_STRUCTURE_INVALID')
    return d

def make_vocabulary(reg):
    spheres=reg['spheres'];nodes=reg['nodes'];houses=reg['houses']
    per_sphere={}
    for cid,s in spheres.items():
        home=[nodes[n] for n in s['children']]
        # Weight subject-specialty labels (not repetitive boilerplate).
        # History/journalism/meta nodes in a sphere are typed audit lenses, not domain equivalents.
        weights=Counter()
        for t in clean_tokens(s['name']):weights[t]+=3
        for t in clean_tokens(houses[s['parent']]['name']):weights[t]+=0.3
        for n in home:
            mult=1.0 if n['kind']=='DOMAIN_SPECIALIZATION' else 0.28
            for t in clean_tokens(n['name']):weights[t]+=mult
        per_sphere[cid]=weights
    per_node={}
    for cid,n in nodes.items():
        weights=Counter()
        for t in clean_tokens(n['name']):weights[t]+=2.0
        # First definition clause is the topic-specific gloss; excluding the boilerplate.
        gloss=n['definition'].split(', within ')[0].split(' within ')[0][:280]
        for t in clean_tokens(gloss):weights[t]+=0.35
        per_node[cid]=weights
    freq=Counter()
    for w in per_sphere.values():freq.update(w.keys())
    for w in per_node.values():freq.update(w.keys())
    total=144+1728
    idf={w:math.log(1+(total+1)/(f+1)) for w,f in freq.items()}
    return per_sphere,per_node,idf

def score_pair(sweights,nweights,idf):
    shared=sorted(set(sweights)&set(nweights),key=lambda t:(-idf.get(t,0),t))
    if not shared:return 0.0,[],False
    left=math.sqrt(sum((idf.get(t,1)*w)**2 for t,w in sweights.items())) or 1.0
    right=math.sqrt(sum((idf.get(t,1)*w)**2 for t,w in nweights.items())) or 1.0
    score=sum((idf[t]**2)*sweights[t]*nweights[t] for t in shared)/(left*right)
    # Generic or single-term lexical overlap is risky until manually reviewed.
    weak=len(shared)<2 or max(idf[t] for t in shared)<1.7
    return round(min(1.0,max(0.0,score)),6),shared[:7],weak

def build(reg,output):
    output=Path(output);output.mkdir(parents=True,exist_ok=True)
    nodes,spheres,houses=reg['nodes'],reg['spheres'],reg['houses']
    sw,nw,idf=make_vocabulary(reg)
    db=output/'sphere_node_248832.sqlite'
    if db.exists():db.unlink()
    con=sqlite3.connect(db);con.execute('PRAGMA journal_mode=DELETE');con.execute('PRAGMA synchronous=FULL')
    con.executescript('''
    CREATE TABLE evaluations (
      sphere_id TEXT NOT NULL, node_id TEXT NOT NULL,
      origin TEXT NOT NULL CHECK(origin IN ('HOME_STRUCTURE','CROSS_SPHERE')),
      node_role TEXT NOT NULL,
      candidate_score REAL NOT NULL,
      shared_tokens TEXT NOT NULL,
      risk TEXT NOT NULL,
      disposition TEXT NOT NULL CHECK(disposition IN ('HOME_EXACT_SOURCE','LEXICAL_CANDIDATE_UNVERIFIED','NO_LEXICAL_SIGNAL')),
      PRIMARY KEY(sphere_id,node_id)
    );
    CREATE INDEX search_sphere_score ON evaluations(sphere_id,candidate_score DESC);
    CREATE INDEX search_node_score ON evaluations(node_id,candidate_score DESC);
    CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    ''')
    sorted_s=sorted(spheres);sorted_n=sorted(nodes)
    per_node_candidates=defaultdict(list);per_sphere_candidates=defaultdict(list)
    count=0;homes=0;signals=0;weak_links=0;method_lens_pairs=0
    for sid in sorted_s:
        batch=[]
        for nid in sorted_n:
            n=nodes[nid];home=(sid==nid[:7])
            if home:
                homes+=1
                batch.append((sid,nid,'HOME_STRUCTURE',n['kind'],0.0,'[]','NONE','HOME_EXACT_SOURCE'))
            else:
                v,tok,weak=score_pair(sw[sid],nw[nid],idf)
                risk='NONE'
                if n['kind']=='EPISTEMIC_META':
                    risk='EPISTEMIC_METHOD_LENS_NOT_DOMAIN_EQUIVALENCE';method_lens_pairs+=1
                elif nid=='H08.S01.N10':risk='MUSICAL_INSTRUMENT_FALSE_FRIEND'
                elif weak and v>0:risk='WEAK_LEXICAL_ONLY'
                elif v>0:risk='UNREVIEWED_CROSS_SCOPE'
                if v>0:signals+=1;weak_links+=(risk=='WEAK_LEXICAL_ONLY')
                batch.append((sid,nid,'CROSS_SPHERE',n['kind'],v,json.dumps(tok),risk,'LEXICAL_CANDIDATE_UNVERIFIED' if v>0 else 'NO_LEXICAL_SIGNAL'))
                if v>0:
                    item=(v,sid,nid,tok,risk)
                    per_sphere_candidates[sid].append(item)
                    per_node_candidates[nid].append(item)
            count+=1
        con.executemany('INSERT INTO evaluations VALUES (?,?,?,?,?,?,?,?)',batch)
    con.execute('INSERT INTO meta VALUES (?,?)',('source_sha256',SOURCE_SHA))
    con.execute('INSERT INTO meta VALUES (?,?)',('schema',VERSION))
    con.execute('INSERT INTO meta VALUES (?,?)',('comparisons',str(count)))
    con.commit()

    sphere_records=[]
    for sid in sorted_s:
        s=spheres[sid];home=s['children'];role_counts=Counter(nodes[n]['kind'] for n in home)
        candidates=sorted(per_sphere_candidates.get(sid,[]),key=lambda x:(-x[0],x[2]))
        chosen=[];byhouse=Counter();seen_spheres=set()
        for v,ss,nid,tok,risk in candidates:
            if len(chosen)>=12:break
            if risk in ('EPISTEMIC_METHOD_LENS_NOT_DOMAIN_EQUIVALENCE','WEAK_LEXICAL_ONLY') or len(tok)<2 or v<0.06 or byhouse[nid[:3]]>=2 or nid[:7] in seen_spheres:continue
            byhouse[nid[:3]]+=1;seen_spheres.add(nid[:7])
            chosen.append({'node':nid,'nodeName':nodes[nid]['name'],'nodeKind':nodes[nid]['kind'],
                           'sourceNodeSHA256':nodes[nid]['source_record_sha256'],'lexicalScoreNotProbability':v,
                           'overlapTokens':tok,'reviewRisk':risk,'relation':'CO_STUDY_CANDIDATE_NOT_EQUIVALENCE',
                           'semanticReview':'UNADJUDICATED'})
        rec={
          'schema':'atlas.one.sphere-perspective/v1','sphereId':sid,'houseId':sid[:3],
          'houseName':houses[sid[:3]]['name'],'sphereName':s['name'],
          'sourceEdition':'Ariadne v0.7','sourceSHA256':SOURCE_SHA,
          'homeNodes':[{'id':nid,'name':nodes[nid]['name'],'kind':nodes[nid]['kind'],
                        'sourceNodeSHA256':nodes[nid]['source_record_sha256']} for nid in home],
          'roleCounts':dict(role_counts),'evaluatedNodes':1728,'homeStructural':12,'externalEvaluated':1716,
          'candidateSignalsUnreviewed':len(candidates),'shortlist':chosen,
          'reviewQuestion':f'Which exact source observations would confirm or falsify a cross-sphere method or dependency involving {s["name"]}, without substituting lexical overlap for meaning?',
          'falsifiers':['wrong registry edition or forged source digest',
                        'shared label but incompatible definitions, especially repeat META',
                        'cross-mode Work retrieval or rights-at-return revoked',
                        'insufficient empirical evidence or conflicting provenance'],
          'status':'COMPUTED_SOURCE_ONLY_SEMANTIC_REVIEW_REQUIRED',
          'residentReviewCount':0,'hostedVerified':False,'canonEffect':'NONE',
        }
        rec['receiptSHA256']=digest(rec);sphere_records.append(rec)

    node_records=[]
    for slot,nid in enumerate(sorted_n,1):
        n=nodes[nid];candidate=sorted(per_node_candidates.get(nid,[]),key=lambda x:(-x[0],x[1]))
        seen=set();picked=[]
        for v,sid,nn,tok,risk in candidate:
            if len(picked)>=4:break
            if sid[:3] in seen or v<0.06 or len(tok)<2 or risk in ('EPISTEMIC_METHOD_LENS_NOT_DOMAIN_EQUIVALENCE','WEAK_LEXICAL_ONLY'):continue
            seen.add(sid[:3]);picked.append({'sphereId':sid,'sphereName':spheres[sid]['name'],
                                             'scoreNotProbability':v,'overlapTokens':tok,
                                             'reviewRisk':risk,'status':'UNREVIEWED'})
        home=spheres[nid[:7]]
        role='DOMAIN_RESEARCH_LOCATOR' if n['kind']=='DOMAIN_SPECIALIZATION' else 'EPISTEMIC_METHOD_AUDIT'
        r={'schema':'atlas.one.node-circuit/v1','slot':slot,'nodeId':nid,'houseId':nid[:3],
           'sphereId':nid[:7],'nodeName':n['name'],'nodeKind':n['kind'],'role':role,
           'sourceNodeSHA256':n['source_record_sha256'],'sourceRegistrySHA256':SOURCE_SHA,
           'sourceEdition':'Ariadne v0.7','sourceDefinition':n['definition'],
           'sourceIncludes':n['includes'],'sourceExcludes':n['excludes'],
           'spherePerspectiveEvaluations':144,
           'candidatePerspectives':picked,
           'workIncrement':f'Propose one read-only, edition-locked {role.lower().replace("_"," ")} source card for {n["name"]}, and preserve an explicit disconfirming observation.',
           'falsifier':f'Can a primary source in {home["name"]} justify the exact role of {n["name"]}, rather than a lexical analogy? Which contrary observation or affected group would disprove the proposal?',
           'swarmchat':{'mode':'WORK','action':'PREPARE_REVIEW_ONLY','writePerformed':False,'requiresHostReadReturn':True},
           'atlas':{'action':'SOURCE_REFERENCE_ONLY','graphWritePerformed':False},
           'ariadne':{'action':'ORIGINAL_REGISTRY_PIN','automaticSemanticEdges':0},
           'ironEmpire':{'action':'NO_AUTOMATIC_FICTION_IMPORT','fictionCanonEffect':'NONE'},
           'executionState':'SOURCE_ANALYSIS_PASS_EXECUTED_LOCAL_NOT_RESIDENT_MACROTURN',
           'reviewState':'UNREVIEWED','residentAuthenticated':False,'workPosted':False,'canonEffect':'NONE'}
        r['receiptSHA256']=digest(r);node_records.append(r)

    house_records=[];fiction_seeds=[]
    for hid,h in sorted(houses.items()):
        child_s=[r for r in sphere_records if r['houseId']==hid]
        domain=sum(r['roleCounts'].get('DOMAIN_SPECIALIZATION',0) for r in child_s)
        meta=sum(r['roleCounts'].get('EPISTEMIC_META',0) for r in child_s)
        top=[];seen=set()
        for r in child_s:
            for candidate in r['shortlist']:
                foreign=candidate['node'][:3]
                if foreign==hid or foreign in seen:continue
                top.append({'homeSphere':r['sphereId'],'counterpartHouse':foreign,
                            'counterpartNode':candidate['node'],'scoreNotProbability':candidate['lexicalScoreNotProbability']})
                seen.add(foreign)
        follow={'schema':'atlas.one.house-followup/v1','houseId':hid,'houseName':h['name'],
                'sourceSHA256':SOURCE_SHA,'sphereReviews':12,'nodePasses':144,
                'domainNodeCount':domain,'epistemicMetaCount':meta,
                'sphereIds':[r['sphereId'] for r in child_s],
                'contrastingHouseQuestions':top[:11],
                'perspective':SAFE_LABELS[hid],
                'followupQuestion':f'From {h["name"]}, which observed sources, ethical concerns and counterexamples most threaten the proposed 12-sphere synthesis, and what single reversible test could challenge it?',
                'rightsConcern':'Indigenous sovereignty, privacy and affected-party rights are non-offsettable, independent of coverage.',
                'physicalStockConcern':'Water, energy, materials and fusion isotopes require native-unit conservation, not a scalar welfare metric.',
                'governance':'NO_AUTOMATIC_CANON_OR_RESIDENT_ASSIGNMENT',
                'release':'OWNER_REVIEW_REQUIRED','reviewStatus':'SOURCE_COMPUTED_NOT_PEER_REVIEWED',
                'residentReviewCount':0,'actualMacroturnsCompleted':0}
        follow['receiptSHA256']=digest(follow);house_records.append(follow)
        creative={'schema':'atlas.iron-empire.optional-house-seed/v1',
                  'houseId':hid,'houseName':h['name'],'ariadneSourceSHA256':SOURCE_SHA,
                  'sourceBasis':'PUBLIC_EDITORIAL_LABEL_ONLY',
                  'optInRequired':True,'mode':'IMAGINE_OR_PLAY_ONLY',
                  'proposal':f'Fictional Iron Empire scenario seed: What changes if a civilization encounters {h["name"]} as an independently governed field rather than an extractable resource?',
                  'fictionOrEmpirical':'FICTIONAL_HYPOTHESIS_NOT_HISTORICAL_OR_OBSERVED',
                  'privacy':{'noWorkHarvest':True,'privatePalaceRead':False,'autoShare':False,'autoIndex':False},
                  'canonEffect':'NONE','physicalScienceClaim':'NOT_VALIDATED'}
        creative['receiptSHA256']=digest(creative);fiction_seeds.append(creative)

    def write_json(name,obj):
        (output/name).write_bytes(json.dumps(obj,ensure_ascii=False,sort_keys=True,indent=2,allow_nan=False).encode('utf8')+b'\n')
    with (output/'node_passes_1728.jsonl').open('w',encoding='utf8') as f:
        for r in node_records:f.write(jbytes(r).decode()+'\n')
    write_json('sphere_reviews_144.json',sphere_records)
    write_json('house_followups_12.json',house_records)
    write_json('iron_empire_opt_in_seeds_12.json',fiction_seeds)
    # The index is deliberately smaller and easier to consume than the complete matrix.
    public_index={'schema':'atlas.civilization.readonly-index/v1','sourceEdition':'Ariadne v0.7',
                  'sourceSHA256':SOURCE_SHA,
                  'nodes':[{'id':r['nodeId'],'houseId':r['houseId'],'sphereId':r['sphereId'],
                            'name':r['nodeName'],'kind':r['nodeKind'],'nodeSHA256':r['sourceNodeSHA256'],
                            'candidatePerspectives':r['candidatePerspectives'],'state':r['executionState']} for r in node_records],
                  'spheres':[{'id':r['sphereId'],'name':r['sphereName'],'houseId':r['houseId'],
                              'topCandidates':r['shortlist'][:5],'roleCounts':r['roleCounts'],
                              'receiptSHA256':r['receiptSHA256']} for r in sphere_records],
                  'houses':[{'id':r['houseId'],'name':r['houseName'],'perspective':r['perspective'],
                             'receiptSHA256':r['receiptSHA256']} for r in house_records],
                  'semanticAcceptanceCount':0,'residentMacroturns':0,'siteDeployed':False}
    public_index['indexSHA256']=digest(public_index)
    write_json('atlas_one_review_index.json',public_index)
    for k,v in [('nodes',len(node_records)),('spheres',len(sphere_records)),('houses',len(house_records))]:
        con.execute('INSERT INTO meta VALUES (?,?)',(k,str(v)))
    con.commit();con.execute('PRAGMA optimize');con.close()
    manifest={'schema':VERSION,'originalSourceSHA256':SOURCE_SHA,'sourceEdition':'Ariadne v0.7',
              'coordinates':1728,'houses':12,'spheres':144,'domain':1008,'epistemicMeta':720,
              'pairEvaluations':count,'homeStructural':homes,'externalPerspectiveEvaluations':count-homes,
              'nonzeroLexicalSignalsUnreviewed':signals,'weakSignalRisks':weak_links,
              'epistemicMethodCrossPairsNoEquivalence':method_lens_pairs,
              'sphereReviewRecords':len(sphere_records),'houseFollowups':len(house_records),
              'nodePassRecords':len(node_records),'fictionSeedsOptIn':len(fiction_seeds),
              'peerReviewsVerified':0,'genuineResidentMacroturns':0,'semanticallyAcceptedCrossLinks':0,
              'siteDeployments':0,'workPosts':0,'realWorldScientificValidations':0,
              'privateModeBodiesImported':0,'sourceIndexSHA256':public_index['indexSHA256'],
              'overclaimWarning':'Local 1728-pass source sweep is not 1728 real agent Macroturns or semantic adjudication.',
              'status':'LOCALLY_EXECUTED_SOURCE_ONLY'}
    filemap={}
    for p in sorted(output.iterdir()):
        if p.is_file() and p.name!='manifest.json':filemap[p.name]={'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
    manifest['artifacts']=filemap;manifest['receiptSHA256']=digest(manifest)
    write_json('manifest.json',manifest)
    return manifest

def verify(output):
    out=Path(output);m=json.loads((out/'manifest.json').read_text('utf8'))
    for name,info in m['artifacts'].items():
        p=out/name
        if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=info['sha256']:raise SourceHold('ARTIFACT_SHA_INVALID:'+name)
    with closing(sqlite3.connect(out/'sphere_node_248832.sqlite')) as c:
        count=c.execute('SELECT COUNT(*) FROM evaluations').fetchone()[0]
        home=c.execute("SELECT COUNT(*) FROM evaluations WHERE origin='HOME_STRUCTURE'").fetchone()[0]
        nonzero=c.execute('SELECT COUNT(*) FROM evaluations WHERE candidate_score>0 AND origin=\'CROSS_SPHERE\'').fetchone()[0]
        nc=c.execute('SELECT COUNT(DISTINCT node_id) FROM evaluations').fetchone()[0]
        sc=c.execute('SELECT COUNT(DISTINCT sphere_id) FROM evaluations').fetchone()[0]
        ff=c.execute("SELECT COUNT(*) FROM evaluations WHERE node_id='H08.S01.N10' AND origin='CROSS_SPHERE' AND risk='MUSICAL_INSTRUMENT_FALSE_FRIEND'").fetchone()[0]
        meta=c.execute("SELECT COUNT(*) FROM evaluations WHERE origin='CROSS_SPHERE' AND node_role='EPISTEMIC_META' AND risk='EPISTEMIC_METHOD_LENS_NOT_DOMAIN_EQUIVALENCE'").fetchone()[0]
    if (count,home,nonzero,nc,sc,ff,meta)!=(248832,1728,m['nonzeroLexicalSignalsUnreviewed'],1728,144,143,102960):
        raise SourceHold('MATRIX_COMPLETENESS_INVARIANT_FAILED')
    records=[json.loads(s) for s in (out/'node_passes_1728.jsonl').read_text().splitlines()]
    spheres=json.loads((out/'sphere_reviews_144.json').read_text())
    houses=json.loads((out/'house_followups_12.json').read_text())
    if len(records)!=1728 or len(spheres)!=144 or len(houses)!=12:raise SourceHold('RECEIPT_COUNTS_INVALID')
    for seq,r in enumerate(records,1):
        if r['slot']!=seq or r['nodeId']!=f'H{(seq-1)//144+1:02d}.S{((seq-1)%144)//12+1:02d}.N{((seq-1)%12)+1:02d}' or r.get('reviewState')!='UNREVIEWED' or r.get('workPosted'):
            raise SourceHold('NODE_STATUS_OR_SEQUENCE_INVALID')
        copy=dict(r);rhash=copy.pop('receiptSHA256')
        if digest(copy)!=rhash:raise SourceHold('NODE_RECEIPT_INVALID')
    for i,r in enumerate(spheres):
        if len(r['homeNodes'])!=12 or r['evaluatedNodes']!=1728 or r['externalEvaluated']!=1716:raise SourceHold('SPHERE_COVERAGE_INVALID')
        c=dict(r);h=c.pop('receiptSHA256')
        if digest(c)!=h:raise SourceHold('SPHERE_RECEIPT_INVALID')
    for r in houses:
        if r['nodePasses']!=144 or r['sphereReviews']!=12:raise SourceHold('HOUSE_COUNTS_INVALID')
        c=dict(r);h=c.pop('receiptSHA256')
        if digest(c)!=h:raise SourceHold('HOUSE_RECEIPT_INVALID')
    return {'verified':True,'schema':VERSION,'rows':count,'home':home,'cross':count-home,'houses':12,'spheres':144,'nodePasses':1728,'originalSourceSHA256':SOURCE_SHA,'release':'NOT_DEPLOYED','actualResidentMacroturns':0}

def main():
    p=argparse.ArgumentParser();p.add_argument('command',choices=['build','verify']);p.add_argument('--registry');p.add_argument('--out',required=True)
    a=p.parse_args()
    try:
        if a.command=='build':
            if not a.registry:raise SourceHold('ORIGINAL_REGISTRY_PATH_REQUIRED')
            result=build(load_original(a.registry),a.out)
        else:result=verify(a.out)
        print(json.dumps(result,indent=2))
    except (SourceHold,KeyError,ValueError,sqlite3.Error) as e:
        print('HOLD:',str(e),file=sys.stderr);sys.exit(2)
if __name__=='__main__':main()
