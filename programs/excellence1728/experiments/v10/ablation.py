"""Falsifier: decorrelate planted faults from the risk signal without retraining policies."""
from __future__ import annotations
import json, statistics, sys, csv
from pathlib import Path
from hierarchy180 import read_source_and_v09,year_signal,node_policy_track,POLICIES,TRAIN,YEARS,sha

def run(source,out):
    data,_=read_source_and_v09(source);out=Path(out);out.mkdir(exist_ok=True,parents=True)
    gains=[];positive=negative=tied=0
    with (out/'ABLATION_NODE_HOLDOUT.csv').open('w',newline='') as f:
        writer=csv.writer(f);writer.writerow(['coordinate','original_training_selected','shifted_synthetic_faults_heldout_lift','selected_heldout_score','round_robin_heldout_score'])
        for item in data:
            ori=[year_signal(item,y) for y in range(YEARS)]
            train=[node_policy_track(item,p,ori)[0]['trainScore'] for p in range(len(POLICIES))]
            chosen=min(range(len(POLICIES)),key=lambda p:(-train[p],node_policy_track(item,p,ori)[0]['costUnits'],p))
            # Hold observational risk signals fixed; change latent faults on every
            # annual event to remove their engineered association. This is an
            # adversarial change of synthetic world assumptions, not an HSN source edit.
            other=[year_signal(item,(y+73)%YEARS)[4] for y in range(YEARS)]
            ablated=[(*o[:4],other[i],o[5]) for i,o in enumerate(ori)]
            c=node_policy_track(item,chosen,ablated)[0]['holdoutScore'];b=node_policy_track(item,0,ablated)[0]['holdoutScore']
            d=c-b;gains.append(d);positive+=d>0;negative+=d<0;tied+=d==0
            writer.writerow([item['id'],POLICIES[chosen],d,c,b])
    x={'schema':'atlas.hsn180.signal-correlation-ablation/v1','sourceSha256':data[0] and '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6',
       'method':'SELECTION_FROM_ORIGINAL_TRAINING_120; NO_RETRAIN; DECORRELATE_HIDDEN_FAULTS_BY_73_YEAR_ROTATION; MEASURE_HELDOUT_60',
       'nodes':1728,'positive':positive,'tied':tied,'negative':negative,
       'medianSyntheticLift':statistics.median(gains),'meanSyntheticLift':round(statistics.mean(gains),3),
       'noRealModelInference':True,'hosted':False,'scientificValidation':False,
       'interpretation':'Robustness falsifier in changed toy signal model; NOT empirical generalization'}
    x['sha256']=sha(x)
    (out/'ABLATION_REPORT.json').write_text(json.dumps(x,indent=2))
    return x
if __name__=='__main__':print(json.dumps(run(sys.argv[1],sys.argv[2]),indent=2))
