import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fusedTensorSelect} from '../../src/fused.mjs';
import {flatReference,originalAddresses} from '../../src/geometry.mjs';
import {encodeYijing,decodeYijing,CUPWAKE_EDITION,SYMBIOSIS_EDITION} from '../../src/yijing-cymatic.mjs';
const file=process.argv[2];if(!file)throw Error('PRIVATE_PANEL_FILE_REQUIRED');
const x=JSON.parse(readFileSync(file,'utf8'));
if(x.schema!=='atlas.real-selected-parity-panel/v1'||x.records.length!==12||x.selectedModelCalls!==12||x.humanJudgments!==0)throw Error('SOURCE_PANEL_FIELDS');
let matches=0,negative=0;const checks=[];
for(const r of x.records){
 const flat=flatReference(r.scores,12),fused=fusedTensorSelect(r.scores,12);
 if(flat.length!==12||flat.some((c,i)=>r.topIndices[i]!==c.index||fused.selection.hits[i].hsn!==c.hsn||fused.selection.hits[i].score!==c.score))throw Error('ACTUAL_MODEL_RANK_DRIFT');
 let differences=0;for(const row of flat){
  const a=encodeYijing(row.hsn,CUPWAKE_EDITION),b=encodeYijing(row.hsn,SYMBIOSIS_EDITION);
  if(decodeYijing({edition:a.edition,hexagramCode:a.hexagramCode,contextCode:a.contextCode})!==row.hsn||
     decodeYijing({edition:b.edition,hexagramCode:b.hexagramCode,contextCode:b.contextCode})!==row.hsn)throw Error('LOSSY_SYMBOLIC_MAPPING');
  if(a.hexagramCode!==b.hexagramCode||a.contextCode!==b.contextCode)differences++;
 }
 matches++;negative+=differences;
 checks.push({id:r.id,querySha256:r.querySha256,ranksExact:true,dualYijingInverse:true,
  changedSymbolicCodes: differences,latencyMs:r.elapsedMs});
}
const report={schema:'atlas.real-selected-12-query-parity/v1',realModelCalls:x.selectedModelCalls,
 realModelWeightChanges:0,model:x.headSha256,originalSource:x.registrySha256,
 queries:matches,allTwelveNodeRanksExactlyPreserved:true,allDualEditionInversesCorrect:true,
 symbolicCodeDifferencesAcrossTop144:negative,sourceFamilyHeldout:false,
 independentHumanRelevanceJudgments:0,scientificQualityGainEstablished:false,
 remoteRightsVerified:false,publicHosted:false,scope:'PRIVATE_LOCAL_MODEL_REPLAY',
 sourceDetailsNotPublished:true,independentExperimentalReviewPending:true,checks};
 const out=process.argv[3];if(out)writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({queries:matches,exactRankChecks:matches*12,symbolicChanges:negative,
  actualSelectedModel:true,sourceFamilyHeldout:false,humanJudgments:0}));
