/**
 * Test-only, dense per-target four-band numerical oracle for Atlas geometry.
 * Not a runtime attention replacement: O(1728*D) per target, mask is arithmetic
 * only (NEVER permission), source rights and RETURN still belong to the host.
 * References peer #368/#375/#382/#385 numerical counterexamples, not their code.
 */
import {types as utilTypes} from 'node:util';
const N=1728;
const K=['scores','values','bias','mask','target'];
function ownPlain(obj,keys){
 if(!obj||typeof obj!=='object'||utilTypes.isProxy(obj)||Array.isArray(obj)||Object.getPrototypeOf(obj)!==Object.prototype)throw Error('INVALID_INPUT');
 const d=Object.getOwnPropertyDescriptors(obj),actual=Reflect.ownKeys(d);
 if(actual.length!==keys.length||actual.some(k=>typeof k!=='string'||!keys.includes(k)))throw Error('BAD_FIELDS');
 const out={};for(const k of keys){if(!d[k]||!Object.hasOwn(d[k],'value')||!d[k].enumerable)throw Error('GETTER_INPUT');out[k]=d[k].value;}return out;
}
function ownArray(x,n){
 if(!Array.isArray(x)||utilTypes.isProxy(x)||x.length!==n)throw Error('INVALID_ARRAY');
 const ds=Object.getOwnPropertyDescriptors(x);
 if(Reflect.ownKeys(ds).length!==n+1)throw Error('SPARSE_OR_EXTRA');
 const out=new Array(n);for(let i=0;i<n;i++){const d=ds[String(i)];if(!d||!Object.hasOwn(d,'value')||!d.enumerable)throw Error('ACCESSOR');out[i]=d.value;}return out;
}
function kind(target,i){if(i===target)return 0;if(Math.floor(i/12)===Math.floor(target/12))return 1;if(Math.floor(i/144)===Math.floor(target/144))return 2;return 3;}
/** One target's mathematically defined dense-band weighted mean, no N×N tensor. */
export function fourBandDenseOracle(input){
 let x,s,v,b,m,d;
 try{
  x=ownPlain(input,K);s=ownArray(x.scores,N);v=ownArray(x.values,N);b=ownArray(x.bias,4);m=ownArray(x.mask,N);
  if(!Number.isInteger(x.target)||x.target<0||x.target>=N)throw Error('TARGET');
  d=ownArray(v[0],v[0]?.length)?.length;
  if(!Number.isInteger(d)||d<1||d>384)throw Error('DIM');
  if(s.some(t=>typeof t!=='number'||!Number.isFinite(t)||Math.abs(t)>1e6))throw Error('SCORES');
  if(b.some(t=>typeof t!=='number'||!Number.isFinite(t)||Math.abs(t)>1e6))throw Error('BIAS');
  if(m.some(t=>typeof t!=='boolean'))throw Error('MASK');
  v=v.map(row=>ownArray(row,d));
  if(v.some(row=>row.some(t=>typeof t!=='number'||!Number.isFinite(t)||Math.abs(t)>1e100)))throw Error('VALUES');
 }catch(e){return Object.freeze({status:'HOLD_INVALID_NUMERIC_INPUT',reason:'INPUT_NOT_VERIFIED',releaseAuthorized:false,authorityEffect:'NONE'});}
 const logits=[],allowed=[];let mx=-Infinity;
 for(let i=0;i<N;i++)if(m[i]){const val=s[i]+b[kind(x.target,i)];logits.push(val);allowed.push(i);mx=Math.max(mx,val);}
 const vec=new Array(d).fill(0);
 if(allowed.length){let total=0;
  for(let p=0;p<allowed.length;p++){const w=Math.exp(logits[p]-mx);total+=w;const row=v[allowed[p]];for(let j=0;j<d;j++)vec[j]+=w*row[j];}
  for(let j=0;j<d;j++)vec[j]/=total;
 }
 return Object.freeze({schema:'atlas.geometry.test-oracle/v1',status:allowed.length?'NUMERIC_REFERENCE_ONLY':'EMPTY_NUMERIC_MASK',vector:Object.freeze(vec),target:x.target,arithmeticAllowedSources:allowed.length,rightsChecked:false,releaseAuthorized:false,modelUpdated:false,authorityEffect:'NONE'});
}
