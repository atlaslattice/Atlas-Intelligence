import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewPostrank, SCHEMA} from '../src/postrank-lineage-fixture.mjs';
const sha=x=>String(x).repeat(64);
const gen=sha('9'), vec=sha('a');
const auth={
  A1:{documentId:'A1',sourceId:'paper-A',recordSha256:sha('1'),recordRevision:1,vectorDigest:vec,rightsEpoch:1,retrievalGeneration:gen,status:'CURRENT',familyId:'origin-A',familyVerified:true,polarity:'supports',dissentRefs:[]},
  A2:{documentId:'A2',sourceId:'paper-A2',recordSha256:sha('2'),recordRevision:1,vectorDigest:vec,rightsEpoch:1,retrievalGeneration:gen,status:'CURRENT',familyId:'origin-A',familyVerified:true,polarity:'supports',dissentRefs:[]},
  B:{documentId:'B',sourceId:'paper-B',recordSha256:sha('3'),recordRevision:1,vectorDigest:sha('b'),rightsEpoch:1,retrievalGeneration:gen,status:'CURRENT',familyId:'origin-B',familyVerified:true,polarity:'contradicts',dissentRefs:['A1']},
};
const rank=(r,score,route='neural')=>({documentId:r.documentId,sourceId:r.sourceId,recordSha256:r.recordSha256,recordRevision:r.recordRevision,vectorDigest:r.vectorDigest,retrievalGeneration:r.retrievalGeneration,score,route});
const host=(db,rightsOverrides={})=>({
  lookup:async id=>db[id],
  currentReturnRights:async id=>({allowed:rightsOverrides[id]?.allowed??true,epoch:rightsOverrides[id]?.epoch??db[id].rightsEpoch}),
});
const clone=()=>structuredClone(auth);
const all=()=>[rank(auth.A1,.99),rank(auth.A2,.98),rank(auth.B,.7)];
const review=async(ranked,db=clone(),overrides)=>reviewPostrank({ranked,host:host(db,overrides)});

