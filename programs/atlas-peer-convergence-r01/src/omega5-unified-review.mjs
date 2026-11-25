/**
 * Atlas Ω5 — one already-issued frame, three REAL peer modules, one local review.
 * PR70 exact convergence envelope + PR71 exact symbolic/full-frame inspection
 * + PR69 Omega4 review. This creates NO neural/runtime/gateway/rights service.
 * It is a non-promoting peer-reconciliation draft and cannot release bytes.
 */
import {createHash} from 'node:crypto';
import {types as utilTypes} from 'node:util';
import {inspectIssuedYijing, YIJING_CODECS, yijingDecode} from './geometree-yijing-r10.mjs';
import {prepareOmega4PeerReview} from '../../atlas-geometry-one-r38/src/omega4-peer-review.mjs';

export const OMEGA5_SCHEMA='atlas.omega5.peer-reconciliation/v1';
const HEX=/^[a-f0-9]{64}$/;
const PRIMARY='cupwake-x4/v1';
const negative=reason=>Object.freeze({schema:OMEGA5_SCHEMA,status:'HOLD',reason,releaseAuthorized:false,
 hostRightsVerified:false,modelCalls:0,modelUpdated:false,canTrain:false,canonChanged:false,authorityEffect:'NONE'});
function det(x,depth=0,seen=new WeakSet()){
 if(depth>16)throw Error('DEPTH_LIMIT');
 if(x===null||typeof x==='string'||typeof x==='boolean'||(typeof x==='number'&&Number.isFinite(x)))return x;
 if(!x||typeof x!=='object'||utilTypes.isProxy(x)||seen.has(x))throw Error('NON_DATA_VALUE');
 if(!Array.isArray(x)&&Object.getPrototypeOf(x)!==Object.prototype&&Object.getPrototypeOf(x)!==null)throw Error('NON_PLAIN_OBJECT');
 seen.add(x);const ds=Object.getOwnPropertyDescriptors(x),names=Reflect.ownKeys(ds);
 if(names.length>2049)throw Error('OBJECT_SIZE');let r;
 if(Array.isArray(x)){
  if(x.length>1728||names.length!==x.length+1)throw Error('ARRAY_FIELDS');r=[];
  for(let i=0;i<x.length;i++){
   const d=ds[String(i)];if(!d||!d.enumerable||!Object.hasOwn(d,'value'))throw Error('ARRAY_GETTER_OR_HOLE');
   r.push(det(d.value,depth+1,seen));
  }
 } else {
  if(names.length>128)throw Error('OBJECT_FIELDS');r={};
  for(const n of names){
   const d=ds[n];if(typeof n!=='string'||!d.enumerable||!Object.hasOwn(d,'value')||['__proto__','prototype','constructor'].includes(n))throw Error('UNSAFE_FIELD');
   Object.defineProperty(r,n,{value:det(d.value,depth+1,seen),enumerable:true,writable:true,configurable:true});
  }
 }
 seen.delete(x);return r;
}
function sha(b){return createHash('sha256').update(b).digest('hex');}
function fullBytes(scores){
 if(!Array.isArray(scores)||scores.length!==1728||scores.some(x=>typeof x!=='number'||!Number.isFinite(x)))throw Error('FULL_FRAME_REQUIRED');
 const bytes=Buffer.alloc(1728*8);
 for(let i=0;i<1728;i++)bytes.writeDoubleLE(scores[i],i*8);
 return sha(Buffer.concat([Buffer.from('atlas.f64le.ordered-scores/v1\0'),bytes]));
}
function exact(o,fields){return o&&typeof o==='object'&& !Array.isArray(o)&&Object.keys(o).sort().join('|')===fields.slice().sort().join('|')}
/**
 * `pins` are an independently-prepared *claim* to the exact bytes, not a host
 * attestation. To authenticate, the existing host MUST provide independent
 * trusted anchors and repeat USE/RETURN under an atomic final transport fence.
 */
