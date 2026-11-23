import test from 'node:test';
import assert from 'node:assert/strict';
import {WorkHostPort,PORT_STATES} from '../src/adapters.mjs';
const a={tenant:'tenant-a',account:'account-a',principal:'user-a',mode:'WORK',purpose:'research',rightsEpoch:7};
const grant={tenant:a.tenant,account:a.account,principal:a.principal,allow:true,leaseId:'lease-001',epoch:7};
const request={roomId:'room-test-01',sourceSeqs:[3]};
const row={tenant:a.tenant,account:a.account,roomId:request.roomId,seq:3,sha256:'a'.repeat(64)};
function port({second=a,secondThrows=false,egress=grant,track=[]}={}){let n=0;
  return new WorkHostPort({session:()=>{n++;track.push('session');if(n>1){if(secondThrows)throw Error('missing');return second}return a;},
    admission:()=>{track.push('admission');return grant;},
    read:()=>{track.push('read');return [row]},
    egress:()=>{track.push('egress');return egress}});
}
test('baseline current account returns source-only pointers',async()=>{const track=[];const r=await port({track}).query(request);assert.equal(r.status,PORT_STATES.READ);assert.equal(r.hostAuthenticated,false);assert.deepEqual(track,['session','admission','read','session','egress']);});
test('account switches A→B after READ while stale egress ALLOW A',async()=>{const track=[];const r=await port({second:{...a,account:'account-b'},track}).query(request);assert.equal(r.status,'HOLD');assert.equal(r.reason,'REVOKED_OR_STALE_EPOCH_AT_RETURN');assert.equal(r.data,null);assert.deepEqual(track,['session','admission','read','session']);});
test('principal switches during read',async()=>{const r=await port({second:{...a,principal:'user-b'}}).query(request);assert.equal(r.status,'HOLD')});
test('tenant switches during read',async()=>{const r=await port({second:{...a,tenant:'tenant-b'}}).query(request);assert.equal(r.status,'HOLD')});
test('rights epoch revokes or regrants between READ and RETURN',async()=>{for(const epoch of [8,9]){const r=await port({second:{...a,rightsEpoch:epoch}}).query(request);assert.equal(r.status,'HOLD');}});
test('session unavailable after READ denies with zero egress',async()=>{const track=[];const r=await port({secondThrows:true,track}).query(request);assert.equal(r.status,'HOLD');assert.equal(r.data,null);assert.ok(!track.includes('egress'));});
test('mode switched to PLAY cannot enter Work return',async()=>{const r=await port({second:{...a,mode:'PLAY'}}).query(request);assert.equal(r.status,'HOLD')});
test('purpose switch cannot survive return',async()=>{const r=await port({second:{...a,purpose:'other'}}).query(request);assert.equal(r.status,'HOLD')});
test('a stale egress callback still cannot prove live sink fencing',async()=>{const r=await port().query(request);assert.equal(r.hostAuthenticated,false);assert.equal(r.rightsProof,'HOST_CALLBACK_REPORTED_NOT_INDEPENDENTLY_ATTESTED');});
