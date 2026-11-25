import {NODE_COUNT,makeTopKHeap} from './geometry.mjs';
/**
 * A+B=C: one bounded selection/aggregation pass over the original 12x12x12
 * selected-head tensor, using online per-sphere log-sum-exp and the same heap.
 * Does NOT produce any new scores, trained weights or ontology relationships.
 */
export function fusedTensorSelect(scores,k) {
  if(!scores || scores.length!==NODE_COUNT)throw Error('SHAPE_MISMATCH');
  const heap=makeTopKHeap(k);
  const mx=new Float64Array(144).fill(-Infinity), sum=new Float64Array(144);
  for(let i=0;i<NODE_COUNT;i++){
    const value=scores[i];
    if(typeof value!=='number' || !Number.isFinite(value))throw Error('NONFINITE_NEURAL_SCORE');
    heap.offer(i,value);
    const sphere=Math.floor(i/12);
    if(value>mx[sphere]){
      sum[sphere]=mx[sphere]===-Infinity?1:sum[sphere]*Math.exp(mx[sphere]-value)+1;
      mx[sphere]=value;
    }else sum[sphere]+=Math.exp(value-mx[sphere]);
  }
  const logs=Array.from(mx,(v,i)=>v+Math.log(sum[i]));
  let max=-Infinity;for(const v of logs)if(v>max)max=v;
  let z=0;const scaled=logs.map(v=>{const w=Math.exp(v-max);z+=w;return w});
  const house=new Array(12).fill(0),sphere=scaled.map(v=>v/z);
  for(let i=0;i<144;i++)house[Math.floor(i/12)]+=sphere[i];
  return Object.freeze({selection:heap.finalize(),mass:Object.freeze({houseMass:Object.freeze(house),sphereMass:Object.freeze(sphere),normalizerLog:max+Math.log(z)}),passes:1,aggregationMethod:'PER_SPHERE_ONLINE_LOGSUMEXP'});
}
