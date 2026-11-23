import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareLocalWorkBurst,executeLocalWorkBurst,BURST_SCHEMA} from '../src/work-burst.mjs';

const item=(id,more={})=>({id,operator:'LOCAL_VALIDATE',mode:'WORK',
  input:{value:id},evidenceRefs:['synthetic:work-receipt'],...more});
const handlers={LOCAL_VALIDATE:async ({value})=>({
  status:'PASS_LOCAL',resultTag:'VERIFIED',checks:value.length})};
const run=(tasks,options={})=>executeLocalWorkBurst({tasks,operators:handlers,...options});
const plan=(tasks,options={})=>prepareLocalWorkBurst({tasks,...options});
const hold=(tasks,reason)=>assert.equal(plan(tasks).reason,reason);

test('batch: twelve independent Work operations complete across three waves',async()=>{
  const out=await run(Array.from({length:12},(_,i)=>item('step'+i)),{maxParallel:4});
  assert.equal(out.status,'LOCAL_COMPLETE');
  assert.deepEqual(out.counts,{passed:12,held:0,failed:0});
  assert.deepEqual(out.waves.map(x=>x.length),[4,4,4]);
  assert.equal(out.receipts.length,12);
});
test('dependent Work flows run in causal order, not one visit per step',async()=>{
  const out=await run([item('first'),item('second',{dependsOn:['first']}),
    item('third',{dependsOn:['first']}),item('fourth',{dependsOn:['second','third']})]);
  assert.deepEqual(out.waves,[['first'],['second','third'],['fourth']]);
  assert.equal(out.counts.passed,4);
});
test('same source resource never shares a parallel wave',async()=>{
  const out=await run([item('first',{resourceKey:'same-file'}),item('second',{resourceKey:'same-file'}),
    item('third',{resourceKey:'different-file'})],{maxParallel:3});
  assert.deepEqual(out.waves,[['first','third'],['second']]);
});
test('independent local steps overlap inside a wave',async()=>{
  let inFlight=0,peak=0;
  const out=await run(Array.from({length:8},(_,i)=>item('work'+i)),{
    maxParallel:4,operators:{LOCAL_VALIDATE:async()=>{
      inFlight++;peak=Math.max(peak,inFlight);
      await Promise.resolve();await Promise.resolve();
      inFlight--;return {status:'PASS_LOCAL',resultTag:'DONE',checks:1};
    }}});
  assert.equal(peak,4);assert.equal(out.counts.passed,8);
});
test('a failed step holds dependents but lets other lines finish',async()=>{
  const out=await run([item('bad'),item('downstream',{dependsOn:['bad']}),item('good')],{
    operators:{LOCAL_VALIDATE:async input=>input.value==='bad'
      ?{status:'FAIL_LOCAL',resultTag:'DENIED'}
      :{status:'PASS_LOCAL',resultTag:'DONE'}}});
  assert.deepEqual(out.receipts.map(x=>x.status),['FAIL_LOCAL','HOLD_DEPENDENCY','PASS_LOCAL']);
});
test('handler exceptions are bounded generic FAIL, never raw error echoes',async()=>{
  const out=await run([item('bad'),item('good')],{operators:{LOCAL_VALIDATE:async ({value})=>{
    if(value==='bad')throw new Error('PRIVATE_SENSITIVE_SENTINEL');
    return {status:'PASS_LOCAL'};}}});
  assert.equal(out.counts.failed,1);
  assert.doesNotMatch(JSON.stringify(out),/PRIVATE_SENSITIVE_SENTINEL/);
});
test('missing operator holds without executing',async()=>{
  const out=await run([item('stepa',{operator:'LOCAL_UNKNOWN'})]);
  assert.equal(out.receipts[0].status,'HOLD_OPERATOR');
});
test('operator output is hashed rather than copied into review receipts',async()=>{
  const out=await run([item('stepa')],{operators:{LOCAL_VALIDATE:()=>({
    status:'PASS_LOCAL',resultTag:'OKAY',checks:2})}});
  assert.match(out.receipts[0].resultDigest,/^[0-9a-f]{64}$/);
  assert.doesNotMatch(JSON.stringify(out),/"input":/);
});
test('unbounded operator output is held',async()=>{
  const out=await run([item('stepa')],{operators:{LOCAL_VALIDATE:()=>({
    status:'PASS_LOCAL',resultTag:'X'.repeat(20000)})}});
  assert.equal(out.receipts[0].status,'HOLD_OPERATOR');
});
test('invalid operator return does not become success',async()=>{
  const out=await run([item('stepa')],{operators:{LOCAL_VALIDATE:()=>({status:'HOSTED_VERIFIED'})}});
  assert.equal(out.receipts[0].status,'HOLD_OPERATOR');
});
test('unrecognized operator result fields cannot inject host claims',async()=>{
  const out=await run([item('stepa')],{operators:{LOCAL_VALIDATE:()=>({
    status:'PASS_LOCAL',hostedVerified:true})}});
  assert.equal(out.receipts[0].status,'HOLD_OPERATOR');
});
test('default receipt is source-only, no room post, identity, or authority',async()=>{
  const out=await run([item('stepa')]);
  assert.equal(out.schema,BURST_SCHEMA);assert.equal(out.hostedVerified,false);
  assert.equal(out.canPublish,false);assert.equal(out.canonEffect,'NONE');
  assert.equal(out.peerMessagesPosted,0);assert.equal(out.modelWakesPerformed,0);
  assert.equal(out.actualVisitCountClaimed,0);
  assert.equal(out.externalEffectsVerified,false);
});
test('retains refs to evidence and dissent without semantic promotion',async()=>{
  const out=await run([item('stepa',{evidenceRefs:['synthetic:source-A'],
    dissentRefs:['synthetic:objection-B']})]);
  assert.deepEqual(out.receipts[0].evidenceRefs,['synthetic:source-A']);
  assert.deepEqual(out.receipts[0].dissentRefs,['synthetic:objection-B']);
  assert.equal(out.receipts[0].semanticReview,'NOT_PERFORMED');
});
test('all-private or no-harvest tasks rejected before handler lookup',()=>{
  for(const mode of ['PLAY','SOCIAL','IMAGINE','DREAM','QUIET','PALACE','BRAIN','HABITAT']){
    hold([item('stepa',{mode})],'BURST_SOURCE_INVALID');
  }
  hold([item('stepa',{noHarvest:true})],'BURST_SOURCE_INVALID');
});
test('no implicit external action dispatch, only local-named operators',()=>{
  for(const operator of ['DEPLOY','POST_ROOM','LOCAL_DEPLOY!','LOCAL_']){
    hold([item('stepa',{operator})],'BURST_SOURCE_INVALID');
  }
});
test('duplicate IDs refused',()=>hold([item('stepa'),item('stepa')],'DUPLICATE_TASK_ID'));
test('missing, self, and cyclic dependencies refused',()=>{
  hold([item('stepa',{dependsOn:['missing']})],'UNKNOWN_OR_SELF_DEPENDENCY');
  hold([item('stepa',{dependsOn:['stepa']})],'UNKNOWN_OR_SELF_DEPENDENCY');
  hold([item('stepa',{dependsOn:['stepb']}),item('stepb',{dependsOn:['stepa']})],'DEPENDENCY_CYCLE');
});
test('duplicate dependency aliases refused',()=>hold([
  item('stepa'),item('stepb',{dependsOn:['stepa','stepa']})],'BURST_SOURCE_INVALID'));
