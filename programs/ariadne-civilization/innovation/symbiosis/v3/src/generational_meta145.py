#!/usr/bin/env python3
"""1,728 actual deterministic offline feedback generations over 1,728 synthetic nodes.
Train 1,296 generations; held-out final 432. Causal/scientific validity NOT claimed.
Uses full-information synthetic counterfactual rewards, impossible with ordinary real-world observations.
"""
import hashlib,json,pathlib,sys
from collections import Counter
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1];DIR=ROOT/'reports/full'
DTYPE=np.dtype([('node','<u2'),('repeat','<u2'),('score','<u2',(3,)),('stock','<u2',(3,)),('winner','u1'),('flags','u1'),('magic','<u2')])
PIN='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
TRAIN_END=1296; GENS=1728;NODES=1728

def load():
    chunks=[]
    for h in range(1,13):
        path=DIR/f'H{h:02d}.bin';v=np.fromfile(path,dtype=DTYPE)
        if v.size!=144*GENS or (v['magic']!=0xA145).any():raise ValueError('SHARD_CARDINALITY_OR_MAGIC')
        assert np.array_equal(v['node'],np.repeat(np.arange((h-1)*144,h*144),GENS))
        assert np.array_equal(v['repeat'],np.tile(np.arange(GENS),144))
        chunks.append(v)
    rows=np.concatenate(chunks).reshape((NODES,GENS))
    rewards=rows['score'].astype(np.float64)/65535
    flags=rows['flags']
    valid=np.stack([(flags&(1<<i))!=0 for i in range(3)],axis=-1)
    if valid.shape!=(NODES,GENS,3):raise ValueError('SHAPE')
    # Real candidates violating a hard floor must never be selected as valid.
    rewards=np.where(valid,rewards,-0.12)
    return rewards,valid,rows

