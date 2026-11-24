/**
 * Atlas META145 native-source, Work-only review bridge.
 *
 * Additive to the EXISTING atlas.excellence 1728 verified plan. Does not install a
 * broker, perform a remote write, attest a caller, execute an agent, read leisure
 * spaces, infer HSN↔EX equivalence, or promote CANON.
 *
 * Copyright (c) 2026 Atlas contributors. Original source-safe integration code.
 */
import {isVerifiedProgram, EXCELLENCE_PROGRAM_ID, ARIADNE_SOURCE_SHA256} from './excellence-program.mjs';

export const ARIADNE_SHA=ARIADNE_SOURCE_SHA256;
export const EXCELLENCE_PLAN_SHA='47084b895a6317db16275a92c3878a340d31af15fb9ab479db7101953c18e49c';
export const E145_SCHEMA='atlas.meta145.native-strategy-circuit/v1';
const HSN=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const TASK=/^EX\.W(0[1-9]|1[0-2])\.C(0[1-9]|1[0-2])\.P(0[1-9]|1[0-2])$/;
const ROOM=/^[A-Za-z0-9_-]{3,80}$/;
const SHA=/^[0-9a-f]{64}$/;
const shallowCopy=x=>JSON.parse(JSON.stringify(x));
function assert(value,reason){if(!value)throw Object.assign(new TypeError(reason),{code:reason});}
function plain(x){return x!==null&&typeof x==='object'&&!Array.isArray(x);}

/** A source-shape check, NEVER proof of original simulation bytes or host rights. */
export function validateMeta145PlanningReceipt(m){
  assert(plain(m),'MANIFEST_MISSING');
  assert(m.schema===E145_SCHEMA&&m.source_sha256===ARIADNE_SHA&&m.atlas_excellence_plan_sha256===EXCELLENCE_PLAN_SHA,'EDITION_OR_PROGRAM_MISMATCH');
  assert(m.node_count===1728&&m.sphere_count===144&&m.house_count===12&&m.meta_coordinate==='E145','TOPOLOGY_INVALID');
  assert(m.actual_work_macroturns===0&&m.actual_resident_model_calls===0&&m.host_permission_granted===false&&m.canon_changed===false&&m.broker_changed===false,'FORGED_HOST_PROGRESS');
  assert(m.strategy_option_evaluations===6912&&m.swarmchat_client_tool_count===96&&m.independently_hosted_components===0,'REVIEW_COUNTERS_INVALID');
  for(const key of ['meta_receipt_sha256','node_chain_head_sha256','house_root_sha256']){
    assert(typeof m[key]==='string'&&SHA.test(m[key]),'MISSING_DIGEST');
  }
  return {source_sha256:ARIADNE_SHA,program_sha256:EXCELLENCE_PLAN_SHA,
          status:'SOURCE_ONLY_SIMULATED_NOT_ADOPTED',
          geometry:{nodes:1728,spheres:144,houses:12,meta:'E145'},
          integrated_steps:0,hosted_verified:false};
}

/** Independent untrusted-source prep. The name 'read-only' is not a host permission. */
export function createMeta145ReadOnlyPort(manifest){
  const validated=validateMeta145PlanningReceipt(manifest);
  return Object.freeze({
    status:()=>shallowCopy(validated),
    prepareWorkCandidate:(hsn,mode='WORK')=>{
      assert(mode==='WORK','PRIVATE_OR_UNAUTHORIZED_MODE');
      assert(typeof hsn==='string'&&HSN.test(hsn),'INVALID_SOURCE_COORDINATE');
      return {schema:'atlas.one.work-candidate/v0.1',hsn,namespace:'ariadne-reader',
              source_sha256:ARIADNE_SHA,status:'PREPARED_NOT_SENT',
              host_permission:'NOT_ATTESTED',sent:false,
              compatibility:'EXISTING_ATLAS_ONE_AND_SWARMCHAT_ONLY'};
    },
    preflight:()=>({status:'HOLD_CURRENT_HOST_PERMISSION_REQUIRED',
                   requirements:['CURRENT_READ','CURRENT_RETURN','REAL_CI_STEPS','UPSTREAM_LICENSE_AND_SBOM','ROLLBACK'],
                   host_write:false,canon_changed:false,autonomous_resident_wakes:0})
  });
}

/**
 * Genuine integration into the official verified, SHA-pinned Excellence object.
 * HSN and EX tasks are independent identities linked only by an unreviewed proposal.
 */
