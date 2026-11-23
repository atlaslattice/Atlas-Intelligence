/** R09–R20 Twelvefold host integration contract (SOURCE-ONLY, not installed).
 * The existing SwarmChat publisher remains the sole holder of room identity,
 * subscriptions and event delivery. No module import starts external actions.
 * All nodes and plans are candidates, not AI turns, identities or CANON votes.
 */
import {createHash} from 'node:crypto';
export const ARIADNE_SOURCE_SHA256='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
export const WAVE_IDS=Object.freeze(Array.from({length:12},(_,i)=>`R${String(i+9).padStart(2,'0')}`));
export const FOUR_SYSTEMS=Object.freeze(['SwarmChat','Atlas_ONE','Ariadne','Iron_Empire']);
const SHA=/^[a-f0-9]{64}$/;
const NODE=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const ID=/^[A-Za-z0-9_-]{3,80}$/;
const SAFE_RELATIONS=Object.freeze(['PART_OF_SOURCE_SPHERE','PART_OF_SOURCE_HOUSE','SOURCE_ONLY_INDEX_ROOT','LEXICAL_CANDIDATE_NOT_SAME_AS']);
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
const goodId=x=>typeof x==='string'&&ID.test(x);
const goodSha=x=>typeof x==='string'&&SHA.test(x);
const fail=reason=>Object.freeze({status:'HOLD',reason,hostAuthenticated:false,actionPerformed:false,canonEffect:'NONE'});
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');

export function validateStructuralNodeDelta(p){
 if(!isObject(p)||!NODE.test(p.nodeId||'')||p.houseId!==p.nodeId.slice(0,3)||p.sphereId!==p.nodeId.slice(0,7))return fail('NODE_SCOPE_MISMATCH');
 if(!WAVE_IDS.includes(p.wave)||p.registrySha256!==ARIADNE_SOURCE_SHA256||!goodSha(p.nodeRecordSha256)||!goodSha(p.previousNodeWaveDigest)||!goodSha(p.nodeWaveDigest))return fail('SOURCE_EDITION_OR_DIGEST_INVALID');
 if(!['DOMAIN_SPECIALIZATION','EPISTEMIC_META'].includes(p.kind))return fail('NODE_ROLE_INVALID');
 if(!isObject(p.fourSystemIncrementalWork)||FOUR_SYSTEMS.some(s=>!isObject(p.fourSystemIncrementalWork[s])||p.fourSystemIncrementalWork[s].status!=='PROPOSED_NOT_IMPLEMENTED_IN_HOST'))return fail('FOUR_SYSTEM_WORK_NOT_PROPOSAL');
 if(['semanticReviewAccepted','realPeerMacroturnPerformed','hostedVerified','canonAdopted','storyCanonLocked','protectedModesIngested'].some(k=>p[k]!==false)||p.rightsEffect!=='NONE')return fail('UNVERIFIED_AUTHORITY_OR_PRIVATE_CONTENT');
 if(typeof p.acceptanceGate!=='string'||!p.acceptanceGate.length)return fail('MISSING_ACCEPTANCE_GATE');
 return Object.freeze({status:'SOURCE_CANDIDATE_VALIDATED_STRUCTURALLY',sourceOnly:true,nodeId:p.nodeId,wave:p.wave,
    houseId:p.houseId,sphereId:p.sphereId,sourceDigest:p.nodeRecordSha256,
    previousDigest:p.previousNodeWaveDigest,structuralDigest:p.nodeWaveDigest,
    testedSourceBytesHere:false,reviewAccepted:false,hostVerified:false,canonEffect:'NONE'});
}

/** Host can apply the returned intent only with an authenticated, current grant.
 * A client can forge hostContext: our output never calls it authenticated.
 */
