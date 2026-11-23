import test from 'node:test';
import assert from 'node:assert/strict';
import {ARIADNE_V07_SHA256,HOUSE_NAMES,prepareRoomProfile,prepareWorkSubscription,evaluateCanonHsnCandidate,evaluateTwelveHouseReadiness,projectTypedHsnCoverage} from '../src/civilizational-contract.mjs';
const caps={maxMessages:500,maxPerMember:30,maxHops:10,expiresMinutes:1440};
const room={kind:'work',status:'open',roomId:'room-001',expiresAt:'2026-11-24T00:00:00Z'};
const session={tenant:'tenant-001',account:'account-001',principal:'person-001',mode:'WORK',rightsEpoch:3};
const join={roomId:'room-001',account:'account-001',principal:'person-001',rightsEpoch:3,authenticatedByHost:true};
const consent={optIn:true,roomId:'room-001',principal:'person-001',purpose:'WORK_EVENT',termsDigest:'a'.repeat(64)};
const now=Date.parse('2026-11-23T12:00:00Z');
const clause={edition:'compiled-2026-11-14',sourceDigest:'b'.repeat(64),coordinate:'D-004',clauseDigest:'c'.repeat(64)};
const node={registryEdition:'v0.7',registryDigest:ARIADNE_V07_SHA256,coordinate:'H08.S01.N01',nodeDigest:'d'.repeat(64),name:'Music theory'};
const impacts=Array.from({length:12},(_,n)=>({house:'H'+String(n+1).padStart(2,'0'),state:'REVIEWED',domainEvidence:[],methodEvidence:[],sourceRefs:['synthetic:house-review-source']}));
const stocks=[{resource:'fresh-water',unit:'m3',opening:100,imports:10,regeneration:2,restoration:3,withdrawals:9,losses:1,closing:105}];
const rights=[{state:'PASS',kind:'consent'},{state:'PASS',kind:'ecology'}];

