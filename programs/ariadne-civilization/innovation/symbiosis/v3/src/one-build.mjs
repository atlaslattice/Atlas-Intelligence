/**
 * Atlas Civilizational ONE build facade, additive source-only candidate.
 * Integrate by normalizing read-only connectors; do not start a new runtime.
 * The existing Atlas Intelligence/AtlasGPT/SwarmChat/GrokSeek/Graph Fabric
 * independently own storage, model calls, identity, source and rights gates.
 */
export const SCHEMA='atlas.ariadne.ONE_BUILD/v3';
export const SOURCE_SHA='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
export const INTEGRATION_PORTS=Object.freeze([
 {id:'atlas-intelligence',contract:'EX.Wxx.Cxx.Pxx engineering plan; Ariadne v0.7 separate source',action:'PREPARE_ONLY'},
 {id:'atlasgpt',contract:'atlas.one.work-candidate/v0.1; native-v2 Agents SDK optional',action:'PREPARE_ONLY'},
 {id:'swarmchat',contract:'existing D1 Work broker / room + parentSeq; host READ+RETURN',action:'PUBLISHER_REQUIRED'},
 {id:'ariadne',contract:'original source bytes SHA-256 + exact HSN node record SHA',action:'READ_ONLY'},
 {id:'grokseek',contract:'existing pure DAG source compiler, no second orchestrator',action:'SOURCE_PORT_ONLY'},
 {id:'alexandria',contract:'evidence graph with source edition/rights/dissent',action:'READ_ONLY'},
 {id:'noosphere',contract:'META145 glyph/graph view, no namespace SAME_AS inference',action:'READ_ONLY'},
 {id:'iron-empire',contract:'opt-in fictional-only local Imagine, no Work import',action:'LEISURE_SEPARATE'}
]);
const HOUSE=/^H(0[1-9]|1[0-2])$/;
const SPHERE=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])$/;
const NODE=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const denial=()=>({state:'HOLD',code:'ONE_BUILD_UNVERIFIED_SCOPE',effects:0,authorityEffect:'NONE'});
function snapshot(v,d=0){
 if(d>6)throw Error('DEPTH');
 if(v===null||typeof v==='string'||typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v)))return v;
 if(v===undefined||typeof v!=='object'||Object.getPrototypeOf(v)!==(Array.isArray(v)?Array.prototype:Object.prototype))throw Error('OBJECT');
 const desc=Object.getOwnPropertyDescriptors(v),keys=Reflect.ownKeys(v);
 if(keys.length>500)throw Error('LENGTH');
 if(Array.isArray(v)){
  if(desc.length.value>150||keys.length!==desc.length.value+1)throw Error('ARRAY');
  return Array.from({length:desc.length.value},(_,i)=>{const a=desc[String(i)];if(!a||!a.enumerable||!Object.hasOwn(a,'value'))throw Error('ACCESSOR');return snapshot(a.value,d+1);});
 }
 const out={};for(const k of keys){if(typeof k!=='string'||['__proto__','prototype','constructor'].includes(k))throw Error('KEY');const a=desc[k];if(!a||!a.enumerable||!Object.hasOwn(a,'value'))throw Error('ACCESSOR');out[k]=snapshot(a.value,d+1);}return out;
}
function protectedData(v){if(!v||typeof v!=='object')return false;const no=new Set(['raw','body','content','secret','password','api_key','access_token','private','palace','dream','imagine']);return Object.entries(v).some(([k,x])=>no.has(k.toLowerCase())||protectedData(x));}
/** The inputs are local/source-only structured findings, NEVER host-signed proof. */
export function prepareOneBuild({horizonReceipt,feedbackReceipt,buildOrders,originMode='WORK'}={}){
 let h,f,orders;try{h=snapshot(horizonReceipt);f=snapshot(feedbackReceipt);orders=snapshot(buildOrders);}catch{return denial();}
 if(originMode!=='WORK'||protectedData(h)||protectedData(f)||protectedData(orders)||
    !h||h.schema!=='atlas.meta145.long-horizon-review/v1'||h.sourceRegistrySha256!==SOURCE_SHA||
    h.simulatedTrajectories!==2985984||h.fictionalYearsPerTrajectory!==1728||h.sourceNodes!==1728||
    h.spheres!==144||h.houses!==12||h.realMacroturns!==0||h.independentScientificAcceptance!==0||
    h.authorityEffect!=='NONE'||h.hostDeployed!==false||
    !f||f.schema!=='atlas.ariadne.meta145.feedback-generations/v1'||f.sourceRegistrySha256!==SOURCE_SHA||
    f.generations!==1728||f.heldOutGenerations!==432||f.realAgentTurns!==0||f.realModelCalls!==0||f.authorityEffect!=='NONE'||
    !Array.isArray(orders)||orders.length!==144)return denial();
 const ids=new Set();for(const o of orders){
  if(!o||typeof o.taskId!=='string'||typeof o.sphere!=='string'||!SPHERE.test(o.sphere)||o.taskId!=='AR3.'+o.sphere||
     o.house!==o.sphere.slice(0,3)||!Array.isArray(o.sourceNodeOrdinals)||o.sourceNodeOrdinals.length!==12||ids.has(o.sphere)||o.status!=='PLANNED_NOT_EXECUTED_IN_HOST')return denial();
  ids.add(o.sphere);
 }
 if(ids.size!==144)return denial();
 return {schema:SCHEMA,state:'PREPARED_NOT_SENT',module:'META145_ONE_BUILD',
   source:{namespace:'ariadne',edition:'v0.7',sha256:SOURCE_SHA},nodeCount:1728,spheres:144,houses:12,
   candidateBuildOrderCount:144,verifiedSourcePublisher:false,independentSemanticReview:false,
   actualResidentTurns:0,sourceRightsAtRead:false,sourceRightsAtReturn:false,
   providerCalls:0,externalEffects:0,authorityEffect:'NONE',
   openAiNativePort:'EXISTING_ATLASGPT_NATIVE_V2_ONLY',graphPort:'EXISTING_ATLAS_INTELLIGENCE_ONLY',
   swarmchatPort:'EXISTING_WORK_BROKER_NO_POST',grokseekPort:'EXISTING_SOURCE_DAG_ONLY'};
}
export function prepareSphereWorkOrder(order,{mode='WORK',hostPermission=false}={}){
 let o;try{o=snapshot(order);}catch{return denial();}
 if(mode!=='WORK'||hostPermission!==false||protectedData(o)||!o||typeof o.sphere!=='string'||!SPHERE.test(o.sphere)||
    o.taskId!=='AR3.'+o.sphere||o.house!==o.sphere.slice(0,3)||o.status!=='PLANNED_NOT_EXECUTED_IN_HOST')return denial();
 return {schema:SCHEMA,state:'PREPARED_NOT_SENT',sourceSphere:o.sphere,house:o.house,
   taskRef:o.taskId,originMode:'WORK',sourceRegistrySha256:SOURCE_SHA,kind:'RESEARCH_ACCEPTANCE_TASK',
   actorIdentityVerified:false,hostRightsAtRead:false,hostRightsAtReturn:false,realWorkPerformed:false,
   effects:0,authorityEffect:'NONE'};
}
/** Separate exact user-issued response and host acknowledgement required. */
export function composePeerWorkReference({roomId,parentSeq,sourceCoordinate,sourceRef,mode='WORK'}={}){
 if(mode!=='WORK'||typeof roomId!=='string'||!/^[a-zA-Z0-9_-]{3,80}$/.test(roomId)||
    !Number.isInteger(parentSeq)||parentSeq<1||parentSeq>500||typeof sourceCoordinate!=='string'||!NODE.test(sourceCoordinate)||
    typeof sourceRef!=='string'||!/^https:\/\/(?:github\.com|doi\.org|openalex\.org)\//.test(sourceRef)||sourceRef.length>500)return denial();
 return {schema:SCHEMA,state:'PREPARED_NOT_SENT',roomId,parentSeq,sourceCoordinate,
   evidenceRef:sourceRef,authorSelfDeclared:true,actualPeerRead:false,hostAuthenticated:false,
   workSourceRightsVerified:false,privateModeImported:false,externalEffects:0,authorityEffect:'NONE'};
}