export function prepareSwarmChatHandoff({delta,room,hostContext,join,consent,nowMs}={}){
 const checked=validateStructuralNodeDelta(delta);if(checked.status==='HOLD')return checked;
 if(!isObject(room)||room.kind!=='work'||room.status!=='open'||!goodId(room.roomId)||!goodId(room.tenant)||!goodId(room.account))return fail('WORK_ROOM_NOT_AUTHORIZED');
 const expiry=Date.parse(room.expiresAt);
 if(!Number.isSafeInteger(nowMs)||nowMs<0||!Number.isFinite(expiry)||nowMs>=expiry)return fail('WORK_ROOM_EXPIRED');
 if(!isObject(hostContext)||!['tenant','account','principal'].every(k=>goodId(hostContext[k]))||!Number.isSafeInteger(hostContext.rightsEpoch)||hostContext.rightsEpoch<0||hostContext.mode!=='WORK'||hostContext.tenant!==room.tenant||hostContext.account!==room.account)return fail('CURRENT_HOST_SESSION_REQUIRED');
 if(!isObject(join)||join.roomId!==room.roomId||join.tenant!==hostContext.tenant||join.account!==hostContext.account||join.principal!==hostContext.principal||join.rightsEpoch!==hostContext.rightsEpoch||join.authenticatedByHost!==true)return fail('CURRENT_HOST_JOIN_REQUIRED');
 if(!isObject(consent)||consent.optIn!==true||consent.roomId!==room.roomId||consent.tenant!==hostContext.tenant||consent.account!==hostContext.account||consent.principal!==hostContext.principal||consent.rightsEpoch!==hostContext.rightsEpoch||consent.purpose!=='WORK_EVENT'||!goodSha(consent.termsDigest))return fail('CURRENT_OPT_IN_REQUIRED');
 if(!Number.isSafeInteger(room.remainingMessages)||room.remainingMessages<1||!Number.isSafeInteger(room.remainingMemberMessages)||room.remainingMemberMessages<1||!Number.isSafeInteger(room.maxHops)||room.maxHops<1)return fail('HOST_CAPACITY_UNAVAILABLE');
 const binding={tenant:hostContext.tenant,account:hostContext.account,principal:hostContext.principal,rightsEpoch:hostContext.rightsEpoch,roomId:room.roomId,sourceNode:delta.nodeId,sourceWave:delta.wave,sourceDigest:delta.nodeWaveDigest,expiresAt:room.expiresAt,purpose:'WORK_EVENT'};
 return Object.freeze({schema:'atlas.twelvefold.work-handoff/v1',status:'PREPARED_NOT_POSTED',intentDigest:digest(binding),
   hostBinding:binding,hostAuthentication:'CALLER_CLAIM_NOT_ATTESTED',
   needsCurrentHostReadAndReturn:true,needsPublisherSubscription:true,
   nextAction:'HOST_PUBLISHER_ADMISSION_REQUIRED',roomCreated:false,subscriptionInstalled:false,messagePosted:false,modelWoke:false,
   actionPerformed:false,canonEffect:'NONE'});
}

/** Twelve source stages are an ordered reproducible review cycle, not twelve AI lives. */
export function validateWaveReceiptSummary({waves,sourceRegistryDigest}={}){
 if(sourceRegistryDigest!==ARIADNE_SOURCE_SHA256||!Array.isArray(waves)||waves.length!==12)return fail('WAVE_SOURCE_OR_COUNT_INVALID');
 let previous=null;
 for(let i=0;i<12;i++){
   const w=waves[i];if(!isObject(w)||w.wave!==WAVE_IDS[i]||!goodSha(w.prevStateSha256)||!goodSha(w.stateSha256)||w.realPeerVisitsCompleted!==0||w.hostedIntegrations!==0||w.nodeWorkDeltasGenerated!==1728||w.totalComputationalEvaluations!==269568)return fail('WAVE_RECEIPT_INCONSISTENT');
   if(previous!==null&&previous!==w.prevStateSha256)return fail('WAVE_LINEAGE_BROKEN');
   previous=w.stateSha256;
 }
 return Object.freeze({status:'SOURCE_REVIEW_CHAIN_SUMMARY_ONLY',waves:12,computationalComparisons:3234816,localCandidateDeltas:20736,
  finalDigest:previous,recomputationOfRawSourcePerformed:false,actualModelMacroturnVisits:0,hostedDeployments:0,canonEffect:'NONE'});
}

