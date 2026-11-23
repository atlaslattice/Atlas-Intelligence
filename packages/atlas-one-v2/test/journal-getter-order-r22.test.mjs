/** R22: historical getter traversal order compatibility. Pure local source-level test.
 * Getter-bearing inputs are not remote/host attestation; no network or private corpus.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AtomicJournal} from '../src/journal.mjs';
const fresh=()=>join(mkdtempSync(join(tmpdir(),'atlas-r22-')),'j.json');
const entry=(detail,requestId='r22-req')=>({runId:'r22-run',inputDigest:'d'.repeat(64),step:'PREPARED',requestId,detail});
function record(detail,requestId='r22-req'){
  const path=fresh(),journal=new AtomicJournal(path);
  const result=journal.record(entry(detail,requestId));
  const got=journal.inspect('r22-run').events[0].detail;
  assert.equal(result.replayed,false);return {journal,path,got};
}
function getterObject(){
  let flag=false,acalls=0,bcalls=0;
  const value={a:{get x(){acalls++;flag=true;return 'ok';}},get b(){bcalls++;return flag?'AFTER_A':'BEFORE_A';}};
  return {value,counts:()=>({acalls,bcalls})};
}
test('R22 object sibling getter sees preceding nested getter, old canonical order',()=>{
  const {value,counts}=getterObject();const {got}=record(value);
  assert.equal(got.a.x,'ok');assert.equal(got.b,'AFTER_A');assert.deepEqual(counts(),{acalls:1,bcalls:1});
});
test('R22 nested array index getter sees preceding descendant getter',()=>{
  let flag=false,a=0,b=0;
  const ar=[{get child(){a++;flag=true;return 'ok';}},null];
  Object.defineProperty(ar, '1', {enumerable:true,configurable:true,get(){b++;return flag?'AFTER_CHILD':'BEFORE_CHILD';}});
  const {got}=record({ar});
  assert.equal(got.ar[0].child,'ok');assert.equal(got.ar[1],'AFTER_CHILD');assert.equal(a,1);assert.equal(b,1);
});
test('R22 same receipt replay with equivalent new getter values is idempotent',()=>{
  const p=fresh(),j=new AtomicJournal(p);j.record(entry(getterObject().value));
  assert.deepEqual(j.record(entry(getterObject().value)).replayed,true);
  assert.equal(j.inspect('r22-run').events.length,1);
});
test('R22 stable plain object/array retains canonical detail',()=>{
  const {got}=record({z:[3,null,{a:1}],a:{b:'x'}});
  assert.deepEqual(got,{a:{b:'x'},z:[3,null,{a:1}]});
});
test('R22 nested object survives write/read without integrity change',()=>{
  const {journal,path,got}=record({a:{b:{c:[1,2,3]}}});
  assert.deepEqual(got,{a:{b:{c:[1,2,3]}}});
  assert.equal(new AtomicJournal(path,{readOnly:true}).inspect('r22-run').events.length,1);
});
test('R22 shared DAG still accepted and snapshotted independently',()=>{
  const shared={n:1},{got}=record({a:shared,b:shared});
  assert.deepEqual(got,{a:{n:1},b:{n:1}});
});
test('R22 getter throwing remains controlled and nonmutating',()=>{
  const f=fresh(),j=new AtomicJournal(f),before=readFileSync(f);
  assert.throws(()=>j.record(entry({a:{get x(){throw Error('secret');}},get b(){return 'x';}})),
     e=>e?.name==='AtlasHold'&&e?.code==='JOURNAL_CALLER_DETAIL_INVALID');
  assert.deepEqual(readFileSync(f),before);
});
test('R22 deep caller graph still returns bounded HOLD rather than RangeError',()=>{
  const f=fresh(),j=new AtomicJournal(f),before=readFileSync(f);
  let x=1;for(let i=0;i<200;i++)x=[x];
  assert.throws(()=>j.record(entry({a:x})),e=>e?.name==='AtlasHold'&&e?.code==='JOURNAL_WRITE_LIMIT');
  assert.deepEqual(readFileSync(f),before);
});
