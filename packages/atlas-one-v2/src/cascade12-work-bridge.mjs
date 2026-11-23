/**
 * Atlas R09–R20 -> existing Atlas ONE Work Burst / SwarmChat review ingress.
 * Pure, local, inert, source-only data adapter. NO network, room posts, host
 * permissions, AI model dispatch, file writes, CANON or fictional publication.
 * Private Ariadne/Empire source bodies are never accepted as input.
 * The trusted host must verify actual source owner, current account and
 * READ/RETURN permissions. A digest here is not an authentication token.
 */
import {createHash} from 'node:crypto';

export const SCHEMA='atlas.civilization.cascade12-work-adapter/v1';
export const REGISTRY_SHA='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
const HSN=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const SHA=/^[0-9a-f]{64}$/;
const CYCLE=/^R(09|1[0-9]|20)$/;
const MAX_BATCH=96;
const MAX_SOURCE_INPUT=8192;
const HOLD=Object.freeze({schema:SCHEMA,status:'HOLD_SOURCE_OR_RIGHTS',canDispatch:false,canPublish:false,hostVerified:false,workTasks:[]});
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)
  &&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
function scalarValid(text){
  if(typeof text!=='string')return false;
  for(let i=0;i<text.length;i++){
    const a=text.charCodeAt(i);
    if(a>=0xd800&&a<=0xdbff){
      if(i+1>=text.length)return false;
      const b=text.charCodeAt(++i);
      if(b<0xdc00||b>0xdfff)return false;
    }else if(a>=0xdc00&&a<=0xdfff)return false;
  }
  return true;
}
function noAccessors(x){
  if(!plain(x))return false;
  if(Reflect.ownKeys(x).some(k=>typeof k!=='string'))return false;
  return Object.values(Object.getOwnPropertyDescriptors(x)).every(d=>
    d.get===undefined&&d.set===undefined&&d.enumerable===true&&d.value!==undefined);
}
function readInert(x,keys){
  if(!noAccessors(x))return null;
  const out=Object.create(null);
  for(const k of keys){
    const d=Object.getOwnPropertyDescriptor(x,k);
    if(!d||!Object.hasOwn(d,'value'))return null;
    out[k]=d.value;
  }
  // Fail closed on unknown metadata that might carry private-mode values.
  if(Object.keys(x).length!==keys.length)return null;
  return out;
}
function digest(x){return createHash('sha256').update(x,'utf8').digest('hex');}

/**
 * Use ONLY a separately approved sanitized proposal envelope produced from
 * the owner-private compiler, not private Play/Brain/Palace/scene text.
 * Caller supplies independently selected exact source digest, not a copy from
 * the proposal. Even a positive output is an inert LOCAL burst plan.
 */
