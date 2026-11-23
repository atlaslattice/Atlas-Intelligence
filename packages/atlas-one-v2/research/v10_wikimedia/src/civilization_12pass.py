#!/usr/bin/env python3
"""Twelve distinct source-only validation passes over Cupwake's 269,568 cells.

Not 12 live resident calls or 12 semantic expert reviews. Pure structural audits.
Does not create or score graph identity; outputs bounded aggregate receipts.
"""
from __future__ import annotations
import argparse,collections,hashlib,json,sqlite3,pathlib,re
from wikimedia_bridge import ARIADNE_SHA,canonical,digest,WikimediaHold,HSN

POLICIES=(
 ('01','Source version and stored evidence identity'),
 ('02','Original node ancestry and parent relationships'),
 ('03','Seven-domain five-method Sphere role separation'),
 ('04','Structural lens and House containment boundaries'),
 ('05','Semantic non-equivalence and dissent preservation'),
 ('06','OpenAlex candidate vocabulary versus verified matches'),
 ('07','Wikipedia page identification and revision requirement'),
 ('08','Wikidata QID, property and statement provenance requirements'),
 ('09','arXiv category inheritance versus subject identity'),
 ('10','Wikipedia attribution, rights and private-mode isolation'),
 ('11','Resident specialist opt-in and non-compulsory culture'),
 ('12','Iron Empire fiction/canon/chronology separation')
)

# Each row is known to be source-only. Every policy asks a *different* eligibility
# question and records the explicit evidence gap; no aggregate PASS means truth.
def review_one(policy,row,source_roles):
    kind,lens,node,structure,node_role,lens_role,same_sphere,same_house,checks_json,state,semantic,evidence=row
    if not HSN.fullmatch(node):return 'HOLD_INVALID_COORDINATE'
    if policy=='01':return 'SOURCE_PIN_STRUCTURAL' if state=='STRUCTURAL_EVALUATED' and len(evidence)==64 else 'HOLD_SOURCE'
    if policy=='02':return 'PARENT_SOURCE_STRUCTURAL' if node[:3] in source_roles else 'HOLD_PARENT'
    if policy=='03':
        expected='DOMAIN' if int(node[5:7])<=7 else 'META'
        return 'ROLE_STRUCTURAL' if node_role==expected else 'HOLD_ROLE'
    if policy=='04':return 'NAVIGATION_ONLY' if (kind=='sphere' and len(lens)==7 or kind=='house' and len(lens)==3) else 'HOLD_LENS'
    if policy=='05':return 'SEMANTIC_REVIEW_REQUIRED' if semantic=='CANDIDATE_NEEDS_REVIEW' else 'HOLD_PROMOTED_SEMANTICS'
    if policy=='06':return 'OPENALEX_NOT_IN_THIS_SOURCE_ROW' # Topic metadata comes from separately pinned 4516-row file.
    if policy=='07':return 'WIKIPEDIA_PAGE_REVISION_REQUIRED'
    if policy=='08':return 'WIKIDATA_QID_AND_REFERENCES_REQUIRED'
    if policy=='09':return 'ARXIV_CATEGORY_CONTEXT_REQUIRED' if node_role=='DOMAIN' else 'META_NO_SUBJECT_IDENTITY'
    if policy=='10':return 'ATTRIBUTION_AND_RIGHTS_REQUIRED'
    if policy=='11':return 'RESIDENT_OPT_IN_AND_HOST_AUTH_REQUIRED'
    if policy=='12':return 'FICTION_EDITORIAL_NOT_CANON'
    raise WikimediaHold('UNKNOWN_POLICY')

