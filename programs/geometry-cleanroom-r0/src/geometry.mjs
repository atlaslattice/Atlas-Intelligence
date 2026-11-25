/**
 * Geometree R0 clean-room address and crosswalk core.
 * Structural alignment is a design experiment, not a claim that coordinate
 * coincidence implies scientific, cultural, or semantic identity.
 */
import {types as utilTypes} from 'node:util';
export const SIDE = 12;
export const NODE_COUNT = 1728;
export const SPHERE_COUNT = 144;
export const HOUSE_COUNT = 12;
export const ARIADNE_SHA256 = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
export const SOURCE_SCHEMA = 'atlas.geometry.cleanroom.r0/v1';
export const RELATION_KINDS = Object.freeze([
  'EXACT_IDENTITY','PHYSICAL_PROPERTY','MATHEMATICAL_RELATION',
  'STATISTICAL_CORRELATION','COMPUTATIONAL_OPERATOR','SEMANTIC_CANDIDATE',
  'MYTHOLOGICAL_ASSOCIATION','GENERATIVE_ANALOGY','CONTRADICTS','UNKNOWN'
]);
const HSN = /^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const HEX = /^[a-f0-9]{64}$/;
const pad = n => String(n).padStart(2,'0');
export function encodeAddress(h,s,n) {
  if (![h,s,n].every(v=>Number.isInteger(v) && v>=1 && v<=12)) throw Error('INVALID_AXES');
  return `H${pad(h)}.S${pad(s)}.N${pad(n)}`;
}
export function linearIndex(h,s,n) {
  if (![h,s,n].every(v=>Number.isInteger(v) && v>=1 && v<=12)) throw Error('INVALID_AXES');
  return ((h-1)*12+(s-1))*12+(n-1);
}
export function decodeIndex(i) {
  if (!Number.isInteger(i) || i<0 || i>=NODE_COUNT) throw Error('INVALID_INDEX');
  const h=Math.floor(i/144)+1,s=Math.floor(i/12)%12+1,n=i%12+1;
  return Object.freeze({index:i,h,s,n,hsn:encodeAddress(h,s,n),sphereIndex:(h-1)*12+s-1});
}
export function decodeAddress(value) {
  const m=typeof value==='string'?HSN.exec(value):null;
  if (!m) throw Error('INVALID_HSN');
  return decodeIndex(linearIndex(Number(m[1]),Number(m[2]),Number(m[3])));
}
export function addressIndex(value) { return decodeAddress(value).index; }
export const originalAddresses = Object.freeze(Array.from({length:NODE_COUNT},(_,i)=>decodeIndex(i).hsn));

/**
 * A typed crosswalk is independent source-linked metadata; it does not edit the
 * canonical node map or itself become training/score evidence.
 */
export function inspectCrosswalk(input) {
  if (!input || typeof input!=='object' || utilTypes.isProxy(input) || Array.isArray(input) || Object.getPrototypeOf(input)!==Object.prototype) throw Error('INVALID_CROSSWALK');
  const keys=['system','edition','sourceSha256','externalCoordinate','relationKind','hsn','reviewStatus'];
  const descriptors=Object.getOwnPropertyDescriptors(input);
  if (Reflect.ownKeys(descriptors).length!==keys.length || Reflect.ownKeys(descriptors).some(k=>typeof k!=='string'||!keys.includes(k))) throw Error('CROSSWALK_FIELDS');
  const record={};
  for(const key of keys){const descriptor=descriptors[key];if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw Error('CROSSWALK_ACCESSOR');record[key]=descriptor.value;}
  if (typeof record.system!=='string' || !record.system || record.system.length>64) throw Error('SYSTEM');
  if (typeof record.edition!=='string' || !record.edition || record.edition.length>128) throw Error('EDITION');
  if (typeof record.externalCoordinate!=='string'||!record.externalCoordinate||record.externalCoordinate.length>256) throw Error('EXTERNAL_COORDINATE');
  if (typeof record.sourceSha256!=='string'||!HEX.test(record.sourceSha256)) throw Error('CROSSWALK_PIN');
  if (!RELATION_KINDS.includes(record.relationKind)) throw Error('RELATION_KIND');
  if (!['REVIEWED','PROPOSED','DISPUTED','REJECTED'].includes(record.reviewStatus)) throw Error('REVIEW_STATUS');
  decodeAddress(record.hsn);
  return Object.freeze({...record,authorityEffect:'NONE'});
}

