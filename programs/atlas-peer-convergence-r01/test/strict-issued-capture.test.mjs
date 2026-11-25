import test from 'node:test';
import assert from 'node:assert/strict';
import {types as utilTypes} from 'node:util';
import {makeDualIssuedGeometry,checkMethodSubject} from '../src/dual-issued-geometry.mjs';
import {makeIssuedPageFromExistingFrame} from '../src/issued-page-r34.mjs';
import {snapshotIssuedScores,primitiveMetadata,plainRecord} from '../src/strict-issued-capture.mjs';
import {ARIADNE_SHA256,HSN} from '../../atlas-geometry-one-r38/src/addresses.mjs';
const SHA=(c)=>c.repeat(64);
const B=Object.freeze({issuer:'source1',modelSha256:SHA('a'),querySha256:SHA('b'),sourceId:'s1',sourceSha256:SHA('c'),sourceEdition:'evidence-v1',registrySha256:ARIADNE_SHA256});
const invoke=(scores,update={})=>makeDualIssuedGeometry({...B,requestId:'req1',tenant:'tenant1',logicalTarget:'one',contractVersion:'v1',scope:'WORK',purpose:'INFERENCE',scores,...update});
const legacy=(scores,update={})=>makeIssuedPageFromExistingFrame({...B,scores,...update});
const score=(T=Float64Array)=>Float64Array===T?Float64Array.from({length:1728},(_,i)=>i/1728):Float32Array.from({length:1728},(_,i)=>i/1728);
const holdDual=(value)=>assert.equal(value.status,'HOLD');
const holdRaw=(value)=>assert.equal(value.status,'HOLD');

