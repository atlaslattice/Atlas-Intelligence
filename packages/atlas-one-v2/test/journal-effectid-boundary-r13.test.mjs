import test from 'node:test';
import assert from 'node:assert/strict';
import {AtomicJournal} from '../src/journal.mjs';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const make=()=>new AtomicJournal(join(mkdtempSync(join(tmpdir(),'atlas-r13-effect-')),'journal.json'));
const runId='effect-boundary';
const inputDigest='a'.repeat(64),effectDigest='b'.repeat(64);
const logicalId=n=>'x'.repeat(n);
const prepare=(j,n)=>j.prepareEffect({runId,inputDigest,logicalId:logicalId(n),effectDigest});
for(const n of [3,69,72,73])test(`R13 valid logicalId ${n} is journaled and replay-stable`,()=>{
 const j=make(),first=prepare(j,n);assert.equal(first.replayed,false);assert.equal(first.seq,1);
 const again=prepare(j,n);assert.equal(again.replayed,true);assert.equal(again.seq,1);
 const event=j.inspect(runId).events[0];assert.equal(event.requestId,'effect:'+logicalId(n));
 assert.equal(event.requestId.length,n+7);assert.equal(event.detail.logicalId.length,n);
 assert.equal(j.list().length,1);
});
for(const n of [74,75,80,81])test(`R13 overlength logicalId ${n} fails at effect boundary before record`,()=>{
 const j=make();assert.throws(()=>prepare(j,n),e=>e?.code==='EFFECT_ID_INVALID');
 assert.deepEqual(j.list(),[]);
});
test('R13 invalid effect digest fails with uniform effect ID code and no events',()=>{
 const j=make();assert.throws(()=>j.prepareEffect({runId,inputDigest,logicalId:logicalId(73),effectDigest:'bad'}),e=>e?.code==='EFFECT_ID_INVALID');
 assert.deepEqual(j.list(),[]);
});
test('R13 separate logical IDs do not collide after prefixing',()=>{
 const j=make();const a=prepare(j,72),b=prepare(j,73);
 assert.equal(a.seq,1);assert.equal(b.seq,2);assert.equal(j.inspect(runId).events.length,2);
});
