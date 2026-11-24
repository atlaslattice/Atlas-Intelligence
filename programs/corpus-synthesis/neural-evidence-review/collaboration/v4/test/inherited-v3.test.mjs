import test from 'node:test';
import assert from 'node:assert/strict';
import {compareRuleRevision as evaluate, REQUIRED_FAMILIES, structuralReviewMatrix} from '../src/rule-revision-snapshot.mjs';
import {prepareCollaborativeWorkReview as predecessor,REGISTRY_SHA256} from '../../src/work-review-contract.mjs';

const A='a'.repeat(64), B='b'.repeat(64), C='c'.repeat(64),D='d'.repeat(64);
function make(){
 const reviewInput={
  room:{id:'atlas-neural-synthetic-work-20261124-01',kind:'work',status:'open',headSeq:166,messageCount:166,maxMessages:500,maxPerMember:30,memberMessages:3,expiresAt:'2026-11-25T20:12:48.062Z'},
  member:{id:'synthetic-reviewer-20261124-r01',assurance:'SELF_DECLARED',consent:'USER_INVITATION_WORK'},
  reply:{parentSeq:33,requestId:'mica-collab-v3-review-20261124-r1',referencedSeqs:[33,166]},
  source:{scope:'WORK',privateModeDataIncluded:false,sourceUrl:'https://github.com/atlaslattice/Atlas-Intelligence/pull/58',sourceDigest:A,sourceEdition:'PR58-source-only'},
  change:{predecessor:'Source-bound v2 collaborative review',addition:'Concrete v3 regression comparator',testableDifference:'Rejects regressions and unsafe previously accepted input',falsifier:'A previously green safety case turns red yet comparator proposes adoption'},
  hsn:{node:'H05.S11.N04',role:'EPISTEMIC_META',subject:'H05.S06.N12',registryDigest:REGISTRY_SHA256,nodeRecordDigest:A},
  evidence:{testStatus:'LOCAL_REVIEW_ONLY',testsRun:24,testsPassed:24,testsFailed:0,testReceiptDigest:A,humanReviewed:false,hostVerified:false},
  release:{edition:'ATLAS_COLLAB_V2_PROPOSAL',status:'SOURCE_ONLY_TESTED_LOCAL',permissionEffect:'NONE',canonEffect:'NONE',modelWeightsChanged:false,hostedDeployed:false},
  claims:{actuallyPosted:false,scheduledWakeCount:0,performedAgentVisits:0,peerIdentityVerified:false,semanticAccepted:false}
 };
 const cases=REQUIRED_FAMILIES.flatMap((family,i)=>[
  {id:`p_${String(i).padStart(2,'0')}`,family,role:'POSITIVE',sourceCaseSha256:A,baseline:'PASS',candidate:'PASS',receiptSha256:B},
  {id:`n_${String(i).padStart(2,'0')}`,family,role:'NEGATIVE',sourceCaseSha256:C,baseline:i===0?'FAIL':'PASS',candidate:'PASS',receiptSha256:D}
 ]);
 const benchmark={mode:'SYNTHETIC_TEST_ONLY',environmentSha256:A,workloadSha256:B,maxP95RegressionRatio:1.1,
  pairs:Array.from({length:7},(_,i)=>({scenarioSha256:C,baselineMs:10+i,candidateMs:9+i,baselineOutputSha256:D,candidateOutputSha256:D}))};
 return {reviewInput,observedAt:'2026-11-24T21:29:00Z',baselineCodeSha256:A,candidateCodeSha256:B,
  cases,benchmark,dissent:[{id:'dissent_01',status:'OPEN',sourceUrl:'https://github.com/atlaslattice/Atlas-Intelligence/pull/58',sourceSha256:C,summary:'Host source and actual permissions still unresolved; keep this review-only.'}],revisionId:'mica-v3-reviewed-code'};
}
const verify=(v,expected='HOLD_REVIEW_ONLY')=>assert.equal(evaluate(v).status,expected);
const deny=(change,expected='HOLD_REVIEW_ONLY')=>{const v=make();change(v);verify(v,expected)};
test('01 complete positive fixture is local review only',()=>{const r=evaluate(make());assert.equal(r.status,'LOCAL_REVIEW_CANDIDATE_ONLY');assert.equal(r.totals.cases,24);assert.equal(r.totals.guardFamilies,12);assert.equal(r.totals.improvements,1);assert.equal(r.canPost,false);assert.equal(r.canDeploy,false);assert.equal(r.canRatify,false);assert.equal(r.confirmedMacroturns,undefined);assert.equal(r.completedMacroturns,0)});
test('02 stable replay digest',()=>assert.deepEqual(evaluate(make()),evaluate(make())));
test('03 source-only result excludes private source bodies',()=>assert.equal(evaluate(make()).sourceBodiesIncluded,false));
test('04 inherited v2 constructor accepts the supported source packet',()=>assert.equal(predecessor(make().reviewInput).status,'PREPARED_NOT_POSTED'));
test('05 previous version admits stale open-room timestamp; new comparator holds',()=>{const v=make();v.reviewInput.room.expiresAt='2001-01-01T00:00:00Z';assert.equal(predecessor(v.reviewInput).status,'PREPARED_NOT_POSTED');verify(v)});
test('06 previous version carries credentialed URL; comparator holds',()=>{const v=make();v.reviewInput.source.sourceUrl='https://user:password@example.org/path';assert.equal(predecessor(v.reviewInput).status,'PREPARED_NOT_POSTED');verify(v)});
test('07 expired relative to observation holds',()=>deny(v=>v.observedAt='2026-11-26T20:13:00Z'));
test('08 exact expiry boundary holds',()=>deny(v=>v.observedAt=v.reviewInput.room.expiresAt));
test('09 missing present observation holds',()=>deny(v=>v.observedAt='not a date'));
test('10 username and password in source link hold',()=>deny(v=>v.reviewInput.source.sourceUrl='https://user:secret@example.org/path'));
test('11 credential query name holds',()=>deny(v=>v.reviewInput.source.sourceUrl='https://example.org/path?access_token=demo'));
test('12 safe permalink room/seq allowed',()=>{const v=make();v.reviewInput.source.sourceUrl='https://example.org/?room=abc&seq=12';verify(v,'LOCAL_REVIEW_CANDIDATE_ONLY')});
test('13 v2 is not a host permission authority',()=>{const r=evaluate(make());assert.equal(r.hostVerified,false);assert.equal(r.humanRatified,false)});
test('14 same code pin is not a new revision',()=>deny(v=>v.candidateCodeSha256=A));
test('15 malformed SHA pin holds',()=>deny(v=>v.baselineCodeSha256='zz'));
test('16 duplicate case id holds',()=>deny(v=>v.cases[1].id=v.cases[0].id));
test('17 missing family negative control holds',()=>deny(v=>v.cases=v.cases.filter(x=>x.family!=='REVOCATION'||x.role!=='NEGATIVE')));
test('18 unknown review family holds',()=>deny(v=>v.cases[0].family='CANON_ACCEPTANCE_AUTOMATIC'));
test('19 extra case field holds',()=>deny(v=>v.cases[0].actualHostAttested=true));
test('20 revised safety regression rejected',()=>deny(v=>v.cases[0].candidate='FAIL','REJECT_LOCAL_REGRESSION'));
test('21 lost passing safety outcome is a regression even when candidate says HOLD',()=>deny(v=>v.cases[0].candidate='HOLD','REJECT_LOCAL_REGRESSION'));
test('22 false candidate pass of previously failing case rejected on another regression',()=>deny(v=>{v.cases[0].candidate='FAIL';v.cases[1].baseline='FAIL'},'REJECT_LOCAL_REGRESSION'));
test('23 no red-to-green is not a new improvement',()=>deny(v=>v.cases[1].baseline='PASS','HOLD_NO_NEW_IMPROVEMENT'));
test('24 open dissent counted but not auto resolved',()=>{const x=evaluate(make());assert.equal(x.totals.openDissent,1);assert.equal(x.canRatify,false)});
test('25 absent dissent held',()=>deny(v=>v.dissent=[]));
test('26 source dissent must not contain credentials',()=>deny(v=>v.dissent[0].sourceUrl='https://bearer:secret@example.org/'));
test('27 unsupported dissent status held',()=>deny(v=>v.dissent[0].status='VOTED_OVER'));
test('28 benchmark output byte drift rejects',()=>deny(v=>v.benchmark.pairs[0].candidateOutputSha256=A,'REJECT_LOCAL_REGRESSION'));
test('29 p95 performance regression HOLDS despite fixed safety',()=>deny(v=>v.benchmark.pairs[6].candidateMs=30,'HOLD_UNRESOLVED_CONTROLS'));
test('30 runtime output exact and benchmark labelled synthetic',()=>{const x=evaluate(make());assert.equal(x.benchmark.measuredSpeedupVerified,false);assert.equal(x.benchmark.mode,'SYNTHETIC_TEST_ONLY');assert.equal(x.benchmark.baselineP50Ms,13);assert.equal(x.benchmark.candidateP50Ms,12)});
test('31 no benchmark samples holds',()=>deny(v=>v.benchmark.pairs=[]));
test('32 NaN benchmark rejected',()=>deny(v=>v.benchmark.pairs[0].candidateMs=NaN));
test('33 boolean benchmark not numeric',()=>deny(v=>v.benchmark.pairs[0].candidateMs=true));
test('34 hostile source getter rejected without invoking it',()=>{let ran=false;deny(v=>Object.defineProperty(v.reviewInput.source,'sourceUrl',{get(){ran=true;throw Error('LEAK')}}));assert.equal(ran,false)});
test('35 false hosted claim held by predecessor',()=>deny(v=>v.reviewInput.evidence.hostVerified=true));
test('36 false CANON held by predecessor',()=>deny(v=>v.reviewInput.release.canonEffect='RATIFIED'));
test('37 private Play mode held by predecessor',()=>deny(v=>v.reviewInput.source.scope='PLAY'));
test('38 method without DOMAIN subject held by predecessor',()=>deny(v=>v.reviewInput.hsn.subject='H05.S12.N01'));
test('39 canonical 1728 structure preserves role split',()=>assert.deepEqual(structuralReviewMatrix(),{nodes:1728,spheres:144,houses:12,domainNodes:1008,epistemicMethodNodes:720,sourceSemanticsVerified:false,macroturnsPerformed:0}));
test('40 2048 synthetic source digests with failed pin never get accepted',()=>{let rejected=0;for(let i=0;i<2048;i++){const v=make();v.cases[0].sourceCaseSha256=i.toString(16).padStart(64,'0')+'x';if(evaluate(v).status==='HOLD_REVIEW_ONLY')rejected++;}assert.equal(rejected,2048)});

