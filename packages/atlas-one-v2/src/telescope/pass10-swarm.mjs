/** 10 — single SwarmChat broker, data-only source-bound Work envelope.
 * Source-binding is an in-process capability issued ONLY after validating an
 * entire exact R07 1728-record catalogue through the existing R07 inspector.
 * This does NOT attest trusted host identity, consent, READ/RETURN or signing.
 * There is NO network transport, webhook registration, model wake or broker post.
 */
import {createHash} from 'node:crypto';
import {inspectR07Source} from '../r07-workburst-bridge.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const BOUND=new WeakSet();
const deny=()=>({status:'HOLD',authorityEffect:'NONE',workPosted:false,hostVerified:false});
const HSN=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;

/** Prevent caller-owned {digest, coordinate, role} dictionaries from laundering
 * a source into a prepared Work envelope. The binding is opaque and session-local.
 * Any owner-supplied expected digest remains SOURCE-SHAPE proof, not host trust.
 */
export function bindR07WorkSource(rawPlanBytes,expectedPlanSha,coordinate){
 try{
  if(typeof coordinate!=='string'||!HSN.test(coordinate))return deny();
  const source=inspectR07Source(rawPlanBytes,expectedPlanSha);
  if(!source.summary||source.summary.status!=='LOCAL_SOURCE_SHAPE_VERIFIED_NOT_AUTHORIZED')return deny();
  for(let cursor=0;cursor<source.summary.workEligible;cursor+=96){
   const page=source.workPage(cursor,96);
   if(page.status!=='PREPARED_WORK_ONLY')return deny();
   const matching=page.tasks.find(t=>t.input.coordinate===coordinate);
   if(matching){
    const proof=Object.freeze({coordinate,sourceDigest:matching.input.sourceDigest,
      sourceEdition:matching.input.sourceEdition,suggestedMode:'WORK'});
    BOUND.add(proof);
    return proof;
   }
  }
  // Wrong-mode and absent source are indistinguishable in public output.
  return deny();
 }catch{return deny();}
}

/** Only exact opaque bindings from bindR07WorkSource are accepted here. */
export function prepareSwarmChatEnvelope(boundSource,roomId='atlas-work-draft'){
 try{
  if(!boundSource||!BOUND.has(boundSource))return deny();
  if(typeof roomId!=='string'||!/^[a-z0-9-]{3,80}$/.test(roomId))return deny();
  const {coordinate,sourceDigest,sourceEdition}=boundSource;
  const base={coordinate,sourceDigest,sourceEdition,roomId,purpose:'SOURCE_REVIEW',
    sourceStatus:'PLANNED_NOT_EXECUTED',rightsAtRead:'HOST_REQUIRED',rightsAtReturn:'HOST_REQUIRED'};
  return{schema:'atlas.swarmchat.source-only-envelope/v2',status:'PREPARED_NOT_POSTED',
    ...base,idempotencyCandidate:sha(JSON.stringify(base)),brokerSeq:null,
    postAuthorization:'HOST_NOT_AVAILABLE',hostVerified:false,workPosted:false,
    canPublish:false,sourceProof:'COMPLETE_R07_CATALOGUE_SHAPE_ONLY',authorityEffect:'NONE'};
 }catch{return deny();}
}

export async function pass10(c){
 const row=c.source.find(r=>r.suggestedMode==='WORK');
 const token=bindR07WorkSource(c.rawBytes,c.sourceSha,row.coordinate);
 const x=prepareSwarmChatEnvelope(token);
 if(x.status!=='PREPARED_NOT_POSTED'||x.workPosted||x.hostVerified||x.brokerSeq!==null)return{status:'HOLD'};
 c.state.brokerStatus='PREPARED_NOT_POSTED_HOST_BINDING_REQUIRED';
 return{status:'PASS_LOCAL',envelopeCountPrepared:1,
   proof:'EXACT_R07_CATALOGUE_SOURCE_BOUND_NOT_HOST_ATTESTED',hostToolsInstalled:false,
   actualPosts:0,hostRightsRequired:['READ','RETURN','REVOKE','IDENTITY','TENANT']};
}
