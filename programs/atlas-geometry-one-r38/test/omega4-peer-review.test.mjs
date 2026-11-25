import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareOmega4PeerReview} from '../src/omega4-peer-review.mjs';
const SHA='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
function fixture(){
 const inspection={schema:'atlas.geometry-one.root/v1',status:'INSPECTION_CANDIDATE_ONLY',
  activationCount:1,canDeploy:false,canTrain:false,releaseAuthorized:false,
  frameDigest:'a'.repeat(64),rightsEpoch:'owner-epoch-1',
  sourcePins:{registrySha256:SHA,sourceSha256:'b'.repeat(64),modelSha256:'c'.repeat(64)},
  lineage:{sourceId:'work:fixture',sourceEdition:'v1'},baseline:{hits:[{hsn:'H01.S01.N01',score:0.1}]}};
 const independentlyPinned={sourceSha256:'b'.repeat(64),modelSha256:'c'.repeat(64),frameDigest:'a'.repeat(64),rightsEpoch:'owner-epoch-1'};
 const peerRecords=[{sourceId:'r05-stable',sourceSha256:'d'.repeat(64),revision:'r05',status:'TESTED_LOCAL',objection:'Host use remains unbound'},
 {sourceId:'r03-legacy',sourceSha256:'e'.repeat(64),revision:'r03',status:'REJECTED',objection:'Cancellation failure'}];
 return {inspection,independentlyPinned,peerRecords};
}
test('original result not copied; no new model, release or CANON',()=>{
 const x=fixture();const saved=JSON.stringify(x.inspection);const y=prepareOmega4PeerReview(x);
 assert.equal(y.originalResult,undefined);assert.equal(JSON.stringify(x.inspection),saved);
 assert.equal(y.modelCallsByAdapter,0);
 assert.equal(y.status,'PREPARED_NOT_RELEASED');assert.equal(y.openObjections,2);
 assert.equal(y.releaseAuthorized,false);assert.equal(y.canonChanged,false);
 assert.equal(y.rankChanged,false);
});
test('stable peer order leaves exact review digest unchanged',()=>{
 const x=fixture(),y=fixture();y.peerRecords.reverse();
 assert.equal(prepareOmega4PeerReview(x).peerDigest,prepareOmega4PeerReview(y).peerDigest);
});
test('source epoch drift HOLD',()=>{const x=fixture();x.independentlyPinned.rightsEpoch='old';assert.equal(prepareOmega4PeerReview(x).status,'HOLD_PEER_REVIEW')});
test('source digest drift HOLD',()=>{const x=fixture();x.independentlyPinned.sourceSha256='f'.repeat(64);assert.equal(prepareOmega4PeerReview(x).status,'HOLD_PEER_REVIEW')});
test('registry drift HOLD',()=>{const x=fixture();x.inspection.sourcePins.registrySha256='f'.repeat(64);assert.equal(prepareOmega4PeerReview(x).status,'HOLD_PEER_REVIEW')});
test('unexpected rights label HOLD',()=>{const x=fixture();x.inspection.releaseAuthorized=true;assert.equal(prepareOmega4PeerReview(x).status,'HOLD_PEER_REVIEW')});
test('bad ranking score HOLD',()=>{const x=fixture();x.inspection.baseline.hits[0].score=Infinity;assert.equal(prepareOmega4PeerReview(x).status,'HOLD_PEER_REVIEW')});
test('duplicate ranking ID HOLD',()=>{const x=fixture();x.inspection.baseline.hits.push({...x.inspection.baseline.hits[0]});assert.equal(prepareOmega4PeerReview(x).status,'HOLD_PEER_REVIEW')});
test('duplicate peer source HOLD',()=>{const x=fixture();x.peerRecords.push({...x.peerRecords[0]});assert.equal(prepareOmega4PeerReview(x).status,'HOLD_PEER_REVIEW')});
test('accessor refuses with zero getter calls',()=>{const x=fixture();let calls=0;Object.defineProperty(x.peerRecords[0],'status',{enumerable:true,get(){calls++;return 'TESTED_LOCAL'}});assert.equal(prepareOmega4PeerReview(x).status,'HOLD_PEER_REVIEW');assert.equal(calls,0)});
test('proxy refuses without executing trap',()=>{const x=fixture();let calls=0;x.peerRecords[0]=new Proxy(x.peerRecords[0],{get(){calls++;throw Error('trap')}});assert.equal(prepareOmega4PeerReview(x).status,'HOLD_PEER_REVIEW');assert.equal(calls,0)});
test('extra field cannot smuggle source body',()=>{const x=fixture();x.peerRecords[0].sourceBody='secret';assert.equal(prepareOmega4PeerReview(x).status,'HOLD_PEER_REVIEW')});
test('missing closure does not become approval',()=>{const y=prepareOmega4PeerReview(fixture());assert.equal(y.requiredClosureIndependentlyComplete,false)});