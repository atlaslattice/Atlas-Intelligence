/**
 * Atlas PR70 R03: frame byte/custody witness for ONE pre-existing neural issuance.
 * Additive to the canonical host gateway; never issues a query or grants a right.
 * Inspired by actual negative receipts #426/#433/#438/#58: equal visible top-k,
 * different hidden scores, signed-zero JSON collision, and pointer incarnation.
 * HSN is the sole authoritative knowledge address. Glyphs are optional views.
 */
import {createHash} from 'node:crypto';
import {types as utilTypes} from 'node:util';
import {ARIADNE_SHA256,HSN} from '../../atlas-geometry-one-r38/src/addresses.mjs';
import {inspectIssuedYijing} from './geometree-yijing-r10.mjs';

export const WITNESS_SCHEMA='atlas.pr70.frame-byte-witness/v1';
const HEX=/^[a-f0-9]{64}$/;
const KEY=/^[A-Za-z0-9][A-Za-z0-9._:\/@-]{0,159}$/;
const FIELDS=Object.freeze(['requestId','querySha256','sourceId','sourceSha256','sourceEdition',
 'modelSha256','headSha256','issuer','tenant','principal','rightsEpoch',
 'requiredSetSha256','scope','purpose','scoreEncoding','embeddingEncoding']);
const META=['requestId','querySha256','sourceSha256','modelSha256','headSha256','sourceEdition','sourceId',
 'issuer','tenant','principal','rightsEpoch','requiredSetSha256','scope','purpose','scoreEncoding','embeddingEncoding'];
const sha=b=>createHash('sha256').update(b).digest('hex');
const hold=reason=>Object.freeze({schema:WITNESS_SCHEMA,status:'HOLD',reason,scoreSha256:null,
 fullFrameSha256:null,sourceRightsVerified:false,requiredSetIndependentlyComplete:false,
 selectedHostVerified:false,releaseAuthorized:false,modelCallsAdded:0,sourceBodiesIncluded:false,authorityEffect:'NONE'});
function readPlain(raw,keys=null){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||utilTypes.isProxy(raw)||Object.getPrototypeOf(raw)!==Object.prototype)throw Error('UNTRUSTED_ROOT');
 const ds=Object.getOwnPropertyDescriptors(raw),names=Reflect.ownKeys(ds);
 if(keys&&(names.length!==keys.length||names.some(k=>typeof k!=='string'||!keys.includes(k))))throw Error('ROOT_FIELDS');
 const out=Object.create(null);
 for(const k of names){const d=ds[k];if(typeof k!=='string'||!d.enumerable||!Object.hasOwn(d,'value')||k==='__proto__'||k==='constructor'||k==='prototype')throw Error('ACCESSOR_OR_FORBIDDEN');out[k]=d.value;}
 return out;
}
function denseNumbers(raw,n){
 if(!Array.isArray(raw)||utilTypes.isProxy(raw)||raw.length!==n)throw Error('WRONG_VECTOR_SHAPE');
 const ds=Object.getOwnPropertyDescriptors(raw),names=Reflect.ownKeys(ds);
 if(names.length!==n+1||names.some(k=>k!=='length'&&(!/^(0|[1-9][0-9]*)$/.test(k)||Number(k)>=n)))throw Error('UNSAFE_VECTOR_EXTRA');
 const out=[];
 for(let i=0;i<n;i++){const d=ds[String(i)];if(!d||!Object.hasOwn(d,'value')||!d.enumerable||typeof d.value!=='number'||!Number.isFinite(d.value))throw Error('UNSAFE_VECTOR_VALUE');out.push(d.value);}
 return out;
}
function encodeIEEE(values,encoding){
 const bytes=encoding==='f32le'?4:encoding==='f64le'?8:0;if(!bytes)throw Error('ENCODING_UNSUPPORTED');
 const buffer=Buffer.alloc(values.length*bytes);
 values.forEach((value,i)=>{
   if(bytes===4){if(!Object.is(Math.fround(value),value))throw Error('LOSSY_F32_SOURCE');buffer.writeFloatLE(value,i*4);}
   else buffer.writeDoubleLE(value,i*8);
 });
 return buffer;
}
function domainHash(domain,data){return sha(Buffer.concat([Buffer.from(domain+'\0','utf8'),data]));}
function canonicalScope(b){const fields=META.map(k=>[k,b[k]]);return Buffer.from(JSON.stringify(fields),'utf8');}
function digestHSN(){return domainHash('atlas.ariadne.ordered-HSN/v0.7',Buffer.from(HSN.join('\n'),'utf8'));}
export const ORDERED_HSN_DIGEST=digestHSN();
function validateBinding(raw){
 const b=readPlain(raw,FIELDS);
 for(const k of ['requestId','sourceId','sourceEdition','issuer','tenant','principal','rightsEpoch']){
   if(typeof b[k]!=='string'||!KEY.test(b[k]))throw Error('BINDING_ID');
 }
 for(const k of ['querySha256','sourceSha256','modelSha256','headSha256','requiredSetSha256']){
  if(typeof b[k]!=='string'||!HEX.test(b[k]))throw Error('BINDING_SHA');
 }
 if(b.scope!=='WORK'||b.purpose!=='WORK_INSPECTION'||!['f32le','f64le'].includes(b.scoreEncoding)||!['f32le','f64le'].includes(b.embeddingEncoding))throw Error('SCOPE_OR_CODEC');
 return b;
}
/**
 * Root is the exact PR67 source-only prepared result, NOT an authenticated issuer.
 * `scores`/`embedding` MUST come from the same already-issued model frame.
 * No root can assert host egress/rights, and an externally anchored expected
 * full binary digest must be checked by the true host to prove issuance.
 */
