import test from 'node:test';import assert from 'node:assert/strict';
import {HSN, ARIADNE_SHA256,decode} from '../../atlas-geometry-one-r38/src/addresses.mjs';
import {scoreFrameWitness,inspectFoundryFrame,roleFromHSN,atlasX3Display} from '../src/foundry1728-work-order.mjs';
const z='0'.repeat(64);const a='a'.repeat(64),b='b'.repeat(64),c='c'.repeat(64);
const scores=Array.from({length:1728},(_,i)=>Math.sin(i/12)+Math.cos(i/37)-i*1e-8);
function fixture(){return {scores:scores.slice(),modelSha256:a,querySha256:b,sourceSha256:c,sourceEdition:'atlas-test-evidence/v1',issuer:'SYNTHETIC_LOCAL_FIXTURE',tenant:'fixture',principal:'fixture',rightsEpoch:'fixture-epoch',requestId:'fixture-request',scope:'WORK',purpose:'INSPECTION',registrySha256:ARIADNE_SHA256,expectedLocalScoreDigest:scoreFrameWitness(scores)}}
test('1728 exact original HSN addresses are reversible and source-role consistent',()=>{
 assert.equal(HSN.length,1728);assert.equal(new Set(HSN).size,1728);
 for(const id of HSN){const r=roleFromHSN(id);const d=decode(id);assert.equal(r.role,d.s<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META');assert.equal(r.hsn,id)}
});
test('one supplied local numeric frame drives actual original peer 12 port projections',()=>{
 const s=inspectFoundryFrame(fixture());assert.equal(s.status,'LOCAL_INSPECTION_ONLY');assert.equal(s.top.length,10);assert.equal(s.twelvePorts.length,12);assert.equal(s.houseMass.length,12);assert.equal(s.sphereMass.length,144);assert.equal(s.modelCallsAdded,0);assert.equal(s.releaseAuthorized,false);assert.equal(s.sourceIdentityVerified,false);
});
test('synthetic floats preserve exact alias of original deterministic ranking',()=>{
 const s=inspectFoundryFrame(fixture());const alt=fixture();assert.deepEqual(s.top,inspectFoundryFrame(alt).top);
});
test('a hidden score changes the binary digest even when top rank remains stable',()=>{
 const p=fixture();p.scores[0]+=1e-6;assert.equal(inspectFoundryFrame(p).status,'HOLD');
});
test('signed zero cannot be changed without a different frame receipt',()=>{
 const p=fixture();p.scores[160]=0;p.expectedLocalScoreDigest=scoreFrameWitness(p.scores);assert.equal(inspectFoundryFrame(p).status,'LOCAL_INSPECTION_ONLY');p.scores[160]=-0;assert.equal(inspectFoundryFrame(p).reason,'COMPLETE_FRAME_BYTES_DRIFT');
});
test('source record & ontology edition are not synonyms',()=>{
 const p=fixture();p.sourceEdition='ariadne-reader/v0.7';assert.equal(inspectFoundryFrame(p).reason,'EVIDENCE_EDITION_NOT_ONTOLOGY');
});
test('host READ/RETURN and training are never claimed',()=>{
 const s=inspectFoundryFrame(fixture());for(const k of ['peerRightsVerified','hostRightsVerified','releaseAuthorized','semanticAccepted','requiredSetIndependentlyComplete'])assert.equal(s[k],false);
});
test('no secret data or non-work mode accepted',()=>{const p=fixture();p.scope='PALACE';assert.equal(inspectFoundryFrame(p).status,'HOLD');});
test('forbid getter-backed scores before callback execution',()=>{const p=fixture();let called=false;Object.defineProperty(p.scores,'0',{get(){called=true;return 0}});assert.equal(inspectFoundryFrame(p).status,'HOLD');assert.equal(called,false)});
test('forbid sparse/extra numeric score array',()=>{const p=fixture();p.scores.length=1727;assert.equal(inspectFoundryFrame(p).status,'HOLD');});
test('reject proxy request and extra untrusted fields',()=>{const p=fixture();assert.equal(inspectFoundryFrame(new Proxy(p,{})).status,'HOLD');p.adminToken='fake';assert.equal(inspectFoundryFrame(p).status,'HOLD');});
test('immutable public receipt has no score array or source texts',()=>{const x=inspectFoundryFrame(fixture());assert.equal(Object.hasOwn(x,'scores'),false);assert.equal(Object.hasOwn(x,'sourceBodies'),false);assert.equal(Object.isFrozen(x),true);assert.equal(Object.isFrozen(x.top),true);assert.equal(Object.isFrozen(x.twelvePorts),true);});
test('metadata cannot be coerced to primitive by a malicious object',()=>{const p=fixture();let called=false;p.sourceEdition={toString(){called=true;return 'valid'}};assert.equal(inspectFoundryFrame(p).status,'HOLD');assert.equal(called,false)});
test('correct X3 symbolic mapping for 1728 exact original identities, not scientific inference',()=>{
 const combos=new Set();for(const id of HSN){const v=atlasX3Display(id);assert.equal(v.originalHsn,id);assert.equal(v.semanticAccepted,false);combos.add(`${v.pattern}:${v.context}`)}assert.equal(combos.size,1728);
});
test('work purpose cannot be silently upgraded to citation/inference',()=>{const p=fixture();p.purpose='INFERENCE';assert.equal(inspectFoundryFrame(p).status,'HOLD')});
