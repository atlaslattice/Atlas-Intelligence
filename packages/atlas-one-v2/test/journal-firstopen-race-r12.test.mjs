import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const helper=readFileSync(new URL('../src/index.mjs',import.meta.url),'utf8');
const patched=readFileSync(new URL('../src/journal.mjs',import.meta.url),'utf8');
const originalGuard="    if(!readOnly){mkdirSync(dirname(this.file),{recursive:true});if(!existsSync(this.file))this.#atomicWrite({version:3,runs:{}});}";
const fixedGuard="    if(!readOnly){mkdirSync(dirname(this.file),{recursive:true});\n      // Cold start shares the writer's exclusive lock. Recheck under lock:\n      // a competing constructor must never overwrite a newly committed run.\n      if(!existsSync(this.file))this.#guard(()=>{if(!existsSync(this.file))this.#atomicWrite({version:3,runs:{}});});}";
const blobSHA=s=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+Buffer.byteLength(s)+'\0'),Buffer.from(s)])).digest('hex');
const p=(runId='race-001')=>({runId,inputDigest:'a'.repeat(64),step:'PREPARED',detail:{signal:'A committed'},requestId:'req-001'});
async function interleave(source){
 const dir=mkdtempSync(join(tmpdir(),'atlas-firstopen-'));
 writeFileSync(join(dir,'index.mjs'),helper);
 writeFileSync(join(dir,'writer-journal.mjs'),patched);
 const writer="import {AtomicJournal} from './writer-journal.mjs';\n"
  +"const j=new AtomicJournal(process.argv[2]);j.record("+JSON.stringify(p())+");\n";
 writeFileSync(join(dir,'writer.mjs'),writer);
 const marker='if(!existsSync(this.file))';
 assert.ok([1,2].includes(source.split(marker).length-1)); // old 1, guarded 2
 const instrumented=source.replace(marker,'if(!raceExistsSync(this.file))');
 const hook="import {spawnSync} from 'node:child_process';\n"
  +"let injected=false;\n"
  +"function raceExistsSync(file){const present=existsSync(file);if(!present&&!injected){injected=true;const r=spawnSync(process.execPath,[new URL('./writer.mjs',import.meta.url).pathname,file],{encoding:'utf8'});if(r.status!==0)throw Error('injected writer failed: '+r.stderr);}return present;}\n";
 writeFileSync(join(dir,'journal-injected.mjs'),hook+instrumented);
 const {AtomicJournal:Reader}=await import(pathToFileURL(join(dir,'writer-journal.mjs')).href);
 const {AtomicJournal:Victim}=await import(pathToFileURL(join(dir,'journal-injected.mjs')).href);
 const file=join(dir,'state.json');new Victim(file);
 return new Reader(file,{readOnly:true}).inspect('race-001');
}
test('baseline R12: cold-start stale existence decision OVERWRITES committed run',async()=>{
 assert.equal(blobSHA(patched),'032ae64adba4fb0e75238849eb9d159551245af5');
 assert.equal(patched.split(fixedGuard).length-1,1);
 const original=patched.replace(fixedGuard,originalGuard);
 assert.equal(blobSHA(original),'9a6c728d77fbb1d3f6b79e1e0af84c0d59b58a6e');
 const result=await interleave(original);
 assert.equal(result,null,'old constructor overwrote a committed run');
});
test('patched R12: after peer #124 interleaving, committed receipt is preserved',async()=>{
 const result=await interleave(patched);
 assert.equal(result?.events[0]?.requestId,'req-001');
 assert.equal(result?.events.length,1);
});
