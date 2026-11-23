/** Synthetic Work-denial envelope conformance, never host/D1/privacy attestation.
 * The source-only adapter cannot mask timing/callback count/cache/outbox side
 * channels. The publisher must implement those independently at egress.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {WorkHostPort,PORT_STATES} from '../src/adapters.mjs';
const scope={roomId:'work-room-001',sourceSeqs:[2,3]};
const principal={tenant:'tenant-001',account:'account-001',principal:'principal-001',mode:'WORK',purpose:'research',rightsEpoch:8};
const lease={tenant:principal.tenant,account:principal.account,principal:principal.principal,allow:true,leaseId:'lease-001',epoch:8};
const rows=[2,3].map(seq=>({tenant:principal.tenant,account:principal.account,roomId:scope.roomId,seq,sha256:'a'.repeat(64),body:'PRIVATE_CANARY_DO_NOT_EXPORT'}));
function make(mode,rights='allowed'){
 const events=[];
 const port=new WorkHostPort({
  session:async()=>{events.push('session');return principal;},
  admission:async()=>{events.push('admission');return lease;},
  read:async()=>{events.push('read');if(mode==='throw')throw Error('private');if(mode==='empty')return [];if(mode==='wrong-account')return [{...rows[0],account:'account-other'},rows[1]];if(mode==='duplicate')return [rows[0],rows[0]];return rows;},
  egress:async()=>{events.push('egress');return {...lease,allow:rights==='allowed'};}
 });
 return {port,events};
}
const fixture=['throw','empty','wrong-account','duplicate','valid'];
for(const source of fixture){
 for(const rights of ['allowed','revoked']){
  test('source-only 5x2 denial matrix: '+source+' / '+rights,async()=>{
   const {port,events}=make(source,rights);
   const result=await port.query(scope);
   if(source==='valid'&&rights==='allowed'){
    assert.equal(result.status,PORT_STATES.READ);
    assert.equal(result.hostAuthenticated,false);
    assert.equal(result.data.sourceCount,2);
   }else{
    assert.deepEqual(result,{schema:'atlas.one.host-port/v2',status:'HOLD',reason:'WORK_UNAVAILABLE',hostAuthenticated:false,postPerformed:false,canonEffect:'NONE',data:null});
   }
   assert.equal(JSON.stringify(result).includes('PRIVATE_CANARY'),false);
   // This structural difference is intentional evidence of a remaining
   // callback/timing side channel, not a claim of host indistinguishability.
   assert.equal(events.includes('egress'),source==='valid');
  });
 }
}
test('query shape errors cannot be used as Work source existence oracle',async()=>{
 const {port,events}=make('valid');
 const response=await port.query({...scope,principal:'forged'});
 assert.equal(response.reason,'WORK_UNAVAILABLE');
 assert.deepEqual(events,[]);
});
test('denied admission and missing session have same public envelope',async()=>{
 const p=new WorkHostPort({session:async()=>principal,admission:async()=>({...lease,allow:false}),read:async()=>rows,egress:async()=>lease});
 const q=new WorkHostPort({session:async()=>null,admission:async()=>lease,read:async()=>rows,egress:async()=>lease});
 assert.deepEqual(await p.query(scope),await q.query(scope));
});
test('read can switch to another principal; second session denies without emitting data',async()=>{
 let sessionCount=0,egressCount=0;
 const p=new WorkHostPort({session:async()=>++sessionCount===1?principal:{...principal,principal:'principal-002'},admission:async()=>lease,read:async()=>rows,egress:async()=>{egressCount++;return lease}});
 const r=await p.query(scope);assert.equal(r.reason,'WORK_UNAVAILABLE');
 assert.equal(egressCount,0);assert.equal(r.data,null);
});
test('source-only privacy claim stays false even on a positive mock',async()=>{
 const {port}=make('valid');const r=await port.query(scope);
 assert.equal(r.hostAuthenticated,false);assert.equal(r.rightsProof,'HOST_CALLBACK_REPORTED_NOT_INDEPENDENTLY_ATTESTED');assert.equal(r.postPerformed,false);
});
