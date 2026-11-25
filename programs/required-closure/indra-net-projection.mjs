/**
 * Indra Net: a metadata-only, derived view of ONE prepared Atlas neural result.
 * This is not a registry, retriever, authority source, graph write or host call.
 * The source, result, and per-consumer hashes are untrusted metadata until the
 * existing canonical gateway/host independently validates them.
 *
 * It composes -- rather than replaces -- the required-set verifier. Caller may
 * not make an authoritative required set by self-declaring a trust anchor.
 */
import {canonical,sha256,reviewRequiredClosure} from './required-closure.mjs';

export const INDRA_SCHEMA='atlas.indra-net.projection/v1';
const SOURCE_SCHEMA='atlas.indra-net.prepared-source/v1';
const CONSUMER_SCHEMA='atlas.indra-net.consumer-receipt/v1';
const HEX=/^[a-f0-9]{64}$/;
const NAME=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,95}$/;
const EDITION=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,127}$/;
const HSN=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const CONSUMER_KINDS=new Set(['NEURAL_VIEW','GRAPH_VIEW','GLYPH_VIEW','META_VIEW','COUNCIL_CONTEXT','ACADEMY_CONTEXT','EXPERIMENTAL_OPERATOR']);
const OBSERVATIONS=new Set(['LOCAL_TESTED','SYNTHETIC_FIXTURE','PROPOSED_NOT_EXECUTED','HELD']);
const keys=(x,k)=> x && typeof x==='object' && !Array.isArray(x) &&
  Object.keys(x).sort().join('|')===k.slice().sort().join('|');
const allowedHex=x=>typeof x==='string'&&HEX.test(x);
const assert=(pred,code)=>{if(!pred)throw Error(code)};
const freeze=x=>{if(Array.isArray(x)){x.forEach(freeze);return Object.freeze(x)}
  if(x&&typeof x==='object'){Object.values(x).forEach(freeze);return Object.freeze(x)}return x};
const SOURCE_FIELDS=['schema','scope','operation','primaryMethod','fallbackUsed','requestSha256','resultSha256','issuerSha256','modelSha256','runtimeSha256','sourceSha256','sourceEdition','rightsEpochSha256','deliveryPurpose','hsns'];
const CONSUMER_FIELDS=['schema','id','kind','observation','scope','requestSha256','resultSha256','issuerSha256','modelSha256','runtimeSha256','sourceSha256','sourceEdition','rightsEpochSha256','hsns'];
const SHA_FIELDS=['requestSha256','resultSha256','issuerSha256','modelSha256','runtimeSha256','sourceSha256','rightsEpochSha256'];

function validateSource(s){
  assert(keys(s,SOURCE_FIELDS)&&s.schema===SOURCE_SCHEMA,'SOURCE_FIELDS');
  assert(s.scope==='WORK'&&s.operation==='search'&&s.primaryMethod==='neural'&&s.fallbackUsed===false,'NOT_NEURAL_WORK');
  assert(SHA_FIELDS.every(k=>allowedHex(s[k])),'SOURCE_HASH');
  assert(typeof s.sourceEdition==='string'&&EDITION.test(s.sourceEdition),'SOURCE_EDITION');
  assert(['INFERENCE','CITATION'].includes(s.deliveryPurpose),'DELIVERY_PURPOSE');
  assert(Array.isArray(s.hsns)&&s.hsns.length>=1&&s.hsns.length<=1728,'SOURCE_HSN_BOUNDS');
  assert(s.hsns.every(h=>typeof h==='string'&&HSN.test(h))&&new Set(s.hsns).size===s.hsns.length,'SOURCE_HSN_IDENTITY');
}
function validateConsumer(c,s,addresses){
  assert(keys(c,CONSUMER_FIELDS)&&c.schema===CONSUMER_SCHEMA&&typeof c.id==='string'&&NAME.test(c.id),'CONSUMER_FIELDS');
  assert(CONSUMER_KINDS.has(c.kind)&&OBSERVATIONS.has(c.observation)&&c.scope==='WORK','CONSUMER_KIND');
  for(const k of SHA_FIELDS)assert(allowedHex(c[k])&&c[k]===s[k],'SPLIT_CONTEXT_'+k);
  assert(c.sourceEdition===s.sourceEdition,'SPLIT_SOURCE_EDITION');
  assert(Array.isArray(c.hsns)&&c.hsns.length>=1&&c.hsns.length<=1728,'CONSUMER_HSN_BOUNDS');
  assert(new Set(c.hsns).size===c.hsns.length && c.hsns.every(h=>typeof h==='string'&&HSN.test(h)&&addresses.has(h)), 'CONSUMER_HSN_NOT_IN_RESULT');
}
const hold=(code)=>freeze({schema:INDRA_SCHEMA,status:'HOLD_CONTEXT',reason:code,
  releaseAuthorized:false,trainingEligible:false,modelUpdated:false,hostedExecutionVerified:false,
  gatewayBrandVerified:false,sourceRightsAttested:false,requiredSetIndependentlyComplete:false,observationIndependentlyVerified:false,
  crossHostParityVerified:false,semanticAcceptance:false,fullCorpusIndexed:false,
  newRetriever:false,newComposer:false,authorityEffect:'NONE'});
