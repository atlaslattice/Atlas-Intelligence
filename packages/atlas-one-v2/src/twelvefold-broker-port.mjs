/** Atlas Twelvefold publisher-only Work broker relay port.
 * Host callback contract, NOT a live SwarmChat integration, account login or
 * autonomous model scheduler. No network actions occur on import.
 * A real host MUST bind these callbacks to authenticated, transactional state.
 */
import {createHash} from 'node:crypto';
import {verifyNodeWaveDigest} from './twelvefold-port.mjs';
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
const id=/^[A-Za-z0-9_-]{3,80}$/;
const hold=reason=>Object.freeze({status:'HOLD',reason,postAttempted:false,hostVerified:false});
export function createWorkRelayPort({session,room,readParent,rights,post,readback,clock}={}){
 if([session,room,readParent,rights,post,readback,clock].some(fn=>typeof fn!=='function'))throw Error('ALL_HOST_CALLBACKS_REQUIRED');
 let used=false;
 return Object.freeze({
  async respondOnce({delta,roomId,parentSeq,report,consent}={}){
   if(used)return hold('ONE_SUBSTANTIVE_CONTRIBUTION_PER_VISIT');
   const valid=verifyNodeWaveDigest(delta);if(valid.status!=='LOCAL_PACKET_HASH_REPRODUCED')return hold('SOURCE_PACKET_HASH_NOT_VERIFIED');
   if(!id.test(roomId||'')||!Number.isSafeInteger(parentSeq)||parentSeq<1||!plain(report)||typeof report.text!=='string'||!report.text.trim()||report.text.length>2000||!Array.isArray(report.evidenceRefs)||report.evidenceRefs.length<1||report.evidenceRefs.length>8||report.evidenceRefs.some(x=>typeof x!=='string'||x.length<5||x.length>500))return hold('SUBSTANTIVE_SOURCE_REPORT_REQUIRED');
   if(!plain(consent)||consent.optIn!==true||consent.purpose!=='WORK_REPLY')return hold('WORK_REPLY_OPT_IN_REQUIRED');
   // Current trusted host identity must be acquired BEFORE any room lookup.
   // Room metadata callbacks themselves must apply scoped host authorization.
   let who,where,now;
   try{who=await session();}catch{return hold('HOST_SESSION_NOT_BOUND')}
   if(!plain(who)||who.mode!=='WORK'||who.accountAuthenticated!==true||!['tenant','account','principal','memberId'].every(k=>typeof who[k]==='string'&&id.test(who[k]))||!Number.isSafeInteger(who.rightsEpoch)||who.rightsEpoch<0)return hold('HOST_SESSION_NOT_BOUND');
   try{[where,now]=await Promise.all([room(roomId,who),clock()]);}
   catch{return hold('HOST_INPUT_UNAVAILABLE')}
   if(!plain(where)||where.kind!=='work'||where.status!=='open'||where.roomId!==roomId||where.tenant!==who.tenant||where.account!==who.account||!Number.isFinite(Date.parse(where.expiresAt))||!Number.isSafeInteger(now)||now>=Date.parse(where.expiresAt)||!Number.isSafeInteger(where.remainingMessages)||where.remainingMessages<=0||!Number.isSafeInteger(where.remainingMemberMessages)||where.remainingMemberMessages<=0)return hold('ROOM_CLOSED_OR_SCOPE_MISMATCH');
   if(consent.roomId!==roomId||consent.tenant!==who.tenant||consent.account!==who.account||consent.principal!==who.principal||consent.rightsEpoch!==who.rightsEpoch)return hold('CONSENT_SCOPE_MISMATCH');
   const scope=Object.freeze({tenant:who.tenant,account:who.account,principal:who.principal,memberId:who.memberId,roomId,parentSeq,mode:'WORK',rightsEpoch:who.rightsEpoch,purpose:'WORK_REPLY',nodeId:delta.nodeId,wave:delta.wave});
   let admission,egress,parent;
   // Never read an actual peer's protected Work message until READ is granted.
   try{admission=await rights(scope,'READ');}catch{return hold('HOST_READ_RIGHTS_UNKNOWN')}
   if(!plain(admission)||admission.allow!==true||admission.tenant!==scope.tenant||admission.account!==scope.account||admission.principal!==scope.principal||admission.epoch!==scope.rightsEpoch||typeof admission.leaseId!=='string'||!id.test(admission.leaseId))return hold('HOST_READ_RIGHTS_DENIED');
   try{parent=await readParent(roomId,parentSeq,scope,admission)}catch{return hold('HOST_SOURCE_READ_UNAVAILABLE')}
   if(!plain(parent)||parent.roomId!==roomId||parent.seq!==parentSeq||typeof parent.memberId!=='string'||parent.memberId===who.memberId||parent.mode!=='WORK'||!Number.isSafeInteger(parent.hops)||parent.hops<0||parent.hops>=where.maxHops)return hold('NO_NEW_WILLING_WORK_PEER_OR_HOP_LIMIT');
   try{egress=await rights(scope,'RETURN');}catch{return hold('HOST_RETURN_RIGHTS_UNKNOWN')}
   if(!plain(egress)||egress.allow!==true||egress.tenant!==scope.tenant||egress.account!==scope.account||egress.principal!==scope.principal||egress.epoch!==admission.epoch||egress.leaseId!==admission.leaseId)return hold('HOST_RETURN_RIGHTS_DENIED');
   // At actual network egress the publisher must atomically recheck its live
   // authorization and fence its sink; callbacks here do NOT establish IAM.
   const operationId='atlas-'+createHash('sha256').update(`${roomId}:${who.memberId}:${parentSeq}:${delta.nodeWaveDigest}`).digest('hex').slice(0,32);
   const request={roomId,memberId:who.memberId,requestId:operationId,parentSeq,text:report.text,sourceRefs:[...report.evidenceRefs]};
   used=true;let accepted;
   try{accepted=await post(request,scope,egress)}catch{return Object.freeze({status:'DELIVERY_UNCERTAIN_NO_RETRY',requestId:operationId,postAttempted:true,hostVerified:false})}
   if(!plain(accepted)||accepted.roomId!==roomId||!Number.isInteger(accepted.seq)||accepted.seq<1)return Object.freeze({status:'DELIVERY_UNCERTAIN_NO_RETRY',requestId:operationId,postAttempted:true,hostVerified:false});
   let stored;try{stored=await readback(roomId,accepted.seq)}catch{return Object.freeze({status:'READBACK_UNAVAILABLE_NO_RETRY',requestId:operationId,postAttempted:true,hostVerified:false})}
   if(!plain(stored)||stored.roomId!==roomId||stored.seq!==accepted.seq||stored.parentSeq!==parentSeq||stored.memberId!==who.memberId||stored.requestId!==operationId)return Object.freeze({status:'READBACK_MISMATCH_NO_RETRY',requestId:operationId,postAttempted:true,hostVerified:false});
   return Object.freeze({status:'HOST_CALLBACK_STORED_RECEIPT_SELF_REPORTED',roomId,seq:stored.seq,parentSeq,memberId:who.memberId,requestId:operationId,
     sourceNode:delta.nodeId,wave:delta.wave,sourceDigest:delta.nodeWaveDigest,
     attribution:'SELF_DECLARED',hostVerified:false,postAttempted:true,
     readBackByHostCallback:true,externalPublisherAcceptance:'REQUIRED',canonEffect:'NONE'});
  },
 });
}