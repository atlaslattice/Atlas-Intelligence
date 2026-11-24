"""Untuned, disjoint synthetic canary workload for selected v0.8 codebase."""
from __future__ import annotations
import json,sys
from pathlib import Path
from codebase_sim import read_source,init_workers,Program,SOURCE,sha,N

def evaluate(gene):
    p=Program(tuple(gene))
    for y in range(1728):
        # Different HSN mutation permutation, cold cross-House IDs, rights-epoch
        # cadence and hot window from BOTH training and validation workloads.
        changed=(y*499+101)%N
        hot=1000+(y*17+13)%64
        cold=(y*971+43)%N
        p.year(y,changed,(hot,cold,changed))
    return p.stats()

def run(root):
    root=Path(root)
    coords,pins=read_source(root/'source/ariadne_v07_original.json');init_workers(coords,pins)
    s=json.loads((root/'outputs/META145_SYNTHESIS.json').read_text())
    top=tuple(s['winning_genes_final'])
    base=(0,0,0)
    A=evaluate(base);B=evaluate(top)
    ok=A['incorrect_results']==B['incorrect_results']==0 and A['rights_violations']==B['rights_violations']==0
    receipt={'schema':'atlas.meta145.codebase-sealed-canary/v08','sourceSha256':SOURCE,
       'canarySyntheticYears':1728,'queryOperationsPerPolicy':1728*3,
       'sourcePartition':'DIFFERENT_MUTATION_PERMUTATION_QUERY_MIX_AND_RIGHTS_EPOCH_GENERATOR',
       'baseline':{'genes':list(base),'estimatedCostUnits':A['score_units'],'incorrect':A['incorrect_results'],'maxCache':A['max_cache_entries']},
       'candidate':{'genes':list(top),'estimatedCostUnits':B['score_units'],'incorrect':B['incorrect_results'],'maxCache':B['max_cache_entries']},
       'candidateImprovedCostModel':B['score_units']<A['score_units'],'allOutputsValid':ok,
       'ratioBaselineOverCandidate':round(A['score_units']/B['score_units'],5),
       'sourceRuntimeVerified':False,'hosted':False,'modelQualityImprovementProven':False,
       'meaning':'Untuned SOURCE-ONLY synthetic canary, not independent real world or hosted hardware proof'}
    receipt['sha256']=sha(receipt)
    (root/'outputs/SEALED_SYNTHETIC_CANARY.json').write_text(json.dumps(receipt,indent=2))
    return receipt

if __name__=='__main__':print(json.dumps(run(sys.argv[1]),indent=2))
