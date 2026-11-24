/**
 * ATLAS Mutation Atlas v3: additive source-conditioned negative-case proposal.
 * Addresses legacy I18's output-invariant menu. No host call or mutation of stored data.
 * Import from existing 20 inventions; preserve all 5 baseline cases for rollback.
 */
import {createHash} from 'node:crypto';
import {ORIGINAL_SHA256,runInnovation} from '../../../src/innovations.mjs';
export const SCHEMA='atlas.ariadne.adaptive-mutation/v0.1';
const HSN=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const ROOT=/^(?:I(0[1-9]|1[0-9]|20)|M145)$/;
const DENIAL=()=>({schema:SCHEMA,state:'HOLD',code:'UNTRUSTED_SYNTHETIC_SCOPE',externalEffects:0,authorityEffect:'NONE'});
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function snapshot(value,level=0){
 if(level>5)throw Error('DEPTH');
 if(value===null||typeof value==='string'||typeof value==='boolean'||(typeof value==='number'&&Number.isFinite(value)))return value;
 if(!value||typeof value!=='object')throw Error('TYPE');
 if(Object.getPrototypeOf(value)!==(Array.isArray(value)?Array.prototype:Object.prototype))throw Error('PROTOTYPE');
 const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(value);
 if(keys.length>30)throw Error('LIMIT');
 if(Array.isArray(value)){
  if(descriptors.length.value>12)throw Error('ARRAY_LIMIT');
  if(keys.length!==descriptors.length.value+1)throw Error('ARRAY_EXTRAS');
  return Array.from({length:descriptors.length.value},(_,i)=>{
    const d=descriptors[String(i)];if(!d||!d.enumerable||!Object.hasOwn(d,'value'))throw Error('ARRAY_ACCESSOR');
    return snapshot(d.value,level+1);
  });
 }
 const out={};
 for(const key of keys){
  if(typeof key!=='string'||['__proto__','prototype','constructor'].includes(key))throw Error('KEY');
  const d=descriptors[key];if(!d||!d.enumerable||!Object.hasOwn(d,'value'))throw Error('ACCESSOR');
  out[key]=snapshot(d.value,level+1);
 }
 return out;
}
const FORBIDDEN=new Set(['body','content','raw','password','secret','token','api_key','palace','dream','imagine','brain','private']);
function containsProtected(value){
 if(!value||typeof value!=='object')return false;
 return Object.entries(value).some(([k,v])=>FORBIDDEN.has(k.toLowerCase())||containsProtected(v));
}
/** Build a new optional mutation menu; never change original I18 output. */
export function adaptMutationAtlas(input){
 let x;try{x=snapshot(input);}catch{return DENIAL();}
 if(!x||typeof x!=='object'||Array.isArray(x)||containsProtected(x)||
    Reflect.ownKeys(x).some(k=>!['coordinate','sourceRegistrySha256','originMode','rootId','syntheticSignal'].includes(k))||
    typeof x.coordinate!=='string'||!HSN.test(x.coordinate)||x.sourceRegistrySha256!==ORIGINAL_SHA256||
    x.originMode!=='WORK'||typeof x.rootId!=='string'||!ROOT.test(x.rootId)||
    typeof x.syntheticSignal!=='number'||!Number.isInteger(x.syntheticSignal)||x.syntheticSignal<0||x.syntheticSignal>420)return DENIAL();
 const original=runInnovation('I18',{packet:{coordinate:x.coordinate,registrySha256:ORIGINAL_SHA256,originMode:'WORK'}});
 if(original.state!=='LOCAL_SYNTHETIC_CANDIDATE'||original.data.mutants.length!==5)return DENIAL();
 const seed=sha([x.rootId,x.coordinate,x.syntheticSignal,ORIGINAL_SHA256]);
 const house=x.coordinate.slice(0,3),sphere=x.coordinate.slice(0,7);
 const additions=[
  {case:'PARENT_SOURCE_LINEAGE_FORK',syntheticParent:x.rootId,invalidLineageTag:seed.slice(0,14),expected:'HOLD_LINEAGE'},
  {case:'CROSS_SPHERE_FALSE_FRIEND',candidateSphere:sphere,foreignHouse:house==='H12'?'H01':'H12',expected:'HOLD_CROSSWALK'},
  {case:'READ_RETURN_EPOCH_REVOKED',syntheticRightsEpoch:x.syntheticSignal+1,syntheticRevokedAt:x.syntheticSignal+2,expected:'HOLD_RETURN'}
 ];
 const data={schema:SCHEMA,state:'LOCAL_SYNTHETIC_MUTATION_PLAN',coordinate:x.coordinate,rootId:x.rootId,
   baselineCases:original.data.mutants,proposedAdditionalCases:additions,totalCases:8,
   signalBucket:x.syntheticSignal,sourceRegistrySha256:ORIGINAL_SHA256,
   changedVersusLegacyMenu:true,actualHostFuzzing:false,scientificAcceptance:false,
   replayedAgainstHost:false,workHostAuthorized:false,privateInputImported:false,
   externalEffects:0,authorityEffect:'NONE'};
 return {...data,proposalSha256:sha(data)};
}
/** One explicitly fictional test fixture; no authorization grant from a boolean. */
export function challengeSyntheticCandidate(plan,{caseIndex=0,originMode='WORK'}={}){
 const deny={schema:SCHEMA,state:'HOLD',externalEffects:0,authorityEffect:'NONE'};
 if(!plan||plan.schema!==SCHEMA||plan.state!=='LOCAL_SYNTHETIC_MUTATION_PLAN'||
   plan.sourceRegistrySha256!==ORIGINAL_SHA256||originMode!=='WORK'||
   !Number.isInteger(caseIndex)||caseIndex<0||caseIndex>7)return deny;
 const selected=[...plan.baselineCases,...plan.proposedAdditionalCases][caseIndex];
 return {schema:SCHEMA,state:'ADVERSARIAL_CASE_PREPARED_NOT_HOST_RUN',case:selected.case,
   expectedOutcome:selected.expected??'HOLD',implementationStatus:'REQUIRES_HOST_NEGATIVE_TEST',
   noExternalEffect:true,externalEffects:0,authorityEffect:'NONE'};
}
