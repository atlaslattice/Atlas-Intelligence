"""Derive transparent synthetic-only comparisons from finished hierarchy results."""
from pathlib import Path
import csv, json, statistics, sys
from hierarchy180 import POLICIES,UNCERT,RISK,DISSENT,UNRESOLVED,RESOLVED,COST,ELIGIBLE,NOVELTY,PROPOSED,COHERENCE,sha


def read(path):return [json.loads(line) for line in Path(path).open()]

def policy(x,name):return next(t for t in x['policyAlternatives'] if t['policy']==name)

def avg(it):return round(statistics.mean(it),3)

def med(it):return round(statistics.median(it),3)

def summarize(rows):
    lifts=[];training_lifts=[];coh=[];unres=[];budget=[];rights=[];tie=[]
    for x in rows:
        chosen=policy(x,x['chosenPolicy']);base=policy(x,'ROUND_ROBIN')
        lifts.append(chosen['holdoutScore']-base['holdoutScore'])
        training_lifts.append(chosen['trainScore']-base['trainScore'])
        coh.append(avg(r[COHERENCE] for r in x['yearlySelected'][120:]))
        unres.append(sum(r[UNRESOLVED] for r in x['yearlySelected'][120:]))
        budget.append(sum(r[COST] for r in x['yearlySelected'][120:]))
        rights.append(sum(1 for r in x['yearlySelected'][120:] if not r[ELIGIBLE]))
        tie.append(chosen['holdoutScore']==max(t['holdoutScore'] for t in x['policyAlternatives']))
    return {'count':len(rows),'trainLiftMeanVsRoundRobin':avg(training_lifts),
       'heldoutLiftMeanVsRoundRobin':avg(lifts),'heldoutLiftMedianVsRoundRobin':med(lifts),
       'heldoutPositive':sum(x>0 for x in lifts),'heldoutTied':sum(x==0 for x in lifts),
       'heldoutNegative':sum(x<0 for x in lifts),'chosenIsExPostHeldoutBestCount':sum(tie),
       'heldoutCoherenceProxyBpMean':avg(coh),'heldoutUnresolvedProxyMean':avg(unres),
       'heldoutCostUnitsMean':avg(budget),'heldoutSyntheticScopeHoldsMean':avg(rights),
       'chosenPolicyCounts':{p:sum(x['chosenPolicy']==p for x in rows) for p in POLICIES}}

def main(root,source_file):
    root=Path(root);source=json.loads(Path(source_file).read_text())
    layers={name:read(root/(name+'.jsonl')) for name in ('NODES','SPHERES','HOUSES')}
    layers['META145']=[json.loads((root/'META145.json').read_text())]
    summary=json.loads((root/'SUMMARY.json').read_text())
    result={'schema':'atlas.hsn.hierarchy180.critique/v1','sourceSHA':summary['sourceSha256'],
        'originalV09MetaRoot':summary['source']['v09MetaRoot'],
        'methods':{'train':'years 1-120, six preset policies','holdout':'years 121-180, untouched by selection',
                   'policyChoice':'max train synthetic utility; cost tie-break','comparators':['ROUND_ROBIN','ex-post hindsight only'],
                   'cognitionMeaning':'synthetic information triage, NOT model intelligence or empirical science'},
        'tiers':{k:summarize(v) for k,v in layers.items()},
        'limitations':['The audit oracle and risk signal are synthetic and correlated by design',
          'Only six fixed policies are compared; ex-post best is not an admissible selector',
          'Selections are not scientific review, historical years or model turns',
          'No Work identity, current READ/RETURN or real room ACL was consulted',
          'META145 optimization is bounded by a synthetic objective and can overfit training',
          'Cross-house lexical candidates from v09 remain unreviewed',
          'No causal inference or civilizational welfare outcomes were measured'],
        'officialExcellenceImplementedStepsClaimed':0,'sourceOnly':True}
    result['sha256']=sha(result)
    (root/'SYNTHESIS_ANALYSIS.json').write_text(json.dumps(result,indent=2,ensure_ascii=False))
    with (root/'NODE_METRICS_1728.csv').open('w',newline='',encoding='utf8') as f:
        fields=['hsn','house','sphere','original_name','original_role','selected_policy','train_score','holdout_score','baseline_holdout_score','lift_vs_baseline','holdout_coherence_bp','holdout_unresolved_count','holdout_cost_units','synthetic_scope_holds','unreviewed_bridges','cross_house_lexical_bp','source_record_sha256','source_only_status']
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
        for x in layers['NODES']:
            selected=policy(x,x['chosenPolicy'])
            y=x['yearlySelected'][120:]
            w.writerow({'hsn':x['id'],'house':x['id'][:3],'sphere':x['id'][:7],
               'original_name':source['nodes'][x['id']]['name'],'original_role':x['role'],
               'selected_policy':x['chosenPolicy'],'train_score':selected['trainScore'],'holdout_score':selected['holdoutScore'],
               'baseline_holdout_score':policy(x,'ROUND_ROBIN')['holdoutScore'],
               'lift_vs_baseline':selected['holdoutScore']-policy(x,'ROUND_ROBIN')['holdoutScore'],
               'holdout_coherence_bp':avg(z[COHERENCE] for z in y),'holdout_unresolved_count':sum(z[UNRESOLVED] for z in y),
               'holdout_cost_units':sum(z[COST] for z in y),'synthetic_scope_holds':sum(not z[ELIGIBLE] for z in y),
               'unreviewed_bridges':sum(z[PROPOSED] for z in y),'cross_house_lexical_bp':x['structuralCrossHouseSimilarityBp'],
               'source_record_sha256':x['recordSha256'],'source_only_status':'SYNTHETIC_NOT_ACCEPTED'})
    print(json.dumps(result['tiers'],indent=2))
    return result

if __name__=='__main__': main(sys.argv[1],sys.argv[2])
