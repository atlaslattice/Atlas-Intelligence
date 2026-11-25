import test from 'node:test';
import assert from 'node:assert/strict';
import {createGeometryOne} from '../../atlas-geometry-one-r38/src/fabric.mjs';
import {HSN,ARIADNE_SHA256} from '../../atlas-geometry-one-r38/src/addresses.mjs';
import {createPointerCompanion} from '../src/pointer-companion.mjs';
import {preparePointerYijing,workSelectionDigest} from '../src/geometree-pointer-weave.mjs';
import {YIJING_CODECS,CONTEXT_TOPOLOGIES,yijingDecode,inspectIssuedYijing} from '../src/geometree-yijing-r10.mjs';
import {createHash} from 'node:crypto';
const q='a'.repeat(64),source='b'.repeat(64),model='c'.repeat(64),required='d'.repeat(64),epoch='e'.repeat(64),workDigest='f'.repeat(64);
const req={requestId:'weave1',tenant:'tenant1',logicalTarget:'geometry',contractVersion:'1',querySha256:q,
 sourceId:'src1',sourceSha256:source,sourceEdition:'fixture-v1',modelSha256:model,registrySha256:ARIADNE_SHA256,
 scope:'WORK',purpose:'INFERENCE',subject:'synthetic one-frame fixture'};
const binding={requestId:'weave1',modelSha256:model,sourceSha256:source,querySha256:q,
 tenant:'tenant1',principal:'principal1',rightsEpoch:'synthetic-epoch',sourceEdition:'fixture-v1',purpose:'WORK_INSPECTION',requiredSetSha256:required};
const f64WireSha=scores=>{const buf=Buffer.alloc(scores.length*8);scores.forEach((x,i)=>buf.writeDoubleLE(x,i*8));return createHash('sha256').update(Buffer.concat([Buffer.from('atlas.f64le.ordered-scores/v1\0'),buf])).digest('hex')};
const ref=(roomId='room_alpha',seq=39,bodySha256=workDigest)=>({roomId,seq,bodySha256,status:'SOURCE_LINK_UNREVIEWED'});
const event=(sequence,action='UPSERT',overrides={})=>({eventId:'evt'+sequence,sequence,action,pointerId:'ptr1',sourceId:'src1',familyId:'family1',sourceEdition:'fixture-v1',sourceSha256:source,
 rightsEpochSha256:epoch,hsn:'H01.S01.N01',locatorKind:'PUBLIC_METADATA',locatorRef:'local1',priorSourceSha256:action==='UPSERT'?null:source,...overrides});
