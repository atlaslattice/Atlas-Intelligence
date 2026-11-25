import test from 'node:test';import assert from 'node:assert/strict';
import {createAtlasHome,inspectPreparedPeerResult} from '../src/home.mjs';
import {createReturnTicket} from '../src/continuity.mjs';
import {CHRONOFORGE_VIEW,inspectTemporalPort} from '../src/chronoforge.mjs';
const ARIADNE='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
function frame(){const view={ontologySha256:ARIADNE,releaseAuthorized:false,hostIssuerVerified:false,requiredSetIndependentlyComplete:false,frameDigest:'a'.repeat(64),houseMass:Array(12).fill(1/12),sphereMass:Array(144).fill(1/144),notes:[]};return {schema:'atlas.one.peers.single-issued-frame/v1',status:'PREPARED_PEER_INSPECTION_ONLY',releaseAuthorized:false,hostedVerified:false,view,views:{atlasOne:view,atlasGPT:view,atlasIntelligence:view,swarmchat:view}}}
test('welcome is warm but accurately unhosted',()=>{const h=createAtlasHome(),v=h.welcome();assert.equal(v.nodeCount,1728);assert.match(v.message,/nothing to earn/i);assert.equal(v.canDeploy,false);assert.equal(v.privacy.autoMemory,false)});
test('one exact prepared PR75 frame gives counts but no source, digest or raw scores',()=>{const v=inspectPreparedPeerResult(frame());assert.equal(v.status,'LOCAL_GEOMETRY_FRAME_INSPECTED_ONLY');assert.equal(v.houses,12);assert.equal(v.spheres,144);assert.equal(v.nodes,1728);assert.equal(v.frameDigestExposed,false);assert.equal('frameDigest' in v,false);assert.equal(v.releaseAuthorized,false)});
test('same-result object identity required across all four aliases',()=>{const f=frame();f.views.swarmchat={...f.view};assert.equal(inspectPreparedPeerResult(f).status,'HOLD')});
test('private Work or source bodies never released through Home',()=>{const f=frame();f.view.notes=[{body:'private user data',sourceId:'not for public view'}];const v=inspectPreparedPeerResult(f);assert.equal(v.status,'LOCAL_GEOMETRY_FRAME_INSPECTED_ONLY');assert.equal(JSON.stringify(v).includes('private user'),false)});
test('wrong source pin held',()=>{const f=frame();f.view.ontologySha256='b'.repeat(64);assert.equal(inspectPreparedPeerResult(f).status,'HOLD')});
test('foreign hosted release claims cannot enter Home',()=>{const f=frame();f.releaseAuthorized=true;assert.equal(inspectPreparedPeerResult(f).status,'HOLD')});
test('a source host claim of independent closure cannot be laundered',()=>{const f=frame();f.view.requiredSetIndependentlyComplete=true;assert.equal(inspectPreparedPeerResult(f).status,'HOLD')});
test('wrong House or Sphere numerical axes hold',()=>{const f=frame();f.view.sphereMass.pop();assert.equal(inspectPreparedPeerResult(f).status,'HOLD')});
test('nonfinite numerical metadata holds',()=>{const f=frame();f.view.houseMass[0]=Infinity;assert.equal(inspectPreparedPeerResult(f).status,'HOLD')});
test('bad or absent frame digest holds',()=>{const f=frame();f.view.frameDigest='hi';assert.equal(inspectPreparedPeerResult(f).status,'HOLD')});
test('no existing composer is a clean HOLD without invented inference',async()=>{const h=createAtlasHome(),r=await h.inspectWork({},{});assert.equal(r.status,'HOLD');assert.equal(h.descriptor().modelCallsByHome,0);assert.equal(h.descriptor().peerInspectCalls,0)});
test('one existing composer is called exactly once and never clones a neural core',async()=>{let calls=0;const h=createAtlasHome({existingComposer:{inspect:async()=>{calls++;return frame()}}});const x=await h.inspectWork({},{},{k:10});assert.equal(x.status,'LOCAL_GEOMETRY_FRAME_INSPECTED_ONLY');assert.equal(calls,1);assert.equal(h.descriptor().peerInspectCalls,1);assert.equal(h.descriptor().newRetrievers,0)});
test('a denied existing peer composer fails closed',async()=>{const h=createAtlasHome({existingComposer:{inspect:async()=>({status:'HOLD_REVIEW_ONLY',releaseAuthorized:false})}});assert.equal((await h.inspectWork()).status,'HOLD')});
test('a throwing peer composer does not reveal errors/data',async()=>{const h=createAtlasHome({existingComposer:{inspect:async()=>{throw new Error('SECRET_TOKEN')}}});const r=await h.inspectWork();assert.equal(r.status,'HOLD');assert.equal(JSON.stringify(r).includes('SECRET_TOKEN'),false)});
test('a hostile getter root is rejected without invoking getter',()=>{const f=frame();let n=0;Object.defineProperty(f,'status',{enumerable:true,get(){n++;throw Error('ATTACK')}});const r=inspectPreparedPeerResult(f);assert.equal(r.status,'HOLD');assert.equal(n,0)});
test('proxy root rejected',()=>assert.equal(inspectPreparedPeerResult(new Proxy(frame(),{})).status,'HOLD'));
test('node navigation does not fabricate source science',()=>{const h=createAtlasHome(),n=h.openNode('H12.S12.N12');assert.equal(n.status,'CANONICAL_NAVIGATION_ONLY');assert.equal(n.location.kind,'EPISTEMIC_META');assert.equal(n.neighborLinksAreEvidence,false);assert.equal(n.sourceRightsVerified,false)});
test('unrecognized coordinate does not create a node',()=>assert.equal(createAtlasHome().openNode('H00.S01.N01').status,'HOLD'));
test('return ticket starts blank, is ephemeral, clears on leaving',()=>{const t=createReturnTicket();assert.equal(t.peek().hsn,null);assert.equal(t.remember('H05.S06.N12').status,'IN_MEMORY_ONLY');assert.equal(t.peek().hsn,'H05.S06.N12');assert.equal(t.leave().storedRecords,0);assert.equal(t.peek().hsn,null);assert.equal(t.remember('H05.S06.N12').status,'CLOSED')});
test('Chronoforge Time axis is typed feature not fourth identity',()=>{assert.equal(CHRONOFORGE_VIEW.canonicalIdentityAxes,3);assert.equal(CHRONOFORGE_VIEW.timeScaleSlots,12);assert.equal(CHRONOFORGE_VIEW.syntheticFixtureBytesFloat64,165888);assert.equal(inspectTemporalPort({historical:true}).status,'HOLD_UNATTESTED_TIMESCALE_STATE')});

