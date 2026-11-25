/**
 * Atlas ONE peer synthesis: one existing issuer, ONE neural score frame, multiple typed Work views.
 * No model, search index, independent rights issuer or parallel controller is created here.
 * This module is a review-only composer atop the ORIGINAL PR67 and PR71 code.
 */
import { types as utilTypes } from 'node:util';
import { createGeometryOne } from '../../atlas-geometry-one-r38/src/fabric.mjs';
import { validateRequest } from '../../atlas-geometry-one-r38/src/contracts.mjs';
import { ARIADNE_SHA256, HSN } from '../../atlas-geometry-one-r38/src/addresses.mjs';
import { inspectIssuedYijing } from '../../atlas-peer-convergence-r01/src/geometree-yijing-r10.mjs';
import { encodeYijing, glyphCoefficients, CUPWAKE_EDITION, SYMBIOSIS_EDITION } from '../../geometry-cleanroom-r0/src/yijing-cymatic.mjs';
import { flatReference } from '../../geometry-cleanroom-r0/src/geometry.mjs';
import { reviewRankStability } from '../../geometry-cleanroom-r0/src/rank-stability.mjs';

export const COMPOSER_SCHEMA='atlas.one.peers.single-issued-frame/v1';
const hold=reason=>Object.freeze({schema:COMPOSER_SCHEMA,status:'HOLD_REVIEW_ONLY',reason,releaseAuthorized:false,hostIssuerVerified:false,modelCallsByComposer:0,authorityEffect:'NONE'});
function objectValue(raw){
 if(raw===null||typeof raw!=='object'||Array.isArray(raw)||utilTypes.isProxy(raw)||Object.getPrototypeOf(raw)!==Object.prototype)throw Error('NON_DATA_OBJECT');
 const descriptors=Object.getOwnPropertyDescriptors(raw),out=Object.create(null);
 for(const key of Reflect.ownKeys(descriptors)){
  const d=descriptors[key];if(typeof key!=='string'||!d.enumerable||!Object.hasOwn(d,'value')||['__proto__','constructor','prototype'].includes(key))throw Error('ACCESSOR_OR_UNSAFE_KEY');
  out[key]=d.value;
 }
 return out;
}
function copyScores(raw){
 if(!Array.isArray(raw)||utilTypes.isProxy(raw)||raw.length!==1728)throw Error('SCORE_SHAPE');
 const ds=Object.getOwnPropertyDescriptors(raw),out=new Array(1728);
 if(Reflect.ownKeys(ds).length!==1729)throw Error('SCORE_EXTRA_OR_SPARSE');
 for(let i=0;i<out.length;i++){
  const d=ds[String(i)];if(!d||!d.enumerable||!Object.hasOwn(d,'value')||typeof d.value!=='number'||!Number.isFinite(d.value))throw Error('SCORE_ACCESSOR_OR_NONFINITE');
  out[i]=d.value;
 }
 return out;
}
/**
 * gateway / rights / requiredClosure must be exact independently selected existing host closures.
 * Caller-supplied fixture callbacks are TESTS ONLY and have no external authority.
 */
