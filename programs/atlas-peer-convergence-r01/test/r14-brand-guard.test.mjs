import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotIssuedScores} from '../src/strict-issued-capture.mjs';
import {makeIssuedPageFromExistingFrame} from '../src/issued-page-r34.mjs';
import {makeDualIssuedGeometry} from '../src/dual-issued-geometry.mjs';
import {ARIADNE_SHA256} from '../../atlas-geometry-one-r38/src/addresses.mjs';
const id = x => x.repeat(64);
const base={issuer:'source1',modelSha256:id('a'),querySha256:id('b'),sourceId:'s1',sourceSha256:id('c'),sourceEdition:'evidence-v1',registrySha256:ARIADNE_SHA256};
const raw = scores=>makeIssuedPageFromExistingFrame({...base,scores});
const dual = scores=>makeDualIssuedGeometry({...base,scores,requestId:'req1',tenant:'tenant1',logicalTarget:'one',contractVersion:'v1',scope:'WORK',purpose:'INFERENCE'});
for (const [Actual, Pretend, label] of [[Uint32Array,Float32Array,'uint32-as-float32'],[Int32Array,Float32Array,'int32-as-float32'],[BigUint64Array,Float64Array,'biguint64-as-float64'],[BigInt64Array,Float64Array,'bigint64-as-float64']]) {
  test(`native brand guard rejects ${label} even when prototype impersonates FloatArray`,()=>{
    const v=new Actual(1728);
    v[0]=Actual===BigUint64Array||Actual===BigInt64Array?16777217n:16777217;
    Object.setPrototypeOf(v,Pretend.prototype);
    assert.throws(()=>snapshotIssuedScores(v),/SCORE_NATIVE_BRAND_MISMATCH|SCORE_WRONG_PROTOTYPE/);
    assert.equal(raw(v).status,'HOLD');
    assert.equal(dual(v).status,'HOLD');
  });
}
test('correct native Float32Array / Float64Array brands preserve source snapshots and shared output identity',()=>{
  for (const T of [Float32Array,Float64Array]) {
    const v=new T(1728);v[0]=-0;v[1727]=42.125;
    const direct=snapshotIssuedScores(v),a=raw(v),b=dual(v);
    assert.equal(a.status,'SOURCE_ONLY_ISSUED_PAGE_PREPARED');assert.equal(b.status,'PREPARED_NOT_HOSTED');
    assert.ok(Object.is(a.page.scores[0],-0));
    assert.equal(a.page.scores[1727],42.125);
    assert.equal(b.pr66.scores,b.pr67.scores);
    assert.equal(direct.format,T===Float32Array?'f32be':'f64be');
  }
});
test('a typed prototype shape alone cannot produce a trusted numeric page',()=>{
 const imp=new Uint32Array(1728).fill(1);imp[0]=16777217;
 const honest=Float32Array.from({length:1728},()=>1);honest[0]=16777217;
 Object.setPrototypeOf(imp,Float32Array.prototype);
 assert.equal(raw(imp).status,'HOLD');
 const accepted=raw(honest);
 assert.equal(accepted.status,'SOURCE_ONLY_ISSUED_PAGE_PREPARED');
 assert.equal(accepted.page.scores[0],16777216);
});
