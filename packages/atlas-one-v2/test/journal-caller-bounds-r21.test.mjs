/** R21 caller-graph admission regression. Pure local AtomicJournal, NOT hosted. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AtomicJournal} from '../src/journal.mjs';
const fresh=()=>join(mkdtempSync(join(tmpdir(),'atlas-r21-')),'journal.json');
const entry=(detail, requestId='request-r21')=>({runId:'run-r21',inputDigest:'a'.repeat(64),step:'PREPARED',requestId,detail});
function refusedWithoutMutation(name,makeDetail,code){
  test(name,()=>{
    const f=fresh(),j=new AtomicJournal(f),before=readFileSync(f);
    assert.throws(()=>j.record(entry(makeDetail())),e=>e?.name==='AtlasHold'&&e?.code===code);
    assert.deepEqual(readFileSync(f),before);
    assert.equal(existsSync(f+'.lock'),false);
    assert.deepEqual(j.list(),[]);
    assert.equal(j.record(entry({after:'safe'},'request-safe')).replayed,false);
    assert.equal(new AtomicJournal(f,{readOnly:true}).inspect('run-r21').events.length,1);
  });
}
const nested=depth=>{let x=0;for(let i=0;i<depth;i++)x=[x];return {value:x};};
refusedWithoutMutation('R21 deep caller array 12000 does not cause recursive RangeError',()=>nested(12000),'JOURNAL_WRITE_LIMIT');
refusedWithoutMutation('R21 caller object ancestor cycle is a controlled HOLD',()=>{const x={};x.self=x;return x;},'JOURNAL_CALLER_DETAIL_INVALID');
refusedWithoutMutation('R21 caller array ancestor cycle is a controlled HOLD',()=>{const a=[];a.push(a);return {a};},'JOURNAL_CALLER_DETAIL_INVALID');
refusedWithoutMutation('R21 throwing own enumerable getter is a controlled HOLD',()=>Object.defineProperty({},'value',{enumerable:true,get(){throw new Error('private getter string')}}),'JOURNAL_CALLER_DETAIL_INVALID');
refusedWithoutMutation('R21 hostile ownKeys Proxy is a controlled HOLD',()=>new Proxy({}, {ownKeys(){throw new Error('private trap')}}),'JOURNAL_CALLER_DETAIL_INVALID');
refusedWithoutMutation('R21 2MB+ caller string refuses before persistence',()=>({bytes:'A'.repeat(2_000_000)}),'JOURNAL_WRITE_LIMIT');
refusedWithoutMutation('R21 array hole too large refuses before materializing',()=>({value:new Array(100_001)}),'JOURNAL_WRITE_LIMIT');
refusedWithoutMutation('R21 invalid primitive retains original NONCANONICAL_VALUE',()=>({value:undefined}),'NONCANONICAL_VALUE');
test('R21 supported own getter reads only once and immutable persisted snapshot',()=>{
  const f=fresh(),j=new AtomicJournal(f);let calls=0;
  const detail={get value(){calls++;return calls===1?'first':'second'}};
  j.record(entry(detail));assert.equal(calls,1);
  assert.equal(j.inspect('run-r21').events[0].detail.value,'first');
});
test('R21 noncyclic alias DAG remains admissible',()=>{
  const f=fresh(),j=new AtomicJournal(f),shared={v:7};
  j.record(entry({a:shared,b:shared}));
  const d=j.inspect('run-r21').events[0].detail;
  assert.deepEqual(d,{a:{v:7},b:{v:7}});
});
test('R21 bounded depth canonical caller still works',()=>{
  const f=fresh(),j=new AtomicJournal(f);
  j.record(entry(nested(20)));
  assert.equal(new AtomicJournal(f,{readOnly:true}).inspect('run-r21').events.length,1);
});
