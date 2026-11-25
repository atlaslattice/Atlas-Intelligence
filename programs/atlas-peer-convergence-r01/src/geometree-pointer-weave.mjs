/**
 * Geometree R12 — exact-source peer pointer + Yijing review-only weave.
 * This is one reversible local adapter that composes the existing PR70
 * pointer-companion and the already-issued PR67/R11b sidecar. The supplied
 * source checker is a TEST CALLBACK, NOT host authority or final egress.
 * No retriever, model, source download, real work post or ledger mutation.
 */
import { createHash } from 'node:crypto';
import { types as utilTypes } from 'node:util';
import { ARIADNE_SHA256, EDITION, HSN, decode } from '../../atlas-geometry-one-r38/src/addresses.mjs';
import { inspectIssuedYijing, yijingAddress, yijingDecode, gf7Display, roleOf,
  reviewMethodSubject, YIJING_CODECS, CONTEXT_TOPOLOGIES } from './geometree-yijing-r10.mjs';

export const WEAVE_SCHEMA='atlas.geometree.pointer-yijing-weave/v1';
const HEX=/^[a-f0-9]{64}$/;
const ROOM=/^[A-Za-z0-9_-]{3,80}$/;
const HOLD=reason=>Object.freeze({schema:WEAVE_SCHEMA,status:'HOLD',reason,
  views:Object.freeze([]),sourceIdsReturned:false,sourceBodiesReturned:false,
  peerIdentityAuthenticated:false,requiredSetIndependentlyComplete:false,
  rightsAtTransportVerified:false,releaseAuthorized:false,modelCallsByWeave:0,
  campaignCredit:0,authorityEffect:'NONE'});
const digest=(value)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function ownObject(obj,required){
 if(obj===null||typeof obj!=='object'||Array.isArray(obj)||utilTypes.isProxy(obj)||Object.getPrototypeOf(obj)!==Object.prototype)throw Error('UNTRUSTED_OBJECT');
 const desc=Object.getOwnPropertyDescriptors(obj),names=Reflect.ownKeys(desc);
 if(names.length!==required.length||names.some(k=>typeof k!=='string'||!required.includes(k)))throw Error('FIELDS_CHANGED');
 const out={};for(const k of required){const v=desc[k];if(!v||!v.enumerable||!Object.hasOwn(v,'value'))throw Error('ACCESSOR_INPUT');out[k]=v.value}return out;
}
function ownList(list,max=64){
 if(!Array.isArray(list)||utilTypes.isProxy(list)||list.length>max)throw Error('INVALID_ARRAY');
 const d=Object.getOwnPropertyDescriptors(list);if(Reflect.ownKeys(d).length!==list.length+1)throw Error('SPARSE_ARRAY');
 const out=new Array(list.length);
 for(let i=0;i<out.length;i++){
  const v=d[String(i)];if(!v||!Object.hasOwn(v,'value')||!v.enumerable)throw Error('ACCESSOR_ARRAY');out[i]=v.value;
 }
 return out;
}
function workPointers(refs){
 const rows=ownList(refs,32),seen=new Set();
 if(!rows.length)throw Error('WORK_SOURCE_REQUIRED');
 const result=[];
 for(const raw of rows){
  const x=ownObject(raw,['roomId','seq','bodySha256','status']);
  if(!ROOM.test(x.roomId)||!Number.isSafeInteger(x.seq)||x.seq<1||x.seq>500||!HEX.test(x.bodySha256)||
    !['SOURCE_LINK_UNREVIEWED','REVIEWED_METADATA_ONLY'].includes(x.status))throw Error('WORK_REF_INVALID');
  const key=`${x.roomId}#${x.seq}`;
  if(seen.has(key))throw Error('WORK_REF_DUPLICATED_OR_CONFLICTING');
  seen.add(key);result.push(Object.freeze({...x}));
 }
 return Object.freeze(result);
}
function strictSubjects(raw){
 if(raw===null||typeof raw!=='object'||Array.isArray(raw)||utilTypes.isProxy(raw)||Object.getPrototypeOf(raw)!==Object.prototype)throw Error('BAD_SUBJECTS');
 const ds=Object.getOwnPropertyDescriptors(raw),result={};
 if(Reflect.ownKeys(ds).length>20)throw Error('TOO_MANY_SUBJECTS');
 for(const k of Reflect.ownKeys(ds)){
  if(typeof k!=='string'||!HSN.includes(k)||!Object.hasOwn(ds[k],'value')||!ds[k].enumerable)throw Error('INVALID_SUBJECT_KEY');
  if(typeof ds[k].value!=='string'||!HSN.includes(ds[k].value))throw Error('INVALID_SUBJECT_VALUE');
  result[k]=ds[k].value;
 }
 return Object.freeze(result);
}
function witness(raw){
 const x=ownObject(raw,['generation','catalogDigest','historyDigest','rightsEpochSha256','requiredSetSha256','workSelectionSha256','fullScoreFrameSha256']);
 if(!Number.isSafeInteger(x.generation)||x.generation<1||
   !['catalogDigest','historyDigest','rightsEpochSha256','requiredSetSha256','workSelectionSha256','fullScoreFrameSha256'].every(k=>typeof x[k]==='string'&&HEX.test(x[k])))throw Error('WITNESS_INVALID');
 return Object.freeze({...x});
}
function verifyWitness(pointer,w,work,query){
 const state=pointer.state();
 if(state.generation!==w.generation||state.catalogDigest!==w.catalogDigest||state.historyDigest!==w.historyDigest||
   state.sourceBodiesIncluded!==false)throw Error('POINTER_JOURNAL_DRIFT');
 if(query.requiredSetSha256!==w.requiredSetSha256)throw Error('REQUIRED_SET_DRIFT');
 if(workSelectionDigest(work)!==w.workSelectionSha256)throw Error('WORK_SELECTION_DRIFT');
 return state;
}
/** Canonical exact room+sequence+body digest, no peer identity or review authority. */
export function workSelectionDigest(refs){return digest(['atlas.work-pointers/v1',workPointers(refs)]);}
/**
 * Prepare source-scoped local symbolic metadata. This is not a durable claim
 * or server action: caller must supply the exact current PR70 companion.
 * A second inspection and journal verification occur AFTER the mock RETURN.
 */
