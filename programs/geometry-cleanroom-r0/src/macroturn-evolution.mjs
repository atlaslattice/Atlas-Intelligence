/**
 * A MacroTurn is an auditable change in a Work process, not an arbitrary post.
 * This module only PREPARES next-step review: never schedules, posts, credits,
 * creates agents, delegates rights, updates CANON or modifies model weights.
 */
import {createHash} from 'node:crypto';
import {types as utilTypes} from 'node:util';
import {encodeYijing,TRIGRAMS,BRIDGE_SCHEMA,EDITIONS} from './yijing-cymatic.mjs';
import {ARIADNE_SHA256,decodeAddress} from './geometry.mjs';
const HEX=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,119}$/;
const HOLDS=Object.freeze({
  NUMERICAL_CANCEL:'Challenge the same-function near-cancellation and signed-zero cases against a dense oracle.',
  RANK_NEAR_TIE:'Require independently bounded score errors and exact top-k boundary comparisons.',
  MISSING_SOURCE:'Recover exact source edition and SHA-256 before carrying earlier test claims.',
  SOURCE_CONTEXT_DIVERGENCE:'Compare separately authorized host-source sets, not merely identical HSN IDs.',
  RIGHTS_NOT_ATTESTED:'Recheck current READ/INFERENCE_USE/DISCLOSE/RETURN with a host-attested issuer.',
  MISSING_NEGATIVE:'Pin required negative receipt/dependency/dissent closure independently of the caller.',
  CULTURAL_UNREVIEWED:'Document exact Yijing cultural source and distinguish symbolic borrowing from scientific evidence.',
  NO_HELDOUT_LABELS:'Run fair family/time-separated human judgments against flat and shuffled controls.',
  UNKNOWN_OPERATOR:'Do not compose incompatible kernels; independently compare common mathematical functions.',
});
export const MACROTURN_SCHEMA='atlas.macroturn.evolution.prepare/v1';
function safe(v,keys){if(!v||typeof v!=='object'||Array.isArray(v)||utilTypes.isProxy(v)||Object.getPrototypeOf(v)!==Object.prototype)throw Error('BAD_RECORD');
 const d=Object.getOwnPropertyDescriptors(v),k=Reflect.ownKeys(d);if(k.length!==keys.length||k.some(x=>typeof x!=='string'||!keys.includes(x)))throw Error('FIELDS');const o={};for(const key of keys){const x=d[key];if(!x||!x.enumerable||!Object.hasOwn(x,'value'))throw Error('ACCESSOR');o[key]=x.value;}return o;}
function arr(v,n){if(!Array.isArray(v)||utilTypes.isProxy(v)||v.length>n)throw Error('BAD_ARRAY');const d=Object.getOwnPropertyDescriptors(v);if(Reflect.ownKeys(d).length!==v.length+1)throw Error('SPARSE_OR_EXTRA');return Array.from({length:v.length},(_,i)=>{const e=d[i];if(!e||!e.enumerable||!Object.hasOwn(e,'value'))throw Error('ACCESSOR_ARRAY');return e.value;});}
function txt(s,max=400){return typeof s==='string'&&s.length>0&&s.length<=max&&!/[<>\u0000-\u001f]/.test(s);}
function hex(s){return typeof s==='string'&&HEX.test(s)}
function hash(v){return createHash('sha256').update(JSON.stringify(v)).digest('hex')}
const held=reason=>Object.freeze({schema:MACROTURN_SCHEMA,status:'HOLD',reason,campaignCredit:0,autoPost:false,autoTrain:false,hostedVerified:false});
/**
 * Consume one exact user-requested engineering hypothesis and peer source references.
 * A source reference confirms *declared* edition/hash, NOT access rights or peer identity.
 */