test('invalid HSN clears Work context but preserves last valid public location',()=>{
 const h=createAtlasHome();assert.equal(h.openNode('H03.S08.N11').status,'CANONICAL_NAVIGATION_ONLY');
 assert.equal(h.openNode('H00.S08.N11').status,'HOLD');assert.equal(h.descriptor().publicLocation,'H03.S08.N11');
 assert.equal(h.invalidateWorkProjection().status,'LOCAL_WORK_PROJECTION_CLEARED');
});
test('late Work response after invalid route is held, even with same public coordinate',async()=>{
 let finish;const h=createAtlasHome({existingComposer:{inspect:()=>new Promise(r=>finish=r)}});
 h.openNode('H03.S08.N11');const pending=h.inspectWork({requestId:'x'},{});
 assert.equal(h.openNode('invalid').status,'HOLD');finish(frame());const got=await pending;
 assert.equal(got.status,'HOLD');assert.equal(got.reason,'STALE_WORK_RESULT_AFTER_CONTEXT_CHANGE');
 assert.equal(h.descriptor().publicLocation,'H03.S08.N11');
});
test('leaving during Work inspection prevents stale result from being returned',async()=>{
 let finish;const h=createAtlasHome({existingComposer:{inspect:()=>new Promise(r=>finish=r)}});
 const p=h.inspectWork();const left=h.leave();assert.equal(left.status,'LEFT_WITHOUT_PERSISTENCE');finish(frame());const got=await p;
 assert.equal(got.status,'HOLD');assert.equal(h.descriptor().active,false);assert.equal(h.returnTicket.peek().hsn,null);
});
test('concurrent double issue is fenced to one inherited composer call',async()=>{
 let finish,calls=0;const h=createAtlasHome({existingComposer:{inspect:()=>{calls++;return new Promise(r=>finish=r)}}});
 const first=h.inspectWork();const other=await h.inspectWork();assert.equal(other.status,'HOLD');assert.equal(other.reason,'ONE_EXISTING_COMPOSER_BUSY');finish(frame());assert.equal((await first).status,'LOCAL_GEOMETRY_FRAME_INSPECTED_ONLY');assert.equal(calls,1);
});
test('reset of Work projection preserves optional home geometry but not old prepared bytes',async()=>{
 const h=createAtlasHome({existingComposer:{inspect:async()=>frame()}});h.openNode('H04.S07.N01');
 const a=await h.inspectWork();assert.equal(a.status,'LOCAL_GEOMETRY_FRAME_INSPECTED_ONLY');
 assert.equal(h.invalidateWorkProjection().publicLocation,'H04.S07.N01');assert.equal(h.descriptor().newRetrievers,0);
});

test('invalid address blocks new Work inspection even while public HSN remains visible',async()=>{
 let calls=0;const h=createAtlasHome({existingComposer:{inspect:async()=>{calls++;return frame()}}});
 h.openNode('H03.S08.N11');h.openNode('H00.S08.N11');
 const held=await h.inspectWork({requestId:'new'},{});
 assert.equal(held.reason,'VALID_CANONICAL_ROUTE_REQUIRED');assert.equal(calls,0);
 assert.equal(h.descriptor().publicLocation,'H03.S08.N11');assert.equal(h.descriptor().workEligible,false);
 const restored=h.openNode('H03.S08.N11');assert.equal(restored.status,'CANONICAL_NAVIGATION_ONLY');
 assert.equal(h.descriptor().workEligible,true);
 assert.equal((await h.inspectWork()).status,'LOCAL_GEOMETRY_FRAME_INSPECTED_ONLY');assert.equal(calls,1);
});
