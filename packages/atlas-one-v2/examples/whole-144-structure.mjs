/** Standalone local catalogue/coordinate audit; DOES NOT execute 144 features. */
import {buildWhole144Program,locallyCheckWhole144,prepareWhole144WorkBursts,checkWhole144BurstItem} from '../src/whole-144.mjs';
const plan=buildWhole144Program();
const receipt=locallyCheckWhole144(plan);
const batches=prepareWhole144WorkBursts(plan);
const results=batches.batches.flatMap(b=>b.map(t=>checkWhole144BurstItem(plan,t.input)));
if(receipt.status!=='LOCAL_STRUCTURE_PASS'||results.some(r=>r.status!=='PASS_LOCAL'))throw new Error('STRUCTURAL_CHECK_FAILED');
console.log(JSON.stringify({
  schema:'atlas.one.whole-144-standalone-receipt/v1',
  status:'LOCAL_STRUCTURAL_TEST_ONLY',candidateProjects:plan.candidateCount,
  enumeratedHSNAddresses:receipt.nodeAddressChecks,boundedWorkBatches:batches.batches.length,
  localCheckPasses:results.length,verifiedFeatures:0,verifiedGains:0,
  sourceOriginalBytesVerified:false,hostRightsVerified:false,
  noPrivateModeDataImported:true,noExternalEffects:true,
  planDigest:plan.programDigest,receiptDigest:receipt.receiptDigest
},null,2));
