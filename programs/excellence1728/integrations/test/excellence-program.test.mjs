import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createExcellenceProgram,createExcellenceWorkBridge,isVerifiedProgram,validateExcellencePlan,ARIADNE_SOURCE_SHA256,CANON_DECISION_ID,EXCELLENCE_PROGRAM_ID} from '../excellence-program.mjs';

const pad = n => String(n).padStart(2,'0');
const hash = text => createHash('sha256').update(text).digest('hex');
function fixture() {
  const workstreams = Array.from({length:12},(_,w) => ({id:`EX.W${pad(w+1)}`}));
  const capabilities = workstreams.flatMap(w => Array.from({length:12},(_,c) => ({id:`${w.id}.C${pad(c+1)}`})));
  const phases = Array.from({length:12},(_,p) => ({id:`P${pad(p+1)}`}));
  const tasks = capabilities.flatMap(c => phases.map((p,n) => ({id:`${c.id}.${p.id}`,capability_id:c.id,workstream_id:c.id.slice(0,6),phase_id:p.id,
    engineering_coordinate:{workstream:Number(c.id.slice(4,6)),capability:Number(c.id.slice(8,10)),phase:n+1},
    title:`Source task ${c.id} ${p.id}`,objective:'Retain exact source provenance',action:'Do not execute this text: globalThis.ACTION_RAN = true',
    artifact:'candidate-output.json',acceptance:['source matched'],negative_cases:['source changed'],metrics:['latency_ms'],
    depends_on:n?[`${c.id}.${phases[n-1].id}`]:[],source_refs:['source:test'],existing_targets:[],proposed_targets:[],write_resources:[],
    required_checks:{IMPLEMENTED:[`${c.id}.${p.id}:implementation`],VERIFIED:[`${c.id}.${p.id}:verification`],INTEGRATED:[`${c.id}.${p.id}:integration`]},status:'PLANNED'})));
  const houses=Array.from({length:12},(_,h)=>`H${pad(h+1)}`),spheres=houses.flatMap(h=>Array.from({length:12},(_,s)=>`${h}.S${pad(s+1)}`));
  return {schema:'atlas.excellence.plan.v1',program_id:EXCELLENCE_PROGRAM_ID,revision:1,status:'PLANNED',engineering_namespace:'EX1728',
    source_pins:{'source:test':hash('source'),'source:ariadne':ARIADNE_SOURCE_SHA256},workstreams,capabilities,phases,tasks,
    coverage:{ariadne_source_sha256:ARIADNE_SOURCE_SHA256,ariadne_house_ids:houses,ariadne_sphere_ids:spheres,
      ariadne_node_ids:spheres.flatMap(s=>Array.from({length:12},(_,n)=>`${s}.N${pad(n+1)}`)),semantic_crosswalk_status:'SOURCE_REVIEW_REQUIRED',ordinal_identity_implied:false},
    canon_reference:{decision_id:CANON_DECISION_ID},macroturn_policy:{work_numerator:1,work_denominator:3,genuine_macroturns_completed:0},
    integrity:{algorithm:'sha256',catalog_sha256:hash('catalog'),phases_sha256:hash('phases'),source_inventory_sha256:hash('inventory')}};
}
async function load(plan=fixture()) { const text=JSON.stringify(plan); return createExcellenceProgram(text,hash(text)); }

