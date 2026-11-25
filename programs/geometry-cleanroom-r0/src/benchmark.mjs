import {performance} from 'node:perf_hooks';
import {NODE_COUNT,flatReference,sparseTopK,tensorMass} from './geometry.mjs';
import {fusedTensorSelect} from './fused.mjs';
import {fusedTensorSelect as fusedOnlineControl} from './fused-online-control.mjs';
// Synthetic, reproducible, never scored as model quality or human evaluation.
function seeded(seed) {let x=seed>>>0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/0x100000000;};}
function vector(seed){const rng=seeded(seed);return Array.from({length:NODE_COUNT},()=>Math.round((rng()-0.5)*1e6)/1e6);}
function sortedIds(rows){return rows.map(r=>r.index);}
const arms=[];
for(let k of [5,12,24,144]){
  const cases=48,baselineTimes=[],geometryTimes=[],geometryPlusMassTimes=[],fusedTimes=[],onlineTimes=[];let equal=0,comp=0,fusedEqual=0,onlineEqual=0;
  for(let seed=1;seed<=cases;seed++){
    const data=vector(seed*193+k);
    const t0=performance.now();const a=flatReference(data,k);const t1=performance.now();
    const b=sparseTopK(data,k);const t2=performance.now();
    const m=tensorMass(data);const t3=performance.now();
    const c=fusedTensorSelect(data,k);const t4=performance.now();
    const online=fusedOnlineControl(data,k);const t5=performance.now();
    baselineTimes.push(t1-t0);geometryTimes.push(t2-t1);geometryPlusMassTimes.push(t3-t1);fusedTimes.push(t4-t3);onlineTimes.push(t5-t4);
    if(JSON.stringify(sortedIds(a))===JSON.stringify(sortedIds(b.hits)))equal++;
    if(JSON.stringify(sortedIds(a))===JSON.stringify(sortedIds(c.selection.hits)))fusedEqual++;
    if(JSON.stringify(sortedIds(a))===JSON.stringify(sortedIds(online.selection.hits)))onlineEqual++;
    comp+=b.comparisons;
    if(m.houseMass.length!==12||m.sphereMass.length!==144)throw Error('MASS_SHAPE');
  }
  const stats=(values)=>{const x=[...values].sort((a,b)=>a-b);return {p50_ms:Number(x[Math.floor(x.length/2)].toFixed(4)),p95_ms:Number(x[Math.floor(x.length*.95)].toFixed(4))}};
  arms.push({k,syntheticCases:cases,identicalRanks:equal,fusedIdenticalRanks:fusedEqual,onlineIdenticalRanks:onlineEqual,heapComparisonsAverage:Math.round(comp/cases),flatReference:stats(baselineTimes),sparseOnly:stats(geometryTimes),sparsePlusAggregation:stats(geometryPlusMassTimes),fusedTwoPass:stats(fusedTimes),onlineOnePassControl:stats(onlineTimes)});
}
console.log(JSON.stringify({schema:'atlas.geometry.synthetic-benchmark/v1',source:'synthetic seeded Float64 scores, not owner Model0.3',casesPerArm:48,method:'wall-clock process-local, fixed order/no warmup, not a model or general performance benchmark; no timing claim against incumbent0.3',selectionBaseline:'complete stable sort O(1728 log 1728)',candidate:'C2 stable-max 2-pass fused heap O(1728 log k) and sphere aggregation; C1 online single-pass as negative control',neuralModelCalls:0,qualityEvaluations:0,scientificAcceptance:false,arms},null,2));
