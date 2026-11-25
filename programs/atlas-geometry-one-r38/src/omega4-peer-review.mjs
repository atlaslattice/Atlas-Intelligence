/** Atlas Omega4 optional no-secrets review projection for Geometry ONE R38.
 * Public-safe ORIGINAL code. No vendored peer source, model calls, rights,
 * workflow dispatch, private corpora or canon effects. External host verification
 * is a prerequisite for any later use, not granted here.
 */
import {createHash} from 'node:crypto';
import {types as utilTypes} from 'node:util';
const HEX=/^[0-9a-f]{64}$/;
const HSN=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const PIN='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
const SCHEMA='atlas.geometry-one.omega4-peer-review/v1';
const hold=reason=>Object.freeze({schema:SCHEMA,status:'HOLD_PEER_REVIEW',reason,
  releaseAuthorized:false,canonChanged:false,hostRightsVerified:false,canTrain:false});
function own(o,key){
 if(!o||typeof o!=='object'||Array.isArray(o)||utilTypes.isProxy(o))throw Error('OBJECT_REQUIRED');
 const d=Object.getOwnPropertyDescriptor(o,key);
 if(!d||!Object.hasOwn(d,'value')||!d.enumerable)throw Error('OWN_DATA_REQUIRED');
 return d.value;
}
function detachedPlain(x,depth=0,seen=new WeakSet()){
 if(depth>12)throw Error('DATA_DEPTH');
 if(x===null||typeof x==='boolean'||typeof x==='string')return x;
 if(typeof x==='number'&&Number.isFinite(x))return x;
 if(!x||typeof x!=='object'||utilTypes.isProxy(x)||seen.has(x))throw Error('NON_DATA_VALUE');
 if(Object.getPrototypeOf(x)!==Object.prototype&& !Array.isArray(x))throw Error('NON_PLAIN_OBJECT');
 seen.add(x);
 const ds=Object.getOwnPropertyDescriptors(x),keys=Reflect.ownKeys(ds);
 if(keys.length>512)throw Error('EXCESSIVE_KEYS');
 let y;
 if(Array.isArray(x)){
  if(x.length>512)throw Error('EXCESSIVE_ROWS');
  if(keys.some(k=>k!=='length'&&(!/^\d+$/.test(String(k))||Number(k)>=x.length)))throw Error('ARRAY_EXTRA_KEY');
  y=[];for(let i=0;i<x.length;i++){
   const d=ds[String(i)];if(!d||!Object.hasOwn(d,'value'))throw Error('SPARSE_OR_ACCESSOR');
   y.push(detachedPlain(d.value,depth+1,seen));
  }
 }else{
  y=Object.create(null);
  for(const key of keys){if(typeof key!=='string'||['__proto__','prototype','constructor'].includes(key)||!ds[key].enumerable||!Object.hasOwn(ds[key],'value'))throw Error('UNSAFE_FIELD');
   y[key]=detachedPlain(ds[key].value,depth+1,seen);
  }
 }
 seen.delete(x);return y;
}
const sha=obj=>createHash('sha256').update(JSON.stringify(obj)).digest('hex');
/**
 * Add an OPTIONAL, in-process peer review to the exact existing R38 result.
 * `independentlyPinned` must be injected by the real host from an independent
 * trust root; callers supplying their own anchor do NOT create authenticity.
 * We don't use it to mark a result release-authorized in any case.
 */
