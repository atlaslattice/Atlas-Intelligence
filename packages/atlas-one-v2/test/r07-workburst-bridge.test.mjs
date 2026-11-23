import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectR07Source,previewEntireR07,R07_EDITION,R07_REGISTRY_SHA} from '../src/r07-workburst-bridge.mjs';
import {knownRoutes} from '../generated/generated-node-routes.mjs';
import {executeLocalWorkBurst} from '../src/work-burst.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const coord=i=>`H${String(Math.floor(i/144)+1).padStart(2,'0')}.S${String(Math.floor(i%144/12)+1).padStart(2,'0')}.N${String(i%12+1).padStart(2,'0')}`;
const sentinel='PRIVATE_SENTINEL_DO_NOT_COPY_R07';
function fixture(){
  return Array.from({length:1728},(_,i)=>{
    const coordinate=coord(i),h=Number(coordinate.slice(1,3)),s=Number(coordinate.slice(5,7));
    // Forty protected-mode spheres, but no material from those modes.
    const protectedMode=(s>=10 || (h<=4 && s===8));
    const mode=protectedMode?['PLAY','SOCIAL','IMAGINE','DREAM','QUIET'][h%5]:'WORK';
    return {macroturnOpportunity:i+1,coordinate,house:`H${String(h).padStart(2,'0')}`,
      houseName:`Synthetic House ${h}`,sphere:`H${String(h).padStart(2,'0')}.S${String(s).padStart(2,'0')}`,
      sphereName:`Synthetic sphere ${h}-${s}`,nodeName:`${sentinel} node ${i}`,
      sourceRole:s<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META',
      sourceDigest:sha(Buffer.from('synthetic-node-digest:'+coordinate)),
      sourceEdition:R07_EDITION,registrySha256:R07_REGISTRY_SHA,
      sourceInitiative:`N144-${String(h).padStart(2,'0')}-${String(s).padStart(2,'0')}`,
      initiative:`${sentinel} initiative`,sourceExperiment:'synthetic experiment',
      sourceFalsifier:'synthetic falsifier',suggestedMode:mode,
      softwareModuleCandidate:'99 synthetic',researchQuestion:'synthetic question',
      candidateBuild:'synthetic build',acceptanceCandidate:'synthetic candidate',
      swarmchatUpdate:'synthetic work source only',atlasUpdate:'synthetic local review',
      ariadneUpdate:'synthetic source pin',status:'PLANNED_NOT_EXECUTED',
      completedMacroturns:0,actualEvidenceRefs:[],residentAssigned:false,hostValidated:false,
      semanticLinkAccepted:false,humanWelfareMeasured:false,canonEffect:'NONE',
      rightsGate:'CURRENT_READ_AND_RETURN_CONSENT_REQUIRED',
      nextFalsifier:'synthetic falsifier',sourceReference:'OWNER_PRIVATE_SOURCE_POINTER_NOT_PUBLISHED'};
  });
}
const original=fixture(),bytes=Buffer.from(JSON.stringify(original)),digest=sha(bytes);
const inspect=(data=original)=>{const dataBytes=Buffer.from(JSON.stringify(data));return inspectR07Source(dataBytes,sha(dataBytes));};
const mutation=(i,key,value)=>{const x=structuredClone(original);x[i][key]=value;return x};

