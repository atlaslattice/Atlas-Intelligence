import test from 'node:test';import assert from 'node:assert/strict';
import {prepareWorkHandoff,prepareFourSystemContract,ARIADNE_REGISTRY_SHA} from '../src/twelvefold-work-port.mjs';
const fresh=()=>({node:{coordinate:'H01.S01.N01',digest:'a'.repeat(64),sourceEdition:'Ariadne v0.7',registrySha:ARIADNE_REGISTRY_SHA,mode:'WORK',passCount:12},
 source:{roomId:'room-work-01',seq:5,requestId:'source-req-1',digest:'b'.repeat(64),kind:'WORK'},
 room:{roomId:'room-work-01',kind:'work',status:'open',expiresAt:'2031-11-25T21:00:00Z',tenant:'tenant-01',account:'account-01'},
 session:{tenant:'tenant-01',account:'account-01',principal:'principal-01',rightsEpoch:7,mode:'WORK'},
 rights:{read:true,returnRight:true,consent:true,rightsEpoch:7},passId:'P12',nowMs:Date.parse('2031-11-23T19:00:00Z')});
const holds=(v)=>{assert.equal(prepareWorkHandoff(v).status,'HOLD');assert.equal(prepareWorkHandoff(v).reviewIntent,null)};
test('dry run prepares source-addressed Work intent and DOES NOT post',()=>{let r=prepareWorkHandoff(fresh());assert.equal(r.status,'PREPARED_ONLY_HOST_RECHECK_REQUIRED');assert.equal(r.postsPerformed,0);assert.equal(r.hostAuthenticated,false);assert.equal(r.reviewIntent.workAccessVerifiedByHost,false);assert.equal(r.reviewIntent.needsFreshReturnRecheck,true);assert.equal(r.content,null);});
test('stable same input idempotency key',()=>{assert.equal(prepareWorkHandoff(fresh()).reviewIntent.proposedRequestId,prepareWorkHandoff(fresh()).reviewIntent.proposedRequestId)});
test('different node SHA changes proposal identity',()=>{const x=fresh(),y=fresh();y.node.digest='c'.repeat(64);assert.notEqual(prepareWorkHandoff(x).reviewIntent.proposedRequestId,prepareWorkHandoff(y).reviewIntent.proposedRequestId)});
test('non Work sphere never prepared',()=>{for(const mode of ['PLAY','SOCIAL','IMAGINE','DREAM','QUIET']){let x=fresh();x.node.mode=mode;holds(x)}});
test('private Work source masquerade held',()=>{let x=fresh();x.source.kind='PLAY';holds(x)});
test('wrong tenant or account held',()=>{let x=fresh();x.session.account='another-01';holds(x);x=fresh();x.session.tenant='another-01';holds(x)});
test('wrong source room held',()=>{let x=fresh();x.source.roomId='room-work-02';holds(x)});
test('denied return or read held',()=>{for(const key of ['read','returnRight','consent']){let x=fresh();x.rights[key]=false;holds(x)}});
test('rights epoch drift held',()=>{let x=fresh();x.rights.rightsEpoch=8;holds(x)});
test('expired or closed room held',()=>{let x=fresh();x.nowMs=Date.parse(x.room.expiresAt);holds(x);x=fresh();x.room.status='closed';holds(x)});
test('extra body and private field fail closed',()=>{let x=fresh();x.node.privateBody='must-not-be-ingested';holds(x);x=fresh();x.source.playRoomId='secret';holds(x)});
test('getters and proxies refused without invoking',()=>{let called=0,x=fresh();Object.defineProperty(x.node,'digest',{get(){called++;return 'a'.repeat(64)},enumerable:true});holds(x);assert.equal(called,0);x=fresh();x.node=new Proxy(x.node,{ownKeys(){throw Error('secret')}});holds(x)});
test('symbol keys refused and no body leaked',()=>{let x=fresh();x.source[Symbol('private')]='PRIVATE';holds(x)});
test('wrong registry or source digest held',()=>{let x=fresh();x.node.registrySha='0'.repeat(64);holds(x);x=fresh();x.source.digest='invalid';holds(x)});
test('invalid pass/node shape held',()=>{let x=fresh();x.passId='P13';holds(x);x=fresh();x.node.coordinate='H13.S01.N01';holds(x)});
test('candidate four-system interface never grants authority',()=>{const c=prepareFourSystemContract({coordinate:'H08.S01.N10',digest:'a'.repeat(64)});assert.equal(c.status,'SOURCE_ONLY_NOT_HOSTED');assert.deepEqual(Object.keys(c.adapters).sort(),['Ariadne','AtlasONE','IronEmpire','SwarmChat']);assert.equal(c.workPosts,0);assert.equal(c.privateBodyImports,0)});
test('four-system interface optional modes held',()=>{for(const mode of ['IMAGINE','QUIET','PLAY'])assert.equal(prepareFourSystemContract({coordinate:'H01.S01.N01',digest:'a'.repeat(64),mode}).status,'HOLD')});
test('all 12 passes can generate proposal ids without live effects',()=>{for(let pass=1;pass<=12;pass++){let x=fresh();x.passId='P'+String(pass).padStart(2,'0');const r=prepareWorkHandoff(x);assert.equal(r.status,'PREPARED_ONLY_HOST_RECHECK_REQUIRED');assert.equal(r.postsPerformed,0)}});
test('prototype pollution or untrusted root rejected',()=>{let x=fresh();x={...x,constructor:'not legit'};holds(x);x=fresh();Object.setPrototypeOf(x,Date.prototype);holds(x)});
