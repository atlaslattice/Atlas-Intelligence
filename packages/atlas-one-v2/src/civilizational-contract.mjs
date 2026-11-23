/** Atlas ONE v2 L1 source-only bridge: no hosted room, subscription, vote or deployment effects.
 * Public-safe, deterministic policy preflight and candidate semantics. An object labelled
 * hostProvided is NOT an authenticated host grant; only an external trusted publisher
 * may enforce rights and cause actions. Imported data never grants authority.
 */
import {createHash} from 'node:crypto';

export const ARIADNE_V07_SHA256='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
export const COMPILED_CANON_239_SHA256='75b57bc4c5c6d1e068e4e6467f26a5e46bcac5402673553ef13a00a808bfff43';
export const SOURCE_STATES=Object.freeze({HELD:'HOLD',DRAFT:'PREPARED_NOT_APPLIED',REVIEW:'CANDIDATE_REQUIRES_SEMANTIC_REVIEW'});
export const HOUSE_NAMES=Object.freeze([
  'Energy & Matter','Water & Food','Ecology, Environment & Infrastructure',
  'Health & Medicine','Education & Knowledge','Security',
  'Business, Finance & Governance','Humanities, Arts & Culture',
  'Philosophy, Psychology & Religion','Indigenous Peoples, Society & Community',
  'Protection & Rights','Space & Aerospace'
]);
const HSN=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const CLAUSE=/^[FPID]-\d{3}$/;
const DIGEST=/^[0-9a-f]{64}$/;
const ID=/^[A-Za-z0-9_-]{3,80}$/;
const RELATIONS=new Set(['TOPIC_CONTEXT','PROTECTED_INTEREST','METHOD','RELATED','CHALLENGES','REQUIRES']);
const LIMIT_CEILINGS=Object.freeze({maxMessages:500,maxPerMember:30,maxHops:10,expiresMinutes:1440});
const LIMIT_FLOORS=Object.freeze({maxMessages:3,maxPerMember:1,maxHops:1,expiresMinutes:5});
const deny=(reason)=>Object.freeze({status:SOURCE_STATES.HELD,reason,authorityEffect:'NONE',hostAuthenticated:false});
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const whole=(v,lo,hi)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
const hex=x=>typeof x==='string'&&DIGEST.test(x);

/** Pure room-policy NEGOTIATION; does not create/change rooms or subscribe people.
 * Host ceilings are an explicit input, not a certified source of authority.
 * No client request is allowed to raise any host ceiling.
 */
export function prepareRoomProfile({kind,hostLimits,requested}={}){
  if(kind!=='work'||!plain(hostLimits))return deny('WORK_HOST_POLICY_REQUIRED');
  if(requested!==undefined&&!plain(requested))return deny('REQUESTED_LIMITS_INVALID');
  const result={};
  for(const k of Object.keys(LIMIT_CEILINGS)){
    const cap=hostLimits[k],v=requested?.[k]??cap;
    if(!whole(cap,LIMIT_FLOORS[k],LIMIT_CEILINGS[k])||!whole(v,LIMIT_FLOORS[k],cap))return deny('LIMIT_NOT_HOST_ALLOWED');
    result[k]=v;
  }
  if(requested&&Object.keys(requested).some(k=>!(k in LIMIT_CEILINGS)))return deny('UNKNOWN_ROOM_SETTING');
  return Object.freeze({schema:'atlas.one.room-profile/v1',status:SOURCE_STATES.DRAFT,
    kind:'work',limits:Object.freeze(result),hostAuthentication:'NOT_VERIFIED',
    requiresHostEnforcement:true,automaticJoin:false,subscriptionInstalled:false,
    expiresAfterCreation:true,autoCreateSuccessor:false,authorityEffect:'NONE'});
}

/** Subscription PREPARATION only. No self-declared member IDs, accepted webhook
 * or old join receipts can confer trusted principal or implicit notification consent.
 * A real subscriber must be installed by a separately authenticated host.
 */
