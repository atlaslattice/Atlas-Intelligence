/** Prepared-only, minimal adapters into EXISTING Atlas/AtlasGPT/SwarmChat/GrokSeek. */
import {INNOVATIONS,ORIGINAL_SHA256,prepareWorkCandidate,runInnovation} from './innovations.mjs';
const byId=new Map(INNOVATIONS.map(x=>[x.id,x]));
const deps=Object.freeze({
 I01:[],I02:['I01'],I03:[],I04:['I03'],I05:['I03'],
 I06:['I02','I03'],I07:['I06'],I08:['I07'],I09:['I05','I08'],I10:['I02','I06'],
 I11:['I05'],I12:['I11'],I13:['I12'],I14:['I05'],I15:['I14'],
 I16:['I11','I13'],I17:['I02','I03'],I18:['I16'],I19:['I17','I18'],I20:['I10','I15','I19'],
});
const hold=reason=>({state:'HOLD',reason,authorityEffect:'NONE',externalEffects:0});
const hsn=x=>typeof x==='string'&&/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/.test(x);
/** Contract graph for the already-present GrokSeek/OpenManus task-planning host. */
export function prepareExistingGrokSeekPlan(){
 const nodes=INNOVATIONS.map(x=>({taskId:x.id,namespace:'ATLAS_INNOVATION_LAB',title:x.title,
  dependsOn:[...deps[x.id]],status:'PLANNED_FOR_REVIEW',workOrModelExecuted:false,
  sourceAdapter:'EXISTING_GROKSEEK_DAG_NOT_MOUNTED',authorityEffect:'NONE'}));
 const seen=new Set(),visiting=new Set(),order=[];const walk=id=>{
  if(visiting.has(id))throw Error('CYCLE');if(seen.has(id))return;visiting.add(id);
  for(const d of deps[id])walk(d);visiting.delete(id);seen.add(id);order.push(id);
 };for(const n of nodes)walk(n.taskId);
 return {schema:'atlas.grokseek.innovation-plan/v0.1',state:'PREPARED_NOT_QUEUED',nodes,
  topologicalOrder:order,taskCount:20,originalGrokSeekQueueTouched:false,
  existingAtlasExcellenceTaskCountModified:0,externalEffects:0,authorityEffect:'NONE'};
}
/** Portable declarations only — no actual SDK tool registered or model invoked. */
export function prepareOpenAIToolDescriptors(){
 return {schema:'atlas.openai.innovation-tool-descriptors/v0.1',state:'DESCRIPTORS_NOT_REGISTERED',
   sourceRegistrySha256:ORIGINAL_SHA256,tools:INNOVATIONS.map(x=>({type:'function',name:`atlas_innovation_${x.id.toLowerCase()}`,
   description:`Source-only ${x.title}; requires externally authenticated Work source and rights`,
   parameters:{type:'object',properties:{coordinate:{type:'string',pattern:'^H(0[1-9]|1[0-2])\\.S(0[1-9]|1[0-2])\\.N(0[1-9]|1[0-2])$'}},required:['coordinate'],additionalProperties:false},
   requiredHostRights:'READ_AND_RETURN',hostCallable:false})),modelCalls:0,externalEffects:0,authorityEffect:'NONE'};
}
export function prepareMcpDescriptors(){
 const api=prepareOpenAIToolDescriptors();return {schema:'atlas.mcp.innovation-source-spec/v0.1',
  state:'DESCRIPTORS_NOT_HOST_REGISTERED',tools:api.tools.map(t=>({name:t.name,
   description:t.description,inputSchema:t.parameters,annotations:{readOnlyHint:true,destructiveHint:false}})),
  hostRegistered:false,toolCalls:0,externalEffects:0,authorityEffect:'NONE'};
}
/** Work-only optional packet. Broker decides actual member/permissions and posting. */
export function prepareSwarmChatProposal({id,coordinate,existingSourceRef}={}){
 const p=prepareWorkCandidate({id,coordinate,sourceDigest:ORIGINAL_SHA256});
 if(p.state!=='PREPARED_NOT_SENT'||typeof existingSourceRef!=='string'||!/^https:\/\/github\.com\/atlaslattice\/[\w.-]+\/(?:pull|issues)\/\d{1,6}$/.test(existingSourceRef))return hold('SOURCE_REVIEW_REQUIRED');
 return {schema:'atlas.swarmchat.innovation-work-draft/v0.1',state:'PREPARED_NOT_POSTED',
  sourcePointer:{url:existingSourceRef,namespace:'GITHUB_WORK_REVIEW',coordinate,id},
  reviewPrompt:`Review ${byId.get(id).title}: provide one falsifying case, original source and rights proof`,
  brokerRoomSelected:false,currentReadRightsVerified:false,currentReturnRightsVerified:false,
  recipientAttested:false,posted:false,externalEffects:0,authorityEffect:'NONE'};
}
/** Candidate edges from a *pure simulation*, never accepted semantic relations. */
export function prepareGraphFabricCandidates({result}={}){
 if(!result||result.operatorId!=='I06'||result.state!=='LOCAL_SYNTHETIC_CANDIDATE'||!Array.isArray(result.data?.candidates))return hold('NO_CANDIDATE_EVIDENCE');
 return {schema:'atlas.graph-fabric.innovation-review/v0.1',state:'PREPARED_NOT_INGESTED',
  edges:result.data.candidates.map(x=>({from:x.from,to:x.to,relation:'LEXICAL_ECOTONE_REVIEW_ONLY',
   independentReview:false,sourceRightsVerified:false})),acceptedSemanticEdges:0,
  graphWrites:0,externalEffects:0,authorityEffect:'NONE'};
}
