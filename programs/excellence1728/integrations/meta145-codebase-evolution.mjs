/** Atlas META145 source-only 1,728 codebase-configuration evolution review.
 * This is NOT 1,728 published codebases, live agents, hosted benchmarks,
 * actual elapsed years, scientific acceptance or Work permissions.
 * Additive to existing Excellence1728; trusted publisher must supply source pin.
 */
import {createHash} from 'node:crypto';
import {isVerifiedProgram, EXCELLENCE_PROGRAM_ID, ARIADNE_SOURCE_SHA256} from './excellence-program.mjs';
const SHA=/^[a-f0-9]{64}$/;
const HSN=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const TASK=/^EX\.W(0[1-9]|1[0-2])\.C(0[1-9]|1[0-2])\.P(0[1-9]|1[0-2])$/;
const ROOM=/^[A-Za-z0-9_-]{3,80}$/;
const PLAN_SHA='47084b895a6317db16275a92c3878a340d31af15fb9ab479db7101953c18e49c';
function insist(condition,code){if(!condition)throw Object.assign(new TypeError(code),{code})}
function ownPrimitive(x,k){if(!x||typeof x!=='object'||Array.isArray(x))return null;const props=Object.getOwnPropertyDescriptors(x);for(const name of k){if(!Object.hasOwn(props,name)||!Object.hasOwn(props[name],'value'))return null;}return Object.freeze(Object.fromEntries(k.map(name=>[name,props[name].value])))}
export function createMeta145CodebaseEvolution(program,rawBytes,operatorPinnedDigest){
  insist(isVerifiedProgram(program),'OFFICIAL_VERIFIED_EXCELLENCE_REQUIRED');
  const official=program.descriptor();
  insist(official.programId===EXCELLENCE_PROGRAM_ID&&official.planSha256===PLAN_SHA&&official.ariadneSourceSha256===ARIADNE_SOURCE_SHA256&&official.plannedSteps===1728&&official.integratedSteps===0&&official.hostPermissionGranted===false,'EXCELLENCE_SOURCE_CHANGED');
  insist(typeof operatorPinnedDigest==='string'&&SHA.test(operatorPinnedDigest),'TRUSTED_OPERATOR_SOURCE_PIN_REQUIRED');
  insist(typeof rawBytes==='string'||rawBytes instanceof Uint8Array,'EXACT_SOURCE_BYTES_REQUIRED');
  const bytes=Buffer.from(rawBytes);
  insist(bytes.length>500&&bytes.length<131072,'RESULT_SOURCE_SIZE_INVALID');
  const actual=createHash('sha256').update(bytes).digest('hex');
  insist(actual===operatorPinnedDigest,'SOURCE_PIN_MISMATCH');
  let report;
  try{report=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{insist(false,'SOURCE_JSON_INVALID')}
  const required=['schema','source_sha256','candidate_count','synthetic_years_per_candidate','explicit_candidate_year_steps',
    'train_years_per_candidate','heldout_years_per_candidate','source_node_count','sphere_count','house_count',
    'evolution_decision_events','all_candidates_correct_on_synthetic_fixtures','winning_candidate_id',
    'selection_basis','candidates_sha256','spheres_sha256','houses_sha256','model_calls',
    'authenticated_peer_turns','knowledge_gains_proven','host_deployed','canon_changed',
    'actual_separate_git_repositories_created','status'];
  const r=ownPrimitive(report,required);insist(r,'RESULT_REQUIRED_FIELDS_ABSENT_OR_ACCESSOR');
  insist(r.schema==='atlas.meta145.parallel-codebase-simulation/v08'&&r.source_sha256===ARIADNE_SOURCE_SHA256&&r.candidate_count===1728&&r.synthetic_years_per_candidate===1728&&r.explicit_candidate_year_steps===2985984&&r.train_years_per_candidate===1296&&r.heldout_years_per_candidate===432&&r.source_node_count===1728&&r.sphere_count===144&&r.house_count===12&&r.evolution_decision_events===15552,'SOURCE_AND_GEOMETRY_INVALID');
  insist(r.all_candidates_correct_on_synthetic_fixtures===true&&r.status==='EXECUTED_SOURCE_BOUND_SYNTHETIC_PARALLEL_SIMULATION_NOT_DEPLOYED'&&r.model_calls===0&&r.authenticated_peer_turns===0&&r.knowledge_gains_proven===0&&r.host_deployed===false&&r.canon_changed===false&&r.actual_separate_git_repositories_created===0,'FORGED_HOST_OR_QUALITY_STATE');
  insist(typeof r.winning_candidate_id==='string'&&/^CODE-H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/.test(r.winning_candidate_id)&&[r.candidates_sha256,r.spheres_sha256,r.houses_sha256].every(x=>typeof x==='string'&&SHA.test(x)),'INTEGRITY_ROOTS_INVALID');
  insist(typeof r.selection_basis==='string'&&r.selection_basis.includes('NOT HARDWARE GLOBAL OPTIMUM'),'UNSUPPORTED_OPTIMALITY_CLAIM');
  const fixed=Object.freeze({schema:'atlas.meta145.codebase-evolution-review/v08',sourceRegistrySha256:ARIADNE_SOURCE_SHA256,excellencePlanSha256:PLAN_SHA,simulationSourcePin:actual,candidateConfigurations:1728,yearsPerConfiguration:1728,explicitSyntheticSteps:2985984,trainingYears:1296,heldoutYears:432,winnerUnderCostModel:r.winning_candidate_id,observedHostBenchmarks:0,independentModelReviews:0,codebasesPublished:0,status:'SOURCE_ONLY_CONFIG_SIM_NOT_GLOBAL_OPTIMUM',hosted:false});
  return Object.freeze({status:()=>({...fixed}),prepareWorkCandidate:({hsn,taskId,roomId,mode='WORK'}={})=>{
    insist(mode==='WORK','PRIVATE_MODE_DENIED');
    insist(typeof hsn==='string'&&HSN.test(hsn),'INVALID_SOURCE_COORDINATE');
    insist(typeof taskId==='string'&&TASK.test(taskId),'INVALID_ENGINEERING_TASK');
    insist(typeof roomId==='string'&&ROOM.test(roomId),'INVALID_WORK_ROOM');
    const task=program.task(taskId);const preview=program.prepareWorkTask(taskId,{roomId,mode});
    insist(preview.status==='PREPARED_NOT_POSTED'&&preview.workPosted===false&&preview.hostAuthenticated===false,'OFFICIAL_WORK_PORT_CHANGED');
    return {schema:'atlas.meta145.codebase-evolution-work-preview/v08',status:'PREPARED_NOT_POSTED',hsn,engineeringTaskId:task.id,roomId,simulationSourcePin:actual,relationship:'PROPOSED_ENGINEERING_REVIEW_NOT_SAME_AS',sourceBodiesIncluded:false,hostAuthenticated:false,workPosted:false,executionAuthorized:false,canonChanged:false,peerTurns:0,nextRequirement:'CURRENT_HOST_RIGHTS_AND_REAL_BENCHMARK_REVIEW'};
  }});
}
