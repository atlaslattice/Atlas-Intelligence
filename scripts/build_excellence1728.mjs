#!/usr/bin/env node
/** Reproduce the pinned program from authored source catalogs. No task is run. */
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {excellencePublishedReference} from '../programs/excellence1728/integrations/excellence-host.mjs';

const root = fileURLToPath(new URL('../programs/excellence1728/',import.meta.url));
const output = join(root,'outputs','ATLAS_EXCELLENCE_1728_PLAN.json');
try {
  const result = execFileSync('python3', ['-m','excellence1728','compile',
    '--catalog','catalog/capabilities.json','--phases','catalog/phases.json',
    '--sources','catalog/source_inventory.json','--coverage','catalog/coverage.json',
    '--canon','catalog/canon_reference.json','--output',output],
    {cwd:root,env:{...process.env,PYTHONPATH:join(root,'runtime')},encoding:'utf8',timeout:60000,maxBuffer:1024*1024});
  const sha256 = createHash('sha256').update(readFileSync(output)).digest('hex');
  if (sha256 !== excellencePublishedReference().planSha256) throw new Error('Rebuilt plan does not match the bundled source program');
  process.stdout.write(result);
} catch (error) {
  process.stderr.write(JSON.stringify({error:error.name,message:error.message})+'\n');
  process.exitCode = 2;
}
