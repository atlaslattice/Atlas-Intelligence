/** Explicit owner-local R07 preview; no network, model calls, or host writes.
 * Usage: node examples/r07-workburst-preview.mjs /private/node_build_plan_1728.json <sha256>
 */
import {readFileSync} from 'node:fs';
import {previewEntireR07} from '../src/r07-workburst-bridge.mjs';
const [path,expectedDigest]=process.argv.slice(2);
if(!path||!expectedDigest){
 console.error('Usage: node examples/r07-workburst-preview.mjs /private/node_build_plan_1728.json <sha256>');
 process.exitCode=2;
}else{
 let result;
 try{const input=readFileSync(path);result=await previewEntireR07(input,expectedDigest);}
 catch{result={status:'HOLD_SOURCE_INPUT',authorityEffect:'NONE',hostVerified:false};}
 console.log(JSON.stringify(result,null,2));
 if(result.status!=='LOCAL_R07_SOURCE_PREFLIGHT_ONLY')process.exitCode=1;
}
