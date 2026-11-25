"""Source-addressed, fully synthetic 1728-strategy + 144/12/META145 policy evaluation.

A strategy coordinate records a finite parameter candidate; it is NOT an Ariadne
semantic assignment, resident role, trained BGE weight or node implementation.
"""
from __future__ import annotations
import json, random, time, hashlib, statistics, math, sys
from pathlib import Path
from dataclasses import asdict
from .neural_evidence import ARIADNE_SHA, Policy, evaluate_neural_return, stable_digest


def source_fixture(hsn: str, *, phase: str, serial: int) -> dict:
    """Synthetic ranked candidates and authoritative ledger with disjoint root families."""
    rnd=random.Random(stable_digest([phase,serial,hsn]))
    root=f'{phase}-{serial:04d}'
    patterns=[
       ('revoked',.985,'SUPPORTS','X',True,'revoked'),
       ('A1',.94,'SUPPORTS','A',True,None),
       ('A2',.915,'SUPPORTS','A',True,None),
       ('borrowed',.89,'RELATED','X',True,'borrowed'),
       ('B',.81,'CONTRADICTS','B',True,None),
       ('C',.77,'SUPPORTS','C',True,None),
       ('unknown',.74,'UNRESOLVED','UNKNOWN',True,None),
       ('superseded',.72,'SUPPORTS','D',True,'superseded'),
       ('lexical',.66,'RELATED','E',True,None),
    ]
    ranked=[]; ledger={}; no_answer=(serial%12==0)
    for i,(tag,score,relation,family,work,issue) in enumerate(patterns):
       key=f'{root}/{tag}'; rev='v1'; d=stable_digest([root,tag,'semantic-v1']); doc=f'doc:{key}'
       source_sha=stable_digest([key,rev,'content']);cite=f'https://example.invalid/source/{key}'
       dct={'documentId':doc,'sourceId':key,'revision':rev,'sourceSha256':source_sha,'semanticDigest':d,'citation':cite,
            'mode':'WORK','workAllowed':work and not no_answer,'familyRoot':'UNKNOWN' if family=='UNKNOWN' else f'{root}/{family}',
            'relation':relation,'active':issue!='superseded','correctedBy':'v2' if issue=='superseded' else None,
            'validFrom':1,'validUntil':2000,'rightsEpoch':3,'returnDenied':issue=='revoked' or (serial%7==0 and tag=='A2')}
       if issue=='borrowed':
           # Grounded source record remains different; caller's candidate lies.
           dct['semanticDigest']=stable_digest([root,tag,'real-semantics'])
       ledger[key]=dct
       jitter=rnd.uniform(-.10,.05)
       ranked.append({'documentId':doc,'sourceId':key,'revision':rev,'sourceSha256':source_sha,'semanticDigest':d,
             'citation':cite,'score':max(0,min(1,score+jitter)), 'hsn':hsn,'sourceRegistrySha':ARIADNE_SHA,
             'route':'LEXICAL_BACKUP' if tag=='lexical' else 'NEURAL_DIRECT','mode':'WORK'})
    ranked.sort(key=lambda x:-x['score'])
    def read(key):return ledger.get(key)
    def auth(record,when):
       if record['workAllowed'] is not True: return False
       if when=='RETURN' and record['returnDenied']:return False
       return True
    subject=f'{hsn[:3]}.S01.{hsn.split(".")[-1]}' if int(hsn[5:7])>=8 else None
    return {'hsn':hsn,'subject_hsn':subject,'phase':phase,'serial':serial,'ranked':ranked,'ledger':ledger,'read':read,'auth':auth,
            'truthRoots':(f'{root}/A',f'{root}/C'),'contradictionRoot':f'{root}/B','noAnswer':no_answer,
            'sourceFamilies':[f'{root}/{p}' for p in ('A','B','C','D','E','X')]}


