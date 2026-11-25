import test from 'node:test';
import assert from 'node:assert/strict';
import {createOneFramePeerComposer} from '../src/one-frame-composer.mjs';
import {ARIADNE_SHA256} from '../../atlas-geometry-one-r38/src/addresses.mjs';
import {YIJING_CODECS,yijingAddress,yijingDecode} from '../../atlas-peer-convergence-r01/src/geometree-yijing-r10.mjs';
const Q='a'.repeat(64),SRC='b'.repeat(64),MODEL='c'.repeat(64),CLOSURE='d'.repeat(64);
const base=()=>({requestId:'req-01',tenant:'tenant1',logicalTarget:'shared-work',contractVersion:'1',querySha256:Q,
  sourceId:'source1',sourceSha256:SRC,sourceEdition:'src-edition-1',modelSha256:MODEL,registrySha256:ARIADNE_SHA256,
  scope:'WORK',purpose:'INFERENCE',subject:'H05.S06.N12'});
const binding=(r=base(),epoch='epoch1')=>({requestId:r.requestId,tenant:r.tenant,principal:'owner1',rightsEpoch:epoch,
  modelSha256:r.modelSha256,sourceSha256:r.sourceSha256,querySha256:r.querySha256,sourceEdition:r.sourceEdition,
  purpose:'WORK_INSPECTION',requiredSetSha256:CLOSURE});
