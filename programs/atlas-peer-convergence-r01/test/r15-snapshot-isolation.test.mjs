import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotIssuedScores} from '../src/strict-issued-capture.mjs';
import {makeIssuedPageFromExistingFrame} from '../src/issued-page-r34.mjs';
import {makeDualIssuedGeometry} from '../src/dual-issued-geometry.mjs';
import {ARIADNE_SHA256} from '../../atlas-geometry-one-r38/src/addresses.mjs';
const d='a'.repeat(64);
function fixture(type=Float64Array){const s=new type(1728);for(let i=0;i<1728;i++)s[i]=i/16;return s;}
function page(s){return makeIssuedPageFromExistingFrame({issuer:'demo',sourceId:'source',sourceEdition:'edition',modelSha256:d,querySha256:d,sourceSha256:d,registrySha256:ARIADNE_SHA256,scores:s});}
function dual(s){return makeDualIssuedGeometry({issuer:'demo',sourceId:'source',sourceEdition:'edition',modelSha256:d,querySha256:d,sourceSha256:d,registrySha256:ARIADNE_SHA256,scores:s,requestId:'demo',tenant:'tenant',logicalTarget:'target',contractVersion:'v1',scope:'WORK',purpose:'INFERENCE'});}
for(const T of [Float32Array,Float64Array]){
 test(`${T.name} R15 returned scores cannot tamper later reads`,()=>{
  const original=fixture(T),r=snapshotIssuedScores(original);const before=r.rawDigest;
  const exposed=r.scores;exposed[13]=1024;
  assert.equal(r.scores[13],original[13]);assert.equal(r.rawDigest,before);
 });
 test(`${T.name} R15 returned binary bytes cannot tamper later reads`,()=>{
  const r=snapshotIssuedScores(fixture(T));const first=r.beBytes;const expected=Buffer.from(first);first.fill(0);
  assert.deepEqual(r.beBytes,expected);
 });
 test(`${T.name} R15 original caller mutation after snapshot cannot change capture`,()=>{
  const src=fixture(T),r=snapshotIssuedScores(src);const initial=r.scores[3];src[3]=99999;assert.equal(r.scores[3],initial);
 });
 test(`${T.name} R15 existing R34/R35 shared ABI still prepares once`,()=>{
  const src=fixture(T),p=page(src),q=dual(src);assert.equal(p.status,'SOURCE_ONLY_ISSUED_PAGE_PREPARED');assert.equal(q.status,'PREPARED_NOT_HOSTED');assert.equal(q.pr66.scores,q.pr67.scores);assert.equal(q.pr66.scores[11],src[11]);
 });
}
test('R15 signed zero retained in clean readonly view',()=>{const src=fixture();src[9]=-0;const r=snapshotIssuedScores(src);assert.ok(Object.is(r.scores[9],-0));});