def run():
    rewards,valid,rows=load()
    ew_s=np.zeros((144,3));ew_h=np.zeros((12,3));ew_g=np.zeros(3)
    trace=[];pol_counts={'flat':np.zeros(3,dtype=np.int64),'sphere':np.zeros(3,dtype=np.int64),'meta':np.zeros(3,dtype=np.int64)}
    results={x:{'sum':0.0,'held':0,'count':0} for x in ['flat','sphere','meta','oracle']}
    for gen in range(GENS):
        # Decisions use ONLY historical observations, frozen during the holdout.
        local_choice=np.argmax(ew_s+np.array([0.000003,0.000002,0.000001]),axis=1)
        meta_logits=0.55*ew_s+0.35*np.repeat(ew_h,12,axis=0)+0.10*ew_g[None,:]
        meta_choice=np.argmax(meta_logits+np.array([0.000003,0.000002,0.000001]),axis=1)
        flat_choice=np.zeros(144,dtype=np.int64)
        actual=rewards[:,gen,:];allowed=valid[:,gen,:]
        decisions={'flat':np.repeat(flat_choice,12),'sphere':np.repeat(local_choice,12),'meta':np.repeat(meta_choice,12),'oracle':np.argmax(actual,axis=1)}
        heldcount={}
        for policy,decision in decisions.items():
            at=np.arange(NODES)
            selected=actual[at,decision]; permitted=allowed[at,decision]
            results[policy]['sum']+=float(selected.sum());results[policy]['held']+=int((~permitted).sum());results[policy]['count']+=NODES
            heldcount[policy]=int((~permitted).sum())
            if policy in pol_counts:pol_counts[policy]+=np.bincount(decision,minlength=3)
        if gen<TRAIN_END:
            sphere_mean=actual.reshape((144,12,3)).mean(axis=1)
            house_mean=sphere_mean.reshape((12,12,3)).mean(axis=1)
            global_mean=house_mean.mean(axis=0)
            alpha=0.041
            ew_s=(1-alpha)*ew_s+alpha*sphere_mean
            ew_h=(1-alpha)*ew_h+alpha*house_mean
            ew_g=(1-alpha)*ew_g+alpha*global_mean
        trace.append({'generation':gen+1,'phase':'TRAIN' if gen<TRAIN_END else 'HELD_OUT_NO_UPDATE',
          'syntheticNodeCases':1728,'fictionalYearsPerCase':1728,
          'selectedBySphere':np.bincount(local_choice,minlength=3).tolist(),
          'selectedByMeta145':np.bincount(meta_choice,minlength=3).tolist(),
          'holds':heldcount,'newActualModelCalls':0,'newRealResidentMacroturns':0})
    half=GENS-TRAIN_END
    # Evaluate frozen policies independently on holdout (not same as training aggregate).
    frozen_s=np.argmax(ew_s+np.array([0.000003,0.000002,0.000001]),axis=1)
    frozen_m=np.argmax(0.55*ew_s+0.35*np.repeat(ew_h,12,axis=0)+0.10*ew_g[None,:]+np.array([0.000003,0.000002,0.000001]),axis=1)
    m=np.repeat(frozen_m,12);s=np.repeat(frozen_s,12);n=np.arange(NODES)[:,None]
    hold_rew=rewards[:,TRAIN_END:,:];hold_val=valid[:,TRAIN_END:,:]
    def score_for(choice):
        selected=np.take_along_axis(hold_rew,np.broadcast_to(choice[:,None,None],(NODES,half,1)),axis=2)[:,:,0]
        permitted=np.take_along_axis(hold_val,np.broadcast_to(choice[:,None,None],(NODES,half,1)),axis=2)[:,:,0]
        return {'meanSyntheticReward':round(float(selected.mean()),9),'held':int((~permitted).sum()),'cases':int(selected.size)}
    benchmark={'flat':score_for(np.zeros(NODES,dtype=np.int64)), 'sphere':score_for(s),'meta145':score_for(m)}
    best_rew=hold_rew.max(axis=2);best_val=hold_val.any(axis=2)
    benchmark['unattainableFullInformationOracle']={'meanSyntheticReward':round(float(best_rew.mean()),9),'held':int((~best_val).sum()),'cases':int(best_rew.size)}
    output={'schema':'atlas.ariadne.meta145.feedback-generations/v1','status':'SYNTHETIC_CASCADE_TESTED_NOT_HOSTED',
      'sourceRegistrySha256':PIN,'generations':GENS,'sourceNodesPerGeneration':NODES,
      'fictionalHorizonYearsPerCase':1728,'trainingGenerations':TRAIN_END,'heldOutGenerations':half,
      'trainingDataUsedToTuneHeldout':False,'fullInformationCounterfactualsAvailableInSyntheticOnly':True,
      'objective':'SYNTHETIC_SCORE_WITH_NONOFFSETTABLE_FAILURE_PENALTY_NOT_INTELLIGENCE',
      'policyBudgetsEqual':True,'benchmarkHeldOut':benchmark,
      'meta145ImprovementOverFlatMeasuredOnSyntheticHoldout':round(benchmark['meta145']['meanSyntheticReward']-benchmark['flat']['meanSyntheticReward'],9),
      'meta145ImprovementOverSphereMeasuredOnSyntheticHoldout':round(benchmark['meta145']['meanSyntheticReward']-benchmark['sphere']['meanSyntheticReward'],9),
      'selectionHistoryCounts':{name:counts.tolist() for name,counts in pol_counts.items()},
      'advisoryWeightsFrozenAfterGeneration':TRAIN_END,'originalAriadneRawBytesRechecked':False,
      'realAgentTurns':0,'realModelCalls':0,'acceptedScientificClaims':0,'hostRightsVerified':False,'canonChanges':0,'externalEffects':0,'authorityEffect':'NONE'}
    (DIR/'META145_FEEDBACK_GENERATIONS_1728.jsonl').write_text(''.join(json.dumps(x,separators=(',',':'))+'\n' for x in trace))
    output['feedbackTraceSha256']=hashlib.sha256((DIR/'META145_FEEDBACK_GENERATIONS_1728.jsonl').read_bytes()).hexdigest()
    (DIR/'META145_FEEDBACK_BENCHMARK.json').write_text(json.dumps(output,indent=2,sort_keys=True)+'\n')
    return output
if __name__=='__main__':
    x=run();print(json.dumps({k:x[k] for k in ['generations','benchmarkHeldOut','meta145ImprovementOverFlatMeasuredOnSyntheticHoldout','meta145ImprovementOverSphereMeasuredOnSyntheticHoldout','feedbackTraceSha256']},indent=2))
