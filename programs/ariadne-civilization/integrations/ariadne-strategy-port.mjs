/**
 * Additive, public-safe Ariadne META145 synthetic strategy receipt port.
 * No private atlas.json, no external calls or host mutation. Import review only.
 * Simulation receipt SHAPE is not independently authenticated evidence.
 */
const ORIGINAL='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
const SHA=/^[a-f0-9]{64}$/;
const validSha=v=>typeof v==='string'&&SHA.test(v);
const denseHouseDigests=v=>Array.isArray(v)&&v.length===12&&
 Array.from({length:12},(_,i)=>i).every(i=>Object.hasOwn(v,i)&&validSha(v[i]));
const HSN=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const EX=/^EX\.W(0[1-9]|1[0-2])\.C(0[1-9]|1[0-2])\.P(0[1-9]|1[0-2])$/;
const PROTECTED_KEYS=new Set(['body','raw','text','content','secret','token','password','api_key','private','palace','imagine']);
const bad=(reason='INVALID_SOURCE')=>({state:'HOLD',reason,authorityEffect:'NONE',effects:0});
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function protectedKeys(v,depth=0){
 if(depth>5)return true;
 if(!v||typeof v!=='object')return false;
 if(Array.isArray(v))return v.some(x=>protectedKeys(x,depth+1));
 if(!plain(v))return true;
 return Object.entries(v).some(([key,value])=>PROTECTED_KEYS.has(key.toLowerCase())||protectedKeys(value,depth+1));
}
export function verifySyntheticMeta145Receipt(receipt){
 if(!plain(receipt)||protectedKeys(receipt)||receipt.schema!=='atlas.meta145.strategy-integration/v2'||
   receipt.sourceRegistrySha256!==ORIGINAL||receipt.graphEdition!=='ariadne-reader/v0.7'||
   receipt.simulatedStrategies!==1728||receipt.simulatedOptionEvaluations!==5184||
   receipt.spheresCovered!==144||receipt.housesCovered!==12||receipt.crossHouseReviewCandidates!==144||
   receipt.semanticRelationsAccepted!==0||receipt.genuineMacroTurns!==0||receipt.modelCalls!==0||
   receipt.authorizationGranted!==false||receipt.canonEdited!==false||receipt.authorityEffect!=='NONE'||
   receipt.status!=='LOCAL_SIMULATION_COMPLETE_HOST_AND_SEMANTIC_ACCEPTANCE_HELD'||
   !validSha(receipt.receiptSha256)||!denseHouseDigests(receipt.houseReceipts))return bad();
 return {schema:'atlas.ariadne.meta145-import-check/v1',state:'SOURCE_SHAPE_MATCHES_NOT_AUTHENTICATED',
   sourceRegistrySha256:ORIGINAL,simulationReceiptSha256:receipt.receiptSha256,
   actualModelCallsVerified:0,scientificEdgesAccepted:0,hostAuthorityGranted:false,
   runtimeReady:false,externalEffects:0,authorityEffect:'NONE'};
}
/** HSN original knowledge coordinate != EX engineering implementation task. */
export function prepareCrosswalk({hsn,excellenceTaskId,explicitSourceRef}={}){
 if(typeof hsn!=='string'||!HSN.test(hsn)||typeof excellenceTaskId!=='string'||!EX.test(excellenceTaskId)||
   typeof explicitSourceRef!=='string'||!/^https:\/\/github\.com\/atlaslattice\/[A-Za-z0-9_.-]+\/(?:blob|pull|issues)\/[^\s]{1,160}$/.test(explicitSourceRef))return bad('CROSSWALK_NEEDS_EXPLICIT_SOURCE');
 return {schema:'atlas.ariadne.excellence-crosswalk/v1',state:'CANDIDATE_NOT_REVIEWED',
   hsnNamespace:'ariadne',hsn,engineeringNamespace:'ATLAS-EXCELLENCE-1728',engineeringTaskId:excellenceTaskId,
   sourceRef:explicitSourceRef,ordinalIdentity:false,semanticsAccepted:false,modelCalls:0,
   independentReviewerVerified:false,externalEffects:0,authorityEffect:'NONE'};
}
/** Prepare a nonposting pointer; existing host owns all READ/RETURN rights. */
export function prepareAtlasOneWorkGraft({meta145,hsn,originMode='WORK'}={}){
 const v=verifySyntheticMeta145Receipt(meta145);
 if(v.state!=='SOURCE_SHAPE_MATCHES_NOT_AUTHENTICATED'||originMode!=='WORK'||
   typeof hsn!=='string'||!HSN.test(hsn))return bad('UNVERIFIED_WORK_GRAFT');
 return {schema:'atlas.ariadne.work-graft-candidate/v1',state:'PREPARED_NOT_SENT',
   coordinate:hsn,sourceRegistrySha256:ORIGINAL,simReceiptSha256:meta145.receiptSha256,
   existingGraphCollection:'users/{userId}/intelligence/{nodeId}',
   existingWorkHostPort:'EXISTING_WORK_HOST_ONLY',
   hostSessionVerified:false,readRightsVerified:false,returnRightsVerified:false,
   specialistIdentityVerified:false,scienceValidated:false,
   paidCalls:0,externalEffects:0,authorityEffect:'NONE'};
}
