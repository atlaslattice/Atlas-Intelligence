/** Source-only HSN horizon result admission; additive to official Excellence1728.
 * DOES NOT create a model, schedule, broker, issuer, payment, resident, or Work
 * write; scientific quality and peer identity are not attested by number theory.
 */
import {createHash} from 'node:crypto';
import {isVerifiedProgram,ARIADNE_SOURCE_SHA256,EXCELLENCE_PROGRAM_ID} from './excellence-program.mjs';
import {EXCELLENCE_PLAN_SHA} from './meta145-native-source-port.mjs';
const HSN=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const TASK=/^EX\.W(0[1-9]|1[0-2])\.C(0[1-9]|1[0-2])\.P(0[1-9]|1[0-2])$/;
const ROOM=/^[A-Za-z0-9_-]{3,80}$/;
const SHA=/^[0-9a-f]{64}$/;
const fail=msg=>{throw Object.assign(new TypeError(msg),{code:msg});};
const require_= (x,msg)=>{if(!x)fail(msg);};
const copy=x=>JSON.parse(JSON.stringify(x));

/** expectedSha256 is selected by an independent operator-owned source manifest,
 * never copied from the source receipt, an HTTP request or model output.
 */
export function createMeta145HorizonReview(program,rawBytes,expectedSha256){
  require_(isVerifiedProgram(program),'OFFICIAL_VERIFIED_EXCELLENCE_REQUIRED');
  const status=program.descriptor();
  require_(status.programId===EXCELLENCE_PROGRAM_ID&&status.planSha256===EXCELLENCE_PLAN_SHA&&
     status.ariadneSourceSha256===ARIADNE_SOURCE_SHA256&&status.plannedSteps===1728&&
     status.implementedSteps===0&&status.verifiedSteps===0&&status.integratedSteps===0,
     'EXCELLENCE_PLAN_OR_STATE_CHANGED');
  require_(typeof expectedSha256==='string'&&SHA.test(expectedSha256),'INDEPENDENT_SOURCE_PIN_REQUIRED');
  require_(typeof rawBytes==='string'||rawBytes instanceof Uint8Array,'EXACT_RECEIPT_BYTES_REQUIRED');
  const bytes=Buffer.from(rawBytes);
  require_(bytes.length>100&&bytes.length<65536,'SOURCE_RECEIPT_SIZE_INVALID');
  const actual=createHash('sha256').update(bytes).digest('hex');
  require_(actual===expectedSha256,'SOURCE_RECEIPT_PIN_MISMATCH');
  let report;
  try{report=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail('SOURCE_RECEIPT_JSON_INVALID');}
  require_(report&&typeof report==='object'&&!Array.isArray(report)&&report.schema==='atlas.meta145.horizon-synthesis/v1'&&
    report.source_sha256===ARIADNE_SOURCE_SHA256&&report.node_count===1728&&report.sphere_count===144&&report.house_count===12&&
    report.domain_nodes===1008&&report.meta_nodes===720,
    'SOURCE_OR_TOPOLOGY_INVALID');
  require_(report.simulated_node_years_per_campaign===1728&&report.campaign_repetitions_symbolic===1728&&
    report.explicit_numeric_steps_completed===2985984&&
    report.symbolic_virtual_steps_computed_via_exact_exponentiation===5159780352&&
    report.fictional_years_not_elapsed_time===true&&report.original_hsn_years_or_expertise_not_claimed===true,
    'MISLEADING_YEAR_OR_EXECUTION_COUNT');
  require_(report.read_only_peer_messages_considered===20&&report.local_synthesis_cycles_performed===20&&
    report.independently_authenticated_peer_turns===0&&report.peer_reply_count_from_this_compiler===0,
    'FORGED_PEER_EXCHANGE');
  require_(report.expert_reviews===0&&report.scientific_crosswalks_accepted===0&&
    report.canon_changed===false&&report.host_deployed===false&&report.model_weights_retrained===false&&
    report.upstream_source_copied===false&&report.new_1728_live_autonomous_researchers===0,
    'FORGED_SCIENCE_OR_HOST_STATUS');
  for(const key of ['sha256','node_chain_head_sha256','spheres_root_sha256','houses_root_sha256','peer_cycles_hash'])
    require_(typeof report[key]==='string'&&SHA.test(report[key]),'SOURCE_ROOT_MISSING');
  // This validates source receipt shape and externally pinned exact bytes. Local
  // hash chains and symbolic projections do not certify real-world improvement.
  const snapshot=Object.freeze({schema:'atlas.meta145.horizon.source-review/v1',sourcePin:actual,
    sourceRegistrySha256:ARIADNE_SOURCE_SHA256,excellenceProgramSha256:EXCELLENCE_PLAN_SHA,
    nodeCount:1728,sphereCount:144,houseCount:12,localReviewCycles:20,
    explicitNumericSteps:2985984,symbolicFastForwardSteps:5159780352,
    independentPeerTurns:0,scientificAcceptance:0,hosted:false,
    status:'SOURCE_ONLY_NUMERICAL_SIMULATION_NOT_QUALITY_PROOF'});
  return Object.freeze({
    status:()=>({...snapshot}),
    prepareReview:({hsn,taskId,roomId,mode='WORK'}={})=>{
      require_(mode==='WORK','PRIVATE_MODE_BLOCKED');
      require_(typeof hsn==='string'&&HSN.test(hsn),'HSN_ADDRESS_INVALID');
      require_(typeof taskId==='string'&&TASK.test(taskId),'EX_ENGINEERING_ADDRESS_INVALID');
      require_(typeof roomId==='string'&&ROOM.test(roomId),'WORK_ROOM_INVALID');
      const task=program.task(taskId);
      const plan=program.prepareWorkTask(taskId,{roomId,mode});
      require_(plan.planSha256===EXCELLENCE_PLAN_SHA&&plan.status==='PREPARED_NOT_POSTED',
         'OFFICIAL_WORK_PREVIEW_CHANGED');
      return {schema:'atlas.meta145.horizon.work-proposal/v1',
        status:'PREPARED_NOT_POSTED',hsn,taskId:task.id,taskTitle:task.title,
        relationship:'PROPOSED_METHOD_REVIEW_NOT_SAME_AS',roomId,sourceSha256:ARIADNE_SOURCE_SHA256,
        horizonSourcePin:actual,sourceBodiesIncluded:false,executionAuthorized:false,
        posted:false,canonChanged:false,hostAuthenticated:false,peerReplyCount:0,
        nextRequirement:'CURRENT_PUBLISHER_HOST_AND_WORK_LEDGER_REVALIDATION'};
    }
  });
}