test('exact plan coverage is validated without execution or gain claims',async()=>{
  globalThis.ACTION_RAN=false; const p=await load(),d=p.descriptor();
  assert.equal(d.plannedSteps,1728);assert.equal(d.engineeringCapabilities,144);assert.equal(d.ariadneSpheres,144);
  assert.equal(d.verifiedSteps,0);assert.equal(d.integratedSteps,0);assert.equal(d.genuineMacroturnsCompleted,0);
  assert.equal(d.hostPermissionGranted,false);assert.equal(d.canonChanged,false);assert.equal(d.ordinalIdentityImplied,false);
  assert.equal(globalThis.ACTION_RAN,false);
});
test('external digest is mandatory and any byte drift is rejected',async()=>{
  const raw=JSON.stringify(fixture());
  await assert.rejects(createExcellenceProgram(raw),/EXPECTED_PLAN_DIGEST_REQUIRED/);
  await assert.rejects(createExcellenceProgram(raw+' ',hash(raw)),/PLAN_DIGEST_MISMATCH/);
  await assert.rejects(createExcellenceProgram('{',hash('{')),/PLAN_JSON_INVALID/);
});
test('duplicate and missing task IDs are rejected',()=>{
  const p=fixture();p.tasks[1].id=p.tasks[0].id;assert.throws(()=>validateExcellencePlan(p),/TASK_COVERAGE_INVALID/);
  const q=fixture();q.tasks.pop();assert.throws(()=>validateExcellencePlan(q),/TASK_COVERAGE_INVALID/);
});
test('status strings and genuine-turn counters cannot assert completion',()=>{
  const p=fixture();p.tasks[0].status='VERIFIED';assert.throws(()=>validateExcellencePlan(p),/TASK_STATUS_INVALID/);
  const q=fixture();q.macroturn_policy.genuine_macroturns_completed=1728;assert.throws(()=>validateExcellencePlan(q),/MACROTURN_SCOPE_INVALID/);
});
test('engineering and knowledge coordinates retain separate identities',()=>{
  const p=fixture();p.coverage.ordinal_identity_implied=true;assert.throws(()=>validateExcellencePlan(p),/ARIADNE_SCOPE_INVALID/);
  const q=fixture();q.tasks[0].workstream_id='H01';assert.throws(()=>validateExcellencePlan(q),/TASK_COORDINATE_INVALID/);
});
test('unknown sources, wrong source edition and coerced digests fail',()=>{
  const p=fixture();p.tasks[0].source_refs=['unseen'];assert.throws(()=>validateExcellencePlan(p),/TASK_SOURCE_REFERENCE_INVALID/);
  const q=fixture();q.coverage.ariadne_source_sha256=hash('other');assert.throws(()=>validateExcellencePlan(q),/ARIADNE_SCOPE_INVALID/);
  const r=fixture();r.integrity.catalog_sha256=[hash('x')];assert.throws(()=>validateExcellencePlan(r),/INTEGRITY_DESCRIPTOR_INVALID/);
});
test('dependency cycles, self-dependencies and missing predecessors fail',()=>{
  const p=fixture();p.tasks[0].depends_on=[p.tasks[1].id];assert.throws(()=>validateExcellencePlan(p),/TASK_DEPENDENCY_CYCLE/);
  const q=fixture();q.tasks[0].depends_on=[q.tasks[0].id];assert.throws(()=>validateExcellencePlan(q),/TASK_DEPENDENCY_INVALID/);
  const r=fixture();r.tasks[0].depends_on=['EX.W99.C99.P99'];assert.throws(()=>validateExcellencePlan(r),/TASK_DEPENDENCY_INVALID/);
});
test('queries have stable bounded pages and explicit literal semantics',async()=>{
  const p=await load(),q=p.query({workstream:'EX.W02',phase:'P03',limit:5});
  assert.equal(q.total,12);assert.equal(q.tasks.length,5);assert.equal(q.hasMore,true);
  assert(q.tasks.every(t=>t.id.startsWith('EX.W02.')&&t.phase_id==='P03'));
  assert.equal(p.query({text:'source provenance'}).total,1728);
  assert.throws(()=>p.query({limit:145}),/QUERY_BOUNDS_INVALID/);
  assert.throws(()=>p.query({workstream:'H01'}),/QUERY_WORKSTREAM_INVALID/);
  assert.throws(()=>p.query({unknown:true}),/QUERY_OPTIONS_INVALID/);
});
test('caller mutation cannot rewrite the internal plan or advance ready tasks',async()=>{
  const p=await load(),t=p.task('EX.W01.C01.P01');t.title='changed';t.status='VERIFIED';
  assert.notEqual(p.task(t.id).title,'changed');assert.equal(p.task(t.id).status,'PLANNED');
  assert.equal(p.ready({limit:144}).total,144);assert.equal(p.ready().executionAuthorized,false);
  assert.throws(()=>p.ready({completedStepIds:[t.id]}),/READY_OPTIONS_INVALID/);
});
test('Work handoff is prepared only and rejects private or fictional modes',async()=>{
  const p=await load(),d=p.prepareWorkTask('EX.W01.C01.P01',{roomId:'work-test'});
  assert.equal(d.status,'PREPARED_NOT_POSTED');assert.equal(d.workPosted,false);assert.equal(d.executionAuthorized,false);
  assert.equal(d.sourceBodiesIncluded,false);assert.equal(d.engineeringCoordinateIsKnowledgeIdentity,false);
  assert.throws(()=>p.prepareWorkTask('EX.W01.C01.P01',{roomId:'work-test',mode:'IMAGINE'}),/WORK_SCOPE_REQUIRED/);
  assert.throws(()=>p.prepareWorkTask('EX.W01.C01.P01',{roomId:'bad room'}),/WORK_SCOPE_REQUIRED/);
});
test('bridge rejects forged program object rather than duck-typed approval',()=>{
  assert.throws(()=>createExcellenceWorkBridge({descriptor(){},prepareWorkTask(){return{planSha256:hash('fake')}}},{query(){}}),/EXISTING_PROGRAM_AND_WORK_HOST_PORT_REQUIRED/);
});
test('verified program identity can be checked by the integrating source host',async()=>{
  const program=await load();assert.equal(isVerifiedProgram(program),true);
  assert.equal(isVerifiedProgram({...program}),false);assert.equal(isVerifiedProgram(null),false);
});
test('existing host callback is queried each time, cannot authenticate or post',async()=>{
  const p=await load();let calls=0,allowed=true;
  const bridge=createExcellenceWorkBridge(p,{async query(args){calls++;assert.deepEqual(args,{roomId:'work-test',sourceSeqs:[8],purpose:'research'});return allowed?{status:'HOST_REPORTED_READ_RETURN_RECHECKED_SOURCE_ONLY',data:{sourceCount:1,references:[{roomId:'work-test',seq:8,sourceSHA256:hash('message')}]}}:{status:'HOLD'};}});
  const good=await bridge.inspect({taskId:'EX.W01.C01.P01',roomId:'work-test',seq:8});
  assert.equal(good.status,'HOST_CALLBACK_REPORTED_SOURCE_POINTER_NOT_ATTESTED');assert.equal(good.bodyReturned,false);assert.equal(good.hostAuthenticated,false);assert.equal(good.workPosted,false);
  allowed=false;assert.equal((await bridge.inspect({taskId:'EX.W01.C01.P01',roomId:'work-test',seq:8})).status,'HOLD');assert.equal(calls,2);
});
test('wrong source pointer and malformed hash cannot pass the bridge',async()=>{
  const p=await load();const bridge=createExcellenceWorkBridge(p,{async query(){return{status:'HOST_REPORTED_READ_RETURN_RECHECKED_SOURCE_ONLY',data:{sourceCount:1,references:[{roomId:'other-room',seq:8,sourceSHA256:[hash('message')]}]}};}});
  assert.equal((await bridge.inspect({taskId:'EX.W01.C01.P01',roomId:'work-test',seq:8})).status,'HOLD');
  assert.equal((await bridge.inspect({taskId:'EX.W01.C01.P01',roomId:'work-test',seq:8,mode:'PLAY'})).status,'HOLD');
});
