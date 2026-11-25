/**
 * Additive port of Atlas Round Two R04 source-pointer journal to PR67's one
 * source-bound geometry frame and PR65/66 review result. This is NOT a second
 * model or broker. It never contains source bodies or performs a remote fetch.
 * Authorization is an injected LOCAL test hook, NOT a real host permission.
 */
import { createHash } from 'node:crypto';
import { types as utilTypes } from 'node:util';
import {CANONICAL_IDS,ORIGINAL_ARIADNE} from './peer-convergence.mjs';
const HEX=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const sourceIndex=new Map(CANONICAL_IDS.map((v,i)=>[v,i]));
const schema='atlas.peer-convergence.pointer/v1';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const hold=reason=>Object.freeze({schema,status:'HOLD',reason,results:Object.freeze([]),hostRightsVerified:false,releaseAuthorized:false,sourceBodiesIncluded:false,neuralCallsAdded:0});
function extract(x,fields){
 if(!x||typeof x!=='object'||Array.isArray(x)||utilTypes.isProxy(x)||Object.getPrototypeOf(x)!==Object.prototype)throw Error('NOT_PLAIN_DATA');
 const ds=Object.getOwnPropertyDescriptors(x),names=Reflect.ownKeys(ds);
 if(names.length!==fields.length||names.some(k=>typeof k!=='string'||!fields.includes(k)))throw Error('WRONG_FIELDS');
 const out=Object.create(null);for(const k of fields){const d=ds[k];if(!d||!Object.hasOwn(d,'value')||!d.enumerable)throw Error('GETTER_OR_MISSING');out[k]=d.value;}return out;
}
const FIELDS=['eventId','sequence','action','pointerId','sourceId','familyId','sourceEdition','sourceSha256','rightsEpochSha256','hsn','locatorKind','locatorRef','priorSourceSha256'];
const validId=v=>typeof v==='string'&&ID.test(v);
const validSha=v=>typeof v==='string'&&HEX.test(v);
export function createPointerCompanion(){
 const catalog=new Map(),byEvent=new Map(),history=[];let generation=0;
 function append(candidate){
  const x=extract(candidate,FIELDS);
  if(!validId(x.eventId)||!Number.isSafeInteger(x.sequence)||x.sequence<1||!['UPSERT','WITHDRAW'].includes(x.action)||
    ![x.pointerId,x.sourceId,x.familyId,x.sourceEdition,x.locatorKind,x.locatorRef].every(validId)||
    ![x.sourceSha256,x.rightsEpochSha256].every(validSha)||!sourceIndex.has(x.hsn)||
    (x.priorSourceSha256!==null&&!validSha(x.priorSourceSha256))||!['LIBRARY','GITHUB','PUBLIC_METADATA'].includes(x.locatorKind))throw Error('INVALID_EVENT');
  const bytes=sha(x),seen=byEvent.get(x.eventId);
  if(seen){if(seen!==bytes)throw Error('EVENT_COLLISION');return Object.freeze({status:'NO_CHANGE_EXACT_REPLAY',generation})}
  if(x.sequence!==generation+1)throw Error('SEQUENCE_OR_FORK');
  const old=catalog.get(x.pointerId);
  if(x.action==='UPSERT'){
   if((old&&x.priorSourceSha256!==old.sourceSha256)||(!old&&x.priorSourceSha256!==null))throw Error('STALE_OR_MISSING_PREDECESSOR');
   if(old&&(old.hsn!==x.hsn||old.familyId!==x.familyId||old.sourceId!==x.sourceId))throw Error('POINTER_REBIND');
   catalog.set(x.pointerId,Object.freeze({pointerId:x.pointerId,sourceId:x.sourceId,familyId:x.familyId,sourceEdition:x.sourceEdition,sourceSha256:x.sourceSha256,rightsEpochSha256:x.rightsEpochSha256,hsn:x.hsn,locatorKind:x.locatorKind,locatorRef:x.locatorRef}));
  }else{
   if(!old||x.priorSourceSha256!==old.sourceSha256||old.sourceSha256!==x.sourceSha256||old.sourceEdition!==x.sourceEdition)throw Error('WITHDRAW_DRIFT');
   catalog.delete(x.pointerId);
  }
  generation=x.sequence;byEvent.set(x.eventId,bytes);history.push(Object.freeze({seq:generation,eventId:x.eventId,action:x.action,pointerId:x.pointerId,hash:bytes}));
  return Object.freeze({status:'LOCAL_METADATA_COMMITTED',generation});
 }
 function state(){const rows=Array.from(catalog.values()).sort((a,b)=>a.pointerId.localeCompare(b.pointerId));return Object.freeze({schema,generation,rows:Object.freeze(rows),historyDigest:sha(history),catalogDigest:sha(rows),sourceCount:rows.length,sourceBodiesIncluded:false,authorityEffect:'NONE'});}
 function prepare({root,review,authorize,limit=12}){
  if(!root||!review||typeof authorize!=='function'||review.status!=='LOCAL_PEER_CONVERGENCE_REVIEW_ONLY'||root.status!=='INSPECTION_CANDIDATE_ONLY'||review.frameDigest!==root.frameDigest||root.sourcePins?.registrySha256!==ORIGINAL_ARIADNE||root.sourcePins?.sourceSha256!==review.sourceSha256||root.sourcePins?.modelSha256!==review.modelSha256)return Object.freeze({status:'HOLD',release:async()=>hold('FRAME_NOT_REVIEWED')});
  if(!Number.isInteger(limit)||limit<1||limit>1728)throw Error('INVALID_LIMIT');
  const snapshot=state(),hits=review.originalCandidateHsn;
  if(!Array.isArray(hits)||hits.length===0||hits.length>20||hits.some(h=>!sourceIndex.has(h)))return Object.freeze({status:'HOLD',release:async()=>hold('NO_CANONICAL_HITS')});
  let used=false;
  async function release({purpose='INFERENCE_USE'}={}){
   if(used)return hold('REPLAY_OF_PREPARED');used=true;
   if(!['INFERENCE_USE','DISCLOSE'].includes(purpose))return hold('UNSUPPORTED_PURPOSE');
   if(generation!==snapshot.generation||state().catalogDigest!==snapshot.catalogDigest)return hold('INDEX_CHANGED_AFTER_PREPARE');
   const rows=[];
   for(const hsn of hits){
    const matched=snapshot.rows.filter(x=>x.hsn===hsn);
    for(const entry of matched){
     for(const phase of purpose==='DISCLOSE'?['INFERENCE_USE','DISCLOSE','RETURN']:['INFERENCE_USE','RETURN']){
      let ok=false;try{ok=(await authorize({phase,sourceId:entry.sourceId,sourceSha256:entry.sourceSha256,sourceEdition:entry.sourceEdition,rightsEpochSha256:entry.rightsEpochSha256,pointerId:entry.pointerId,hsn,frameDigest:root.frameDigest}))===true}catch{}
      if(generation!==snapshot.generation||state().catalogDigest!==snapshot.catalogDigest)return hold('INDEX_CHANGED_DURING_RETURN');
      if(!ok)return hold('MOCK_PHASE_DENIED_'+phase);
     }
     rows.push(Object.freeze({...entry,sourceBodyIncluded:false}));if(rows.length===limit)break;
    }
    if(rows.length>=limit)break;
   }
   if(!rows.length)return hold('NO_ACTIVE_POINTERS');
   return Object.freeze({schema,status:'LOCAL_POINTERS_ONLY',results:Object.freeze(rows),generation,distinctDeclaredOrigins:new Set(rows.map(r=>r.familyId)).size,independentCorroborationVerified:false,hostRightsVerified:false,releaseAuthorized:false,sourceBodiesIncluded:false,neuralCallsAdded:0});
  }
  return Object.freeze({status:'PREPARED_NOT_RELEASED',generation:snapshot.generation,release});
 }
 return Object.freeze({append,state,prepare});
}
