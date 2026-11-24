import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {WorkFullBodySearchPort} from '../src/work-search.mjs';

const roomId='atlas-v32-evolution-50-work-20261123-s01';
const identity={tenant:'tenant-test',account:'account-test',principal:'principal-test',mode:'WORK',purpose:'research',rightsEpoch:3};
const lease={tenant:identity.tenant,account:identity.account,principal:identity.principal,leaseId:'lease-01',epoch:3,allow:true};
const digest=t=>createHash('sha256').update(Buffer.from(t,'utf8')).digest('hex');
const body='admission '+'.'.repeat(400)+' HOLD_TYPE_MODALITY reviewer objection, plus getter.';
function row(seq,text=body,extra={}){return {tenant:identity.tenant,account:identity.account,roomId,kind:'WORK',seq,body:text,bodySHA256:digest(text),...extra};}
function factory(opts={}){
  let calls={session:0,admission:0,read:0,egress:0};
  const port=new WorkFullBodySearchPort({
    session:async()=>{calls.session++;return typeof opts.session==='function'?opts.session(calls.session):opts.session||identity;},
    admission:async s=>{calls.admission++;return opts.admission||lease;},
    readPage:async()=>{calls.read++;return opts.page||{rows:[row(5)],hasMore:false,nextAfterSeq:5};},
    egress:async()=>{calls.egress++;return opts.egress||lease;}
  });
  return {port,calls};
}
const req={roomId,query:'HOLD_TYPE_MODALITY',afterSeq:4,pageSize:10};

