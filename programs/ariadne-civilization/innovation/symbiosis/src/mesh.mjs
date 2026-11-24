/**
 * Ariadne 21×20 symbiotic extension mesh — deterministic and source-only.
 * 20 existing operators plus advisory META145, each composed with all 20
 * original operators as directed, falsifiable extension paths.
 * Each X path calls the *real existing destination operator* with a synthetic
 * fixture conditioned on the source operator's output; NOT 420 independent LLMs.
 * We preserve original HSN/source identity and never import private modes.
 */
import {createHash} from 'node:crypto';
import {INNOVATIONS, ORIGINAL_SHA256, runInnovation} from '../../src/innovations.mjs';
import {syntheticFixture} from '../../src/synthetic-fixtures.mjs';
import {composeInnovationCircuit} from '../../src/compositor.mjs';
export const MESH_SCHEMA='atlas.ariadne.symbiosis.mesh/v0.1';
export const COORD=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
export const ROOTS=Object.freeze([...INNOVATIONS.map(x=>Object.freeze({id:x.id,title:x.title,family:x.family})),Object.freeze({id:'M145',title:'META145 Advisory Integrator',family:'integration'})]);
export const CHANNELS=Object.freeze(INNOVATIONS.map((x,i)=>Object.freeze({id:'X'+String(i+1).padStart(2,'0'),operatorId:x.id,title:x.title,role:i%4===0?'CHALLENGE':i%4===1?'DISCOVERY':i%4===2?'REVIEW':'SYNTHESIS'})));
const HASH=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const deny=()=>({schema:MESH_SCHEMA,state:'HOLD',code:'SOURCE_NOT_AUTHORIZED',authorityEffect:'NONE',externalEffects:0});
const clone=x=>structuredClone(x);
const rootById=new Map(ROOTS.map(x=>[x.id,x]));
const channelById=new Map(CHANNELS.map(x=>[x.id,x]));
const validCoord=c=>typeof c==='string'&&COORD.test(c);
function lexicalPulse(data){
 // Non-semantic summary of local synthetic experiment output; never a score of truth.
 const s=JSON.stringify(data??{});
 return {fields:Object.keys(data??{}).length, bytes:s.length, missing:/missing|uncovered|unresolved/i.test(s), disagreement:/CHALLENGES|contradict|objection/i.test(s),
   bucket:parseInt(HASH(s).slice(0,8),16)%12, pulseDigest:HASH(s)};
}
export function sampleRoot(rootId,coordinate){
 if(!rootById.has(rootId)||!validCoord(coordinate))return deny();
 const base=rootId==='M145'?composeInnovationCircuit(coordinate):runInnovation(rootId,syntheticFixture(rootId,coordinate));
 if(!base||((rootId==='M145'&&base.gate!=='REVIEW_REQUIRED_SOURCE_ONLY')||(rootId!=='M145'&&base.state!=='LOCAL_SYNTHETIC_CANDIDATE')))
   return deny();
 const seed={schema:'atlas.ariadne.synthetic-root/v0.1',rootId,coordinate,sourceRegistrySha256:ORIGINAL_SHA256,
    originMode:'WORK',baseState:rootId==='M145'?base.gate:base.state,baseDigest:HASH(base),
    sourceKind:'DETERMINISTIC_SYNTHETIC',assurance:'NO_REVIEW_OR_ATTESTATION',noModelCalls:true};
 return {...seed,pulse:lexicalPulse(rootId==='M145'?base:base.data)};
}
function conditionTarget(target,from){
 // 20 *distinct destination algorithms*, each using a real parent-derived signal
 // to alter its source-safe input. No fabricated source witnesses or rights.
 const f=clone(syntheticFixture(target,from.coordinate));
 const id=from.rootId;
 const token='bridge-'+id.toLowerCase();
 const h=from.coordinate.slice(0,3),pulse=from.pulse.bucket;
 switch(target){
 case 'I01': f.facets.push({id:token,kind:from.pulse.disagreement?'VALUE':'FORECAST'});break;
 case 'I02': f.required.push(token); if(pulse%4===0)f.observed.push(token);break;
 case 'I03': f.records.push({id:token,sourceId:'synthetic:'+id,rootId:pulse%2?'publisher-B':'publisher-A'});break;
 case 'I04': f.records.push({id:token,observedDay:10+pulse,reviewEveryDays:6+pulse});break;
 case 'I05': f.claims.push({id:token,subject:from.coordinate,sourceId:'synthetic-'+id,polarity:from.pulse.disagreement?'CHALLENGES':'SUPPORTS'});break;
 case 'I06': f.nodes[0].terms.push(token);f.nodes[1].terms.push(token);break;
 case 'I07': f.maxHops=2+(pulse%3);if(pulse%2===0){const x=f.links;f.links=[[x[0][0],x[1][1]],[x[1][1],x[0][1]]];}break;
 case 'I08': f.cycle+=pulse;break;
 case 'I09': f.fields.semanticWitness=false;f.fields.independentChallenge=(pulse%2===0);break;
 case 'I10': f.nodes[0].relevance=pulse/12;f.nodes[0].neighborCoverage=pulse;f.nodes[1].mapped=false;f.nodes[1].relevance=(12-pulse)/12;break;
 case 'I11': f.kind=['CAUSAL','PREDICTION','CORRELATION','EQUIVALENCE'][pulse%4];break;
 case 'I12': f.shocks=[-0.4,-0.2,0.1,0.2,0.4].map(x=>Number((x+pulse/100).toFixed(2)));f.threshold=Math.max(0.05,Math.min(0.95,Number((f.base+0.1+pulse/100).toFixed(2))));break;
 case 'I13': f.options[0].cost=Number((0.25+pulse/20).toFixed(2));break;
 case 'I14': f.objections.push({id:token,group:h,sourceId:'synthetic-'+id});break;
 case 'I15': f.signals.push({id:token,view:from.pulse.disagreement?'CHALLENGES':'SUPPORTS'});break;
 case 'I16': f.steps.push({id:'verify-'+id.toLowerCase(),rollback:'revert-local-proposal',requires:['challenge']});break;
 case 'I17': f.requiredClaims.push(token);f.sources.push({id:token,cost:2,covers:[token]});break;
 case 'I18': f.packet.parentExperiment=id;break;
 case 'I19': f.representations.forEach(x=>{x.payload.parentExperiment=id;});break;
 case 'I20': f.cases[0].unknownReductionProxy=Number((0.25+pulse/20).toFixed(2));break;
 default:throw Error('UNKNOWN_TARGET');
 }
 return f;
}
function scopedOptions(opts){
 if(opts===undefined)return {originMode:'WORK',scope:'SYNTHETIC_LOCAL',sourceRegistrySha256:ORIGINAL_SHA256};
 if(opts===null||typeof opts!=='object'||Array.isArray(opts)||Object.getPrototypeOf(opts)!==Object.prototype)return null;
 const own=Object.getOwnPropertyDescriptors(opts);
 if(Reflect.ownKeys(opts).some(k=>typeof k!=='string'||!['originMode','scope','sourceRegistrySha256'].includes(k)||!Object.hasOwn(own[k],'value')))return null;
 return {originMode:own.originMode?.value??'WORK',scope:own.scope?.value??'SYNTHETIC_LOCAL',
    sourceRegistrySha256:own.sourceRegistrySha256?.value??ORIGINAL_SHA256};
}
export function symbiosisExtension(rootId,channelId,coordinate,opts=undefined){
 const options=scopedOptions(opts);if(!options)return deny();
 const {originMode,scope,sourceRegistrySha256}=options;
 // Stable outward HOLD: don't expose whether source exists or which key failed.
 if(!rootById.has(rootId)||!channelById.has(channelId)||!validCoord(coordinate)||originMode!=='WORK'||scope!=='SYNTHETIC_LOCAL'||sourceRegistrySha256!==ORIGINAL_SHA256)
   return deny();
 return composeExtension(rootId,channelId,coordinate,sampleRoot(rootId,coordinate));
}
function composeExtension(rootId,channelId,coordinate,from,baseline=undefined){
 if(from.state==='HOLD')return deny();
 const channel=channelById.get(channelId);
 const targetInput=conditionTarget(channel.operatorId,from);
 const result=runInnovation(channel.operatorId,targetInput);
 const base=baseline??runInnovation(channel.operatorId,syntheticFixture(channel.operatorId,coordinate));
 if(result.state!=='LOCAL_SYNTHETIC_CANDIDATE'||base.state!=='LOCAL_SYNTHETIC_CANDIDATE'||result.authorityEffect!=='NONE'||result.externalEffects!==0)return deny();
 // Compute from output; don't publish source bodies or derived private fields.
 const record={schema:MESH_SCHEMA, extensionId:rootId+'.'+channelId,rootId,targetId:channel.operatorId,channelId,
   coordinate, sourceRegistrySha256:ORIGINAL_SHA256,state:'LOCAL_SYNTHETIC_CANDIDATE',
   relation:'DIRECTED_SYNTHETIC_METHOD_TRANSFER_NOT_SEMANTIC_EQUIVALENCE',
   sourceOutputSha256:from.baseDigest,sourcePulseSha256:from.pulse.pulseDigest,
   targetInputSha256:HASH(targetInput),targetOutputSha256:HASH(result),
   baselineTargetOutputSha256:HASH(base),targetOutputChanged:HASH(result)!==HASH(base),
   unchangedOutcomeAudit:HASH(result)===HASH(base)?'BRIDGE_INPUT_CHANGED_BUT_OPERATOR_RESULT_UNCHANGED_REVIEW':'OUTPUT_DELTA_SYNTHETIC_NOT_QUALITY_GAIN',
   preview:{resultKeys:Object.keys(result.data),signalBucket:from.pulse.bucket,deltaKind:channel.role},
   independentlyReviewed:false,hostRightsAuthenticated:false,realModelCalls:0,genuineMacroturns:0,
   acceptedScienceEdges:0,externalEffects:0,authorityEffect:'NONE'};
 return {...record,receiptSha256:HASH(record)};
}
/** One cached parent run per root; 420 real second-operator computations per node. */
export function runNodeMesh(coordinate){
 if(!validCoord(coordinate))return deny();
 const out=[];
 const baselines=new Map(CHANNELS.map(ch=>[ch.operatorId,runInnovation(ch.operatorId,syntheticFixture(ch.operatorId,coordinate))]));
 for(const root of ROOTS){
  const parent=sampleRoot(root.id,coordinate);
  if(parent.state==='HOLD')return deny();
  for(const ch of CHANNELS){
   const r=composeExtension(root.id,ch.id,coordinate,parent,baselines.get(ch.operatorId));
   if(r.state!=='LOCAL_SYNTHETIC_CANDIDATE')return deny();
   out.push(r);
  }
 }
 return out;
}
export function extensionCatalog(){
 return ROOTS.flatMap(root=>CHANNELS.map(channel=>Object.freeze({
  id:root.id+'.'+channel.id,rootId:root.id,targetId:channel.operatorId,channelId:channel.id,
  rootName:root.title,extensionName:channel.title,
  label:root.title+' × '+channel.title,
  hypothesis:'Apply '+channel.title+' to a source-safe synthetic response from '+root.title+'; inspect whether it changes the next evidence question without granting proof.',
  falsifier:'A malformed source, private-mode input, absent subject, or crosswalk confusion must HOLD before any external effect.',
  status:'IMPLEMENTED_SYNTHETIC_REVIEW_ONLY',origin:'CURRENT_PROJECT_OPERATOR_COMPOSITION_NOT_GLOBAL_NOVELTY',
  expectedHost:'EXISTING_ATLAS_ONE_WORK_PORT_NOT_REGISTERED',
  workConstraint:'NO_PRIVATE_LEISURE_IMPORT',authorityEffect:'NONE'})));
}
export function meshGraph(){
 const edges=extensionCatalog().map(x=>({from:x.rootId,to:x.targetId,extension:x.id,relation:'SYNTHETIC_OPERATOR_COMPOSITION'}));
 const feedback=INNOVATIONS.map(x=>({from:x.id,to:'M145',relation:'ADVISORY_REVIEW_INPUT_UNTRUSTED'}));
 return {schema:'atlas.ariadne.symbiotic-graph/v0.1',nodes:ROOTS.map(x=>({...x})),edges,feedback,
   edgeCount:edges.length,feedbackCount:feedback.length,hasCycles:true,
   execution:'TWO_STAGE_DAG_PER_EXTENSION; NO_AUTOMATIC_RECURSION',
   scientificEdgesAccepted:0,actualModelAgents:0,externalEffects:0,authorityEffect:'NONE'};
}
/** META145 validates a complete ordered set, never accepts a partial or cloned receipt. */
export function meta145MeshReduce(all){
 if(!Array.isArray(all)||all.length!==420)return deny();
 const catalog=extensionCatalog();
 const expected=new Map(catalog.map(x=>[x.id,x])),seen=new Set(),byRoot={},byChannel={};
 const coordinate=all[0]?.coordinate;
 if(!validCoord(coordinate))return deny();
 for(const x of all){
  if(!x||x.schema!==MESH_SCHEMA||!expected.has(x.extensionId)||seen.has(x.extensionId)||x.coordinate!==coordinate||
     x.sourceRegistrySha256!==ORIGINAL_SHA256||x.rootId!==expected.get(x.extensionId).rootId||
     x.targetId!==expected.get(x.extensionId).targetId||x.channelId!==expected.get(x.extensionId).channelId||
     x.state!=='LOCAL_SYNTHETIC_CANDIDATE'||x.externalEffects!==0||x.acceptedScienceEdges!==0||
     x.authorityEffect!=='NONE'||x.independentlyReviewed!==false||x.hostRightsAuthenticated!==false||
     x.realModelCalls!==0||x.genuineMacroturns!==0||typeof x.targetOutputChanged!=='boolean')return deny();
  const {receiptSha256,...src}=x;if(receiptSha256!==HASH(src))return deny();
  seen.add(x.extensionId);byRoot[x.rootId]=(byRoot[x.rootId]??0)+1;byChannel[x.channelId]=(byChannel[x.channelId]??0)+1;
 }
 if(Object.values(byRoot).some(v=>v!==20)||Object.keys(byRoot).length!==21||Object.values(byChannel).some(v=>v!==21)||Object.keys(byChannel).length!==20)return deny();
 const receipt={schema:'atlas.ariadne.symbiotic-meta145/v0.1',state:'SIMULATED_MESH_READY_FOR_REVIEW',coordinate,rootOperators:21,
   originalOperators:20,directedExtensionConfigurations:420,byRoot,byChannel,
   topologyDigest:HASH(all.map(x=>[x.extensionId,x.receiptSha256]).sort(([a],[b])=>a.localeCompare(b))),
   syntheticallyChangedTargetOutcomes:all.filter(x=>x.targetOutputChanged).length,
   syntheticallyUnchangedTargetOutcomes:all.filter(x=>!x.targetOutputChanged).length,
   qualityGainMeasured:false,scienceValidated:false,semanticRelationsAccepted:0,
   independentResidentsVerified:0,realModelCalls:0,genuineMacroturns:0,hostIntegrated:false,
   privatePlayImported:false,permissionGranted:false,externalEffects:0,authorityEffect:'NONE'};
 return {...receipt,receiptSha256:HASH(receipt)};
}
export function prepareMeshWorkReference({coordinate,extensionId,originMode='WORK'}={}){
 if(!validCoord(coordinate)||!extensionCatalog().some(x=>x.id===extensionId)||originMode!=='WORK')return deny();
 return {schema:'atlas.ariadne.symbiotic-work-reference/v0.1',state:'PREPARED_NOT_POSTED',coordinate,extensionId,
   source:{namespace:'ariadne',edition:'v0.7',digest:ORIGINAL_SHA256},
   publisher:'EXISTING_WORK_HOST_ONLY',hostAuthenticated:false,readRightsVerified:false,returnRightsVerified:false,
   sourceClaimsValidated:false,noModelCall:true,externalEffects:0,authorityEffect:'NONE'};
}
