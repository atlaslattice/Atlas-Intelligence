/**
 * Atlas Required Closure Gate (review-only, no authority effects).
 * Additive to the existing neural composer. This does not retrieve, rank, write,
 * attest identity, grant source rights, invoke providers or train a model.
 *
 * SECURITY CONTRACT: `trustedAnchor` MUST come from an independently configured
 * authoritative host/pinned source. It must NOT be supplied by the same caller
 * selecting observed evidence. Otherwise this is merely a consistency check.
 */
import { createHash } from 'node:crypto';
import { types as utilTypes } from 'node:util';

export const MANIFEST_SCHEMA = 'atlas.required-closure.manifest/v1';
export const RESULT_SCHEMA = 'atlas.required-closure.review/v1';
const HEX = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,127}$/;
const FAMILIES = Object.freeze(['components','dependencies','receipts','objections','uses']);
const PASS_STATES = Object.freeze({components:'PASS',dependencies:'PASS',receipts:'PASS',objections:'RESOLVED'});
const MAX_BYTES = 512 * 1024;

function reject(code) { throw new Error(code); }
function normalize(value, depth = 0, seen = new WeakSet()) {
  if (depth > 32) reject('INVALID_DEPTH');
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value) && Number.isSafeInteger(value)) return value;
  if (typeof value !== 'object' || utilTypes.isProxy(value)) reject('NON_DATA_VALUE');
  if (seen.has(value)) reject('CYCLE');
  seen.add(value);
  let result;
  if (Array.isArray(value)) {
    if (value.length > 4096) reject('ARRAY_TOO_LARGE');
    const descriptors = Object.getOwnPropertyDescriptors(value);
    result = [];
    for (let i=0;i<value.length;i++) {
      if (!Object.hasOwn(descriptors,String(i)) || !Object.hasOwn(descriptors[String(i)],'value')) reject('SPARSE_ARRAY');
      result.push(normalize(descriptors[String(i)].value, depth+1, seen));
    }
    if (Object.keys(descriptors).some(k => k !== 'length' && (!/^\d+$/.test(k) || Number(k) >= value.length))) reject('ARRAY_EXTRA_KEY');
  } else {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) reject('NON_PLAIN_OBJECT');
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys=Reflect.ownKeys(descriptors);
    if (keys.length > 512) reject('OBJECT_TOO_LARGE');
    result={};
    for (const key of keys.sort()) {
      const descriptor = descriptors[key];
      if (typeof key !== 'string' || key === '__proto__' || key === 'constructor' || key === 'prototype' || !descriptor.enumerable || !Object.hasOwn(descriptor,'value')) reject('UNSAFE_KEY');
      Object.defineProperty(result,key,{value:normalize(descriptor.value,depth+1,seen),enumerable:true,writable:true,configurable:true});
    }
  }
  seen.delete(value);
  return result;
}
export function canonical(value) {
  const normalized=normalize(value);
  const text=JSON.stringify(normalized);
  if (Buffer.byteLength(text,'utf8') > MAX_BYTES) reject('BYTES_TOO_LARGE');
  return text;
}
export function sha256(value) {return createHash('sha256').update(canonical(value)).digest('hex');}
const isId = value => typeof value==='string' && ID.test(value);
const isHex = value => typeof value==='string' && HEX.test(value);
const exact = (obj,keys) => obj !== null && typeof obj==='object' && !Array.isArray(obj) && Object.keys(obj).sort().join('|')===keys.slice().sort().join('|');
function assert(ok,reason) { if (!ok) reject(reason); }

/**
 * Returns one metadata-only decision, NEVER a release authorization.
 * Unknown/missing/contradictory evidence is held. A complete REQUIRED set is
 * assured only to the extent the host independently pinned that set.
 */
