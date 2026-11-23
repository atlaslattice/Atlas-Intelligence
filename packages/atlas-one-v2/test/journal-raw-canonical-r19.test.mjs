/**
 * R19 source-equivalent regression against exact PR #13 HEAD 281e662e
 * and original-v3 first-party writers R11, R12, R13 (provided pinned ZIPs).
 * Hosted, receiver and publisher rights are NOT tested.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AtomicJournal as Guarded} from '../src/journal.mjs';
import {canonical} from '../src/index.mjs';
const mk=()=>join(mkdtempSync(join(tmpdir(),'r19-raw-')),'journal.json');
const payload={runId:'run-alpha',inputDigest:'a'.repeat(64),step:'PREPARED',detail:{ok:true},requestId:'request-alpha'};
const originalFixture=()=>{const f=mk();const j=new Guarded(f);j.record(payload);return f;};
const expectedHold='JOURNAL_RAW_NONCANONICAL';
const mutation=(label, mutator, code=expectedHold)=>test(label,()=>{
  const f=originalFixture();const original=readFileSync(f);
  const changed=mutator(original.toString('utf8'),Buffer.from(original));
  writeFileSync(f,changed);const before=readFileSync(f);
  assert.throws(()=>new Guarded(f,{readOnly:true}),e=>e?.code===code,label+' readOnly');
  assert.throws(()=>new Guarded(f),e=>e?.code===code,label+' writable');
  assert.deepEqual(readFileSync(f),before,'no quarantine repair or write must occur');
});

/** R11/R12/R13 historical serializer compatibility was tested offline against pinned prior-source ZIPs; not imported into this repo test. */
test('R19 first-party current v3 writer retained with multiple events and replay',()=>{
 const f=originalFixture();const j=new Guarded(f);
 assert.equal(j.record({...payload,requestId:'request-beta'}).replayed,false);
 assert.equal(j.record(payload).replayed,true);
 const bytes=readFileSync(f);assert.deepEqual(bytes,Buffer.from(canonical(JSON.parse(bytes.toString()))+'\n'));
 assert.equal(new Guarded(f,{readOnly:true}).inspect('run-alpha').events.length,2);
});
mutation('duplicate version 2 preceding valid version 3', s=>s.replace('"version":3','"version":2,"version":3'));
mutation('escaped alias of top-level version key',s=>s.replace('"version":3','"ver\\u0073ion":2,"version":3'));
mutation('duplicate runs key preceding correct version',s=>s.replace('"runs":','"runs":{},"runs":'));
mutation('escaped alias of nested events key',s=>s.replace('"events":','"ev\\u0065nts":[],"events":'));
mutation('duplicate requestId event property with contradictory effect prefix',s=>s.replace('"requestId":"request-alpha"','"requestId":"effect:decoy","requestId":"request-alpha"'));
mutation('escaped duplicate requestId property',s=>s.replace('"requestId":"request-alpha"','"requ\\u0065stId":"effect:decoy","requestId":"request-alpha"'));
mutation('syntactically equivalent extra indentation',s=>'  '+s);
mutation('CRLF not emitted by current v3 writer',s=>s.replace(/\n$/,'\r\n'));
mutation('extra trailing newline',s=>s+'\n');
mutation('escaped run ID changes raw bytes but not parsed meaning',s=>s.replace('"run-alpha"','"run\\u002dalpha"'));
mutation('reordered noncanonical top-level keys',s=>s.replace('"runs":','"version":3,"runs":').replace(/,"version":3\n$/,'\n'));
mutation('fatal byte-level ambiguity even when UTF-8 decoder replaces it', (s,b)=>{
 const idx=b.indexOf(Buffer.from('request-alpha'));
 assert.ok(idx>=0);const x=Buffer.from(b);x[idx+2]=0xff;return x;
}, 'JOURNAL_RAW_NONCANONICAL');

test('v2 remains explicitly read-only legacy-gated (separate policy)',()=>{
 const f=mk();const raw='{"version":2, "runs":{}}\n';writeFileSync(f,raw);
 assert.deepEqual(new Guarded(f,{readOnly:true,legacyRead:true}).list(),[]);
 assert.throws(()=>new Guarded(f),e=>e?.code==='LEGACY_JOURNAL_HASH_UNBOUND');
 assert.deepEqual(readFileSync(f),Buffer.from(raw));
});
test('post-open raw tampering is rechecked before read and before write',()=>{
 const f=originalFixture(),j=new Guarded(f);
 const before=readFileSync(f).toString().replace('"runs":','"runs":{},"runs":');
 writeFileSync(f,before);assert.throws(()=>j.inspect('run-alpha'),e=>e?.code===expectedHold);
 assert.throws(()=>j.record({...payload,requestId:'request-beta'}),e=>e?.code===expectedHold);
 assert.equal(readFileSync(f,'utf8'),before);
});
