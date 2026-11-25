/**
 * Written as an inspection-ready test plan. No execution count is asserted
 * by the R38 draft until the owner elects to compare implementations.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { HSN, encode, decode, addressAsGlyphTokens, glyphTokensToAddress,
  ARIADNE_SHA256 } from '../src/addresses.mjs';
import { route, topK, reductions, exclusiveFourBands } from '../src/geometry.mjs';
import { createGeometryOne } from '../src/fabric.mjs';
import { CandidateGraph } from '../src/evidence.mjs';
import { EvidenceLedger, LogicalEffectLedger } from '../src/ledger.mjs';
import { PROPOSED_50, protocolSummary } from '../src/protocol50.mjs';

const hash=x=>createHash('sha256').update(x).digest('hex');
const fixture={
  requestId:'test_r38',tenant:'fixture_tenant',logicalTarget:'work:geometry',
  contractVersion:'r38',querySha256:hash('query'),sourceId:'work:fixture',
  sourceSha256:hash('source'),sourceEdition:'synthetic_v1',
  modelSha256:hash('model'),registrySha256:ARIADNE_SHA256,
  scope:'WORK',purpose:'INFERENCE',subject:'test subject'
};
const scores=Array.from({length:1728},(_,i)=>Math.sin(i/17));
const issuer=async q=>({
  schema:'atlas.geometry-one.issued/v1',...q,method:'NEURAL_ONLY',
  fallbackUsed:false,issuer:'fixture_issuer',scores
});
const closure=async()=>({
  status:'PINNED_COMPLETE_FOR_REVIEW',releaseAuthorized:false,authorityEffect:'NONE'
});
const allow=async()=>({allow:true,epoch:'fixture_epoch_1'});

test('HSN indices are reversible 1728 times',()=>{
  assert.equal(HSN.length,1728);
  for(const key of HSN){const v=decode(key);assert.equal(encode(v.h,v.s,v.n),key)}
});
test('glyph nine-token map roundtrips',()=>{
  for(const key of HSN)assert.equal(glyphTokensToAddress(addressAsGlyphTokens(key)),key);
});
test('flat alpha zero is score-identical',()=>{
  assert.deepEqual(Array.from(route(scores,{alpha:0})),scores);
});
test('geometry and shuffled controls have identical shape',()=>{
  assert.equal(route(scores,{alpha:.2}).length,1728);
  assert.equal(route(scores,{alpha:.2,profile:'SHUFFLED_MATCHED'}).length,1728);
});
test('House and Sphere masses normalize',()=>{
  const v=reductions(scores);
  assert.ok(Math.abs(v.house.reduce((a,b)=>a+b,0)-1)<1e-12);
  assert.ok(Math.abs(v.sphere.reduce((a,b)=>a+b,0)-1)<1e-12);
});
test('four disjoint bands cover all 1728',()=>{
  assert.deepEqual(exclusiveFourBands(scores,0).counts,[1,11,132,1584]);
});
test('top k is deterministic and bounded',()=>{
  assert.deepEqual(topK(scores,10),topK(scores,10));
  assert.throws(()=>topK(scores,21));
});
test('one gateway issue supports all 12 port views',async()=>{
  let issues=0;
  const kernel=createGeometryOne({gateway:async q=>{issues++;return issuer(q)},
    rights:allow,requiredClosure:closure});
  const r=await kernel.inspect(fixture,{alpha:.1});
  assert.equal(r.status,'INSPECTION_CANDIDATE_ONLY');
  assert.equal(issues,1);
  assert.equal(Object.keys(r.projections).length,12);
  assert.equal(r.releaseAuthorized,false);
});
test('work-only requests exclude Play and training',async()=>{
  const kernel=createGeometryOne({gateway:issuer,rights:allow,requiredClosure:closure});
  assert.equal((await kernel.inspect({...fixture,scope:'PLAY'})).status,'HOLD_INSPECTION_ONLY');
  assert.equal((await kernel.inspect({...fixture,purpose:'TRAINING'})).status,'HOLD_INSPECTION_ONLY');
});
test('stale or revoked RETURN epoch holds source data',async()=>{
  const rights=async phase=>({allow:true,epoch:phase==='RETURN'?'fixture_epoch_2':'fixture_epoch_1'});
  const kernel=createGeometryOne({gateway:issuer,rights,requiredClosure:closure});
  const r=await kernel.inspect(fixture);
  assert.equal(r.status,'HOLD_INSPECTION_ONLY');
  assert.equal(Object.hasOwn(r,'baseline'),false);
});
test('source pin mismatch holds even with valid scores',async()=>{
  const kernel=createGeometryOne({gateway:issuer,rights:allow,requiredClosure:closure});
  assert.equal((await kernel.inspect({...fixture,registrySha256:hash('wrong')})).status,'HOLD_INSPECTION_ONLY');
});
test('unreviewed edge cannot become a training label',()=>{
  const g=new CandidateGraph();
  g.propose({src:'H01.S01.N01',dst:'H02.S04.N05',type:'SEMANTIC_CANDIDATE',
    sourceId:'work:fixture',sourceSha256:hash('edge'),sourceVersion:'v1'});
  assert.equal(g.current()[0].canTrain,false);
  assert.equal(g.current()[0].semanticAccepted,false);
});
test('Work receipts retain room-qualified sequence identity',()=>{
  const ledger=new EvidenceLedger();
  const e={roomId:'synthetic-work-room',seq:1,hsn:'H01.S01.N01',
    bodySha256:hash('body'),sourceSha256:hash('source')};
  assert.equal(ledger.record(e).status,'LOCAL_METADATA_RECORDED');
  assert.equal(ledger.record(e).status,'NO_CHANGE');
  assert.throws(()=>ledger.record({...e,bodySha256:hash('different')}));
});
test('interface aliases do not invent additional logical effects',()=>{
  const l=new LogicalEffectLedger();
  assert.equal(l.simulate(fixture,hash('payload')).status,'SIMULATED_FIRST_EFFECT');
  assert.equal(l.simulate(fixture,hash('payload')).status,'SIMULATED_DUPLICATE_NO_CHANGE');
  assert.equal(l.count,1);
});
test('50 opportunities are proposed, not performed',()=>{
  assert.equal(PROPOSED_50.length,50);
  assert.equal(protocolSummary([]).verifiedDistinctApprovedPosts,0);
});
