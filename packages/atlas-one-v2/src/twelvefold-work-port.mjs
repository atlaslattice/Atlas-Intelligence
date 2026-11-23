/** Atlas Twelvefold R09 — pure Work handoff preparation, NOT a hosted SwarmChat connector.
 * Reuses the ONE existing SwarmChat Work broker and Atlas ONE v2 review port.
 * No D1 reads/writes, model turns, resident claims, Private/Play/Imagine import, CANON or story adoption.
 */
import {createHash} from 'node:crypto';
export const ARIADNE_REGISTRY_SHA='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
const COORD=/^H(?:0[1-9]|1[0-2])\.S(?:0[1-9]|1[0-2])\.N(?:0[1-9]|1[0-2])$/;
const ID=/^[A-Za-z0-9_-]{3,80}$/;const SHA=/^[a-f0-9]{64}$/;
const PASS=/^P(?:0[1-9]|1[0-2])$/;
const KEYS=new Set(['node','source','room','session','rights','passId','nowMs']);
const NONE=Object.freeze({schema:'atlas.twelvefold.work-port/v1',status:'HOLD',reason:'WORK_UNAVAILABLE',
  reviewIntent:null,content:null,postsPerformed:0,hostAuthenticated:false,authorityEffect:'NONE',canonEffect:'NONE'});
const fail=()=>NONE;
function snapshotOwnData(obj,allowed,required=allowed){
  try{
    if(obj===null||typeof obj!=='object'||Array.isArray(obj)||![null,Object.prototype].includes(Object.getPrototypeOf(obj)))return null;
    const descriptors=Object.getOwnPropertyDescriptors(obj);
    const keys=Reflect.ownKeys(descriptors);
    if(keys.some(k=>typeof k!=='string'||!allowed.includes(k)||!descriptors[k].enumerable||!Object.hasOwn(descriptors[k],'value')))return null;
    if(required.some(k=>!Object.hasOwn(descriptors,k)))return null;
    const result=Object.create(null);
    for(const key of keys)result[key]=descriptors[key].value;
    return result;
  }catch{return null;}
}
function scalar(x,max=300){
  if(typeof x!=='string'||x.length<1||x.length>max||/[\u0000-\u001f]/.test(x))return false;
  for(let i=0;i<x.length;i++){const c=x.charCodeAt(i);if(c>=0xd800&&c<=0xdbff){let d=x.charCodeAt(++i);if(!(d>=0xdc00&&d<=0xdfff))return false;}else if(c>=0xdc00&&c<=0xdfff)return false;}
  return true;
}
const sha=s=>createHash('sha256').update(s).digest('hex');
/** Prepare one source-only candidate. Caller-provided rights are NOT issuer proof.
 * The publisher must verify tenant, account, principal, consent, source and epoch
 * itself, and atomically recheck rights at RETURN before any actual post.
 */
export function prepareWorkHandoff(input){
 try{
  const root=snapshotOwnData(input,[...KEYS]);if(!root)return fail();
  const node=snapshotOwnData(root.node,['coordinate','digest','sourceEdition','registrySha','mode','passCount']);
  const source=snapshotOwnData(root.source,['roomId','seq','requestId','digest','kind']);
  const room=snapshotOwnData(root.room,['roomId','kind','status','expiresAt','tenant','account']);
  const session=snapshotOwnData(root.session,['tenant','account','principal','rightsEpoch','mode']);
  const rights=snapshotOwnData(root.rights,['read','returnRight','consent','rightsEpoch']);
  if(!node||!source||!room||!session||!rights)return fail();
  if(!COORD.test(node.coordinate)||!SHA.test(node.digest)||node.sourceEdition!=='Ariadne v0.7'
      ||node.registrySha!==ARIADNE_REGISTRY_SHA||node.mode!=='WORK'||node.passCount!==12)return fail();
  if(!ID.test(source.roomId)||source.roomId!==room.roomId||!Number.isSafeInteger(source.seq)||source.seq<1
      ||!scalar(source.requestId,80)||!SHA.test(source.digest)||source.kind!=='WORK')return fail();
  if(!ID.test(room.roomId)||room.kind!=='work'||room.status!=='open'
      ||!Number.isSafeInteger(root.nowMs)||root.nowMs<0||!Number.isFinite(Date.parse(room.expiresAt))
      ||root.nowMs>=Date.parse(room.expiresAt))return fail();
  if(!ID.test(room.tenant)||!ID.test(room.account)||!ID.test(session.tenant)||!ID.test(session.account)
      ||!ID.test(session.principal)||room.tenant!==session.tenant||room.account!==session.account
      ||session.mode!=='WORK'||!Number.isSafeInteger(session.rightsEpoch)||session.rightsEpoch<0)return fail();
  if(rights.read!==true||rights.returnRight!==true||rights.consent!==true||rights.rightsEpoch!==session.rightsEpoch)return fail();
  if(!PASS.test(root.passId))return fail();
  const stableKey=sha(JSON.stringify([node.coordinate,node.digest,root.passId,room.roomId,source.seq,source.digest,session.rightsEpoch]));
  const reviewIntent=Object.freeze({schema:'atlas.twelvefold.work-intent/v1',coordinate:node.coordinate,
    sourceNodeSHA256:node.digest,registrySHA256:ARIADNE_REGISTRY_SHA,passId:root.passId,
    originalWorkRef:Object.freeze({roomId:source.roomId,seq:source.seq,requestId:source.requestId,digest:source.digest}),
    tenant:session.tenant,account:session.account,principal:session.principal,rightsEpoch:session.rightsEpoch,
    proposedRequestId:'atlas-twelvefold-'+stableKey.slice(0,40),mode:'WORK',effect:'PREPARED_NOT_POSTED',
    workAccessVerifiedByHost:false,needsFreshReturnRecheck:true,requiresExplicitPublisherAction:true,
    privateModeImported:false,storyCanonEffect:'NONE',authorityEffect:'NONE'});
  return Object.freeze({schema:'atlas.twelvefold.work-port/v1',status:'PREPARED_ONLY_HOST_RECHECK_REQUIRED',
      reviewIntent,content:null,postsPerformed:0,hostAuthenticated:false,authorityEffect:'NONE',canonEffect:'NONE'});
 }catch{return fail();}
}
export function prepareFourSystemContract({coordinate,digest:nodeDigest,mode='WORK',passId='P12'}={}){
 if(typeof coordinate!=='string'||!COORD.test(coordinate)||!SHA.test(nodeDigest||'')||!PASS.test(passId))return fail();
 if(mode!=='WORK')return fail();
 return Object.freeze({schema:'atlas.twelvefold.four-systems/v1',status:'SOURCE_ONLY_NOT_HOSTED',coordinate,
    sourceNodeSHA256:nodeDigest,passId,
    adapters:Object.freeze({SwarmChat:'existing Work read/return broker',AtlasONE:'Atlas ONE v2 circuit/workburst',
      Ariadne:'edition-locked typed source graph',IronEmpire:'public-safe fictional continuity reviewer'}),
    behavior:'NON_EXECUTING_INTERFACE',modelTurns:0,workPosts:0,privateBodyImports:0,hostVerified:false,
    authorityEffect:'NONE',canonEffect:'NONE',fictionCanonEffect:'NONE'});
}
