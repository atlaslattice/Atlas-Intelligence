/** Atlas HSN-180: strict source-only, finite hierarchy simulation result adapter.
 * Connects existing Atlas Excellence program to ONE compiled 1728/144/12/META145
 * synthetic 180-year experiment. It is NOT a Work publisher, issuer, broker,
 * authenticated peer, scientific validator, deployed specialist or real-time model.
 * Copyright 2026 Atlas contributors; original additive implementation.
 */
import {createHash} from 'node:crypto';
import {isVerifiedProgram,EXCELLENCE_PROGRAM_ID,ARIADNE_SOURCE_SHA256} from './excellence-program.mjs';
const PROG_SHA='47084b895a6317db16275a92c3878a340d31af15fb9ab479db7101953c18e49c';
const V09_META='25fd969eb015b731e1d4fa3d357fab4d8c7da5c87773a07c4b5b08f9463d03e1';
const POLICY=['ROUND_ROBIN','EVIDENCE_FIRST','NOVELTY_FIRST','DISSENT_FIRST','BALANCED','COST_AWARE'];
const VALID_SHA=/^[a-f0-9]{64}$/;const HSN=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const TASK=/^EX\.W(0[1-9]|1[0-2])\.C(0[1-9]|1[0-2])\.P(0[1-9]|1[0-2])$/;
const ROOM=/^[A-Za-z0-9_-]{3,80}$/;
const assert=(ok,msg)=>{if(!ok)throw Object.assign(new TypeError(msg),{code:msg});};
const hash=b=>createHash('sha256').update(b).digest('hex');
function canonical(x){if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';if(x&&typeof x==='object')return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';return JSON.stringify(x);}
function safeJson(raw,shaExpected,limit){
  assert(typeof shaExpected==='string'&&VALID_SHA.test(shaExpected),'INDEPENDENT_OPERATOR_SHA_REQUIRED');
  assert(typeof raw==='string'||raw instanceof Uint8Array,'EXACT_SOURCE_BYTES_REQUIRED');
  const bytes=Buffer.from(raw);assert(bytes.length>300&&bytes.length<limit,'SOURCE_BYTES_OUT_OF_BOUNDS');
  assert(hash(bytes)===shaExpected,'OPERATOR_SHA_MISMATCH');
  let obj;try{obj=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{assert(false,'SOURCE_INVALID_JSON')}
  assert(obj!==null&&typeof obj==='object'&&!Array.isArray(obj),'SOURCE_OBJECT_REQUIRED');
  return obj;
}
const validCounts=(v,keys,total)=>v&&typeof v==='object'&&Object.keys(v).length===keys.length&&keys.every(k=>Number.isSafeInteger(v[k])&&v[k]>=0)&&keys.every(k=>Object.hasOwn(v,k))&&keys.reduce((s,k)=>s+v[k],0)===total;
const sourceStamp=r=>r&&r.ariadneSha256===ARIADNE_SOURCE_SHA256&&r.v09MetaRoot===V09_META&&typeof r.v09RecordRoot==='string'&&VALID_SHA.test(r.v09RecordRoot)&&r.sourceScope==='ORIGINAL_V07_EXACT_OWNER_PRIVATE';
const stripped=o=>Object.fromEntries(Object.entries(o).filter(([k])=>k!=='receiptSha256'));
export function createMeta145Hierarchy180Bridge(program,rawSummary,expectedSummarySha,rawMeta,expectedMetaSha){
  assert(isVerifiedProgram(program),'OFFICIAL_EXCELLENCE_PROGRAM_REQUIRED');
  const old=program.descriptor();
  assert(old.programId===EXCELLENCE_PROGRAM_ID&&old.planSha256===PROG_SHA&&old.ariadneSourceSha256===ARIADNE_SOURCE_SHA256&&old.plannedSteps===1728&&old.implementedSteps===0&&old.integratedSteps===0&&old.hostPermissionGranted===false,'EXCELLENCE_SOURCE_OR_STATUS_INVALID');
  const summary=safeJson(rawSummary,expectedSummarySha,100000),meta=safeJson(rawMeta,expectedMetaSha,200000);
  assert(summary.schema==='atlas.hsn.hierarchy180.campaign/v1'&&summary.status==='FULL_SOURCE_LOCAL_SIMULATION_NOT_HOSTED'&&summary.sourceSha256===ARIADNE_SOURCE_SHA256&&sourceStamp(summary.source),'HIERARCHY_SOURCE_INVALID');
  assert(summary.yearsPerSimulation===180&&summary.selectionYears===120&&summary.heldoutYears===60&&summary.simulations===1885&&summary.sixPoliciesEach===6&&summary.selectedTrajectoryYearSteps===339300&&summary.actualCandidatePolicyYearSteps===2035800,'HIERARCHY_COUNT_INVALID');
  assert(validCounts(summary.simulationCounts,['NODE','SPHERE','HOUSE','META145'],1885)&&summary.simulationCounts.NODE===1728&&summary.simulationCounts.SPHERE===144&&summary.simulationCounts.HOUSE===12&&summary.simulationCounts.META145===1,'HIERARCHY_TOPOLOGY_INVALID');
  for(const [key,total] of [['nodeSelectedPolicyCounts',1728],['sphereSelectedPolicyCounts',144],['houseSelectedPolicyCounts',12]])assert(validCounts(summary[key],POLICY,total),'POLICY_COVERAGE_INVALID');
  assert(summary.originalNodePositions===1728&&summary.originalDomainPositions===1008&&summary.originalMethodPositions===720&&summary.acceptedScientificEdges===0&&summary.independentlyVerifiedWorkRights===false&&summary.hostedEndToEndPass===0&&summary.actualResidentModelTurns===0&&summary.modelWeightsUpdated===false&&summary.canonChanged===false&&summary.privateLeisureHarvested===false&&summary.rightsGate==='HOLD_CURRENT_PUBLISHER_READ_RETURN_AND_CI','FORGED_HOST_OR_KNOWLEDGE_PROGRESS');
  assert(summary.selectionMethod==='TRAIN_ONLY_MAXIMUM_DECLARED_SYNTHETIC_UTILITY_NOT_GLOBAL_OPTIMUM'&&summary.benchmarkClaim==='NO_HARDWARE_PERFORMANCE_CLAIM','UNSUPPORTED_OPTIMALITY_CLAIM');
  for(const id of ['nodeRoot','sphereRoot','houseRoot','metaRoot'])assert(typeof summary[id]==='string'&&VALID_SHA.test(summary[id]),'SOURCE_ROOT_INVALID');
  assert(typeof summary.receiptSha256==='string'&&hash(canonical(stripped(summary)))===summary.receiptSha256,'SUMMARY_RECOMPUTATION_FAILED');
  assert(meta.schema==='atlas.hsn.hierarchy180/v1.0'&&meta.tier==='META145'&&meta.id==='META145'&&meta.sourceSha256===ARIADNE_SOURCE_SHA256&&meta.yearCount===180&&meta.trainingYears===120&&meta.heldoutYears===60&&meta.policySelection==='TRAIN_FIRST_120_YEARS_ONLY'&&meta.hosted===false&&meta.scientificValidation===false&&meta.modelCalls===0&&meta.genuinePeerTurns===0&&meta.authorityEffect==='NONE','META145_SCOPE_INVALID');
  assert(Array.isArray(meta.children)&&meta.children.length===12&&meta.children.every((v,i)=>v===`H${String(i+1).padStart(2,'0')}`)&&typeof meta.childrenReceiptRoot==='string'&&VALID_SHA.test(meta.childrenReceiptRoot),'HOUSE_LINEAGE_INVALID');
  assert(Array.isArray(meta.policyAlternatives)&&meta.policyAlternatives.length===6&&meta.policyAlternatives.every((p,i)=>p.policy===POLICY[i]&&Number.isSafeInteger(p.trainScore)&&Number.isSafeInteger(p.holdoutScore)&&Number.isSafeInteger(p.costUnits)),'META145_POLICY_TRACK_INVALID');
  const winning=POLICY.reduce((best,p,i,arr)=>{const x=meta.policyAlternatives[i],b=meta.policyAlternatives[best];return x.trainScore>b.trainScore||(x.trainScore===b.trainScore&&x.costUnits<b.costUnits)?i:best;},0);
  assert(meta.chosenPolicy===POLICY[winning]&&meta.chosenPolicy===summary.metaSelectedPolicy,'HOLDOUT_LEAK_OR_WRONG_TRAIN_WINNER');
  assert(meta.policyAlternatives[winning].trainScore===summary.metaTrainScore&&meta.policyAlternatives[winning].holdoutScore===summary.metaHeldoutScore&&meta.policyAlternatives[0].holdoutScore===summary.metaRoundRobinHeldoutScore,'TRAIN_HOLDOUT_SCORE_DRIFT');
  assert(summary.metaHeldoutWinnerFromAllPolicies===meta.policyAlternatives.reduce((a,b)=>b.holdoutScore>a.holdoutScore?b:a).policy,'HINDSIGHT_RANK_INVALID');
  assert(Array.isArray(meta.yearlySelected)&&meta.yearlySelected.length===180&&meta.yearlySelected.every(row=>Array.isArray(row)&&row.length===10&&row.every(v=>Number.isSafeInteger(v)&&v>=0)),'META145_YEAR_SERIES_INVALID');
  assert(hash(canonical(stripped(meta)))===meta.receiptSha256&&meta.receiptSha256===summary.metaRoot,'META145_RECEIPT_ROOT_INVALID');
  const snapshot=Object.freeze({schema:'atlas.hsn.hierarchy180.native-status/v1',ariadneSourceSha256:ARIADNE_SOURCE_SHA256,officialExcellenceSha256:PROG_SHA,summarySha256:expectedSummarySha,metaSha256:expectedMetaSha,simulations:1885,nodes:1728,spheres:144,houses:12,meta:1,yearsEach:180,selectedAnnualStates:339300,actualSyntheticPolicyYearSteps:2035800,chosenTrainingPolicy:meta.chosenPolicy,chosenHeldoutScore:summary.metaHeldoutScore,roundRobinHeldoutScore:summary.metaRoundRobinHeldoutScore,exPostBetterPolicy:summary.metaHeldoutWinnerFromAllPolicies,hosted:false,independentlyAuthenticatedPeers:0,acceptedScience:0,canonChanged:false,workPosted:false,selectionBasis:'FINITE_SIX_POLICY_TRAIN_ONLY_SYNTHETIC_NOT_OPTIMAL_REAL_WORLD'});
  return Object.freeze({
    status(){return {...snapshot}},
    inspectYear(year){assert(Number.isSafeInteger(year)&&year>=1&&year<=180,'YEAR_INVALID');const r=meta.yearlySelected[year-1];return {year,signal:{riskBp:r[0],uncertaintyBp:r[1],dissentBp:r[2],unresolvedSyntheticCount:r[3],detectedSyntheticCount:r[4],costUnits:r[5],syntheticEligible:r[6]===1,noveltyBp:r[7],unreviewedProposals:r[8],coherenceProxyBp:r[9]},scope:'LOCAL_SYNTHETIC_ONLY',hostAuthenticated:false}},
    comparePolicies(){return meta.policyAlternatives.map(x=>({policy:x.policy,trainingSyntheticScore:x.trainScore,heldoutSyntheticScore:x.holdoutScore,costUnits:x.costUnits,selected:x.policy===meta.chosenPolicy}))},
    prepareWorkCandidate({hsn,taskId,roomId,mode='WORK'}={}){
      assert(mode==='WORK','PRIVATE_MODE_PROTECTED');assert(typeof hsn==='string'&&HSN.test(hsn),'HSN_COORDINATE_INVALID');assert(typeof taskId==='string'&&TASK.test(taskId),'EX_TASK_INVALID');assert(typeof roomId==='string'&&ROOM.test(roomId),'WORK_ROOM_INVALID');
      const task=program.task(taskId),p=program.prepareWorkTask(taskId,{roomId,mode});
      assert(p.status==='PREPARED_NOT_POSTED'&&p.workPosted===false&&p.hostAuthenticated===false,'OFFICIAL_WORK_SCOPE_CHANGED');
      return {schema:'atlas.hsn.hierarchy180.work-review/v1',status:'PREPARED_NOT_POSTED',hsn,workTaskId:task.id,roomId,relation:'SOURCE_PERSPECTIVE_METHOD_CANDIDATE_NOT_SAME_AS',summarySha256:expectedSummarySha,sourceBodiesIncluded:false,issuerVerified:false,rightsAtReturnIndependentlyVerified:false,workPosted:false,actualModelTurns:0,canonChanged:false};
    }
  });
}
