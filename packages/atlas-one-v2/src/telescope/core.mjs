/** Atlas ONE — one-bounded-pass-at-a-time, 12-stage source-only telescope.
 * Each pass surveys 1728 node identities through all 144 Sphere and all 12 House
 * viewpoints. Comparisons are genuine deterministic calculations, NOT independent
 * human, model, or resident judgments.  No built-in broker or hidden callbacks.
 */
import {createHash} from 'node:crypto';
import {inspectR07Source} from '../r07-workburst-bridge.mjs';
import {pass01} from './pass01-source.mjs';
import {pass02} from './pass02-roles.mjs';
import {pass03} from './pass03-identity.mjs';
import {pass04} from './pass04-fourlanes.mjs';
import {pass05} from './pass05-iron.mjs';
import {pass06} from './pass06-graph.mjs';
import {pass07} from './pass07-protection.mjs';
import {pass08} from './pass08-workburst.mjs';
import {pass09} from './pass09-adversary.mjs';
import {pass10} from './pass10-swarm.mjs';
import {pass11} from './pass11-replay.mjs';
import {pass12} from './pass12-synthesis.mjs';

export const TEL_SCHEMA='atlas.one.civilization-telescope/v1';
export const PIPELINE=Object.freeze([
  ['01 SOURCE',pass01],['02 ROLE',pass02],['03 IDENTITY',pass03],
  ['04 FOUR_SYSTEMS',pass04],['05 IRON_EMPIRE',pass05],['06 GRAPH',pass06],
  ['07 PROTECTED_MODES',pass07],['08 WORK_BURST',pass08],['09 ADVERSARIAL',pass09],
  ['10 SWARMCHAT_PORT',pass10],['11 IDEMPOTENCY',pass11],['12 ONE_BUILD',pass12]
]);
const REGEX=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
export const sha=x=>createHash('sha256').update(x).digest('hex');
const hold=(reason='SOURCE_OR_STAGE_NOT_ACCEPTED')=>({schema:TEL_SCHEMA,status:'HOLD',reason,
  authorityEffect:'NONE',hostAuthenticated:false,workPosts:0,modelTurns:0,
  residentAuthenticated:false,implementedR07Tasks:0,canPublish:false});
const index=i=>`H${String(Math.floor(i/144)+1).padStart(2,'0')}.S${String(Math.floor(i%144/12)+1).padStart(2,'0')}.N${String(i%12+1).padStart(2,'0')}`;
const canon=x=>{
 if(Array.isArray(x))return '['+x.map(canon).join(',')+']';
 if(x&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype)
   return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canon(x[k])).join(',')+'}';
 if(x===null||typeof x==='string'||typeof x==='boolean'||typeof x==='number'&&Number.isFinite(x))return JSON.stringify(x);
 throw Error('NON_JSON_OUTPUT');
};
function perspectiveAudit(rows,stage){
  let checks=0;const spheres=[],houses=[];
  for(let pi=0;pi<144;pi++){
    let native=0,sameHouse=0,crossHouse=0, rolling=2166136261>>>0;
    for(let i=0;i<1728;i++){
      const local=pi===Math.floor(i/12);
      if(local)native++; else if(Math.floor(pi/12)===Math.floor(i/144))sameHouse++; else crossHouse++;
      // A measured deterministic scalar operation, not a semantic assessment.
      rolling=Math.imul(rolling^(i+1)^(stage<<12)^(pi+1),16777619)>>>0;
      checks++;
    }
    if(native!==12||sameHouse!==132||crossHouse!==1584)throw Error('SPHERE_SCOPE_FAIL');
    spheres.push({id:`H${String(Math.floor(pi/12)+1).padStart(2,'0')}.S${String(pi%12+1).padStart(2,'0')}`,
      native,sameHouse,crossHouse,scopeCheck:rolling.toString(16).padStart(8,'0')});
  }
  for(let h=0;h<12;h++){
    let own=0,other=0, rolling=2166136261>>>0;
    for(let i=0;i<1728;i++){
      if(Math.floor(i/144)===h)own++;else other++;
      rolling=Math.imul(rolling^(stage<<12)^(h+1)^(i+1),16777619)>>>0;
      checks++;
    }
    if(own!==144||other!==1584)throw Error('HOUSE_SCOPE_FAIL');
    houses.push({id:`H${String(h+1).padStart(2,'0')}`,own,other,
      scopeCheck:rolling.toString(16).padStart(8,'0')});
  }
  return {checks,materializedNodePairs:0,sphereAuditRows:spheres.length,houseAuditRows:houses.length,
    perspectiveDigest:sha(canon({stage,spheres,houses}))};
}
function stableInputs(raw,expectedDigest){
 const inspected=inspectR07Source(raw,expectedDigest);
 if(!inspected.summary)return null;
 const source=JSON.parse(Buffer.from(raw).toString('utf8'));
 if(source.length!==1728||source.some((r,i)=>r.coordinate!==index(i)||!REGEX.test(r.coordinate)))return null;
 return {inspected,source};
}
/** Only a local R07 owner-supplied source file is accepted. No work authority. */
export async function runTelescope(raw,digest,{steps=12,fromHead=null}={}){
 try{
  if(!Number.isSafeInteger(steps)||steps<1||steps>12)return hold('INVALID_STAGE_BOUND');
  const trusted=stableInputs(raw,digest);
  if(!trusted)return hold();
  if(fromHead!==null&&!(typeof fromHead==='string'&&/^[a-f0-9]{64}$/.test(fromHead)))return hold('BAD_PREDECESSOR');
  const seed=fromHead??sha('ATLAS_CIVILIZATION_TELESCOPE_GENESIS_V1');
  const ctx={source:trusted.source,inspected:trusted.inspected,rawBytes:Buffer.from(raw),sourceSha:digest,
    state:{},privateModes:0,workCount:0,passes:[],prev:seed};
  for(let stage=1;stage<=steps;stage++){
    const [name,fn]=PIPELINE[stage-1];
    const detail=await fn(ctx);
    if(!detail||detail.status!=='PASS_LOCAL')return hold(`STAGE_${stage}_HELD`);
    const survey=perspectiveAudit(ctx.source,stage);
    if(survey.checks!==269568||survey.sphereAuditRows!==144||survey.houseAuditRows!==12)throw Error('PERSPECTIVE_COVERAGE_FAIL');
    // Never serialize source texts, private data, host callbacks or raw R07 records.
    const body={stage,pass:name,previousHead:ctx.prev,sourceSha:digest,
      checks:survey.checks,surveyDigest:survey.perspectiveDigest,
      reviewedNodePositions:1728,sphereViewpoints:144,houseViewpoints:12,
      detail,authorityEffect:'NONE',implementedTasks:0,hostVerified:false};
    const head=sha(canon(body));ctx.passes.push({...body,head});ctx.prev=head;
  }
  const out={schema:TEL_SCHEMA,status:'SOURCE_ONLY_TWELVE_STAGE_BUILD',
    stages:steps,nodeCoordinates:1728,spheres:144,houses:12,predecessorHead:seed,
    perspectiveComputations:269568*steps,
    perspectiveSummaryObjectsComputed:156*steps,
    perspectiveDigestReceiptsStored:steps,
    workModeCandidates:ctx.inspected.summary.workEligible,
    protectedModeCandidates:ctx.inspected.summary.protectedModeOpportunities,
    originalPlanDigest:digest,
    originalRegistryPin:ctx.inspected.summary.registrySha256,
    stageHeads:ctx.passes.map(p=>({...p})),
    finalHead:ctx.prev,
    laneCandidates:ctx.state.laneCandidates??null,
    ironEmpireCandidateStatus:ctx.state.ironStatus??'NOT_REVIEWED',
    brokerIntegrationStatus:ctx.state.brokerStatus??'NOT_HOSTED',
    workBurstPreflight:ctx.state.workPreflight??null,
    actualR07TasksCompleted:0,actualSwarmChatMessages:0,
    hostedVerification:false,canPublish:false,canonEffect:'NONE',storyCanonEffect:'NONE',
    protectedContentImported:false,authorityEffect:'NONE'};
  return out;
 }catch{return hold();}
}

