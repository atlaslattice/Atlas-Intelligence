/**
 * Rank-stability review for the ONE existing Atlas neural result.
 * A distinct JavaScript implementation of the bounded-score comparison proposed
 * by the SwarmChat Geometry Rank Stability R01 reviewer (#380).
 * This module performs NO retrieval, inference, host authorization, migration,
 * trained ranking, or model update. Same-score ranking is not semantic quality.
 */
import { types as utilTypes } from 'node:util';
const MAX = 1728;
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const KEYS = ['ids','baseline','candidate','errorBound','k'];
const frozenPairs = rows => Object.freeze(rows.map(pair=>Object.freeze(pair.slice())));
function result(status, b=[], c=[], mismatch=null, unsafe=[], reason='') {
  return Object.freeze({
    schema:'atlas.geometry.rank-stability-review/v1',status,
    baselineIds:Object.freeze(b),candidateIds:Object.freeze(c),
    firstMismatch:mismatch,unsafePairs:frozenPairs(unsafe),reason,
    errorBoundIndependentlyVerified:false,
    originalSourceUseVerified:false,hostedExecutionVerified:false,
    releaseAuthorized:false,trainingEligible:false,modelUpdated:false,
    authorityEffect:'NONE'
  });
}
function dataObject(value,expected) {
  if (!value || typeof value!=='object' || utilTypes.isProxy(value) || Array.isArray(value) || Object.getPrototypeOf(value)!==Object.prototype) throw Error('ROOT_SHAPE');
  const descriptors=Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length!==expected.length ||
      Reflect.ownKeys(descriptors).some(x=>typeof x!=='string' || !expected.includes(x)))throw Error('ROOT_FIELDS');
  const out=Object.create(null);
  for (const key of expected) {
    const d=descriptors[key];
    if (!d||!Object.hasOwn(d,'value')||!d.enumerable)throw Error('ACCESSOR_OR_MISSING');
    out[key]=d.value;
  }
  return out;
}
function dataArray(x, max=MAX) {
  if (!Array.isArray(x)||utilTypes.isProxy(x)||x.length<1||x.length>max)throw Error('ARRAY_SIZE');
  const descriptors=Object.getOwnPropertyDescriptors(x);
  if (Reflect.ownKeys(descriptors).length!==x.length+1)throw Error('ARRAY_EXTRA_FIELDS');
  const out=[];
  for(let i=0;i<x.length;i++){
    const d=descriptors[String(i)];
    if(!d||!Object.hasOwn(d,'value')||!d.enumerable)throw Error('SPARSE_OR_ACCESSOR');
    out.push(d.value);
  }
  return out;
}
/**
 * Three-way result over supplied matched scores. A caller's claimed `errorBound`
 * is checked, NOT independently certified. Strict adjacent top-k margin must
 * exceed 2*errorBound. Near ties and changed ranking HOLD, including the
 * (k,k+1) boundary. Latin/HSN ASCII identity labels retain deterministic tie order.
 */
export function reviewRankStability(input) {
  let p, ids, base, candidate;
  try {
    p=dataObject(input,KEYS);
    ids=dataArray(p.ids);base=dataArray(p.baseline);candidate=dataArray(p.candidate);
    if(ids.length!==base.length||ids.length!==candidate.length)throw Error('LENGTH_MISMATCH');
    if(typeof p.errorBound!=='number'||!Number.isFinite(p.errorBound)||p.errorBound<0||!Number.isInteger(p.k)||p.k<1||p.k>MAX)throw Error('BAD_BOUND_OR_K');
    if(new Set(ids).size!==ids.length||ids.some(x=>typeof x!=='string'||!ID.test(x)))throw Error('BAD_IDENTITY');
    if(base.some(x=>typeof x!=='number'||!Number.isFinite(x))||candidate.some(x=>typeof x!=='number'||!Number.isFinite(x)))throw Error('NONFINITE_SCORE');
  } catch (e) { return result('HOLD_INVALID_INPUT',[],[],null,[],'INVALID_OR_UNTRUSTED_INPUT'); }
  const order = xs => Array.from({length:ids.length},(_,i)=>i)
    .sort((a,b)=>xs[b]-xs[a] || (ids[a]<ids[b]?-1:ids[a]>ids[b]?1:0));
  const rankB=order(base),rankC=order(candidate),size=Math.min(p.k,ids.length);
  const b=rankB.slice(0,size).map(i=>ids[i]),c=rankC.slice(0,size).map(i=>ids[i]);
  const mismatch=b.findIndex((id,j)=>id!==c[j]);
  if(base.some((x,i)=>Math.abs(x-candidate[i])>p.errorBound))
    return result('HOLD_BOUND_VIOLATION',[],[],null,[],'SUPPLIED_ERROR_BOUND_EXCEEDED');
  const unsafe=[];
  for(let i=0;i<Math.min(size,ids.length-1);i++){
    const a=rankB[i],z=rankB[i+1];
    if(base[a]-base[z]<=2*p.errorBound)unsafe.push([ids[a],ids[z]]);
  }
  if(mismatch!==-1)return result('HOLD_RANK_CHANGED',b,c,mismatch,unsafe,'OBSERVED_TOPK_DIFFERENT');
  if(unsafe.length)return result('HOLD_NEAR_TIE',b,c,null,unsafe,'TOPK_MARGIN_NOT_STRICT');
  return result('STABLE_ON_SUPPLIED_SCORES',b,c,null,[], 'NO_INDEPENDENT_ERROR_BOUND_ATTESTATION');
}
