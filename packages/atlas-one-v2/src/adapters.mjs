/** Transport-neutral ports for former Atlas/Sheldonbrain/SwarmChat implementations.
 * No API keys, URLs, signed principals, or permission witnesses are taken from
 * model output. These ports can be bound only by the authorized host publisher.
 */
import {requireValid,isObject,Hold,digest} from './index.mjs';
import {prepareWorkEnvelope} from './engine.mjs';
const ID=/^[A-Za-z0-9_-]{3,80}$/;
const COORD=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const SHA=/^[a-f0-9]{64}$/;
export const PORT_STATES=Object.freeze({DISABLED:'HOST_ADAPTER_NOT_BOUND',PREPARED:'PREPARED_NOT_POSTED',READ:'HOST_REPORTED_READ_RETURN_RECHECKED_SOURCE_ONLY'});
function hold(code){return {schema:'atlas.one.host-port/v2',status:'HOLD',reason:code,hostAuthenticated:false,postPerformed:false,canonEffect:'NONE',data:null};}
/** Only the publisher's already-authenticated service can supply this port. At
 * source level, even a returned ALLOW is not independent evidence of real IAM.
 */
export class WorkHostPort {
  #admission;#read;#egress;
  constructor({admission,read,egress}={}){
    requireValid(typeof admission==='function'&&typeof read==='function'&&typeof egress==='function','HOST_PORT_CALLBACKS_REQUIRED');
    this.#admission=admission;this.#read=read;this.#egress=egress;
  }
  async query({principal,roomId,sourceSeqs,purpose='research'}={}){
    if(typeof principal!=='string'||!ID.test(principal)||typeof roomId!=='string'||!ID.test(roomId)||purpose!=='research'||!Array.isArray(sourceSeqs)||sourceSeqs.length<1||sourceSeqs.length>6||sourceSeqs.some(s=>!Number.isInteger(s)||s<1||s>500))return hold('REQUEST_SHAPE_INVALID');
    const scope={principal,roomId,sourceSeqs:[...new Set(sourceSeqs)],mode:'WORK',purpose};
    let permit,rows,current;
    try{permit=await this.#admission(scope);}catch{return hold('HOST_ADMISSION_FAILED');}
    if(!isObject(permit)||permit.allow!==true||typeof permit.leaseId!=='string'||!ID.test(permit.leaseId)||!Number.isSafeInteger(permit.epoch)||permit.epoch<0)return hold('READ_RIGHTS_MISSING');
    try{rows=await this.#read(scope,permit);}catch{return hold('HOST_READ_FAILED');}
    if(!Array.isArray(rows)||rows.length!==scope.sourceSeqs.length)return hold('HOST_RETURN_SHAPE_INVALID');
    const refs=[];
    for(const row of rows){if(!isObject(row)||row.roomId!==roomId||!scope.sourceSeqs.includes(row.seq)||typeof row.sha256!=='string'||!SHA.test(row.sha256))return hold('HOST_SOURCE_IDENTITY_INVALID');
      // Deliberately discard full body, identity claims, source metadata, and input URLs.
      refs.push({roomId:row.roomId,seq:row.seq,sourceSHA256:row.sha256});}
    if(new Set(refs.map(r=>r.seq)).size!==scope.sourceSeqs.length)return hold('HOST_SOURCE_SEQUENCE_DUPLICATE');
    try{current=await this.#egress(scope,permit);}catch{return hold('HOST_RETURN_RECHECK_FAILED');}
    if(!isObject(current)||current.allow!==true||current.leaseId!==permit.leaseId||current.epoch!==permit.epoch)return hold('REVOKED_OR_STALE_EPOCH_AT_RETURN');
    const publicData={references:refs.sort((a,b)=>a.seq-b.seq),sourceCount:refs.length,scopeDigest:digest({roomId,sourceSeqs:scope.sourceSeqs,purpose})};
    return {schema:'atlas.one.host-port/v2',status:PORT_STATES.READ,data:publicData,hostAuthenticated:false,rightsProof:'HOST_CALLBACK_REPORTED_NOT_INDEPENDENTLY_ATTESTED',postPerformed:false,canonEffect:'NONE'};
  }
}

/** Public-scoped projection from immutable Atlas research case, never a new host grant. */
export function prepareSwarmChatDraft(packet,{roomId}={}){
  if(typeof roomId!=='string'||!ID.test(roomId))return hold('ROOM_ID_INVALID');
  const envelope=prepareWorkEnvelope(packet);
  requireValid(envelope.hsn.every(x=>COORD.test(x.coordinate)),'CANONICAL_HSN_REQUIRED');
  return {schema:'atlas.one.swarmchat-draft/v2',roomId,state:PORT_STATES.PREPARED,
    envelopeSHA256:envelope.envelopeSHA256,packetSHA256:packet.packetSHA256,
    sourceReferences:envelope.hsn,sourceEdition:envelope.sourceEdition,papers:envelope.paperRefs,
    candidateOnly:true,requiresCurrentHostRights:true,workOnly:true,posted:false,peerReceived:false,hostAuthenticated:false,canonEffect:'NONE'};
}

/** Migration routes for earlier physical stores; new core owns orchestration. */
export const legacyPorts=Object.freeze({
 'atlas-intelligence-firebase':{role:'LEGACY_EVIDENCE_STORE',dataMove:'OPT_IN_MIGRATION_ONLY',authority:'NONE'},
 'sheldonbrain-rag-api':{role:'LEGACY_RETRIEVAL_INDEX',dataMove:'OPT_IN_MIGRATION_ONLY',authority:'NONE'},
 'alexandria':{role:'SOURCE_ARCHIVE',dataMove:'NONE',authority:'NONE'},
 'swarmchat':{role:'EXISTING_PRIVATE_BROKER',dataMove:'NONE',authority:'HOST_OWNS_AUTH'},
 'atlasgpt':{role:'RESEARCH_CLIENT_AND_AGENTS_SDK_PORT',dataMove:'NONE',authority:'HOST_OWNS_AUTH'}
});