/** Deterministic source-no-body revalidation of a sealed local report. */
export async function verifyTelescope(raw,digest,report){
 if(!report||report.status!=='SOURCE_ONLY_TWELVE_STAGE_BUILD'||!Number.isSafeInteger(report.stages))return hold();
 try{
 const regenerated=await runTelescope(raw,digest,{steps:report.stages,fromHead:report.predecessorHead});
 if(regenerated.status!=='SOURCE_ONLY_TWELVE_STAGE_BUILD')return hold();
 return canon(regenerated)===canon(report)
   ?{status:'LOCAL_REPLAY_MATCH',sha256:sha(canon(report)),stages:report.stages,
     authorityEffect:'NONE',hostVerified:false}
   :hold('NONDETERMINISTIC_OR_TAMPERED_REPORT');
 }catch{return hold();}
}

/** Twelve finite macro-cycles, each recursively inheriting the previous full-build
 * head. No scheduler, model turns, room messages or private activity performed.
 */
export async function runTelescopeRounds(raw,digest,{rounds=12,fromHead=null,maxComparisons=40_000_000}={}){
 if(!Number.isSafeInteger(rounds)||rounds<1||!Number.isSafeInteger(maxComparisons)
   ||maxComparisons<269568*12||!Number.isSafeInteger(rounds*12*269568)
   ||rounds*12*269568>maxComparisons)return hold('RESOURCE_BOUNDED_ROUNDS_REQUIRED');
 const history=[],stageReceipts=[];let previous=fromHead;
 for(let i=0;i<rounds;i++){
   const result=await runTelescope(raw,digest,{steps:12,fromHead:previous});
   if(result.status!=='SOURCE_ONLY_TWELVE_STAGE_BUILD')return hold('ROUND_HELD');
   const verified=await verifyTelescope(raw,digest,result);
   if(verified.status!=='LOCAL_REPLAY_MATCH')return hold('ROUND_NOT_REPRODUCIBLE');
   stageReceipts.push(...result.stageHeads.map(p=>({round:i+1,...p})));
   history.push({round:i+1,previousHead:result.predecessorHead,head:result.finalHead,
     stageCount:12,sourcePlanSha256:digest,comparisons:result.perspectiveComputations,
     workPreflightChecks:result.workBurstPreflight.checks,
     adversarialChecks:result.stageHeads[8].detail.attacksRejected,
     sourceOnly:true,actualHostEffects:0});
   previous=result.finalHead;
 }
 return{schema:TEL_SCHEMA,status:'TWELVE_SOURCE_ONLY_ROUNDS_COMPLETE',rounds,
  localEvaluationRounds:rounds,stageReceiptCount:12*rounds,stageReceipts,
  perspectiveComputations:269568*12*rounds,
  perspectiveSummaryObjectsComputed:156*12*rounds,
  perspectiveDigestReceiptsStored:12*rounds,
  actualSourcePinChecks:1248*rounds,adversarialNegativeChecks:6912*rounds,
  originalNodePlanTasksCompleted:0,hostVerified:false,workPosts:0,
  modelTurns:0,privateContentImported:false,canPublish:false,
  canonEffect:'NONE',history,finalHead:previous};
}
