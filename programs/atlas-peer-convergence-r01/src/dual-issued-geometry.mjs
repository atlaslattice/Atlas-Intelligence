/**
 * Atlas R35: literal R34 issued-page adapter -> TWO ORIGINAL peer schema shapes.
 * Consumes one precomputed Float32/64 frame. No encoder, head, retriever, IAM,
 * broker, hosted gateway, training, publication, or policy effect.
 *
 * PR66: atlas.neural.issued/v1, method neural, no requestId in issued page.
 * PR67: atlas.geometry-one.issued/v1, method NEURAL_ONLY, has requestId.
 * Never silently equate these schemas or sourceEdition with ontologyEdition.
 */
import {createHash} from 'node:crypto';
import {types as utilTypes} from 'node:util';
import {makeIssuedPageFromExistingFrame} from './issued-page-r34.mjs';
import {ARIADNE_SHA256,EDITION,decode} from '../../atlas-geometry-one-r38/src/addresses.mjs';

export const SCHEMA = 'atlas.indra.dual-issued-frame.review/v1';
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:/@-]{0,127}$/;
const HEX = /^[0-9a-f]{64}$/;
const KEYS=['issuer','modelSha256','querySha256','sourceId','sourceSha256',
 'sourceEdition','registrySha256','scores','requestId','tenant','logicalTarget',
 'contractVersion','scope','purpose'];
const hold=reason=>Object.freeze({schema:SCHEMA,status:'HOLD',reason,
   releaseAuthorized:false,sourceRightsAttested:false,modelCallsAdded:0,authorityEffect:'NONE'});
function plain(x,keys){
 if(!x||typeof x!=='object'||utilTypes.isProxy(x)||Array.isArray(x)||Object.getPrototypeOf(x)!==Object.prototype)throw Error('UNTRUSTED_ROOT');
 const ds=Object.getOwnPropertyDescriptors(x),actual=Reflect.ownKeys(ds);
 if(actual.length!==keys.length||actual.some(k=>typeof k!=='string'||!keys.includes(k)))throw Error('UNEXPECTED_FIELDS');
 const obj=Object.create(null);
 for(const key of keys){const d=ds[key];if(!d||!d.enumerable||!Object.hasOwn(d,'value'))throw Error('ACCESSOR_INPUT');obj[key]=d.value;}
 return obj;
}
const hash=(x)=>createHash('sha256').update(x).digest('hex');
export function makeDualIssuedGeometry(untrusted, options={}){
 try{
  // In particular, destructuring {expectedBinding} outside this try block
  // would call a getter before the HOLD boundary.
  if(!options||typeof options!=='object'||Array.isArray(options)||
     utilTypes.isProxy(options)||Object.getPrototypeOf(options)!==Object.prototype)
    throw Error('INVALID_OPTIONS');
  const optionDescriptors=Object.getOwnPropertyDescriptors(options);
  const optionKeys=Reflect.ownKeys(optionDescriptors);
  if(optionKeys.length>1||optionKeys.some(k=>k!=='expectedBinding'||
      !Object.hasOwn(optionDescriptors[k],'value')||!optionDescriptors[k].enumerable))
    throw Error('INVALID_OPTIONS');
  const expectedBinding=optionKeys.length?optionDescriptors.expectedBinding.value:null;
  const x=plain(untrusted,KEYS);
  if(![x.issuer,x.sourceId,x.sourceEdition,x.requestId,x.tenant,
         x.logicalTarget,x.contractVersion].every(v=>typeof v==='string'&&ID.test(v))||
      ![x.modelSha256,x.querySha256,x.sourceSha256,x.registrySha256].every(v=>typeof v==='string'&&HEX.test(v))||
      x.registrySha256!==ARIADNE_SHA256||x.scope!=='WORK'||!['INFERENCE','CITATION'].includes(x.purpose))throw Error('SOURCE_OR_SCOPE_HOLD');
  // R34's imported PR77 native capture is the only score ingress.
  // Never read caller-defined .length, .buffer or Symbol.iterator here.
  const r34=makeIssuedPageFromExistingFrame({
   issuer:x.issuer,modelSha256:x.modelSha256,querySha256:x.querySha256,
   sourceId:x.sourceId,sourceSha256:x.sourceSha256,sourceEdition:x.sourceEdition,
   registrySha256:x.registrySha256,scores:x.scores
  });
  if(r34.status!=='SOURCE_ONLY_ISSUED_PAGE_PREPARED')throw Error('SCORE_SNAPSHOT_HOLD');
  // The original R34 page remains exactly PR66-shaped and *source only*.
  const pr66=r34.page;
  const pr67=Object.freeze({schema:'atlas.geometry-one.issued/v1',
   requestId:x.requestId,querySha256:x.querySha256,sourceId:x.sourceId,
   sourceSha256:x.sourceSha256,sourceEdition:x.sourceEdition,modelSha256:x.modelSha256,
   registrySha256:x.registrySha256,method:'NEURAL_ONLY',fallbackUsed:false,
   issuer:x.issuer,scores:pr66.scores});
  // The extended identity adds tenant/target/request/purpose that PR66 alone
  // does not include in its historical localScoreBinding.
  const scopedBinding=hash('ATLAS-INDRA-DUAL-ISSUED/v1\0'+JSON.stringify([
    x.tenant,x.logicalTarget,x.contractVersion,x.requestId,x.purpose,
    x.registrySha256,x.sourceEdition,x.sourceSha256,x.modelSha256,x.querySha256,
    x.issuer,r34.scoreFormat,r34.localScoreBinding]));
  if(expectedBinding!==null && (typeof expectedBinding!=='string'||expectedBinding!==scopedBinding))throw Error('EXPECTED_FRAME_BINDING_MISMATCH');
  return Object.freeze({schema:SCHEMA,status:'PREPARED_NOT_HOSTED',
    geometry:Object.freeze([12,12,12]),ontologyEdition:EDITION,
    ontologySha256:ARIADNE_SHA256,evidenceSourceEdition:x.sourceEdition,
    exactScoreCount:1728,scoreFormat:r34.scoreFormat,
    binaryScoreDigest:r34.localScoreBinding,scopedFrameDigest:scopedBinding,
    expectedBindingMatched:expectedBinding!==null,
    expectedBindingIndependentlyAttested:false,
    issuerAuthenticated:false,sourceRightsAttested:false,finalEgressVerified:false,
    pr66,pr67,oneSharedScoreSnapshot:pr66.scores===pr67.scores,
    modelCallsAdded:0,releaseAuthorized:false,trainingEligible:false,
    authorityEffect:'NONE'});
 }catch(e){return hold(e instanceof Error&&/^[A-Z0-9_]+$/.test(e.message)?e.message:'INVALID_INPUT');}
}

/** The original v0.7 ontology divides by SPHERE S, not node ordinal N.
 * This is structural scoping, never proof of scientific subject equivalence.
 */
export function checkMethodSubject(methodHsn,subjectHsn){
 try{
  const method=decode(methodHsn);
  if(method.s<=7)return Object.freeze({status:'DOMAIN_POSITION',subjectRequired:false,semanticAccepted:false});
  const subject=decode(subjectHsn);
  if(subject.s>=8 || subject.h!==method.h)return Object.freeze({status:'HOLD_SUBJECT_MISMATCH',semanticAccepted:false});
  return Object.freeze({status:'STRUCTURALLY_SCOPED_FOR_REVIEW',semanticAccepted:false,
    ontologySha256:ARIADNE_SHA256,subjectHsn,methodHsn});
 }catch{return Object.freeze({status:'HOLD_INVALID_HSN',semanticAccepted:false});}
}