export function prepareFourSystemCascade(delta){
 const checked=validateStructuralNodeDelta(delta);if(checked.status==='HOLD')return checked;
 const work={};
 for(const s of FOUR_SYSTEMS){const original=delta.fourSystemIncrementalWork[s];if(typeof original.proposal!=='string'||!original.proposal.trim())return fail('MISSING_SYSTEM_CHANGE_PROPOSAL');
   work[s]={engineeringQuestion:original.proposal,sourceOnly:true,hostAction:false,approval:'NOT_GIVEN_BY_COMPILER',node:delta.nodeId,wave:delta.wave};}
 return Object.freeze({schema:'atlas.twelvefold.cascade-candidate/v1',status:'CANDIDATE_NOT_POSTED',
  source:{registrySha256:delta.registrySha256,node:delta.nodeId,nodeDigest:delta.nodeRecordSha256,wave:delta.wave},
  ancestry:{from:delta.nodeId,toSphere:delta.sphereId,toHouse:delta.houseId,root:'ATLAS_ONE_INDEX',relation:'STRUCTURAL_ONLY'},
  work,conceptualScale:1728,accessRights:'UNVERIFIED',
  semanticReview:'NOT_PERFORMED',peerExchange:'NOT_PERFORMED',hostedDeployment:'NOT_PERFORMED',canonEffect:'NONE'});
}

export function validateCandidateLink(e){
 if(!isObject(e)||typeof e.from!=='string'||typeof e.to!=='string'||!SAFE_RELATIONS.includes(e.relation)||e.authorityEffect!=='NONE')return fail('UNAUTHORIZED_OR_AMBIGUOUS_EDGE');
 if(e.relation==='LEXICAL_CANDIDATE_NOT_SAME_AS'&&e.reviewAccepted!==false)return fail('LEXICAL_NOT_REVIEWED');
 if(['SAME_AS','CANON','AUTHENTICATED_RESIDENT'].includes(e.relation))return fail('ILLEGAL_RELATION_PROMOTION');
 return Object.freeze({status:'SOURCE_RELATION_CANDIDATE',relation:e.relation,sourceOnly:true,semanticAccepted:false,permissionsGranted:false,canonEffect:'NONE'});
}

/** Independent cross-language canonical byte recheck for source-only packets.
 * Does not authenticate an issuer; caller-controlled digests cannot grant rights.
 * Bounds shape, depth, total keys and bytes before hashing. Reject accessors.
 */
export function verifyNodeWaveDigest(packet){
 if(!isObject(packet))return fail('NODE_DIGEST_MISSING');
 const seen=new WeakSet();let total=0;
 function ordered(x,depth=0){
   if(depth>24||++total>2000)throw Error('CANONICAL_COMPLEXITY_LIMIT');
   if(x===null||typeof x==='string'||typeof x==='boolean'||(typeof x==='number'&&Number.isFinite(x)))return x;
   if(Array.isArray(x)){
     if(seen.has(x))throw Error('CANONICAL_CYCLE');seen.add(x);
     const out=x.map(v=>ordered(v,depth+1));seen.delete(x);return out;
   }
   if(!isObject(x)||seen.has(x))throw Error('CANONICAL_NONPLAIN_OR_CYCLE');
   seen.add(x);const out={};
   for(const k of Object.keys(x).sort()){
     const descriptor=Object.getOwnPropertyDescriptor(x,k);
     if(!descriptor||!('value' in descriptor))throw Error('CANONICAL_ACCESSOR_DENIED');
     out[k]=ordered(descriptor.value,depth+1);
   }
   seen.delete(x);return out;
 }
 let clean,bytes;try{
   clean=ordered(packet);
   if(!goodSha(clean.nodeWaveDigest))return fail('NODE_DIGEST_MISSING');
   const copy={...clean};delete copy.nodeWaveDigest;
   bytes=Buffer.from(JSON.stringify(copy),'utf8');
 }catch{return fail('CANONICAL_SOURCE_SHAPE_INVALID')}
 const checked=validateStructuralNodeDelta(clean);if(checked.status==='HOLD')return checked;
 if(bytes.length>32768)return fail('NODE_DIGEST_BYTES_LIMIT');
 const actual=createHash('sha256').update(bytes).digest('hex');
 if(actual!==clean.nodeWaveDigest)return fail('NODE_WAVE_DIGEST_MISMATCH');
 return Object.freeze({status:'LOCAL_PACKET_HASH_REPRODUCED',sourceOnly:true,sourceRegistrySha256:ARIADNE_SOURCE_SHA256,
  nodeId:clean.nodeId,wave:clean.wave,nodeWaveDigest:actual,hostAuthenticated:false,canonEffect:'NONE'});
}