def score_output(result:dict,fixture:dict):
    rows=result.get('returned',[]); roots={x['familyRoot'] for x in rows if x['familyRoot']!='UNKNOWN'}
    overlap=len(roots & set(fixture['truthRoots']))
    correct_no_answer=not rows if fixture['noAnswer'] else bool(rows)
    contrad=fixture['contradictionRoot'] in roots
    precision=sum(x['familyRoot'] in set(fixture['truthRoots']) or x['familyRoot']==fixture['contradictionRoot'] for x in rows)/max(1,len(rows))
    return {'rootCoverage':len(roots),'targetRootsRecovered':overlap,'dissent':int(contrad),
            'correctAbstention':int(correct_no_answer),'syntheticPrecision':precision,
            'leaked':int(any(x['sourceId'].endswith(('/revoked','/borrowed','/superseded')) for x in rows)),
            'returned':len(rows)}


def summarized(metrics):
    n=len(metrics)
    avg=lambda k:sum(x[k] for x in metrics)/max(n,1)
    return {'n':n,'independentRootsPerQuery':round(avg('rootCoverage'),6),'targetRootsPerQuery':round(avg('targetRootsRecovered'),6),
            'dissentRetention':round(avg('dissent'),6),'correctAbstention':round(avg('correctAbstention'),6),
            'syntheticPrecision':round(avg('syntheticPrecision'),6),'sourceLeakCount':sum(x['leaked'] for x in metrics),
            'returnedPerQuery':round(avg('returned'),6)}


def objective(stats):
    # Max only within the local synthetic fixture. Safety and abstention required.
    if stats['sourceLeakCount']!=0 or stats['correctAbstention']<1:return -1e6
    return round(.36*(stats['independentRootsPerQuery']/3)+.27*stats['dissentRetention'] + .27*(stats['targetRootsPerQuery']/2)+.10*stats['syntheticPrecision'],9)


def evaluate(policy,fixtures):
    out=[]
    for f in fixtures:
       result=evaluate_neural_return(f['ranked'],f['read'],f['auth'],hsn=f['hsn'],policy=policy,subject_hsn=f['subject_hsn'])
       out.append(score_output(result,f))
    s=summarized(out);s['objective']=objective(s)
    return s


def all_coordinates():
    for h in range(1,13):
        for s in range(1,13):
            for n in range(1,13):
                yield f'H{h:02}.S{s:02}.N{n:02}',h,s,n


def strategy_policy(h,s,n):
    return Policy(round((h-1)*.05,4),round((s-1)*.04,4),round(.38+(n-1)*.04,4),3)