test('long Work body late token gets DIRECT hit, not reference-neighbor',async()=>{
  const {port}=factory();const result=await port.search(req);
  assert.equal(result.status,'DIRECT_MATCHES_IN_AUTHORIZED_PAGE');
  assert.equal(result.matched.length,1);assert.equal(result.matched[0].seq,5);
  assert.equal(result.matched[0].reason,'DIRECT_FULL_BODY_SUBSTRING_MATCH');
  assert.equal(result.matched[0].matchOffsetUtf16,body.indexOf('HOLD_TYPE_MODALITY'));
  assert.equal(result.scannedWindow.fullRoomCoverageProven,false);
  assert.equal(result.matched[0].renderedDomOffset,null);
  assert.equal(result.matched[0].rendererSourceMapRequired,true);
  assert.equal(JSON.stringify(result).includes('reviewer objection'),false);
});
test('control early token gets same direct source',async()=>{
  const result=await factory().port.search({...req,query:'ADMISSION'});
  assert.equal(result.matched[0].matchOffsetUtf16,0);
});
test('unknown token cannot be reported as absence of evidence',async()=>{
  const result=await factory().port.search({...req,query:'NO_MATCH_HERE'});
  assert.equal(result.status,'NO_MATCH_IN_SCANNED_PAGE_NOT_GLOBAL_ABSENCE');
  assert.equal(result.scannedWindow.fullRoomCoverageProven,false);
});
test('case-folded ASCII offsets stay exact across emoji',async()=>{
  const text='🪿 hello HOLD_TYPE_MODALITY';const result=await factory({page:{rows:[row(5,text)],hasMore:false,nextAfterSeq:5}}).port.search(req);
  assert.equal(result.matched[0].matchOffsetUtf16,text.indexOf('HOLD_TYPE_MODALITY'));
  assert.equal(result.matched[0].matchOffsetUtf8,Buffer.byteLength(text.slice(0,text.indexOf('HOLD_TYPE_MODALITY'))));
});
test('first matching record is not inferred from unrelated explicit-reply edge',async()=>{
  const result=await factory({page:{rows:[row(5,'The SOURCE is a reference neighbor.')],hasMore:false,nextAfterSeq:5}}).port.search(req);
  assert.equal(result.matched.length,0);
});
test('denied admission prevents any reads and no match metadata leaks',async()=>{
  const {port,calls}=factory({admission:{...lease,allow:false}});
  const out=await port.search(req);assert.equal(out.status,'HOLD');assert.equal(out.matched.length,0);assert.equal(out.scannedWindow,null);assert.equal(calls.read,0);
});
test('wrong tenant row denied even if query occurs in it',async()=>{
  const {port}=factory({page:{rows:[row(5,'HOLD_TYPE_MODALITY',{tenant:'another'})],hasMore:false,nextAfterSeq:5}});
  const out=await port.search(req);assert.equal(out.status,'HOLD');assert.equal(out.matched.length,0);
});
test('Play source refused before emission',async()=>{
  const out=await factory({page:{rows:[row(5,'HOLD_TYPE_MODALITY',{kind:'PLAY'})],hasMore:false,nextAfterSeq:5}}).port.search(req);
  assert.equal(out.status,'HOLD');assert.equal(out.matched.length,0);
});
test('egress revocation withholds even direct match count and offsets',async()=>{
  const out=await factory({egress:{...lease,allow:false,epoch:4}}).port.search(req);
  assert.equal(out.status,'HOLD');assert.equal(out.scannedWindow,null);assert.equal(out.matched.length,0);
});
test('session changed while read was in flight is denied before content',async()=>{
  const out=await factory({session:n=>n===1?identity:{...identity,rightsEpoch:4}}).port.search(req);
  assert.equal(out.status,'HOLD');assert.equal(out.matched.length,0);
});
test('wrong lease rejected',async()=>{
  const out=await factory({egress:{...lease,leaseId:'lease-02'}}).port.search(req);assert.equal(out.status,'HOLD');
});
test('body digest mismatch is held, not reported as no match',async()=>{
  const out=await factory({page:{rows:[row(5,body,{bodySHA256:'a'.repeat(64)})],hasMore:false,nextAfterSeq:5}}).port.search(req);
  assert.equal(out.status,'HOLD');assert.equal(out.scannedWindow,null);
});
test('duplicate sequence and out-of-order page rejected',async()=>{
  const out=await factory({page:{rows:[row(5),row(5)],hasMore:false,nextAfterSeq:5}}).port.search(req);assert.equal(out.status,'HOLD');
});
test('oversized Work source is HOLD not silent prefix truncation',async()=>{
  const text='HELLO '+'.'.repeat(70000)+' HOLD_TYPE_MODALITY';
  const out=await factory({page:{rows:[row(5,text)],hasMore:false,nextAfterSeq:5}}).port.search(req);
  assert.equal(out.status,'HOLD');
});
test('empty page with hasMore true is HOLD (no infinite pagination)',async()=>{
  const out=await factory({page:{rows:[],hasMore:true,nextAfterSeq:4}}).port.search(req);assert.equal(out.status,'HOLD');
});
test('malformed request rejects user-supplied principal without host calls',async()=>{
  const {port,calls}=factory();const out=await port.search({...req,principal:'user-forged'});
  assert.equal(out.reason,'REQUEST_SHAPE_INVALID');assert.equal(calls.session,0);
});
test('query cannot read Social purpose',async()=>{
  const out=await factory().port.search({...req,purpose:'SOCIAL'});assert.equal(out.status,'HOLD');
});
test('all results remain labeled unverified even under mock ALLOW callbacks',async()=>{
  const out=await factory().port.search(req);assert.equal(out.hostAuthenticated,false);assert.equal(out.rightsVerified,false);
  assert.equal(out.privateContentReturned,false);assert.equal(out.postPerformed,false);
});
test('no duplicate source rows even if two result candidates would match',async()=>{
  const out=await factory({page:{rows:[row(5),row(6,'HOLD_TYPE_MODALITY next text')],nextAfterSeq:6,hasMore:true}}).port.search(req);
  assert.deepEqual(out.matched.map(x=>x.seq),[5,6]);assert.equal(out.scannedWindow.hasMore,true);assert.equal(out.scannedWindow.fullRoomCoverageProven,false);
});
test('callback that throws cannot leak content in output',async()=>{
  const synthetic=row(5);Object.defineProperty(synthetic,'bodySHA256',{get(){throw Error('PRIVATE CONTENT')}});
  const {port}=factory({page:{rows:[synthetic],hasMore:false,nextAfterSeq:5}});
  const out=await port.search(req);assert.equal(out.status,'HOLD');assert.equal(JSON.stringify(out).includes('PRIVATE CONTENT'),false);
});

test('raw grapheme-edge substring offsets cannot assert DOM highlight correctness',async()=>{
  const text='A\u0301 NOTE HOLD_TYPE_MODALITY';
  const out=await factory({page:{rows:[row(5,text)],hasMore:false,nextAfterSeq:5}}).port.search({...req,query:'A'});
  assert.equal(out.status,'HOLD'); // One-character ambiguous query deliberately unsupported.
  const valid=await factory({page:{rows:[row(5,text)],hasMore:false,nextAfterSeq:5}}).port.search({...req,query:'NOTE'});
  assert.equal(valid.matched[0].rendererSourceMapRequired,true);
  assert.equal(valid.matched[0].renderedDomOffset,null);
});
