import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeometryOne } from '../../atlas-geometry-one-r38/src/fabric.mjs';
import { ARIADNE_SHA256,HSN } from '../../atlas-geometry-one-r38/src/addresses.mjs';
import { inspectIssuedYijing } from '../src/geometree-yijing-r10.mjs';
const a='a'.repeat(64),b='b'.repeat(64),c='c'.repeat(64),d='d'.repeat(64);
const scores=Array.from({length:1728},(_,i)=>i/1728);
const request={requestId:'r11',tenant:'tenant1',logicalTarget:'atlas-shared-frame',contractVersion:'1',
 querySha256:a,sourceId:'source1',sourceSha256:b,sourceEdition:'fixture-evidence-v1',modelSha256:c,
 registrySha256:ARIADNE_SHA256,scope:'WORK',purpose:'INFERENCE',subject:'controlled synthetic fixture'};
const binding={requestId:'r11',tenant:'tenant1',principal:'person1',rightsEpoch:'test-epoch-1',
 modelSha256:c,sourceSha256:b,querySha256:a,sourceEdition:'fixture-evidence-v1',purpose:'WORK_INSPECTION',requiredSetSha256:d};
function make(allowFn=()=>true){
 let calls=0;let phases=[];
 const instance=createGeometryOne({
  gateway:async(arg)=>{calls++;return {schema:'atlas.geometry-one.issued/v1',requestId:arg.requestId,querySha256:arg.querySha256,
   sourceId:arg.sourceId,sourceSha256:arg.sourceSha256,sourceEdition:arg.sourceEdition,modelSha256:arg.modelSha256,
   registrySha256:arg.registrySha256,method:'NEURAL_ONLY',fallbackUsed:false,issuer:'test-only-synthetic',scores:scores.slice()}},
  rights:async(phase)=>{phases.push(phase);return {allow:allowFn(phase),epoch:'test-epoch-1'}},
  requiredClosure:async()=>({status:'PINNED_COMPLETE_FOR_REVIEW',releaseAuthorized:false,authorityEffect:'NONE'})
 });
 return {instance,counters:()=>({calls,phases})};
}
test('ACTUAL unchanged PR67 createGeometryOne issues once; R10 sidecar consumes without second call',async()=>{
 const x=make();const root=await x.instance.inspect({...request},{k:10,alpha:0});
 assert.equal(root.status,'INSPECTION_CANDIDATE_ONLY');
 const res=inspectIssuedYijing({root,queryBinding:{...binding},fullScores:scores.slice()});
 assert.equal(res.status,'LOCAL_SYMBOLIC_INSPECTION_ONLY');assert.equal(res.annotated.length,10);
 assert.deepEqual(res.annotated.map(x=>x.hsn),root.baseline.hits.map(x=>x.hsn));
 assert.equal(res.fullScoreFrameSha256.length,64);assert.equal(res.frameDigest,root.frameDigest);
 assert.equal(x.counters().calls,1);assert.equal(x.instance.descriptor().issuedCount,1);
 assert.deepEqual(x.counters().phases,['READ','INFERENCE_USE','RETURN']);assert.equal(res.canRelease,false);
});
test('peer alpha nonzero changes experimental route but Yijing still reads incumbent ranked baseline',async()=>{
 const x=make();const root=await x.instance.inspect({...request},{k:10,alpha:0.3});
 const res=inspectIssuedYijing({root,queryBinding:{...binding},fullScores:scores.slice()});
 assert.equal(res.status,'LOCAL_SYMBOLIC_INSPECTION_ONLY');
 assert.deepEqual(res.annotated.map(x=>x.hsn),root.baseline.hits.map(x=>x.hsn));
 assert.equal(res.ranksRerouted,false);assert.equal(x.counters().calls,1);
});
test('denied RETURN in unchanged PR67 holds entire sidecar without leaked identities',async()=>{
 const x=make(phase=>phase!=='RETURN');const root=await x.instance.inspect({...request},{k:10});
 assert.equal(root.status,'HOLD_INSPECTION_ONLY');const res=inspectIssuedYijing({root,queryBinding:{...binding},fullScores:scores});
 assert.equal(res.status,'HOLD');assert.deepEqual(res.annotated,[]);
});
test('mock rights still never produce hosted authority or semantic acceptance',async()=>{
 const x=make();const root=await x.instance.inspect({...request},{k:5});const res=inspectIssuedYijing({root,queryBinding:{...binding},fullScores:scores});
 assert.equal(res.hostIssuerVerified,false);assert.equal(res.sourceRightsAtTransportVerified,false);
 assert.equal(res.requiredClosureIndependentlyComplete,false);assert.equal(res.meta145.nodeCount,0);
 assert.equal(res.modelCallsBySidecar,0);
});
test('ontology edition and evidence edition retain distinct identities on real PR67 receipt',async()=>{
 const x=make();const root=await x.instance.inspect({...request},{k:2});const res=inspectIssuedYijing({root,queryBinding:{...binding},fullScores:scores});
 assert.equal(res.ontologyEdition,'ariadne-reader/v0.7');assert.equal(res.evidenceSourceEdition,'fixture-evidence-v1');
 assert.notEqual(res.ontologySha256,res.evidenceSourceSha256);
});
test('source rebind and new model/issuer context never silently accepted',async()=>{
 const x=make();const root=await x.instance.inspect({...request},{k:2});
 assert.equal(inspectIssuedYijing({root,queryBinding:{...binding,modelSha256:d},fullScores:scores}).status,'HOLD');
 assert.equal(inspectIssuedYijing({root,queryBinding:{...binding,sourceEdition:'changed'},fullScores:scores}).status,'HOLD');
 assert.equal(inspectIssuedYijing({root,queryBinding:{...binding,rightsEpoch:'changed'},fullScores:scores}).status,'HOLD');
});
test('one shared issued root can have different symbolic view selections but identical frame digest',async()=>{
 const x=make(),root=await x.instance.inspect({...request},{k:5});
 const r1=inspectIssuedYijing({root,queryBinding:{...binding},fullScores:scores,maxHits:2});
 const r2=inspectIssuedYijing({root,queryBinding:{...binding},fullScores:scores,maxHits:5});
 assert.equal(r1.frameDigest,r2.frameDigest);assert.equal(r1.annotated.length,2);assert.equal(r2.annotated.length,5);assert.equal(x.counters().calls,1);
});
test('a mutation hidden outside top-k is rejected against original full-frame receipt',async()=>{
 const x=make(),root=await x.instance.inspect({...request},{k:5});const bad=scores.slice();bad[0]+=0.5;
 assert.equal(inspectIssuedYijing({root,queryBinding:{...binding},fullScores:bad}).status,'HOLD');
});
test('direct 1728 HSN samples retain exact last address and source role',()=>{
 assert.equal(HSN[1727],'H12.S12.N12');
});
