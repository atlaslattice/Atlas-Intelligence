/** Owner-run offline CLI for 12 full 1728x144x12 perspective cycles.
 * No network, no broker posts, no private content in published output.
 * Reuse prior finalHead for next explicitly invoked bounded sequence.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runTelescopeRounds} from '../src/telescope/core.mjs';
const [sourcePath,outputPath,previousHead]=process.argv.slice(2);
if(!sourcePath||!outputPath){console.error('Usage: node examples/run-telescope-12.mjs /private/r07-plan.json /private/telescope-receipt.json [prior-head]');process.exit(2);}
const bytes=readFileSync(sourcePath),digest=createHash('sha256').update(bytes).digest('hex');
const result=await runTelescopeRounds(bytes,digest,{rounds:12,fromHead:previousHead??null});
if(result.status!=='TWELVE_SOURCE_ONLY_ROUNDS_COMPLETE'){
 console.error(JSON.stringify({status:'HOLD_NO_OUTPUT',authorityEffect:'NONE'}));process.exit(1);
}
writeFileSync(outputPath,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,rounds:result.rounds,stageReceipts:result.stageReceiptCount,
 computations:result.perspectiveComputations,workPreflightChecks:result.actualSourcePinChecks,
 actualWorkTasks:0,finalHead:result.finalHead,hostVerified:false},null,2));
