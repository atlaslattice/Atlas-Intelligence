import {test} from 'node:test';import assert from 'node:assert/strict';
import {ARIADNE_SOURCE_SHA256,WAVE_IDS,FOUR_SYSTEMS,validateStructuralNodeDelta,prepareSwarmChatHandoff,validateWaveReceiptSummary,prepareFourSystemCascade,validateCandidateLink,verifyNodeWaveDigest} from '../src/twelvefold-port.mjs';
const base={nodeId:'H01.S01.N01',houseId:'H01',sphereId:'H01.S01',kind:'DOMAIN_SPECIALIZATION',wave:'R09',registrySha256:ARIADNE_SOURCE_SHA256,
 nodeRecordSha256:'a'.repeat(64),previousNodeWaveDigest:'b'.repeat(64),nodeWaveDigest:'c'.repeat(64),
 acceptanceGate:'SOURCE_DIGEST_AND_VERSION',semanticReviewAccepted:false,realPeerMacroturnPerformed:false,hostedVerified:false,canonAdopted:false,storyCanonLocked:false,protectedModesIngested:false,rightsEffect:'NONE',
 fourSystemIncrementalWork:Object.fromEntries(FOUR_SYSTEMS.map(s=>[s,{proposal:`Synthetic bounded proposal for ${s}`,status:'PROPOSED_NOT_IMPLEMENTED_IN_HOST'}]))};
const room={roomId:'room-test-123',tenant:'tenant-123',account:'acct-123',kind:'work',status:'open',expiresAt:'2026-11-24T00:00:00Z',remainingMessages:300,remainingMemberMessages:28,maxHops:10};
const session={tenant:'tenant-123',account:'acct-123',principal:'princ-123',rightsEpoch:3,mode:'WORK'};
const join={roomId:room.roomId,tenant:room.tenant,account:room.account,principal:session.principal,rightsEpoch:3,authenticatedByHost:true};
const consent={optIn:true,roomId:room.roomId,tenant:room.tenant,account:room.account,principal:session.principal,rightsEpoch:3,purpose:'WORK_EVENT',termsDigest:'1'.repeat(64)};
const now=Date.parse('2026-11-23T00:00:00Z');const f=(overrides={})=>prepareSwarmChatHandoff({delta:base,room,hostContext:session,join,consent,nowMs:now,...overrides});