export function prepareOmega4PeerReview({inspection,peerRecords,independentlyPinned}={}){
 try{
  if(!inspection||utilTypes.isProxy(inspection)||own(inspection,'schema')!=='atlas.geometry-one.root/v1'||
    own(inspection,'status')!=='INSPECTION_CANDIDATE_ONLY'||own(inspection,'activationCount')!==1||
    own(inspection,'canDeploy')!==false||own(inspection,'canTrain')!==false||
    own(inspection,'releaseAuthorized')!==false)throw Error('UNAUTHORIZED_INSPECTION');
  const sourcePins=own(inspection,'sourcePins'),lineage=own(inspection,'lineage');
  const baseline=own(inspection,'baseline'),hits=own(baseline,'hits');
  if(own(sourcePins,'registrySha256')!==PIN||!HEX.test(own(sourcePins,'sourceSha256'))||
     !HEX.test(own(sourcePins,'modelSha256'))||!HEX.test(own(inspection,'frameDigest')))
       throw Error('SOURCE_OR_MODEL_MISMATCH');
  if(typeof own(lineage,'sourceId')!=='string'||typeof own(lineage,'sourceEdition')!=='string')throw Error('LINEAGE');
  if(!Array.isArray(hits)||hits.length<1||hits.length>24)throw Error('INVALID_HITS');
  const ids=new Set();
  for(const row of hits){
    const id=own(row,'hsn'),score=own(row,'score');
    if(typeof id!=='string'||!HSN.test(id)||ids.has(id)||typeof score!=='number'||!Number.isFinite(score))throw Error('RANK_OR_ID');
    ids.add(id);
  }
  // Require a separately supplied matching selection pin, but DO NOT label it
  // independent or current on the basis of a local object comparison.
  const pins=detachedPlain(independentlyPinned);
  const pinFields=['sourceSha256','modelSha256','frameDigest','rightsEpoch'];
  if(Object.keys(pins).sort().join('|')!==pinFields.sort().join('|')||
    pins.sourceSha256!==sourcePins.sourceSha256||pins.modelSha256!==sourcePins.modelSha256||
    pins.frameDigest!==inspection.frameDigest||pins.rightsEpoch!==own(inspection,'rightsEpoch'))throw Error('PIN_MISMATCH');
  if(!Array.isArray(peerRecords)||peerRecords.length<1||peerRecords.length>144)throw Error('PEER_COUNT');
  const peer=detachedPlain(peerRecords),seen=new Set();
  for(const p of peer){
    if(Object.keys(p).sort().join('|')!==['sourceId','sourceSha256','revision','status','objection'].sort().join('|')||
       typeof p.sourceId!=='string'||!p.sourceId||!HEX.test(p.sourceSha256)||
       typeof p.revision!=='string'||!p.revision||
       !['TESTED_LOCAL','PROPOSED','HELD','REJECTED'].includes(p.status)||
       typeof p.objection!=='string')throw Error('PEER_RECORD_INVALID');
    const id=p.sourceId+'|'+p.revision+'|'+p.sourceSha256;
    if(seen.has(id))throw Error('DUPLICATE_SOURCE');seen.add(id);
  }
  peer.sort((a,b)=>String(a.sourceId).localeCompare(String(b.sourceId))||String(a.revision).localeCompare(String(b.revision)));
  const peerDigest=sha(peer),conflicts=peer.filter(p=>p.objection).length;
  return Object.freeze({schema:SCHEMA,status:'PREPARED_NOT_RELEASED',
    // Return only review metadata, NEVER echo the caller's original result.
    // The existing gateway retains its issued result unchanged.
    originalFrameDigest:inspection.frameDigest,sourceSha256:sourcePins.sourceSha256,
    modelSha256:sourcePins.modelSha256,peerDigest,
    peerCount:peer.length,openObjections:conflicts,
    peerRecords:Object.freeze(peer.map(p=>Object.freeze(p))),
    attestation:'CALLER_SOURCE_SHAPE_ONLY_NOT_HOST_AUTHORIZATION',
    sourceUseAtHostVerified:false,requiredClosureIndependentlyComplete:false,
    hostRightsVerified:false,releaseAuthorized:false,canTrain:false,canDeploy:false,
    canonChanged:false,modelCallsByAdapter:0,rankChanged:false,
    authorityEffect:'NONE'});
 }catch(e){return hold(e?.message||'INVALID_INPUT');}
}