/** Sequentially scan a 12x12x12 score tensor in one pass. Inputs are scores,
 * not lexical weights or truth probabilities. Stable log-sum-exp avoids overflow.
 */
export function tensorMass(scores) {
  if (!scores || scores.length!==NODE_COUNT) throw Error('SHAPE_MISMATCH');
  let max=-Infinity;
  for (let i=0;i<NODE_COUNT;i++) {
    const v=scores[i];if (typeof v!=='number' || !Number.isFinite(v)) throw Error('NONFINITE_NEURAL_SCORE');
    if(v>max)max=v;
  }
  const house=new Array(12).fill(0),sphere=new Array(144).fill(0);
  let total=0;
  for(let i=0;i<NODE_COUNT;i++){
    const p=Math.exp(scores[i]-max);
    const h=Math.floor(i/144),s=Math.floor(i/12);
    house[h]+=p;sphere[s]+=p;total+=p;
  }
  return Object.freeze({houseMass:Object.freeze(house.map(v=>v/total)),sphereMass:Object.freeze(sphere.map(v=>v/total)),normalizerLog:max+Math.log(total)});
}

/** Deterministic top-k using a bounded 'worst-first' heap: O(1728 log k)
 * comparisons, O(k) selection memory, and tie-break by lower original index.
 */
/** Shared bounded heap primitive, reused by the two-pass B control and
 * one-pass fused C candidate. Comparator: score desc, canonical index asc.
 */
export function makeTopKHeap(k) {
  if (!Number.isInteger(k)||k<1||k>NODE_COUNT) throw Error('INVALID_TOPK');
  const worse=(a,b)=>a.score<b.score || (a.score===b.score && a.index>b.index);
  const heap=[];let comparisons=0;
  function worseCount(a,b){comparisons++;return worse(a,b);}
  function offer(index,score){
    if(typeof score!=='number'||!Number.isFinite(score))throw Error('NONFINITE_NEURAL_SCORE');
    const v={index,score};
    if(heap.length<k){
      let j=heap.push(v)-1;
      while(j>0){const p=(j-1)>>1;if(!worseCount(heap[j],heap[p]))break;[heap[j],heap[p]]=[heap[p],heap[j]];j=p;}
    } else {
      comparisons++;
      if(!worse(heap[0],v))return;
      heap[0]=v;
      let j=0;
      for(;;){const l=2*j+1,r=l+1;let w=j;
        if(l<heap.length&&worseCount(heap[l],heap[w]))w=l;
        if(r<heap.length&&worseCount(heap[r],heap[w]))w=r;
        if(w===j)break;[heap[w],heap[j]]=[heap[j],heap[w]];j=w;
      }
    }
  }
  function finalize(){
    heap.sort((a,b)=>b.score-a.score||a.index-b.index);
    return Object.freeze({hits:Object.freeze(heap.map(v=>Object.freeze({...v,hsn:originalAddresses[v.index]}))),comparisons,method:'NEURAL_EXACT_HEAP'});
  }
  return Object.freeze({offer,finalize});
}
export function sparseTopK(scores,k) {
  if (!scores||scores.length!==NODE_COUNT) throw Error('SHAPE_MISMATCH');
  const heap=makeTopKHeap(k);
  for(let i=0;i<NODE_COUNT;i++)heap.offer(i,scores[i]);
  return heap.finalize();
}
export function flatReference(scores,k) {
  if(!scores||scores.length!==NODE_COUNT)throw Error('SHAPE_MISMATCH');
  if(!Number.isInteger(k)||k<1||k>NODE_COUNT)throw Error('INVALID_TOPK');
  const sorted=Array.from(scores,(score,index)=>{
    if(typeof score!=='number'||!Number.isFinite(score))throw Error('NONFINITE_NEURAL_SCORE');
    return {index,score,hsn:originalAddresses[index]};
  });
  sorted.sort((a,b)=>b.score-a.score||a.index-b.index);
  return Object.freeze(sorted.slice(0,k).map(v=>Object.freeze(v)));
}