test('house names are exactly twelve with correct H10/H11/H12 roles',()=>{assert.equal(HOUSE_NAMES.length,12);assert.match(HOUSE_NAMES[9],/Indigenous/);assert.match(HOUSE_NAMES[10],/Rights/);assert.match(HOUSE_NAMES[11],/Space/)});
test('room profile uses host upper bounds without publishing or subscribing',()=>{const r=prepareRoomProfile({kind:'work',hostLimits:caps});assert.equal(r.limits.maxMessages,500);assert.equal(r.limits.expiresMinutes,1440);assert.equal(r.subscriptionInstalled,false);assert.equal(r.status,'PREPARED_NOT_APPLIED')});
test('room profile honors lower requested bounds',()=>{const r=prepareRoomProfile({kind:'work',hostLimits:caps,requested:{maxMessages:200,expiresMinutes:60}});assert.equal(r.limits.maxMessages,200);assert.equal(r.limits.expiresMinutes,60)});
test('room profile rejects excess and policy unknowns',()=>{assert.equal(prepareRoomProfile({kind:'work',hostLimits:caps,requested:{maxMessages:501}}).status,'HOLD');assert.equal(prepareRoomProfile({kind:'work',hostLimits:{...caps,maxHops:50}}).status,'HOLD');assert.equal(prepareRoomProfile({kind:'work',hostLimits:caps,requested:{autoSubscribe:true}}).status,'HOLD')});
test('room profile rejects cross-mode and missing host policy',()=>{assert.equal(prepareRoomProfile({kind:'play',hostLimits:caps}).status,'HOLD');assert.equal(prepareRoomProfile({kind:'work'}).status,'HOLD')});
test('work subscription is a preflight, never an installed grant',()=>{const x=prepareWorkSubscription({room,hostSession:session,join,consent,nowMs:now});assert.equal(x.status,'PREPARED_NOT_APPLIED');assert.equal(x.subscriptionInstalled,false);assert.equal(x.modelWoke,false);assert.equal(x.scope.rightsEpoch,3)});
test('work subscription requires explicit per-room consent',()=>{for(const v of [{...consent,optIn:false},{...consent,roomId:'room-002'},{...consent,termsDigest:'bad'}])assert.equal(prepareWorkSubscription({room,hostSession:session,join,consent:v,nowMs:now}).status,'HOLD')});
test('work subscription denies unverified or switched principal',()=>{const r=prepareWorkSubscription({room,hostSession:session,join:{...join,authenticatedByHost:false},consent,nowMs:now});assert.equal(r.status,'HOLD');assert.equal(prepareWorkSubscription({room,hostSession:{...session,account:'account-002'},join,consent,nowMs:now}).status,'HOLD')});
test('work subscription denies expired and nonwork room',()=>{assert.equal(prepareWorkSubscription({room,hostSession:session,join,consent,nowMs:Date.parse(room.expiresAt)}).status,'HOLD');assert.equal(prepareWorkSubscription({room:{...room,kind:'play'},hostSession:session,join,consent,nowMs:now}).status,'HOLD')});
test('source bridge accepts only candidate relations, never CANON authority',()=>{const x=evaluateCanonHsnCandidate({clause,node,relation:'TOPIC_CONTEXT',reviewEvidence:{sourceRef:'source-001'}});assert.equal(x.status,'CANDIDATE_REQUIRES_SEMANTIC_REVIEW');assert.equal(x.normativeForce,'NONE');assert.equal(x.ratified,false);assert.match(x.evidenceDigest,/^[0-9a-f]{64}$/)});
test('bridge source digest is stable across equivalent inputs',()=>{const f=()=>evaluateCanonHsnCandidate({clause,node,relation:'METHOD',reviewEvidence:{sourceRef:'source-001'}});assert.equal(f().evidenceDigest,f().evidenceDigest)});
test('bare clause or HSN digest held',()=>{assert.equal(evaluateCanonHsnCandidate({clause:{...clause,sourceDigest:'bad'},node,relation:'METHOD',reviewEvidence:{sourceRef:'source-001'}}).status,'HOLD');assert.equal(evaluateCanonHsnCandidate({clause,node:{...node,registryDigest:'e'.repeat(64)},relation:'METHOD',reviewEvidence:{sourceRef:'source-001'}}).status,'HOLD')});
test('bridges never promote SAME_AS or RATIIFIED by caller',()=>{assert.equal(evaluateCanonHsnCandidate({clause,node,relation:'SAME_AS',reviewEvidence:{sourceRef:'source-001'}}).status,'HOLD');assert.equal(evaluateCanonHsnCandidate({clause,node:{...node,ratified:true},relation:'METHOD',reviewEvidence:{sourceRef:'source-001'}}).ratified,false)});
test('H08 music cannot be spoofed as PMU',()=>{assert.equal(evaluateCanonHsnCandidate({clause,node:{...node,name:'PMU signal instrumentation'},relation:'RELATED',reviewEvidence:{sourceRef:'source-001'}}).reason,'KNOWN_HSN_FALSE_FRIEND')});
test('glyph alias cannot become authority',()=>{assert.equal(evaluateCanonHsnCandidate({clause,node,relation:'METHOD',claimedGlyph:{effect:'CANON',registryDigest:node.registryDigest,coordinate:node.coordinate},reviewEvidence:{sourceRef:'source-001'}}).status,'HOLD')});
test('historical H01 wrong name refused',()=>{const x=evaluateCanonHsnCandidate({clause,node:{...node,coordinate:'H01.S01.N01',name:'Consciousness & Cognition'},relation:'RELATED',reviewEvidence:{sourceRef:'source-001'}});assert.equal(x.reason,'KNOWN_HSN_FALSE_FRIEND')});
test('material review preserves exactly twelve house coverage and 1008/720 partition',()=>{const x=evaluateTwelveHouseReadiness({material:true,impacts,rights,stocks});assert.equal(x.houseCoverage,12);assert.equal(x.domainPositions+x.methodPositions,1728);assert.equal(x.materialOutcomeVerified,false)});
test('binding rights failure cannot be offset by house approvals',()=>{assert.equal(evaluateTwelveHouseReadiness({material:true,impacts,rights:[{state:'BLOCK'}],stocks}).status,'BLOCK')});
test('unknown rights and missing House are HOLD',()=>{assert.equal(evaluateTwelveHouseReadiness({material:true,impacts,rights:[{state:'UNKNOWN'}],stocks}).status,'HOLD');assert.equal(evaluateTwelveHouseReadiness({material:true,impacts:impacts.slice(1),rights,stocks}).status,'HOLD')});
test('unknown or double House is not 12D coverage',()=>{assert.equal(evaluateTwelveHouseReadiness({material:true,impacts:[...impacts.slice(0,11),impacts[0]],rights,stocks}).status,'HOLD');assert.equal(evaluateTwelveHouseReadiness({material:true,impacts:impacts.map((v,i)=>i===9?{...v,state:'UNKNOWN'}:v),rights,stocks}).status,'HOLD')});
test('empty rights and unsubstantiated reviewed house HOLD',()=>{assert.equal(evaluateTwelveHouseReadiness({material:true,impacts,rights:[],stocks}).status,'HOLD');assert.equal(evaluateTwelveHouseReadiness({material:true,impacts:impacts.map((v,i)=>i===5?{...v,sourceRefs:[]}:v),rights,stocks}).reason,'HOUSE_SOURCE_EVIDENCE_MISSING')});
test('resource ledger must close with units',()=>{assert.equal(evaluateTwelveHouseReadiness({material:true,impacts,rights,stocks:stocks.map(s=>({...s,closing:109}))}).reason,'PHYSICAL_STOCK_NOT_CLOSED');assert.equal(evaluateTwelveHouseReadiness({material:true,impacts,rights,stocks:stocks.map(s=>({...s,unit:''}))}).status,'HOLD')});
test('nonmaterial flag without reason HOLD, preventing evidence bypass',()=>{const x=evaluateTwelveHouseReadiness({material:false});assert.equal(x.reason,'NONMATERIAL_REASON_REQUIRED');assert.equal(x.authorityEffect,'NONE')});
test('nonmaterial reason is bounded and explicitly included in the review-only result',()=>{const x=evaluateTwelveHouseReadiness({material:false,materialReason:'This bounded local test has no measured material impact'});assert.equal(x.status,'NOT_APPLICABLE_WITH_REASON');assert.match(x.reason,/bounded local test/);assert.equal(x.authorityEffect,'NONE')});
test('directional physical stocks reject negative imports, regeneration and restoration',()=>{for(const field of ['imports','regeneration','restoration']){const stock={resource:'water',unit:'L',opening:100,imports:0,regeneration:0,restoration:0,withdrawals:0,losses:0,closing:100};stock[field]=-1;stock.closing=99;const x=evaluateTwelveHouseReadiness({material:true,impacts,rights,stocks:[stock]});assert.equal(x.reason,'RESOURCE_LEDGER_INVALID')}});

