/** Additive scope gate for the EXISTING Whole144 source-bound candidate ingress.
 * There is no dispatcher or WorkBurst invocation. Work-mode eligibility, rights,
 * semantic review and host action remain independent gates.
 */
import {proposeSourceBoundCandidateGraph} from './whole-144-compounding.mjs';
import {prepareSourceScopeEvidence,snapshotScopeInput,exactScopeKeys,scopeDigest,scopeHold,
 SCOPE_NAMESPACE,SCOPE_EDITION,SCOPE_REGISTRY_SHA256,MAX_SCOPE_NODES} from './source-scope-evidence.mjs';

export function proposeScopeMatchedCandidateGraph(program,registryBytes,input){
 try{
  const inertProgram=snapshotScopeInput(program);
  const request=snapshotScopeInput(input);
  if(!exactScopeKeys(request,['mode','query','bindings'],['links','projectReviewContext'])||request.mode!=='WORK')
   return scopeHold('SCOPE_INGRESS_REQUEST_INVALID');
  if(!Array.isArray(request.bindings)||request.bindings.length<1||request.bindings.length>MAX_SCOPE_NODES||
     request.bindings.some(b=>!exactScopeKeys(b,['candidateId','node'])||
       !exactScopeKeys(b.node,['namespace','edition','nodeId','recordSha256','kind','registrySha256'])))
   return scopeHold('SCOPE_INGRESS_BINDINGS_INVALID');
  const scopeEvidence=prepareSourceScopeEvidence(registryBytes,{query:request.query,
   nodeIds:request.bindings.map(binding=>binding.node.nodeId)});
  if(scopeEvidence.status==='HOLD')return scopeEvidence;
  for(let i=0;i<request.bindings.length;i++){
   if(scopeDigest(request.bindings[i].node)!==scopeDigest(scopeEvidence.records[i].node))
    return scopeHold('SCOPE_INGRESS_NODE_PIN_MISMATCH',scopeEvidence);
  }
  if(!scopeEvidence.candidateIngressEligible)return scopeHold('SCOPE_TEXT_NOT_POSITIVE_CANDIDATE_SUPPORT',scopeEvidence);
  const referenceIndex={namespace:SCOPE_NAMESPACE,edition:SCOPE_EDITION,
   registrySha256:SCOPE_REGISTRY_SHA256,records:scopeEvidence.records.map(record=>record.node)};
  const candidateRequest={mode:'WORK',bindings:request.bindings,links:request.links??[]};
  if(request.projectReviewContext!==undefined)candidateRequest.projectReviewContext=request.projectReviewContext;
  const candidateGraph=proposeSourceBoundCandidateGraph(inertProgram,referenceIndex,candidateRequest);
  if(candidateGraph.status!=='SOURCE_BOUND_CANDIDATE_ONLY')return Object.freeze({...scopeHold('EXISTING_CANDIDATE_INGRESS_HOLD',scopeEvidence),
   existingIngressReason:candidateGraph.reason??'UNKNOWN'});
  const core={schema:'atlas.one.whole-144-scoped-source-candidate/v1',status:'SOURCE_SCOPE_CANDIDATE_ONLY',
   candidateGraph,scopeEvidence,sourceOriginalBytesVerified:true,existingCandidateIngress:'proposeSourceBoundCandidateGraph',
   candidateIngressEligible:true,semanticPlacementEligible:false,semanticAcceptance:false,
   dispatchAllowed:false,workModeEligibility:'NOT_EVALUATED',rightsVerified:false,hostedVerified:false,
   scientificEndorsement:false,semanticEquivalencesEstablished:0,implementedTasks:0,actualMacroturns:0,
   canPublish:false,authorityEffect:'NONE',canonEffect:'NONE'};
  return Object.freeze({...core,receiptDigest:scopeDigest(core)});
 }catch{return scopeHold('SCOPE_INGRESS_INPUT_INVALID');}
}