test('EXACT literal peer R34 and R35 original schemas coexist with one snapshot',()=>{
  for(const T of [Float32Array,Float64Array]){
    const t=score(T),r=invoke(t),o=legacy(t);
    assert.equal(r.status,'PREPARED_NOT_HOSTED');assert.equal(o.status,'SOURCE_ONLY_ISSUED_PAGE_PREPARED');
    assert.equal(r.oneSharedScoreSnapshot,true);assert.equal(r.pr66.scores,r.pr67.scores);
    assert.equal(r.pr66.schema,'atlas.neural.issued/v1');assert.equal(r.pr67.schema,'atlas.geometry-one.issued/v1');
    assert.equal(r.pr66.scores.length,1728);assert.equal(r.scoreFormat,T===Float64Array?'f64be':'f32be');
    assert.equal(r.binaryScoreDigest,o.localScoreBinding);
    assert.equal(r.releaseAuthorized,false);assert.equal(r.issuerAuthenticated,false);
  }
});
test('red peer iterator substitution now yields two HOLDs with no source mutation',()=>{
  const t=new Float64Array(1728).fill(1);let called=0;
  Object.defineProperty(t,Symbol.iterator,{value:function*(){called++;for(let i=0;i<1728;i++)yield 42;}});
  holdRaw(legacy(t));holdDual(invoke(t));assert.equal(called,0);assert.equal(t[0],1);
});
test('short custom iterator must never be called',()=>{
  const t=score();let called=0;
  Object.defineProperty(t,Symbol.iterator,{get(){called++;throw Error('must not run')}});
  holdRaw(legacy(t));holdDual(invoke(t));assert.equal(called,0);
});
test('typed buffer shadow getter must not be called',()=>{
  const t=score();let called=0;
  Object.defineProperty(t,'buffer',{get(){called++;throw Error('do not touch')}});
  holdRaw(legacy(t));holdDual(invoke(t));assert.equal(called,0);
});
test('typed length shadow getter must not be called',()=>{
  const t=score();let called=0;Object.defineProperty(t,'length',{get(){called++;return 1728}});
  holdRaw(legacy(t));holdDual(invoke(t));assert.equal(called,0);
});
test('typed byteOffset shadow getter must not be called',()=>{
  const t=score();let called=0;Object.defineProperty(t,'byteOffset',{get(){called++;return 0}});
  holdRaw(legacy(t));holdDual(invoke(t));assert.equal(called,0);
});
test('typed field with extra ordinary own property rejected',()=>{const t=score();t.extra=1;holdRaw(legacy(t));holdDual(invoke(t))});
test('typed array subclass rejected with no inherited iterator invoked',()=>{
  class Evil extends Float64Array{*[Symbol.iterator](){throw Error('unsafe')}}
  const t=new Evil(1728);holdRaw(legacy(t));holdDual(invoke(t))
});
test('typed array with substituted prototype rejected',()=>{const t=score();Object.setPrototypeOf(t,{});holdRaw(legacy(t));holdDual(invoke(t))});
test('typed Proxy rejected, no proxy trap runs',()=>{
  const t=score();let calls=0;const trap=new Proxy(t,{get(){calls++;throw Error('bad')}});
  holdRaw(legacy(trap));holdDual(invoke(trap));assert.equal(calls,0)
});
test('SharedArrayBuffer rejected if available',()=>{
  if(typeof SharedArrayBuffer==='undefined')return;
  const t=new Float64Array(new SharedArrayBuffer(1728*8));holdRaw(legacy(t));holdDual(invoke(t));
});
test('Resizable ArrayBuffer rejected if supported',()=>{
  try{const b=new ArrayBuffer(1728*8,{maxByteLength:1728*16});
    if(!b.resizable)return;
    const t=new Float64Array(b,0,1728);holdRaw(legacy(t));holdDual(invoke(t));
  }catch(e){if(!(e instanceof TypeError))throw e}
});
test('detached array buffer rejected',()=>{
  const t=score();structuredClone(t.buffer,{transfer:[t.buffer]});holdRaw(legacy(t));holdDual(invoke(t));
});
test('wrong element count rejected at 1727 and 1729',()=>{for(const n of [1727,1729]){holdRaw(legacy(new Float64Array(n)));holdDual(invoke(new Float64Array(n)))}});
test('NaN and Infinity anywhere rejected',()=>{for(const v of [NaN,Infinity,-Infinity]){const t=score();t[1727]=v;holdRaw(legacy(t));holdDual(invoke(t))}});
test('Float32 and Float64 payloads give distinct exact bytes and domain digests',()=>{
  const a=snapshotIssuedScores(score(Float32Array)),b=snapshotIssuedScores(score(Float64Array));
  assert.notEqual(a.rawDigest,b.rawDigest);assert.equal(a.beBytes.length,1728*4);assert.equal(b.beBytes.length,1728*8);
});
test('negative-zero binary-score digest differs from positive-zero at hidden index',()=>{
  const a=new Float64Array(1728).fill(1),b=a.slice();a[1710]=0;b[1710]=-0;
  assert.notEqual(invoke(a).binaryScoreDigest,invoke(b).binaryScoreDigest);
  assert.notEqual(legacy(a).localScoreBinding,legacy(b).localScoreBinding);
  assert.equal(JSON.stringify(Array.from(a)),JSON.stringify(Array.from(b)));
});
test('visible high-ranked values cannot certify a hidden signed-zero buffer',()=>{
  const a=Float64Array.from({length:1728},(_,i)=>1728-i),b=a.slice();a[1727]=0;b[1727]=-0;
  const x=invoke(a),y=invoke(b);assert.deepEqual(x.pr67.scores.slice(0,10),y.pr67.scores.slice(0,10));
  assert.notEqual(x.binaryScoreDigest,y.binaryScoreDigest);
});
test('source Float64 mutation after capture does not mutate either output',()=>{
  const t=score(),r=invoke(t);t[0]=999;assert.equal(r.pr66.scores[0],0);assert.equal(r.pr67.scores[0],0);
});
test('expected scoped digest accepts exact, rejects wrong',()=>{
  const t=score(),r=invoke(t);assert.equal(invoke(t,{}).status,'PREPARED_NOT_HOSTED');
  const full={...B,scores:t,requestId:'req1',tenant:'tenant1',logicalTarget:'one',contractVersion:'v1',scope:'WORK',purpose:'INFERENCE'};
  assert.equal(makeDualIssuedGeometry(full,{expectedBinding:r.scopedFrameDigest}).expectedBindingMatched,true);
  holdDual(makeDualIssuedGeometry(full,{expectedBinding:SHA('f')}));
});
test('string-coercible issuer object rejected BEFORE side effects',()=>{
  let calls=0;const dirty={toString(){calls++;return 'source1'}};holdRaw(legacy(score(),{issuer:dirty}));holdDual(invoke(score(),{issuer:dirty}));assert.equal(calls,0)
});
test('string-coercible sourceId object rejected BEFORE side effects',()=>{
  let calls=0;const dirty={toString(){calls++;return 's1'}};holdRaw(legacy(score(),{sourceId:dirty}));holdDual(invoke(score(),{sourceId:dirty}));assert.equal(calls,0)
});
test('string-coercible digest object rejected BEFORE side effects',()=>{
  let calls=0;const dirty={toString(){calls++;return SHA('c')}};holdRaw(legacy(score(),{sourceSha256:dirty}));holdDual(invoke(score(),{sourceSha256:dirty}));assert.equal(calls,0)
});
test('root getter refused without invocation',()=>{
  const root={...B,scores:score()},dual={...root,requestId:'req1',tenant:'tenant1',logicalTarget:'one',contractVersion:'v1',scope:'WORK',purpose:'INFERENCE'};let calls=0;
  for(const obj of [root,dual])Object.defineProperty(obj,'sourceId',{enumerable:true,get(){calls++;throw Error('bad')}});
  holdRaw(makeIssuedPageFromExistingFrame(root));holdDual(makeDualIssuedGeometry(dual));assert.equal(calls,0);
});
test('root Proxy rejected without invoking traps',()=>{
  let called=0;const x=new Proxy({...B,scores:score()},{get(){called++;throw Error('bad')}});holdRaw(makeIssuedPageFromExistingFrame(x));assert.equal(called,0);
});
test('getter on R35 options refused without invocation',()=>{
  const root={...B,scores:score(),requestId:'req1',tenant:'tenant1',logicalTarget:'one',contractVersion:'v1',scope:'WORK',purpose:'INFERENCE'};
  let calls=0;const o={get expectedBinding(){calls++;return null}};
  holdDual(makeDualIssuedGeometry(root,o));assert.equal(calls,0);
});
test('R35 Proxy options refused without trap invocation',()=>{
  const root={...B,scores:score(),requestId:'req1',tenant:'tenant1',logicalTarget:'one',contractVersion:'v1',scope:'WORK',purpose:'INFERENCE'};
  let calls=0;const o=new Proxy({expectedBinding:null},{get(){calls++;throw Error('trap')}});
  holdDual(makeDualIssuedGeometry(root,o));assert.equal(calls,0);
});
test('R35 unsupported options rejected',()=>{
  const root={...B,scores:score(),requestId:'req1',tenant:'tenant1',logicalTarget:'one',contractVersion:'v1',scope:'WORK',purpose:'INFERENCE'};
  holdDual(makeDualIssuedGeometry(root,{unknown:'x'}));holdDual(makeDualIssuedGeometry(root,[]));
});
test('sourceEdition with slash is explicitly unsupported by historical R34 grammar',()=>{
  holdRaw(legacy(score(),{sourceEdition:'edition/v1'}));holdDual(invoke(score(),{sourceEdition:'edition/v1'}));
});
test('private mode rejected',()=>{holdDual(invoke(score(),{scope:'PLAY'}));holdDual(invoke(score(),{scope:'QUIET'}))});
test('wrong original registry rejected',()=>{holdDual(invoke(score(),{registrySha256:SHA('f')}));holdRaw(legacy(score(),{registrySha256:SHA('f')}))});
test('14 source metadata combinations preserve one frame and no authority',()=>{
  for(let i=0;i<14;i++){
    const d=invoke(score(i%2?Float32Array:Float64Array),{sourceId:`s${i}`,requestId:`r${i}`});
    assert.equal(d.status,'PREPARED_NOT_HOSTED');assert.equal(d.modelCallsAdded,0);assert.equal(d.releaseAuthorized,false);
    assert.equal(d.pr66.scores,d.pr67.scores);
  }
});
test('144 original Sphere representatives retain exact source role and both schema buffers',()=>{
  for(let h=1;h<=12;h++)for(let s=1;s<=12;s++){
    const n=s%12+1,addr=`H${String(h).padStart(2,'0')}.S${String(s).padStart(2,'0')}.N${String(n).padStart(2,'0')}`;
    assert.ok(HSN.includes(addr));const d=invoke(score(),{requestId:`sphere${h}_${s}`});
    assert.equal(d.status,'PREPARED_NOT_HOSTED');assert.equal(d.oneSharedScoreSnapshot,true);
    const method=checkMethodSubject(addr,`H${String(h).padStart(2,'0')}.S01.N01`);
    assert.equal(method.status,s<=7?'DOMAIN_POSITION':'STRUCTURALLY_SCOPED_FOR_REVIEW');
  }
});
test('correct original role totals are 1008 DOMAIN / 720 METHOD',()=>{
  let domain=0,method=0;for(const a of HSN){if(+a.slice(5,7)<=7)domain++;else method++}
  assert.equal(domain,1008);assert.equal(method,720);
});
test('all result metadata always marks issuer and host permissions unverified',()=>{
  const r=invoke(score());assert.equal(r.issuerAuthenticated,false);assert.equal(r.sourceRightsAttested,false);
  assert.equal(r.finalEgressVerified,false);assert.equal(r.expectedBindingIndependentlyAttested,false);
});
