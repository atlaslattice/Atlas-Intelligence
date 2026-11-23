import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AtomicJournal} from '../src/journal.mjs';
import {createHash} from 'node:crypto';
const H='a'.repeat(64),E='b'.repeat(64),ID='token-001';
const make=()=>{const filepath=join(mkdtempSync(join(tmpdir(),'atlas-r14-')),'journal.json');return {filepath,j:new AtomicJournal(filepath)}};
const prep=(j,runId='run-001',logicalId=ID)=>j.prepareEffect({runId,inputDigest:H,logicalId,effectDigest:E});
const arbitrary=(j,runId='run-001',requestId='effect:'+ID,step='EXTERNAL_EFFECT_UNCERTAIN',detail={logicalId:ID,effectDigest:E,status:'NO_REMOTE_RETRY_WITHOUT_WITNESS'})=>j.record({runId,inputDigest:H,step,detail,requestId});
const hold=(fn,code)=>assert.throws(fn,e=>e?.code===code,code);

test('original R13 negative: public record must not preseed effect namespace',()=>{
 const {j}=make();hold(()=>arbitrary(j),'JOURNAL_EFFECT_NAMESPACE_RESERVED');
 assert.equal(j.list().length,0);assert.equal(prep(j).replayed,false);
});
test('effect namespace reserve is case-insensitive and step is private',()=>{
 const {j}=make();hold(()=>arbitrary(j,'run-001','EFFECT:token-001','ANY_STEP',{}),'JOURNAL_EFFECT_NAMESPACE_RESERVED');
 hold(()=>arbitrary(j,'run-001','public-001'),'JOURNAL_EFFECT_NAMESPACE_RESERVED');
 assert.deepEqual(j.list(),[]);
});
test('fresh prepareEffect has source-local origin marker and replays only same run',()=>{
 const {j}=make();assert.equal(prep(j).replayed,false);assert.equal(prep(j).replayed,true);
 const e=j.inspect('run-001').events[0];assert.equal(e.detail.localMethod,'PREPARE_EFFECT_V3');
 assert.equal(e.requestId,'effect:'+ID);assert.equal(e.step,'EXTERNAL_EFFECT_UNCERTAIN');
});
test('original R13 negative: same logical ID in second run must HOLD without write',()=>{
 const {j,filepath}=make();prep(j,'run-001');const before=readFileSync(filepath);
 hold(()=>prep(j,'run-002'),'EFFECT_ID_CROSS_RUN_HOLD');assert.deepEqual(readFileSync(filepath),before);
 assert.deepEqual(j.list(),['run-001']);
});
test('different logical ids in two runs remain distinct',()=>{
 const {j}=make();assert.equal(prep(j,'run-001','token-001').replayed,false);
 assert.equal(prep(j,'run-002','token-002').replayed,false);assert.equal(j.list().length,2);
});
test('historic ambiguous effect receipt cannot be silently promoted to replay',()=>{
 const {j,filepath}=make();const oldDetail={logicalId:ID,effectDigest:E,status:'NO_REMOTE_RETRY_WITHOUT_WITNESS'};
 // Create a historical v3-shaped event with the previous public entrypoint.
 // This fixture is constructed by a separate unpatched script if the new gate is active.
 const legacy=JSON.parse(readFileSync(filepath,'utf8'));assert.deepEqual(legacy.runs,{});
 const canonical=x=>JSON.stringify((function ordered(v){if(Array.isArray(v))return v.map(ordered);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordered(v[k])]));return v})(x));
 const digest=x=>createHash('sha256').update(Buffer.from(canonical(x),'utf8')).digest('hex');
 const ev={seq:1,step:'EXTERNAL_EFFECT_UNCERTAIN',detail:oldDetail,prev:'0'.repeat(64),requestId:'effect:'+ID};
 ev.hash=digest({runId:'run-001',inputDigest:H,...ev});
 legacy.runs['run-001']={inputDigest:H,head:ev.hash,events:[ev]};writeFileSync(filepath,canonical(legacy)+'\n');
 const recovered=new AtomicJournal(filepath);
 hold(()=>prep(recovered),'EFFECT_ORIGIN_UNVERIFIED');assert.equal(recovered.inspect('run-001').events.length,1);
});
test('same ID across a re-opened journal remains cross-run HOLD',()=>{
 const {j,filepath}=make();prep(j,'run-001');const reopened=new AtomicJournal(filepath);
 hold(()=>prep(reopened,'run-002'),'EFFECT_ID_CROSS_RUN_HOLD');
});
