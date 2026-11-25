/**
 * PR70 R03: one-source-frame A+B=C. Combines existing ORIGINAL peer modules
 * through injection, never issues model requests or certifies rights.
 * The new IEEE754 witness is checked BEFORE peer rank and closure review.
 * Synthetic mocks may be supplied only to local test; the production import
 * imports exact original peer validators from connect-real-peers.mjs.
 */
import {inspectConvergence} from './peer-convergence.mjs';
import {inspectBinaryFrame} from './frame-byte-witness.mjs';
export const SOURCE_SCHEMA='atlas.pr70.one-frame-r03/v1';
function hold(reason){return Object.freeze({schema:SOURCE_SCHEMA,status:'HOLD',reason,canRelease:false,canTrain:false,hostRightsAttested:false,modelCallsAdded:0})}
export function inspectOneFrameR03({root,rawScores,candidateScores,embedding,binding,closureInput,errorBound=0,topK=10,expectedFullFrameSha256=null,peers}={}){
 const witness=inspectBinaryFrame({root,binding,scores:rawScores,embedding,expectedFullFrameSha256});
 if(witness.status!=='LOCAL_MATCHED_FRAME_CUSTODY_ONLY')return hold('BINARY_WITNESS_'+witness.reason);
 let review;
 try {
  review=inspectConvergence({root,rawScores,candidateScores,closureInput,errorBound,topK,
   queryBinding:{requestId:binding.requestId,querySha256:binding.querySha256,
    modelSha256:binding.modelSha256,sourceSha256:binding.sourceSha256}},peers);
 }catch{return hold('PEER_VALIDATION_THROW')}
 if(review.status!=='LOCAL_PEER_CONVERGENCE_REVIEW_ONLY')return hold('PEER_REVIEW_'+review.reason);
 if(review.frameDigest!==witness.legacyJsonFrameDigest||review.modelSha256!==witness.modelSha256||review.sourceSha256!==witness.sourceSha256)return hold('CROSS_PEER_FRAME_MISMATCH');
 return Object.freeze({schema:SOURCE_SCHEMA,status:'LOCAL_COMPOSED_REVIEW_ONLY',
  witnessSha256:witness.fullFrameSha256,orderedHsnSha256:witness.orderedHsnSha256,
  originalAriadneSha256:witness.originalOntologySha256,
  sourceSha256:witness.sourceSha256,sourceEdition:witness.sourceEdition,
  selectedHeadClaimSha256:witness.headSha256,modelSha256:witness.modelSha256,
  primaryIdentity:'ORIGINAL_ARIADNE_HSN',sourceRightsAttested:false,
  requiredSetIndependentlyComplete:false,signedIssuerVerified:false,
  hostFinalReturnVerified:false,glyphEditionRequired:true,
  originalCandidateCount:review.originalCandidateCount,
  peerClosureStatus:review.peerClosureStatus,peerRankStatus:review.peerRankStatus,
  modelCallsAdded:0,canTrain:false,canRelease:false,authorityEffect:'NONE'});
}
