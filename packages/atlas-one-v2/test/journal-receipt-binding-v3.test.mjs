import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AtomicJournal} from '../src/journal.mjs';
import {digest} from '../src/index.mjs';
const newJournal=()=>{const dir=mkdtempSync(join(tmpdir(),'atlas-v3-'));const path=join(dir,'journal.json');return {path,j:new AtomicJournal(path)}};
const p={runId:'example-run',inputDigest:'a'.repeat(64),step:'PREPARED',detail:{payload:'example'},requestId:'req-001'};
const throws=(fn,code)=>assert.throws(fn,e=>e?.code===code);
const edit=(path,modify)=>{const x=JSON.parse(readFileSync(path,'utf8'));modify(x);writeFileSync(path,JSON.stringify(x));};
test('fresh v3 binds all idempotency inputs to hash',()=>{
 const {j,path}=newJournal(),a=j.record(p);assert.equal(a.seq,1);const db=JSON.parse(readFileSync(path));assert.equal(db.version,3);
 assert.equal(db.runs[p.runId].events[0].hash,digest({runId:p.runId,inputDigest:p.inputDigest,seq:1,step:p.step,detail:p.detail,requestId:p.requestId,prev:'0'.repeat(64)}));
 assert.equal(j.record(p).replayed,true);assert.equal(j.inspect(p.runId).events.length,1);
});
for(const [name,mutate] of [
 ['request ID',x=>{x.events[0].requestId='req-002'}],
 ['input digest',x=>{x.inputDigest='b'.repeat(64)}],
 ['detail',x=>{x.events[0].detail.payload='other'}],
 ['step',x=>{x.events[0].step='REVIEW_REQUIRED'}],
 ['previous chain link',x=>{x.events[0].prev='b'.repeat(64)}]
])test('v3 detects tampered '+name,()=>{
 const {j,path}=newJournal();j.record(p);edit(path,db=>mutate(db.runs[p.runId]));throws(()=>j.inspect(p.runId),name==='previous chain link'?'JOURNAL_SEQUENCE_INVALID':'JOURNAL_HASH_CORRUPT');
});
test('v3 detects duplicate request IDs even after correctly recomputed chain',()=>{
 const {j,path}=newJournal();j.record(p);j.record({...p,step:'REVIEW_REQUIRED',requestId:'req-002'});
 edit(path,db=>{const run=db.runs[p.runId],e=run.events[1];e.requestId='req-001';e.hash=digest({runId:p.runId,inputDigest:run.inputDigest,seq:2,step:e.step,detail:e.detail,requestId:e.requestId,prev:e.prev});run.head=e.hash});
 throws(()=>j.list(),'JOURNAL_DUPLICATE_REQUEST_ID');
});
test('v3 changed digest same request ID holds',()=>{
 const {j}=newJournal();j.record(p);throws(()=>j.record({...p,detail:{payload:'other'}}),'REQUEST_IDEMPOTENCY_CONFLICT');
});
test('v3 changed input same run holds',()=>{
 const {j}=newJournal();j.record(p);throws(()=>j.record({...p,inputDigest:'b'.repeat(64),requestId:'req-003'}),'RUN_IDEMPOTENCY_CONFLICT');
});
test('legacy v2 requires explicit read-only opt-in and gets warning',()=>{
 const path=join(mkdtempSync(join(tmpdir(),'atlas-v2-')),'journal.json'),runId=p.runId;
 const e={seq:1,step:p.step,detail:p.detail,prev:'0'.repeat(64),requestId:p.requestId};
 e.hash=digest({runId,seq:1,step:p.step,detail:p.detail,prev:e.prev});
 writeFileSync(path,JSON.stringify({version:2,runs:{[runId]:{inputDigest:p.inputDigest,head:e.hash,events:[e]}}}));
 throws(()=>new AtomicJournal(path),'LEGACY_JOURNAL_HASH_UNBOUND');
 throws(()=>new AtomicJournal(path,{readOnly:true}),'LEGACY_JOURNAL_HASH_UNBOUND');
 throws(()=>new AtomicJournal(path,{legacyRead:true}),'LEGACY_JOURNAL_READ_ONLY_REQUIRED');
 const j=new AtomicJournal(path,{readOnly:true,legacyRead:true});
 assert.equal(j.inspect(runId).integrity,'UNATTESTED_LEGACY_REQUEST_BINDING');
 throws(()=>j.record(p),'READ_ONLY_JOURNAL');
});
test('legacy changed request ID is untrusted even if v2 hash still passes',()=>{
 const path=join(mkdtempSync(join(tmpdir(),'atlas-v2-')),'journal.json'),e={seq:1,step:p.step,detail:p.detail,prev:'0'.repeat(64),requestId:'req-999'};
 e.hash=digest({runId:p.runId,seq:1,step:p.step,detail:p.detail,prev:e.prev});
 writeFileSync(path,JSON.stringify({version:2,runs:{[p.runId]:{inputDigest:p.inputDigest,head:e.hash,events:[e]}}}));
 const j=new AtomicJournal(path,{readOnly:true,legacyRead:true});
 assert.equal(j.inspect(p.runId).integrity,'UNATTESTED_LEGACY_REQUEST_BINDING');
});
test('new journal readOnly accepted, never permits mutation',()=>{
 const {path}=newJournal(),j=new AtomicJournal(path,{readOnly:true});assert.deepEqual(j.list(),[]);
 throws(()=>j.record(p),'READ_ONLY_JOURNAL');assert.equal(existsSync(path),true);
});
test('old event shape missing requestId fails even in explicit legacy view',()=>{
 const path=join(mkdtempSync(join(tmpdir(),'atlas-v2-')),'journal.json');
 const e={seq:1,step:p.step,detail:p.detail,prev:'0'.repeat(64)};e.hash=digest({runId:p.runId,seq:1,step:p.step,detail:p.detail,prev:e.prev});
 writeFileSync(path,JSON.stringify({version:2,runs:{[p.runId]:{inputDigest:p.inputDigest,head:e.hash,events:[e]}}}));
 throws(()=>new AtomicJournal(path,{readOnly:true,legacyRead:true}),'JOURNAL_SEQUENCE_INVALID');
});

test('unkeyed v3 hash is not a signed publisher attestation',()=>{
 const {j,path}=newJournal();j.record(p);
 edit(path,db=>{const run=db.runs[p.runId],e=run.events[0];e.requestId='req-forged';e.hash=digest({runId:p.runId,inputDigest:run.inputDigest,seq:e.seq,step:e.step,detail:e.detail,requestId:e.requestId,prev:e.prev});run.head=e.hash});
 assert.equal(j.inspect(p.runId).events[0].requestId,'req-forged'); // known limit; host trust root needed
});
