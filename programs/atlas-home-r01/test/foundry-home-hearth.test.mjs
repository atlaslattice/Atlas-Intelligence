import test from 'node:test';
import assert from 'node:assert/strict';
import {createAtlasHome} from '../src/home.mjs';
import {ARIADNE_SHA256,HSN} from '../src/geometry.mjs';
import {createIndrasHearth,prepareHearthSnapshot} from '../src/indra-hearth.mjs';
import {inspectHomeHearth} from '../src/foundry-home-hearth.mjs';
const SRC='b'.repeat(64),FRAME='c'.repeat(64),FULL='d'.repeat(64);
const request=()=>({requestId:'r-foundry-01',scope:'WORK',registrySha256:ARIADNE_SHA256,sourceSha256:SRC,
  sourceEdition:'fixture/v1',purpose:'INFERENCE'});
function prepared(){
 const view=Object.freeze({ontologySha256:ARIADNE_SHA256,originalNeuralRankUnchanged:true,
   releaseAuthorized:false,requiredSetIndependentlyComplete:false,hostIssuerVerified:false,
   frameDigest:FRAME,fullScoreSha256:FULL,
   baselineHits:Object.freeze(HSN.slice(0,8).map((hsn,i)=>Object.freeze({hsn,score:100-i}))),
   houseMass:Object.freeze(Array(12).fill(1/12)),sphereMass:Object.freeze(Array(144).fill(1/144))});
 const root=Object.freeze({status:'INSPECTION_CANDIDATE_ONLY',frameDigest:FRAME,sourceScope:'WORK',
   sourcePins:Object.freeze({registrySha256:ARIADNE_SHA256,sourceSha256:SRC})});
 return Object.freeze({status:'PREPARED_PEER_INSPECTION_ONLY',aliasesExactlyIdentical:true,
  releaseAuthorized:false,view,views:Object.freeze({atlasOne:view,atlasGPT:view,atlasIntelligence:view,swarmchat:view}),originalRoot:root});
}
const peer=(options={})=>createIndrasHearth({composer:{inspect:async()=>options.prepared??prepared()},
 sourcePhase:async phase=>({allow:phase!==options.deny,epoch:options.drift && phase!=='READ'?'e2':'e1'})});

test('end-to-end local: canonical Home route + actual peer snapshot → one non-authorizing structural view',async()=>{
 const home=createAtlasHome(),hearth=peer(),id='H05.S06.N12';
 const x=await hearth.inspect(request(),{}, {selectedHsn:id});
 assert.equal(x.status,'PREPARED_NOT_RELEASED');
 const y=inspectHomeHearth({home,hsn:id,hearthReview:x});
 assert.equal(y.status,'LOCAL_STRUCTURAL_INTEROP_ONLY');
 assert.deepEqual([y.hsn,y.house,y.sphere,y.role],[id,'H05','H05.S06','DOMAIN_SPECIALIZATION']);
 assert.equal(y.registrySha256,ARIADNE_SHA256);assert.equal(y.modelCallsByFoundry,0);
 assert.equal(y.releaseAuthorized,false);assert.equal(y.sourceBodiesIncluded,false);
 assert.equal(home.descriptor().modelCallsByHome,0);assert.equal(hearth.descriptor().neuralCallsAdded,0);
});
test('failure: a denied late RETURN cannot become public source or review detail',async()=>{
 const home=createAtlasHome(),x=await peer({deny:'RETURN'}).inspect(request(),{}, {selectedHsn:'H05.S06.N12'});
 assert.equal(x.status,'HOLD_SOURCE_ONLY');
 const z=inspectHomeHearth({home,hsn:'H05.S06.N12',hearthReview:x});
 assert.equal(z.status,'HOLD');assert.equal('hsn' in z,false);assert.equal(z.releaseAuthorized,false);
});
test('failure: wrong source digest does not cross Home/Hearth review',()=>{
 const home=createAtlasHome();const invalid=prepared();
 const wrong={...invalid,originalRoot:{...invalid.originalRoot,sourcePins:{registrySha256:ARIADNE_SHA256,sourceSha256:FULL}}};
 const x=prepareHearthSnapshot(wrong,request(),{selectedHsn:'H05.S06.N12'});
 assert.equal(x.status,'HOLD_SOURCE_ONLY');
 assert.equal(inspectHomeHearth({home,hsn:'H05.S06.N12',hearthReview:x}).status,'HOLD');
});
test('failure: method location requires same-House domain subject, never inferred by N ordinal',async()=>{
 const home=createAtlasHome(),id='H05.S09.N02';
 let x=await peer().inspect(request(),{}, {selectedHsn:id});
 assert.equal(x.status,'HOLD_SOURCE_ONLY');assert.equal(inspectHomeHearth({home,hsn:id,hearthReview:x}).status,'HOLD');
 x=await peer().inspect(request(),{}, {selectedHsn:id,subjectHsn:'H05.S06.N12'});
 assert.equal(inspectHomeHearth({home,hsn:id,hearthReview:x}).status,'LOCAL_STRUCTURAL_INTEROP_ONLY');
});
test('failure: invalid HSN clears Home Work context, retains only prior public geometry',async()=>{
 const home=createAtlasHome(),hearth=peer();
 assert.equal(home.openNode('H05.S06.N12').status,'CANONICAL_NAVIGATION_ONLY');
 const x=await hearth.inspect(request(),{}, {selectedHsn:'H05.S06.N12'});
 const held=inspectHomeHearth({home,hsn:'H00.S06.N12',hearthReview:x});
 assert.equal(held.status,'HOLD');assert.equal('hsn' in held,false);
 assert.equal(home.descriptor().publicLocation,'H05.S06.N12');assert.equal(home.descriptor().workEligible,false);
 assert.equal((await home.inspectWork({},{},{})).status,'HOLD');
});
test('failure: hostile getter on peer review is never evaluated',()=>{
 const home=createAtlasHome();let calls=0;const fake={status:'PREPARED_NOT_RELEASED'};
 Object.defineProperty(fake,'schema',{enumerable:true,get(){calls++;throw Error('attack')}});
 const r=inspectHomeHearth({home,hsn:'H05.S06.N12',hearthReview:fake});
 assert.equal(r.status,'HOLD');assert.equal(calls,0);
});
