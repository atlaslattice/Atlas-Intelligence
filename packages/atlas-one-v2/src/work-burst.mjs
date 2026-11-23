/** Atlas ONE v2 Work Burst: bounded, dependency-aware LOCAL execution.
 * Multiple independent Work operations may run in one actual visit. This is
 * NOT a SwarmChat publisher, a permission gate, a model scheduler or a host.
 * Operator callbacks come from the invoking LOCAL process; the runner cannot
 * prove those callbacks are side-effect-free or authorized to use any source.
 */
import {createHash} from 'node:crypto';

export const BURST_SCHEMA='atlas.one.local-work-burst/v1';
const ID=/^[a-z][a-z0-9._-]{2,63}$/;
const OP=/^LOCAL_[A-Z][A-Z0-9_]{2,47}$/;
const RESOURCE=/^[a-zA-Z0-9._:/-]{1,120}$/;
const MAX_ITEMS=96, MAX_PARALLEL=12, MAX_INPUT_BYTES=8192, MAX_RESULT_BYTES=16384;
const permittedKeys=new Set(['id','operator','mode','dependsOn','resourceKey','input','evidenceRefs','dissentRefs','noHarvest']);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)
  &&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const deny=reason=>({schema:BURST_SCHEMA,status:'HOLD_PLAN',reason,hostedVerified:false,canPublish:false,canonEffect:'NONE'});
const hash=s=>createHash('sha256').update(s).digest('hex');
function canonical(x){
  if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';
  if(plain(x))return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
  if(x===null||typeof x==='string'||typeof x==='boolean'||typeof x==='number'&&Number.isFinite(x))return JSON.stringify(x);
  throw new TypeError('NON_JSON_VALUE');
}
const refs=x=>Array.isArray(x)&&x.length<=12&&x.every(v=>typeof v==='string'&&v.length>=5&&v.length<=300);
function normalizedTask(t){
  if(!plain(t)||Object.keys(t).some(k=>!permittedKeys.has(k))
      ||!ID.test(t.id||'')||!OP.test(t.operator||'')||t.mode!=='WORK'||t.noHarvest===true
      ||t.noHarvest!==undefined&&t.noHarvest!==false
      ||t.input!==undefined&&!plain(t.input)
      ||t.resourceKey!==undefined&&(typeof t.resourceKey!=='string'||!RESOURCE.test(t.resourceKey))
      ||!refs(t.evidenceRefs??[])||!refs(t.dissentRefs??[]))throw new TypeError('TASK_SHAPE_OR_MODE');
  const dependsOn=t.dependsOn??[];
  if(!Array.isArray(dependsOn)||dependsOn.length>MAX_ITEMS
      ||dependsOn.some(d=>typeof d!=='string'||!ID.test(d))
      ||new Set(dependsOn).size!==dependsOn.length)throw new TypeError('BAD_DEPENDENCIES');
  const input=t.input??{};
  if(Buffer.byteLength(canonical(input))>MAX_INPUT_BYTES)throw new TypeError('INPUT_TOO_LARGE');
  return Object.freeze({id:t.id,operator:t.operator,dependsOn:Object.freeze([...dependsOn]),
    resourceKey:t.resourceKey??null,mode:'WORK',input:JSON.parse(canonical(input)),
    evidenceRefs:Object.freeze([...(t.evidenceRefs??[])]),
    dissentRefs:Object.freeze([...(t.dissentRefs??[])]),inputDigest:hash(canonical(input))});
}

/** Plan validation does not authenticate source URLs or grant any real rights. */
export function prepareLocalWorkBurst(options={}){
  try{
    const {tasks,maxParallel=4}=options??{};
    if(!Array.isArray(tasks)||tasks.length<1||tasks.length>MAX_ITEMS
      ||!Number.isSafeInteger(maxParallel)||maxParallel<1||maxParallel>MAX_PARALLEL)
      return deny('BURST_BOUNDS_INVALID');
    const normalized=tasks.map(normalizedTask);
    const ids=new Set(normalized.map(x=>x.id));
    if(ids.size!==normalized.length)return deny('DUPLICATE_TASK_ID');
    if(normalized.some(t=>t.dependsOn.some(d=>!ids.has(d)||d===t.id)))return deny('UNKNOWN_OR_SELF_DEPENDENCY');
    const todo=new Map(normalized.map(t=>[t.id,t])),seen=new Set();
    while(todo.size){
      const ready=[...todo.values()].filter(t=>t.dependsOn.every(d=>seen.has(d)));
      if(!ready.length)return deny('DEPENDENCY_CYCLE');
      for(const t of ready){seen.add(t.id);todo.delete(t.id);}
    }
    return {schema:BURST_SCHEMA,status:'PREPARED_LOCAL_ONLY',tasks:normalized,
      maxParallel,visitCountClaimed:0,hostedVerified:false,canPublish:false,canonEffect:'NONE',
      noAutomaticRoomPosts:true};
  }catch{return deny('BURST_SOURCE_INVALID');}
}
function receipt(t,status,resultDigest=null,reason=null){
  return {id:t.id,operator:t.operator,status,reason,resourceKey:t.resourceKey,
    dependsOn:[...t.dependsOn],inputDigest:t.inputDigest,resultDigest,
    evidenceRefs:[...t.evidenceRefs],dissentRefs:[...t.dissentRefs],
    rightsState:'HOST_NOT_CHECKED',semanticReview:'NOT_PERFORMED'};
}
/** Execute LOCAL caller-owned handlers only. Every wave may contain multiple
 * independent steps. Equal resourceKeys never share a wave, dependencies must
 * pass, and failures never cancel unrelated independent tasks.
 * The runner cannot enforce timeouts or effects inside arbitrary handlers.
 */
