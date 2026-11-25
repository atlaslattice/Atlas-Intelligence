/**
 * Atlas / MICA pretrained-entry.v0.1 — additive source-only candidate projection.
 *
 * Does NOT fetch or serialize protected text. It is NOT a replacement for
 * createPretrainedEntry or its hostOwnedFinalReturnSync. The host must recheck
 * source/rights/epoch INSIDE its atomic final-return transaction.
 * Unknown source ancestry remains UNKNOWN; no automatic positive training label.
 */
import { createHash } from 'node:crypto';

export const ARIADNE_SHA = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
export const SYNTHETIC_RELEASE_SHA = createHash('sha256').update('SYNTHETIC_TEST_PRETRAINED_RELEASE').digest('hex');
export const SYNTHETIC_ENCODER_REVISION = 'SYNTHETIC_ENCODER_NOT_BGE';
const HEX=/^[a-f0-9]{64}$/;
const HSN=/^H(?:0[1-9]|1[0-2])\.S(?:0[1-9]|1[0-2])\.N(?:0[1-9]|1[0-2])$/;
const LANE=new Set(['Work','Canon','Research']);
const HASH= x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const bad=reason=>Object.freeze({schema:'atlas.mica.candidate-sidecar/v0.1',status:'HOLD',reason,refs:[],hostAttested:false,hostPermissionGranted:false,trainingPerformed:false,modelWeightUpdate:false});
const object=x=>{try{return x!==null && typeof x==='object' && !Array.isArray(x) && Object.getPrototypeOf(x)===Object.prototype;}catch{return false}};
// A getter can change an identity *after* validation. Accept data-only records.
const plainData=x=>{try{return object(x)&&Object.values(Object.getOwnPropertyDescriptors(x)).every(d=>Object.hasOwn(d,'value')&&!Object.hasOwn(d,'get')&&!Object.hasOwn(d,'set'));}catch{return false}};
const dataArray=x=>{try{return Array.isArray(x)&&Object.values(Object.getOwnPropertyDescriptors(x)).every(d=>Object.hasOwn(d,'value')&&!Object.hasOwn(d,'get')&&!Object.hasOwn(d,'set'));}catch{return false}};

/**
 * Stages only vetted identifiers and source spans from existing neural results.
 * `getAuthoritativeSource` must be a trusted local source reader supplied by the
 * existing host; this function cannot prove it is trusted.
 */
export function stageMicaEvidence({candidateResults,releaseSha256,expectedReleaseSha256,encoderRevision,expectedEncoderRevision,expectedHsn,getAuthoritativeSource}={}){
  if(!HEX.test(String(expectedReleaseSha256))||releaseSha256!==expectedReleaseSha256||!expectedEncoderRevision||encoderRevision!==expectedEncoderRevision)return bad('RELEASE_OR_ENCODER_DRIFT');
  if(!HSN.test(expectedHsn)||typeof getAuthoritativeSource!=='function')return bad('UNBOUND_SOURCE_OR_HSN');
  if(!Array.isArray(candidateResults)||candidateResults.length>256)return bad('UNBOUNDED_CANDIDATES');
  const out=[],holds={},seen=new Set();
  for(const c of candidateResults){
    let reason='INVALID_CANDIDATE';let a;
    if(plainData(c)&&Object.keys(c).every(k=>!['body','text','privateBody','hostApproved','hostAuthenticated','authorized','canonApproved','weights'].includes(k))
       && typeof c.documentId==='string'&&c.documentId.length>0&&typeof c.sourceId==='string'&&c.sourceId.length>0
       && LANE.has(c.lane)&&Number.isFinite(c.score)&&c.score>=0&&c.score<=1
       && HEX.test(c.sourceSha256)&&plainData(c.ontology)&&c.ontology.id===expectedHsn
       && c.ontology.sourceRegistrySha256===ARIADNE_SHA){
      try{a=getAuthoritativeSource(c.sourceId);}catch{a=undefined}
      if(!plainData(a))reason='UNKNOWN_OR_UNSAFE_SOURCE';
      else if(a.documentId!==c.documentId||a.sourceId!==c.sourceId||a.sourceSha256!==c.sourceSha256||a.ontologyId!==expectedHsn)reason='SOURCE_IDENTITY_DRIFT';
      else if(a.mode!=='WORK'||a.revoked===true||a.active!==true)reason='NOT_ELIGIBLE_WORK_SOURCE';
      else if(a.familyRoot!==null && a.familyRoot!==undefined && (typeof a.familyRoot!=='string'||a.familyRoot.length===0))reason='FAMILY_INVALID';
      else if(c.lane==='Canon' && (!plainData(c.sourceProvenance)||typeof c.sourceProvenance.sourceSpan!=='string'||c.sourceProvenance.sourceSpan!==a.sourceSpan))reason='CANON_SPAN_NOT_BOUND';
      else reason=undefined;
    }
    if(reason){holds[reason]=(holds[reason]||0)+1;continue}
    if(seen.has(c.sourceId)) {holds.DUPLICATE_SOURCE=(holds.DUPLICATE_SOURCE||0)+1;continue}
    seen.add(c.sourceId);
    out.push(Object.freeze({documentId:c.documentId,sourceId:c.sourceId,lane:c.lane,score:c.score,
      sourceSha256:c.sourceSha256,ontology:Object.freeze({id:expectedHsn,edition:'v0.7',digest:ARIADNE_SHA}),
      familyRoot:a.familyRoot??'UNKNOWN',sourceRevision:String(a.revision??'UNKNOWN'),
      glyphAliases:Object.freeze(dataArray(c.glyphAliases)?c.glyphAliases.filter(x=>typeof x==='string'&&x.length<=140).slice(0,8):[]),
      sourceSpan:c.lane==='Canon'?a.sourceSpan:null,reviewStatus:'UNREVIEWED'}));
  }
  return Object.freeze({schema:'atlas.mica.candidate-sidecar/v0.1',status:'PREPARED_NEURAL_CANDIDATES_NOT_RETURNED',
    expectedHsn,releaseSha256,encoderRevision,refs:Object.freeze(out),holds:Object.freeze(holds),
    directNeuralCandidateCount:out.length,sourceFamilies:new Set(out.filter(x=>x.familyRoot!=='UNKNOWN').map(x=>x.familyRoot)).size,
    hostAttested:false,hostPermissionGranted:false,trainingPerformed:false,modelWeightUpdate:false,
    inputFingerprint:HASH(out.map(x=>[x.documentId,x.sourceId,x.sourceSha256,x.sourceRevision,x.familyRoot]))});
}

export function prepareTrainingLabel(ref, trusted) {
  if(!object(ref)||!object(trusted)||ref.reviewStatus!=='HUMAN_ACCEPTED' ||trusted.workReuseGranted!==true
     ||trusted.mode!=='WORK'||trusted.active!==true||trusted.familyRoot==='UNKNOWN'||!trusted.familyRoot
     ||trusted.sourceId!==ref.sourceId||trusted.sourceSha256!==ref.sourceSha256)return bad('TRAINING_RIGHTS_OR_PROOF_MISSING');
  if(ref.split!=='TRAIN'&&ref.split!=='VALIDATION')return bad('TEST_LEAK_OR_UNKNOWN_SPLIT');
  return Object.freeze({status:'SOURCE_REF_TRAINING_CANDIDATE_ONLY',sourceId:trusted.sourceId,familyRoot:trusted.familyRoot,split:ref.split,trainingPerformed:false});
}
