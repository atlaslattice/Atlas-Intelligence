/**
 * Ariadne v4: source-only additive reviewer for ONE existing Atlas ONE host.
 * NOT a new issuer, graph, model runner, broker, or authorization mechanism.
 * All local numeric receipts are hypothetical. Matching shape proves NO authenticity.
 */
export const SCHEMA='atlas.ariadne.v4.one-build-review/v1';
export const ORIGINAL_SOURCE='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
const HSN=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const SPHERE=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])$/;
const HASH=/^[0-9a-f]{64}$/;
const forbidden=new Set(['body','raw','content','secret','password','key','access_token','api_key','palace','private','imagine','dream','play','quiet','habitat','residentbrain']);
const reject=(reason='INVALID_SOURCE_SHAPE')=>({schema:SCHEMA,state:'HOLD',reason,authorityEffect:'NONE',effects:0});
function cloneStrict(x,d=0){
 if(d>12)throw Error('DEPTH');
 if(x===null||typeof x==='string'||typeof x==='boolean'||(typeof x==='number'&&Number.isFinite(x)))return x;
 if(typeof x!=='object'||Object.getPrototypeOf(x)!==(Array.isArray(x)?Array.prototype:Object.prototype))throw Error('TYPE');
 const desc=Object.getOwnPropertyDescriptors(x);const keys=Reflect.ownKeys(x);
 if(keys.length>5000)throw Error('COUNT');
 if(Array.isArray(x)){
  const len=desc.length?.value;
  if(!Number.isInteger(len)||len>5000||keys.length!==len+1)throw Error('DENSE_ARRAY_REQUIRED');
  return Array.from({length:len},(_,i)=>{const v=desc[String(i)];if(!v?.enumerable||!Object.hasOwn(v,'value'))throw Error('ACCESSOR');return cloneStrict(v.value,d+1);});
 }
 const ret=Object.create(null);
 for(const k of keys){
  if(typeof k!=='string'||['__proto__','constructor','prototype'].includes(k)||forbidden.has(k.toLowerCase()))throw Error('PROTECTED_FIELD');
  const v=desc[k];if(!v||!v.enumerable||!Object.hasOwn(v,'value'))throw Error('ACCESSOR');ret[k]=cloneStrict(v.value,d+1);
 }
 return ret;
}
function validOrders(orders){
 if(!Array.isArray(orders)||orders.length!==144)return false;
 for(let i=0;i<144;i++){
  const o=orders[i],hh=String(Math.floor(i/12)+1).padStart(2,'0'),ss=String(i%12+1).padStart(2,'0');
  const p=`H${hh}.S${ss}`;
  if(!o||o.sphere!==p||o.taskId!==`AR4.${p}`||o.house!==`H${hh}`||o.sourceRegistrySHA256!==ORIGINAL_SOURCE||o.sourceEdition!=='ariadne-reader/v0.7'||o.implementationStatus!=='PLANNED_NOT_EXECUTED_ON_HOST'||!Array.isArray(o.nodeCoordinates)||!Array.isArray(o.nodeSourceDigests)||o.nodeCoordinates.length!==12||o.nodeSourceDigests.length!==12||o.fictionalScenarios!==20736||!SPHERE.test(o.sphere))return false;
  for(let j=0;j<12;j++)if(o.nodeCoordinates[j]!==`${p}.N${String(j+1).padStart(2,'0')}`||!HASH.test(o.nodeSourceDigests[j]))return false;
 }
 return true;
}
/** Matching source SHAPE is not issuer attestation or a service read permission. */
export function prepareV4OneBuild(params={}){
 let input;try{input=cloneStrict(params)}catch{return reject()}
 const {audit,feedback,orders,originMode='WORK'}=input??{};
 if(originMode!=='WORK'||!audit||!feedback||
    audit.schema!=='atlas.ariadne.v4.offline-audit/v1'||audit.status!=='LOCAL_SOURCE_DERIVED_SYNTHETIC_REPLAY_VERIFIED'||audit.sourceRegistryOriginalSha256!==ORIGINAL_SOURCE||audit.originalRegistryBytesIndependentlyRehashedHere!==false||audit.aggregate?.rows!==2985984||!Array.isArray(audit.aggregate?.wins)||audit.aggregate.wins.length!==5||audit.aggregate.wins.some(x=>!Number.isSafeInteger(x)||x<0)||audit.aggregate.wins.reduce((a,b)=>a+b,0)!==2985984||audit.scientificEdgesAccepted!==0||audit.rightsVerified!==false||
    feedback.schema!=='atlas.ariadne.v4.partial-observation-meta145/v1'||feedback.status!=='SIMULATED_BANDIT_NOT_HOSTED_OR_REAL_LEARNING'||feedback.generations!==1728||feedback.trainingGenerations!==1296||feedback.heldoutGenerations!==432||feedback.trainingCounterfactualsUsedInUpdates!==false||feedback.sourceRegistrySha256!==ORIGINAL_SOURCE||feedback.modelCalls!==0||feedback.actualPeerMacroturns!==0||feedback.hostRightsVerified!==false||feedback.semanticLinksAccepted!==0||feedback.authorityEffect!=='NONE'||feedback.trainingObservationBudgetPerComparedPolicy!==1296*1728||
    !validOrders(orders))return reject();
 return {schema:SCHEMA,state:'PREPARED_NOT_SENT',purpose:'WORK',structuralReview:'SOURCE_SHAPE_MATCHES_NOT_AUTHENTICATED',sourceRegistryOriginalSha256:ORIGINAL_SOURCE,
  simulatedScenarios:2985984,simulatedYearsPerScenario:1728,feedbackGenerations:1728,nodeRoles:1728,sphereModules:144,houseModules:12,advisoryMetaBuild:145,
  openAIInterface:'EXISTING_ATLASGPT_NATIVE_V2_ONLY',graphInterface:'EXISTING_ATLAS_ONE_GRAPH_FABRIC_ONLY',grokseekInterface:'EXISTING_SOURCE_DAG_ONLY',swarmchatInterface:'EXISTING_BROKER_NO_AUTOPUBLISH',
  hostPrincipalVerified:false,sourcePublisherVerified:false,rightsAtReadVerified:false,rightsAtReturnVerified:false,scientificReviewAccepted:false,
  macroturnsRecorded:0,modelCallsMade:0,externalEffects:0,authorityEffect:'NONE'};
}
/** Prepare one source-qualified research task; another host must prove admission. */
export function prepareV4SphereOrder(order,opts={}){
 let x,y;try{x=cloneStrict(order);y=cloneStrict(opts)}catch{return reject()}
 if(y.mode!==undefined&&y.mode!=='WORK'||y.hostAuthenticated===true||!x||!SPHERE.test(x.sphere??'')||
    x.taskId!==`AR4.${x.sphere}`||x.house!==x.sphere.slice(0,3)||x.implementationStatus!=='PLANNED_NOT_EXECUTED_ON_HOST'||x.sourceRegistrySHA256!==ORIGINAL_SOURCE)return reject();
 return {schema:SCHEMA,state:'PREPARED_NOT_SENT',taskId:x.taskId,sourceSphere:x.sphere,sourceEdition:'ariadne-reader/v0.7',
  actualWorkExecuted:false,verifiedHostPrincipal:false,sourceRightsAtRead:false,sourceRightsAtReturn:false,authorityEffect:'NONE',effects:0};
}
export function prepareV4PeerPointer({roomId,parentSeq,coordinate,sourceUrl,mode='WORK'}={}){
 if(mode!=='WORK'||typeof roomId!=='string'||!/^[A-Za-z0-9_-]{3,80}$/.test(roomId)||!Number.isInteger(parentSeq)||parentSeq<1||parentSeq>500||
    typeof coordinate!=='string'||!HSN.test(coordinate)||typeof sourceUrl!=='string'||!/^https:\/\/github\.com\/atlaslattice\/[A-Za-z0-9_.-]+\/(?:pull|issues|blob)\//.test(sourceUrl)||sourceUrl.length>360)return reject();
 return {schema:SCHEMA,state:'PREPARED_NOT_SENT',roomId,parentSeq,coordinate,sourceUrl,
   peerIdentity:'SELF_DECLARED_UNVERIFIED',actualPeerRead:false,permissionsVerified:false,hostPosted:false,authorityEffect:'NONE',effects:0};
}
