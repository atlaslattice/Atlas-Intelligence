import {lookupKernel,kernelCatalog} from '../index.mjs';
import {snapshot} from '../runtime/json.mjs';
import {queryWithReleasePolicy,releasePolicy} from '../runtime/dispatch-policy.mjs';

export const CIVILIZATION_KERNEL_ACTION_VERSION='atlas.civilization.kernel-actions.v1';
export const CIVILIZATION_KERNEL_LIMITS=Object.freeze({inputBytes:1048576,outputBytes:1048576,maxDepth:32,maxItems:32768,maxQueries:32});
const fail=code=>{throw Object.assign(new Error(code),{code});};
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function bounded(value,output=false){
 try{return snapshot(value,{maxBytes:output?CIVILIZATION_KERNEL_LIMITS.outputBytes:CIVILIZATION_KERNEL_LIMITS.inputBytes,maxDepth:CIVILIZATION_KERNEL_LIMITS.maxDepth,maxItems:CIVILIZATION_KERNEL_LIMITS.maxItems});}
 catch{fail(output?'CIVILIZATION_KERNEL_OUTPUT_BOUND':'CIVILIZATION_KERNEL_INPUT_BOUND');}
}
function argumentsFor(raw,keys){
 const args=bounded(raw);
 if(!plain(args)||Object.keys(args).some(key=>!keys.includes(key)))fail('CIVILIZATION_KERNEL_ARGUMENT_INVALID');
 if(args.scope!=='WORK')fail('CIVILIZATION_KERNEL_WORK_REQUIRED');
 return args;
}
const effectStatement=()=>({authorityEffect:'NONE',canonChanged:false,bundledPrivateCorpusIncluded:false,callerDatasetPrivacy:'UNCLASSIFIED_REQUIRES_HOST_SCOPE',modelCalls:0,externalCalls:0,storageWrites:0,roomPosts:0});

/** Pure bounded computation. The caller owns host READ and RETURN authorization. */
export function civilizationKernelAction(action,raw={}){
 if(action==='civilization_kernel_status'){
  argumentsFor(raw,['scope']);
  const catalog=kernelCatalog();
  return bounded({schema:CIVILIZATION_KERNEL_ACTION_VERSION,status:'LOCAL_COMPUTATION_SUPPORTING_CAPABILITY',scope:'WORK',catalog,dispatchPolicies:Object.fromEntries(catalog.kernels.map(kernel=>[kernel.houseId,releasePolicy(kernel.houseId)])),limits:{...CIVILIZATION_KERNEL_LIMITS},specialized_contract_complete:false,performanceGainClaimed:false,...effectStatement()},true);
 }
 if(action!=='civilization_kernel_evaluate')fail('CIVILIZATION_KERNEL_ACTION_UNKNOWN');
 const args=argumentsFor(raw,['scope','houseId','dataset','requests']);
 if(typeof args.houseId!=='string'||!/^H(0[1-9]|1[0-2])$/.test(args.houseId))fail('CIVILIZATION_KERNEL_HOUSE_INVALID');
 if(!plain(args.dataset)||!Array.isArray(args.requests)||args.requests.length<1||args.requests.length>CIVILIZATION_KERNEL_LIMITS.maxQueries)fail('CIVILIZATION_KERNEL_ARGUMENT_INVALID');
 const kernel=lookupKernel(args.houseId);
 const results=[];let resultBytes=2;
 try{
  const prepared=kernel.prepare(args.dataset);
  for(const request of args.requests){
   const result=bounded(queryWithReleasePolicy(args.houseId,kernel,prepared,request),true);
   resultBytes+=new TextEncoder().encode(JSON.stringify(result)).length+(results.length?1:0);
   if(resultBytes>CIVILIZATION_KERNEL_LIMITS.outputBytes)fail('CIVILIZATION_KERNEL_OUTPUT_BOUND');
   results.push(result);
  }
 }catch(error){if(error?.code==='CIVILIZATION_KERNEL_OUTPUT_BOUND')throw error;fail('CIVILIZATION_KERNEL_CONTRACT_REJECTED');}
 return bounded({schema:CIVILIZATION_KERNEL_ACTION_VERSION,status:'LOCAL_COMPUTATION_SUPPORTING_CAPABILITY',scope:'WORK',houseId:args.houseId,descriptor:kernel.descriptor,dispatchPolicy:releasePolicy(args.houseId),results,queryCount:results.length,indexPreparations:1,specialized_contract_complete:false,performanceGainClaimed:false,...effectStatement()},true);
}

export const civilizationKernelToolDefinitions=Object.freeze([
 ['civilization_kernel_status','Read the twelve bounded local software kernels and their limits. This does not establish completion of any specialized scientific node or grant host authority.',['scope'],{scope:{type:'string',enum:['WORK']}}],
 ['civilization_kernel_evaluate','Execute up to 32 local queries against one caller-supplied dataset using one prepared index. Supporting software capability only; existing host Work authorization applies.',['scope','houseId','dataset','requests'],{scope:{type:'string',enum:['WORK']},houseId:{type:'string',pattern:'^H(0[1-9]|1[0-2])$'},dataset:{type:'object'},requests:{type:'array',minItems:1,maxItems:32,items:{type:'object'}}}]
]);

/** A route-specific bounded parser; never changes existing host body limits. */
export async function readCivilizationKernelJson(request){
 const contentLength=request.headers.get('content-length');
 if(contentLength!==null&&(!/^\d+$/.test(contentLength)||Number(contentLength)>CIVILIZATION_KERNEL_LIMITS.inputBytes))fail('CIVILIZATION_KERNEL_REQUEST_TOO_LARGE');
 const reader=request.body?.getReader();let length=0;const chunks=[];
 if(reader)while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>CIVILIZATION_KERNEL_LIMITS.inputBytes){await reader.cancel();fail('CIVILIZATION_KERNEL_REQUEST_TOO_LARGE');}chunks.push(value);}
 const bytes=new Uint8Array(length);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
 try{return bounded(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));}catch{fail('CIVILIZATION_KERNEL_JSON_INVALID');}
}