export function createMeta145ExcellenceBridge(program,manifest){
  assert(isVerifiedProgram(program),'VERIFIED_EXCELLENCE_PROGRAM_REQUIRED');
  const descriptor=program.descriptor();
  assert(descriptor.programId===EXCELLENCE_PROGRAM_ID && descriptor.planSha256===EXCELLENCE_PLAN_SHA &&
         descriptor.ariadneSourceSha256===ARIADNE_SHA && descriptor.status==='PLANNED_PROGRAM_SOURCE_VERIFIED' &&
         descriptor.plannedSteps===1728 && descriptor.integratedSteps===0 && descriptor.hostPermissionGranted===false,
         'EXCELLENCE_PROGRAM_SOURCE_OR_STATUS_INVALID');
  const source=createMeta145ReadOnlyPort(manifest);
  return Object.freeze({
    status:()=>({schema:'atlas.meta145.excellence-bridge-status/v1',
      programId:EXCELLENCE_PROGRAM_ID,planSha256:EXCELLENCE_PLAN_SHA,
      ariadneSourceSha256:ARIADNE_SHA,shapeReceipt:source.status(),
      status:'EXACT_SOURCE_LOCAL_READ_ONLY',completedStepsFromLedger:'NOT_QUERIED',
      installedOnSite:false,hostAuthenticated:false}),
    prepareJointReview:({hsn,taskId,roomId,mode='WORK'}={})=>{
      assert(mode==='WORK','PRIVATE_OR_UNAUTHORIZED_MODE');
      assert(typeof hsn==='string'&&HSN.test(hsn),'INVALID_SOURCE_COORDINATE');
      assert(typeof taskId==='string'&&TASK.test(taskId),'ENGINEERING_TASK_ID_INVALID');
      assert(typeof roomId==='string'&&ROOM.test(roomId),'WORK_ROOM_ID_INVALID');
      const candidate=source.prepareWorkCandidate(hsn,mode);
      const realTask=program.task(taskId);
      const handoff=program.prepareWorkTask(taskId,{roomId,mode});
      assert(handoff.planSha256===EXCELLENCE_PLAN_SHA&&handoff.ariadneSourceSha256===ARIADNE_SHA&&
        handoff.status==='PREPARED_NOT_POSTED'&&handoff.hostAuthenticated===false&&handoff.workPosted===false,
        'EXCELLENCE_HANDOFF_SCOPE_INVALID');
      return {schema:'atlas.meta145.excellence-joint-review/v1',status:'PREPARED_NOT_POSTED',
        programId:EXCELLENCE_PROGRAM_ID,planSha256:EXCELLENCE_PLAN_SHA,
        hsn:{coordinate:candidate.hsn,edition:'ariadne-reader/v0.7',sourceSha256:ARIADNE_SHA},
        engineering:{taskId:realTask.id,capabilityId:realTask.capability_id,phaseId:realTask.phase_id,
          title:realTask.title,dependsOn:shallowCopy(realTask.depends_on),
          requiredChecks:shallowCopy(realTask.required_checks)},
        roomId,relationship:'PROPOSED_CROSSWALK_FOR_REVIEW_NOT_SAME_AS',
        sourceBodiesIncluded:false,hostAuthenticated:false,rightsAtReturnIndependentlyVerified:false,
        workPosted:false,executionAuthorized:false,canonChanged:false,
        nextRequirement:'CURRENT_WORK_HOST_READ_AND_RETURN_AND_ACTUAL_EVIDENCE_LEDGER'};
    },
    preflight:()=>source.preflight()
  });
}

/**
 * Optional route handler for EXISTING HTTP hosts. It does not launch a server.
 * A host-controlled rights callback must be injected and rechecked at READ and
 * RETURN. Even successful callback tests are NOT independent issuer attestation.
 */
export function createMeta145HttpHandler(program,manifest,{authorize}={}){
  const bridge=createMeta145ExcellenceBridge(program,manifest);
  const reply=(res,code,body)=>{
    res.statusCode=code;
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.end(JSON.stringify(body));
  };
  const deny=(res,code=403)=>reply(res,code,{schema:'atlas.meta145.http-result/v1',
    status:'HOLD',reason:'UNAUTHORIZED_OR_UNAVAILABLE',data:null});
  return async function meta145ReadOnlyHandler(req,res){
    if(req.method!=='GET'){res.setHeader('Allow','GET');return deny(res,405);}
    if(typeof req.url!=='string'||req.url.length>512||!req.url.startsWith('/')||req.url.startsWith('//'))return deny(res,400);
    let path,params;
    try { const u=new URL(req.url,'http://localhost');path=u.pathname;params=u.searchParams; }
    catch {return deny(res,400);}
    if(path!=='/api/atlas/meta145/status'&&path!=='/api/atlas/meta145/review')return deny(res,404);
    // Never inspect source selection or disclose existence before this boundary.
    const scope={purpose:'ATLAS_META145_SOURCE_ONLY',operation:path,method:'GET'};
    let rights;
    try{rights=typeof authorize==='function'?await authorize({phase:'READ',req,...scope}):null;}
    catch{return deny(res);}
    if(rights?.allowed!==true)return deny(res);
    let body;
    try{
      if(path.endsWith('/status')){
        if([...params.keys()].length) return deny(res,400);
        body=bridge.status();
      }else{
        if(params.size!==3||new Set([...params.keys()]).size!==3||
           [...params.keys()].some(k=>!['hsn','taskId','roomId'].includes(k)))return deny(res,400);
        body=bridge.prepareJointReview({hsn:params.get('hsn'),taskId:params.get('taskId'),roomId:params.get('roomId')});
      }
    }catch{return deny(res,400);}
    try{rights=typeof authorize==='function'?await authorize({phase:'RETURN',req,...scope}):null;}
    catch{return deny(res);}
    if(rights?.allowed!==true)return deny(res);
    return reply(res,200,{schema:'atlas.meta145.http-result/v1',status:'HOST_CALLBACK_REPORTED_SOURCE_ONLY_NOT_ATTESTED',
      data:body,rightsAtReturnIndependentlyVerified:false,hostAuthenticated:false});
  };
}
