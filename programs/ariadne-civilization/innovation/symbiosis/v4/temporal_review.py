#!/usr/bin/env python3
"""Ariadne v4.2 response to real Work peer #119. Deterministic, synthetic only.
Neither naive iid nor moving-block bootstrap proves independent future challenge generalization.
"""
from __future__ import annotations
import pathlib,json,hashlib,numpy as np
from two_way_review import load_wave,scores_for_policy
R=pathlib.Path(__file__).resolve().parents[1];F=R/'outputs/full';W=R/'outputs/holdout'

def bootstrap(matrix,block=1,seed=14599,draws=1000):
 assert matrix.shape==(12,432) and block in (1,12,24,48,96,144)
 rng=np.random.default_rng(seed);estimate=float(matrix.mean());values=[];clusters=432//block+(432%block>0)
 for k in range(draws):
  hs=rng.integers(0,12,size=12)
  starts=rng.integers(0,432,size=clusters)
  # Circular moving blocks preserve nearby challenges, but NOT absolute independence.
  ts=(starts[:,None]+np.arange(block)[None,:])%432
  ts=ts.ravel()[:432]
  values.append(float(matrix[np.ix_(hs,ts)].mean()))
 lo,hi=np.quantile(values,[.025,.975])
 return {'meanSyntheticDelta':estimate,'block':block,'twoWayBlockBootstrap95':[float(lo),float(hi)],
         'presentsScientificConfidence':False,'sameHouseWithinBlockCorrelationsNotProven':True}

def lag_stat(series,lag):
 x=np.asarray(series,dtype=float);assert lag>0 and lag<len(x)
 if x.std()<1e-15:return 0.0
 a=x[:-lag];b=x[lag:]
 return float(np.corrcoef(a,b)[0,1]) if a.std()>1e-15 and b.std()>1e-15 else 0.

def null_control(worlds=60,draws=180,rho=.94):
 rng=np.random.default_rng(4117);lengths=(1,24,48,96);failure={str(i):0 for i in lengths}
 for w in range(worlds):
  innovation=rng.normal(0,.006*np.sqrt(1-rho*rho),size=432)
  common=np.empty(432);common[0]=rng.normal(0,.006)
  for t in range(1,432):common[t]=rho*common[t-1]+innovation[t]
  m=common[None,:]+rng.normal(0,.001,size=(12,432));assert m.shape==(12,432)
  for block in lengths:
   q=bootstrap(m,block=block,seed=4117+w*997+block,draws=draws)['twoWayBlockBootstrap95']
   failure[str(block)]+=int(not q[0]<=0<=q[1])
 return {'status':'SYNTHETIC_NULL_ONLY','trueEffect':0.0,'houseCount':12,'challengeCount':432,'worlds':worlds,
   'trueShockRho':rho,'bootstrapDrawsPerWorld':draws,'blockLengths':list(lengths),'falseZeroExclusionCounts':failure,
   'calibrationNotGuaranteedByAnyBlock':True,'source':'AR1_SYNTHETIC_SHARED_CHALLENGE_NO_HOST_OR_SCIENCE'}

def evaluate():
 actions=json.loads((F/'V4_FROZEN_ACTIONS.json').read_text())['actionsBySphere'];out={}
 for name,folder,full in [('originalHeldout',F,True),('freshReseeded432',W,False)]:
  v,_=load_wave(folder,full)
  meta=scores_for_policy(v,actions['meta145']);sphere=scores_for_policy(v,actions['sphere']);effect=meta-sphere
  g=effect.mean(axis=0)
  out[name]={'blocks':{str(b):bootstrap(effect,block=b,seed=1519+b,draws=2500) for b in (1,12,24,48,96)},
    'lagCorrelationAcrossCommonChallengeIndex':{str(l):lag_stat(g,l) for l in (1,2,12,24,48)},
    'houseLagOneCorrelations':[lag_stat(effect[i],1) for i in range(12)],
    'effectMean':float(effect.mean()),'totalScenarioCases':1728*432,'modelCalls':0}
 report={'schema':'atlas.ariadne.v4.peer-temporal-review/v1','status':'SYNTHETIC_PSEUDO_TEMPORAL_STRESS_ONLY',
   'peerChallenge':'Cairnwhistle source-linked SwarmChat #119 AR(1) shared temporal shock',
   'nullWorld':null_control(), 'observedSyntheticWaves':out,'sourceRegistryOriginalRehashed':False,
   'realBlindPeerEvaluation':False,'realHouseWelfareValidation':False,'hostRightsVerified':False,'modelCalls':0,'authorityEffect':'NONE'}
 (R/'outputs/TEMPORAL_CORRELATION_PEER_REVIEW.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps({'null':report['nullWorld'],'waveSummaries':{n:{'delta':v['effectMean'],'blocks':{b:x['twoWayBlockBootstrap95'] for b,x in v['blocks'].items()},'lags':v['lagCorrelationAcrossCommonChallengeIndex']} for n,v in out.items()}},indent=2))
 return report
if __name__=='__main__':evaluate()
