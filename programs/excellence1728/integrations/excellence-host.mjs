/** Read-only plan operations mounted by each existing owner-scoped host. */
import {createExcellenceProgram,sha256Bytes} from './excellence-program.mjs';
import {compressedPlan,publishedProgram} from './excellence-plan-data.mjs';
let loaded;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const fail=code=>{throw Object.assign(new TypeError(code),{code});};
const allowed=(args,keys)=>{if(!object(args)||Object.keys(args).some(k=>!keys.includes(k)))fail('EXCELLENCE_ARGUMENT_INVALID');};

export function excellencePublishedReference(){return structuredClone(publishedProgram);}

export async function loadHostedExcellenceProgram(){
 if(!loaded)loaded=(async()=>{
  if(compressedPlan.encoding!=='gzip+base64'||compressedPlan.plan_sha256!==publishedProgram.planSha256||compressedPlan.raw_bytes>48*1024*1024)fail('EXCELLENCE_PAYLOAD_IDENTITY_INVALID');
  const compressed=Uint8Array.from(atob(compressedPlan.gzip_base64),x=>x.charCodeAt(0));
  if(await sha256Bytes(compressed)!==compressedPlan.compressed_sha256)fail('EXCELLENCE_COMPRESSED_DIGEST_MISMATCH');
  const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
  const reader=stream.getReader(),parts=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>compressedPlan.raw_bytes){await reader.cancel();fail('EXCELLENCE_DECOMPRESSED_SIZE_MISMATCH');}parts.push(value);}}finally{reader.releaseLock();}
  if(size!==compressedPlan.raw_bytes)fail('EXCELLENCE_DECOMPRESSED_SIZE_MISMATCH');
  const raw=new Uint8Array(size);let offset=0;for(const part of parts){raw.set(part,offset);offset+=part.byteLength;}
  return createExcellenceProgram(raw,publishedProgram.planSha256);
 })();
 try{return await loaded;}catch(error){loaded=undefined;throw error;}
}

export async function excellenceAction(action,args={}){
 const program=await loadHostedExcellenceProgram();
 switch(action){
  case 'excellence_status':allowed(args,[]);return {...program.descriptor(),interface:'SOURCE_PLAN_READ_ONLY',queueWrites:0};
  case 'excellence_task':allowed(args,['taskId']);return {program:program.descriptor(),task:program.task(args.taskId)};
  case 'excellence_query':allowed(args,['text','workstream','phase','offset','limit']);return program.query(args);
  case 'excellence_ready':allowed(args,['limit']);return program.ready(args);
  case 'excellence_prepare':allowed(args,['taskId','roomId']);return program.prepareWorkTask(args.taskId,{roomId:args.roomId,mode:'WORK'});
  default:fail('EXCELLENCE_ACTION_UNKNOWN');
 }
}

const taskId={type:'string',pattern:'^EX\\.W(0[1-9]|1[0-2])\\.C(0[1-9]|1[0-2])\\.P(0[1-9]|1[0-2])$'};
export const excellenceToolDefinitions=Object.freeze([
 ['excellence_status','Inspect the exact 1,728-step engineering program and its planned execution status.',[],{}],
 ['excellence_task','Read one concrete engineering action, source targets, prerequisites and acceptance evidence.',['taskId'],{taskId}],
 ['excellence_query','Search the source-defined engineering program with bounded literal filters.',[],{text:{type:'string',maxLength:160},workstream:{type:'string',pattern:'^EX\\.W(0[1-9]|1[0-2])$'},phase:{type:'string',pattern:'^P(0[1-9]|1[0-2])$'},offset:{type:'integer',minimum:0,maximum:1728},limit:{type:'integer',minimum:1,maximum:144}}],
 ['excellence_ready','List initial program steps without unfinished prerequisites. Does not queue, authorize or execute them.',[],{limit:{type:'integer',minimum:1,maximum:144}}],
 ['excellence_prepare','Prepare a source-bound engineering handoff for an existing Work room; never post or grant rights.',['taskId','roomId'],{taskId,roomId:{type:'string',pattern:'^[A-Za-z0-9_-]{3,80}$'}}]
]);
