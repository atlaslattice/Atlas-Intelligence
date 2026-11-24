/**
 * Atlas Neural OSS Forge v0.1 — ORIGINAL dependency-free source-only prototypes.
 * NOT a pretrained model, training service, host permission issuer or production SwarmChat gateway.
 * Public-safe: no private Ariadne source bodies, model weights or external libraries copied.
 */
import { createHash } from 'node:crypto';
export const SCHEMA='atlas.neural.oss-native/v1';
export const SOURCE_EDITION='Ariadne v0.7';
export const SOURCE_SHA='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
export const sha=s=>createHash('sha256').update(s).digest('hex');
const HEX=/^[0-9a-f]{64}$/;
const ADDRESS=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const NONWORK=new Set(['PLAY','SOCIAL','IMAGINE','DREAM','QUIET','PALACE','BRAIN']);
const REVIEW_HOLD=Object.freeze({schema:SCHEMA,status:'HOLD_NOT_AUTHORIZED',canTrain:false,canPublish:false,canPost:false,canonEffect:'NONE'});
const isString=(s,max=256)=>typeof s==='string'&&s.length>0&&s.length<=max&&!/[\x00-\x1f]/.test(s);
const isData=(x)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype&&
 Object.values(Object.getOwnPropertyDescriptors(x)).every(d=>Object.hasOwn(d,'value')&&d.enumerable);
