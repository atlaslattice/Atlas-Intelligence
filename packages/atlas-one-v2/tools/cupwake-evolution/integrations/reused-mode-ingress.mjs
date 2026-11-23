/** Review-only preflight for the existing NEXT144 preview; no rights, scheduling,
 * host call, graph edge or publication. Accept only inert local JSON values.
 * Source proposal mode and separately authorized node review are different routes.
 */
import {bindNext144ToOriginal,previewCandidateEvidence} from '../peer-inputs/next144.mjs';
const KEYS=['coordinate','edition','initiative','namespace','registrySha256','route','sourceNodeDigest'];
export function buildReviewIngress({catalogBytes,registryBytes}){
  const bound=bindNext144ToOriginal({catalogBytes,registryBytes});
  const tasks=new Map(bound.tasks.map(t=>[t.id,t]));
  const nodes=new Map(bound.targets.map(t=>[t.coordinate,t]));
  const hold=reason=>({status:'HOLD',reason,authorityEffect:'NONE',hostVerified:false});
  return function preview(request,declaredEvidence){
    if(!request||Object.getPrototypeOf(request)!==Object.prototype||Reflect.ownKeys(request).length!==KEYS.length||!KEYS.every(k=>Object.getOwnPropertyDescriptor(request,k)&&Object.hasOwn(Object.getOwnPropertyDescriptor(request,k),'value')))return hold('REQUEST_SHAPE');
    const n=nodes.get(request.coordinate);
    if(!n||request.namespace!=='ARIADNE_V07'||request.edition!==bound.registryEdition||request.registrySha256!==bound.registrySha256||request.sourceNodeDigest!==n.sourceNodeDigest)return hold('SOURCE_IDENTITY_MISMATCH');
    const t=tasks.get(n.initiative);
    if(request.route==='PROPOSAL_EVIDENCE'){
      if(request.initiative!==t.id)return hold('PROPOSAL_IDENTITY_MISMATCH');
      // Never accept caller relabeling or borrow optional-mode content into Work.
      if(t.suggestedMode!=='WORK')return {...hold('VOLUNTARY_MODE_SEPARATION'),coordinate:n.coordinate,initiative:t.id,originalSuggestedMode:t.suggestedMode};
      const result=previewCandidateEvidence({catalogBytes,taskId:t.id,record:declaredEvidence});
      return {...result,coordinate:n.coordinate,originalSuggestedMode:t.suggestedMode};
    }
    if(request.route==='NODE_WORK_REVIEW'){
      // A node is not an activity or a proposal. No evidence/task inheritance.
      if(request.initiative!==null||declaredEvidence!==undefined)return hold('INDEPENDENT_NODE_REVIEW_MUST_NOT_BORROW_PROPOSAL');
      return {status:'INDEPENDENT_NODE_REVIEW_REQUIRES_AUTHORIZATION',coordinate:n.coordinate,sourceNodeDigest:n.sourceNodeDigest,originalSuggestedMode:t.suggestedMode,authorityEffect:'NONE',hostVerified:false,canPublish:false};
    }
    return hold('ROUTE_UNKNOWN');
  };
}
