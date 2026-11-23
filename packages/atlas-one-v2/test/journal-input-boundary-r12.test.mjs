import test from 'node:test';
import assert from 'node:assert/strict';
import {AtomicJournal} from '../src/journal.mjs';
import {readFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const path=()=>join(mkdtempSync(join(tmpdir(),'atlas-r12-')),'journal.json');
const p=(runId,detail)=>({runId,inputDigest:'a'.repeat(64),step:'PREPARED',detail,requestId:'req-001'});
test('R12 baseline negative: valid constructor runId must not collide with Object prototype',()=>{
  const j=new AtomicJournal(path());
  const x=j.record(p('constructor',{value:1}));
  assert.equal(x.replayed,false);
  assert.equal(j.inspect('constructor').events[0].detail.value,1);
});
test('R12 baseline negative: nonexistent inherited keys must inspect as null',()=>{
  const j=new AtomicJournal(path());
  assert.equal(j.inspect('toString'),null);
  assert.equal(j.inspect('constructor'),null);
});
test('R12 baseline negative: dynamic accessor must not corrupt persisted hash',()=>{
  const filepath=path(),j=new AtomicJournal(filepath);let n=0;
  const detail={get value(){n++;return n===1?'first':'second';}};
  j.record(p('normal-run',detail));
  const db=JSON.parse(readFileSync(filepath,'utf8'));
  assert.equal(db.runs['normal-run'].events[0].detail.value,'first');
  assert.equal(j.inspect('normal-run').events[0].detail.value,'first');
  assert.equal(n,1);
});
test('R12 control: normal records still replay without append',()=>{
  const j=new AtomicJournal(path());const x=p('normal-run',{value:'stable'});
  assert.equal(j.record(x).replayed,false);assert.equal(j.record(x).replayed,true);assert.equal(j.inspect('normal-run').events.length,1);
});
for(const id of ['toString','valueOf','hasOwnProperty'])test('R12 inherited function name accepted as valid own run '+id,()=>{
 const j=new AtomicJournal(path());assert.equal(j.record(p(id,{ok:true})).seq,1);
 assert.equal(j.inspect(id).events.length,1);
});
test('R12 frozen journal ignores subsequent mutation of caller detail',()=>{
 const j=new AtomicJournal(path());const detail={nested:{v:1}};
 j.record(p('normal-run',detail));detail.nested.v=42;
 assert.equal(j.inspect('normal-run').events[0].detail.nested.v,1);
});
test('R12 rejects noncanonical detail before creating an event',()=>{
 const j=new AtomicJournal(path());
 assert.throws(()=>j.record(p('normal-run',{v:undefined})),e=>e?.code==='NONCANONICAL_VALUE');
 assert.deepEqual(j.list(),[]);
});