test('bounds reject >96 tasks and excessive parallelism',()=>{
  assert.equal(plan(Array.from({length:97},(_,i)=>item('step'+i))).reason,'BURST_BOUNDS_INVALID');
  assert.equal(plan([item('stepa')],{maxParallel:13}).reason,'BURST_BOUNDS_INVALID');
  assert.equal(plan([item('stepa')],{maxParallel:0}).reason,'BURST_BOUNDS_INVALID');
});
test('oversized input and unknown flags rejected',()=>{
  hold([item('stepa',{input:{huge:'x'.repeat(9000)}})],'BURST_SOURCE_INVALID');
  hold([item('stepa',{autoPost:true})],'BURST_SOURCE_INVALID');
});
test('resource lock validation protects unusual/synthetic keys',()=>{
  hold([item('stepa',{resourceKey:[]})],'BURST_SOURCE_INVALID');
  hold([item('stepa',{resourceKey:'../bad with space'})],'BURST_SOURCE_INVALID');
});
test('receipt digest stays reproducible across independent async completions',async()=>{
  const jobs=[item('first'),item('second'),item('third')];
  const a=await run(jobs,{maxParallel:3,operators:{LOCAL_VALIDATE:async ({value})=>{
    await Promise.resolve();return {status:'PASS_LOCAL',resultTag:value.toUpperCase()};
  }}});
  const b=await run(jobs,{maxParallel:3,operators:{LOCAL_VALIDATE:async ({value})=>({
    status:'PASS_LOCAL',resultTag:value.toUpperCase()})}});
  assert.equal(a.receiptDigest,b.receiptDigest);
});
test('execution plan does not mutate caller tasks',async()=>{
  const input=[item('stepa'),item('stepb',{dependsOn:['stepa']})];
  const before=JSON.stringify(input);
  await run(input);assert.equal(JSON.stringify(input),before);
});
test('handler output contains no embedded raw data',async()=>{
  const out=await run([item('stepa')],{operators:{LOCAL_VALIDATE:()=>({
    status:'PASS_LOCAL',rawSourceBody:'private-data-not-allowed'})}});
  assert.equal(out.receipts[0].status,'HOLD_OPERATOR');
  assert.doesNotMatch(JSON.stringify(out),/private-data-not-allowed/);
});
test('invalid top-level plan fails closed',()=>{
  assert.equal(plan(null).status,'HOLD_PLAN');
  assert.equal(plan([],{}).status,'HOLD_PLAN');
});