export function prepareWorkSubscription({room,join,consent,hostSession,nowMs}={}){
  if(!plain(room)||room.kind!=='work'||room.status!=='open'||!ID.test(room.roomId||''))return deny('WORK_ROOM_NOT_OPEN');
  const end=Date.parse(room.expiresAt);
  if(!Number.isFinite(end)||!whole(nowMs,0,Number.MAX_SAFE_INTEGER)||nowMs>=end)return deny('ROOM_EXPIRED');
  if(!plain(hostSession)||!['tenant','account','principal'].every(k=>typeof hostSession[k]==='string'&&ID.test(hostSession[k]))||hostSession.mode!=='WORK'||!whole(hostSession.rightsEpoch,0,Number.MAX_SAFE_INTEGER))return deny('TRUSTED_HOST_SESSION_REQUIRED');
  if(!plain(join)||join.roomId!==room.roomId||join.account!==hostSession.account||join.principal!==hostSession.principal||join.rightsEpoch!==hostSession.rightsEpoch||join.authenticatedByHost!==true)return deny('HOST_JOIN_REQUIRED');
  if(!plain(consent)||consent.optIn!==true||consent.roomId!==room.roomId||consent.purpose!=='WORK_EVENT'||consent.principal!==hostSession.principal||typeof consent.termsDigest!=='string'||!hex(consent.termsDigest))return deny('EXPLICIT_ROOM_EVENT_CONSENT_REQUIRED');
  return Object.freeze({schema:'atlas.one.subscription-intent/v1',status:SOURCE_STATES.DRAFT,
    scope:Object.freeze({tenant:hostSession.tenant,account:hostSession.account,principal:hostSession.principal,
      roomId:room.roomId,mode:'WORK',purpose:'WORK_EVENT',rightsEpoch:hostSession.rightsEpoch,
      expiresAt:room.expiresAt,termsDigest:consent.termsDigest}),
    hostAuthentication:'HOST_CALLBACK_SELF_REPORT_NOT_ATTESTED',subscriptionInstalled:false,
    eventDelivered:false,modelWoke:false,canUnsubscribe:true,requiresHostRightsRecheck:true,
    automaticRenewal:false,authorityEffect:'NONE'});
}

/** A cryptographically addressed CANON clause is not a constitutional ratification.
 * A matched HSN node location is not a semantic equivalence. No source bodies used.
 */
export function evaluateCanonHsnCandidate({clause,node,relation,claimedGlyph,reviewEvidence}={}){
  if(!plain(clause)||!CLAUSE.test(clause.coordinate||'')||!hex(clause.sourceDigest)||!hex(clause.clauseDigest)||typeof clause.edition!=='string'||clause.edition.length<4)return deny('CANON_SOURCE_NOT_EDITION_PINNED');
  if(!plain(node)||!HSN.test(node.coordinate||'')||node.registryEdition!=='v0.7'||node.registryDigest!==ARIADNE_V07_SHA256||!hex(node.nodeDigest)||typeof node.name!=='string'||node.name.trim().length<3)return deny('HSN_SOURCE_NOT_EDITION_PINNED');
  if(!RELATIONS.has(relation))return deny('RELATION_NOT_NAVIGATIONAL');
  if(claimedGlyph!==undefined&&(!plain(claimedGlyph)||claimedGlyph.effect!=='DISPLAY_ONLY'||claimedGlyph.registryDigest!==node.registryDigest||claimedGlyph.coordinate!==node.coordinate))return deny('GLYPH_ALIAS_MISMATCH');
  // A fake name for a known false friend is not allowed to pass as source-verified.
  if(node.coordinate==='H08.S01.N01'&&node.name!=='Music theory')return deny('KNOWN_HSN_FALSE_FRIEND');
  if(node.coordinate==='H01.S01.N01'&&node.name!=='Mechanics of matter')return deny('KNOWN_HSN_FALSE_FRIEND');
  if(node.coordinate==='H10.S01.N01'&&node.name!=='Social systems theory')return deny('KNOWN_HSN_FALSE_FRIEND');
  if(node.coordinate==='H11.S01.N01'&&node.name!=='International human rights')return deny('KNOWN_HSN_FALSE_FRIEND');
  if(!plain(reviewEvidence)||typeof reviewEvidence.sourceRef!=='string'||reviewEvidence.sourceRef.length<5)return deny('SOURCE_REFERENCE_REQUIRED');
  const canonical={clause:{edition:clause.edition,sourceDigest:clause.sourceDigest,coordinate:clause.coordinate,clauseDigest:clause.clauseDigest},
    node:{registryEdition:node.registryEdition,registryDigest:node.registryDigest,coordinate:node.coordinate,nodeDigest:node.nodeDigest},relation};
  const evidenceDigest=createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  return Object.freeze({schema:'atlas.one.canon-hsn-link/v1',status:SOURCE_STATES.REVIEW,
    ...canonical,evidenceDigest,sourceRef:reviewEvidence.sourceRef,
    normativeForce:'NONE',hostAuthenticated:false,reviewerAccepted:false,ratified:false,
    glyphEffect:'DISPLAY_ONLY',authorityEffect:'NONE'});
}

