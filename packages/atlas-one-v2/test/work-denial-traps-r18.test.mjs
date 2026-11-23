/** R18: user/host proxy traps must not reject a fail-closed Work query.
 * Synthetically injected callbacks only; not an authenticated host/D1 test.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {WorkHostPort,PORT_STATES} from '../src/adapters.mjs';
const HASH='a'.repeat(64);
const req=()=>({roomId:'work-001',sourceSeqs:[5]});
const session=()=>({tenant:'tenant-001',account:'account-001',principal:'principal-001',mode:'WORK',purpose:'research',rightsEpoch:1});
const permit=()=>({tenant:'tenant-001',account:'account-001',principal:'principal-001',allow:true,leaseId:'lease-001',epoch:1});
const row=()=>({tenant:'tenant-001',account:'account-001',roomId:'work-001',seq:5,sha256:HASH});
const make=(c={})=>new WorkHostPort({session:async()=>session(),admission:async()=>permit(),read:async()=>[row()],egress:async()=>permit(),...c});
const hold=async p=>assert.deepEqual(await p,{schema:'atlas.one.host-port/v2',status:'HOLD',reason:'WORK_UNAVAILABLE',hostAuthenticated:false,postPerformed:false,canonEffect:'NONE',data:null});
const boom=()=>{throw Error('synthetic trap')};
test('R18 control: ordinary request remains a nonattested local READ',async()=>{
 const out=await make().query(req());assert.equal(out.status,PORT_STATES.READ);assert.equal(out.hostAuthenticated,false);
});
test('R18 caller ownKeys trap resolves HOLD',async()=>{
 await hold(make().query(new Proxy(req(),{ownKeys:boom})));
});
test('R18 options ownKeys trap resolves HOLD',async()=>{
 await hold(make().query(req(),new Proxy({}, {ownKeys:boom})));
});
test('R18 caller field getter resolves HOLD',async()=>{
 await hold(make().query({...req(),get roomId(){return boom()}}));
});
test('R18 signal getter resolves HOLD',async()=>{
 await hold(make().query(req(),{get signal(){return boom()}}));
});
test('R18 rows length trap resolves HOLD without egress',async()=>{
 let egress=0;const rows=new Proxy([row()],{get(target,p,receiver){if(p==='length')return boom();return Reflect.get(target,p,receiver)}});
 await hold(make({read:async()=>rows,egress:async()=>{egress++;return permit()}}).query(req()));assert.equal(egress,0);
});
test('R18 rows iterator trap resolves HOLD without egress',async()=>{
 let egress=0;const rows=new Proxy([row()],{get(target,p,receiver){if(p===Symbol.iterator)return boom();return Reflect.get(target,p,receiver)}});
 await hold(make({read:async()=>rows,egress:async()=>{egress++;return permit()}}).query(req()));assert.equal(egress,0);
});
test('R18 rows index accessor resolves HOLD without egress',async()=>{
 let egress=0;const rows=[row()];Object.defineProperty(rows,'0',{get:boom});
 await hold(make({read:async()=>rows,egress:async()=>{egress++;return permit()}}).query(req()));assert.equal(egress,0);
});
test('R18 control: invalid room remains uniform HOLD',async()=>{
 await hold(make().query({roomId:'bad+room',sourceSeqs:[5]}));
});
