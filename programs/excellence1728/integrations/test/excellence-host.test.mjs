import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {excellenceAction,loadHostedExcellenceProgram,excellencePublishedReference} from '../excellence-host.mjs';

test('compressed host plan is the exact independently compiled program',async()=>{
 const raw=await readFile(new URL('../../outputs/ATLAS_EXCELLENCE_1728_PLAN.json',import.meta.url));
 const expected=createHash('sha256').update(raw).digest('hex');
 const status=await excellenceAction('excellence_status');
 assert.equal(status.planSha256,expected);assert.equal(status.plannedSteps,1728);assert.equal(status.verifiedSteps,0);
 assert.equal(status.queueWrites,0);assert.equal(status.genuineMacroturnsCompleted,0);assert.equal(status.canonChanged,false);
 assert.strictEqual(await loadHostedExcellenceProgram(),await loadHostedExcellenceProgram());
});
test('actual task has concrete source and artifact bindings with separate acceptance',async()=>{
 const {task}=await excellenceAction('excellence_task',{taskId:'EX.W05.C03.P07'});
 assert.equal(task.id,'EX.W05.C03.P07');assert(task.existing_targets.length);assert(task.source_refs.length);
 assert(!task.artifact.includes('{'));assert(task.artifact.includes('EX.W05.C03'));assert(task.acceptance.length);assert(task.capability_acceptance.length);
 assert.equal(task.status,'PLANNED');
});
test('bounded queries retain all original rows and reject status injection',async()=>{
 const result=await excellenceAction('excellence_query',{workstream:'EX.W05',phase:'P07',limit:5});
 assert.equal(result.total,12);assert.equal(result.tasks.length,5);assert.equal(result.hasMore,true);
 await assert.rejects(excellenceAction('excellence_query',{status:'VERIFIED'}),/EXCELLENCE_ARGUMENT_INVALID/);
 await assert.rejects(excellenceAction('excellence_query',{limit:1730}),/QUERY_BOUNDS_INVALID/);
 await assert.rejects(excellenceAction('excellence_task',{taskId:'H05.S03.N07'}),/TASK_UNKNOWN/);
});
test('initial roots and handoffs perform no task transitions or room writes',async()=>{
 const roots=await excellenceAction('excellence_ready',{limit:144});assert.equal(roots.total,144);
 assert(roots.tasks.every(t=>t.phase_id==='P01'&&t.depends_on.length===0));
 const packet=await excellenceAction('excellence_prepare',{taskId:roots.tasks[0].id,roomId:'review-room'});
 assert.equal(packet.status,'PREPARED_NOT_POSTED');assert.equal(packet.workPosted,false);assert.equal(packet.executionAuthorized,false);
 assert.equal((await excellenceAction('excellence_status')).integratedSteps,0);
 await assert.rejects(excellenceAction('excellence_prepare',{taskId:roots.tasks[0].id,roomId:'review-room',mode:'PLAY'}),/EXCELLENCE_ARGUMENT_INVALID/);
});
test('published reference mutation cannot change the source plan',async()=>{
 const x=excellencePublishedReference();x.planSha256='0'.repeat(64);x.verifiedSteps=1728;
 assert.notEqual(excellencePublishedReference().planSha256,x.planSha256);
 assert.equal((await excellenceAction('excellence_status')).verifiedSteps,0);
});