test('exact 12 wave names',()=>assert.deepEqual(WAVE_IDS,Array.from({length:12},(_,i)=>`R${String(i+9).padStart(2,'0')}`)));
test('four system ports separate',()=>assert.deepEqual(FOUR_SYSTEMS,['SwarmChat','Atlas_ONE','Ariadne','Iron_Empire']));
test('synthetic source shape candidate, never authenticated',()=>{const v=validateStructuralNodeDelta(base);assert.equal(v.status,'SOURCE_CANDIDATE_VALIDATED_STRUCTURALLY');assert.equal(v.testedSourceBytesHere,false);assert.equal(v.canonEffect,'NONE')});
test('wrong HSN house and sphere fail',()=>{for(const change of [{houseId:'H02'},{sphereId:'H01.S02'},{nodeId:'H00.S01.N01'}])assert.equal(validateStructuralNodeDelta({...base,...change}).status,'HOLD')});
test('wrong original source and wrong kind fail',()=>{for(const change of [{registrySha256:'0'.repeat(64)},{kind:'EXTRA'}])assert.equal(validateStructuralNodeDelta({...base,...change}).status,'HOLD')});
test('unknown wave and digest fail',()=>{for(const change of [{wave:'R21'},{nodeWaveDigest:'bad'},{previousNodeWaveDigest:'no'}])assert.equal(validateStructuralNodeDelta({...base,...change}).status,'HOLD')});
test('no forged hosted/semantic/canon status',()=>{for(const k of ['hostedVerified','semanticReviewAccepted','canonAdopted','storyCanonLocked','realPeerMacroturnPerformed','protectedModesIngested'])assert.equal(validateStructuralNodeDelta({...base,[k]:true}).reason,'UNVERIFIED_AUTHORITY_OR_PRIVATE_CONTENT')});
test('missing system proposal fails',()=>assert.equal(validateStructuralNodeDelta({...base,fourSystemIncrementalWork:{SwarmChat:base.fourSystemIncrementalWork.SwarmChat}}).status,'HOLD'));
test('valid handoff remains not sent, not live auth',()=>{const r=f();assert.equal(r.status,'PREPARED_NOT_POSTED');assert.equal(r.messagePosted,false);assert.equal(r.subscriptionInstalled,false);assert.equal(r.modelWoke,false);assert.equal(r.hostAuthentication,'CALLER_CLAIM_NOT_ATTESTED')});
test('expired room fail closed',()=>assert.equal(f({nowMs:Date.parse(room.expiresAt)}).status,'HOLD'));
test('stopped or full room fail closed',()=>{for(const changed of [{...room,status:'stopped'},{...room,remainingMessages:0},{...room,remainingMemberMessages:0}])assert.equal(f({room:changed}).status,'HOLD')});
test('non-work room cannot carry Work handoff',()=>assert.equal(f({room:{...room,kind:'play'}}).status,'HOLD'));
test('reject forged account or principal',()=>{for(const change of [{account:'acct-oth'},{principal:'princ-oth'},{tenant:'tenant-oth'}])assert.equal(f({hostContext:{...session,...change}}).status,'HOLD')});
test('reject expired permission epoch',()=>assert.equal(f({join:{...join,rightsEpoch:2}}).status,'HOLD'));
test('reject cross-account subscription consent',()=>assert.equal(f({consent:{...consent,account:'acct-oth'}}).status,'HOLD'));
test('reject missing or declined opt in',()=>{for(const c of [{...consent,optIn:false},{...consent,purpose:'PLAY_EVENT'},(({tenant,...rest})=>rest)(consent)])assert.equal(f({consent:c}).status,'HOLD')});
test('stable intent digest for exact same inputs',()=>assert.equal(f().intentDigest,f().intentDigest));
test('source/read/rights epoch changes alter intent digest',()=>assert.notEqual(f().intentDigest,f({room:{...room,expiresAt:'2026-11-25T00:00:00Z'}}).intentDigest));
test('four distinct proposed work routes',()=>{const c=prepareFourSystemCascade(base);assert.equal(c.status,'CANDIDATE_NOT_POSTED');assert.equal(Object.keys(c.work).length,4);assert.equal(c.peerExchange,'NOT_PERFORMED');assert.equal(c.canonEffect,'NONE')});
test('cascade node to sphere to house structural only',()=>{const c=prepareFourSystemCascade(base);assert.equal(c.ancestry.toSphere,'H01.S01');assert.equal(c.ancestry.toHouse,'H01');assert.equal(c.ancestry.relation,'STRUCTURAL_ONLY')});
test('prevent forged SAME_AS or CANON link',()=>{for(const relation of ['SAME_AS','CANON','AUTHENTICATED_RESIDENT'])assert.equal(validateCandidateLink({from:'H01',to:'H02',relation,authorityEffect:'NONE'}).status,'HOLD')});
test('permit only typed unreviewed lexical link',()=>{const p=validateCandidateLink({from:'H01.S01',to:'H02.S01.N01',relation:'LEXICAL_CANDIDATE_NOT_SAME_AS',authorityEffect:'NONE',reviewAccepted:false});assert.equal(p.status,'SOURCE_RELATION_CANDIDATE')});
test('lexical semantic assertion cannot be accepted by candidate port',()=>assert.equal(validateCandidateLink({from:'H01.S01',to:'H02.S01.N01',relation:'LEXICAL_CANDIDATE_NOT_SAME_AS',authorityEffect:'NONE',reviewAccepted:true}).reason,'LEXICAL_NOT_REVIEWED'));
test('valid 12 source receipts are summary only, not source verification',()=>{const w=WAVE_IDS.map((wave,i)=>({wave,prevStateSha256:(i?'e':'d').repeat(64),stateSha256:'e'.repeat(64),realPeerVisitsCompleted:0,hostedIntegrations:0,nodeWorkDeltasGenerated:1728,totalComputationalEvaluations:269568}));const r=validateWaveReceiptSummary({waves:w,sourceRegistryDigest:ARIADNE_SOURCE_SHA256});assert.equal(r.computationalComparisons,3234816);assert.equal(r.actualModelMacroturnVisits,0);assert.equal(r.recomputationOfRawSourcePerformed,false)});
test('broken source receipt lineage refuses count',()=>{const w=WAVE_IDS.map((wave,i)=>({wave,prevStateSha256:(i?'e':'d').repeat(64),stateSha256:'e'.repeat(64),realPeerVisitsCompleted:0,hostedIntegrations:0,nodeWorkDeltasGenerated:1728,totalComputationalEvaluations:269568}));w[7].prevStateSha256='9'.repeat(64);assert.equal(validateWaveReceiptSummary({waves:w,sourceRegistryDigest:ARIADNE_SOURCE_SHA256}).status,'HOLD')});
test('fake wave human visit refuses count',()=>{const w=WAVE_IDS.map((wave,i)=>({wave,prevStateSha256:(i?'e':'d').repeat(64),stateSha256:'e'.repeat(64),realPeerVisitsCompleted:0,hostedIntegrations:0,nodeWorkDeltasGenerated:1728,totalComputationalEvaluations:269568}));w[2].realPeerVisitsCompleted=1;assert.equal(validateWaveReceiptSummary({waves:w,sourceRegistryDigest:ARIADNE_SOURCE_SHA256}).status,'HOLD')});

test('mismatched untrusted digest is not source-verified',()=>assert.equal(verifyNodeWaveDigest(base).reason,'NODE_WAVE_DIGEST_MISMATCH'));
test('getter payload denied at canonical boundary without invocation',()=>{
 let invoked=0;const x={...base};Object.defineProperty(x,'sideEffect',{enumerable:true,get(){invoked++;throw Error('should never run')}});
 assert.equal(verifyNodeWaveDigest(x).status,'HOLD');assert.equal(invoked,0);
});
test('cyclic forged packet denied',()=>{const x={...base};x.cycle=x;assert.equal(verifyNodeWaveDigest(x).status,'HOLD')});
