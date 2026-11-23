/** Offline CLI: 100 sequential distinct local cases, then 1000 inherited cases.
 * Output is synthetic source/test evidence only, NEVER AI turns or a host release.
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {evolve,STAGE1,STAGE2,verifyLedger} from '../src/cascade-evolution.mjs';
const output=resolve(process.argv[2]??'out/cascade-1100');
const hundred=await evolve({steps:STAGE1});
if(hundred.status!=='TESTED_LOCAL_SYNTHETIC_ONLY'||hundred.totalLocalSteps!==STAGE1)
  throw Error('STAGE_100_NOT_VERIFIED');
const thousand=await evolve({previous:hundred.ledger,steps:STAGE2});
if(thousand.status!=='TESTED_LOCAL_SYNTHETIC_ONLY'||thousand.totalLocalSteps!==STAGE1+STAGE2
  ||thousand.ledger[100].previousHead!==hundred.head||verifyLedger(thousand.ledger).ok!==true)
  throw Error('STAGE_1000_NOT_VERIFIED');
const ledger=thousand.ledger.map(x=>JSON.stringify(x)).join('\n')+'\n';
const ledgerSha256=createHash('sha256').update(ledger).digest('hex');
const receipt={schema:'atlas.one.cascade-execution-receipt/v1',
 scope:'LOCAL_SYNTHETIC_ONLY',sourceFoundation:'atlaslattice/Atlas-Intelligence#19',
 sourceFoundationGitHead:'892a38733344627e98d43f438e943ec9feedd5c7',
 originalWorkBurstBlob:'1978170e0f62f24d7afcab4a64d843236c2e46a7',
 originalWorkBurstTestsBlob:'42a393c28ebbe0bf3b4c2aefabe1d63b6a676a32',
 stage100:{count:100,head:hundred.head,accumulatedControls:hundred.cumulativeControlExecutions},
 stage1000:{count:1000,firstNewParent:thousand.ledger[100].previousHead,finalHead:thousand.head},
 total:thousand.totalLocalSteps,cumulativeControlExecutions:thousand.cumulativeControlExecutions,
 guardFamilies:thousand.mutationCoverage.total,guardMutantsKilled:thousand.mutationCoverage.killed,
 houseCoverage:thousand.houseCoverage,ledgerSha256,
 githubCommitted:false,gitHubCI:'NOT_EXECUTED',hostVerified:false,canPublish:false,
 actualAIMacroTurns:0,peerPosts:0,voluntaryPrivateSlotsPerformed:0,
 authorityEffect:'NONE',disclosure:'100+1000 distinct synthetic local cases; not independent model iterations'};
mkdirSync(output,{recursive:true});
writeFileSync(resolve(output,'cascade-ledger.jsonl'),ledger);
writeFileSync(resolve(output,'cascade-summary.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({result:'PASS_LOCAL',stage100:receipt.stage100,stage1000:receipt.stage1000,
 total:receipt.total,checks:receipt.cumulativeControlExecutions,mutants:receipt.guardMutantsKilled,
 head:receipt.stage1000.finalHead,sha256:receipt.ledgerSha256,
 hostedVerified:false,actualAIMacroTurns:0,peerPosts:0},null,2));
