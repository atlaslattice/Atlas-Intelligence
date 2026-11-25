import test from 'node:test';import assert from 'node:assert/strict';
import {evaluateHeldout} from '../eval/quality-gate.mjs';
const H='a'.repeat(64);
const make=()=>({queries:Array.from({length:12},(_,i)=>({id:`q${i}`,querySha256:H,familyId:`f${Math.floor(i/2)}`,
 baseline:['H01.S01.N01','H01.S01.N02'],candidate:['H01.S01.N02','H01.S01.N01'],
 grades:[0,1].map(j=>({reviewId:`r${i}-${j}`,reviewerId:`id${j}`,sourceRef:`source-${i}`,
 judgments:[{hsn:'H01.S01.N01',grade:3},{hsn:'H01.S01.N02',grade:1}]}))}))});
const mock={verifyResearchScope:()=>true,verifyReviewers:()=>true,verifyFamilies:()=>true};
test('no human review means no independent quality evidence',()=>{
 assert.equal(evaluateHeldout({panel:{queries:[]}}).status,'HOLD');
 assert.equal(evaluateHeldout({panel:make()}).reason,'EXTERNAL_INDEPENDENT_AUTHORITY_REQUIRED');
});
test('a complete synthetic review can test only nDCG arithmetic, not establish human independence',()=>{
 const x=evaluateHeldout({panel:make(),independentAuthority:mock});
 assert.equal(x.status,'REVIEW_MATH_COMPUTED_UNPROMOTED');assert.ok(x.baselineNdcg10>x.candidateNdcg10);
 assert.equal(x.independentlyCertifiedQualityGain,false);assert.equal(x.releaseAuthorized,false);
});
test('identical model ranks cannot acquire artificial geometry quality gain',()=>{
 const p=make();for(const q of p.queries)q.candidate=[...q.baseline];
 const x=evaluateHeldout({panel:p,independentAuthority:mock});assert.equal(x.delta,0);
});
test('source lineage and independent reviewer gate holds',()=>{
 const bad=make();bad.queries[0].grades[1].reviewerId=bad.queries[0].grades[0].reviewerId;
 assert.equal(evaluateHeldout({panel:bad,independentAuthority:mock}).reason,'TWO_INDEPENDENT_REVIEWERS_REQUIRED');
 assert.equal(evaluateHeldout({panel:make(),independentAuthority:{...mock,verifyFamilies:()=>false}}).reason,'FAMILY_TIME_HOLDOUT_NOT_ATTESTED');
 assert.equal(evaluateHeldout({panel:make(),independentAuthority:{...mock,verifyResearchScope:()=>false}}).reason,'UNVERIFIED_RESEARCH_RIGHTS_OR_REVIEWERS');
});
test('no unjudged candidate or forged scores',()=>{
 const p=make();p.queries[0].candidate.push('H02.S12.N12');
 assert.equal(evaluateHeldout({panel:p,independentAuthority:mock}).reason,'UNJUDGED_CANDIDATE');
 const q=make();q.queries[0].grades[0].judgments[1].grade=NaN;
 assert.equal(evaluateHeldout({panel:q,independentAuthority:mock}).reason,'UNSAFE_GRADE');
});