// We do not commit the real 3.8 MB owner-private R07 plan to the repository.
test('all 1728 synthetic coordinate identities stay separate, including repeated labels',()=>{
  const d=inspect();assert.equal(d.status,'LOCAL_SOURCE_SHAPE_VERIFIED_NOT_AUTHORIZED');
  assert.equal(d.summary.totalPlanned,1728);assert.equal(d.summary.houses,12);
  assert.equal(d.summary.spheres,144);assert.equal(d.summary.domainNodes,1008);
  assert.equal(d.summary.epistemicNodes,720);assert.equal(d.summary.workEligible,1248);
  assert.equal(d.summary.protectedModeOpportunities,480);
  assert.equal(d.summary.implementedR07Tasks,0);
});
test('source digest changes refuse to admit the plan',()=>{
  assert.equal(inspectR07Source(bytes,'f'.repeat(64)).status,'HOLD_SOURCE_INPUT');
  assert.equal(inspectR07Source(Buffer.concat([bytes,Buffer.from(' ')]),digest).status,'HOLD_SOURCE_INPUT');
});
test('non-bytes and invalid digest variants fail closed',()=>{
  for(const v of [null,{},[],12,true,new Promise(()=>{})]){
    assert.equal(inspectR07Source(v,digest).status,'HOLD_SOURCE_INPUT');
  }
  for(const v of [null,{},'X'.repeat(64),11]){
    assert.equal(inspectR07Source(bytes,v).status,'HOLD_SOURCE_INPUT');
  }
});
test('invalid UTF8 and invalid JSON are held',()=>{
  const invalid=Buffer.from([0x7b,0x22,0x61,0x22,0x3a,0xff,0x7d]);
  assert.equal(inspectR07Source(invalid,sha(invalid)).status,'HOLD_SOURCE_INPUT');
  assert.equal(inspectR07Source(Buffer.alloc(0),sha(Buffer.alloc(0))).status,'HOLD_SOURCE_INPUT');
  const invalidLong=Buffer.alloc(9_000_000);assert.equal(inspectR07Source(invalidLong,sha(invalidLong)).status,'HOLD_SOURCE_INPUT');
});
test('wrong census refuses promotion',()=>{
  assert.equal(inspect(original.slice(0,-1)).status,'HOLD_SOURCE_INPUT');
  assert.equal(inspect([...original,original[0]]).status,'HOLD_SOURCE_INPUT');
});
test('positionally duplicated labels never collapse coordinate identity',()=>{
  const d=inspect();const p=d.workPage(0,96);
  assert.equal(p.status,'PREPARED_WORK_ONLY');
  assert.equal(new Set(p.tasks.map(x=>x.id)).size,96);
  assert.deepEqual(p.tasks.slice(0,3).map(x=>x.input.coordinate),original.slice(0,3).map(x=>x.coordinate));
  assert.equal(p.tasks[0].input.sourceDigest,original[0].sourceDigest);
});
test('real R07 private description is never serialized to returned receipt',async()=>{
  const d=inspect();const page=d.workPage(0,96);const p=await d.previewWorkPage(0,96);
  assert.doesNotMatch(JSON.stringify({summary:d.summary,page,preview:p}),new RegExp(sentinel));
  assert.equal(p.completedMacroturns,0);assert.equal(p.authorityEffect,'NONE');
});
test('Work page contains exactly 96 Work-mode source pins and no protected records',()=>{
  const d=inspect(),page=d.workPage(10,96);
  assert.equal(page.tasks.length,96);
  assert.ok(page.tasks.every(x=>x.mode==='WORK'&&x.operator==='LOCAL_R07_PIN'&&x.noHarvest===false));
});
test('page ranges have no off-by-one and remain capped by parent Work Burst',()=>{
  const d=inspect();
  for(const [offset,size] of [[-1,2],[0,0],[0,97],[1.3,96],[1249,1]]){
    assert.equal(d.workPage(offset,size).status,'HOLD_SOURCE_INPUT');
  }
  assert.equal(d.workPage(1248,96).tasks.length,0);
  assert.equal(d.workPage(1247,96).tasks.length,1);
  assert.equal(d.workPage(1247,96).exhausted,true);
});
test('preflight is purely local and cannot increment completed Work',async()=>{
 const d=inspect(),page=await d.previewWorkPage(0,96);
 assert.equal(page.status,'LOCAL_SOURCE_PINS_ONLY');assert.equal(page.count,96);
 assert.match(page.receiptDigest,/^[0-9a-f]{64}$/);assert.equal(page.completedMacroturns,0);
 assert.equal(page.actualBrokerPosts,0);assert.equal(page.modelTurns,0);assert.equal(page.hostVerified,false);
});
test('full Work Burst pass does 13 strictly bounded offline batches',async()=>{
 const r=await previewEntireR07(bytes,digest);
 assert.equal(r.status,'LOCAL_R07_SOURCE_PREFLIGHT_ONLY');
 assert.equal(r.preflightChecks,1248);assert.equal(r.workBurstInvocations,13);
 assert.equal(r.pages.length,13);assert.ok(r.pages.every(p=>p.count===96));
 assert.equal(r.actualImplementedTasks,0);assert.equal(r.actualR07Macroturns,0);
 assert.equal(r.privateBodyCopies,0);assert.equal(r.workPosts,0);assert.equal(r.modelWakes,0);
 assert.match(r.preflightReceiptDigest,/^[a-f0-9]{64}$/);
});
test('repeated full preflight gives exactly the same digest',async()=>{
 const x=await previewEntireR07(bytes,digest),y=await previewEntireR07(bytes,digest);
 assert.equal(x.preflightReceiptDigest,y.preflightReceiptDigest);
});
test('route existence is synthetic coverage and never R07 implementation',()=>{
 const d=inspect(),routes=new Set(knownRoutes());
 assert.equal(routes.size,1100);assert.equal(d.summary.syntheticCodeRoutesRegistered,1100);
 assert.equal(d.summary.sourceRouteEditionCompatible,0);
 const p=d.workPage(0,96);assert.equal(p.tasks[0].input.syntheticCodeRoutePresent,routes.has(coord(0)));
 assert.equal(d.summary.implementedR07Tasks,0);
});
test('wrong role across the S07/S08 boundary holds despite unchanged totals',()=>{
 assert.equal(inspect(mutation(7,'sourceRole','EPISTEMIC_META')).status,'HOLD_SOURCE_INPUT');
 assert.equal(inspect(mutation(84,'sourceRole','DOMAIN_SPECIALIZATION')).status,'HOLD_SOURCE_INPUT');
});
test('source record order is part of the exact Work provenance',()=>{
 const a=structuredClone(original);[a[0],a[1]]=[a[1],a[0]];
 assert.equal(inspect(a).status,'HOLD_SOURCE_INPUT');
});
test('source initiative mismatch is never mapped positionally to NEXT1728',()=>{
 assert.equal(inspect(mutation(0,'sourceInitiative','N144-12-12')).status,'HOLD_SOURCE_INPUT');
});
test('wrong edition, digest, role or house cannot launder source identity',()=>{
 const fields=[['sourceEdition','v0.8'],['registrySha256','f'.repeat(64)],['sourceDigest','bad'],['house','H12'],['sphere','H12.S12']];
 for(const [key,value] of fields){assert.equal(inspect(mutation(0,key,value)).status,'HOLD_SOURCE_INPUT',key);}
});
test('unsupported modes and unverified status never become Work tasks',()=>{
 for(const [key,value] of [['suggestedMode','HABITAT'],['suggestedMode',true],['status','TESTED'],['completedMacroturns',1]]){
  assert.equal(inspect(mutation(0,key,value)).status,'HOLD_SOURCE_INPUT',key);
 }
});
test('host/authority/semantic claims in R07 records are held',()=>{
 for(const [key,value] of [['residentAssigned',true],['hostValidated',true],['semanticLinkAccepted',true],['humanWelfareMeasured',true],['canonEffect','RATIFIED']]){
  assert.equal(inspect(mutation(0,key,value)).status,'HOLD_SOURCE_INPUT',key);
 }
});
test('existing evidence refs cannot masquerade as planned-source metadata',()=>{
 assert.equal(inspect(mutation(0,'actualEvidenceRefs',['https://example.com/receipt'])).status,'HOLD_SOURCE_INPUT');
});
test('unknown fields, private mode bodies or missing fields fail before projection',()=>{
 const x=structuredClone(original);x[0].rawPalaceBody='private';
 assert.equal(inspect(x).status,'HOLD_SOURCE_INPUT');
 const y=structuredClone(original);delete y[0].nodeName;
 assert.equal(inspect(y).status,'HOLD_SOURCE_INPUT');
});
test('protected source-markers and revised rights gates are not admitted',()=>{
 for(const [key,value] of [['sourceReference','https://private.invalid'],['rightsGate','ALREADY_CONSENTED']]){
  assert.equal(inspect(mutation(0,key,value)).status,'HOLD_SOURCE_INPUT',key);
 }
});
test('source names cannot change within an original House or Sphere',()=>{
 assert.equal(inspect(mutation(1,'houseName','incorrect house')).status,'HOLD_SOURCE_INPUT');
 assert.equal(inspect(mutation(1,'sphereName','incorrect sphere')).status,'HOLD_SOURCE_INPUT');
});
test('Work/source digest matched to original coordinate, not computed synthetic labels',()=>{
 const d=inspect(),page=d.workPage(0,2);
 assert.notEqual(page.tasks[0].input.sourceDigest,page.tasks[1].input.sourceDigest);
 assert.equal(page.tasks[0].input.sourceEdition,R07_EDITION);
});
test('frozen legacy synthetic routes cannot be passed off as exact Ariadne source pins',()=>{
 const d=inspect();assert.equal(d.summary.sourceRouteEditionCompatible,0);
 assert.ok(d.summary.syntheticRoutesOnProtectedCandidates>0);
 assert.ok(d.summary.syntheticRoutesOnWorkCandidates>0);
});
test('work bursts reject private tasks even when caller bypasses bridge',async()=>{
 const x=await executeLocalWorkBurst({tasks:[{id:'r07private',operator:'LOCAL_R07_PIN',mode:'PALACE',input:{}}],
   operators:{LOCAL_R07_PIN:()=>({status:'PASS_LOCAL'})}});
 assert.equal(x.status,'HOLD_PLAN');
});
test('invalid raw object getters cannot execute through JSON shape gate',()=>{
 const trap={get foo(){throw Error('SECRET_DO_NOT_ECHO');}};
 const r=inspectR07Source(trap,digest);
 assert.equal(r.status,'HOLD_SOURCE_INPUT');assert.doesNotMatch(JSON.stringify(r),/SECRET/);
});
test('self asserted absolute authority never appears in output',()=>{
 const d=inspect();const text=JSON.stringify(d.summary);
 for(const forbidden of ['"canPublish":true','"hostVerified":true','"implementedR07Tasks":1248'])assert.equal(text.includes(forbidden),false);
});
test('future implementation evidence can be staged but never self-validated',()=>{
 const d=inspect(),row=original[0];
 const x=d.prepareImplementationReceipt({coordinate:row.coordinate,sourceDigest:row.sourceDigest,
   planSha256:digest,mode:'WORK',repo:'atlaslattice/Atlas-Intelligence',
   commitSha:'a'.repeat(40),testsPassed:58,claimedStage:'DRAFT_COMMIT_CLAIM'});
 assert.equal(x.status,'EVIDENCE_RECEIPT_CANDIDATE_NOT_VERIFIED');
 assert.equal(x.originalR07Status,'PLANNED_NOT_EXECUTED');
 assert.equal(x.implemented,false);assert.equal(x.hostVerified,false);
 assert.match(x.receiptFingerprint,/^[0-9a-f]{64}$/);
 assert.doesNotMatch(JSON.stringify(x),new RegExp(sentinel));
});
test('future receipt cannot convert protected mode into Work',()=>{
 const d=inspect(),row=original.find(x=>x.suggestedMode!=='WORK');
 const x=d.prepareImplementationReceipt({coordinate:row.coordinate,sourceDigest:row.sourceDigest,
   planSha256:digest,mode:'WORK',repo:'atlaslattice/Atlas-Intelligence',
   commitSha:'a'.repeat(40),testsPassed:58,claimedStage:'DRAFT_COMMIT_CLAIM'});
 assert.equal(x.status,'HOLD_SOURCE_INPUT');
});
test('forged source digests, repository scope and privileges are rejected',()=>{
 const d=inspect(),row=original[0];
 const good={coordinate:row.coordinate,sourceDigest:row.sourceDigest,planSha256:digest,mode:'WORK',
   repo:'atlaslattice/Atlas-Intelligence',commitSha:'a'.repeat(40),testsPassed:58,
   claimedStage:'DRAFT_COMMIT_CLAIM'};
 const variants=[{...good,sourceDigest:'f'.repeat(64)},
   {...good,planSha256:'f'.repeat(64)},
   {...good,repo:'outsider/Other'},
   {...good,commitSha:'a'},
   {...good,claimedStage:'HOSTED_VERIFIED'},
   {...good,hostAttested:true},
   {...good,mode:'PALACE'},
   {...good,testsPassed:Infinity},
   {...good,testsPassed:-1}];
 for(const v of variants)assert.equal(d.prepareImplementationReceipt(v).status,'HOLD_SOURCE_INPUT');
});
test('receipt getter cannot run and change trusted source',()=>{
 const d=inspect(),row=original[0];let reads=0;
 const v={coordinate:row.coordinate,sourceDigest:row.sourceDigest,planSha256:digest,mode:'WORK',
   repo:'atlaslattice/Atlas-Intelligence',commitSha:'a'.repeat(40),testsPassed:58,
   get claimedStage(){reads++;throw Error('getter ran');}};
 assert.equal(d.prepareImplementationReceipt(v).status,'HOLD_SOURCE_INPUT');
 assert.equal(reads,0);
});
test('preview implementation is closed over the exact source, not caller this',async()=>{
 const d=inspect();let called=0;
 const fake={workPage(){called++;return {status:'PREPARED_WORK_ONLY',tasks:[]}}};
 const r=await d.previewWorkPage.call(fake,0,96);
 assert.equal(called,0);assert.equal(r.count,96);
});
test('an unpaired Unicode surrogate is quarantined in source material',()=>{
 assert.equal(inspect(mutation(0,'nodeName','\ud800')).status,'HOLD_SOURCE_INPUT');
 assert.equal(inspect(mutation(0,'nodeName','\udc00')).status,'HOLD_SOURCE_INPUT');
});