async function fixture({method=false,allow=()=>true,includeSecond=false}={}){
 const numbers=Array.from({length:1728},(_,i)=>method?i:1728-i);
 if(!method)numbers[1700]=0; // a hidden +0 score to test signed-zero wire substitution
 const top=method?'H12.S12.N12':'H01.S01.N01';
 let modelCalls=0;
 const service=createGeometryOne({
  gateway:async inp=>{modelCalls++;return {schema:'atlas.geometry-one.issued/v1',requestId:inp.requestId,querySha256:inp.querySha256,
   sourceId:inp.sourceId,sourceSha256:inp.sourceSha256,sourceEdition:inp.sourceEdition,modelSha256:inp.modelSha256,
   registrySha256:inp.registrySha256,method:'NEURAL_ONLY',fallbackUsed:false,issuer:'test-only',scores:numbers.slice()}},
  rights:async phase=>({allow:true,epoch:'synthetic-epoch'}),
  requiredClosure:async()=>({status:'PINNED_COMPLETE_FOR_REVIEW',releaseAuthorized:false,authorityEffect:'NONE'})});
 const root=await service.inspect({...req},{k:5});
 assert.equal(root.status,'INSPECTION_CANDIDATE_ONLY');
 const ptr=createPointerCompanion();ptr.append(event(1,'UPSERT',{hsn:top}));
 if(includeSecond)ptr.append({...event(2,'UPSERT',{pointerId:'ptr2',sourceId:'src2',familyId:'family1',locatorRef:'local2',hsn:top}),eventId:'evt2'});
 const refs=[ref()];
 const state=ptr.state();
 const witness={generation:state.generation,catalogDigest:state.catalogDigest,historyDigest:state.historyDigest,
   rightsEpochSha256:epoch,requiredSetSha256:required,workSelectionSha256:workSelectionDigest(refs),
   fullScoreFrameSha256:f64WireSha(numbers)};
 const peerReview={status:'LOCAL_PEER_CONVERGENCE_REVIEW_ONLY',frameDigest:root.frameDigest,sourceSha256:source,
   modelSha256:model,originalCandidateHsn:root.baseline.hits.map(x=>x.hsn)};
 const subjects=method?{[top]:'H12.S01.N01'}:{};
 const input={root,queryBinding:{...binding},fullScores:numbers.slice(),peerReview,companion:ptr,
   authorize:async p=>allow(p,ptr),workRefs:refs,subjects,sourceWitness:witness};
 return {ptr,root,top,numbers,refs,input,modelCalls:()=>modelCalls};
}
const prep=x=>preparePointerYijing(x.input);
const success=async x=>{const p=prep(x);assert.equal(p.status,'PREPARED_REVIEW_ONLY');return await p.release({purpose:'INFERENCE_USE'})};
test('real peer journal + actual PR67 root + R11b symbolic result compose once',async()=>{
 const x=await fixture(),r=await success(x);
 assert.equal(r.status,'LOCAL_SOURCE_POINTER_YIJING_REVIEW_ONLY');assert.equal(r.views.length,1);
 assert.equal(r.views[0].hsn,'H01.S01.N01');assert.equal(r.modelCallsByWeave,0);assert.equal(x.modelCalls(),1);
 assert.equal(r.rightsAtTransportVerified,false);assert.equal(r.releaseAuthorized,false);assert.equal(r.workRefCount,1);
 assert.equal(r.views[0].semanticAccepted,false);assert.equal(r.views[0].gf7Meaning,'ANALYTIC_UNMEASURED_DISPLAY_ONLY');
});
test('same source in two peer pointer records counts declared origin once, not corroboration',async()=>{
 const x=await fixture({includeSecond:true}),r=await success(x);
 assert.equal(r.views.length,2);assert.equal(r.declaredOriginCount,1);assert.equal(r.independentSourceFamiliesVerified,false);
});
test('all original exact Ariadne HSN locations are stable and source roles come from Sphere',()=>{
 assert.equal(HSN.length,1728);assert.equal(new Set(HSN).size,1728);
 assert.equal(HSN.at(-1),'H12.S12.N12');assert.equal(HSN[0],'H01.S01.N01');
});
test('METHOD requires explicitly provided same-House DOMAIN subject',async()=>{
 const x=await fixture({method:true}),r=await success(x);
 assert.equal(r.status,'LOCAL_SOURCE_POINTER_YIJING_REVIEW_ONLY');assert.equal(r.views[0].role,'EPISTEMIC_META');
});
test('METHOD without subject is held',async()=>{const x=await fixture({method:true});x.input.subjects={};assert.equal((await success(x)).status,'HOLD')});
test('METHOD with different-House subject is held',async()=>{const x=await fixture({method:true});x.input.subjects={[x.top]:'H01.S01.N01'};assert.equal((await success(x)).status,'HOLD')});
test('domain address N08 is still DOMAIN, not METHOD',async()=>{const x=await fixture();const r=await success(x);assert.equal(r.views[0].role,'DOMAIN_SPECIALIZATION')});
test('empty Work pointer set is held',async()=>{const x=await fixture();x.input.workRefs=[];assert.equal(prep(x).status,'HOLD')});
test('same room/sequence collision is held even if body digest differs',async()=>{const x=await fixture();x.input.workRefs.push(ref('room_alpha',39,'1'.repeat(64)));assert.equal(prep(x).status,'HOLD')});
test('same sequence in distinct rooms is distinct and stable when witness is updated',async()=>{const x=await fixture();x.input.workRefs.push(ref('room_beta',39));x.input.sourceWitness.workSelectionSha256=workSelectionDigest(x.input.workRefs);const r=await success(x);assert.equal(r.workRefCount,2)});
test('not copying source bodies, work message bodies or private mode records',async()=>{
 const x=await fixture(),r=await success(x);assert.equal(r.sourceBodiesReturned,false);assert.equal(r.sourceIdsReturned,false);
 assert.equal(r.campaignCredit,0);assert.equal(r.peerIdentityAuthenticated,false);assert.equal(JSON.stringify(r).includes('locatorRef'),false);
});
test('wrong Work source SHA is held',async()=>{const x=await fixture();x.input.sourceWitness.workSelectionSha256='1'.repeat(64);assert.equal(prep(x).status,'HOLD')});
test('wrong source edition in pointer is held',async()=>{
 const x=await fixture();x.ptr.append(event(2,'UPSERT',{sourceEdition:'different-edition',hsn:x.top,priorSourceSha256:source}));
 const s=x.ptr.state();Object.assign(x.input.sourceWitness,{generation:s.generation,catalogDigest:s.catalogDigest,historyDigest:s.historyDigest});
 assert.equal((await success(x)).status,'HOLD');
});
test('wrong current source digest in peer review is held',async()=>{const x=await fixture();x.input.peerReview.sourceSha256='2'.repeat(64);assert.equal(prep(x).status,'HOLD')});
test('peer top-ranked identity substitution held',async()=>{const x=await fixture();x.input.peerReview.originalCandidateHsn[0]='H02.S02.N02';assert.equal(prep(x).status,'HOLD')});
test('wrong required-set metadata is held, not accepted as independent proof',async()=>{const x=await fixture();x.input.sourceWitness.requiredSetSha256='f'.repeat(64);assert.equal(prep(x).status,'HOLD')});
test('authorization mock denies RETURN and no identifiers escape',async()=>{const x=await fixture({allow:q=>q.phase!=='RETURN'}),r=await success(x);assert.equal(r.status,'HOLD');assert.deepEqual(r.views,[])});
test('late source withdrawal invalidates the prepared symbolic view',async()=>{
 const x=await fixture(),p=prep(x);x.ptr.append(event(2,'WITHDRAW',{hsn:x.top}));const r=await p.release();assert.equal(r.status,'HOLD');assert.deepEqual(r.views,[]);
});
test('ABA re-add after withdrawal cannot replay old symbol receipt',async()=>{
 const x=await fixture(),p=prep(x);x.ptr.append(event(2,'WITHDRAW',{hsn:x.top}));x.ptr.append(event(3,'UPSERT',{hsn:x.top}));
 const r=await p.release();assert.equal(r.status,'HOLD');
});
test('during RETURN withdrawal invalidates frame before output',async()=>{
 const x=await fixture({allow:(q,ptr)=>{if(q.phase==='RETURN')ptr.append(event(2,'WITHDRAW',{hsn:'H01.S01.N01'}));return true;}});
 assert.equal((await success(x)).status,'HOLD');
});
test('changed numerical score outside top-k after preparation is held',async()=>{
 const x=await fixture(),p=prep(x);x.input.fullScores[1700]+=0.01;assert.equal((await p.release()).status,'HOLD');
});
test('changed Work reference after preparation is held',async()=>{const x=await fixture(),p=prep(x);x.refs[0].seq=40;assert.equal((await p.release()).status,'HOLD')});
test('unknown Yijing mapping is held without cross-decoding',async()=>{const x=await fixture();x.input.codec='king-wen-guess';assert.equal(prep(x).status,'HOLD')});
test('supported second mapping retains original HSN but is explicitly differently namespaced',async()=>{
 const x=await fixture();x.input.codec=YIJING_CODECS.SYMBIOSIS_X3;x.input.topology=CONTEXT_TOPOLOGIES.CYCLIC;
 const r=await success(x);assert.equal(r.status,'LOCAL_SOURCE_POINTER_YIJING_REVIEW_ONLY');
 assert.equal(r.views[0].yijing.codec,YIJING_CODECS.SYMBIOSIS_X3);
 assert.equal(r.views[0].yijing.contextTopology,CONTEXT_TOPOLOGIES.CYCLIC);
});
test('invalid mode/purpose is held before any disclosure',async()=>{const x=await fixture();x.input.queryBinding.purpose='PRIVATE_PLAY';assert.equal(prep(x).status,'HOLD')});
test('getter payload on untrusted Work reference is not invoked',async()=>{
 const x=await fixture();let touched=0;Object.defineProperty(x.input.workRefs[0],'roomId',{enumerable:true,get(){touched++;throw Error('boom')}});
 assert.equal(prep(x).status,'HOLD');assert.equal(touched,0);
});
test('proxy Work reference held without invoking its traps',async()=>{const x=await fixture();x.input.workRefs[0]=new Proxy(x.input.workRefs[0],{});assert.equal(prep(x).status,'HOLD')});
test('one prepared operation cannot be reused after ambiguous ACK',async()=>{
 const x=await fixture(),p=prep(x);assert.equal((await p.release()).status,'LOCAL_SOURCE_POINTER_YIJING_REVIEW_ONLY');
 const y=await p.release();assert.equal(y.status,'HOLD');assert.equal(y.reason,'REPLAY_OF_PREPARED');
});
test('functionality does not imply authenticated model, independent closure or hosted rights',async()=>{
 const x=await fixture(),r=await success(x);assert.equal(r.requiredSetIndependentlyComplete,false);
 assert.equal(r.rightsAtTransportVerified,false);assert.equal(r.campaignCredit,0);assert.equal(x.modelCalls(),1);
});

test('hidden +0 / -0 substitution is rejected even when PR67 JSON frame digest cannot distinguish them',async()=>{
 const x=await fixture();const bad=x.numbers.slice();bad[1700]=-0;
 // Existing PR67 frame hash JSON encodes signed zero identically, but binary64 does not.
 const unbound=inspectIssuedYijing({root:x.root,queryBinding:{...x.input.queryBinding},fullScores:bad});
 assert.equal(unbound.status,'LOCAL_SYMBOLIC_INSPECTION_ONLY');
 assert.notEqual(unbound.fullScoreFrameSha256,x.input.sourceWitness.fullScoreFrameSha256);
 x.input.fullScores=bad;
 assert.equal(prep(x).status,'HOLD');
});
test('accessor in Work reference array is rejected without evaluating getter',async()=>{
 const x=await fixture();let touched=0;
 Object.defineProperty(x.input.workRefs,'0',{enumerable:true,configurable:true,get(){touched++;throw Error('must never run')}});
 assert.equal(prep(x).status,'HOLD');assert.equal(touched,0);
});
