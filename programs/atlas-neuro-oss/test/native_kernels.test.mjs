import test from 'node:test';import assert from 'node:assert/strict';
import {sha,vectorCacheKey,evidenceBindingKey,stableExactTopK,lifStep,runEventLif,familySplitPreview,reviewNeuralReferences,parseHSN} from '../src/native_core.mjs';
const A='a'.repeat(64),B='b'.repeat(64);
test('vector cache stable independent of source permission metadata',()=>{
 const x=vectorCacheKey({encoderRevision:'bge-s1',semanticDigest:A,poolingVersion:'mean-v1'});
 assert.match(x,/^[a-f0-9]{64}$/);
 assert.equal(x,vectorCacheKey({encoderRevision:'bge-s1',semanticDigest:A,poolingVersion:'mean-v1'}));
 assert.notEqual(x,vectorCacheKey({encoderRevision:'bge-s2',semanticDigest:A,poolingVersion:'mean-v1'}));
});
test('evidence key changes on rightsEpoch despite same semantic vector',()=>{
 const q={sourceId:'source-A',sourceRevision:'v1',recordDigest:A,rightsEpoch:'epoch1',sourceFamily:'family-a',mode:'WORK'};
 assert.notEqual(evidenceBindingKey(q),evidenceBindingKey({...q,rightsEpoch:'epoch2'}));
 assert.notEqual(evidenceBindingKey(q),evidenceBindingKey({...q,sourceId:'source-B'}));
 assert.equal(evidenceBindingKey({...q,mode:'PALACE'}),null);
});
test('stable top-k handles ties without coerced boolean score',()=>{
 const x=stableExactTopK([{id:'a',score:0.5},{id:'b',score:0.5},{id:'c',score:0.9},{id:'d',score:-1}],3);
 assert.deepEqual(x.map(y=>y.id),['c','a','b']);
 assert.deepEqual(stableExactTopK([{id:'a',score:true}],1),[]);
 assert.deepEqual(stableExactTopK([{id:'a',score:NaN}],1),[]);
});
test('synthetic LIF oracle: threshold reset and exact states',()=>{
 assert.deepEqual(lifStep(0,.6,{beta:.5,threshold:1}),{voltage:.6,spike:0,integrated:.6,energyMeasured:false});
 const r=lifStep(.6,.75,{beta:.5,threshold:1,reset:'subtract'});
 assert.equal(r.spike,1);assert.ok(Math.abs(r.voltage-.05)<1e-12);
 assert.equal(lifStep(.6,.75,{beta:.5,threshold:1,reset:'zero'}).voltage,0);
});
test('event-trace deterministic; no energy/physics claim',()=>{
 const a=runEventLif([.6,.6,.1,.9,.5],{beta:.75}),b=runEventLif([.6,.6,.1,.9,.5],{beta:.75});
 assert.deepEqual(a,b);assert.equal(a.energyMeasured,false);assert.equal(a.synapticEvents,5);assert.ok(a.spikeIndices.length>=1);
});
test('LIF rejects unbounded and nonfinite values',()=>{
 assert.throws(()=>lifStep(0,1,{beta:1.1}),/INVALID_LIF/);
 assert.throws(()=>lifStep(0,1,{threshold:0}),/INVALID_LIF/);
 assert.throws(()=>runEventLif([Infinity]),/INVALID_EVENTS/);
});
test('family split refuses leaked ancestor across train and final',()=>{
 const x=[{sourceFamily:'rootA',split:'TRAIN',verifiedFamily:true,eligibleForTrain:true},{sourceFamily:'rootA',split:'FINAL',verifiedFamily:true,eligibleForTrain:true}];
 assert.equal(familySplitPreview(x).status,'HOLD_NOT_AUTHORIZED');
});
test('family split projected only; cannot train',()=>{
 const x=[{sourceFamily:'rootA',split:'TRAIN',verifiedFamily:true,eligibleForTrain:true},{sourceFamily:'rootB',split:'DEV',verifiedFamily:true,eligibleForTrain:false}];
 const r=familySplitPreview(x);assert.equal(r.status,'SOURCE_ONLY_SPLIT_PROJECTION');assert.equal(r.canTrain,false);
});
test('off-result hidden denied source influences entire answer -> HOLD',()=>{
 const x=reviewNeuralReferences({verifiedInfluenceInventory:true,
   candidates:[{id:'A1',sourceId:'source-a',recordDigest:A,mode:'WORK'}],
   sourceUse:[{sourceId:'source-a',allowed:true},{sourceId:'source-hidden',allowed:false}],
   returnDisclosure:[{sourceId:'source-a',allowed:true}]});
 assert.equal(x.status,'HOLD_NOT_AUTHORIZED');
});
test('uncited source inference allowed even if not disclosable',()=>{
 const x=reviewNeuralReferences({verifiedInfluenceInventory:true,
   candidates:[{id:'A1',sourceId:'source-a',recordDigest:A,mode:'WORK'}],
   sourceUse:[{sourceId:'source-a',allowed:true},{sourceId:'source-hidden',allowed:true}],
   returnDisclosure:[{sourceId:'source-a',allowed:true},{sourceId:'source-hidden',allowed:false}]});
 assert.equal(x.status,'LOCAL_REFERENCES_PREPARED');assert.equal(x.canPublish,false);
});
test('source allowed to use but denied returned evidence -> HOLD',()=>{
 const x=reviewNeuralReferences({verifiedInfluenceInventory:true,candidates:[{id:'A1',sourceId:'source-a',recordDigest:A,mode:'WORK'}],sourceUse:[{sourceId:'source-a',allowed:true}],returnDisclosure:[{sourceId:'source-a',allowed:false}]});
 assert.equal(x.status,'HOLD_NOT_AUTHORIZED');
});
test('all missing evidence yields abstention only when verified influence inventory',()=>{
 const x=reviewNeuralReferences({verifiedInfluenceInventory:true,candidates:[],sourceUse:[],returnDisclosure:[]});
 assert.equal(x.status,'ABSTAIN_NO_ELIGIBLE_RETURN');assert.equal(x.canTrain,false);
});
test('source role H11 epistemic not a domain without a verified subject',()=>{
 const p=parseHSN('H11.S12.N12');assert.equal(p.role,'EPISTEMIC_META');
 assert.equal(parseHSN('H11.S01.N01').role,'DOMAIN_SPECIALIZATION');
});
