import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {WorkFullBodySearchPort} from '../src/work-search.mjs';

const roomId='synthetic-work-room';
const identity={tenant:'tenant-test',account:'account-test',principal:'principal-test',mode:'WORK',purpose:'research',rightsEpoch:3};
const lease={tenant:identity.tenant,account:identity.account,principal:identity.principal,leaseId:'lease-01',epoch:3,allow:true};
const request={roomId,query:'TARGET_TOKEN',afterSeq:4,pageSize:10};
const digest=value=>createHash('sha256').update(value).digest('hex');
const makeRow=(text='🪿 TARGET_TOKEN',seq=5)=>({tenant:identity.tenant,account:identity.account,roomId,kind:'WORK',seq,body:text,bodySHA256:digest(text)});
function fixture(overrides={}){
  const row=makeRow(),page={rows:[row],hasMore:false,nextAfterSeq:5};
  const calls={session:0,admission:0,read:0,egress:0};
  const callbacks={session:async()=>({...identity}),admission:async()=>({...lease}),readPage:async()=>page,egress:async()=>({...lease}),...overrides};
  const port=new WorkFullBodySearchPort({
    session:async()=>{calls.session++;return callbacks.session(calls.session);},
    admission:async(...args)=>{calls.admission++;return callbacks.admission(...args);},
    readPage:async(...args)=>{calls.read++;return callbacks.readPage(...args);},
    egress:async(...args)=>{calls.egress++;return callbacks.egress(...args);}
  });
  return {port,row,page,calls};
}
function accessor(object,key,get){Object.defineProperty(object,key,{get,enumerable:true,configurable:true});return object;}
function held(result,reason){assert.equal(result.status,'HOLD');assert.equal(result.reason,reason);assert.deepEqual(result.matched,[]);assert.equal(result.scannedWindow,null);assert.equal(JSON.stringify(result).includes('SYNTHETIC_PRIVATE_DETAIL'),false);}
function positive(result){assert.equal(result.status,'DIRECT_MATCHES_IN_AUTHORIZED_PAGE');assert.equal(result.matched[0].seq,5);assert.equal(result.matched[0].sourceBodySHA256,digest('🪿 TARGET_TOKEN'));assert.equal(result.matched[0].matchOffsetUtf16,3);assert.equal(result.matched[0].matchOffsetUtf8,5);assert.equal(result.hostAuthenticated,false);assert.equal(result.rightsVerified,false);}