export function createOneFramePeerComposer({gateway,rights,requiredClosure,candidates=[]}={}){
 if(typeof gateway!=='function'||typeof rights!=='function'||typeof requiredClosure!=='function')throw Error('EXISTING_HOST_GATE_REQUIRED');
 const capture=new Map(),inflight=new Set();let peerViews=0;
 const existing=createGeometryOne({gateway:async request=>{
  const issued=await gateway(request);const data=objectValue(issued);
  // Store independently validated immutable numeric content, not raw object identity.
  capture.set(request.requestId,copyScores(data.scores));
  return issued;
 },rights,requiredClosure,candidates});
 async function inspect(request,queryBinding,{k=10,alpha=0,profile='CUBOCTAHEDRAL'}={}){
  let r;
  try{r=validateRequest(request);}catch{return hold('INVALID_REQUEST');}
  if(inflight.has(r.requestId))return hold('INFLIGHT_REPLAY');
  inflight.add(r.requestId);
  try{
   const root=await existing.inspect(request,{k,alpha,profile});
   if(root.status!=='INSPECTION_CANDIDATE_ONLY')return hold('GATEWAY_RIGHTS_OR_CLOSURE_HOLD');
   const scores=capture.get(r.requestId);
   if(!scores)return hold('NO_CAPTURED_FULL_FRAME');
   const sidecar=inspectIssuedYijing({root,queryBinding,fullScores:scores,maxHits:k});
   if(sidecar.status!=='LOCAL_SYMBOLIC_INSPECTION_ONLY')return hold('SOURCE_ISSUER_OR_FRAME_DRIFT');
   if(k>root.baseline.hits.length||sidecar.annotated.length!==k)return hold('INCONSISTENT_K');
   const expected=flatReference(scores,k);
   if(expected.some((v,i)=>v.hsn!==sidecar.annotated[i].hsn || v.hsn!==root.baseline.hits[i].hsn || !Object.is(v.score,root.baseline.hits[i].score)))return hold('ORIGINAL_RANK_CHANGED');
   const notes=Object.freeze(sidecar.annotated.map((item,i)=>{
    const cup=encodeYijing(item.hsn,CUPWAKE_EDITION),sym=encodeYijing(item.hsn,SYMBIOSIS_EDITION);
    if(cup.hsn!==sym.hsn||cup.hsn!==item.hsn||!HSN.includes(item.hsn))throw Error('COORDINATE_DRIFT');
    return Object.freeze({hsn:item.hsn,rank:i+1,score:root.baseline.hits[i].score,
      cupwake:Object.freeze({edition:cup.edition,hexagramCode:cup.hexagramCode,contextCode:cup.contextCode}),
      symbiosis:Object.freeze({edition:sym.edition,hexagramCode:sym.hexagramCode,contextCode:sym.contextCode}),
      nineModeCoefficients:glyphCoefficients({edition:cup.edition,hexagramCode:cup.hexagramCode,contextCode:cup.contextCode}),
      physicalFrequencyHz:null,semanticAccepted:false});
   }));
   const review=reviewRankStability({ids:HSN,baseline:scores,candidate:scores,k,errorBound:0});
   // Near ties (including a top-k boundary) remain a review caution, not a fabricated improvement.
   if(!['STABLE_ON_SUPPLIED_SCORES','HOLD_NEAR_TIE'].includes(review.status))return hold('RANK_REVIEW_FAILED');
   const payload=Object.freeze({schema:COMPOSER_SCHEMA,status:'PREPARED_PEER_INSPECTION_ONLY',
     ontologySha256:ARIADNE_SHA256,frameDigest:root.frameDigest,fullScoreSha256:sidecar.fullScoreFrameSha256,
     baselineHits:root.baseline.hits,houseMass:root.baseline.scoreMass.house,sphereMass:root.baseline.scoreMass.sphere,
     notes,rankReviewStatus:review.status,graph:root.projections.GRAPH_FABRIC,meta145:root.projections.META145,
     individualPorts:root.projections,requiredSetIndependentlyComplete:false,
     rightsAtExternalReturnVerified:false,hostIssuerVerified:false,qualityGainVerified:false,
     originalNeuralRankUnchanged:true,modelCallsByComposer:0,
     sourceBodiesIncluded:false,releaseAuthorized:false,trainingAuthorized:false,authorityEffect:'NONE'});
   const consumers=Object.freeze({atlasOne:payload,atlasGPT:payload,atlasIntelligence:payload,swarmchat:payload});
   peerViews++;
   return Object.freeze({status:'PREPARED_PEER_INSPECTION_ONLY',schema:COMPOSER_SCHEMA,
     originalRoot:root,views:consumers,view:payload,aliasesExactlyIdentical:Object.values(consumers).every(v=>v===payload),
     releaseAuthorized:false,hostedVerified:false});
  }catch{return hold('INVALID_PEER_OR_HIDDEN_FRAME');}
  finally{capture.delete(r.requestId);inflight.delete(r.requestId);}
 }
 return Object.freeze({inspect,descriptor:()=>Object.freeze({gateway:existing.descriptor(),peerViews,secondModel:false,extraRetriever:false}),
   schema:COMPOSER_SCHEMA});
}
