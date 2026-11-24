import test from 'node:test';
import assert from 'node:assert/strict';
import {HOUSE_NAMES,ARIADNE_V07_SHA256} from '../src/civilizational-contract.mjs';
import {WHOLE_144_CANDIDATES} from '../src/whole-144-catalog.mjs';
import {buildWhole144Program,validateWhole144Program,locallyCheckWhole144,
  prepareWhole144WorkBursts,checkWhole144BurstItem,proposeNodeEvidence} from '../src/whole-144.mjs';
const p=()=>buildWhole144Program();
const example=()=>({candidateId:'W144-H12-S01',nodeCoordinate:'H12.S01.N05',mode:'WORK',
  codeDigest:'a'.repeat(64),testDigest:'b'.repeat(64),sourceRefs:['https://example.invalid/source']});
const hasHold=(result,reason)=>{assert.equal(result.status,'HOLD');assert.equal(result.reason,reason);assert.equal(result.verifiedGains,0);};

test('uses current verified H01/H10/H11/H12 labels without inventing spheres',()=>{
  assert.equal(HOUSE_NAMES.length,12);assert.equal(HOUSE_NAMES[0],'Energy & Matter');
  assert.match(HOUSE_NAMES[9],/Indigenous/);assert.equal(HOUSE_NAMES[10],'Protection & Rights');
  assert.equal(HOUSE_NAMES[11],'Space & Aerospace');
});
test('catalogue exactly 144 distinct substantive titles and exact acceptance criteria',()=>{
  assert.equal(WHOLE_144_CANDIDATES.length,144);
  assert.equal(new Set(WHOLE_144_CANDIDATES.map(x=>x.title)).size,144);
  assert.ok(WHOLE_144_CANDIDATES.every(x=>x.acceptance.length>=20));
});
test('work candidate build creates 144 proposals without claiming features',()=>{
  const r=p();assert.equal(r.status,'STRUCTURAL_CANDIDATE_ONLY');
  assert.equal(r.candidateCount,144);assert.equal(r.verifiedImplementedFeatures,0);
  assert.equal(r.verifiedNodeGains,0);assert.equal(r.actualResidentAssignments,0);
  assert.equal(r.hostedVerified,false);assert.equal(r.canPublish,false);
});
test('all 1728 coordinates unique and reachable',()=>{
  const slots=p().tasks.flatMap(x=>x.nodeSlots);
  assert.equal(slots.length,1728);assert.equal(new Set(slots).size,1728);
  assert.equal(slots[0],'H01.S01.N01');assert.equal(slots.at(-1),'H12.S12.N12');
});
test('twelve exactly ordered proposed spheres per House',()=>{
  for(let h=1;h<=12;h++){
    const r=p().tasks.slice((h-1)*12,h*12);
    assert.equal(r.length,12);
    for(let s=1;s<=12;s++)assert.equal(r[s-1].proposedPosition,`H${String(h).padStart(2,'0')}.S${String(s).padStart(2,'0')}`);
  }
});
test('does not assert exact original source bytes or any semantic assignment',()=>{
  const r=p();assert.equal(r.sourceOriginalBytesVerified,false);
  assert.equal(r.sphereSemanticsVerified,false);assert.ok(r.tasks.every(x=>x.sourceSemanticMatch==='UNMAPPED'));
  assert.ok(r.tasks.every(x=>x.implementation==='NOT_STARTED'));
});
test('digest deterministic and matches exact pinned source',()=>{
  assert.equal(p().sourceDigest,ARIADNE_V07_SHA256);
  assert.equal(p().programDigest,p().programDigest);
  assert.match(p().programDigest,/^[0-9a-f]{64}$/);
});
test('bad source digest held even if plausible SHA',()=>hasHold(buildWhole144Program({sourceDigest:'f'.repeat(64)}),'SOURCE_EDITION_OR_DIGEST_MISMATCH'));
test('bad edition held',()=>hasHold(buildWhole144Program({sourceEdition:'v0.8'}),'SOURCE_EDITION_OR_DIGEST_MISMATCH'));
test('forged host/privileged input field rejected',()=>hasHold(buildWhole144Program({hostAuthorized:true}),'INPUT_SHAPE_INVALID'));
test('null and array input held',()=>{hasHold(buildWhole144Program(null),'INPUT_SHAPE_INVALID');hasHold(buildWhole144Program([]),'INPUT_SHAPE_INVALID');});
test('valid program structural readback',()=>{
  const r=validateWhole144Program(p());assert.equal(r.status,'STRUCTURAL_VALID');
  assert.equal(r.checkedCandidates,144);assert.equal(r.checkedNodeSlots,1728);
});
test('tampering with candidate feature count never counts as achievement',()=>{
  hasHold(validateWhole144Program({...p(),verifiedImplementedFeatures:144}),'PROGRAM_TAMPERED_OR_STALE');
});
test('malformed digest held',()=>hasHold(validateWhole144Program({...p(),programDigest:'bad'}),'PROGRAM_SHAPE_INVALID'));
test('changing one proposed title is held',()=>{
  const r=p();const tasks=[...r.tasks];tasks[0]={...tasks[0],title:'forged installed feature'};
  hasHold(validateWhole144Program({...r,tasks}),'PROGRAM_TAMPERED_OR_STALE');
});
test('local structural check does NOT make measured improvement claim',()=>{
  const r=locallyCheckWhole144(p());assert.equal(r.status,'LOCAL_STRUCTURE_PASS');
  assert.equal(r.candidateChecks,144);assert.equal(r.nodeAddressChecks,1728);
  assert.equal(r.verifiedGains,0);assert.equal(r.realPeerReplies,0);
  assert.ok(r.houseChecks.every(x=>x.structuralChecksPassed===12&&x.implementedImprovements===0));
});
test('local receipt SHA deterministic',()=>assert.equal(locallyCheckWhole144(p()).receiptDigest,locallyCheckWhole144(p()).receiptDigest));
test('local coverage check denies tampered program',()=>hasHold(locallyCheckWhole144({...p(),candidateCount:0}),'PROGRAM_TAMPERED_OR_STALE'));
test('existing work-burst adapter uses 12 bounded batches rather than a second scheduler',()=>{
  const r=prepareWhole144WorkBursts(p());assert.equal(r.status,'PREPARED_LOCAL_ONLY');
  assert.equal(r.batches.length,12);assert.ok(r.batches.every(x=>x.length===12));
  assert.equal(r.batches.flat().length,144);
  assert.ok(r.batches.flat().every(t=>t.operator==='LOCAL_VERIFY_HSN_CANDIDATE'&&t.mode==='WORK'));
  assert.equal(r.externalEffects,'NOT_AUTHORIZED');
});
test('work-burst tasks have unique ids and no private content',()=>{
  const r=prepareWhole144WorkBursts(p());const tasks=r.batches.flat();
  assert.equal(new Set(tasks.map(t=>t.id)).size,144);
  assert.doesNotMatch(JSON.stringify(r),/privateBody|PalaceHistory|dreamTranscript/i);
});
test('individual synthetic Work-burst operator verifies only source-structural topology',()=>{
  const task=prepareWhole144WorkBursts(p()).batches[11][0];
  assert.deepEqual(checkWhole144BurstItem(p(),task.input),{status:'PASS_LOCAL',resultTag:'STRUCTURE',checks:12});
});
test('operator denies cross-coordinate swap',()=>{
  const i=prepareWhole144WorkBursts(p()).batches[0][0].input;
  assert.equal(checkWhole144BurstItem(p(),{...i,position:'H02.S01'}).status,'HOLD_LOCAL');
});
test('operator denies a forged plan digest',()=>{
  const i=prepareWhole144WorkBursts(p()).batches[0][0].input;
  assert.equal(checkWhole144BurstItem(p(),{...i,programDigest:'f'.repeat(64)}).status,'HOLD_LOCAL');
});
test('operator denies extra auth field',()=>{
  const i=prepareWhole144WorkBursts(p()).batches[0][0].input;
  assert.equal(checkWhole144BurstItem(p(),{...i,hostAuthority:true}).status,'HOLD_LOCAL');
});
test('node-specific Work evidence gets review-only status',()=>{
  const r=proposeNodeEvidence(p(),example());assert.equal(r.status,'SOURCE_AND_TEST_CANDIDATE_REVIEW_REQUIRED');
  assert.equal(r.verifiedGain,false);assert.equal(r.hostRights,'NOT_ATTESTED');
  assert.equal(r.independentReview,'NOT_PERFORMED');
});
test('node proposal rejects out-of-position matching and wrong ID',()=>{
  hasHold(proposeNodeEvidence(p(),{...example(),nodeCoordinate:'H11.S01.N05'}),'CROSS_POSITION_NODE_MISMATCH');
  hasHold(proposeNodeEvidence(p(),{...example(),candidateId:'W144-H02-S01'}),'CROSS_POSITION_NODE_MISMATCH');
});
test('node evidence rejects private modes and source bodies',()=>{
  hasHold(proposeNodeEvidence(p(),{...example(),mode:'DREAM'}),'PRIVATE_OR_NONWORK_SOURCE_DENIED');
  hasHold(proposeNodeEvidence(p(),{...example(),privateContext:'secret'}),'EVIDENCE_SHAPE_OR_PRIVATE_FIELD_INVALID');
});
test('node proposal rejects missing refs and false test digest',()=>{
  hasHold(proposeNodeEvidence(p(),{...example(),sourceRefs:[]}), 'EVIDENCE_INVALID');
  hasHold(proposeNodeEvidence(p(),{...example(),testDigest:'fail'}), 'EVIDENCE_INVALID');
});
test('dissent permitted but does not promote authority',()=>{
  const r=proposeNodeEvidence(p(),{...example(),dissentRefs:['https://example.invalid/dissent']});
  assert.equal(r.dissentRefs.length,1);assert.equal(r.authorityEffect,'NONE');assert.equal(r.canPublish,false);
});
test('prevents host-rights and welfare-score injection',()=>{
  for(const key of ['hostRights','residentAuthenticated','canPublish','welfareScore','rawSourceBody'])
    hasHold(proposeNodeEvidence(p(),{...example(),[key]:true}),'EVIDENCE_SHAPE_OR_PRIVATE_FIELD_INVALID');
});
test('a local evidence receipt is reproducibly digest-addressed',()=>{
  const a=proposeNodeEvidence(p(),example());const b=proposeNodeEvidence(p(),example());
  assert.equal(a.evidenceDigest,b.evidenceDigest);
});
test('all 144 synthetic operator inputs can be checked without external effects',()=>{
  const base=p(),all=prepareWhole144WorkBursts(base).batches.flat();
  const passed=all.map(t=>checkWhole144BurstItem(base,t.input));
  assert.equal(passed.length,144);
  assert.ok(passed.every(x=>x.status==='PASS_LOCAL'));
  assert.equal(passed.reduce((sum,x)=>sum+x.checks,0),1728);
});
