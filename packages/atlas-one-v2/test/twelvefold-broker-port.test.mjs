import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createWorkRelayPort} from '../src/twelvefold-broker-port.mjs';
const file=process.env.ATLAS_TWELVEFOLD_WAVE_JSONL;
const p=file?JSON.parse(readFileSync(file,'utf8').split('\n')[0]):null;
const shouldSkip=!p;
const peer={roomId:'work-001',seq:14,memberId:'peer-001',mode:'WORK',hops:2};
const who={tenant:'tenant-001',account:'account-001',principal:'principal-001',memberId:'atlas-selfdeclared-visit-001',mode:'WORK',rightsEpoch:2,accountAuthenticated:true};
const room={roomId:'work-001',tenant:who.tenant,account:who.account,kind:'work',status:'open',expiresAt:'2026-11-24T00:00:00Z',maxHops:10,remainingMessages:100,remainingMemberMessages:15};
const consent={roomId:room.roomId,tenant:who.tenant,account:who.account,principal:who.principal,rightsEpoch:2,optIn:true,purpose:'WORK_REPLY'};
const report={text:'Independent exact-source check: bounded, reversible engineering proposal; local test receipt confirmed separately.',evidenceRefs:['github:source-commit']};
const when=Date.parse('2026-11-23T12:00:00Z');
function build(over={}){
 const sent=[],calls=[],reads=[];
 const permission={allow:true,tenant:who.tenant,account:who.account,principal:who.principal,epoch:2,leaseId:'lease-001'};
 const fn={
  session:async()=>over.session??who,
  room:async()=>over.room??room,
  readParent:async()=>{reads.push('PARENT_READ');return Object.hasOwn(over,'peer')?over.peer:peer},
  rights:async(scope,phase)=>{calls.push(phase);return (phase==='READ'?over.readGrant:over.returnGrant)??permission},
  post:async r=>{sent.push(r);if(over.throwPost)throw Error('ACK_LOST');return {roomId:r.roomId,seq:33}},
  readback:async id=>over.readback??{...sent[0],seq:33},
  clock:async()=>over.now??when,
 };
 return {port:createWorkRelayPort(fn),calls,sent,reads};
}
const run=async(over={},args={})=>{const b=build(over);return {...b,result:await b.port.respondOnce({delta:p,roomId:room.roomId,parentSeq:peer.seq,report,consent,...args})}};

