/** Original-source scope explanation, for local review only.
 * This module reads explicitly supplied original registry bytes. It has no host,
 * broker, provider, scheduler or WorkBurst execution port. Source scope fields
 * are not automatically copied into receipts. The exact caller query IS retained
 * and may itself contain sensitive text: keep receipts owner-local and check
 * current rights before sharing. Lexical evidence never establishes placement.
 */
import {createHash} from 'node:crypto';
import {TextDecoder,types} from 'node:util';
import {searchSource,sourceFragment,SOURCE_PIN} from './source-scope-navigation.mjs';

export const SCOPE_EVIDENCE_SCHEMA='atlas.one.original-source-scope-evidence/v1';
export const SCOPE_NAMESPACE='atlas.ariadne.v0.7.original';
export const SCOPE_EDITION='v0.7';
export const SCOPE_REGISTRY_SHA256=SOURCE_PIN;
export const R02_MATCHER_SHA256='2993c1fb1f23e52255a98d4ec064ae9fe0eed7618d910eed5edb630443a9aac5';
export const MAX_SCOPE_NODES=128;
const NODE=/^H(?:0[1-9]|1[0-2])\.S(?:0[1-9]|1[0-2])\.N(?:0[1-9]|1[0-2])$/;
const FIELDS=Object.freeze(['name','definition','includes','excludes']);
const encoder=new TextEncoder();
const typedArrayByteLength=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype),'byteLength').get;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=reason=>{throw new Error(reason);};
const canonical=value=>JSON.stringify(value===null||typeof value!=='object'?value:
 Array.isArray(value)?value.map(x=>JSON.parse(canonical(x))):
 Object.fromEntries(Object.keys(value).sort().map(k=>[k,JSON.parse(canonical(value[k]))])));
export const scopeDigest=value=>sha(canonical(value));
export const scopeHold=(reason,scopeEvidence)=>Object.freeze({schema:SCOPE_EVIDENCE_SCHEMA,status:'HOLD',reason,
 ...(scopeEvidence?{scopeEvidence}:{}),candidateIngressEligible:false,semanticPlacementEligible:false,
 semanticAcceptance:false,dispatchAllowed:false,rightsVerified:false,hostedVerified:false,
 workModeEligibility:'NOT_EVALUATED',implementedTasks:0,actualMacroturns:0,canPublish:false,
 authorityEffect:'NONE',canonEffect:'NONE'});

/** Snapshot inert data before reading values. No getters, proxies, sparse arrays,
 * symbols, cycles, functions, nonfinite numbers or hidden object fields. */
export function snapshotScopeInput(value){
 const active=new WeakSet();let entries=0;
 function walk(v,depth){
  if(++entries>50000||depth>16)fail('SCOPE_INPUT_LIMIT');
  if(v===null||typeof v==='boolean')return v;
  if(typeof v==='string'){if(encoder.encode(v).length>32768)fail('SCOPE_INPUT_LIMIT');return v;}
  if(typeof v==='number'){if(!Number.isFinite(v))fail('SCOPE_INPUT_NUMBER');return v;}
  if(typeof v!=='object'||types.isProxy(v)||active.has(v))fail('SCOPE_INPUT_NOT_INERT');
  const proto=Object.getPrototypeOf(v),array=Array.isArray(v);
  if(array?proto!==Array.prototype:proto!==Object.prototype&&proto!==null)fail('SCOPE_INPUT_NOT_INERT');
  const ds=Object.getOwnPropertyDescriptors(v);active.add(v);let out;
  if(array){
   const n=ds.length?.value;
   if(!Number.isSafeInteger(n)||n<0||n>6912||Reflect.ownKeys(ds).length!==n+1)fail('SCOPE_INPUT_ARRAY');
   out=[];
   for(let i=0;i<n;i++){const d=ds[String(i)];if(!d||!('value'in d)||!d.enumerable)fail('SCOPE_INPUT_ARRAY');out.push(walk(d.value,depth+1));}
  }else{
   out=Object.create(null);
   for(const key of Reflect.ownKeys(ds)){
    const d=ds[key];
    if(typeof key!=='string'||!('value'in d)||!d.enumerable)fail('SCOPE_INPUT_NOT_INERT');
    out[key]=walk(d.value,depth+1);
   }
  }
  active.delete(v);return Object.freeze(out);
 }
 const copy=walk(value,0);
 if(encoder.encode(canonical(copy)).length>512*1024)fail('SCOPE_INPUT_LIMIT');
 return copy;
}

export function exactScopeKeys(value,required,optional=[]){
 return value!==null&&typeof value==='object'&&!Array.isArray(value)&&
 required.every(k=>Object.hasOwn(value,k))&&Object.keys(value).every(k=>required.includes(k)||optional.includes(k));
}

export function originalNodePin(record){
 return Object.freeze({namespace:SCOPE_NAMESPACE,edition:SCOPE_EDITION,nodeId:record.id,
  recordSha256:scopeDigest(record),kind:record.kind,registrySha256:SCOPE_REGISTRY_SHA256});
}

/** Return five unchanged R02 scope classes, or scopeMatch:null for no match.
 * Digest identity is the canonical whole original node record, separately named
 * from the source-declared record hash whose recipe is not independently known.
 * The selected-node set is explicit: this is not a whole-lattice search proof.
 */