// Full-evidence digest controls triggered by live peer #174; v2 fingerprints only a projection.
test('41 v2 omits test receipt digest but v3 binds it',()=>{const a=make(),b=make();b.reviewInput.evidence.testReceiptDigest=B;assert.equal(predecessor(a.reviewInput).reviewDigest,predecessor(b.reviewInput).reviewDigest);assert.notEqual(evaluate(a).evidenceDigest,evaluate(b).evidenceDigest)});
test('42 v2 omits node record digest but v3 binds it',()=>{const a=make(),b=make();b.reviewInput.hsn.nodeRecordDigest=B;assert.equal(predecessor(a.reviewInput).reviewDigest,predecessor(b.reviewInput).reviewDigest);assert.notEqual(evaluate(a).evidenceDigest,evaluate(b).evidenceDigest)});
test('43 v2 omits change text but v3 binds it',()=>{const a=make(),b=make();b.reviewInput.change.addition='A revised and source-bound version of the same procedure';assert.equal(predecessor(a.reviewInput).reviewDigest,predecessor(b.reviewInput).reviewDigest);assert.notEqual(evaluate(a).evidenceDigest,evaluate(b).evidenceDigest)});
test('44 case receipt mutation without changed totals changes v3 digest',()=>{const a=make(),b=make();b.cases[0].receiptSha256=A;assert.deepEqual(evaluate(a).totals,evaluate(b).totals);assert.notEqual(evaluate(a).evidenceDigest,evaluate(b).evidenceDigest)});
test('45 source case identity mutation changes v3 digest',()=>{const a=make(),b=make();b.cases[2].sourceCaseSha256=D;assert.notEqual(evaluate(a).caseMatrixDigest,evaluate(b).caseMatrixDigest)});
test('46 dissent text mutation with same status changes v3 digest',()=>{const a=make(),b=make();b.dissent[0].summary='Same unresolved rights gate but newly supplied source review';assert.equal(evaluate(a).totals.openDissent,evaluate(b).totals.openDissent);assert.notEqual(evaluate(a).evidenceDigest,evaluate(b).evidenceDigest)});
test('47 benchmark sample mutation even when p50 and p95 stable changes v3 digest',()=>{const a=make(),b=make();b.benchmark.pairs[0].candidateMs+=0.1;assert.equal(evaluate(a).benchmark.candidateP95Ms,evaluate(b).benchmark.candidateP95Ms);assert.notEqual(evaluate(a).evidenceDigest,evaluate(b).evidenceDigest)});
test('48 observation timestamp mutation changes v3 digest',()=>{const a=make(),b=make();b.observedAt='2026-11-24T21:30:00Z';assert.notEqual(evaluate(a).evidenceDigest,evaluate(b).evidenceDigest)});
