/**
 * Atlas Ω6 — ADDITIVE source-only bridge for the REAL PR73 dual-issued adapter
 * and the REAL PR72 Omega5 peer-reconciliation output. One numeric frame only.
 *
 * This is not an authorization service, issuer, scheduler, retriever, neural
 * network, source-body export, hosted connector, or final byte-transport fence.
 * The sourcePort is INJECTED and untrusted by this portable library. Mocked
 * allow results are merely local test facts, never proof of host permission.
 */
import {createHash} from 'node:crypto';
import {types as utilTypes} from 'node:util';
import {makeDualIssuedGeometry} from './dual-issued-geometry.mjs';
import {composeOmega5} from './omega5-unified-review.mjs';
import {ARIADNE_SHA256, HSN} from '../../atlas-geometry-one-r38/src/addresses.mjs';

export const OMEGA6_SCHEMA = 'atlas.omega6.one-issued-peer-union/v1';
const HEX = /^[a-f0-9]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_.:/@-]{0,127}$/;
const FIELDS = Object.freeze(['allow','generation','catalogSha256','historySha256',
 'rightsEpoch','requiredSetSha256','sourceSha256','sourceEdition','issuer',
 'principal','modelSha256','headSha256']);
const HOLD = reason => Object.freeze({schema:OMEGA6_SCHEMA,status:'HOLD',reason,
  sourceBodiesIncluded:false,outputBytesReleased:false,rightsAuthenticated:false,
  closureIndependentlyComplete:false,transportAtomic:false,hostEgressAttested:false,
  modelCallsAdded:0,canTrain:false,canDeploy:false,canDisclose:false,
  canonChanged:false,authorityEffect:'NONE'});
const sha256=b=>createHash('sha256').update(b).digest('hex');
function own(x, fields=null) {
  if(!x||typeof x!=='object'||Array.isArray(x)||utilTypes.isProxy(x)
     ||(Object.getPrototypeOf(x)!==Object.prototype&&Object.getPrototypeOf(x)!==null))throw Error('UNTRUSTED_RECORD');
  const ds=Object.getOwnPropertyDescriptors(x),keys=Reflect.ownKeys(ds);
  if(fields&&(keys.length!==fields.length||keys.some(k=>typeof k!=='string'||!fields.includes(k))))throw Error('UNEXPECTED_FIELDS');
  const y=Object.create(null);
  for(const k of keys){const d=ds[k];if(typeof k!=='string'||!d.enumerable||!Object.hasOwn(d,'value')||['__proto__','prototype','constructor'].includes(k))throw Error('ACCESSOR_OR_UNSAFE_KEY');y[k]=d.value;}
  return y;
}
function dense(src,size){
  if(!Array.isArray(src)||utilTypes.isProxy(src)||src.length!==size)throw Error('COMPLETE_SCORE_FRAME_REQUIRED');
  const ds=Object.getOwnPropertyDescriptors(src),keys=Reflect.ownKeys(ds);
  if(keys.length!==size+1||keys.some(k=>k!=='length'&&(!/^(0|[1-9][0-9]*)$/.test(k)||Number(k)>=size)))throw Error('SCORE_SIDE_KEYS_OR_HOLES');
  const out=new Array(size);
  for(let i=0;i<size;i++){
    const d=ds[String(i)];if(!d||!d.enumerable||!Object.hasOwn(d,'value')||typeof d.value!=='number'||!Number.isFinite(d.value))throw Error('NONFINITE_OR_GETTER_SCORE');
    out[i]=d.value;
  }
  return out;
}
function stamp(x){
  const s=own(x,FIELDS);
  if(s.allow!==true||!Number.isSafeInteger(s.generation)||s.generation<1
    ||!['catalogSha256','historySha256','requiredSetSha256','sourceSha256','modelSha256','headSha256'].every(k=>typeof s[k]==='string'&&HEX.test(s[k]))
    ||!['rightsEpoch','sourceEdition','issuer','principal'].every(k=>typeof s[k]==='string'&&SAFE_ID.test(s[k])))throw Error('SOURCE_PORT_DENIED_OR_INVALID');
  return Object.freeze(s);
}
function sameStamp(a,b){return FIELDS.every(k=>a[k]===b[k]);}
function leDigest(numbers){
  const buf=Buffer.allocUnsafe(numbers.length*8);
  for(let i=0;i<numbers.length;i++)buf.writeDoubleLE(numbers[i],i*8);
  return sha256(Buffer.concat([Buffer.from('atlas.f64le.ordered-scores/v1\0'),buf]));
}
function scopedDigest(values){return sha256(Buffer.concat([Buffer.from('ATLAS-OMEGA6-PEER-UNION/v1\0'),Buffer.from(JSON.stringify(values),'utf8')]));}
/**
 * sourcePort(phase, scoped metadata) is an explicitly injected callback. The
 * consumer must NOT use local positive callbacks as independent host evidence.
 * The returned artifact is always non-disclosive metadata, even on PASS.
 */