/**
 * Inputs MUST be externally derived from ONE already-prepared gateway result.
 * The current model issuer, the source rights epoch, and full required set are
 * still independently checked at the canonical host's READ/USE/RETURN fences.
 * This function never attests their authenticity, including on a match.
 */
export function projectIndraNet(input){
  try {
    // Copies only structured data without invoking untrusted getters/Proxy traps.
    const data=JSON.parse(canonical(input));
    assert(keys(data,['source','consumers','closure']),'ROOT_FIELDS');
    const {source,consumers,closure}=data;
    validateSource(source);
    assert(Array.isArray(consumers)&&consumers.length>=1&&consumers.length<=64,'CONSUMER_BOUNDS');
    const addresses=new Set(source.hsns),seen=new Set(),edges=[];
    for(const c of consumers){
      validateConsumer(c,source,addresses);
      assert(!seen.has(c.id),'DUPLICATE_CONSUMER');seen.add(c.id);
      // Derived edges are transient review evidence; never write to canon/graph.
      for(const hsn of c.hsns)edges.push({consumer:c.id,hsn,relation:'CLAIMS_CONSUMPTION_OF_SHARED_RESULT',reportedObservation:c.observation});
    }
    assert(edges.length<=4096,'TOO_MANY_EDGES');
    // Every projected consumer must be in the independently pinned required
    // component roster, and every roster entry must be projected. Otherwise
    // a caller could silently omit a required recipient while leaving all
    // supplied evidence internally consistent.
    const roster=closure?.manifest?.required?.components;
    assert(Array.isArray(roster)&&roster.length===seen.size &&
      roster.every(row=>row && typeof row.id==='string' && seen.has(row.id)),
      'CONSUMER_REQUIRED_SET_MISMATCH');
    const selected=closure?.manifest?.selection;
    assert(keys(selected,['requestSha256','resultSha256','modelSha256','runtimeSha256','sourceSha256','sourceEdition','deliveryPurpose']),'SELECTION_FIELDS');
    for(const k of ['requestSha256','resultSha256','modelSha256','runtimeSha256','sourceSha256','sourceEdition','deliveryPurpose']){
      assert(selected[k]===source[k],'CLOSURE_CONTEXT_MISMATCH_'+k);
    }
    const review=reviewRequiredClosure(closure);
    assert(review.status==='MATCHED_PINNED_METADATA','REQUIRED_CLOSURE_HELD');
    // The reviewer enforces the declared required set; independently established
    // completeness and fresh purpose rights are still outside both modules.
    const result={schema:INDRA_SCHEMA,status:'CONSISTENT_METADATA_ONLY',
      sourceSelectionSha256:sha256(selected),sourceContextSha256:sha256(source),
      reviewManifestSha256:review.manifestSha256,consumerCount:consumers.length,
      addressedNodeCount:source.hsns.length,projectedEdgeCount:edges.length,
      consumers:consumers.map(c=>({id:c.id,kind:c.kind,reportedObservation:c.observation,hsnCount:c.hsns.length})),
      edges,releaseAuthorized:false,trainingEligible:false,modelUpdated:false,
      hostedExecutionVerified:false,gatewayBrandVerified:false,sourceRightsAttested:false,
      requiredSetIndependentlyComplete:false,observationIndependentlyVerified:false,
      crossHostParityVerified:false,semanticAcceptance:false,fullCorpusIndexed:false,
      newRetriever:false,newComposer:false,
      authorityEffect:'NONE'};
    return freeze(result);
  }catch(e){
    // A local mismatch provides no authority to repair/retrieve/retry. Only a
    // fixed diagnostic code is returned; never echo private source/user data.
    const msg=e instanceof Error?e.message:'INVALID_INPUT';
    const known=/^[A-Z0-9_]{1,90}$/.test(msg)?msg:'INVALID_INPUT';
    return hold(known);
  }
}