export function prepareSourceScopeEvidence(registryBytes,input){
 try{
  const request=snapshotScopeInput(input);
  if(!exactScopeKeys(request,['query','nodeIds'])||typeof request.query!=='string'||
    encoder.encode(request.query).length>2048||/[\u0000-\u001f\uD800-\uDFFF]/u.test(request.query))return scopeHold('SCOPE_QUERY_INVALID');
  if(!Array.isArray(request.nodeIds)||request.nodeIds.length<1||request.nodeIds.length>MAX_SCOPE_NODES||
    request.nodeIds.some(id=>typeof id!=='string'||!NODE.test(id))||new Set(request.nodeIds).size!==request.nodeIds.length)
    return scopeHold('SCOPE_NODE_SELECTION_INVALID');
  if(registryBytes===null||typeof registryBytes!=='object'||types.isProxy(registryBytes)||
    !types.isUint8Array(registryBytes)||
    ![Buffer.prototype,Uint8Array.prototype].includes(Object.getPrototypeOf(registryBytes)))return scopeHold('ORIGINAL_SOURCE_BYTES_REQUIRED');
  if(typedArrayByteLength.call(registryBytes)>3*1024*1024)return scopeHold('ORIGINAL_SOURCE_BYTES_LIMIT');
  const bytes=new Uint8Array(registryBytes); // Copy typed-array internal data before hashing and parsing.
  if(bytes.length>3*1024*1024||sha(bytes)!==SCOPE_REGISTRY_SHA256)return scopeHold('ORIGINAL_SOURCE_PIN_MISMATCH');
  const source=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  const nodes=Object.create(null);
  for(const id of request.nodeIds){
   const node=source.nodes?.[id],sphere=source.spheres?.[id.slice(0,7)],house=source.houses?.[id.slice(0,3)];
   if(!node||node.id!==id||node.parent!==id.slice(0,7)||!sphere?.children.includes(id)||
      sphere.parent!==id.slice(0,3)||!house?.children.includes(sphere.id)||
      !FIELDS.every(k=>typeof node[k]==='string'))return scopeHold('ORIGINAL_NODE_IDENTITY_INVALID');
   nodes[id]=node;
  }
  let search;
  try{search=searchSource(nodes,request.query,{limit:MAX_SCOPE_NODES});}
  catch{return scopeHold('SCOPE_QUERY_OR_ADDRESS_INVALID');}
  const found=new Map(search.results.map(row=>[row.nodeId,row]));
  const queryDigest=sha(encoder.encode(request.query));
  const records=request.nodeIds.map(id=>{
   const node=nodes[id],hit=found.get(id),scopeMatch=hit?.scopeMatch??null;
   const candidateIngressEligible=scopeMatch==='IDENTITY_ONLY'||scopeMatch==='AFFIRMATIVE_TEXT_ONLY';
   return Object.freeze({nodeId:id,node:originalNodePin(node),localRecordDigest:scopeDigest(node),
    sourceRole:node.kind,lens:node.lens,sourceScopeStatus:node.scope_status,
    subjectRequirement:node.kind==='EPISTEMIC_META'?'EXPLICIT_SUBJECT_STILL_REQUIRED':'SOURCE_SCOPE_REVIEW_STILL_REQUIRED',
    sourceDeclaredRecordDigest:node.source_record_sha256,
    sourceDeclaredRecordHashRecipeIndependentlyVerified:false,
    queryDigest,matchedFields:Object.freeze(hit?[...hit.matchedFields]:[]),scopeMatch,
    reason:hit?.reason??'NO_MATCH',stableReturn:sourceFragment(id,nodes),candidateIngressEligible,
    semanticPlacementEligible:false,semanticAcceptance:false,dispatchAllowed:false});
  });
  const core={schema:SCOPE_EVIDENCE_SCHEMA,status:'LOCAL_ORIGINAL_SOURCE_SCOPE_EVIDENCE_ONLY',
   source:Object.freeze({namespace:SCOPE_NAMESPACE,edition:SCOPE_EDITION,registrySha256:SCOPE_REGISTRY_SHA256,
    originalRegistryBytesVerified:true,localRecordDigestRecipe:'SHA256_UTF8_JSON_SORTED_KEYS_COMPACT_UNESCAPED_UNICODE',
    sourceDeclaredRecordHashRecipeIndependentlyVerified:false}),
   query:Object.freeze({text:request.query,queryDigest,digestRecipe:'SHA256_UTF8_EXACT_QUERY_BYTES',
    normalization:search.normalization,normalizedText:request.query.trim().toLowerCase()}),
   matcher:Object.freeze({origin:'RECOVERED_SCHEDULED_R02',moduleSHA256:R02_MATCHER_SHA256}),
   searchScope:Object.freeze({selectedNodeIds:Object.freeze([...request.nodeIds]),fields:FIELDS,
    sourceExcerptUsed:false,completeLatticeSearchClaimed:false}),
   records:Object.freeze(records),selectedNodeCount:records.length,
   queryMatchedRecords:request.query.trim()?found.size:0,
   candidateIngressEligible:records.every(r=>r.candidateIngressEligible),
   semanticPlacementEligible:false,semanticAcceptance:false,dispatchAllowed:false,
   workModeEligibility:'NOT_EVALUATED',rightsVerified:false,hostedVerified:false,
   hostedSearchParityClaimed:false,implementedTasks:0,actualMacroturns:0,canPublish:false,
   authorityEffect:'NONE',canonEffect:'NONE'};
  return Object.freeze({...core,receiptDigest:scopeDigest(core)});
 }catch{return scopeHold('SCOPE_INPUT_INVALID');}
}
