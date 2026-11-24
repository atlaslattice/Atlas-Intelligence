import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {WorkFullBodySearchPort} from '../src/work-search.mjs';
const identity={tenant:'tenant-a',account:'account-a',principal:'principal-a',mode:'WORK',purpose:'research',rightsEpoch:2};
const roomId='synthetic-room';
function row(seq,body){return {tenant:identity.tenant,account:identity.account,roomId,kind:'WORK',seq,body,bodySHA256:createHash('sha256').update(body).digest('hex')};}
function make(mutate=()=>{},allow=true){
 const page={rows:[row(1,'🌊 needle'),row(2,'other')],nextAfterSeq:2,hasMore:true};
 const port=new WorkFullBodySearchPort({session:async()=>({...identity}),admission:async()=>({...identity,allow:true,epoch:2,leaseId:'lease-a'}),readPage:async()=>page,egress:async()=>{await Promise.resolve();mutate(page);return {...identity,allow,epoch:2,leaseId:'lease-a'};}});
 return {port,page};
}
const request={roomId,query:'needle'};
function verifiedWindow(result){assert.equal(result.status,'DIRECT_MATCHES_IN_AUTHORIZED_PAGE');assert.deepEqual(result.scannedWindow,{roomId,afterSeq:0,nextAfterSeq:2,hasMore:true,recordsScanned:2,bodyBytesScanned:Buffer.byteLength('🌊 needleother'),coverage:'FULL_BODIES_FOR_RETURNED_ROWS_ONLY',fullRoomCoverageProven:false,sourceWindowNotGlobalConclusion:true});assert.equal(result.matched.length,1);assert.equal(result.matched[0].seq,1);assert.equal(result.matched[0].matchOffsetUtf16,3);assert.equal(result.matched[0].matchOffsetUtf8,5);assert.equal(result.hostAuthenticated,false);assert.equal(result.rightsVerified,false);}
test('normal immutable page and Unicode offset control',async()=>verifiedWindow(await make().port.search(request)));
test('egress cannot advance cursor past actual scanned rows',async()=>verifiedWindow(await make(p=>p.nextAfterSeq=500).port.search(request)));
test('egress cannot falsify coverage and record count',async()=>verifiedWindow(await make(p=>{p.hasMore=false;p.rows.push(row(3,'unscanned'));}).port.search(request)));
test('egress can clear reused page object without causing rejection',async()=>verifiedWindow(await make(p=>{p.rows=null;}).port.search(request)));
test('revoked egress still returns no hits, no receipt',async()=>{const r=await make(p=>{p.rows=null;p.nextAfterSeq=500},false).port.search(request);assert.equal(r.status,'HOLD');assert.deepEqual(r.matched,[]);assert.equal(r.scannedWindow,null);});
test('empty or inconsistent cursor remains held before egress',async()=>{const {port,page}=make();page.nextAfterSeq=3;const r=await port.search(request);assert.equal(r.status,'HOLD');assert.equal(r.scannedWindow,null);});