export function preparePointerYijing({root,queryBinding,fullScores,peerReview,companion,
                                     authorize,workRefs,subjects={},sourceWitness,
                                     codec=YIJING_CODECS.CUPWAKE_X4,
                                     topology=CONTEXT_TOPOLOGIES.BOUNDED}={}){
 try{
  if(!companion||typeof companion.state!=='function'||typeof companion.prepare!=='function'||typeof authorize!=='function')throw Error('PEER_SOURCE_NOT_BOUND');
  if(!Object.values(YIJING_CODECS).includes(codec)||!Object.values(CONTEXT_TOPOLOGIES).includes(topology))throw Error('GLYPH_EDITION_OR_TOPOLOGY');
  const refs=workPointers(workRefs),subjectsNow=strictSubjects(subjects),w=witness(sourceWitness);
  if(!Array.isArray(fullScores)||fullScores.length!==1728)throw Error('COMPLETE_FRAME_REQUIRED');
  const sidecar=inspectIssuedYijing({root,queryBinding,fullScores,maxHits:20});
  if(sidecar.status!=='LOCAL_SYMBOLIC_INSPECTION_ONLY'||!HEX.test(sidecar.fullScoreFrameSha256)||sidecar.ontologySha256!==ARIADNE_SHA256||
    sidecar.ontologyEdition!==EDITION||sidecar.canRelease!==false)throw Error('FRAME_SOURCE_NOT_REVIEWED');
  if(w.fullScoreFrameSha256!==sidecar.fullScoreFrameSha256)throw Error('FULL_WIRE_SCORE_WITNESS_MISMATCH');
  const q=ownObject(queryBinding,['requestId','modelSha256','sourceSha256','querySha256','tenant','principal','rightsEpoch','sourceEdition','purpose','requiredSetSha256']);
  const r=ownObject(peerReview,['status','frameDigest','sourceSha256','modelSha256','originalCandidateHsn']);
  if(r.status!=='LOCAL_PEER_CONVERGENCE_REVIEW_ONLY'||r.frameDigest!==root.frameDigest||r.sourceSha256!==q.sourceSha256||
    r.modelSha256!==q.modelSha256||!Array.isArray(r.originalCandidateHsn)||r.originalCandidateHsn.length<1||r.originalCandidateHsn.length>20)throw Error('PEER_REVIEW_DRIFT');
  if(JSON.stringify(r.originalCandidateHsn)!==JSON.stringify(sidecar.annotated.slice(0,r.originalCandidateHsn.length).map(x=>x.hsn)))throw Error('PEER_RANK_DRIFT');
  const s=verifyWitness(companion,w,refs,q);
  if(s.rows.some(x=>x.rightsEpochSha256!==w.rightsEpochSha256))throw Error('JOURNAL_RIGHTS_EPOCH_DRIFT');
  // Validate complete pointer source and source editions. No cross-namespace inference.
  const review=Object.freeze({...r,originalCandidateHsn:Object.freeze(r.originalCandidateHsn.slice())});
  const prepared=companion.prepare({root,review,authorize,limit:12});
  if(prepared.status!=='PREPARED_NOT_RELEASED')throw Error('POINTER_PREPARE_HOLD');
  let used=false;
  const preFrame=sidecar.fullScoreFrameSha256,preScope=sidecar.bindingScopeSha256;
  const refsAtPrepare=workSelectionDigest(workRefs);
  async function release({purpose='INFERENCE_USE'}={}){
   if(used)return HOLD('REPLAY_OF_PREPARED');used=true;
   try{
    if(purpose!=='INFERENCE_USE')throw Error('PURPOSE_NOT_WORK_INSPECTION');
    verifyWitness(companion,w,workPointers(workRefs),q);
    const returned=await prepared.release({purpose});
    if(returned.status!=='LOCAL_POINTERS_ONLY'||returned.releaseAuthorized!==false||returned.hostRightsVerified!==false||
       !Array.isArray(returned.results)||!returned.results.length)throw Error('PEER_RETURN_HOLD');
    verifyWitness(companion,w,workPointers(workRefs),q);
    if(workSelectionDigest(workRefs)!==refsAtPrepare)throw Error('WORK_CHANGED_AFTER_PREPARE');
    const post=inspectIssuedYijing({root,queryBinding,fullScores,maxHits:20});
    if(post.status!=='LOCAL_SYMBOLIC_INSPECTION_ONLY'||post.fullScoreFrameSha256!==preFrame||post.bindingScopeSha256!==preScope||post.fullScoreFrameSha256!==w.fullScoreFrameSha256)throw Error('FRAME_CHANGED_AFTER_PREPARE');
    const rowIds=new Set(sidecar.annotated.map(x=>x.hsn)),ret=[];
    for(const entry of returned.results){
     const x=ownObject(entry,['pointerId','sourceId','familyId','sourceEdition','sourceSha256','rightsEpochSha256','hsn','locatorKind','locatorRef','sourceBodyIncluded']);
     if(x.sourceBodyIncluded!==false||!rowIds.has(x.hsn)||x.sourceSha256!==q.sourceSha256||
       x.sourceEdition!==q.sourceEdition||x.rightsEpochSha256!==w.rightsEpochSha256)throw Error('RETURN_SOURCE_OR_EDITION_DRIFT');
     if(roleOf(x.hsn)==='EPISTEMIC_META'&&reviewMethodSubject(x.hsn,subjectsNow[x.hsn]).status!=='STRUCTURAL_SUBJECT_ONLY')throw Error('METHOD_SUBJECT_UNRESOLVED');
     const glyph=yijingAddress(x.hsn,{codec,topology});
     if(yijingDecode(glyph)!==x.hsn)throw Error('GLYPH_REVERSE_DRIFT');
     // No raw source ID, locator or unreviewed link becomes a semantic edge.
     ret.push(Object.freeze({hsn:x.hsn,role:roleOf(x.hsn),pointerFingerprint:digest([x.pointerId,x.sourceSha256,x.sourceEdition,x.rightsEpochSha256,x.hsn]),
       yijing:Object.freeze({namespace:glyph.namespace,code:glyph.code,codec:glyph.codec,contextTopology:glyph.contextTopology,symbolFingerprint:glyph.symbolFingerprint}),
       gf7Address:gf7Display(x.hsn).address,gf7Meaning:'ANALYTIC_UNMEASURED_DISPLAY_ONLY',
       semanticAccepted:false,trainingEligible:false}));
    }
    verifyWitness(companion,w,workPointers(workRefs),q);
    const fingerprint=digest(['atlas.geometree.pointer-weave/v1',preFrame,preScope,w.generation,w.historyDigest,w.catalogDigest,refsAtPrepare,
      codec,topology,ret.map(x=>x.pointerFingerprint)]);
    return Object.freeze({schema:WEAVE_SCHEMA,status:'LOCAL_SOURCE_POINTER_YIJING_REVIEW_ONLY',views:Object.freeze(ret),
      fullScoreFrameSha256:preFrame,sourceObservationSha256:fingerprint,
      sourceJournalGeneration:w.generation,sourceJournalDigest:w.catalogDigest,workRefCount:refs.length,
      declaredOriginCount:returned.distinctDeclaredOrigins,independentSourceFamiliesVerified:false,
      sourceIdsReturned:false,sourceBodiesReturned:false,requiredSetIndependentlyComplete:false,
      peerIdentityAuthenticated:false,rightsAtTransportVerified:false,releaseAuthorized:false,
      modelCallsByWeave:0,campaignCredit:0,authorityEffect:'NONE'});
   }catch{return HOLD('STALE_OR_UNAUTHORIZED_SOURCE_REVIEW');}
  }
  return Object.freeze({status:'PREPARED_REVIEW_ONLY',schema:WEAVE_SCHEMA,release});
 }catch{return Object.freeze({status:'HOLD',schema:WEAVE_SCHEMA,release:async()=>HOLD('INVALID_OR_UNTRUSTED_PREPARATION')});}
}