test('ordinary JSON inputs retain exact source digest and UTF-16/UTF-8 offsets',async()=>positive(await fixture().port.search({...request})));
test('null-prototype data inputs remain supported',async()=>{
  const plain=value=>Object.assign(Object.create(null),value);
  const page=plain({rows:[plain(makeRow())],hasMore:false,nextAfterSeq:5});
  const f=fixture({session:async()=>plain(identity),admission:async()=>plain(lease),readPage:async()=>page,egress:async()=>plain(lease)});
  positive(await f.port.search(plain(request)));
});
test('request getter is refused before host calls without evaluating it',async()=>{
  let reads=0;const req=accessor({...request},'roomId',()=>{reads++;throw Error('SYNTHETIC_PRIVATE_DETAIL');});const f=fixture();
  held(await f.port.search(req),'REQUEST_SHAPE_INVALID');assert.equal(reads,0);assert.equal(f.calls.session,0);
});
test('request proxy reflection failure returns generic HOLD',async()=>{
  const req=new Proxy({...request},{ownKeys(){throw Error('SYNTHETIC_PRIVATE_DETAIL');}});
  held(await fixture().port.search(req),'REQUEST_SHAPE_INVALID');
});
test('initial session accessor cannot leak a raw exception',async()=>{
  let reads=0;const session=accessor({...identity},'tenant',()=>{reads++;throw Error('SYNTHETIC_PRIVATE_DETAIL');});const f=fixture({session:async()=>session});
  held(await f.port.search(request),'HOST_SESSION_UNAVAILABLE');assert.equal(reads,0);assert.equal(f.calls.admission,0);
});
test('refreshed session accessor denies before egress',async()=>{
  let reads=0;const session=accessor({...identity},'rightsEpoch',()=>{reads++;return 3;});const f=fixture({session:async count=>count===1?identity:session});
  held(await f.port.search(request),'ACCESS_UNAVAILABLE');assert.equal(reads,0);assert.equal(f.calls.egress,0);
});
test('admission accessor cannot grant a lease',async()=>{
  let reads=0;const admission=accessor({...lease},'allow',()=>{reads++;return true;});const f=fixture({admission:async()=>admission});
  held(await f.port.search(request),'ACCESS_UNAVAILABLE');assert.equal(reads,0);assert.equal(f.calls.read,0);
});
test('page rows accessor is refused without reading body records',async()=>{
  let reads=0;const f=fixture();accessor(f.page,'rows',()=>{reads++;return [makeRow()];});
  held(await f.port.search(request),'SOURCE_UNAVAILABLE');assert.equal(reads,0);assert.equal(f.calls.egress,0);
});
test('body cannot change between digest verification and token matching',async()=>{
  let reads=0;const f=fixture();f.row.bodySHA256=digest('no direct matching term');
  accessor(f.row,'body',()=>++reads<=3?'no direct matching term':'TARGET_TOKEN');
  held(await f.port.search(request),'SOURCE_UNAVAILABLE');assert.equal(reads,0);assert.equal(f.calls.egress,0);
});
test('validated source sequence cannot change before emitting a hit',async()=>{
  let reads=0;const f=fixture();accessor(f.row,'seq',()=>++reads<=3?5:499);
  held(await f.port.search(request),'SOURCE_UNAVAILABLE');assert.equal(reads,0);assert.equal(f.calls.egress,0);
});
test('body digest getter is not an accepted source digest',async()=>{
  let reads=0;const f=fixture();accessor(f.row,'bodySHA256',()=>{reads++;return digest(f.row.body);});
  held(await f.port.search(request),'SOURCE_UNAVAILABLE');assert.equal(reads,0);
});
test('array element accessor cannot inject a row during iteration',async()=>{
  let reads=0;const f=fixture();accessor(f.page.rows,'0',()=>{reads++;return f.row;});
  held(await f.port.search(request),'SOURCE_UNAVAILABLE');assert.equal(reads,0);
});
test('numeric row snapshots do not execute a custom array iterator',async()=>{
  let reads=0;const f=fixture();accessor(f.page.rows,Symbol.iterator,()=>{reads++;throw Error('SYNTHETIC_PRIVATE_DETAIL');});
  positive(await f.port.search(request));assert.equal(reads,0);
});
test('sparse row arrays are denied as unavailable source',async()=>{
  const f=fixture();f.page.rows=new Array(1);held(await f.port.search(request),'SOURCE_UNAVAILABLE');
});
test('egress accessor is denied without executing the getter',async()=>{
  let reads=0;const release=accessor({...lease},'epoch',()=>{reads++;throw Error('SYNTHETIC_PRIVATE_DETAIL');});const f=fixture({egress:async()=>release});
  held(await f.port.search(request),'ACCESS_UNAVAILABLE');assert.equal(reads,0);
});
test('host identity prototype trap cannot escape as a rejection',async()=>{
  const f=fixture({session:async()=>new Proxy({...identity},{getPrototypeOf(){throw Error('SYNTHETIC_PRIVATE_DETAIL');}})});
  held(await f.port.search(request),'HOST_SESSION_UNAVAILABLE');
});
test('source descriptor trap failure returns generic HOLD',async()=>{
  const f=fixture();f.page.rows[0]=new Proxy(f.row,{getOwnPropertyDescriptor(){throw Error('SYNTHETIC_PRIVATE_DETAIL');}});
  held(await f.port.search(request),'SOURCE_UNAVAILABLE');
});
test('row limit is checked before accessing any indexed descriptor',async()=>{
  let reads=0;const f=fixture();f.page.rows=Array.from({length:11},()=>makeRow());accessor(f.page.rows,'0',()=>{reads++;return makeRow();});
  held(await f.port.search(request),'SOURCE_UNAVAILABLE');assert.equal(reads,0);
});
test('unknown symbol request fields are rejected before host calls',async()=>{
  const f=fixture();held(await f.port.search({...request,[Symbol('principal')]:'forged'}),'REQUEST_SHAPE_INVALID');assert.equal(f.calls.session,0);
});
test('wrong source scope is rejected before obtaining body descriptors',async()=>{
  let bodyDescriptorReads=0;const f=fixture();f.page.rows[0]=new Proxy({...f.row,kind:'OTHER'},{getOwnPropertyDescriptor(target,key){if(key==='body'||key==='bodySHA256')bodyDescriptorReads++;return Object.getOwnPropertyDescriptor(target,key);}});
  held(await f.port.search(request),'SOURCE_UNAVAILABLE');assert.equal(bodyDescriptorReads,0);
});