const synthetic1728=Array.from({length:12},(_,h)=>Array.from({length:12},(_,s)=>Array.from({length:12},(_,n)=>({
  coordinate:`H${String(h+1).padStart(2,'0')}.S${String(s+1).padStart(2,'0')}.N${String(n+1).padStart(2,'0')}`,
  kind:n<7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META',hasEvidence:h===0&&s===0&&n===0,
  sourceRefs:h===0&&s===0&&n===0?['synthetic:source-001']:[]
})))).flat(2);
test('full candidate HSN projects 1728 into distinct 12D domain/method tracks',()=>{
  const x=projectTypedHsnCoverage({registryEdition:'v0.7',registryDigest:ARIADNE_V07_SHA256,records:synthetic1728});
  assert.equal(x.status,'STRUCTURAL_CANDIDATE_ONLY');assert.equal(x.houses.length,12);
  assert.equal(x.houses[0].domain,84);assert.equal(x.houses[0].method,60);
  assert.equal(x.houses[0].domainWithSource,1);assert.equal(x.houses[1].domainWithSource,0);
  assert.equal(x.sourceBytesVerified,false);assert.equal(x.recoverableFrom12D,false);
});
test('projector holds partial and duplicated HSN records',()=>{
  const args={registryEdition:'v0.7',registryDigest:ARIADNE_V07_SHA256};
  assert.equal(projectTypedHsnCoverage({...args,records:synthetic1728.slice(1)}).status,'HOLD');
  assert.equal(projectTypedHsnCoverage({...args,records:[...synthetic1728.slice(1),synthetic1728[1]]}).status,'HOLD');
});
test('projector rejects incorrect epistemic/domain assignment',()=>{
  const records=synthetic1728.map((v,i)=>i===8?{...v,kind:'DOMAIN_SPECIALIZATION'}:v);
  assert.equal(projectTypedHsnCoverage({registryEdition:'v0.7',registryDigest:ARIADNE_V07_SHA256,records}).reason,'HSN_SPHERE_ROLE_DISTRIBUTION_INVALID');
});
test('claimed domain coverage without a source reference is held',()=>{
  const records=synthetic1728.map((v,i)=>i===0?{...v,sourceRefs:[]}:v);
  assert.equal(projectTypedHsnCoverage({registryEdition:'v0.7',registryDigest:ARIADNE_V07_SHA256,records}).reason,'HSN_SUPPORTED_WITHOUT_SOURCES');
});