const dataKeys=(x,fields)=>isData(x)&&Object.keys(x).every(k=>fields.includes(k));
export function parseHSN(id){
 const m=typeof id==='string'?ADDRESS.exec(id):null;
 if(!m)return null;
 const house=Number(m[1]),sphere=Number(m[2]),node=Number(m[3]);
 return Object.freeze({id,house,sphere,node,role:sphere<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META',ordinal:(house-1)*144+(sphere-1)*12+node});
}
export function featureLibraryStatus(license,upstreamStatus){
 if(!isString(license)||!isString(upstreamStatus))return 'HOLD_LICENSE';
 if(upstreamStatus.startsWith('ARCHIVED'))return 'HOLD_ARCHIVED';
 if(['AGPL-3.0','GPL-3.0','GPL-2.0','LGPL-3.0','CeCILL-2.1'].includes(license))return 'HOLD_COPYRIGHT_REVIEW';
 if(!['Apache-2.0','MIT','BSD-3-Clause','CC0-1.0','PostgreSQL'].includes(license))return 'HOLD_LICENSE';
 return 'REVIEW_PERMISSIVE_NOTICE_AND_MODEL_DATA_SEPARATELY';
}
/** exact 12x12 candidate count with no semantic claim. All repo URIs must be observed entries. */
export function validateCatalogue(catalog,sourceRegistry){
 if(!isData(catalog)||!isData(sourceRegistry)||!Array.isArray(catalog.features)||!Array.isArray(sourceRegistry.sources)||
    catalog.features.length!==144)return REVIEW_HOLD;
 const sources=new Map(sourceRegistry.sources.map(x=>[x.repo,x]));
 const ids=new Set(),slots=new Set(),counts=Array(12).fill(0);let held=0;
 for(const x of catalog.features){
  if(!dataKeys(x,['id','moduleId','moduleName','slot','title','proposedDesign','testThatWouldDisproveIt','primaryRepo','secondaryRepo','primaryUrl','secondaryUrl','upstreamLicensePrimary','upstreamLicenseSecondary','upstreamStatusPrimary','upstreamStatusSecondary','licenseGate','existingAtlasStatus','adoption','releaseAuthority','humanReview','reusesSourceCode','sourceMechanismDepth','sourceRights','reviewSlotOnly','semanticMappingStatus','priority','metricToMeasure','existingSourceNotes']))return REVIEW_HOLD;
  const m=/^NEURO\.M(0[1-9]|1[0-2])\.F(0[1-9]|1[0-2])$/.exec(x.id||'');if(!m||ids.has(x.id)||slots.has(x.reviewSlotOnly))return REVIEW_HOLD;
  const h=Number(m[1]),s=Number(m[2]);counts[h-1]++;
  if(x.moduleId!==`NEURO.M${m[1]}`||x.slot!==s||x.reviewSlotOnly!==`H${m[1]}.S${m[2]}`||
   x.semanticMappingStatus!=='UNREVIEWED_NO_SAME_AS'||x.adoption!=='PROPOSED_NOT_IMPLEMENTED'||x.releaseAuthority!=='NONE'||x.reusesSourceCode!==false)return REVIEW_HOLD;
  const p=sources.get(x.primaryRepo),q=sources.get(x.secondaryRepo);
  if(!p||!q||x.primaryUrl!==p.url||x.secondaryUrl!==q.url||x.upstreamLicensePrimary!==p.licenseReported||x.upstreamLicenseSecondary!==q.licenseReported)return REVIEW_HOLD;
  if(featureLibraryStatus(p.licenseReported,p.upstreamStatus).startsWith('HOLD_')||featureLibraryStatus(q.licenseReported,q.upstreamStatus).startsWith('HOLD_'))held++;
  if(!isString(x.title,160)||!isString(x.testThatWouldDisproveIt,800)||!isString(x.proposedDesign,1000))return REVIEW_HOLD;
  ids.add(x.id);slots.add(x.reviewSlotOnly);
 }
 if(counts.some(n=>n!==12))return REVIEW_HOLD;
 return Object.freeze({schema:SCHEMA,status:'SOURCE_LINKED_CANDIDATES_PREPARED',modules:12,features:144,
   licenseRestrictedCandidates:held,acceptedOntologyMappings:0,installedFeatures:0,trainingRuns:0,hostAuthenticated:false,
   canTrain:false,canPublish:false,canPost:false,canonEffect:'NONE'});
}
const stableCanonical=(x)=>{
 if(x===null||typeof x==='string'||typeof x==='boolean'||typeof x==='number'&&Number.isFinite(x))return JSON.stringify(x);
 if(Array.isArray(x))return '['+x.map(stableCanonical).join(',')+']';
 if(isData(x))return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stableCanonical(x[k])).join(',')+'}';
 throw new TypeError('JSON_ONLY');
};
/** Cached embedding != source grant. Separate semantic and evidence identities. */
export function vectorCacheKey({encoderRevision,semanticDigest,poolingVersion}){
 if(!HEX.test(semanticDigest||'')||!isString(encoderRevision)||!isString(poolingVersion))return null;
 return sha(stableCanonical({encoderRevision,semanticDigest,poolingVersion}));
}
export function evidenceBindingKey({sourceId,sourceRevision,recordDigest,rightsEpoch,sourceFamily,mode}){
 if(!isString(sourceId)||!isString(sourceRevision)||!HEX.test(recordDigest||'')||!isString(rightsEpoch)||!isString(sourceFamily)||mode!=='WORK')return null;
 return sha(stableCanonical({sourceId,sourceRevision,recordDigest,rightsEpoch,sourceFamily,mode}));
}
export function stableExactTopK(items,k){
 if(!Array.isArray(items)||!Number.isInteger(k)||k<1||k>100)return [];
 if(items.length>50_000)return [];
 const a=[];
 for(let i=0;i<items.length;i++){
  const x=items[i];
  if(!isData(x)||!isString(x.id)||typeof x.score!=='number'||!Number.isFinite(x.score))return [];
  a.push({id:x.id,score:x.score,ordinal:i});
 }
 return a.sort((x,y)=>y.score-x.score||x.ordinal-y.ordinal).slice(0,k).map(({id,score})=>({id,score}));
}
/** Synthetic, original discrete LIF reference. No SNN training or energy measurement. */
export function lifStep(state,input,{beta=0.85,threshold=1,reset='subtract'}={}){
 if(!Number.isFinite(state)||!Number.isFinite(input)||!Number.isFinite(beta)||beta<0||beta>1||
   !Number.isFinite(threshold)||threshold<=0||!['subtract','zero'].includes(reset))throw new TypeError('INVALID_LIF');
 const integrated=beta*state+input;
 // Finite operands can still overflow during arithmetic. Never return an
 // invalid spike or voltage and never silently clamp a scientific reference.
 if(!Number.isFinite(integrated))throw new RangeError('NONFINITE_LIF_INTERMEDIATE');
 const spike=integrated>=threshold?1:0;
 const voltage=spike?(reset==='zero'?0:integrated-threshold):integrated;
 if(!Number.isFinite(voltage))throw new RangeError('NONFINITE_LIF_VOLTAGE');
 return Object.freeze({voltage,spike,integrated,energyMeasured:false});
}
export function runEventLif(events,config={}){
 if(!Array.isArray(events)||events.length>4096||events.some(x=>typeof x!=='number'||!Number.isFinite(x)))throw new TypeError('INVALID_EVENTS');
 let voltage=0;const spikes=[];
 for(let i=0;i<events.length;i++){
  const out=lifStep(voltage,events[i],config);voltage=out.voltage;if(out.spike)spikes.push(i);
 }
 return Object.freeze({finalVoltage:voltage,spikeIndices:Object.freeze(spikes),synapticEvents:events.length,
   hardwareLatencyMeasured:false,energyMeasured:false});
}
/** Reject training on one root spanning train and test; ancestry must be trusted elsewhere. */
export function familySplitPreview(rows){
 if(!Array.isArray(rows)||rows.length<1||rows.length>10_000)return REVIEW_HOLD;
 const byFamily=new Map();
 for(const x of rows){
  if(!isData(x)||!isString(x.sourceFamily)||!['TRAIN','DEV','FINAL'].includes(x.split)||x.verifiedFamily!==true||typeof x.eligibleForTrain!=='boolean'||(x.split==='TRAIN'&&!x.eligibleForTrain))return REVIEW_HOLD;
  const old=byFamily.get(x.sourceFamily);if(old&&old!==x.split)return Object.freeze({...REVIEW_HOLD,reason:'FAMILY_CROSS_SPLIT'});
  byFamily.set(x.sourceFamily,x.split);
 }
 return Object.freeze({schema:SCHEMA,status:'SOURCE_ONLY_SPLIT_PROJECTION',families:byFamily.size,
    canTrain:false,canPublish:false,hostVerified:false});
}
/** Does not access source text. Host caller must supply independent trusted grants. */
export function reviewNeuralReferences({candidates,sourceUse,returnDisclosure,verifiedInfluenceInventory}){
 if(!Array.isArray(candidates)||!Array.isArray(sourceUse)||!Array.isArray(returnDisclosure)||verifiedInfluenceInventory!==true||
   candidates.length>100||sourceUse.length>500||returnDisclosure.length>100)return REVIEW_HOLD;
 const use=new Map(),ret=new Map();
 for(const d of sourceUse){if(!isData(d)||!isString(d.sourceId)||typeof d.allowed!=='boolean'||use.has(d.sourceId))return REVIEW_HOLD;use.set(d.sourceId,d.allowed);}
 for(const d of returnDisclosure){if(!isData(d)||!isString(d.sourceId)||typeof d.allowed!=='boolean'||ret.has(d.sourceId))return REVIEW_HOLD;ret.set(d.sourceId,d.allowed);}
 if([...use.values()].some(v=>!v))return REVIEW_HOLD;
 const out=[];
 for(const c of candidates){
  if(!isData(c)||!isString(c.sourceId)||!isString(c.id)||c.mode!=='WORK'||!HEX.test(c.recordDigest||'')||!use.has(c.sourceId)||!ret.has(c.sourceId)||ret.get(c.sourceId)!==true)return REVIEW_HOLD;
  if(NONWORK.has(c.mode))return REVIEW_HOLD;
  out.push(Object.freeze({id:c.id,sourceId:c.sourceId,recordDigest:c.recordDigest,route:c.route||'UNKNOWN_RETRIEVAL'}));
 }
 return Object.freeze({schema:SCHEMA,status:out.length?'LOCAL_REFERENCES_PREPARED':'ABSTAIN_NO_ELIGIBLE_RETURN',items:Object.freeze(out),
  canPublish:false,canPost:false,canTrain:false,hostVerified:false,rightsCheckedByTrustedHost:false,
  note:'Caller-supplied grants are test doubles; actual host must recheck at network egress.'});
}
export const openAICompatibleTools=()=>Object.freeze([{type:'function',name:'atlas_neural_review_candidates',description:'Preview source-referenced neural candidates; this never authorizes training, posting or deployment',
 strict:true,parameters:{type:'object',additionalProperties:false,properties:{featureIds:{type:'array',items:{type:'string'},maxItems:12},scope:{type:'string',enum:['WORK']}},required:['featureIds','scope']}}]);