export function inspectBinaryFrame({root,binding,scores,embedding,expectedFullFrameSha256=null}={}){
 try {
  const b=validateBinding(binding),r=readPlain(root);
  if(r.schema!=='atlas.geometry-one.root/v1'||r.status!=='INSPECTION_CANDIDATE_ONLY'||
     r.sourceScope!=='WORK'||r.canDeploy!==false||r.releaseAuthorized!==false||
     r.tenant!==b.tenant||r.rightsEpoch!==b.rightsEpoch)throw Error('WRONG_ROOT');
  const pins=readPlain(r.sourcePins),lineage=readPlain(r.lineage);
  if(pins.registrySha256!==ARIADNE_SHA256||pins.modelSha256!==b.modelSha256||
     pins.sourceSha256!==b.sourceSha256||lineage.sourceEdition!==b.sourceEdition||
     lineage.issuerClaim!==b.issuer)throw Error('ISSUER_OR_SOURCE_DRIFT');
  const topology=(()=>{if(!Array.isArray(r.topology)||utilTypes.isProxy(r.topology)||r.topology.length!==3)throw Error('GEOMETRY_DRIFT');const ds=Object.getOwnPropertyDescriptors(r.topology);if(Reflect.ownKeys(ds).length!==4)throw Error('GEOMETRY_DRIFT');return [0,1,2].map(i=>{const d=ds[String(i)];if(!d||!Object.hasOwn(d,'value'))throw Error('GEOMETRY_DRIFT');return d.value;})})();
  if(topology.join(',')!=='12,12,12')throw Error('GEOMETRY_DRIFT');
  const raw=denseNumbers(scores,1728),emb=denseNumbers(embedding,384);
  const scoreBytes=encodeIEEE(raw,b.scoreEncoding),embeddingBytes=encodeIEEE(emb,b.embeddingEncoding);
  // Independent raw binary identity includes signed zero, subnormals, order, dtype.
  const scoreSha256=domainHash(`atlas.neural.scores/${b.scoreEncoding}/v1`,scoreBytes);
  const embeddingSha256=domainHash(`atlas.neural.embedding/${b.embeddingEncoding}/v1`,embeddingBytes);
  const fullFrameSha256=domainHash('atlas.neural.full-frame-custody/v1',Buffer.concat([
   canonicalScope(b),Buffer.from(ORDERED_HSN_DIGEST,'hex'),Buffer.from(scoreSha256,'hex'),Buffer.from(embeddingSha256,'hex')
  ]));
  if(expectedFullFrameSha256!==null&&(typeof expectedFullFrameSha256!=='string'||!HEX.test(expectedFullFrameSha256)||fullFrameSha256!==expectedFullFrameSha256))throw Error('FULL_FRAME_EXPECTATION_DRIFT');
  const yb={requestId:b.requestId,modelSha256:b.modelSha256,sourceSha256:b.sourceSha256,
   querySha256:b.querySha256,tenant:b.tenant,principal:b.principal,rightsEpoch:b.rightsEpoch,
   sourceEdition:b.sourceEdition,purpose:b.purpose,requiredSetSha256:b.requiredSetSha256};
  const symbolic=inspectIssuedYijing({root,queryBinding:yb,fullScores:raw,maxHits:10});
  if(symbolic.status!=='LOCAL_SYMBOLIC_INSPECTION_ONLY'||!symbolic.fullScoreFrameSha256)throw Error('PEER_YIJING_FRAME_HOLD');
  return Object.freeze({schema:WITNESS_SCHEMA,status:'LOCAL_MATCHED_FRAME_CUSTODY_ONLY',
   originalOntologySha256:ARIADNE_SHA256,orderedHsnSha256:ORDERED_HSN_DIGEST,
   sourceEdition:b.sourceEdition,sourceSha256:b.sourceSha256,modelSha256:b.modelSha256,
   headSha256:b.headSha256,claimedIssuer:b.issuer,rightsEpoch:b.rightsEpoch,
   querySha256:b.querySha256,scopeBindingSha256:domainHash('atlas.neural.scope/v1',canonicalScope(b)),
   scoreSha256,embeddingSha256,fullFrameSha256,legacyJsonFrameDigest:r.frameDigest,
   peerYijingFrameDigest:symbolic.fullScoreFrameSha256,
   method:'ONE_ISSUED_FRAME_BINARY_WITNESS_NO_EXTRA_MODEL',
   glyphCodecs:Object.freeze(['cupwake-x4/v1','symbiosis-x3/v0.3']),
   primaryIdentity:'ORIGINAL_ARIADNE_HSN',symbolicEditionRequired:true,
   scoreCount:1728,embeddingDimensions:384,modelCallsAdded:0,
   signedZeroPreserved:true,selectedHostVerified:false,sourceRightsVerified:false,
   requiredSetIndependentlyComplete:false,sourceBodiesIncluded:false,
   releaseAuthorized:false,trainingEligible:false,authorityEffect:'NONE'});
 }catch(e){return hold(e instanceof Error&&/^[A-Z0-9_]+$/.test(e.message)?e.message:'INVALID_OR_UNTRUSTED_INPUT')}
}
/**
 * Review cannot restore a revoked pointer ID. Reauthorization must allocate
 * a distinct lineage identity and pass the canonical host's fresh rights.
 * Exact repeats of an earlier event retain the underlying journal's idempotence.
 */
