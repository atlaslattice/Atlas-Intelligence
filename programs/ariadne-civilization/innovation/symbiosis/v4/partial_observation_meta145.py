#!/usr/bin/env python3
"""Ariadne v4: four equal-observation-policy feedback simulations.
NO model APIs, no actual host, not genuine learning/model training. Uses ONLY
observed action reward for updates. Original four counterfactuals remain in
an owner-private synthetic test fixture and are used only for offline grading.
"""
from __future__ import annotations
import hashlib, json, pathlib, numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'outputs/full'
N=1728;S=144;G=1728;TRAIN=1296;ARMS=4
DTYPE=np.dtype([('node','<u2'),('repeat','<u2'),('score','<u2',(4,)),('stock','<u2',(4,)),('selected','u1'),('feasible','u1'),('flags','u1'),('accepted','u1'),('magic','<u2')]);assert DTYPE.itemsize==26

def load():
    records=[]
    for h in range(12):
        r=np.fromfile(OUT/f'H{h+1:02}.bin',dtype=DTYPE)
        if r.size!=144*G or not np.all(r['magic']==0xA146):raise ValueError('RECEIPTS_NOT_AUTHENTICATED')
        if not np.array_equal(r['node'],np.repeat(np.arange(h*144,(h+1)*144),G)):raise ValueError('NODE_ORDER')
        if not np.array_equal(r['repeat'],np.tile(np.arange(G),144)):raise ValueError('REPEAT_ORDER')
        records.append(r)
    r=np.concatenate(records).reshape(N,G)
    value=r['score'].astype(np.float64)/65535.
    ok=np.stack([(r['feasible']&(1<<j))!=0 for j in range(ARMS)],axis=-1)
    # Use a signed negative for invalid decisions, never silently select them as success.
    value=np.where(ok,value,-0.25)
    return value,ok,r

def metrics(returns,valid,actions):
    # returns shape (N, horizon, 4), actions shape (N,)
    n=returns.shape[0];horizon=returns.shape[1]
    idx=np.broadcast_to(actions[:,None,None],(n,horizon,1));rw=np.take_along_axis(returns,idx,axis=2)[:,:,0];ok=np.take_along_axis(valid,idx,axis=2)[:,:,0]
    return {'cases':int(rw.size),'meanPenalizedSyntheticReward':round(float(rw.mean()),9),'heldDecisions':int((~ok).sum()),'armCountsAcrossNodes':np.bincount(actions,minlength=ARMS).tolist(), 'negativeOutcomeCount':int((rw<0).sum())}