test('01 schema constant',()=>assert.equal(SCHEMA,'atlas.mica.postrank-local-review/v1'));
test('02 eligible A1 A2 B same ranking order',async()=>assert.deepEqual((await review(all())).returned.map(x=>x.documentId),['A1','A2','B']));
test('03 A1/A2 same verified root counted once, B independently',async()=>assert.equal((await review(all())).eligibleIndependentRootCount,2));
test('04 contradiction survives in eligible B without leaking dissent IDs',async()=>{const x=await review(all()); assert.equal(x.returned[2].polarity,'contradicts');assert.equal(x.returned[2].dissentPresent,true);assert.equal('dissentRefs'in x.returned[2],false)});
test('05 A2 revoked between ranking and return',async()=>{const db=clone(); db.A2.status='REVOKED';const x=await review(all(),db);assert.deepEqual(x.returned.map(z=>z.documentId),['A1','B']);assert.equal(x.reasons.NOT_CURRENT,1)});
test('06 A1 citation metadata changes without vector changes',async()=>{const db=clone();db.A1.recordSha256=sha('4');const x=await review(all(),db);assert.deepEqual(x.returned.map(z=>z.documentId),['A2','B']);assert.equal(x.reasons.STALE_OR_DIFFERENT_SOURCE,1)});
test('07 revision changed, same payload and vector',async()=>{const db=clone();db.A1.recordRevision=2;const x=await review(all(),db);assert.equal(x.returned.some(z=>z.documentId==='A1'),false)});
test('08 rights epoch advanced after ranking',async()=>{const x=await review(all(),clone(),{A2:{allowed:true,epoch:2}});assert.equal(x.returned.some(z=>z.documentId==='A2'),false)});
test('09 host denies despite caller source labels',async()=>{const x=await review(all(),clone(),{A1:{allowed:false}});assert.equal(x.returned.some(z=>z.documentId==='A1'),false)});
test('10 all ineligible yields explicit no-answer',async()=>{const db=clone();for(const r of Object.values(db))r.status='REVOKED';const x=await review(all(),db);assert.equal(x.status,'ABSTAIN_NO_ELIGIBLE_RETURN');assert.deepEqual(x.returned,[])});
test('11 same vector borrowed by foreign ID cannot pass if source differs',async()=>{const p=rank(auth.A1,.9);p.documentId='B';const x=await review([p]);assert.equal(x.returned.length,0);assert.equal(x.reasons.STALE_OR_DIFFERENT_SOURCE,1)});
test('12 internally consistent claimed record hash cannot override canonical record',async()=>{const p=rank(auth.A1,.9);p.recordSha256=sha('f');const x=await review([p]);assert.equal(x.returned.length,0)});
test('13 changed index generation forces stale',async()=>{const db=clone();db.A1.retrievalGeneration=sha('8');const x=await review([rank(auth.A1,.5)],db);assert.equal(x.status,'ABSTAIN_NO_ELIGIBLE_RETURN')});
test('14 unknown family remains uncertain, not counted as corroboration',async()=>{const db=clone();db.A1.familyVerified=false;db.A1.familyId=null;const x=await review([rank(auth.A1,.8)],db);assert.equal(x.unresolvedAncestryCount,1);assert.equal(x.eligibleIndependentRootCount,0);assert.equal(x.returned[0].trainingPositiveEligible,false)});
test('15 family claim in ranked packet rejected rather than trusted',async()=>{const p=rank(auth.A1,.8);p.familyId='fake';assert.equal((await review([p])).status,'HOLD_INPUT')});
test('16 lexical fallback preserves labeled route, no false neural credit',async()=>{const x=await review([rank(auth.B,.3,'lexical')]);assert.equal(x.returned[0].route,'lexical')});
test('17 graph expanded route preserves labeled route',async()=>{const x=await review([rank(auth.B,.3,'graph')]);assert.equal(x.returned[0].route,'graph')});
test('18 no eligible training positives even if retrieval allowed',async()=>{const x=await review(all());assert.equal(x.returned.every(y=>y.trainingPositiveEligible===false),true);assert.equal(x.canTrain,false)});
test('19 no raw bodies appear in serialized output',async()=>{const x=await review(all());assert.equal(JSON.stringify(x).includes('original passage'),false);assert.equal(x.sourceTextReturned,false)});
test('20 missing rights callback denies',async()=>assert.equal((await reviewPostrank({ranked:all(),host:{lookup:async()=>auth.A1}})).status,'HOLD_INPUT'));
test('21 fake host claim does not grant real deployment',async()=>{const x=await review(all());assert.equal(x.hostedVerified,false);assert.equal(x.canPublish,false)});
test('22 malformed candidate score rejected',async()=>{const p=rank(auth.B,.4);p.score=NaN;assert.equal((await review([p])).status,'HOLD_INPUT')});
test('23 accessor-bearing candidate rejected without evaluating getter',async()=>{let n=0;const p=rank(auth.B,.4);Object.defineProperty(p,'sourceId',{enumerable:true,get(){n++;return 'paper-B'}});assert.equal((await review([p])).status,'HOLD_INPUT');assert.equal(n,0)});
test('24 accessors on canonical record denied',async()=>{const db=clone();Object.defineProperty(db.A1,'sourceId',{enumerable:true,get(){throw Error('hostile')}});const x=await review([rank(auth.A1,.8)],db);assert.equal(x.reasons.INVALID_AUTHORITY_RECORD,1)});
test('25 duplicate candidate same document cannot inflate independent roots',async()=>{const x=await review([rank(auth.A1,.9),rank(auth.A1,.8)]);assert.equal(x.returned.length,1);assert.equal(x.eligibleIndependentRootCount,1)});
test('26 bad rootVerified with null id refused',async()=>{const db=clone();db.A1.familyId=null;const x=await review([rank(auth.A1,.9)],db);assert.equal(x.returned.length,0)});
test('27 all source checks are mock-only (no automatic posting)',async()=>{const x=await review(all());assert.equal(x.hostedVerified,false);assert.equal(x.canPublish,false)});
test('28 candidate input bounded',async()=>{const xs=Array.from({length:1001},()=>rank(auth.A1,.4));assert.equal((await review(xs)).status,'HOLD_INPUT')});
test('29 sparse array denied',async()=>{const xs=[];xs.length=2;xs[0]=rank(auth.A1,.9);assert.equal((await review(xs)).status,'HOLD_INPUT')});
test('30 inherited subclass array denied',async()=>{class A extends Array{};const xs=new A();xs.push(rank(auth.A1,.9));assert.equal((await review(xs)).status,'HOLD_INPUT')});
test('31 wrong source even with same vector blocked',async()=>{const p=rank(auth.A2,.7);p.sourceId='paper-A';const x=await review([p]);assert.equal(x.returned.length,0)});
test('32 stale rights denial changes no other eligible ranks',async()=>{const x=await review(all(),clone(),{A2:{allowed:false}});assert.deepEqual(x.returned.map(y=>y.documentId),['A1','B'])});