export async function inspectOmega6({issuedFrame, omega5Input, sourcePort, selectedHeadSha256}={}){
  try{
    if(typeof sourcePort!=='function')throw Error('HOST_SOURCE_PORT_UNBOUND');
    if(typeof selectedHeadSha256!=='string'||!HEX.test(selectedHeadSha256))throw Error('HEAD_PIN_REQUIRED');
    const qroot=own(omega5Input,['root','convergence','peerRecords','queryBinding','fullScores','pins','maxHits']);
    const q=own(qroot.queryBinding),p=own(qroot.pins),root=own(qroot.root);
    const topology=dense(root.topology,3),sourcePins=own(root.sourcePins),lineage=own(root.lineage);
    if(topology.join(',')!=='12,12,12'||sourcePins.registrySha256!==ARIADNE_SHA256)throw Error('CANONICAL_HSN_OR_SOURCE_MISMATCH');
    if(root.rightsEpoch!==q.rightsEpoch||root.tenant!==q.tenant||q.rightsEpoch!==p.rightsEpoch||q.sourceEdition!==lineage.sourceEdition)throw Error('SOURCE_EDITION_OR_EPOCH_DRIFT');
    const binding={tenant:q.tenant,principal:q.principal,requestId:q.requestId,modelSha256:q.modelSha256,sourceSha256:q.sourceSha256,sourceEdition:q.sourceEdition,rightsEpoch:q.rightsEpoch,ontologySha256:ARIADNE_SHA256};
    const before=stamp(await sourcePort('READ',Object.freeze({...binding})));
    if(before.rightsEpoch!==q.rightsEpoch||before.sourceEdition!==q.sourceEdition||before.modelSha256!==q.modelSha256||before.sourceSha256!==q.sourceSha256||before.principal!==q.principal||before.requiredSetSha256!==q.requiredSetSha256||before.headSha256!==selectedHeadSha256)throw Error('READ_SOURCE_OR_CLOSURE_DRIFT');
    // PR73 really snapshots the caller's Float32/64 scores and returns both
    // PREPARED peer-native formats; no extra encoder/head is executed.
    const dual=makeDualIssuedGeometry(issuedFrame);
    if(dual.status!=='PREPARED_NOT_HOSTED'||dual.oneSharedScoreSnapshot!==true||dual.modelCallsAdded!==0||dual.releaseAuthorized!==false||dual.issuerAuthenticated!==false||dual.exactScoreCount!==1728
      ||dual.pr66.schema!=='atlas.neural.issued/v1'||dual.pr67.schema!=='atlas.geometry-one.issued/v1'||dual.pr66.scores!==dual.pr67.scores)throw Error('DUAL_ISSUED_NOT_PREPARED');
    if(dual.ontologySha256!==ARIADNE_SHA256||dual.evidenceSourceEdition!==q.sourceEdition||dual.pr67.sourceSha256!==q.sourceSha256||dual.pr67.modelSha256!==q.modelSha256||dual.pr67.querySha256!==q.querySha256||dual.pr67.requestId!==q.requestId
      ||dual.pr67.issuer!==before.issuer||dual.pr67.issuer!==lineage.issuerClaim||lineage.sourceId!==dual.pr67.sourceId||issuedFrame.tenant!==q.tenant)throw Error('DUAL_ISSUED_SCOPE_MISMATCH');
    // The R35 big-endian domain digest and the Omega5 little-endian witness
    // are NOT interchangeable. Compare actual snapshot numbers including -0.
    const claimed=dense(qroot.fullScores,1728),snap=dense(dual.pr67.scores,1728);
    for(let i=0;i<1728;i++)if(!Object.is(claimed[i],snap[i]))throw Error('DUAL_PEER_NUMERIC_MISMATCH');
    if(leDigest(snap)!==p.fullScoreFrameSha256)throw Error('F64LE_WITNESS_MISMATCH');
    const prior=composeOmega5(qroot);
    if(!['LOCAL_RECONCILIATION_NOT_HOSTED','LOCAL_REVIEW_WITH_UNRESOLVED_OBJECTIONS'].includes(prior.status)||prior.releaseAuthorized!==false||prior.hostRightsVerified!==false||prior.ontologySha256!==ARIADNE_SHA256||prior.fullScoreFrameSha256!==p.fullScoreFrameSha256)throw Error('OMEGA5_RECONCILIATION_HOLD');
    if(prior.openObjections!==0)throw Error('OPEN_PEER_OBJECTION');
    const check=stamp(await sourcePort('INFERENCE_USE',Object.freeze({...binding})));
    if(!sameStamp(before,check))throw Error('SOURCE_CHANGED_DURING_INFERENCE');
    if(issuedFrame.purpose==='CITATION'){
      const disclosure=stamp(await sourcePort('DISCLOSURE_RETURN',Object.freeze({...binding})));
      if(!sameStamp(before,disclosure))throw Error('CITATION_USE_DENIED_OR_STALE');
    }else if(issuedFrame.purpose!=='INFERENCE')throw Error('UNSUPPORTED_USE_PURPOSE');
    const after=stamp(await sourcePort('RETURN',Object.freeze({...binding})));
    if(!sameStamp(before,after))throw Error('POINTER_OR_SOURCE_REVISION_CHANGED');
    // No pointer IDs, source bodies, query text, embedding, or score arrays
    // leave the inspection interface. This is not an egress transaction.
    const joined=scopedDigest([dual.scopedFrameDigest,dual.binaryScoreDigest,
      prior.frameDigest,prior.fullScoreFrameSha256,prior.bindingScopeSha256,
      before.catalogSha256,before.historySha256,before.generation,
      before.rightsEpoch,before.requiredSetSha256,selectedHeadSha256,
      q.principal,dual.pr67.issuer,issuedFrame.purpose]);
    return Object.freeze({schema:OMEGA6_SCHEMA,status:'LOCAL_PEER_UNION_PREPARED_NOT_RELEASED',
      ontologySha256:ARIADNE_SHA256,canonicalAddresses:1728,spheres:144,houses:12,
      domainPositions:1008,methodPositions:720,sourceSnapshotGeneration:before.generation,
      sourceCatalogSha256:before.catalogSha256,sourceHistorySha256:before.historySha256,
      fullFrameF64LeSha256:prior.fullScoreFrameSha256,dualIssuedBinaryScoreDigest:dual.binaryScoreDigest,
      dualIssuedFormat:dual.scoreFormat,dualScopedFrameDigest:dual.scopedFrameDigest,
      inheritedOmega5ScopeSha256:prior.bindingScopeSha256,joinedFrameScopeSha256:joined,
      sourceRevisionRecheckedLocally:true,peerSourceFunctionsActuallyExecuted:true,
      originalModelCallsAdded:0,sourceBodiesIncluded:false,outputBytesReleased:false,
      rightsAuthenticated:false,closureIndependentlyComplete:false,
      transportAtomic:false,hostEgressAttested:false,canTrain:false,canDeploy:false,
      canDisclose:false,canonChanged:false,authorityEffect:'NONE'});
  }catch(e){const reason=e instanceof Error&&/^[A-Z0-9_]+$/.test(e.message)?e.message:'UNTRUSTED_OR_UNSUPPORTED';return HOLD(reason);}
}

/** 144 source locations for human/peer review, NOT 144 completed tasks. */
export function reviewScopes144(){return Object.freeze(Array.from({length:144},(_,i)=>Object.freeze({
  sphere:`H${String(Math.floor(i/12)+1).padStart(2,'0')}.S${String(i%12+1).padStart(2,'0')}`,
  status:'PREPARED_NOT_EXECUTED',sourceAuthority:'UNVERIFIED',semanticAccepted:false})));
}
