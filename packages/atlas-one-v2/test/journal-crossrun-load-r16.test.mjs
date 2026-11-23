/** Source-level regression: valid old v3 effect history must not be silently
 * treated as unambiguous after a later cross-run write gate is introduced.
 * This test uses the disclosed local index helper (not real host IAM).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AtomicJournal} from '../src/journal.mjs';
import {canonical,digest} from '../src/index.mjs';
const ZERO='0'.repeat(64);
const path=()=>join(mkdtempSync(join(tmpdir(),'atlas-r16-crossrun-')),'journal.json');
function formerV3Snapshot({sameEffect=true,ordinary=false}={}){
 const runs={};
 for(const [i,runId] of ['run-one','run-two'].entries()){
   const inputDigest='a'.repeat(64), seq=1, prev=ZERO;
   const logicalId=sameEffect?'duplicate-effect-123':'independent-effect-'+i;
   const requestId=ordinary?'req-'+i:'effect:'+logicalId;
   const step=ordinary?'PREPARED':'EXTERNAL_EFFECT_UNCERTAIN';
   const detail=ordinary?{purpose:'review'}:{logicalId,effectDigest:'b'.repeat(64),status:'NO_REMOTE_RETRY_WITHOUT_WITNESS',localMethod:'PREPARE_EFFECT_V3'};
   const hash=digest({runId,inputDigest,seq,step,detail,requestId,prev});
   runs[runId]={inputDigest,head:hash,events:[{seq,step,detail,prev,requestId,hash}]};
 }
 return {version:3,runs};
}
function persist(source){const f=path();writeFileSync(f,canonical(source)+'\n');return f;}
test('R16 source negative: cross-run duplicate old-v3 effect journal must HOLD on readOnly open',()=>{
 const f=persist(formerV3Snapshot()),before=readFileSync(f);
 assert.throws(()=>new AtomicJournal(f,{readOnly:true}),e=>e?.code==='JOURNAL_EFFECT_CROSS_RUN_CONFLICT');
 assert.deepEqual(readFileSync(f),before,'failed read must never rewrite archived bytes');
});
test('R16 source negative: cross-run duplicate old-v3 effect journal must HOLD on writable open',()=>{
 const f=persist(formerV3Snapshot()),before=readFileSync(f);
 assert.throws(()=>new AtomicJournal(f),e=>e?.code==='JOURNAL_EFFECT_CROSS_RUN_CONFLICT');
 assert.deepEqual(readFileSync(f),before);
});
test('R16 control: distinct effect IDs across runs remain readable',()=>{
 const f=persist(formerV3Snapshot({sameEffect:false}));const j=new AtomicJournal(f,{readOnly:true});
 assert.deepEqual(j.list(),['run-one','run-two']);
 assert.notEqual(j.inspect('run-one').events[0].requestId,j.inspect('run-two').events[0].requestId);
});
test('R16 control: duplicate ordinary non-effect request IDs can exist in separate runs',()=>{
 const x=formerV3Snapshot({ordinary:true});x.runs['run-two'].events[0].requestId='req-0';
 const {seq,step,detail,requestId,prev}=x.runs['run-two'].events[0];
 const hash=digest({runId:'run-two',inputDigest:'a'.repeat(64),seq,step,detail,requestId,prev});
 x.runs['run-two'].events[0].hash=hash;x.runs['run-two'].head=hash;
 const j=new AtomicJournal(persist(x),{readOnly:true});assert.equal(j.list().length,2);
});
test('R16 control: per-event integrity still rejects corruption',()=>{
 const x=formerV3Snapshot();x.runs['run-two'].events[0].hash='0'.repeat(64);
 assert.throws(()=>new AtomicJournal(persist(x),{readOnly:true}),e=>e?.code==='JOURNAL_HASH_CORRUPT');
});
test('R16 control: intact first-party preparation still replays within a run',()=>{
 const f=path(),j=new AtomicJournal(f),p={runId:'run-one',inputDigest:'a'.repeat(64),logicalId:'operation-abc',effectDigest:'b'.repeat(64)};
 assert.equal(j.prepareEffect(p).replayed,false);assert.equal(j.prepareEffect(p).replayed,true);
 assert.equal(new AtomicJournal(f,{readOnly:true}).list().length,1);
});
