import test from 'node:test';import assert from 'node:assert/strict';import {WorkHostPort,prepareSwarmChatDraft,legacyPorts,PORT_STATES} from '../src/adapters.mjs';import {Hold} from '../src/index.mjs';
const scope={roomId:'room-test-01',sourceSeqs:[2,3]};
const identity={tenant:'tenant-test-01',account:'account-test-01',principal:'principal-test-01',mode:'WORK',purpose:'research',rightsEpoch:7};
const lease={...Object.fromEntries(['tenant','account','principal'].map(x=>[x,identity[x]])),allow:true,leaseId:'lease-01',epoch:7};
const make=(options={})=>new WorkHostPort({session:async()=>options.session||identity,admission:async ()=>options.admit||lease,
 read:async ()=>options.rows||[{tenant:identity.tenant,account:identity.account,roomId:scope.roomId,seq:2,sha256:'a'.repeat(64),body:'PRIVATE_TEST_BODY_SHOULD_NOT_BE_EXPORTED'},{tenant:identity.tenant,account:identity.account,roomId:scope.roomId,seq:3,sha256:'b'.repeat(64),body:'VERY_SECRET'}],
 egress:async ()=>options.egress||lease});
test('ported Work read returns only source pointers',async()=>{const r=await make().query(scope);assert.equal(r.status,PORT_STATES.READ);assert.equal(r.hostAuthenticated,false);assert.equal(r.data.sourceCount,2);assert.equal(JSON.stringify(r).includes('VERY_SECRET'),false);assert.equal(JSON.stringify(r).includes('PRIVATE_TEST_BODY'),false);});
test('Work route rejects forged request principal',async()=>assert.equal((await make().query({...scope,principal:'evil!!'})).status,'HOLD'));
test('Work route rejects Play',async()=>assert.equal((await make().query({...scope,purpose:'PLAY'})).status,'HOLD'));
test('Work route rejects negative seq',async()=>assert.equal((await make().query({...scope,sourceSeqs:[-1]})).status,'HOLD'));
test('Work route rejects overbroad seq',async()=>assert.equal((await make().query({...scope,sourceSeqs:[1,2,3,4,5,6,7]})).status,'HOLD'));
test('Work route denies missing initial grant',async()=>assert.equal((await make({admit:{allow:false}}).query(scope)).reason,'WORK_UNAVAILABLE'));
test('Work route denies revocation on return',async()=>assert.equal((await make({egress:{...lease,allow:false,epoch:8}}).query(scope)).reason,'WORK_UNAVAILABLE'));
test('Work route denies changed lease',async()=>assert.equal((await make({egress:{...lease,leaseId:'lease-02'}}).query(scope)).status,'HOLD'));
test('Work route denies changed epoch',async()=>assert.equal((await make({egress:{...lease,epoch:8}}).query(scope)).status,'HOLD'));
test('Work route rejects cross room data',async()=>{const p=make({rows:[{tenant:identity.tenant,account:identity.account,roomId:'other-room',seq:2,sha256:'a'.repeat(64)},{tenant:identity.tenant,account:identity.account,roomId:scope.roomId,seq:3,sha256:'b'.repeat(64)}]});assert.equal((await p.query(scope)).reason,'WORK_UNAVAILABLE');});
test('Work route rejects duplicate sequences',async()=>{const p=make({rows:[{tenant:identity.tenant,account:identity.account,roomId:scope.roomId,seq:2,sha256:'a'.repeat(64)},{tenant:identity.tenant,account:identity.account,roomId:scope.roomId,seq:2,sha256:'b'.repeat(64)}]});assert.equal((await p.query(scope)).reason,'WORK_UNAVAILABLE');});
test('Work route denies malformed port',()=>assert.throws(()=>new WorkHostPort({read:()=>[]})));
test('legacy ports must not trigger automatic migration',()=>{assert.equal(legacyPorts['sheldonbrain-rag-api'].dataMove,'OPT_IN_MIGRATION_ONLY');assert.equal(legacyPorts.swarmchat.dataMove,'NONE');});
test('draft requires actual source packet',()=>assert.throws(()=>prepareSwarmChatDraft({review:'ACCEPTED'},{roomId:'room-test-01'})));
test('draft holds invalid room',()=>assert.equal(prepareSwarmChatDraft({},{roomId:'invalid!'}).status,'HOLD'));