const scores=()=>Array.from({length:1728},(_,i)=>((1728-i)*1.001)/1728);
function make({denied=null,drift=false,closure=true,fallback=false,mutable=null,changedIssuer=false,after=null}={}){
 let requests=0;let phases=[];let epoch='epoch1';
 const peer=createOneFramePeerComposer({gateway:async r=>{requests++;
   const xs=scores(); if(mutable!==null)xs[mutable]-=1;
   return {schema:'atlas.geometry-one.issued/v1',requestId:r.requestId,querySha256:r.querySha256,sourceId:r.sourceId,
     sourceSha256:r.sourceSha256,sourceEdition:r.sourceEdition,modelSha256:drift?Q:r.modelSha256,
     registrySha256:r.registrySha256,method:'NEURAL_ONLY',fallbackUsed:fallback,issuer:changedIssuer?'':'test-owner-issuer',scores:xs};},
   rights:async (phase)=>{phases.push(phase);if(after)await after(phase,()=>{epoch='epoch2'});return{allow:phase!==denied,epoch};},
   requiredClosure:async()=>({status:closure?'PINNED_COMPLETE_FOR_REVIEW':'HOLD',releaseAuthorized:false,authorityEffect:'NONE'})});
 return {peer,count:()=>requests,phases};
}
test('one issued frame, one 1728 source, four aliases share exact read-only object',async()=>{
 const a=make(),r=base(),x=await a.peer.inspect(r,binding(r),{k:12});
 assert.equal(x.status,'PREPARED_PEER_INSPECTION_ONLY');assert.equal(a.count(),1);assert.equal(a.peer.descriptor().gateway.issuedCount,1);
 assert.equal(x.view.notes.length,12);assert.equal(x.view.originalNeuralRankUnchanged,true);
 assert.equal(x.views.atlasOne,x.views.atlasGPT);assert.equal(x.views.atlasGPT,x.views.swarmchat);
 assert.equal(x.view.houseMass.length,12);assert.equal(x.view.sphereMass.length,144);
 assert.deepEqual(a.phases,['READ','INFERENCE_USE','RETURN']);
 assert.equal(x.view.releaseAuthorized,false);assert.equal(x.view.hostIssuerVerified,false);
});
test('PR71 and PR66 symbolic sources preserve all original HSN IDs',()=>{
 let different=0;for(let h=1;h<=12;h++)for(let s=1;s<=12;s++)for(let n=1;n<=12;n++){
 const id=`H${String(h).padStart(2,'0')}.S${String(s).padStart(2,'0')}.N${String(n).padStart(2,'0')}`;
 const a=yijingAddress(id,{codec:YIJING_CODECS.CUPWAKE_X4}),b=yijingAddress(id,{codec:YIJING_CODECS.SYMBIOSIS_X3});
 assert.equal(yijingDecode(a),id);assert.equal(yijingDecode(b),id);if(a.code!==b.code)different++;
 }assert.equal(different,1720);
});
test('same HSN, same ranked score, edition-specific different glyphs',async()=>{
 const a=make(),r=base(),x=await a.peer.inspect(r,binding(r),{k:15});
 assert.equal(x.status,'PREPARED_PEER_INSPECTION_ONLY');assert.equal(x.view.notes[0].nineModeCoefficients.length,9);
 assert.ok(x.view.notes.some(v=>v.cupwake.hexagramCode!==v.symbiosis.hexagramCode||v.cupwake.contextCode!==v.symbiosis.contextCode));
 assert.ok(x.view.notes.every(v=>v.physicalFrequencyHz===null&&v.semanticAccepted===false));
});
test('required evidence hold prevents release of ANY numeric or HSN',async()=>{
 const a=make({closure:false}),r=base(),x=await a.peer.inspect(r,binding(r));
 assert.equal(x.status,'HOLD_REVIEW_ONLY');assert.equal(x.releaseAuthorized,false);assert.equal('view' in x,false);
});
test('late RETURN denial holds whole result, no IDs escape',async()=>{
 const a=make({denied:'RETURN'}),r=base(),x=await a.peer.inspect(r,binding(r));
 assert.equal(x.status,'HOLD_REVIEW_ONLY');assert.equal('view' in x,false);
});
test('rights epoch drift after READ holds result and avoids extra inference',async()=>{
 const a=make({after:async(phase,mutate)=>{if(phase==='INFERENCE_USE')mutate();}}),r=base(),x=await a.peer.inspect(r,binding(r));
 assert.equal(x.status,'HOLD_REVIEW_ONLY');assert.equal(a.count(),1);
});
test('issuer/model mismatches and lexical fallbacks hold',async()=>{
 for(const opts of [{changedIssuer:true},{drift:true},{fallback:true}]){
 const a=make(opts),r=base(),x=await a.peer.inspect(r,binding(r));
 assert.equal(x.status,'HOLD_REVIEW_ONLY');
 }
});
test('wrong source version/right epoch means no symbolic release',async()=>{
 const a=make(),r=base(),x=await a.peer.inspect(r,{...binding(r),rightsEpoch:'stale'});
 assert.equal(x.status,'HOLD_REVIEW_ONLY');
});
test('hostile request getter rejected before gateway invocation',async()=>{
 const a=make(),r=base();let calls=0;Object.defineProperty(r,'modelSha256',{enumerable:true,get(){calls++;throw Error('HOSTILE');}});
 const x=await a.peer.inspect(r,binding(base()));assert.equal(x.status,'HOLD_REVIEW_ONLY');assert.equal(a.count(),0);assert.equal(calls,0);
});
test('score changes away from topk need a NEW full frame digest even if ranks same',async()=>{
 const r=base(),a=make(),b=make({mutable:1200});const x=await a.peer.inspect(r,binding(r)),y=await b.peer.inspect(r,binding(r));
 assert.equal(x.status,'PREPARED_PEER_INSPECTION_ONLY');assert.equal(y.status,'PREPARED_PEER_INSPECTION_ONLY');
 assert.deepEqual(x.view.baselineHits.map(z=>z.hsn),y.view.baselineHits.map(z=>z.hsn));
 assert.notEqual(x.view.fullScoreSha256,y.view.fullScoreSha256);
});
test('replay of same request id remains held by existing host semantics',async()=>{
 const a=make(),r=base();const p1=a.peer.inspect(r,binding(r));const p2=a.peer.inspect(r,binding(r));
 const [x,y]=await Promise.all([p1,p2]);assert.equal(x.status,'PREPARED_PEER_INSPECTION_ONLY');assert.equal(y.status,'HOLD_REVIEW_ONLY');
});
