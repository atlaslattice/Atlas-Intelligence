/** Source-only crash/recycled-PID test, no remote delivery or host authorization. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {AtomicJournal} from '../src/journal.mjs';
import {mkdtempSync,writeFileSync,readFileSync,readdirSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,basename} from 'node:path';
const H='a'.repeat(64), E='b'.repeat(64);
const create=()=>{
  const dir=mkdtempSync(join(tmpdir(),'atlas-r15-'));
  const file=join(dir,'journal.json');return {dir,file};
};
const record=(j,id)=>j.record({runId:'run-001',inputDigest:H,step:'REVIEW_STAGE',detail:{version:1},requestId:id});
const oldTemp=file=>file+'.tmp.'+process.pid;

test('old PID temp after interrupted write no longer bricks future record',()=>{
  const {file}=create();const j=new AtomicJournal(file);
  writeFileSync(oldTemp(file),'DO_NOT_DELETE_OR_IMPORT');
  assert.equal(record(j,'req-001').replayed,false);
  assert.equal(j.inspect('run-001').events.length,1);
  assert.equal(readFileSync(oldTemp(file),'utf8'),'DO_NOT_DELETE_OR_IMPORT');
});
test('new initialization survives orphaned PID temp and does not import it',()=>{
  const {file}=create();
  writeFileSync(oldTemp(file),'UNTRUSTED_ORPHAN_BYTES');
  const j=new AtomicJournal(file);
  assert.deepEqual(j.list(),[]);
  assert.equal(JSON.parse(readFileSync(file,'utf8')).version,3);
  assert.equal(readFileSync(oldTemp(file),'utf8'),'UNTRUSTED_ORPHAN_BYTES');
});
test('every successful write leaves no newly named temp files',()=>{
  const {file,dir}=create();const j=new AtomicJournal(file);
  record(j,'req-001');record(j,'req-002');
  assert.deepEqual(readdirSync(dir).filter(x=>x.startsWith('journal.json.tmp.')),[]);
  assert.equal(j.inspect('run-001').events.length,2);
});
test('journal retains exact idempotent replay after orphan recovery',()=>{
  const {file}=create();const j=new AtomicJournal(file);
  writeFileSync(oldTemp(file),'STALE');
  assert.equal(record(j,'req-001').replayed,false);
  assert.equal(record(j,'req-001').replayed,true);
  const later=new AtomicJournal(file);
  assert.equal(later.inspect('run-001').events.length,1);
});
test('existing writer lock continues to fail closed while orphan temp exists',()=>{
  const {file}=create();const j=new AtomicJournal(file);
  writeFileSync(oldTemp(file),'STALE');writeFileSync(file+'.lock','IN_PROGRESS');
  assert.throws(()=>record(j,'req-001'),e=>e?.code==='JOURNAL_BUSY_OR_STALE_LOCK');
  assert.deepEqual(j.list(),[]);
  assert.equal(readFileSync(file+'.lock','utf8'),'IN_PROGRESS');
});
test('lost ACK policy stays explicitly uncertain after recovered local write',()=>{
  const {file}=create();const j=new AtomicJournal(file);
  writeFileSync(oldTemp(file),'STALE');
  const r=j.prepareEffect({runId:'run-001',inputDigest:H,logicalId:'effect-unique-001',effectDigest:E});
  assert.equal(r.replayed,false);
  const d=j.inspect('run-001').events[0].detail;
  assert.equal(d.status,'NO_REMOTE_RETRY_WITHOUT_WITNESS');
  assert.equal(j.prepareEffect({runId:'run-001',inputDigest:H,logicalId:'effect-unique-001',effectDigest:E}).replayed,true);
});
