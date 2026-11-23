/** Reproducible source-only 1100 executable node-route additions.
 * Usage: node examples/run-symbiosis-cascade.mjs input-parent-ledger.jsonl [output-dir]
 * Default generated directory is NEW; existing paths are never overwritten.
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {evolveCodeRoutes} from '../src/symbiosis-code-cascade.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const parentFile=process.argv[2];
if(!parentFile){console.error('Provide exact original Cascade R2 ledger.jsonl');process.exit(2);}
const outDir=process.argv[3]??resolve(here,'../generated');
let original;
try{
 const str=readFileSync(parentFile,'utf8');
 original=str.trimEnd().split('\n').map(line=>JSON.parse(line));
}catch(e){console.error('HOLD: parent source unreadable/invalid');process.exit(2);}
const res=evolveCodeRoutes({parentRecords:original,outDir});
console.log(JSON.stringify(res,null,2));
if(res.status!=='CODE_ROUTES_ADDED_AND_TESTED_LOCAL_ONLY')process.exitCode=1;
