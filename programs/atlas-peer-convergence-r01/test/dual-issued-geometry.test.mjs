import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDualIssuedGeometry,checkMethodSubject} from '../src/dual-issued-geometry.mjs';
import {ARIADNE_SHA256} from '../../atlas-geometry-one-r38/src/addresses.mjs';
const pin=c=>c.repeat(64);
const f=(kind='f64')=>({issuer:'local-fixture',modelSha256:pin('a'),querySha256:pin('b'),
 sourceId:'s',sourceSha256:pin('c'),sourceEdition:'synthetic-v1',
 registrySha256:ARIADNE_SHA256,scores:kind==='f64'?new Float64Array(1728):new Float32Array(1728),
 requestId:'req-1',tenant:'tenant-A',logicalTarget:'ATLAS',contractVersion:'v1',scope:'WORK',purpose:'INFERENCE'});
const pass=x=>{assert.equal(x.status,'PREPARED_NOT_HOSTED');assert.equal(x.modelCallsAdded,0);assert.equal(x.releaseAuthorized,false);};
test('dual PR66 and PR67 existing issued schemas share one immutable score snapshot',()=>{const x=makeDualIssuedGeometry(f());pass(x);assert.equal(x.pr66.schema,'atlas.neural.issued/v1');assert.equal(x.pr66.method,'neural');assert.equal(x.pr67.schema,'atlas.geometry-one.issued/v1');assert.equal(x.pr67.method,'NEURAL_ONLY');assert.equal(x.oneSharedScoreSnapshot,true);assert.equal(x.pr67.requestId,'req-1');assert.equal(Object.isFrozen(x.pr67.scores),true);});
test('all original structural positions have constant geometry',()=>{const x=makeDualIssuedGeometry(f());assert.deepEqual(x.geometry,[12,12,12]);assert.equal(x.exactScoreCount,1728);});
test('evidence edition stays distinct from Ariadne ontology edition',()=>{const x=makeDualIssuedGeometry(f());pass(x);assert.equal(x.evidenceSourceEdition,'synthetic-v1');assert.equal(x.ontologyEdition,'ariadne-reader/v0.7');});
test('same score buffer recomputes exact digest',()=>{const a=makeDualIssuedGeometry(f()),b=makeDualIssuedGeometry(f());assert.equal(a.scopedFrameDigest,b.scopedFrameDigest);});
test('signed zero is preserved, unlike JSON.stringify',()=>{const a=f(),b=f();b.scores[0]=-0;assert.equal(JSON.stringify(Array.from(a.scores)),JSON.stringify(Array.from(b.scores)));const x=makeDualIssuedGeometry(a),y=makeDualIssuedGeometry(b);assert.notEqual(x.binaryScoreDigest,y.binaryScoreDigest);assert.notEqual(x.scopedFrameDigest,y.scopedFrameDigest);assert.equal(Object.is(y.pr67.scores[0],-0),true);});
test('f32 and f64 have distinct digests for same numeric values',()=>{const x=makeDualIssuedGeometry(f('f32')),y=makeDualIssuedGeometry(f('f64'));assert.notEqual(x.binaryScoreDigest,y.binaryScoreDigest);});
test('tenant changes scope binding without changing numerical score digest',()=>{const a=f(),b=f();b.tenant='tenant-B';const x=makeDualIssuedGeometry(a),y=makeDualIssuedGeometry(b);assert.equal(x.binaryScoreDigest,y.binaryScoreDigest);assert.notEqual(x.scopedFrameDigest,y.scopedFrameDigest);});
test('request changes scope binding',()=>{const a=f(),b=f();b.requestId='req-2';assert.notEqual(makeDualIssuedGeometry(a).scopedFrameDigest,makeDualIssuedGeometry(b).scopedFrameDigest);});
test('logical target changes scoped binding',()=>{const a=f(),b=f();b.logicalTarget='ANOTHER';assert.notEqual(makeDualIssuedGeometry(a).scopedFrameDigest,makeDualIssuedGeometry(b).scopedFrameDigest);});
test('different evidence edition changes binding without changing geometry',()=>{const a=f(),b=f();b.sourceEdition='synthetic-v2';const x=makeDualIssuedGeometry(a),y=makeDualIssuedGeometry(b);assert.notEqual(x.scopedFrameDigest,y.scopedFrameDigest);assert.deepEqual(x.geometry,y.geometry);});
test('expected binding can catch mismatch but never authenticates itself',()=>{const a=makeDualIssuedGeometry(f());pass(makeDualIssuedGeometry(f(),{expectedBinding:a.scopedFrameDigest}));assert.equal(makeDualIssuedGeometry(f(),{expectedBinding:a.scopedFrameDigest}).expectedBindingIndependentlyAttested,false);assert.equal(makeDualIssuedGeometry(f(),{expectedBinding:pin('f')}).status,'HOLD');});
test('caller changing input typed frame cannot mutate retained result',()=>{const x=f();x.scores[0]=1;const y=makeDualIssuedGeometry(x);x.scores[0]=8;assert.equal(y.pr66.scores[0],1);assert.equal(y.pr67.scores[0],1);});
test('nonfinite score rejected',()=>{const x=f();x.scores[5]=Infinity;assert.equal(makeDualIssuedGeometry(x).status,'HOLD');});
test('wrong length rejected',()=>{const x=f();x.scores=new Float64Array(1727);assert.equal(makeDualIssuedGeometry(x).status,'HOLD');});
test('ordinary array instead of typed frame rejected',()=>{const x=f();x.scores=Array(1728).fill(0);assert.equal(makeDualIssuedGeometry(x).status,'HOLD');});
test('rejected wrong ontology registry pin',()=>{const x=f();x.registrySha256=pin('d');assert.equal(makeDualIssuedGeometry(x).status,'HOLD');});
test('rejected Play scope',()=>{const x=f();x.scope='PLAY';assert.equal(makeDualIssuedGeometry(x).status,'HOLD');});
test('rejected unsupported purpose',()=>{const x=f();x.purpose='TRAINING';assert.equal(makeDualIssuedGeometry(x).status,'HOLD');});
test('root getter never called',()=>{const x=f();let called=0;Object.defineProperty(x,'tenant',{get(){called++;return 'tenant-A'}});assert.equal(makeDualIssuedGeometry(x).status,'HOLD');assert.equal(called,0);});
test('proxy root rejected',()=>{assert.equal(makeDualIssuedGeometry(new Proxy(f(),{})).status,'HOLD');});
test('extra field rejected',()=>{const x=f();x.isAdmin=true;assert.equal(makeDualIssuedGeometry(x).status,'HOLD');});
test('shared underlying frame rejected, if supported',()=>{if(typeof SharedArrayBuffer==='undefined')return;const x=f();x.scores=new Float64Array(new SharedArrayBuffer(1728*8));assert.equal(makeDualIssuedGeometry(x).status,'HOLD');});
test('structural DOMAIN split by S not N',()=>{assert.equal(checkMethodSubject('H01.S01.N08',null).status,'DOMAIN_POSITION');assert.equal(checkMethodSubject('H01.S08.N01','H01.S01.N08').status,'STRUCTURALLY_SCOPED_FOR_REVIEW');});
test('METHOD node cannot be subject of METHOD node',()=>{assert.equal(checkMethodSubject('H01.S08.N01','H01.S10.N01').status,'HOLD_SUBJECT_MISMATCH');});
test('METHOD must have same-House DOMAIN subject',()=>{assert.equal(checkMethodSubject('H01.S08.N01','H02.S01.N01').status,'HOLD_SUBJECT_MISMATCH');});
test('invalid H00 and invalid subject hold',()=>{assert.equal(checkMethodSubject('H00.S01.N01','H01.S01.N01').status,'HOLD_INVALID_HSN');assert.equal(checkMethodSubject('H01.S09.N01','not-an-HSN').status,'HOLD_INVALID_HSN');});
test('source-only candidate never claims host rights or release',()=>{const x=makeDualIssuedGeometry(f());assert.equal(x.issuerAuthenticated,false);assert.equal(x.sourceRightsAttested,false);assert.equal(x.finalEgressVerified,false);assert.equal(x.trainingEligible,false);});
