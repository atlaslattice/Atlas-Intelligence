/** Non-destructive legacy import preview. Older storage backends are data sources,
 * never authorization roots or alternate orchestration engines.
 */
import {isObject,requireValid,digest,HSN_SHA256,validCoord} from './index.mjs';
const TEXT=/^[\s\S]{1,8000}$/;
const SAFE_ID=/^[A-Za-z0-9_-]{2,128}$/;
/** One old Firebase memory or Sheldonbrain RAG memory.
 * Only metadata enters v2; body stays in original storage until a host-authorized migration.
 */
export function previewLegacyMemory(record,{origin,edition='historical-unpinned',sourceURL=null}={}){
  requireValid(['atlas-intelligence-firebase','sheldonbrain-rag-api'].includes(origin),'UNSUPPORTED_LEGACY_ORIGIN');
  requireValid(isObject(record),'LEGACY_RECORD_INVALID');
  requireValid(typeof record.userId==='string'&&SAFE_ID.test(record.userId),'USER_SCOPE_REQUIRED');
  requireValid(typeof record.content==='string'&&TEXT.test(record.content),'SOURCE_BODY_REQUIRED');
  requireValid(typeof edition==='string'&&edition.length>0&&edition.length<=120,'LEGACY_EDITION_REQUIRED');
  const oldKind=typeof record.confidenceTier==='string'?record.confidenceTier:'NOT_VERIFIED';
  // A prior app calling something VERIFIED or canonical does not establish v2 evidence review.
  const pointer={schema:'atlas.one.legacy-pointer/v2',origin,legacyEdition:edition,sourceRef:typeof sourceURL==='string'?sourceURL:null,
    legacyUserScopeDigest:digest({legacyUserId:record.userId}),bodySHA256:digest({text:record.content}),
    confidenceClaimFromLegacy:oldKind,review:'UNVERIFIED_MIGRATION_CANDIDATE',sourceRights:'NOT_VERIFIED',
    payloadCopied:false,permissionTransfer:false,canonEffect:'NONE',migrationPerformed:false};
  if(typeof record.houseId==='string'||typeof record.sphereId==='string'){
    pointer.legacyOntology={houseId:record.houseId||null,sphereId:record.sphereId||null,crosswalk:'EXPLICIT_EDITION_REVIEW_REQUIRED',ariadneSHA256:HSN_SHA256};
  }
  return {...pointer,pointerSHA256:digest(pointer)};
}
/** No resident identity is proven from an earlier agent document. */
export function previewLegacyAgent(agent,{origin='atlas-intelligence-firebase'}={}){
  requireValid(origin==='atlas-intelligence-firebase'&&isObject(agent),'LEGACY_AGENT_INVALID');
  requireValid(typeof agent.userId==='string'&&SAFE_ID.test(agent.userId)&&typeof agent.provider==='string'&&agent.provider.length<=64,'LEGACY_AGENT_FIELDS_INVALID');
  const x={schema:'atlas.one.legacy-agent-pointer/v2',origin,legacyUserScopeDigest:digest({legacyUserId:agent.userId}),
    providerDeclared:agent.provider,sourceStatus:'SELF_DECLARED_AGENT_NOT_AUTHENTICATED',toolsEnabled:false,
    modelInvoked:false,workRoomJoined:false,permissionsTransferred:false,migrationPerformed:false};
  return {...x,pointerSHA256:digest(x)};
}
