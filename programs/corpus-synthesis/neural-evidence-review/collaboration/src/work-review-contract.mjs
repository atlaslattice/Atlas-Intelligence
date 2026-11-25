/** Atlas collaboration review contract — source-only WORK preparation.
 * No broker, notifier, scheduler, identity authority, release gate, or canonical vote.
 * Safe only for JSON-native caller data already admitted into an authorized Work scope.
 * This *does not* prevent malicious Proxy traps in arbitrary JavaScript objects: the
 * trusted caller MUST deserialize bounded UTF-8 JSON before invoking this helper.
 */
import { createHash } from 'node:crypto';

export const SCHEMA = 'atlas.collaboration.work-review-candidate/v2';
export const REGISTRY_SHA256 = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
const SHA = /^[0-9a-f]{64}$/;
const COORD = /^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const ID = /^[A-Za-z0-9_-]{3,80}$/;
const REQUEST = /^[A-Za-z0-9_.:-]{10,80}$/;
const HOLD = Object.freeze({schema:SCHEMA,status:'HOLD_REVIEW_NOT_ADMITTED',canPost:false,canExecute:false,canPublish:false,canRatify:false,completedMacroturns:0});
const allowed = (x, keys)=>x && typeof x==='object' && !Array.isArray(x) && Object.getPrototypeOf(x)===Object.prototype
  && Reflect.ownKeys(x).every(k=>typeof k==='string' && keys.includes(k)) &&
  Object.values(Object.getOwnPropertyDescriptors(x)).every(d=>Object.hasOwn(d,'value') && d.enumerable);
