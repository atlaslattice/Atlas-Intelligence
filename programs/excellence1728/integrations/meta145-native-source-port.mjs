/** Source-safe, additive read-only bridge for existing Atlas Excellence/META145.
 * This is a shape/authority gate, not a verifier for host rights or private nodes.
 * It deliberately never posts, executes Work, reads personal modes, or merges CANON.
 */
export const ARIADNE_SHA='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
export const EXCELLENCE_PLAN_SHA='47084b895a6317db16275a92c3878a340d31af15fb9ab479db7101953c18e49c';
export const E145_SCHEMA='atlas.meta145.native-strategy-circuit/v1';
const HSN=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const SHA=/^[0-9a-f]{64}$/;
function assert(value,reason){if(!value)throw new TypeError(reason)}
export function validateMeta145PlanningReceipt(m){
  assert(m && typeof m==='object' && !Array.isArray(m),'MANIFEST_MISSING');
  assert(m.schema===E145_SCHEMA && m.source_sha256===ARIADNE_SHA && m.atlas_excellence_plan_sha256===EXCELLENCE_PLAN_SHA,'EDITION_OR_PROGRAM_MISMATCH');
  assert(m.node_count===1728 && m.sphere_count===144 && m.house_count===12 && m.meta_coordinate==='E145','TOPOLOGY_INVALID');
  assert(m.actual_work_macroturns===0 && m.actual_resident_model_calls===0 && m.host_permission_granted===false && m.canon_changed===false && m.broker_changed===false,'FORGED_HOST_PROGRESS');
  assert(m.strategy_option_evaluations===6912 && m.swarmchat_client_tool_count===96 && m.independently_hosted_components===0,'REVIEW_COUNTERS_INVALID');
  for(const key of ['meta_receipt_sha256','node_chain_head_sha256','house_root_sha256'])assert(typeof m[key]==='string'&&SHA.test(m[key]),'MISSING_DIGEST');
  return {source_sha256:ARIADNE_SHA,program_sha256:EXCELLENCE_PLAN_SHA,status:'SOURCE_ONLY_SIMULATED_NOT_ADOPTED',
          geometry:{nodes:1728,spheres:144,houses:12,meta:'E145'},integrated_steps:0,hosted_verified:false};
}
export function createMeta145ReadOnlyPort(manifest){
  const validated=validateMeta145PlanningReceipt(manifest);
  return Object.freeze({
    status:()=>({...validated}),
    prepareWorkCandidate:(hsn,mode='WORK')=>{
      assert(mode==='WORK','PRIVATE_OR_UNAUTHORIZED_MODE');assert(typeof hsn==='string'&&HSN.test(hsn),'INVALID_SOURCE_COORDINATE');
      return {schema:'atlas.one.work-candidate/v0.1',hsn,namespace:'ariadne-reader',source_sha256:ARIADNE_SHA,
              status:'PREPARED_NOT_SENT',host_permission:'NOT_ATTESTED',sent:false,
              compatibility:'EXISTING_ATLAS_ONE_AND_SWARMCHAT_ONLY'};
    },
    preflight:()=>({status:'HOLD_CURRENT_HOST_PERMISSION_REQUIRED',
                   requirements:['CURRENT_READ','CURRENT_RETURN','REAL_CI_STEPS','UPSTREAM_LICENSE_AND_SBOM','ROLLBACK'],
                   host_write:false,canon_changed:false,autonomous_resident_wakes:0})
  });
}
