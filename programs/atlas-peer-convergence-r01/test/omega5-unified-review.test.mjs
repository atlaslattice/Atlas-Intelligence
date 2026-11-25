import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {composeOmega5} from '../src/omega5-unified-review.mjs';
import {inspectConvergence} from '../src/peer-convergence.mjs';
import {HSN,ARIADNE_SHA256} from '../../atlas-geometry-one-r38/src/addresses.mjs';
const D=s=>createHash('sha256').update(s).digest('hex');
const F=s=>{const b=Buffer.alloc(8*1728);s.forEach((x,i)=>b.writeDoubleLE(x,8*i));return D(Buffer.concat([Buffer.from('atlas.f64le.ordered-scores/v1\0'),b]));};
function topK(scores,k){return scores.map((score,index)=>({hsn:HSN[index],index,score})).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,k)}
function fixture({house=1,sphere=1}={}){
 const fullScores=Array.from({length:1728},(_,i)=>-1000-i);
 const idx=(house-1)*144+(sphere-1)*12;
 for(let j=0;j<12;j++)fullScores[idx+j]=12-j;
 fullScores[1300]=0; // signed-zero distinction outside top12
 const sourceSha256='b'.repeat(64),modelSha256='c'.repeat(64),querySha256='d'.repeat(64),requestId='req-omega5',rightsEpoch='epoch-1',tenant='atlas',principal='owner';
 const frameDigest=D(JSON.stringify({requestId,modelSha256,sourceSha256,querySha256,scores:fullScores}));
 const baseline={hits:topK(fullScores,12)},sourcePins={registrySha256:ARIADNE_SHA256,sourceSha256,modelSha256};
 const root={schema:'atlas.geometry-one.root/v1',status:'INSPECTION_CANDIDATE_ONLY',sourceScope:'WORK',tenant,rightsEpoch,
  canDeploy:false,canTrain:false,releaseAuthorized:false,activationCount:1,topology:[12,12,12],sourcePins,frameDigest,
  baseline,projections:{ARIADNE:{},NEURAL_HEAD:{frameDigest},GEOMETREE:{nodes:1728,spheres:144,houses:12},GRAPH_FABRIC:{},META145:{},GLYPH:{}},
  lineage:{issuerClaim:'fixture',sourceId:'work:synthetic',sourceEdition:'work-v1'}};
 const binding={requestId,querySha256,sourceSha256,modelSha256,tenant,principal,rightsEpoch,sourceEdition:'work-v1',purpose:'WORK_INSPECTION',requiredSetSha256:'e'.repeat(64)};
 const peerRecords=[{sourceId:'peer-r05',sourceSha256:'f'.repeat(64),revision:'r05',status:'TESTED_LOCAL',objection:''}];
 const peerFns={rankReview:()=>({status:'STABLE_ON_SUPPLIED_SCORES'}),closureReview:()=>({status:'MATCHED_PINNED_METADATA',releaseAuthorized:false,authorityEffect:'NONE'}),topK};
 const convergence=inspectConvergence({root,rawScores:fullScores,candidateScores:fullScores,queryBinding:{requestId,querySha256,sourceSha256,modelSha256},closureInput:{},errorBound:0,topK:12},peerFns);
 if(convergence.status!=='LOCAL_PEER_CONVERGENCE_REVIEW_ONLY')throw Error('TEST_PEER_FIXTURE_INVALID '+convergence.reason);
 const scope=D(JSON.stringify([requestId,querySha256,sourceSha256,modelSha256,tenant,principal,rightsEpoch,'work-v1',binding.requiredSetSha256,frameDigest]));
 const pins={frameDigest,fullScoreFrameSha256:F(fullScores),bindingScopeSha256:scope,sourceSha256,modelSha256,ontologySha256:ARIADNE_SHA256,rightsEpoch,requiredSetSha256:binding.requiredSetSha256};
 return {root,convergence,peerRecords,queryBinding:binding,fullScores,pins,maxHits:12};
}
function run(x){return composeOmega5(x)}
test('real PR70+PR71+PR69 combined valid source-only frame',()=>{const r=run(fixture());assert.equal(r.status,'LOCAL_RECONCILIATION_NOT_HOSTED');assert.equal(r.rankParityAgainstPr70,true);assert.equal(r.fullFrameVerifiedAgainstSuppliedPins,true);assert.equal(r.symbolicEdition,'cupwake-x4/v1')});
test('no model/host/canon/rights capabilities granted',()=>{const r=run(fixture());for(const k of ['releaseAuthorized','canTrain','canDeploy','hostRightsVerified','requiredSetIndependentlyComplete','canonChanged'])assert.equal(r[k],false);assert.equal(r.modelCalls,0)});
test('open peer objection cannot be silently resolved',()=>{const x=fixture();x.peerRecords[0].objection='Open dissent';const r=run(x);assert.equal(r.status,'LOCAL_REVIEW_WITH_UNRESOLVED_OBJECTIONS');assert.equal(r.openObjections,1)});
test('alter hidden score preserving top12 rejected',()=>{const x=fixture();x.fullScores[1600]=17;const r=run(x);assert.equal(r.status,'HOLD')});
test('signed -0 differs from +0 in full-score frame despite JSON parity',()=>{const x=fixture();x.fullScores[1300]=-0;assert.equal(JSON.stringify(x.fullScores),JSON.stringify(fixture().fullScores));assert.equal(run(x).reason,'HIDDEN_SCORE_FRAME_DRIFT')});
test('claiming other signed-zero digest cannot bypass PR71 JSON frame check',()=>{const x=fixture();x.fullScores[1300]=-0;x.pins.fullScoreFrameSha256=F(x.fullScores);const r=run(x);assert.equal(r.status,'LOCAL_RECONCILIATION_NOT_HOSTED');assert.notEqual(r.fullScoreFrameSha256,fixture().pins.fullScoreFrameSha256)});
test('change query purpose returns hold',()=>{const x=fixture();x.queryBinding.purpose='TRAINING';assert.equal(run(x).status,'HOLD')});
test('missing required set digest returns hold',()=>{const x=fixture();delete x.pins.requiredSetSha256;assert.equal(run(x).status,'HOLD')});
test('different rights epoch returns hold',()=>{const x=fixture();x.pins.rightsEpoch='epoch-2';assert.equal(run(x).status,'HOLD')});
test('different scope digest returns hold',()=>{const x=fixture();x.pins.bindingScopeSha256='3'.repeat(64);assert.equal(run(x).status,'HOLD')});
test('different evidence source digest returns hold',()=>{const x=fixture();x.pins.sourceSha256='3'.repeat(64);assert.equal(run(x).status,'HOLD')});
test('different registry is not substitute source pin',()=>{const x=fixture();x.pins.ontologySha256=x.pins.sourceSha256;assert.equal(run(x).status,'HOLD')});
test('different PR70 peer rank review cannot be laundered',()=>{const x=fixture();x.convergence={...x.convergence,peerRankStatus:'HOLD'};assert.equal(run(x).status,'HOLD')});
test('different PR70 peer closure review cannot be laundered',()=>{const x=fixture();x.convergence={...x.convergence,peerClosureStatus:'OPEN'};assert.equal(run(x).status,'HOLD')});
test('missing PR70 originalCandidateHsn cannot pass',()=>{const x=fixture();x.convergence={...x.convergence,originalCandidateHsn:[]};assert.equal(run(x).status,'HOLD')});
test('PR70 source-only root top-k can’t be swapped after issue',()=>{const x=fixture();x.root.baseline.hits[0].hsn='H11.S12.N12';assert.equal(run(x).status,'HOLD')});
test('NaN and boolean full score arrays both hold',()=>{for(const v of [NaN,Infinity,true]){const x=fixture();x.fullScores[1500]=v;assert.equal(run(x).status,'HOLD')}});
test('root getter denied without triggering getter',()=>{const x=fixture();let calls=0;Object.defineProperty(x.root,'sourcePins',{enumerable:true,get(){calls++;throw Error('getter')}});assert.equal(run(x).status,'HOLD');assert.equal(calls,0)});
test('peer-record proxy denied without triggering get trap',()=>{const x=fixture();let calls=0;x.peerRecords[0]=new Proxy(x.peerRecords[0],{get(){calls++;throw Error('trap')}});assert.equal(run(x).status,'HOLD');assert.equal(calls,0)});
test('source-body side key excluded',()=>{const x=fixture();x.peerRecords[0].sourceBody='confidential';assert.equal(run(x).status,'HOLD')});
test('peer hash cannot match different edition',()=>{const x=fixture();x.queryBinding.sourceEdition='other';assert.equal(run(x).status,'HOLD')});
test('all 144 sphere anchor permutations agree with original HSN',()=>{
 for(let h=1;h<=12;h++)for(let s=1;s<=12;s++){const x=fixture({house:h,sphere:s});const r=run(x);assert.equal(r.status,'LOCAL_RECONCILIATION_NOT_HOSTED',`H${h}.S${s} ${r.reason}`)}
});
test('mutation after snap cannot change already returned envelope',()=>{const x=fixture(),r=run(x);x.fullScores[0]=99999;assert.equal(r.status,'LOCAL_RECONCILIATION_NOT_HOSTED');assert.equal(r.fullScoreFrameSha256,x.pins.fullScoreFrameSha256)});
test('no copied query/peer source bodies in output',()=>{const x=fixture();x.root.lineage.sourceId='work:synthetic';const r=run(x);assert.ok(!Object.keys(r).includes('fullScores'));assert.ok(!Object.keys(r).includes('peerRecords'));assert.ok(!Object.keys(r).includes('root'))});
