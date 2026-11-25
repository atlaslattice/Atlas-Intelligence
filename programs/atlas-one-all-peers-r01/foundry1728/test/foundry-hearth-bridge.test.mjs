import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareHearthSnapshot,ARIADNE_SHA256} from '../../src/indra-hearth.mjs';
import {composeHearthWorkRef} from '../integrations/foundry-hearth-bridge.mjs';
const PIN=(n)=>n.repeat(64);
const request=()=>({scope:'WORK',registrySha256:ARIADNE_SHA256,sourceSha256:PIN('a'),sourceEdition:'owner-work-v1',purpose:'INFERENCE'});
const node=(hsn='H05.S06.N12')=>({hsn,parent:hsn.slice(0,7),kind:Number(hsn.slice(5,7))<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META',taskId:'AF1728-0648',status:'STRUCTURAL_TESTED_IN_OWNER_RUNTIME',workOrderSha256:PIN('b')});
function homeFixture(){
 const view={ontologySha256:ARIADNE_SHA256,originalNeuralRankUnchanged:true,releaseAuthorized:false,requiredSetIndependentlyComplete:false,hostIssuerVerified:false,frameDigest:PIN('1'),fullScoreSha256:PIN('2'),houseMass:Array(12).fill(1),sphereMass:Array(144).fill(1),baselineHits:[{hsn:'H05.S06.N12',score:1}]};
 const root={status:'INSPECTION_CANDIDATE_ONLY',sourceScope:'WORK',sourcePins:{registrySha256:ARIADNE_SHA256,sourceSha256:PIN('a')},frameDigest:PIN('1')};
 const obj={status:'PREPARED_PEER_INSPECTION_ONLY',aliasesExactlyIdentical:true,releaseAuthorized:false,view,originalRoot:root};
 obj.views={atlasOne:view,atlasGPT:view,atlasIntelligence:view,swarmchat:view};
 return obj;
}
test('actual original Hearth function creates a local review-only frame',()=>{
 const home=prepareHearthSnapshot(homeFixture(),request(),{selectedHsn:'H05.S06.N12'});
 assert.equal(home.status,'PREPARED_NOT_RELEASED');
 assert.equal(home.modelCallsByHearth,0);
 assert.equal(home.releaseAuthorized,false);
 const frame=composeHearthWorkRef(node(),home);
 assert.equal(frame.status,'LOCAL_STRUCTURAL_WORK_REF_ONLY');
 assert.equal(frame.taskId,'AF1728-0648');
 assert.equal(frame.originalNeuralRankChanged,false);
 assert.equal(frame.releaseAuthorized,false);
});
test('different HSN cannot attach to same home frame',()=>{
 const home=prepareHearthSnapshot(homeFixture(),request(),{selectedHsn:'H05.S06.N12'});
 assert.equal(composeHearthWorkRef(node('H05.S06.N11'),home).status,'HOLD_NO_WORK_VIEW');
});
test('late denied Hearth snapshot never binds work',()=>{
 const h=prepareHearthSnapshot(homeFixture(),{...request(),scope:'PLAY'},{selectedHsn:'H05.S06.N12'});
 assert.equal(h.status,'HOLD_SOURCE_ONLY');
 assert.equal(composeHearthWorkRef(node(),h).status,'HOLD_NO_WORK_VIEW');
});
test('symbolic method subject cannot be silently assigned',()=>{
 const h=prepareHearthSnapshot(homeFixture(),request(),{selectedHsn:'H05.S11.N04'});
 assert.equal(h.status,'HOLD_SOURCE_ONLY');
 assert.equal(composeHearthWorkRef(node('H05.S11.N04'),h).status,'HOLD_NO_WORK_VIEW');
});
test('method subject required, same house/domain only',()=>{
 const h=prepareHearthSnapshot(homeFixture(),request(),{selectedHsn:'H05.S11.N04',subjectHsn:'H05.S06.N12'});
 assert.equal(h.status,'PREPARED_NOT_RELEASED');
 const t=node('H05.S11.N04');t.taskId='AF1728-0700';
 assert.equal(composeHearthWorkRef(t,h).status,'LOCAL_STRUCTURAL_WORK_REF_ONLY');
});
test('mutated frame digest rejected',()=>{
 const h=prepareHearthSnapshot(homeFixture(),request(),{selectedHsn:'H05.S06.N12'});
 assert.equal(composeHearthWorkRef(node(),{...h,fullScoreDigest:'bad'}).status,'HOLD_NO_WORK_VIEW');
});
test('different original source sha rejected',()=>{
 const h=prepareHearthSnapshot(homeFixture(),request(),{selectedHsn:'H05.S06.N12'});
 assert.equal(composeHearthWorkRef(node(),h,{expectedSourceSha256:PIN('f')}).status,'HOLD_NO_WORK_VIEW');
});
test('no right to publish through caller flags',()=>{
 const h=prepareHearthSnapshot(homeFixture(),request(),{selectedHsn:'H05.S06.N12'});
 assert.equal(composeHearthWorkRef(node(),{...h,releaseAuthorized:true}).status,'HOLD_NO_WORK_VIEW');
});
test('historical private mode is not a Work task',()=>{
 const h=prepareHearthSnapshot(homeFixture(),request(),{selectedHsn:'H05.S06.N12'});
 assert.equal(composeHearthWorkRef(node(),h,{mode:'IMAGINE'}).status,'HOLD_NO_WORK_VIEW');
});
test('getters are not called for untrusted work order',()=>{
 let fired=0;const t=node();Object.defineProperty(t,'hsn',{get(){fired++;throw Error('LEAK');},enumerable:true});
 const h=prepareHearthSnapshot(homeFixture(),request(),{selectedHsn:'H05.S06.N12'});
 assert.equal(composeHearthWorkRef(t,h).status,'HOLD_NO_WORK_VIEW');assert.equal(fired,0);
});
test('forged wrapper cannot reclassify domain to method',()=>{
 const h=prepareHearthSnapshot(homeFixture(),request(),{selectedHsn:'H05.S06.N12'});
 const t=node();t.kind='EPISTEMIC_META';assert.equal(composeHearthWorkRef(t,h).status,'HOLD_NO_WORK_VIEW');
});
test('result fingerprint stable on same issued bytes and task',()=>{
 const h=prepareHearthSnapshot(homeFixture(),request(),{selectedHsn:'H05.S06.N12'});
 const a=composeHearthWorkRef(node(),h),b=composeHearthWorkRef(node(),h);
 assert.equal(a.sourceFrameFingerprint,b.sourceFrameFingerprint);
 assert.equal(a.hostRightsAttested,false);assert.equal(a.semanticAccepted,false);
});