export function prepareEvolvingMacroturn(input){
 try {
  const root=safe(input,['packetId','subjectHsn','lensEdition','parentReceiptSha256','sourceRefs','peerRefs','hypothesis','negativeEvidence','priorCandidateDigests']);
  if(!ID.test(root.packetId)||!hex(root.parentReceiptSha256)||!EDITIONS.includes(root.lensEdition))throw Error('BAD_ROOT');
  decodeAddress(root.subjectHsn);
  const sources=arr(root.sourceRefs,24).map(v=>{const s=safe(v,['id','edition','sha256','mode']);if(!ID.test(s.id)||!txt(s.edition,100)||!hex(s.sha256)||s.mode!=='WORK')throw Error('BAD_SOURCE');return Object.freeze(s);});
  if(sources.length<2||new Set(sources.map(s=>s.id+':'+s.edition)).size!==sources.length)throw Error('MISSING_DISTINCT_SOURCES');
  const peers=arr(root.peerRefs,24).map(v=>{const p=safe(v,['roomId','seq','kind']);if(!ID.test(p.roomId)||!Number.isInteger(p.seq)||p.seq<1||p.seq>100000||!['CODE','REVIEW','NEGATIVE','PROPOSAL'].includes(p.kind))throw Error('BAD_PEER');return Object.freeze(p);});
  const h=safe(root.hypothesis,['a','b','c','falsifier','measure']);if(Object.values(h).some(s=>!txt(s,500)))throw Error('BAD_HYPOTHESIS');
  const negatives=arr(root.negativeEvidence,16);if(negatives.length<1||negatives.some(x=>!Object.hasOwn(HOLDS,x))||new Set(negatives).size!==negatives.length)throw Error('MISSING_TYPED_NEGATIVE');
  const history=arr(root.priorCandidateDigests,1024);if(history.some(s=>!hex(s))||new Set(history).size!==history.length)throw Error('BAD_HISTORY');
  const y=encodeYijing(root.subjectHsn,root.lensEdition);
  const material={schema:MACROTURN_SCHEMA,packetId:root.packetId,subjectHsn:root.subjectHsn,registrySha256:ARIADNE_SHA256,parentReceiptSha256:root.parentReceiptSha256,
   sourceRefs:sources,peerRefs:peers,hypothesis:Object.freeze(h),negativeEvidence:Object.freeze(negatives.slice()),
   yijingLens:Object.freeze({edition:root.lensEdition,hexagramCode:y.hexagramCode,contextCode:y.contextCode,lower:TRIGRAMS[y.lowerTrigram],upper:TRIGRAMS[y.upperTrigram],meaning:'BRAINSTORMING_ONLY'}),
   recommendedFalsifier:HOLDS[negatives[0]]};
  const digest=hash(material);
  if(history.includes(digest))return held('DUPLICATE_SAME_SOURCE_AND_HYPOTHESIS');
  return Object.freeze({...material,digest,status:'PREPARED_FOR_PEER_REVIEW_NOT_EXECUTED',
   proposedMethodEvolution:true,requiredClosureIndependentlyAttested:false,
   peerIdentitiesAuthenticated:false,workRoomPostCreated:false,macroturnCompleted:false,campaignCredit:0,modelUpdated:false,autoPost:false,autoTrain:false,authorityEffect:'NONE'});
 }catch(e){return held('INPUT_NOT_VERIFIED:'+String(e.message).slice(0,60));}
}
/** Keep history immutable when the negative evidence changes; no promotion. */
export function proposeMacroturnRevision(oldReceipt,change){
 try{
  if(!oldReceipt||typeof oldReceipt!=='object'||utilTypes.isProxy(oldReceipt)||Object.getPrototypeOf(oldReceipt)!==Object.prototype)throw Error('UNVERIFIED_PARENT');
  const parentD=Object.getOwnPropertyDescriptors(oldReceipt);
  if(!parentD.schema||!Object.hasOwn(parentD.schema,'value')||parentD.schema.value!==MACROTURN_SCHEMA||!parentD.status||parentD.status.value!=='PREPARED_FOR_PEER_REVIEW_NOT_EXECUTED'||!parentD.digest||!hex(parentD.digest.value))throw Error('UNVERIFIED_PARENT');
  const c=safe(change,['negativeEvidence','newPeerRef','revisedFalsifier']);
  const negativeEvidence=arr(c.negativeEvidence,16);if(negativeEvidence.length<1||negativeEvidence.some(x=>!Object.hasOwn(HOLDS,x)))throw Error('BAD_NEGATIVE');
  const p=safe(c.newPeerRef,['roomId','seq','kind']);if(!ID.test(p.roomId)||!Number.isInteger(p.seq)||p.seq<1||p.seq>100000||p.kind!=='NEGATIVE')throw Error('BAD_PEER');
  if(!txt(c.revisedFalsifier))throw Error('BAD_FALSIFIER');
  const update=Object.freeze({schema:MACROTURN_SCHEMA,predecessorDigest:parentD.digest.value,negativeEvidence:Object.freeze(negativeEvidence.slice()),
   peerRef:Object.freeze(p),revisedFalsifier:c.revisedFalsifier,methodRevisionDigest:hash({p:parentD.digest.value,neg:negativeEvidence,peer:p,falsifier:c.revisedFalsifier}),
   status:'REVISED_DESIGN_NOT_EXECUTED',campaignCredit:0,releaseAuthorized:false,authorityEffect:'NONE'});
  return update;
 }catch(e){return held('INVALID_REVISION:'+String(e.message).slice(0,50));}
}
export const MACROTURN_HOLD_CODES=Object.freeze({...HOLDS});