def choice(scores,count,t,mode):
    # shape scores (144,4) and count (144,4): one choice per sphere, 12 nodes observed
    if t<TRAIN and t%12<4: return (np.arange(S)+(t%4)+t//12)%ARMS # genuinely distinct first-four exploration arms
    if mode=='sphere':pred=scores.copy()
    else:
        hs=np.repeat(scores.reshape(12,12,ARMS).mean(axis=1),12,axis=0)
        globe=np.broadcast_to(scores.mean(axis=0),(S,ARMS))
        pred=0.72*scores+0.22*hs+0.06*globe
        if mode=='robust':
            # pessimistic uncertainty discount for poorly sampled arms, no privileged counterfactuals
            pred=pred-0.018/np.sqrt(count+1)
    return np.argmax(pred+np.array([4e-7,3e-7,2e-7,1e-7]),axis=1)

def simulate(value,valid):
    models={k:{'sums':np.zeros((S,ARMS)), 'counts':np.zeros((S,ARMS),dtype=np.int64),'countsPerGeneration':[], 'actions':None, 'selectedRewardSum':0.0,'selectedCount':0,'heldTraining':0} for k in ('sphere','meta145','robust_meta145')}
    lines=[]
    # Unlike v3, each model observes only the alternative it selected; no counterfactual EWMA.
    for t in range(TRAIN):
        events=[]
        for name,history in models.items():
            cnt=history['counts'];avg=np.divide(history['sums'],np.maximum(cnt,1))
            a=choice(avg,cnt,t, 'sphere' if name=='sphere' else ('robust' if name=='robust_meta145' else 'meta'))
            armPerNode=np.repeat(a,12);rew=value[np.arange(N),t,armPerNode];isvalid=valid[np.arange(N),t,armPerNode]
            sphereReward=rew.reshape(S,12).mean(axis=1)
            history['sums'][np.arange(S),a]+=sphereReward
            history['counts'][np.arange(S),a]+=1
            history['selectedRewardSum']+=float(rew.sum());history['selectedCount']+=N
            history['heldTraining']+=int((~isvalid).sum())
            events.append({'policy':name,'newObservationCount':N,'held':int((~isvalid).sum()),'selectedArmHistogram':np.bincount(a,minlength=ARMS).tolist()})
        lines.append({'generation':t+1,'phase':'TRAIN_PARTIAL_OBSERVATION','sourceNodeOpportunities':N,'simulatedYearsPerNode':1728,'events':events,'modelCalls':0,'realMacroturns':0})
    holdV=value[:,TRAIN:,:];holdOk=valid[:,TRAIN:,:]
    final={'flat':metrics(holdV,holdOk,np.zeros(N,dtype=np.int64))}
    for name,history in models.items():
        avg=np.divide(history['sums'],np.maximum(history['counts'],1))
        frozen=choice(avg,history['counts'],TRAIN,name if name=='sphere' else ('robust' if name=='robust_meta145' else 'meta'))
        history['actions']=np.repeat(frozen,12)
        final[name]=metrics(holdV,holdOk,history['actions'])
    # Paired HOUSE-block bootstrap: 12 correlated House clusters, not 746k independent civic observations.
    def selected_per_house(policy):
        if policy=='flat':actions=np.zeros(N,dtype=np.int64)
        else:actions=models[policy]['actions']
        idx=np.broadcast_to(actions[:,None,None],(N,G-TRAIN,1))
        returns=np.take_along_axis(holdV,idx,axis=2)[:,:,0]
        return returns.reshape(12,144,G-TRAIN).mean(axis=(1,2))
    hs={name:selected_per_house(name) for name in ('flat','sphere','meta145','robust_meta145')}
    rng=np.random.default_rng(1451728)
    draws=rng.integers(0,12,size=(5000,12))
    paired={}
    for left,right in [('meta145','sphere'),('meta145','flat'),('robust_meta145','sphere')]:
        differences=hs[left]-hs[right]
        samples=differences[draws].mean(axis=1)
        paired[left+'_minus_'+right]={'delta':round(float(differences.mean()),9),
            'houseBlockBootstrap95Percent':[round(float(np.quantile(samples,0.025)),9),round(float(np.quantile(samples,0.975)),9)],
            'houseBlockDifferences':[round(float(d),9) for d in differences],
            'only12Clusters':True,'statisticalIndependenceNotProven':True}
    oracle=np.max(holdV,axis=2)
    final['UNATTAINABLE_full_information_oracle']={'meanPenalizedSyntheticReward':round(float(oracle.mean()),9),'cases':int(oracle.size),'heldDecisions':int((oracle<0).sum())}
    # Controls: all models observe the same NUMBER, not same action; meta has no extra data.
    for name,history in models.items():
        assert history['selectedCount']==TRAIN*N
        assert int(history['counts'].sum())==TRAIN*S
    # Preserve exact policy choices so an independently reseeded challenge can be
    # evaluated WITHOUT retraining or reading its counterfactual outcomes.
    frozen={'schema':'atlas.ariadne.v4.frozen-actions/v1','originalSourceSha256':'07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6',
        'sourcePublisherAttested':False,'trainingGenerations':TRAIN,'holdoutGenerations':G-TRAIN,
        'actionsBySphere':{'flat':[0]*S,**{name:models[name]['actions'].reshape(S,12)[:,0].tolist() for name in models}},
        'newHoldoutEvaluatedDuringTraining':False,'actualModelCalls':0}
    frozenRaw=json.dumps(frozen,sort_keys=True,separators=(',',':'))+'\n'
    (OUT/'V4_FROZEN_ACTIONS.json').write_text(frozenRaw)
    frozenDigest=hashlib.sha256(frozenRaw.encode()).hexdigest()
    for t in range(TRAIN,G):
        lines.append({'generation':t+1,'phase':'HELD_OUT_FROZEN_NO_TRAINING','sourceNodeOpportunities':N,'simulatedYearsPerNode':1728,'modelCalls':0,'realMacroturns':0})
    trace=''.join(json.dumps(x,sort_keys=True,separators=(',',':'))+'\n' for x in lines)
    (OUT/'PARTIAL_OBSERVATION_1728.jsonl').write_text(trace)
    report={'schema':'atlas.ariadne.v4.partial-observation-meta145/v1','status':'SIMULATED_BANDIT_NOT_HOSTED_OR_REAL_LEARNING','scenarios':N*G,'generations':G,'trainingGenerations':TRAIN,'heldoutGenerations':G-TRAIN,'fictionalYearsPerScenario':1728,'nodePositions':N,'sphereRoles':S,'houseRoles':12,'policies':4,'competingArms':['flat','sphere','meta145','resource_aware_meta145'],'evaluation':final,'pairedHouseBlockContrasts':paired,'trainingObservationBudgetPerComparedPolicy':TRAIN*N,'trainingCounterfactualsUsedInUpdates':False,'sourceRegistrySha256':'07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6','frozenActionsSha256':frozenDigest,'originalSourceRehashedInThisRun':False,'modelCalls':0,'semanticLinksAccepted':0,'hostRightsVerified':False,'actualPeerMacroturns':0,'authorityEffect':'NONE','noClaimsOfGeneralAIImprovement':True,'traceSha256':hashlib.sha256(trace.encode()).hexdigest(),'trainingRecords':{name:{'uniqueEpochActionsObserved':int(h['counts'].sum()),'trainingHeld':h['heldTraining'],'uniqueArmCounts':h['counts'].sum(axis=0).tolist()} for name,h in models.items()}}
    (OUT/'V4_PARTIAL_OBSERVATION_BENCHMARK.json').write_text(json.dumps(report,indent=2)+'\n')
    return report
if __name__=='__main__':
 v,o,_=load();r=simulate(v,o);print(json.dumps({'evaluation':r['evaluation'],'traceSha256':r['traceSha256']},indent=2))
