/**
 * Atlas/MICA data-only neural evidence integration seam v0.2.
 * Does NOT fetch a source, authorize an account, train a model, execute a neural
 * model, issue a release, or perform network egress. All host hooks are MOCKS
 * in local tests; only a trusted host can implement and bind those hooks.
 *
 * Distinguishes source INFERENCE_USE from DISCLOSURE_RETURN. Every source known
 * to influence a result must pass INFERENCE_USE, including off-result sources.
 * Returned material separately needs current DISCLOSURE_RETURN. An unknown
 * dependency inventory/purpose cannot be interpreted as permission.
 */
import {createHash, timingSafeEqual} from 'node:crypto';
import {reviewPostrank} from './postrank-lineage-fixture.mjs';

export const INTEGRATION_SCHEMA = 'atlas.mica.neural-source-gated-review/v2';
export const INTEGRATION_HOLD = Object.freeze({
  schema:INTEGRATION_SCHEMA, status:'HOLD_HOST_BOUNDARY_UNVERIFIED',
  canPublish:false, canTrain:false, hostVerified:false, passagesReturned:0,
  modelModified:false, weightsModified:false, authorityEffect:'NONE',
});
const HEX64=/^[a-f0-9]{64}$/;
const REV=/^[a-f0-9]{40,64}$/;
const SOURCE=/^[A-Za-z0-9._:-]{1,120}$/;
const ENVELOPE=new Set(['releaseSha256','encoderRevision','indexGeneration','ontologyEdition']);
const DEP_FIELDS=new Set(['sourceId','sourceRevision','sourceSha256','rightsEpoch']);
const USE_FIELDS=new Set(['sourceId','sourceRevision','rightsEpoch','purpose','allowed']);
const RETURN_FIELDS=new Set(['sourceId','recordRevision','rightsEpoch','purpose','allowed']);
const USE_BATCH_SIZE=256;
const hash=s=>createHash('sha256').update(s).digest('hex');
function plainOwn(x,fields){
  if(!x||typeof x!=='object'||Array.isArray(x))return false;
  if(Object.getPrototypeOf(x)!==Object.prototype&&Object.getPrototypeOf(x)!==null)return false;
  const keys=Reflect.ownKeys(x);
  if(keys.length!==fields.size||keys.some(k=>typeof k!=='string'||!fields.has(k)))return false;
  return keys.every(k=>{const d=Object.getOwnPropertyDescriptor(x,k);return d&&Object.hasOwn(d,'value')&&d.enumerable;});
}
function ordinaryArray(x){
  if(!Array.isArray(x)||Object.getPrototypeOf(x)!==Array.prototype)return false;
  const keys=Reflect.ownKeys(x);
  if(keys.some(k=>k!=='length'&&!/^(0|[1-9]\d*)$/.test(k)))return false;
  return Array.from({length:x.length},(_,i)=>Object.hasOwn(x,i)).every(Boolean);
}
function validEnvelope(e){return plainOwn(e,ENVELOPE)&&HEX64.test(e.releaseSha256)
  &&REV.test(e.encoderRevision)&&HEX64.test(e.indexGeneration)&&e.ontologyEdition==='Ariadne v0.7';}
function exactlySame(a,b){
  if(!validEnvelope(a)||!validEnvelope(b))return false;
  const keys=[...ENVELOPE];
  return keys.every(k=>k==='ontologyEdition'?a[k]===b[k]:
    timingSafeEqual(Buffer.from(a[k]),Buffer.from(b[k])));
}
function validDep(d){return plainOwn(d,DEP_FIELDS)&&SOURCE.test(d.sourceId)
  &&Number.isSafeInteger(d.sourceRevision)&&d.sourceRevision>=1
  &&HEX64.test(d.sourceSha256)&&Number.isSafeInteger(d.rightsEpoch)&&d.rightsEpoch>=0;}
function validUse(r,d){return plainOwn(r,USE_FIELDS)&&r.allowed===true
  &&r.purpose==='INFERENCE_USE'&&r.sourceId===d.sourceId
  &&r.sourceRevision===d.sourceRevision&&r.rightsEpoch===d.rightsEpoch;}
function validReturn(r,d){return plainOwn(r,RETURN_FIELDS)&&r.allowed===true
  &&r.purpose==='DISCLOSURE_RETURN'&&r.sourceId===d.sourceId
  &&r.recordRevision===d.recordRevision
  &&Number.isSafeInteger(r.rightsEpoch)&&r.rightsEpoch===d.rightsEpoch;}
/** Review 256 exact dependencies at a time, never deriving authority from a caller list. */
async function checkAllInferenceUse(deps,host){
  if(typeof host.currentInferenceUseBatch==='function'){
    for(let offset=0;offset<deps.length;offset+=USE_BATCH_SIZE){
      const part=deps.slice(offset,offset+USE_BATCH_SIZE);
      const decisions=await host.currentInferenceUseBatch(part.map(d=>Object.freeze({...d})));
      if(!ordinaryArray(decisions)||decisions.length!==part.length)return false;
      for(let i=0;i<part.length;i++)if(!validUse(decisions[i],part[i]))return false;
    }
    return true;
  }
  if(deps.length>64||typeof host.currentInferenceUse!=='function')return false;
  for(const d of deps){
    const permission=await host.currentInferenceUse(d.sourceId,d.sourceRevision);
    if(!validUse(permission,d))return false;
  }
  return true;
}
/**
 * @param {Object} input
 *   trustedRelease must be supplied by the independently trusted host source;
 *   a caller-supplied matching SHA is not host attestation.
 *   host.verifiedInfluencingSources returns {indexGeneration,sources:[...]}
 *   and must include ALL possible computation dependencies, not just top-k.
 * @returns {object} review receipt only, never authorized data or source text.
 */