export async function executeLocalWorkBurst(options={}){
  const {tasks,maxParallel=4,operators}=options??{};
  const plan=prepareLocalWorkBurst({tasks,maxParallel});
  if(plan.status!=='PREPARED_LOCAL_ONLY')return plan;
  if(!plain(operators))return deny('LOCAL_OPERATOR_REGISTRY_REQUIRED');
  const pending=new Map(plan.tasks.map(t=>[t.id,t]));
  const outcomes=new Map();const waves=[];
  while(pending.size){
    let blocked=0;
    for(const [id,t] of pending){
      if(t.dependsOn.every(d=>outcomes.has(d))&&t.dependsOn.some(d=>outcomes.get(d).status!=='PASS_LOCAL')){
        outcomes.set(id,receipt(t,'HOLD_DEPENDENCY',null,'UPSTREAM_NOT_PASSED'));
        pending.delete(id);blocked++;
      }
    }
    const chosen=[],heldLocks=new Set();
    for(const t of pending.values()){
      if(chosen.length>=plan.maxParallel)break;
      if(!t.dependsOn.every(d=>outcomes.get(d)?.status==='PASS_LOCAL'))continue;
      if(t.resourceKey&&heldLocks.has(t.resourceKey))continue;
      chosen.push(t);
      if(t.resourceKey)heldLocks.add(t.resourceKey);
    }
    if(!chosen.length){if(blocked)continue;return deny('INTERNAL_SCHEDULER_STALL');}
    waves.push(chosen.map(x=>x.id));
    await Promise.all(chosen.map(async t=>{
      let r;
      const fn=Object.hasOwn(operators,t.operator)?operators[t.operator]:null;
      if(typeof fn!=='function')r=receipt(t,'HOLD_OPERATOR',null,'OPERATOR_NOT_REGISTERED');
      else{
        try{
          // Own JSON-only input snapshot: callback must independently enforce
          // source rights and avoid external effects.
          const output=await fn(JSON.parse(canonical(t.input)),{
            taskId:t.id,dependencyIds:[...t.dependsOn],resourceKey:t.resourceKey});
          const wire=canonical(output);
          if(Buffer.byteLength(wire)>MAX_RESULT_BYTES||!plain(output)
            ||!['PASS_LOCAL','HOLD_LOCAL','FAIL_LOCAL'].includes(output.status)
            ||Object.keys(output).some(k=>!['status','resultTag','checks'].includes(k))
            ||output.resultTag!==undefined&&(typeof output.resultTag!=='string'||!OP.test('LOCAL_'+output.resultTag))
            ||output.checks!==undefined&&(!Number.isSafeInteger(output.checks)||output.checks<0))
            r=receipt(t,'HOLD_OPERATOR',null,'INVALID_LOCAL_RESULT');
          else r=receipt(t,output.status,hash(wire));
        }catch{r=receipt(t,'FAIL_LOCAL',null,'LOCAL_HANDLER_THROWN');}
      }
      outcomes.set(t.id,r);pending.delete(t.id);
    }));
  }
  const ordered=plan.tasks.map(t=>outcomes.get(t.id));
  const counts={passed:ordered.filter(x=>x.status==='PASS_LOCAL').length,
    held:ordered.filter(x=>x.status.startsWith('HOLD_')).length,
    failed:ordered.filter(x=>x.status==='FAIL_LOCAL').length};
  const sealed={schema:BURST_SCHEMA,taskOrder:ordered.map(x=>x.id),waves,
    receipts:ordered,counts};
  return {...sealed,status:counts.held||counts.failed?'LOCAL_COMPLETE_WITH_HOLDS':'LOCAL_COMPLETE',
    receiptDigest:hash(canonical(sealed)),hostedVerified:false,canPublish:false,
    canonEffect:'NONE',peerMessagesPosted:0,modelWakesPerformed:0,
    externalEffectsVerified:false,actualVisitCountClaimed:0};
}
