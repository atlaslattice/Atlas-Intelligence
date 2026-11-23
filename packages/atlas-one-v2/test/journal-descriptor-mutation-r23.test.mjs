/** R23 source-level regression: mutable later descriptors under DFS getter visitation.
 * TESTED_LOCAL with disclosed index stub, not hosted or end-to-end CI.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AtomicJournal} from '../src/journal.mjs';
import {canonical} from '../src/index.mjs';
const makeFile=()=>join(mkdtempSync(join(tmpdir(),'atlas-r23-')),'journal.json');
function compareHistorical(factory){
  const expected=JSON.parse(canonical(factory()));
  const j=new AtomicJournal(makeFile());
  j.record({runId:'r23-run',inputDigest:'d'.repeat(64),step:'PREPARED',requestId:'descriptor-mutation',detail:factory()});
  const actual=j.inspect('r23-run').events[0].detail;
  assert.deepEqual(actual,expected);
  return {actual};
}
test('R23 nested getter replacing later own data descriptor matches historical canonical',()=>{
  compareHistorical(()=>{const obj={a:{get x(){Object.defineProperty(obj,'b',{value:'AFTER_A',configurable:true,enumerable:true});return 'x';}},b:'BEFORE_A'};return obj;});
});
test('R23 nested getter replacing later own getter matches historical canonical',()=>{
  compareHistorical(()=>{const obj={a:{get x(){Object.defineProperty(obj,'b',{get(){return 'NEW';},configurable:true,enumerable:true});return 'x';}},get b(){return 'OLD';}};return obj;});
});
test('R23 earlier array child changes later index matches historical canonical',()=>{
  compareHistorical(()=>{const a=[{get x(){a[1]='UPDATED';return true;}},'OLD'];return {a};});
});
test('R23 nested getter adds post-enumeration key, does not retroactively include',()=>{
  compareHistorical(()=>{const obj={a:{get x(){obj.c='LATE';return 'x';}},b:'PRESENT'};return obj;});
});
test('R23 erased later object key is controlled hold, no persistence',()=>{
  const factory=()=>{const obj={a:{get x(){delete obj.b;return 'x';}},b:'PRESENT'};return obj;};
  assert.throws(()=>canonical(factory()),e=>e.code==='NONCANONICAL_VALUE');
  const j=new AtomicJournal(makeFile());
  assert.throws(()=>j.record({runId:'r23-run',inputDigest:'d'.repeat(64),step:'PREPARED',requestId:'erased-key',detail:factory()}),e=>e.code==='NONCANONICAL_VALUE');
  assert.deepEqual(j.list(),[]);
});