export function guardPointerIncarnations(journal){
 if(!journal||typeof journal.append!=='function'||typeof journal.state!=='function'||typeof journal.prepare!=='function')throw Error('POINTER_JOURNAL_MISSING');
 const tombstones=new Set(),events=new Map();
 function append(input){
  const e=readPlain(input);
  for(const k of ['pointerId','eventId','action'])if(typeof e[k]!=='string')throw Error('BAD_EVENT');
  if(Object.values(e).some(v=>v!==null && !['string','number','boolean'].includes(typeof v)))throw Error('UNTRUSTED_EVENT_FIELDS');
  const key=domainHash('atlas.pointer.event/v1',Buffer.from(JSON.stringify(Object.entries(e).sort()),'utf8'));
  if(events.has(e.eventId)){
   if(events.get(e.eventId)!==key)throw Error('EVENT_COLLISION');
   return journal.append(input);
  }
  if(e.action==='UPSERT'&&tombstones.has(e.pointerId))throw Error('WITHDRAWN_POINTER_ID_REUSE');
  const receipt=journal.append(input);
  if(receipt.status==='LOCAL_METADATA_COMMITTED'){
    events.set(e.eventId,key);
    if(e.action==='WITHDRAW')tombstones.add(e.pointerId);
  }
  return receipt;
 }
 return Object.freeze({append,prepare:journal.prepare,state:journal.state,
  tombstoneCount:()=>tombstones.size});
}
