/** Demonstration only: no network calls, no SwarmChat posts, no resident actions. */
import {buildWhole144Program,locallyCheckWhole144,prepareWhole144WorkBursts,checkWhole144BurstItem} from '../src/whole-144.mjs';
import {executeLocalWorkBurst} from '../src/work-burst.mjs';
const program=buildWhole144Program();
if(program.status!=='STRUCTURAL_CANDIDATE_ONLY')throw new Error('catalogue/source HOLD');
const structural=locallyCheckWhole144(program);
if(structural.status!=='LOCAL_STRUCTURE_PASS')throw new Error('structural HOLD');
const batches=prepareWhole144WorkBursts(program);
const receipts=[];
for(const tasks of batches.batches){
  const r=await executeLocalWorkBurst({tasks,maxParallel:4,operators:{
    LOCAL_VERIFY_HSN_CANDIDATE:async input=>checkWhole144BurstItem(program,input)
  }});
  if(r.status!=='LOCAL_COMPLETE'||r.counts.passed!==12)throw new Error('burst HOLD');
  receipts.push({counts:r.counts,digest:r.receiptDigest,waves:r.waves.length});
}
const output={status:'SYNTHETIC_STRUCTURE_ONLY',programme:'Atlas Whole 144',
  candidateProposals:program.candidateCount,reviewSlots:program.nodeReviewSlotCount,
  actualImprovementsImplemented:0,verifiedNodeGains:0,localOperatorChecks:144,
  localNodeAddressChecks:structural.nodeAddressChecks,perHouseReceipts:receipts,
  runDigest:structural.receiptDigest,hostRightsVerified:false,actualPeerMessagesPosted:0,
  realModelWakeups:0,privateModesAccessed:false,canonChanged:false};
process.stdout.write(JSON.stringify(output,null,2)+'\n');