export function prepareNodeCandidate(proposal, expected){
  try{
    const p=readInert(proposal,[
      'cycle','coordinate','sourceEdition','sourceDigest','sourceRole','mode',
      'candidateDigest','previousDigest','sourceInitiative','stageGate','authorityEffect',
      'completedActualVisits','hostVerified','sourceOnly']);
    const e=readInert(expected,['coordinate','registrySha256','sourceDigest','candidateDigest','previousDigest']);
    if(!p||!e)return HOLD;
    if(!CYCLE.test(p.cycle)||!HSN.test(p.coordinate)||p.coordinate!==e.coordinate||
      e.registrySha256!==REGISTRY_SHA||p.sourceEdition!=='Ariadne v0.7'||
      !SHA.test(p.sourceDigest)||p.sourceDigest!==e.sourceDigest||
      !SHA.test(p.candidateDigest)||p.candidateDigest!==e.candidateDigest||
      !SHA.test(p.previousDigest)||p.previousDigest!==e.previousDigest||
      typeof p.sourceInitiative!=='string'||!/^N144-(0[1-9]|1[0-2])-(0[1-9]|1[0-2])$/.test(p.sourceInitiative)||
      !/^(?:SOURCE_PIN|CONSENT|DIALOGUE|ACCESSIBILITY|SEMANTICS|RESEARCH|EXECUTION|FICTION|RESOURCES|RESILIENCE|INTEROP|RELEASE)$/.test(p.stageGate))return HOLD;
    const [h,s]=p.coordinate.match(HSN).slice(1,3);
    if(p.sourceInitiative!==`N144-${h}-${s}`||
      p.sourceRole!==(Number(s)<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META')||
      p.authorityEffect!=='NONE'||p.completedActualVisits!==0||p.hostVerified!==false||p.sourceOnly!==true)return HOLD;
    if(p.mode!=='WORK')return Object.freeze({...HOLD,status:'HOLD_PROTECTED_OPTIONAL_MODE'});
    const task=Object.freeze({
      id:'r'+p.cycle.slice(1)+'-'+p.coordinate.toLowerCase().replaceAll('.','-'),
      operator:'LOCAL_CIVILIZATION_REVIEW',mode:'WORK',resourceKey:p.coordinate.slice(0,7),
      dependsOn:[],noHarvest:false,
      input:Object.freeze({cycle:p.cycle,coordinate:p.coordinate,sourceEdition:p.sourceEdition,
        sourceDigest:p.sourceDigest,candidateDigest:p.candidateDigest,previousDigest:p.previousDigest,
        stageGate:p.stageGate,sourceInitiative:p.sourceInitiative,
        preAuthorized:false,actualHostRight:'UNVERIFIED'}),
      evidenceRefs:['atlas-cascade12-pinned-offline'],dissentRefs:[],
    });
    if(Buffer.byteLength(JSON.stringify(task.input),'utf8')>MAX_SOURCE_INPUT)return HOLD;
    return Object.freeze({schema:SCHEMA,status:'PREPARED_FOR_EXISTING_LOCAL_WORK_BURST',
      task,canDispatch:false,canPublish:false,hostVerified:false,rightsEffect:'NONE',
      permissionState:'HOST_MUST_INDEPENDENTLY_VERIFY'});
  }catch{return HOLD;}
}

export function prepareBurstPage(items,pins,{maxItems=96}={}){
  try{
    if(!Array.isArray(items)||!Array.isArray(pins)||!Number.isSafeInteger(maxItems)||
      maxItems<1||maxItems>MAX_BATCH||items.length<1||items.length>maxItems||
      pins.length!==items.length)return HOLD;
    // Immutable detached array of only locally prepared, source-only Work tasks.
    const prepared=[];const ids=new Set();let protectedCount=0;
    for(let i=0;i<items.length;i++){
      const result=prepareNodeCandidate(items[i],pins[i]);
      if(result.status==='HOLD_PROTECTED_OPTIONAL_MODE'){protectedCount++;continue;}
      if(result.status!=='PREPARED_FOR_EXISTING_LOCAL_WORK_BURST')return HOLD;
      if(ids.has(result.task.id))return HOLD;
      ids.add(result.task.id);prepared.push(result.task);
    }
    if(!prepared.length)return Object.freeze({...HOLD,status:'HOLD_ALL_OPTIONAL_OR_INVALID'});
    return Object.freeze({schema:SCHEMA,status:'PREPARED_BATCH_LOCAL_ONLY',
      preparedCount:prepared.length,protectedCount,
      // This is shape-compatible with the EXISTING Atlas ONE Work Burst API.
      existingBurstPlan:Object.freeze({tasks:Object.freeze(prepared),maxParallel:4}),
      hostVerified:false,canDispatch:false,canPublish:false,noRoomMessagesPosted:true,
      authentication:'NONE',canonEffect:'NONE'});
  }catch{return HOLD;}
}

export function sanitizeNodeForWork(packet){
  // Sanitizes owner-side compiler packet for the separate data-only review API.
  // DO NOT serialize the Iron Empire original-fiction private fields.
  try{
    if(!plain(packet)||!plain(packet.source)||!noAccessors(packet)||!noAccessors(packet.source))return HOLD;
    const m=packet.coordinate?.match(HSN);
    if(!m||!SHA.test(packet.packetDigest)||!SHA.test(packet.previousCyclePacketDigest)||
       !SHA.test(packet.source.recordSha256)||packet.source.registrySha256!==REGISTRY_SHA||
       packet.status!=='PLANNED_NOT_EXECUTED'||packet.completedMacroturnVisits!==0)return HOLD;
    return Object.freeze({
      cycle:packet.cycle,coordinate:packet.coordinate,sourceEdition:'Ariadne v0.7',
      sourceDigest:packet.source.recordSha256,sourceRole:packet.source.sourceRole,
      mode:packet.suggestedMode,candidateDigest:packet.packetDigest,
      previousDigest:packet.previousCyclePacketDigest,
      sourceInitiative:packet.source.sphereTaskRef,stageGate:packet.stageGate,
      authorityEffect:'NONE',completedActualVisits:0,hostVerified:false,sourceOnly:true
    });
  }catch{return HOLD;}
}