test('publisher port requires all seven host callbacks',()=>assert.throws(()=>createWorkRelayPort({}),/ALL_HOST_CALLBACKS_REQUIRED/));
test('actual source packet can be checked before mock post', {skip:shouldSkip},async()=>{const r=await run();assert.equal(r.result.status,'HOST_CALLBACK_STORED_RECEIPT_SELF_REPORTED');assert.equal(r.sent.length,1);assert.deepEqual(r.calls,['READ','RETURN']);assert.equal(r.result.hostVerified,false)});
test('only one contribution per actual call', {skip:shouldSkip},async()=>{const b=build();const args={delta:p,roomId:room.roomId,parentSeq:peer.seq,report,consent};assert.equal((await b.port.respondOnce(args)).postAttempted,true);assert.equal((await b.port.respondOnce(args)).reason,'ONE_SUBSTANTIVE_CONTRIBUTION_PER_VISIT');assert.equal(b.sent.length,1)});
test('closed or expired room denies before post', {skip:shouldSkip},async()=>{for(const altered of [{room:{...room,status:'expired'}},{now:Date.parse(room.expiresAt)}]){const r=await run(altered);assert.equal(r.result.status,'HOLD');assert.equal(r.sent.length,0)}});
test('missing room quotas denies', {skip:shouldSkip},async()=>{const r=await run({room:{...room,remainingMessages:0}});assert.equal(r.result.status,'HOLD');assert.equal(r.sent.length,0)});
test('never reply to own member identity', {skip:shouldSkip},async()=>{const r=await run({peer:{...peer,memberId:who.memberId}});assert.equal(r.result.status,'HOLD');assert.equal(r.sent.length,0)});
test('hop cap refuses natural reply when exceeded', {skip:shouldSkip},async()=>{const r=await run({peer:{...peer,hops:10}});assert.equal(r.result.status,'HOLD');assert.equal(r.sent.length,0)});
test('non-work mode not accepted', {skip:shouldSkip},async()=>{const r=await run({session:{...who,mode:'PLAY'}});assert.equal(r.result.status,'HOLD');assert.equal(r.sent.length,0)});
test('consent cross-tenant denied', {skip:shouldSkip},async()=>{const r=await run({}, {consent:{...consent,tenant:'tenant-other'}});assert.equal(r.result.status,'HOLD');assert.equal(r.sent.length,0)});
test('host session missing fails closed', {skip:shouldSkip},async()=>{const r=await run({session:{...who,accountAuthenticated:false}});assert.equal(r.result.status,'HOLD');assert.equal(r.sent.length,0)});
test('read rights denied, no post', {skip:shouldSkip},async()=>{const r=await run({readGrant:{allow:false}});assert.equal(r.result.reason,'HOST_READ_RIGHTS_DENIED');assert.equal(r.sent.length,0)});
test('revoke between READ RETURN prevents post', {skip:shouldSkip},async()=>{const r=await run({returnGrant:{allow:false}});assert.equal(r.result.reason,'HOST_RETURN_RIGHTS_DENIED');assert.equal(r.sent.length,0)});
test('changed rights epoch prevents post', {skip:shouldSkip},async()=>{const r=await run({returnGrant:{allow:true,tenant:who.tenant,account:who.account,principal:who.principal,epoch:3,leaseId:'lease-001'}});assert.equal(r.result.status,'HOLD');assert.equal(r.sent.length,0)});
test('wrong readback parent must remain uncertain', {skip:shouldSkip},async()=>{const r=await run({readback:{roomId:room.roomId,seq:33,parentSeq:42,memberId:who.memberId,requestId:'invalid'}});assert.equal(r.result.status,'READBACK_MISMATCH_NO_RETRY');assert.equal(r.sent.length,1)});
test('lost ACK never blind retry', {skip:shouldSkip},async()=>{const r=await run({throwPost:true});assert.equal(r.result.status,'DELIVERY_UNCERTAIN_NO_RETRY');assert.equal(r.sent.length,1)});
test('invalid user evidence no post', {skip:shouldSkip},async()=>{const r=await run({}, {report:{text:'No evidence',evidenceRefs:[]}});assert.equal(r.result.status,'HOLD');assert.equal(r.sent.length,0)});
test('no peer message missing permits no fabricated reply', {skip:shouldSkip},async()=>{const r=await run({peer:null});assert.equal(r.result.status,'HOLD');assert.equal(r.sent.length,0)});
test('raw prepared malformed packet denied', {skip:shouldSkip},async()=>{const r=await run({}, {delta:{...p,nodeWaveDigest:'0'.repeat(64)}});assert.equal(r.result.reason,'SOURCE_PACKET_HASH_NOT_VERIFIED');assert.equal(r.sent.length,0)});

test('no private parent message is read when admission is denied', {skip:shouldSkip},async()=>{
 const r=await run({readGrant:{allow:false}});
 assert.equal(r.result.reason,'HOST_READ_RIGHTS_DENIED');assert.equal(r.reads.length,0);
});
test('private parent message read occurs only after READ admission', {skip:shouldSkip},async()=>{
 const stages=[];const permission={allow:true,tenant:who.tenant,account:who.account,principal:who.principal,epoch:2,leaseId:'lease-001'};
 const adapter=createWorkRelayPort({session:async()=>who,room:async()=>room,clock:async()=>when,
 rights:async(scope,phase)=>{stages.push(phase);return permission},
 readParent:async()=>{stages.push('PARENT_READ');return peer},
 post:async(r)=>{stages.push('POST');return {roomId:room.roomId,seq:33}},
 readback:async()=>({roomId:room.roomId,seq:33,parentSeq:peer.seq,memberId:who.memberId,requestId:'invalid'})});
 await adapter.respondOnce({delta:p,roomId:room.roomId,parentSeq:peer.seq,report,consent});
 assert.deepEqual(stages,['READ','PARENT_READ','RETURN','POST']);
});
