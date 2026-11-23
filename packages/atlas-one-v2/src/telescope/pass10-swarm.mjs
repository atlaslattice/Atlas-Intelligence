/** 10 — target the SINGLE existing SwarmChat broker via a data-only Work envelope.
 * A trusted host must independently bind actual account+tenant, issuer, subscription,
 * and rights at READ and RETURN; this module has NO transport and cannot send.
 */
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
const deny=()=>({status:'HOLD',authorityEffect:'NONE',workPosted:false,hostVerified:false});
export function prepareSwarmChatEnvelope(source,roomId='atlas-work-draft'){
 try{
  if(!source||Object.getPrototypeOf(source)!==Object.prototype)return deny();
  const allowed=['coordinate','sourceDigest','sourceEdition','suggestedMode'];
  const props=Object.getOwnPropertyDescriptors(source);
  if(Object.keys(props).length!==allowed.length||Object.keys(props).some(k=>!allowed.includes(k)||!('value' in props[k])))return deny();
  const row=Object.fromEntries(allowed.map(k=>[k,props[k].value]));
  if(row.suggestedMode!=='WORK'||typeof row.sourceDigest!=='string'||!/^[a-f0-9]{64}$/.test(row.sourceDigest)
    ||row.sourceEdition!=='Ariadne v0.7'
    ||typeof row.coordinate!=='string'||!/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/.test(row.coordinate)
    ||typeof roomId!=='string'||!/^[a-z0-9-]{3,80}$/.test(roomId))return deny();
  const base={coordinate:row.coordinate,sourceDigest:row.sourceDigest,
    sourceEdition:row.sourceEdition,roomId,purpose:'SOURCE_REVIEW',
    sourceStatus:'PLANNED_NOT_EXECUTED',rightsAtRead:'HOST_REQUIRED',rightsAtReturn:'HOST_REQUIRED'};
  return{schema:'atlas.swarmchat.source-only-envelope/v1',status:'PREPARED_NOT_POSTED',
    ...base,idempotencyCandidate:sha(JSON.stringify(base)),brokerSeq:null,postAuthorization:'HOST_NOT_AVAILABLE',
    hostVerified:false,workPosted:false,canPublish:false,authorityEffect:'NONE'};
 }catch{return deny();}
}
export async function pass10(c){
 const row=c.source.find(r=>r.suggestedMode==='WORK');
 const x=prepareSwarmChatEnvelope({coordinate:row.coordinate,sourceDigest:row.sourceDigest,sourceEdition:row.sourceEdition,suggestedMode:row.suggestedMode});
 if(x.status!=='PREPARED_NOT_POSTED'||x.workPosted||x.hostVerified||x.brokerSeq!==null)return{status:'HOLD'};
 c.state.brokerStatus='PREPARED_NOT_POSTED_HOST_BINDING_REQUIRED';
 return{status:'PASS_LOCAL',envelopeCountPrepared:1,hostToolsInstalled:false,
   actualPosts:0,hostRightsRequired:['READ','RETURN','REVOKE','IDENTITY','TENANT']};
}
