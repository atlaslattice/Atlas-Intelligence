/** Source-local boundary regression: a callback or request must not change
 * an already-validated authority/source value before output construction.
 * These tests use synthetic callbacks, NOT independently hosted IAM/D1.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {WorkHostPort,PORT_STATES} from '../src/adapters.mjs';
const H='a'.repeat(64);
const identity=()=>({tenant:'tenant-001',account:'account-001',principal:'principal-001',mode:'WORK',purpose:'research',rightsEpoch:1});
const permit=()=>({tenant:'tenant-001',account:'account-001',principal:'principal-001',allow:true,leaseId:'lease-001',epoch:1});
const row=()=>({tenant:'tenant-001',account:'account-001',roomId:'work-001',seq:5,sha256:H});
const request={roomId:'work-001',sourceSeqs:[5]};
const make=(c={})=>new WorkHostPort({session:async()=>identity(),admission:async()=>permit(),read:async()=>[row()],egress:async()=>permit(),...c});
const hold=x=>assert.deepEqual(x,{schema:'atlas.one.host-port/v2',status:'HOLD',reason:'WORK_UNAVAILABLE',hostAuthenticated:false,postPerformed:false,canonEffect:'NONE',data:null});

test('R17 control: plain host records succeed without external authentication claim',async()=>{
 const r=await make().query(request);assert.equal(r.status,PORT_STATES.READ);assert.equal(r.hostAuthenticated,false);assert.equal(r.data.references[0].sourceSHA256,H);
});
test('R17 negative: changing SHA getter cannot publish value different from validated digest',async()=>{
 let reads=0;const altered={...row(),get sha256(){return ++reads<=2?H:'UNVALIDATED_DIGEST';}};
 const r=await make({read:async()=>[altered]}).query(request);
 if(r.status===PORT_STATES.READ)assert.match(r.data.references[0].sourceSHA256,/^[a-f0-9]{64}$/);
 else hold(r);
});
test('R17 negative: accessor row is rejected without invoking getter or egress',async()=>{
 let reads=0,egress=0;const altered={...row(),get seq(){reads++;return 5;}};
 hold(await make({read:async()=>[altered],egress:async()=>{egress++;return permit();}}).query(request));
 assert.equal(reads,0);assert.equal(egress,0);
});
test('R17 negative: session tenant accessor cannot switch after validation',async()=>{
 let reads=0;const id={...identity(),get tenant(){return ++reads<=2?'tenant-001':'swapped-tenant';}};
 hold(await make({session:async()=>id}).query(request));assert.equal(reads,0);
});
test('R17 negative: admission lease accessor cannot mutate after snapshot',async()=>{
 let reads=0;const p={...permit(),get leaseId(){return ++reads<=2?'lease-001':'tampered-lease';}};
 hold(await make({admission:async()=>p}).query(request));assert.equal(reads,0);
});
test('R17 negative: egress grant accessor is rejected before use',async()=>{
 let reads=0;const p={...permit(),get allow(){reads++;return true;}};
 hold(await make({egress:async()=>p}).query(request));assert.equal(reads,0);
});
test('R17 control: pre-aborted request rejects before callbacks',async()=>{
 const controller=new AbortController();controller.abort();let called=0;
 const r=await make({session:async()=>{called++;return identity();}}).query(request,{signal:controller.signal});
 hold(r);assert.equal(called,0);
});
test('R17 negative: request seq getter cannot alter selected source after admission validation',async()=>{
 let reads=0;const seqs=[5];Object.defineProperty(seqs,0,{enumerable:true,configurable:true,get(){return ++reads<=2?5:6;}});
 let admittedSeq=null;const port=make({admission:async scope=>{admittedSeq=[...scope.sourceSeqs];return permit();},read:async scope=>[{...row(),seq:scope.sourceSeqs[0]}]});
 const r=await port.query({roomId:'work-001',sourceSeqs:seqs});
 assert.equal(r.status,PORT_STATES.READ);assert.deepEqual(admittedSeq,[5]);assert.equal(r.data.references[0].seq,5);
});

test('R17 negative: hostile callback descriptor trap returns HOLD, not a rejected query',async()=>{
 let egress=0;const hostile=new Proxy({}, {getPrototypeOf(){throw new Error('trap');}});
 const port=make({read:async()=>[hostile],egress:async()=>{egress++;return permit();}});
 hold(await port.query(request));assert.equal(egress,0);
});
