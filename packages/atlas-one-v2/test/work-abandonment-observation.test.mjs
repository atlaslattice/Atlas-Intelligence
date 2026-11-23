/** Source-only optional AbortSignal observation. Not a D1, receiver, or sink test.
 * Preserve the negative case: a queued/committed egress effect cannot be
 * undone merely because WorkHostPort eventually returns HOLD.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {WorkHostPort,PORT_STATES} from '../src/adapters.mjs';
const request={roomId:'work-room-001',sourceSeqs:[5]};
const identity={tenant:'tenant-001',account:'account-001',principal:'principal-001',mode:'WORK',purpose:'research',rightsEpoch:1};
const permit={tenant:identity.tenant,account:identity.account,principal:identity.principal,allow:true,leaseId:'lease-001',epoch:1};
const rows=[{tenant:identity.tenant,account:identity.account,roomId:request.roomId,seq:5,sha256:'a'.repeat(64),body:'PRIVATE_CANARY'}];
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}};
function callbacks(overrides={}){
  const called=[];
  const calls={
    session:async()=>{called.push('session');return identity},
    admission:async()=>{called.push('admission');return permit},
    read:async()=>{called.push('read');return rows},
    egress:async()=>{called.push('egress');return permit},
    ...overrides
  };
  return {port:new WorkHostPort(calls),called};
}
function isHold(res){
  assert.deepEqual(res,{schema:'atlas.one.host-port/v2',status:'HOLD',
    reason:'WORK_UNAVAILABLE',hostAuthenticated:false,postPerformed:false,
    canonEffect:'NONE',data:null});
}
test('old one-argument query behavior remains source-only',async()=>{
  const {port}=callbacks();const x=await port.query(request);
  assert.equal(x.status,PORT_STATES.READ);assert.equal(x.hostAuthenticated,false);
});
test('unaborted real AbortSignal preserves current source-only behavior',async()=>{
  const controller=new AbortController();const {port}=callbacks();
  assert.equal((await port.query(request,{signal:controller.signal})).status,PORT_STATES.READ);
});
test('pre-aborted query refuses all callbacks',async()=>{
  const controller=new AbortController();controller.abort();
  const {port,called}=callbacks();isHold(await port.query(request,{signal:controller.signal}));
  assert.deepEqual(called,[]);
});
test('forged signal object is rejected before callbacks',async()=>{
  const {port,called}=callbacks();isHold(await port.query(request,{signal:{aborted:false}}));
  assert.deepEqual(called,[]);
});
test('forged authority in options is rejected before callbacks',async()=>{
  const {port,called}=callbacks();isHold(await port.query(request,{principal:'bad',signal:undefined}));
  assert.deepEqual(called,[]);
});
test('signal cannot be smuggled into public source-request shape',async()=>{
  const {port,called}=callbacks();
  isHold(await port.query({...request,signal:new AbortController().signal}));
  assert.deepEqual(called,[]);
});
test('null options uniformly hold rather than throwing',async()=>{
  const {port,called}=callbacks();isHold(await port.query(request,null));
  assert.deepEqual(called,[]);
});
for(const stage of ['session','admission','read','egress']){
  test('client abandonment during '+stage+' returns HOLD',async()=>{
    const waiting=deferred(),entered=deferred(),controller=new AbortController();
    let committed=0;const base=callbacks();
    const orig=async()=>{
      if(stage==='session')return identity;
      if(stage==='admission'||stage==='egress')return permit;
      return rows;
    };
    const replaced=async()=>{
      entered.resolve();await waiting.promise;
      if(stage==='egress')committed++; // DELIBERATELY proves late abort cannot undo sink effect
      return orig();
    };
    const overrides={[stage]:replaced};
    let egressCalls=0;
    if(stage!=='egress')overrides.egress=async()=>{egressCalls++;return permit};
    const {port}=callbacks(overrides);
    const inFlight=port.query(request,{signal:controller.signal});
    await entered.promise;controller.abort();waiting.resolve();
    isHold(await inFlight);
    if(stage!=='egress')assert.equal(egressCalls,0);
    else assert.equal(committed,1); // HOLD does not imply no remote effect
  });
}
test('real revoked egress remains a HOLD regardless of signal',async()=>{
  const {port}=callbacks({egress:async()=>({...permit,allow:false})});
  isHold(await port.query(request,{signal:new AbortController().signal}));
});
test('aborting after completed source result does not retract already returned data',async()=>{
  const controller=new AbortController();const {port}=callbacks();
  const x=await port.query(request,{signal:controller.signal});controller.abort();
  assert.equal(x.status,PORT_STATES.READ);
});