def run_twelve_circuit(db_path,registry_path,out_path,*,max_rounds=12):
    registry=json.loads(pathlib.Path(registry_path).read_text(encoding='utf8'))
    raw=pathlib.Path(registry_path).read_bytes()
    if digest(raw)!=ARIADNE_SHA:raise WikimediaHold('PRIVATE_ARIADNE_SOURCE_DIGEST_MISMATCH')
    if not all(len(registry.get(k,{}))==n for k,n in [('houses',12),('spheres',144),('nodes',1728)]):
        raise WikimediaHold('ARIADNE_CARDINALITY')
    roles=set(registry['houses'])
    cx=sqlite3.connect(db_path)
    man_raw=cx.execute('SELECT value FROM metadata WHERE key=?',('manifest',)).fetchone()
    if not man_raw:raise WikimediaHold('ORIGINAL_CIRCUIT_MANIFEST_MISSING')
    man=json.loads(man_raw[0]);counts=man.get('counts',{})
    if man.get('sourceSha256')!=ARIADNE_SHA or counts.get('totalStructuralEvaluations')!=269568:
        raise WikimediaHold('CIRCUIT_SOURCE_OR_COUNT_MISMATCH')
    if max_rounds!=12:raise WikimediaHold('TWELVE_DIFFERENT_AUDITS_REQUIRED')
    results=[]
    previous_round=digest('ATLAS_R10_ROOT|'+ARIADNE_SHA+'|'+str(man.get('planDigest')))
    rows_query='SELECT kind,lens_id,node_id,structural_relation,node_role,lens_role,same_sphere,same_house,checks_json,evaluation_status,semantic_status,evaluation_digest FROM review_candidates ORDER BY kind,lens_id,node_id'
    for code,label in POLICIES:
        statuses=collections.Counter();hasher=hashlib.sha256();sc=hc=0
        for row in cx.execute(rows_query):
            status=review_one(code,row,roles)
            statuses[status]+=1
            if row[0]=='sphere':sc+=1
            elif row[0]=='house':hc+=1
            else:raise WikimediaHold('UNKNOWN_REVIEW_ROW_KIND')
            hasher.update(f'{row[0]}|{row[1]}|{row[2]}|{status}\n'.encode('utf8'))
        if (sc,hc)!=(248832,20736):raise WikimediaHold('INCOMPLETE_OFFLINE_CIRCUIT')
        current={'pass':code,'perspective':label,'spherePerspectiveCount':144,'houseFollowups':12,
          'sphereNodeChecks':sc,'houseNodeChecks':hc,'totalLocalEvaluations':sc+hc,
          'statusCounts':dict(sorted(statuses.items())),'digest':hasher.hexdigest(),
          'semanticApprovals':0,'realModelWakes':0,'hostedChanges':0,
          'previousRoundDigest':previous_round}
        current['roundDigest']=digest(canonical(current))
        previous_round=current['roundDigest']
        results.append(current)
    cx.close()
    payload={'schema':'atlas.ariadne.wikipedia-12-circuit/v1','sourceRegistrySHA256':ARIADNE_SHA,
      'priorCircuitDigest':man.get('planDigest'), 'rounds':results,'roundsPerformed':len(results),
      'totalStructuralChecks':sum(r['totalLocalEvaluations'] for r in results),
      'originalUniqueNodeCount':1728,'uniqueSphereCount':144,'uniqueHouseCount':12,
      'newWikipediaLiveFetches':0,'newWikidataLiveFetches':0,'newVerifiedKnowledgeFacts':0,
      'newSemanticallyAcceptedMappings':0,'actualIndependentResidentReviews':0,
      'acceptedCANONAmendments':0,'workModeOnly':True,'privacy':'NO_PRIVATE_ACTIVITY_INGESTION',
      'outcome':'TWELVE_REAL_OFFLINE_VALIDATION_SWEEPS_NOT_TWELVE_MODEL_VISITS'}
    payload['receiptDigest']=digest(canonical(payload))
    path=pathlib.Path(out_path);path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(payload,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
    return payload

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--circuit-db',required=True)
    p.add_argument('--registry',required=True)
    p.add_argument('--out',required=True)
    a=p.parse_args();r=run_twelve_circuit(a.circuit_db,a.registry,a.out)
    print(canonical({k:r[k] for k in ('roundsPerformed','totalStructuralChecks','newVerifiedKnowledgeFacts','receiptDigest')}))