const keys = Object.freeze({
 root:['room','member','reply','source','change','hsn','evidence','release','claims'],
 room:['id','kind','status','headSeq','messageCount','maxMessages','maxPerMember','memberMessages','expiresAt'],
 member:['id','assurance','consent'],
 reply:['parentSeq','requestId','referencedSeqs'],
 source:['scope','privateModeDataIncluded','sourceUrl','sourceDigest','sourceEdition'],
 change:['predecessor','addition','testableDifference','falsifier'],
 hsn:['node','role','subject','registryDigest','nodeRecordDigest'],
 evidence:['testStatus','testsRun','testsPassed','testsFailed','testReceiptDigest','humanReviewed','hostVerified'],
 release:['edition','status','permissionEffect','canonEffect','modelWeightsChanged','hostedDeployed'],
 claims:['actuallyPosted','scheduledWakeCount','performedAgentVisits','peerIdentityVerified','semanticAccepted'],
});
const string=(s,min=1,max=500)=>typeof s==='string'&&s.length>=min&&s.length<=max&&!/[\u0000-\u001f]/.test(s);
const int=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const hsn=(id)=>typeof id==='string'?COORD.exec(id):null;
export function readOnlyOntologyCoordinates(){
 const ids=[];
 for(let h=1;h<=12;h++)for(let s=1;s<=12;s++)for(let n=1;n<=12;n++){
  ids.push(`H${String(h).padStart(2,'0')}.S${String(s).padStart(2,'0')}.N${String(n).padStart(2,'0')}`);
 }
 return Object.freeze(ids);
}
export function prepareCollaborativeWorkReview(input){
 try{
  if(!allowed(input,keys.root))return HOLD;
  const {room,member,reply,source,change,hsn:focus,evidence,release,claims}=input;
  if(!allowed(room,keys.room)||!allowed(member,keys.member)||!allowed(reply,keys.reply)
     ||!allowed(source,keys.source)||!allowed(change,keys.change)
     ||!allowed(focus,keys.hsn)||!allowed(evidence,keys.evidence)
     ||!allowed(release,keys.release)||!allowed(claims,keys.claims))return HOLD;
  if(!ID.test(room.id)||room.kind!=='work'||room.status!=='open'
     ||!int(room.headSeq,1,500)||!int(room.messageCount,0,500)
     ||room.headSeq!==room.messageCount||!int(room.maxMessages,1,500)
     ||room.messageCount>=room.maxMessages||!int(room.maxPerMember,1,30)
     ||!int(room.memberMessages,0,room.maxPerMember-1)||!string(room.expiresAt,20,40)
     ||!Number.isFinite(Date.parse(room.expiresAt)))return HOLD;
  if(!ID.test(member.id)||member.assurance!=='SELF_DECLARED'||member.consent!=='USER_INVITATION_WORK')return HOLD;
  if(!int(reply.parentSeq,1,room.headSeq)||!REQUEST.test(reply.requestId)
     ||!Array.isArray(reply.referencedSeqs)||reply.referencedSeqs.length>12
     ||!reply.referencedSeqs.includes(reply.parentSeq)
     ||!reply.referencedSeqs.every(x=>int(x,1,room.headSeq))
     ||new Set(reply.referencedSeqs).size!==reply.referencedSeqs.length)return HOLD;
  if(source.scope!=='WORK'||source.privateModeDataIncluded!==false||!string(source.sourceUrl,10,500)
     ||!source.sourceUrl.startsWith('https://')||!SHA.test(source.sourceDigest)
     ||!string(source.sourceEdition,3,100))return HOLD;
  if(!['predecessor','addition','testableDifference','falsifier'].every(x=>string(change[x],10,500)))return HOLD;
  const m=hsn(focus.node);
  if(!m||focus.registryDigest!==REGISTRY_SHA256||!SHA.test(focus.nodeRecordDigest))return HOLD;
  if(focus.role!==(Number(m[2])<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META'))return HOLD;
  if(focus.role==='EPISTEMIC_META'){
    const subject=hsn(focus.subject);
    if(!subject||subject[1]!==m[1]||Number(subject[2])>7)return HOLD;
  }else if(focus.subject!==null)return HOLD;
  if(evidence.testStatus!=='LOCAL_REVIEW_ONLY'||!int(evidence.testsRun,1,100000)
     ||!int(evidence.testsPassed,0,evidence.testsRun)||!int(evidence.testsFailed,0,evidence.testsRun)
     ||evidence.testsPassed+evidence.testsFailed!==evidence.testsRun
     ||!SHA.test(evidence.testReceiptDigest)||evidence.humanReviewed!==false||evidence.hostVerified!==false)return HOLD;
  if(release.edition!=='ATLAS_COLLAB_V2_PROPOSAL'||release.status!=='SOURCE_ONLY_TESTED_LOCAL'
     ||release.permissionEffect!=='NONE'||release.canonEffect!=='NONE'
     ||release.modelWeightsChanged!==false||release.hostedDeployed!==false)return HOLD;
  if(claims.actuallyPosted!==false||claims.scheduledWakeCount!==0||claims.performedAgentVisits!==0
     ||claims.peerIdentityVerified!==false||claims.semanticAccepted!==false)return HOLD;
  // This is an integrity fingerprint of *selected metadata*, not authentication.
  const review={schema:SCHEMA,roomId:room.id,replyTo:reply.parentSeq,requestId:reply.requestId,
    references:[...reply.referencedSeqs],memberId:member.id,identityAssurance:'SELF_DECLARED',
    sourceRef:source.sourceUrl,sourceDigest:source.sourceDigest,sourceEdition:source.sourceEdition,
    hsn:focus.node,subject:focus.subject,registryDigest:REGISTRY_SHA256,
    claimStatus:'REVIEW_CANDIDATE',testedCases:evidence.testsPassed,reviewedByHumans:false,
    hostAuthenticated:false,canPost:false,canExecute:false,canPublish:false,canRatify:false,completedMacroturns:0,
    falsifier:change.falsifier};
  const fingerprint=createHash('sha256').update(JSON.stringify(review)).digest('hex');
  return Object.freeze({...review,reviewDigest:fingerprint,status:'PREPARED_NOT_POSTED'});
 }catch{return HOLD;}
}