/** A civilizational readiness PREVIEW. Reviews all twelve Houses, keeps domain
 * and method evidence separate, and never estimates a universal welfare score.
 */
export function evaluateTwelveHouseReadiness({material,impacts,rights,stocks}={}){
  if(material===false)return Object.freeze({status:'NOT_APPLICABLE_WITH_REASON_REQUIRED',authorityEffect:'NONE'});
  if(material!==true||!Array.isArray(impacts)||impacts.length!==12||!Array.isArray(rights)||!Array.isArray(stocks))return deny('TWELVE_HOUSE_SCOPE_REQUIRED');
  if(rights.length===0)return deny('MANDATORY_RIGHTS_COVERAGE_MISSING');
  if(rights.some(x=>!plain(x)||!['PASS','BLOCK','UNKNOWN'].includes(x.state)))return deny('RIGHTS_SCHEMA_INVALID');
  if(rights.some(x=>x.state==='BLOCK'))return Object.freeze({status:'BLOCK',reason:'NON_OFFSETTABLE_RIGHTS_VIOLATION',authorityEffect:'NONE'});
  if(rights.some(x=>x.state==='UNKNOWN'))return deny('MANDATORY_RIGHTS_UNKNOWN');
  const seen=new Set();let uncovered=false;
  for(const i of impacts){
    if(!plain(i)||!/^H(0[1-9]|1[0-2])$/.test(i.house||'')||seen.has(i.house)||!['REVIEWED','UNKNOWN','N_A_WITH_REASON'].includes(i.state)||i.state==='N_A_WITH_REASON'&&(!i.reason||i.reason.length<6))return deny('HOUSE_COVERAGE_INVALID');
    seen.add(i.house);if(i.state==='UNKNOWN')uncovered=true;
    if(i.state==='REVIEWED'&&(!Array.isArray(i.sourceRefs)||i.sourceRefs.length===0||i.sourceRefs.length>20||i.sourceRefs.some(ref=>typeof ref!=='string'||ref.length<5||ref.length>300)))return deny('HOUSE_SOURCE_EVIDENCE_MISSING');
    if(i.domainEvidence!==undefined&&(!Array.isArray(i.domainEvidence)||i.domainEvidence.length>84))return deny('DOMAIN_EVIDENCE_SCHEMA_INVALID');
    if(i.methodEvidence!==undefined&&(!Array.isArray(i.methodEvidence)||i.methodEvidence.length>60))return deny('METHOD_EVIDENCE_SCHEMA_INVALID');
  }
  if(uncovered)return deny('HOUSE_EVIDENCE_UNKNOWN');
  const seenStocks=new Set();
  for(const s of stocks){
    if(!plain(s)||typeof s.resource!=='string'||s.resource.length<2||seenStocks.has(s.resource)||typeof s.unit!=='string'||s.unit.length<1||!['opening','imports','regeneration','restoration','withdrawals','losses','closing'].every(k=>Number.isFinite(s[k]))||s.withdrawals<0||s.losses<0||s.opening<0||s.closing<0)return deny('RESOURCE_LEDGER_INVALID');
    seenStocks.add(s.resource);
    const expected=s.opening+s.imports+s.regeneration+s.restoration-s.withdrawals-s.losses;
    if(Math.abs(expected-s.closing)>Math.max(1e-9,1e-9*Math.abs(expected)))return deny('PHYSICAL_STOCK_NOT_CLOSED');
  }
  return Object.freeze({schema:'atlas.one.civilizational-readiness/v1',status:'REVIEW_CANDIDATE',
    houseCoverage:12,domainPositions:1008,methodPositions:720,
    unitPreserving:true,materialOutcomeVerified:false,semanticReviewPerformed:false,
    rightsReviewed:rights.length,stocksChecked:stocks.length,authorityEffect:'NONE',canonEffect:'NONE'});
}