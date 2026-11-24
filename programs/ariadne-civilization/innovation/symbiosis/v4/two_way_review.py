#!/usr/bin/env python3
"""Peer-inspired epistemic challenge: heldout independent wave & two-way bootstrap.
An honest SOURCE-ONLY synthetic sensitivity test, not scientific confidence or host verification.
"""
import pathlib,json,hashlib,numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1];FULL=ROOT/'outputs/full';RESEED=ROOT/'outputs/holdout'
DTYPE=np.dtype([('node','<u2'),('repeat','<u2'),('score','<u2',(4,)),('stock','<u2',(4,)),('selected','u1'),('feasible','u1'),('flags','u1'),('accepted','u1'),('magic','<u2')]);assert DTYPE.itemsize==26
PIN='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'

def load_wave(directory,heldout=True):
 R=1728 if heldout else 432
 parts=[]
 for h in range(1,13):
  f=directory/f'H{h:02}.bin';r=np.fromfile(f,dtype=DTYPE)
  assert r.size==144*R,(h,r.size)
  assert np.all(r['magic']==(0xA146 if heldout else 0xA147))
  assert np.array_equal(r['node'],np.repeat(np.arange((h-1)*144,h*144),R))
  assert np.array_equal(r['repeat'],np.tile(np.arange(R),144))
  assert np.all(r['accepted']==0)
  assert np.all((r['feasible']==0)==(r['selected']==4))
  assert np.all((r['feasible']==0)|((r['flags']&3)==3))
  parts.append(r)
 rows=np.concatenate(parts).reshape((1728,R))
 rows=rows[:,1296:] if heldout else rows
 scores=rows['score'].astype('float64')/65535
 feasible=np.stack([(rows['feasible']&(1<<i))!=0 for i in range(4)],axis=-1)
 return np.where(feasible,scores,-0.25),feasible

def scores_for_policy(reward,actions):
 assert len(actions)==144 and all(type(a)==int and 0<=a<4 for a in actions)
 acts=np.repeat(np.asarray(actions),12)
 rows=np.arange(1728)[:,None];times=np.arange(reward.shape[1])[None,:]
 selected=reward[rows,times,acts[:,None]]
 return selected.reshape(12,144,reward.shape[1]).mean(axis=1) # House×challenge

def two_way_diff(matrix,seed=145,draws=4000):
 rng=np.random.default_rng(seed);H,T=matrix.shape
 assert H==12 and T==432
 # Resample BOTH House and shared hypothetical challenge index. Comparing models
 # uses same h/t draws, retaining paired design and within-challenge co-shocks.
 samples=np.empty(draws)
 for i in range(draws):
  hh=rng.integers(0,H,size=H);tt=rng.integers(0,T,size=T)
  samples[i]=matrix[np.ix_(hh,tt)].mean()
 return {'delta':float(matrix.mean()),'twoWayHouseChallenge95':[float(np.quantile(samples,0.025)),float(np.quantile(samples,0.975))],
   'negativeHouseCount':int((matrix.mean(axis=1)<0).sum()), 'method':'PAIRED_TWO_WAY_RESAMPLING_SYNTHETIC_ONLY',
   'samplingUnits':{'houses':H,'sharedChallengeIndices':T},'independenceProof':False}

def null_control(worlds=100,draws=300):
 # Exactly zero true effect; a shared per-scenario shock induces cross-house dependence.
 rng=np.random.default_rng(1405);false={'HOUSE_ONLY':0,'TWO_WAY':0}
 for rep in range(worlds):
  shocks=rng.normal(0,0.020,size=432) # common to all houses within challenge
  noise=rng.normal(0,0.001,size=(12,432))
  m=shocks[None,:]+noise
  hmeans=m.mean(axis=1)
  # Deliberately incorrect: resampling houses only conditions on one realized shock path.
  indices=rng.integers(0,12,size=(draws,12));house_means=hmeans[indices].mean(axis=1)
  hm=np.quantile(house_means,[.025,.975])
  tw=two_way_diff(m,seed=rep+93471,draws=draws)['twoWayHouseChallenge95']
  false['HOUSE_ONLY']+=not(hm[0]<=0<=hm[1])
  false['TWO_WAY']+=not(tw[0]<=0<=tw[1])
 return {'source':'SYNTHETIC_GENERATIVE_NULL_WITH_SHARED_CHALLENGE_SHOCK','worlds':worlds,
   'falseExclusions':false,'trueEffect':0.0,'proofOfPhysicalSignificance':False}

def main():
 frozen=json.loads((FULL/'V4_FROZEN_ACTIONS.json').read_text())
 assert frozen['schema']=='atlas.ariadne.v4.frozen-actions/v1' and frozen['sourcePublisherAttested'] is False
 actions=frozen['actionsBySphere'];assert len(actions)==4
 result={'schema':'atlas.ariadne.v4.peer-bootstrap-correction/v1',
  'status':'SYNTHETIC_REVIEW_NOT_EMPIRICALLY_VALIDATED','sourceOriginalSha256':PIN,'sourceOriginalBytesRehashedHere':False,
  'peerChallenge':'Cairnwhistle SwarmChat seq117: House-only bootstrap can overstate confidence when shocks shared by challenges',
  'reseededChallengeIsFreshWorldNotNewPhysicalEvidence':True,'policyTrainingFrozenAcrossReseeding':True,
  'waves':{},'nullWorldControl':null_control(), 'actualModelCalls':0,'actualPeerAuthentication':False,'canonChanges':0}
 for name,folder,is_full in [('originalHeldout',FULL,True),('freshReseeded432',RESEED,False)]:
  rewards,_=load_wave(folder,is_full)
  results={policy:scores_for_policy(rewards,acts) for policy,acts in actions.items()}
  sample={'policyHeldoutSyntheticRewards':{policy:round(float(r.mean()),9) for policy,r in results.items()},
      'metaMinusSphere':two_way_diff(results['meta145']-results['sphere'],seed=202645,draws=3500),
      'robustMinusSphere':two_way_diff(results['robust_meta145']-results['sphere'],seed=202649,draws=3500),
      'freshChallenges':rewards.shape[1],
      'sameActionsAsOriginalTraining':True,'hostRightsVerified':False}
  result['waves'][name]=sample
 out=ROOT/'outputs'/'TWO_WAY_AND_RESEED_PEER_REVIEW.json'
 out.write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps({'null':result['nullWorldControl'],'original':result['waves']['originalHeldout'],'reseeded':result['waves']['freshReseeded432']},indent=2))
 return result
if __name__=='__main__':main()
