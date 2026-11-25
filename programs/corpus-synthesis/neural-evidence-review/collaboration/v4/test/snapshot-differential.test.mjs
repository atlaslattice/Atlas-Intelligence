import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareRuleRevision as baseline} from '../../v3/src/rule-revision-gate.mjs';
import {compareRuleRevision as candidate} from '../src/rule-revision-snapshot.mjs';
const path = new URL('../fixtures/sample-review.json', import.meta.url);
const load=()=>JSON.parse(readFileSync(path,'utf8'));
const A='a'.repeat(64), B='b'.repeat(64);

test('01 baseline exact result parity on unmodified JSON-native fixture',()=>{
 const a=baseline(load()), b=candidate(load());
 assert.deepEqual(b,a);assert.equal(a.status,'LOCAL_REVIEW_CANDIDATE_ONLY');
});
test('02 independent complete input is not mutated by evaluation',()=>{
 const v=load(),before=JSON.stringify(v);candidate(v);assert.equal(JSON.stringify(v),before);
});
test('03 v3 nested evidence mutable after digest (RED); v4 deeply frozen (GREEN)',()=>{
 const old=baseline(load()), fresh=candidate(load());
 assert.equal(Object.isFrozen(old),true);
 assert.equal(Object.isFrozen(old.totals),false);
 assert.equal(Object.isFrozen(fresh.totals),true);
 assert.equal(Object.isFrozen(fresh.benchmark),true);
 assert.equal(Object.isFrozen(fresh.sourceCodePins),true);
 old.totals.improvements=1728;
 assert.equal(old.totals.improvements,1728);
 assert.equal(old.evidenceDigest,fresh.evidenceDigest);
 assert.throws(()=>{fresh.totals.improvements=1728},TypeError);
 assert.throws(()=>{fresh.benchmark.baselineP50Ms=0},TypeError);
 assert.throws(()=>{fresh.sourceCodePins.candidate=B},TypeError);
 assert.equal(fresh.totals.improvements,1);
});
test('04 getter-style Proxy returns conflicting source edition (RED); candidate binds descriptor snapshot (GREEN)',()=>{
 const v=load();
 const source=v.reviewInput.source;
 let reads=0;
 v.reviewInput.source=new Proxy(source,{
  get(target,key,receiver){if(key==='sourceEdition'){reads++;return 'Forged source edition';}return Reflect.get(target,key,receiver);},
 });
 const old=baseline(v);const newer=candidate(v);
 assert.equal(old.status,'LOCAL_REVIEW_CANDIDATE_ONLY');
 assert.equal(old.sourceEdition,'Forged source edition');
 assert.equal(newer.sourceEdition,source.sourceEdition);
 assert.equal(old.completeReviewInputDigest,newer.completeReviewInputDigest);
 assert.notEqual(old.evidenceDigest,newer.evidenceDigest);
 assert.equal(reads>0,true);
});
test('05 nested output metadata all is frozen recursively',()=>{
 const r=candidate(load());
 assert.equal(Object.isFrozen(r),true);
 for(const k of ['totals','benchmark','sourceCodePins'])assert.equal(Object.isFrozen(r[k]),true);
});
test('06 each synthetic source evidence mutation reproduces same candidate verdict as baseline',()=>{
 const mutations=[
 x=>{x.reviewInput.evidence.testReceiptDigest=B;},
 x=>{x.reviewInput.hsn.nodeRecordDigest=B;},
 x=>{x.reviewInput.change.addition='More complete reviewer evidence and source receipts';},
 x=>{x.cases[0].receiptSha256=B;},
 x=>{x.cases[0].candidate='FAIL';},
 x=>{x.cases[0].candidate='HOLD';},
 x=>{x.benchmark.pairs[0].candidateMs=25;},
 x=>{x.dissent[0].summary='Another unresolved original dissent with a source pin';},
 x=>{x.observedAt='2026-11-25T20:13:48.062Z';},
 x=>{x.reviewInput.source.sourceUrl='https://a:secret@example.org/';},
 x=>{x.cases[0].sourceCaseSha256='bad';},
 ];
 for(const mutate of mutations){const x=load();mutate(x);assert.deepEqual(candidate(x),baseline(x));}
});
test('07 foreign nested getter rejected by both engines',()=>{
 const x=load();Object.defineProperty(x.reviewInput.source,'sourceEdition',{get(){throw Error('not allowed')}});
 assert.equal(baseline(x).status,'HOLD_REVIEW_ONLY');
 assert.equal(candidate(x).status,'HOLD_REVIEW_ONLY');
});
test('08 candidate HOLD result is top-level frozen',()=>{
 const x=load();x.reviewInput.source.sourceDigest='bad';const out=candidate(x);
 assert.equal(out.status,'HOLD_REVIEW_ONLY');assert.equal(Object.isFrozen(out),true);
});
test('09 property mutation cannot spoof a new observed approval after return',()=>{
 const r=candidate(load()), digest=r.evidenceDigest;
 assert.throws(()=>{r.benchmark.measuredSpeedupVerified=true},TypeError);
 assert.throws(()=>{r.reviewState='APPROVED_BY_OWNER'},TypeError);
 assert.equal(r.evidenceDigest,digest);
 assert.equal(r.canDeploy,false);
});
test('10 independently cloned JSON result retains digest but has no authority',()=>{
 const r=candidate(load());const clone=structuredClone(r);
 assert.equal(clone.evidenceDigest,r.evidenceDigest);
 assert.equal(clone.hostVerified,false);
 clone.totals.improvements=2000;
 assert.notDeepEqual(clone.totals,r.totals);
 // A trusted verifier MUST recompute the digest/observe original; clones alone
 // are not authenticated and no signed or accepted task credit is claimed.
});