export function reviewRequiredClosure({trustedAnchor,manifest,observed}) {
  const diagnostics=[];
  const hold=(code,detail='')=>{if(diagnostics.length<16) diagnostics.push({code,detail:String(detail).slice(0,128)});};
  let manifestHash=null, selectionHash=null;
  try {
    const a=normalize(trustedAnchor),m=normalize(manifest),o=normalize(observed);
    manifestHash=sha256(m);
    assert(exact(a,['manifestSha256','selectionSha256','policySha256']),'ANCHOR_SCHEMA');
    assert(isHex(a.manifestSha256) && isHex(a.selectionSha256) && isHex(a.policySha256),'ANCHOR_DIGEST');
    assert(exact(m,['schema','selection','policySha256','required']),'MANIFEST_FIELDS');
    assert(m.schema===MANIFEST_SCHEMA && isHex(m.policySha256),'MANIFEST_SCHEMA');
    assert(exact(m.selection,['requestSha256','resultSha256','modelSha256','runtimeSha256','sourceSha256','sourceEdition','deliveryPurpose']), 'SELECTION_FIELDS');
    for(const name of ['requestSha256','resultSha256','modelSha256','runtimeSha256','sourceSha256']) assert(isHex(m.selection[name]),'SELECTION_DIGEST');
    assert(isId(m.selection.sourceEdition),'SOURCE_EDITION');
    assert(['INFERENCE','CITATION','TRAINING'].includes(m.selection.deliveryPurpose),'DELIVERY_PURPOSE');
    selectionHash=sha256(m.selection);
    assert(a.manifestSha256===manifestHash,'UNTRUSTED_MANIFEST');
    assert(a.selectionSha256===selectionHash,'SELECTION_NOT_PINNED');
    assert(a.policySha256===m.policySha256,'POLICY_NOT_PINNED');
    assert(exact(m.required,FAMILIES) && exact(o,FAMILIES),'FAMILY_FIELDS');
    assert(FAMILIES.every(f=>Array.isArray(m.required[f]) && Array.isArray(o[f])),'FAMILY_ARRAYS');
    assert(FAMILIES.reduce((n,f)=>n+m.required[f].length,0)>0,'EMPTY_REQUIRED_SET');
    if(m.selection.deliveryPurpose==='TRAINING')hold('TRAINING_OUT_OF_SCOPE');
    const seenAllowedPurposes=new Set();
    for (const family of FAMILIES) {
      const req=m.required[family],got=o[family];
      assert(req.length<=512 && got.length<=512,'TOO_MANY_RECORDS');
      const required=new Map(), actual=new Map();
      for(const item of req){
        assert(exact(item,['id','sha256']) && isId(item.id) && isHex(item.sha256),'REQUIRED_ENTRY');
        assert(!required.has(item.id),'DUPLICATE_REQUIRED');required.set(item.id,item.sha256);
      }
      for(const row of got){
        assert(row !== null && typeof row==='object' && !Array.isArray(row),'OBSERVED_ENTRY');
        assert(isId(row.id),'OBSERVED_ID');
        if(actual.has(row.id))hold('DUPLICATE_OBSERVED',family+'/'+row.id);
        actual.set(row.id,row);
      }
      for(const [id,hash] of required){
        const row=actual.get(id);
        if(!row){hold('MISSING_REQUIRED',family+'/'+id);continue;}
        if(sha256(row)!==hash){hold('RECEIPT_DIGEST_MISMATCH',family+'/'+id);continue;}
        if(row.selectionSha256!==selectionHash){hold('STALE_SELECTION',family+'/'+id);continue;}
        if (family==='uses') {
          if (!exact(row,['id','selectionSha256','purpose','decision','sourceSha256','sourceEdition']) || !['INSPECTION','INFERENCE','DISCLOSURE','TRAINING'].includes(row.purpose)) {hold('BAD_PURPOSE',id);continue;}
          if(row.sourceSha256!==m.selection.sourceSha256 || row.sourceEdition!==m.selection.sourceEdition){hold('SOURCE_EDITION_MISMATCH',id);continue;}
          if(row.decision!=='ALLOW'){hold('RIGHTS_NOT_ALLOWED',id);continue;}
          seenAllowedPurposes.add(row.purpose);
        } else {
          if(!exact(row,['id','selectionSha256','state'])) {hold('RECEIPT_FIELDS',family+'/'+id);continue;}
          if(row.state!==PASS_STATES[family])hold(family==='objections'?'OPEN_OR_UNRESOLVED_OBJECTION':'NONPASS_EVIDENCE',family+'/'+id);
        }
      }
      for (const id of actual.keys())if(!required.has(id))hold('UNDECLARED_RECORD',family+'/'+id);
    }
    if(!seenAllowedPurposes.has('INFERENCE'))hold('INFERENCE_USE_MISSING');
    if(m.selection.deliveryPurpose==='CITATION' && !seenAllowedPurposes.has('DISCLOSURE'))hold('DISCLOSURE_USE_MISSING');
  }catch(e){hold('INVALID_OR_UNTRUSTED_INPUT',e.message);}
  return Object.freeze({schema:RESULT_SCHEMA,status:diagnostics.length?'HOLD_METADATA':'MATCHED_PINNED_METADATA',
    manifestSha256:manifestHash,selectionSha256:selectionHash,diagnostics:Object.freeze(diagnostics),
    requiredSetIndependentlyComplete:false,sourceRightsAttested:false,hostedExecutionVerified:false,
    releaseAuthorized:false,trainingEligible:false,modelUpdated:false,participantIdentityVerified:false,
    observedNeuralQualityGain:false,authorityEffect:'NONE'});
}