export function composeOmega5({root,convergence,peerRecords,queryBinding,fullScores,pins,maxHits=10}={}){
 try{
  const r=det(root),c=det(convergence),records=det(peerRecords),q=det(queryBinding),p=det(pins),scores=det(fullScores);
  const pinFields=['frameDigest','fullScoreFrameSha256','bindingScopeSha256','sourceSha256','modelSha256','ontologySha256','rightsEpoch','requiredSetSha256'];
  if(!exact(p,pinFields)||!Object.values(p).every(x=>typeof x==='string'&&x.length>0))throw Error('PIN_SHAPE');
  if(!['frameDigest','fullScoreFrameSha256','bindingScopeSha256','sourceSha256','modelSha256','ontologySha256','requiredSetSha256'].every(k=>HEX.test(p[k])))throw Error('PIN_DIGEST');
  if(!exact(q,['requestId','querySha256','modelSha256','sourceSha256','tenant','principal','rightsEpoch','sourceEdition','purpose','requiredSetSha256']))throw Error('QUERY_SHAPE');
  if(!r||r.schema!=='atlas.geometry-one.root/v1'||r.status!=='INSPECTION_CANDIDATE_ONLY'||r.releaseAuthorized!==false||r.activationCount!==1||r.canTrain!==false||r.canDeploy!==false||r.sourceScope!=='WORK')throw Error('ROOT_NOT_ISSUED_INSPECTION');
  if(!r.sourcePins||r.sourcePins.registrySha256!==p.ontologySha256||r.sourcePins.sourceSha256!==p.sourceSha256||r.sourcePins.modelSha256!==p.modelSha256||r.rightsEpoch!==p.rightsEpoch||r.frameDigest!==p.frameDigest||q.requiredSetSha256!==p.requiredSetSha256||q.rightsEpoch!==p.rightsEpoch||q.sourceSha256!==p.sourceSha256||q.modelSha256!==p.modelSha256)throw Error('SOURCE_RIGHTS_EDITION_DRIFT');
  // Verify full 1728-score bytes, not only 12 visible hits. Preserve signed zero.
  if(fullBytes(scores)!==p.fullScoreFrameSha256)throw Error('HIDDEN_SCORE_FRAME_DRIFT');
  const s=inspectIssuedYijing({root:r,queryBinding:q,fullScores:scores,maxHits});
  if(s.status!=='LOCAL_SYMBOLIC_INSPECTION_ONLY'||s.fullScoreFrameSha256!==p.fullScoreFrameSha256||s.bindingScopeSha256!==p.bindingScopeSha256||s.frameDigest!==p.frameDigest)throw Error('PR71_REVIEW_OR_SCOPE_HOLD');
  if(!Array.isArray(s.annotated)||s.annotated.length===0||s.annotated.some(x=>x.yijing.codec!==PRIMARY||x.yijing.hsn!==x.hsn||yijingDecode(x.yijing)!==x.hsn))throw Error('CANONICAL_SYMBOLIC_DRIFT');
  if(!c||c.schema!=='atlas.peer-convergence.review/v1'||c.status!=='LOCAL_PEER_CONVERGENCE_REVIEW_ONLY'||c.frameDigest!==p.frameDigest||c.sourceSha256!==p.sourceSha256||c.modelSha256!==p.modelSha256||c.originalRegistrySha256!==p.ontologySha256||c.releaseAuthorized!==false||c.peerRankStatus!=='STABLE_ON_SUPPLIED_SCORES'||c.peerClosureStatus!=='MATCHED_PINNED_METADATA'||c.currentSourceRightsAttested!==false||c.requiredSetIndependentlyComplete!==false)throw Error('PR70_REVIEW_HOLD');
  if(!Array.isArray(c.originalCandidateHsn)||c.originalCandidateHsn.length!==r.baseline.hits.length||c.originalCandidateHsn.some((v,i)=>v!==r.baseline.hits[i].hsn))throw Error('PR70_RANK_DRIFT');
  const review=prepareOmega4PeerReview({inspection:r,peerRecords:records,independentlyPinned:{sourceSha256:p.sourceSha256,modelSha256:p.modelSha256,frameDigest:p.frameDigest,rightsEpoch:p.rightsEpoch}});
  if(review.status!=='PREPARED_NOT_RELEASED'||review.originalFrameDigest!==p.frameDigest||review.sourceSha256!==p.sourceSha256||review.modelSha256!==p.modelSha256||review.releaseAuthorized!==false)throw Error('PR69_REVIEW_HOLD');
  return Object.freeze({schema:OMEGA5_SCHEMA,status:review.openObjections?'LOCAL_REVIEW_WITH_UNRESOLVED_OBJECTIONS':'LOCAL_RECONCILIATION_NOT_HOSTED',
   ontologySha256:p.ontologySha256,frameDigest:p.frameDigest,fullScoreFrameSha256:p.fullScoreFrameSha256,
   sourceSha256:p.sourceSha256,modelSha256:p.modelSha256,claimedRightsEpoch:p.rightsEpoch,
   bindingScopeSha256:p.bindingScopeSha256,requiredSetClaimSha256:p.requiredSetSha256,
   peerDigest:review.peerDigest,peerCount:review.peerCount,openObjections:review.openObjections,
   fullFrameVerifiedAgainstSuppliedPins:true,rankParityAgainstPr70:true,
   symbolicEdition:PRIMARY,otherYijingEditions:'LEGACY_READ_ONLY_NOT_IDENTITY',
   structuralHouses:12,structuralSpheres:144,structuralNodes:1728,
   interpretedEvidenceStatus:'UNREVIEWED',sourceBodiesIncluded:false,modelCalls:0,
   hostRightsVerified:false,independentSourceAuthorization:false,requiredSetIndependentlyComplete:false,
   releaseAuthorized:false,canTrain:false,canDeploy:false,canonChanged:false,authorityEffect:'NONE'});
 }catch(e){return negative(e instanceof Error&&/^[A-Z0-9_]+$/.test(e.message)?e.message:'UNTRUSTED_INPUT');}
}
