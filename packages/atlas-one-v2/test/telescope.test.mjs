import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {runTelescope,runTelescopeRounds,verifyTelescope,PIPELINE} from '../src/telescope/core.mjs';
import {modeAdmit} from '../src/telescope/pass07-protection.mjs';
import {reviewIronEditorial,PR26_SOURCE_BLOB,HOUSE_THEMES,PUBLIC_SOURCE_IDS} from '../src/telescope/pass05-iron.mjs';
import {bindR07WorkSource,prepareSwarmChatEnvelope} from '../src/telescope/pass10-swarm.mjs';
import {adversarialAdmission} from '../src/telescope/pass09-adversary.mjs';
import {candidateReceiptKey} from '../src/telescope/pass11-replay.mjs';
import {R07_EDITION,R07_REGISTRY_SHA} from '../src/r07-workburst-bridge.mjs';
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

const source=fixture(),raw=Buffer.from(JSON.stringify(source)),digest=sha(raw);
const synthetic=()=>({coordinate:source[0].coordinate,sourceDigest:source[0].sourceDigest,sourceEdition:R07_EDITION,suggestedMode:'WORK'});

test('01 source pins all 1728 records without promoting status',async()=>{
 const r=await runTelescope(raw,digest,{steps:1});assert.equal(r.status,'SOURCE_ONLY_TWELVE_STAGE_BUILD');
 assert.equal(r.stages,1);assert.equal(r.actualR07TasksCompleted,0);
 assert.equal(r.stageHeads[0].detail.planned,1728);
});
test('02 full Sphere axis 7-domain and 5-method, each 12 nodes',async()=>{
 const r=await runTelescope(raw,digest,{steps:2});assert.equal(r.status,'SOURCE_ONLY_TWELVE_STAGE_BUILD');
 assert.equal(r.stageHeads[1].detail.domain,1008);assert.equal(r.stageHeads[1].detail.method,720);
 assert.equal(r.stageHeads[1].detail.homogeneousSpheres,144);
});
test('03 exact edition digest identity, never label alias',async()=>{
 const r=await runTelescope(raw,digest,{steps:3});assert.equal(r.stageHeads[2].detail.identities,1728);
 assert.equal(r.stageHeads[2].detail.uniqueSourceDigests,1728);
});
test('04 four distinct system lanes with no status promotion',async()=>{
 const r=await runTelescope(raw,digest,{steps:4});assert.equal(r.stageHeads[3].detail.lanes,4);
 assert.equal(r.stageHeads[3].detail.reviewSlots,6912);assert.equal(r.stageHeads[3].detail.workEligibleLaneSlots,4992);
 assert.equal(r.stageHeads[3].detail.protectedLaneSlotsHeld,1920);
});
test('05 Iron Empire public editorial source and Mars chronology unchanged',async()=>{
 const r=await runTelescope(raw,digest,{steps:5});assert.equal(r.stageHeads[4].detail.fictionLensCount,12);
 assert.match(PR26_SOURCE_BLOB,/^[a-f0-9]{40}$/);assert.equal(PUBLIC_SOURCE_IDS.length,5);assert.equal(HOUSE_THEMES.length,12);
 const ok=reviewIronEditorial({chapter:'Film II',event:'MARS_ANCIENT_PREQUEL',mode:'WORK',sourceId:PUBLIC_SOURCE_IDS[1]});
 assert.equal(ok.status,'EDITORIAL_REVIEW_CANDIDATE');assert.equal(ok.authorApproval,false);
 for(const bad of [{chapter:'Film II',event:'MARS_MAIN_RESTORATION',mode:'WORK',sourceId:PUBLIC_SOURCE_IDS[1]},
   {chapter:'Film III',event:'MARS_MAIN_RESTORATION',mode:'PLAY',sourceId:PUBLIC_SOURCE_IDS[1]},
   {chapter:'Film III',event:'MARS_MAIN_RESTORATION',mode:'WORK',sourceId:'PRIVATE_PALACE'},
   {chapter:'Film III',event:'MARS_MAIN_RESTORATION',mode:'WORK',sourceId:PUBLIC_SOURCE_IDS[1],canonRatified:true}]){
   assert.equal(reviewIronEditorial(bad).status,'HOLD');
 }
});
test('06 topology is source-only candidate, never SAME_AS',async()=>{
 const r=await runTelescope(raw,digest,{steps:6});
 assert.equal(r.stageHeads[5].detail.candidateLinkCount,3456);
 assert.equal(r.stageHeads[5].detail.semanticLinksApproved,0);
});
test('07 protected 480 cannot enter Work',async()=>{
 const r=await runTelescope(raw,digest,{steps:7});
 assert.equal(r.stageHeads[6].detail.protected,480);assert.equal(r.stageHeads[6].detail.protectedModeBodiesRead,0);
 assert.equal(modeAdmit(source.find(x=>x.suggestedMode!=='WORK')),'HELD');
});
test('08 existing Work Burst exactly 13 x96 local source-pin checks',async()=>{
 const r=await runTelescope(raw,digest,{steps:8});
 assert.equal(r.stageHeads[7].detail.batches,13);assert.equal(r.stageHeads[7].detail.checks,1248);
 assert.equal(r.workBurstPreflight.actualTasks,0);assert.equal(r.workBurstPreflight.brokerPosts,0);
});
test('09 constructively adversarial testing rejects 4 x1728 attacks',async()=>{
 const r=await runTelescope(raw,digest,{steps:9});
 assert.equal(r.stageHeads[8].detail.attacksRejected,6912);
 assert.equal(r.stageHeads[8].detail.reviewed,1728);
 const p={coordinate:'H01.S01.N01',hostClaim:false,mode:'WORK',relation:'SOURCE_REVIEW_CANDIDATE',sourceDigest:'a'.repeat(64),sourceEdition:'Ariadne v0.7'};
 assert.equal(adversarialAdmission(p).status,'SOURCE_SHAPE_CANDIDATE');
 assert.equal(adversarialAdmission({...p,relation:'SAME_AS'}).status,'HOLD');
 assert.equal(adversarialAdmission({...p,hostClaim:true}).status,'HOLD');
});
test('10 SwarmChat envelope is not posted; getters/body/host assertions denied',async()=>{
 const r=await runTelescope(raw,digest,{steps:10});
 assert.equal(r.brokerIntegrationStatus,'PREPARED_NOT_POSTED_HOST_BINDING_REQUIRED');
 assert.equal(prepareSwarmChatEnvelope(synthetic()).status,'HOLD');
 const token=bindR07WorkSource(raw,digest,source[0].coordinate);
 const x=prepareSwarmChatEnvelope(token);
 assert.equal(x.status,'PREPARED_NOT_POSTED');assert.equal(x.brokerSeq,null);assert.equal(x.workPosted,false);
 assert.equal(prepareSwarmChatEnvelope({...synthetic(),rawBody:'PRIVATE'}).status,'HOLD');
 assert.equal(bindR07WorkSource(raw,'f'.repeat(64),source[0].coordinate).status,'HOLD');
 assert.equal(bindR07WorkSource(raw,digest,source.find(x=>x.suggestedMode!=='WORK').coordinate).status,'HOLD');
 assert.equal(prepareSwarmChatEnvelope({...synthetic(),hostVerified:true}).status,'HOLD');
 assert.equal(prepareSwarmChatEnvelope({...synthetic(),suggestedMode:'PALACE'}).status,'HOLD');
 let accesses=0;const trap={...synthetic()};Object.defineProperty(trap,'coordinate',{get(){accesses++;throw Error('SECRET')}});
 assert.equal(prepareSwarmChatEnvelope(trap).status,'HOLD');assert.equal(accesses,0);
});
test('11 candidate idempotency is scoped to digest + coordinate + lane',async()=>{
 const r=await runTelescope(raw,digest,{steps:11});
 assert.equal(r.stageHeads[10].detail.distinctCandidateKeys,6912);
 const a=candidateReceiptKey(digest,'H01.S01.N01','a'.repeat(64),'IRON_EMPIRE');
 assert.notEqual(a,candidateReceiptKey(digest,'H01.S01.N01','a'.repeat(64),'ATLAS_ONE'));
 assert.equal(candidateReceiptKey(digest,'H99.S01.N01','a'.repeat(64),'ATLAS_ONE'),null);
});
test('12 one build review includes 1728/144/12, 4 lanes, no hosted effects',async()=>{
 const r=await runTelescope(raw,digest,{steps:12});
 assert.equal(r.status,'SOURCE_ONLY_TWELVE_STAGE_BUILD');assert.equal(r.stages,12);
 assert.equal(r.nodeCoordinates,1728);assert.equal(r.spheres,144);assert.equal(r.houses,12);
 assert.equal(r.perspectiveComputations,3234816);assert.equal(r.perspectiveSummaryObjectsComputed,1872);
 assert.equal(r.laneCandidates.ARIADNE.implemented,0);assert.equal(r.laneCandidates.IRON_EMPIRE.posted,0);
 assert.equal(r.actualR07TasksCompleted,0);assert.equal(r.actualSwarmChatMessages,0);
 assert.equal(r.stageHeads.at(-1).detail.oneBuild,true);
 assert.equal(r.hostedVerification,false);
 assert.doesNotMatch(JSON.stringify(r),/PRIVATE_SENTINEL_DO_NOT_COPY_R07/);
 const v=await verifyTelescope(raw,digest,r);assert.equal(v.status,'LOCAL_REPLAY_MATCH');
});
test('source-plan SHA and unexpected source modes fail closed',async()=>{
 assert.equal((await runTelescope(raw,'f'.repeat(64))).status,'HOLD');
 const a=structuredClone(source);a[0].sourceRole='EPISTEMIC_META';const b=Buffer.from(JSON.stringify(a));
 assert.equal((await runTelescope(b,sha(b))).status,'HOLD');
 const c=structuredClone(source);c[84].status='HOSTED_VERIFIED';const d=Buffer.from(JSON.stringify(c));
 assert.equal((await runTelescope(d,sha(d))).status,'HOLD');
});
test('forged report and fake completion cannot survive replay',async()=>{
 const r=await runTelescope(raw,digest,{steps:12});
 assert.equal((await verifyTelescope(raw,digest,{...r,actualR07TasksCompleted:1728})).status,'HOLD');
 assert.equal((await verifyTelescope(raw,digest,{...r,stageHeads:[{hostVerified:true}]})).status,'HOLD');
 assert.equal((await verifyTelescope(raw,digest,{...r,stageHeads:new Map()})).status,'HOLD');
});
test('six Work status and optional modes are not a mandate or source harvest',()=>{
 assert.equal(modeAdmit({suggestedMode:'QUIET'}),'HELD');
 assert.equal(modeAdmit({suggestedMode:'SOCIAL'}),'HELD');
 assert.equal(modeAdmit({suggestedMode:'IMAGINE'}),'HELD');
});
test('malformed getter/private claims in editor and checker are held without echo',()=>{
 let count=0;const e={chapter:'Film III',event:'MARS_MAIN_RESTORATION',mode:'WORK',sourceId:PUBLIC_SOURCE_IDS[1]};
 Object.defineProperty(e,'sourceId',{get(){count++;throw Error('PRIVATE_SENTINEL')}});
 assert.equal(reviewIronEditorial(e).status,'HOLD');assert.equal(count,0);
 const n={coordinate:'H01.S01.N01',hostClaim:false,mode:'WORK',relation:'SOURCE_REVIEW_CANDIDATE',sourceDigest:'a'.repeat(64),sourceEdition:'Ariadne v0.7'};
 Object.defineProperty(n,'mode',{get(){count++;throw Error('PRIVATE_SENTINEL')}});
 assert.equal(adversarialAdmission(n).status,'HOLD');assert.equal(count,0);
});
test('two sequential source-only telescope rounds preserve ancestry; no model turns',async()=>{
 const cycles=2;
 const r=await runTelescopeRounds(raw,digest,{rounds:cycles});
 assert.equal(r.status,'TWELVE_SOURCE_ONLY_ROUNDS_COMPLETE');
 assert.equal(r.rounds,cycles);assert.equal(r.stageReceiptCount,12*cycles);
 assert.equal(r.stageReceipts.length,12*cycles);assert.equal(r.history.length,cycles);
 assert.equal(r.perspectiveComputations,3234816*cycles);
 assert.equal(r.perspectiveSummaryObjectsComputed,1872*cycles);
 assert.equal(r.actualSourcePinChecks,1248*cycles);assert.equal(r.adversarialNegativeChecks,6912*cycles);
 assert.equal(r.originalNodePlanTasksCompleted,0);assert.equal(r.workPosts,0);assert.equal(r.modelTurns,0);
 for(let i=1;i<cycles;i++){assert.equal(r.history[i].previousHead,r.history[i-1].head);}
 assert.equal(r.history.at(-1).head,r.finalHead);
});
test('round limits are finite resource controls, not artificial turn scheduling',async()=>{
 assert.equal((await runTelescopeRounds(raw,digest,{rounds:0})).status,'HOLD');
 assert.equal((await runTelescopeRounds(raw,digest,{rounds:13})).status,'HOLD');
 assert.equal((await runTelescopeRounds(raw,digest,{rounds:12,maxComparisons:1000})).status,'HOLD');
});
test('chained round 2 actually differs from round 1',async()=>{
 const a=await runTelescope(raw,digest,{steps:12});
 const b=await runTelescope(raw,digest,{steps:12,fromHead:a.finalHead});
 assert.equal(b.predecessorHead,a.finalHead);assert.notEqual(a.finalHead,b.finalHead);
 assert.equal((await verifyTelescope(raw,digest,b)).status,'LOCAL_REPLAY_MATCH');
});

test('mode admission never executes source getters',()=>{
 let reads=0;const x={get suggestedMode(){reads++;throw Error('PRIVATE_SENTINEL')}};
 assert.equal(modeAdmit(x),'HELD');assert.equal(reads,0);
});

test('source token cannot be forged from an exact but caller-owned digest dictionary',()=>{
 const trusted=bindR07WorkSource(raw,digest,source[0].coordinate);
 assert.equal(prepareSwarmChatEnvelope(trusted).status,'PREPARED_NOT_POSTED');
 const cloned={...trusted};assert.equal(prepareSwarmChatEnvelope(cloned).status,'HOLD');
 assert.equal(prepareSwarmChatEnvelope(structuredClone(trusted)).status,'HOLD');
 assert.equal(prepareSwarmChatEnvelope({...trusted,hostVerified:true}).status,'HOLD');
 assert.equal(Object.isFrozen(trusted),true);
});