def run(registry,output_dir:Path,*,dev_count=144,holdout_count=144):
    output_dir.mkdir(parents=True,exist_ok=True)
    identities=registry['nodes']
    if len(identities)!=1728 or len(registry['spheres'])!=144 or len(registry['houses'])!=12:raise RuntimeError('SOURCE_SHAPE_HOLD')
    coords=list(all_coordinates())
    if {x[0] for x in coords}!=set(identities):raise RuntimeError('SOURCE_COORD_HOLD')
    if sum(v.get('kind')=='DOMAIN_SPECIALIZATION' for v in identities.values())!=1008 or sum(v.get('kind')=='EPISTEMIC_META' for v in identities.values())!=720:raise RuntimeError('SOURCE_ROLE_AXIS_HOLD')
    if any(not isinstance(identities[x]['source_record_sha256'],str) or len(identities[x]['source_record_sha256'])!=64 for x in identities):raise RuntimeError('SOURCE_RECORD_SHA_HOLD')
    # These are synthetic query/family fixtures, not MICA's 24-question FINAL silver panel.
    dev=[source_fixture(coords[(i*37)%1728][0],phase='DEV',serial=i) for i in range(dev_count)]
    held=[source_fixture(coords[(i*53+7)%1728][0],phase='FINAL',serial=i) for i in range(holdout_count)]
    assert not ({fam for x in dev for fam in x['sourceFamilies']} & {fam for x in held for fam in x['sourceFamilies']})
    rows=[]
    start=time.perf_counter()
    for hsn,h,s,n in coords:
        p=strategy_policy(h,s,n)
        stat=evaluate(p,dev)
        rows.append({'strategyId':f'NEURAL-STRATEGY-{hsn}','sourceCoordinate':hsn,
                     'strategyMapping':'POSITIONAL_EXPERIMENT_CONFIG_NOT_ONTOLOGY_SEMANTIC',
                     'house':f'H{h:02}','sphere':f'H{h:02}.S{s:02}',
                     'sourceRecordSha256':identities[hsn]['source_record_sha256'],
                     'policy':asdict(p),'development':stat,'state':'SIMULATED_NOT_DEPLOYED'})
    duration=time.perf_counter()-start
    winners=[]
    for h in range(1,13):
        for s in range(1,13):
            subset=[x for x in rows if x['sphere']==f'H{h:02}.S{s:02}']
            win=max(subset,key=lambda x:(x['development']['objective'],-x['policy']['min_score'],-x['policy']['family_bonus'],-x['policy']['dissent_bonus']))
            winners.append({'sphereId':f'H{h:02}.S{s:02}','sourceName':registry['spheres'][f'H{h:02}.S{s:02}'].get('name') or registry['spheres'][f'H{h:02}.S{s:02}'].get('title'),
                            'winner':win['strategyId'],'objective':win['development']['objective'],'alternatives':12})
    houses=[]
    for h in range(1,13):
        subset=[x for x in winners if x['sphereId'].startswith(f'H{h:02}.')]
        houses.append({'houseId':f'H{h:02}','sphereReviews':len(subset),'candidatePolicies':144,
                       'synthesis':'MEASURED_LOCAL_DEV_ONLY_NOT_EXPERT_CONSENSUS','bestDevObjective':max(x['objective'] for x in subset)})
    # Lock after 1728 dev comparisons, evaluate final once on disjoint synthetic families.
    candidate=max(rows,key=lambda x:(x['development']['objective'],-x['policy']['min_score']))
    selected=Policy(**candidate['policy'])
    baseline=Policy(0.,0.,0.38,3)
    selected_test=evaluate(selected,held)
    base_test=evaluate(baseline,held)
    final={
        'schema':'atlas.neural.meta145.strategy-sweep/v1','status':'LOCAL_SYNTHETIC_ONLY',
        'originalRegistrySha256':ARIADNE_SHA,'releaseFixture':'SYNTHETIC_TEST_PRETRAINED_RELEASE_NOT_MICA',
        'strategyCount':len(rows),'sphereSelections':len(winners),'houseRollups':len(houses),'metaBuildCount':1,
        'strategyTrainingCases':len(dev),'heldoutCases':len(held),'sourceFamiliesOverlap':0,
        'metaSelectedStrategy':candidate['strategyId'],'metaSelectedPolicy':candidate['policy'],
        'baselinePolicy':asdict(baseline),'baselineHeldout':base_test,'selectedHeldout':selected_test,
        'improvementAssessment':'SYNTHETIC_EVIDENCE_SELECTION_ONLY_NO_BGE_QUALITY_REEVALUATION',
        'strategiesEvaluatedLocally':len(rows),'strategiesImplementedAsNeuralWeightUpdates':0,
        'trainingPerformed':False,'modelCalls':0,'liveHostCalls':0,'hostedVerified':False,
        'humanEvalPerformed':False,'silverPanelReused':False,'elapsedSeconds':round(duration,3),
        'technicalObjections':['Synthetic family-design may favor a diversity/dissent heuristic.','The locked MICA 24-item silver panel is not used or retuned.',
           'No BGE weights/index and no authenticated host publisher were available here.',
           'Positions enumerate configurations only; no node meaning is inferred from hyperparameters.',
           'Warm/local performance is not hosted latency or cross-domain semantic gain.']}
    (output_dir/'strategies_1728.jsonl').write_text(''.join(json.dumps(x,sort_keys=True)+'\n' for x in rows))
    (output_dir/'sphere_144.json').write_text(json.dumps(winners,indent=2,sort_keys=True))
    (output_dir/'houses_12.json').write_text(json.dumps(houses,indent=2,sort_keys=True))
    (output_dir/'meta145.json').write_text(json.dumps(final,indent=2,sort_keys=True))
    (output_dir/'source_only_report.json').write_text(json.dumps({k:v for k,v in final.items() if k not in ('originalRegistrySha256',)},indent=2))
    return final


def main():
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--registry',required=True);parser.add_argument('--out',required=True)
    a=parser.parse_args();raw=Path(a.registry).read_bytes()
    if hashlib.sha256(raw).hexdigest()!=ARIADNE_SHA:raise SystemExit('HOLD: original source SHA mismatch')
    registry=json.loads(raw)
    o=run(registry,Path(a.out));print(json.dumps(o,indent=2))
if __name__=='__main__':main()
