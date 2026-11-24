/**
 * MICA / Atlas: synthetic post-rank lineage and revocation review fixture.
 * No model, weights, source bodies, training data, authorization, or host effects.
 * The real trusted host MUST derive account/session and enforce current rights
 * at actual response emission; these callbacks are LOCAL TEST SUBSTITUTES.
 * Neither this code nor any caller-provided 64-character hash proves authority.
 */
export const SCHEMA = 'atlas.mica.postrank-local-review/v1';
const HOLD = Object.freeze({schema: SCHEMA, status: 'HOLD_INPUT', canPublish: false, canTrain: false});
const SHA = /^[0-9a-f]{64}$/;
const ID = /^[A-Za-z0-9._:-]{1,120}$/;
const ROUTE = new Set(['neural', 'graph', 'lexical']);
const STATE = new Set(['CURRENT', 'SUPERSEDED', 'REVOKED']);
const POLARITY = new Set(['supports', 'contradicts', 'unresolved']);
const PKEYS = new Set(['documentId','sourceId','recordSha256','recordRevision','vectorDigest','score','route','retrievalGeneration']);
const RKEYS = new Set(['documentId','sourceId','recordSha256','recordRevision','vectorDigest','rightsEpoch','retrievalGeneration','status','familyId','familyVerified','polarity','dissentRefs']);
const AKEYS = new Set(['allowed','epoch']);
const isId = x=> typeof x === 'string' && ID.test(x);
const isHash = x=> typeof x === 'string' && SHA.test(x);
const ownRecord=(x,allowed,required=allowed)=>{
  if(!x || typeof x!=='object' || Array.isArray(x)) return false;
  const p=Object.getPrototypeOf(x);
  if(p!==Object.prototype && p!==null) return false;
  const keys=Reflect.ownKeys(x);
  if(keys.some(k=>typeof k!=='string' || !allowed.has(k)))return false;
  if([...required].some(k=>!keys.includes(k)))return false;
  return keys.every(k=>{
    const d=Object.getOwnPropertyDescriptor(x,k);
    return d && Object.hasOwn(d,'value') && d.enumerable;
  });
};
const ownArray=x=>Array.isArray(x)&&Object.getPrototypeOf(x)===Array.prototype
  &&Reflect.ownKeys(x).every(k=>k==='length'||/^(0|[1-9][0-9]*)$/.test(k))
  &&Array.from({length:x.length},(_,i)=>Object.hasOwn(x,i)).every(Boolean);
function candidateValid(p){
  return ownRecord(p,PKEYS)&&isId(p.documentId)&&isId(p.sourceId)&&isHash(p.recordSha256)
  &&Number.isSafeInteger(p.recordRevision)&&p.recordRevision>=1
  &&isHash(p.vectorDigest)&&Number.isFinite(p.score)
  &&p.score>=-1e9&&p.score<=1e9&&ROUTE.has(p.route)&&isHash(p.retrievalGeneration);
}
function recordValid(r){
  return ownRecord(r,RKEYS)&&isId(r.documentId)&&isId(r.sourceId)&&isHash(r.recordSha256)
  &&Number.isSafeInteger(r.recordRevision)&&r.recordRevision>=1
  &&isHash(r.vectorDigest)&&Number.isSafeInteger(r.rightsEpoch)&&r.rightsEpoch>=0
  &&isHash(r.retrievalGeneration)&&STATE.has(r.status)
  &&(r.familyId===null||isId(r.familyId))&&typeof r.familyVerified==='boolean'
  &&(!r.familyVerified||r.familyId!==null)&&POLARITY.has(r.polarity)
  &&ownArray(r.dissentRefs)&&r.dissentRefs.length<=16&&r.dissentRefs.every(isId);
}
function entryMatches(p,r){
  return p.documentId===r.documentId && p.sourceId===r.sourceId
  &&p.recordSha256===r.recordSha256&&p.recordRevision===r.recordRevision
  &&p.vectorDigest===r.vectorDigest&&p.retrievalGeneration===r.retrievalGeneration;
}
/**
 * Reconciles a bounded ranking with CURRENT mock-host record/rights information.
 * Never returns raw source passages. Selection remains a LOCAL PREVIEW ONLY.
 */
export async function reviewPostrank({ranked, host, maxReturned=10}={}) {
  try {
    if(!ownArray(ranked)||ranked.length>1000||ranked.some(x=>!candidateValid(x))
      ||!Number.isSafeInteger(maxReturned)||maxReturned<1||maxReturned>50
      ||!host||typeof host.lookup!=='function'||typeof host.currentReturnRights!=='function') return HOLD;
    const returned=[], reasons={STALE_OR_DIFFERENT_SOURCE:0, NOT_CURRENT:0, DENIED_OR_STALE_RIGHTS:0, INVALID_AUTHORITY_RECORD:0};
    const seen=new Set();
    for(const p of ranked){
      if(returned.length>=maxReturned)break;
      // Repeated candidate id is neither corroboration nor a new model hit.
      if(seen.has(p.documentId))continue;
      seen.add(p.documentId);
      let r, rights;
      try {r=await host.lookup(p.documentId);}catch{reasons.INVALID_AUTHORITY_RECORD++;continue;}
      if(!recordValid(r)){reasons.INVALID_AUTHORITY_RECORD++;continue;}
      if(!entryMatches(p,r)){reasons.STALE_OR_DIFFERENT_SOURCE++;continue;}
      if(r.status!=='CURRENT'){reasons.NOT_CURRENT++;continue;}
      try{rights=await host.currentReturnRights(r.documentId,r.sourceId);}catch{reasons.DENIED_OR_STALE_RIGHTS++;continue;}
      if(!ownRecord(rights,AKEYS)||rights.allowed!==true||!Number.isSafeInteger(rights.epoch)
        ||rights.epoch!==r.rightsEpoch){reasons.DENIED_OR_STALE_RIGHTS++;continue;}
      returned.push(Object.freeze({documentId:r.documentId,sourceId:r.sourceId,
        recordSha256:r.recordSha256,recordRevision:r.recordRevision,route:p.route,
        directScore:p.score,rootFamily:r.familyVerified?r.familyId:null,
        ancestryStatus:r.familyVerified?'VERIFIED_BY_MOCK_HOST':'UNKNOWN',
        polarity:r.polarity,trainingPositiveEligible:false,
        // Never export dissent ids before each referred source has CURRENT rights.
        dissentPresent:r.dissentRefs.length>0}));
    }
    const families=new Set(returned.filter(x=>x.rootFamily!==null).map(x=>x.rootFamily));
    return Object.freeze({schema:SCHEMA,status:returned.length?'LOCAL_CANDIDATES_ONLY':'ABSTAIN_NO_ELIGIBLE_RETURN',
      returned,eligibleIndependentRootCount:families.size,
      unresolvedAncestryCount:returned.filter(x=>x.rootFamily===null).length,
      reasons:Object.freeze(reasons),preservedRankingRoute:true,
      sourceTextReturned:false,hostedVerified:false,canPublish:false,canTrain:false,
      note:'Mock callbacks are not host-authenticated or atomic with network egress.'});
  }catch{return HOLD;}
}
