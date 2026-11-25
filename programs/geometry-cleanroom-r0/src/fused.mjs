import {NODE_COUNT,makeTopKHeap} from './geometry.mjs';
/**
 * A+B=C2: preserve B's cheap stable global-max normalization, eliminate one
 * redundant entire-node loop by fusing heap selection with sphere reductions.
 * Two 1728-element passes instead of B's three; no new retrieval or score mix.
 * C1 online logsumexp is preserved in fused-online-control.mjs as a losing
 * efficiency candidate, not retroactively claimed as a speedup.
 */
export function fusedTensorSelect(scores,k) {
  if(!scores || scores.length!==NODE_COUNT)throw Error('SHAPE_MISMATCH');
  let max=-Infinity;
  for(let i=0;i<NODE_COUNT;i++) {
    const v=scores[i];
    if(typeof v!=='number'||!Number.isFinite(v))throw Error('NONFINITE_NEURAL_SCORE');
    if(v>max)max=v;
  }
  const heap=makeTopKHeap(k),house=new Array(12).fill(0),sphere=new Array(144).fill(0);
  let z=0;
  for(let i=0;i<NODE_COUNT;i++){
    const value=scores[i];
    heap.offer(i,value);
    const mass=Math.exp(value-max);
    house[Math.floor(i/144)]+=mass;
    sphere[Math.floor(i/12)]+=mass;
    z+=mass;
  }
  return Object.freeze({selection:heap.finalize(),mass:Object.freeze({
    houseMass:Object.freeze(house.map(v=>v/z)),sphereMass:Object.freeze(sphere.map(v=>v/z)),normalizerLog:max+Math.log(z)
  }),passes:2,aggregationMethod:'GLOBAL_MAX_FUSED_SELECTION_REDUCTION'});
}
