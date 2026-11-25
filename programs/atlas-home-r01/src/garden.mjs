/** Typed, non-authorizing Indra mirrors; no source content, identity or model access. */
import {decode,sourceKind} from './geometry.mjs';
import {types as utilTypes} from 'node:util';
const SHA=/^[a-f0-9]{64}$/;
const STATUS=new Set(['PROPOSED','SOURCE_BOUND_UNREVIEWED','TESTED_LOCAL','HELD','REJECTED']);
const EDGES=new Set(['COMPLEMENTS','CONTRADICTS','REQUIRES','FALSIFIES','ANALOGY','CAUSAL_CANDIDATE']);
export function inspectIdea(idea){try{
 if(!idea||typeof idea!=='object'||Array.isArray(idea)||utilTypes.isProxy(idea)||Object.getPrototypeOf(idea)!==Object.prototype)throw Error('UNTRUSTED');
 const ds=Object.getOwnPropertyDescriptors(idea),keys=['id','hsn','sourceSha256','sourceEdition','status','premiseA','premiseB','falsifier'];
 if(Reflect.ownKeys(ds).length!==keys.length||Reflect.ownKeys(ds).some(k=>typeof k!=='string'||!keys.includes(k)))throw Error('FIELDS');
 const v={};for(const k of keys){const d=ds[k];if(!d||!Object.hasOwn(d,'value')||!d.enumerable)throw Error('GETTER');v[k]=d.value;}
 decode(v.hsn);if(!SHA.test(v.sourceSha256)||typeof v.sourceEdition!=='string'||v.sourceEdition.length<1||v.sourceEdition.length>100||!STATUS.has(v.status)||!/^C[0-9]{1,4}$/.test(v.id))throw Error('INVALID');
 if(![v.premiseA,v.premiseB,v.falsifier].every(x=>typeof x==='string'&&x.length>=3&&x.length<=240))throw Error('IDEA_FIELDS');
 return Object.freeze({schema:'atlas.home.idea.v1',...v,methodRequiresSubject:sourceKind(v.hsn)==='EPISTEMIC_META',semanticAcceptance:false,trainingEligible:false,authorityEffect:'NONE'});
 }catch{return Object.freeze({status:'HOLD_UNTRUSTED_IDEA',authorityEffect:'NONE'})}}
export function compareIdeas(ideas,links=[]){
 if(!Array.isArray(ideas)||!Array.isArray(links)||ideas.length>144||links.length>1008)return Object.freeze({status:'HOLD_SIZE'});
 const records=ideas.map(inspectIdea);if(records.some(x=>x.status==='HOLD_UNTRUSTED_IDEA'))return Object.freeze({status:'HOLD_IDEA'});
 const ids=new Set(records.map(x=>x.id));if(ids.size!==records.length)return Object.freeze({status:'HOLD_DUPLICATE_ID'});
 const edges=[];for(const row of links){
  if(!row||typeof row!=='object'||Array.isArray(row)||utilTypes.isProxy(row)||Object.getPrototypeOf(row)!==Object.prototype)return Object.freeze({status:'HOLD_EDGE'});
  const ds=Object.getOwnPropertyDescriptors(row),required=['from','to','type'];
  if(Reflect.ownKeys(ds).length!==3||Reflect.ownKeys(ds).some(k=>typeof k!=='string'||!required.includes(k)||!Object.hasOwn(ds[k],'value')||!ds[k].enumerable))return Object.freeze({status:'HOLD_EDGE'});
  const from=ds.from.value,to=ds.to.value,type=ds.type.value;
  if(!EDGES.has(type)||!ids.has(from)||!ids.has(to))return Object.freeze({status:'HOLD_EDGE'});edges.push(Object.freeze({from,to,type,semanticallyReviewed:false}));
 }
 return Object.freeze({status:'DRAFT_IDEA_REFLECTION_ONLY',nodeCount:records.length,edgeCount:edges.length,ideas:Object.freeze(records),relations:Object.freeze(edges),sourceBodiesImported:false,semanticAcceptance:false,releaseAuthorized:false});
}
