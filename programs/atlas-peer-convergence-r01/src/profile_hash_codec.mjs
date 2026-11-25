/**
 * Atlas v0.7 sourced Sphere profile digest reviewer. PURE source-only utility.
 * The historical R15 calculation escaped non-ASCII while original profile
 * digests used literal UTF-8 compact sorted JSON. This module NEVER promotes
 * source fingerprints into semantic truth, room rights, or CANON.
 * Reads only own plain data, not callable getters, proxies, or custom toJSON.
 */
import {createHash} from 'node:crypto';
import {types} from 'node:util';
export const PROFILE_CODEC='atlas.profile.sorted-compact-utf8/v1';
export const LEGACY_CODEC='atlas.profile.sorted-compact-ascii/v1';
export const ARIADNE_SOURCE_SHA='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
const HEX=/^[a-f0-9]{64}$/;
const ID=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])$/;
const denied=(reason)=>Object.freeze({schema:'atlas.profile.codec-inspection/v1',status:'HOLD',reason,canPromote:false,rightsAttested:false,semanticAccepted:false,authorityEffect:'NONE'});
function ownSnapshot(value,depth=0,budget={nodes:0},visiting=new WeakSet()){
 if(++budget.nodes>20000||depth>18)throw Error('SOURCE_SIZE_LIMIT');
 if(value===null || typeof value==='string' || typeof value==='boolean')return value;
 if(typeof value==='number' && Number.isFinite(value) && !Object.is(value,-0))return value;
 if(!value || typeof value!=='object' || types.isProxy(value) || visiting.has(value))throw Error('FOREIGN_OR_CIRCULAR_OBJECT');
 const arr=Array.isArray(value);
 if(arr){
  if(value.length>4096 || Object.getPrototypeOf(value)!==Array.prototype)throw Error('ARRAY_PROTOTYPE_OR_SIZE');
  const ds=Object.getOwnPropertyDescriptors(value);
  if(Reflect.ownKeys(ds).length!==value.length+1)throw Error('ARRAY_SPARSE_OR_EXTRA');
  visiting.add(value);const out=[];
  for(let i=0;i<value.length;i++){
   const d=ds[String(i)];
   if(!d||!Object.hasOwn(d,'value')||!d.enumerable)throw Error('ARRAY_GETTER');
   out.push(ownSnapshot(d.value,depth+1,budget,visiting));
  }
  visiting.delete(value);return out;
 }
 if(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)throw Error('NOT_PLAIN_DATA');
 const ds=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(ds);
 if(keys.length>1000)throw Error('MANY_KEYS');
 visiting.add(value);const out=Object.create(null);
 for(const key of keys.sort()){
  if(typeof key!=='string'||['__proto__','prototype','constructor'].includes(key))throw Error('UNSAFE_KEY');
  const d=ds[key];if(!d||!d.enumerable||!Object.hasOwn(d,'value'))throw Error('ACCESSOR');
  out[key]=ownSnapshot(d.value,depth+1,budget,visiting);
 }
 visiting.delete(value);return out;
}
const sha=(s)=>createHash('sha256').update(s,'utf8').digest('hex');
export function inspectSphereProfile(profile,options={}){
 try{
  const opts=ownSnapshot(options);
  if(!opts || Array.isArray(opts) || Object.keys(opts).some(k=>k!=='expectedRegistrySha256'))throw Error('OPTIONS_NOT_PLAIN');
  const expectedRegistrySha256=opts.expectedRegistrySha256??ARIADNE_SOURCE_SHA;
  if(typeof expectedRegistrySha256!=='string'||expectedRegistrySha256!==ARIADNE_SOURCE_SHA)throw Error('REGISTRY_NOT_PINNED');
  const p=ownSnapshot(profile);
  if(!p||Array.isArray(p)||!ID.test(p.sphere_id)||!HEX.test(p.profile_sha256))throw Error('PROFILE_IDENTITY');
  if(p.house_id!==p.sphere_id.slice(0,3) || !['domain','epistemic_meta'].includes(p.kind))throw Error('PROFILE_ROLE');
  const s=Number(p.sphere_id.slice(-2));
  if((s<=7)!==(p.kind==='domain'))throw Error('ROLE_NOT_FROM_SPHERE');
  const reported=p.profile_sha256;delete p.profile_sha256;
  const canonical=JSON.stringify(p);
  const literalSha=sha(canonical);
  // Historical encoder Python ensure_ascii=True. U+0080..FFFF encoded as
  // individual lowercase \uXXXX code units, including surrogate halves.
  const asciiCanonical=canonical.replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
  const legacySha=sha(asciiCanonical);
  if(literalSha!==reported)throw Error('DECLARED_UTF8_SOURCE_MISMATCH');
  return Object.freeze({schema:'atlas.profile.codec-inspection/v1',status:'LOCAL_UTF8_DIGEST_MATCH',
    profileCodec:PROFILE_CODEC,legacyCodec:LEGACY_CODEC,sphere:p.sphere_id,
    registrySha256:ARIADNE_SOURCE_SHA,reportedProfileSha256:reported,
    calculatedUtf8Sha256:literalSha,calculatedAsciiEscapedSha256:legacySha,
    historicalScopeRequiresFreshReview:legacySha!==literalSha,
    bytesMayBeDisclosed:false,canPromote:false,rightsAttested:false,
    semanticAccepted:false,authorityEffect:'NONE'});
 }catch(e){return denied(e instanceof Error && /^[A-Z0-9_]+$/.test(e.message)?e.message:'UNTRUSTED_PROFILE_INPUT');}
}
