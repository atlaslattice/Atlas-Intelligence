/** Local owner-source run; does not call models or a hosted SwarmChat broker. */
import {readFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AriadneRegistry} from '../src/index.mjs';
import {AtomicJournal} from '../src/journal.mjs';
import {AtlasOneEngine} from '../src/engine.mjs';
const path=process.env.ATLAS_ARIADNE_ORIGINAL_FILE;
if(!path){console.error('Set ATLAS_ARIADNE_ORIGINAL_FILE to your authorized original atlas.json');process.exitCode=2;}
else{
  const registry=new AriadneRegistry(readFileSync(path));
  const dir=mkdtempSync(join(tmpdir(),'atlas-v2-'));
  const engine=new AtlasOneEngine({registry,journal:new AtomicJournal(join(dir,'runs.json'))});
  const cases=JSON.parse(readFileSync(new URL('./four-source-candidates.json',import.meta.url),'utf8'));
  const results=cases.map(c=>engine.run(c));
  console.log(JSON.stringify({schema:'atlas.one.local-demo/v2',registryNodes:registry.size,caseCount:results.length,
    statuses:results.map(r=>r.status),modelCalls:0,hostWrites:0,canonEffect:'NONE',journal:dir},null,2));
}