export async function stageNeuralEvidenceReview({ranked,trustedRelease,observedRelease,host,maxReturned=10}={}){
  try{
    if(!exactlySame(trustedRelease,observedRelease)||!host
      ||typeof host.verifiedInfluencingSources!=='function'
      ||(typeof host.currentInferenceUse!=='function'&&typeof host.currentInferenceUseBatch!=='function')
      ||typeof host.currentDisclosureReturn!=='function'
      ||typeof host.lookup!=='function'
      ||typeof host.currentReturnRights!=='function')return INTEGRATION_HOLD;
    // A signed trust assertion is NOT made by this process; all callbacks in
    // this stage are local substitutes even when named "host".
    const manifest=await host.verifiedInfluencingSources({
      releaseSha256:trustedRelease.releaseSha256,
      indexGeneration:trustedRelease.indexGeneration,
    });
    if(!manifest||typeof manifest!=='object'||Array.isArray(manifest)
      ||Reflect.ownKeys(manifest).length!==4
      ||!Object.hasOwn(manifest,'indexGeneration')||!Object.hasOwn(manifest,'sources')
      ||!Object.hasOwn(manifest,'influenceCoverage')
      ||!Object.hasOwn(manifest,'scoreDependence')
      ||manifest.influenceCoverage!=='COMPLETE_VERIFIED'
      ||manifest.scoreDependence!=='INDEPENDENT_PER_ITEM_VERIFIED'
      ||manifest.indexGeneration!==trustedRelease.indexGeneration
      ||!ordinaryArray(manifest.sources)||manifest.sources.length<1||manifest.sources.length>4096
      ||manifest.sources.some(d=>!validDep(d)))return INTEGRATION_HOLD;
    const deps=manifest.sources.map(d=>Object.freeze({...d}));
    if(new Set(deps.map(d=>d.sourceId)).size!==deps.length)return INTEGRATION_HOLD;

    // Deny if even an OFF-RESULT contributor loses current inference-use rights.
    // Source may be use-eligible while citation-disallowed; that is a distinct
    // policy, but the trusted host has to define its meaning explicitly.
    if(!await checkAllInferenceUse(deps,host))return INTEGRATION_HOLD;
    const original=await reviewPostrank({ranked,host,maxReturned});
    if(!original||!['LOCAL_CANDIDATES_ONLY','ABSTAIN_NO_ELIGIBLE_RETURN'].includes(original.status))
      return INTEGRATION_HOLD;
    // Stale/mismatched evidence is a whole-page HOLD, not silent drop then
    // promotion of the remaining candidates. A revoked CURRENT record may be
    // removed only under the independently verified per-item score contract.
    if(original.reasons.STALE_OR_DIFFERENT_SOURCE>0||original.reasons.INVALID_AUTHORITY_RECORD>0)
      return INTEGRATION_HOLD;

    // Returned records must be grounded in the same known influence inventory.
    // This is conservative, not a claim about the actual encoder's internals.
    const bySource=new Map(deps.map(d=>[d.sourceId,d]));
    for(const row of original.returned){
      const dep=bySource.get(row.sourceId);
      if(!dep)return INTEGRATION_HOLD;
      const liveRecord=await host.lookup(row.documentId);
      if(!liveRecord||liveRecord.sourceId!==row.sourceId
        ||liveRecord.recordSha256!==row.recordSha256
        ||liveRecord.recordRevision!==row.recordRevision
        ||liveRecord.status!=='CURRENT')return INTEGRATION_HOLD;
      const ret=await host.currentDisclosureReturn(row.documentId,row.sourceId);
      if(!validReturn(ret,{sourceId:row.sourceId,recordRevision:row.recordRevision,rightsEpoch:liveRecord.rightsEpoch}))return INTEGRATION_HOLD;
    }
    // Recheck use after the async candidate and return processing. Real host
    // must STILL recheck atomically with the actual final egress: this utility
    // never claims to have solved that gap.
    if(!await checkAllInferenceUse(deps,host))return INTEGRATION_HOLD;
    const roots=new Set(original.returned.filter(r=>r.rootFamily!==null).map(r=>r.rootFamily));
    const routeCounts=Object.freeze({
      neural:original.returned.filter(r=>r.route==='neural').length,
      graph:original.returned.filter(r=>r.route==='graph').length,
      lexical:original.returned.filter(r=>r.route==='lexical').length,
    });
    // No source IDs/passages returned. Hash is merely an integrity check over
    // public-shaped local metadata, never an authority credential.
    const receiptDigest=hash(JSON.stringify({release:trustedRelease.releaseSha256,
      dependencyCount:deps.length,returned:original.returned.map(r=>({
        id:r.documentId,sha:r.recordSha256,revision:r.recordRevision,route:r.route,score:r.directScore,
        root:r.rootFamily,polarity:r.polarity}))}));
    return Object.freeze({schema:INTEGRATION_SCHEMA,
      status:original.returned.length?'LOCAL_REVIEW_CANDIDATE':'LOCAL_ABSTAIN',
      releaseSha256:trustedRelease.releaseSha256,receiptDigest,
      returnedRecordCount:original.returned.length,dependencyCount:deps.length,
      independentFamilyCount:roots.size,unknownFamilyCount:original.unresolvedAncestryCount,
      dissentBearingCount:original.returned.filter(r=>r.dissentPresent).length,
      routeCounts,passagesReturned:0,canPublish:false,canTrain:false,hostVerified:false,
      currentHostRightsProven:false,actualNetworkEgress:false,weightsModified:false,
      modelModified:false,authorityEffect:'NONE',
      warning:'LOCAL_MOCK_ONLY: requires exact MICA entry and atomic host-owned final release',
    });
  }catch{return INTEGRATION_HOLD;}
}
