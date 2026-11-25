import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BRIDGE_SCHEMA,CUPWAKE_EDITION,SYMBIOSIS_EDITION,TRIGRAMS,
  encodeYijing,decodeYijing,flipLine,stepContext,glyphCoefficients,
  decodeGlyphCoefficients,glyphDigitalToken,analyticGlyphSample,
  dimensionlessGlyphGrid,inspectGlyphPointer,attachYijingGlyphs,
  symbolicDigest,navigationCounts
} from '../src/yijing-cymatic.mjs';
import {decodeIndex,ARIADNE_SHA256,linearIndex,originalAddresses,flatReference} from '../src/geometry.mjs';
import {createGeometryKernel} from '../src/kernel.mjs';
const key=e=>({edition:e.edition,hexagramCode:e.hexagramCode,contextCode:e.contextCode});
const SHA=c=>c.repeat(64);
const expected={originalNodes:1728,hexagramPatterns:64,ternaryContexts:27,uniqueHexagramLineFlipEdges:5184,uniqueAdjacentTernaryContextEdges:3456};

test('two editions preserve all 1,728 original identities, 64 x 27 addresses, and 9-coefficient inverse',()=>{
  for(const edition of [CUPWAKE_EDITION,SYMBIOSIS_EDITION]){
    const seen=new Set(),codes=new Set();
    for(const hsn of originalAddresses){
      const e=encodeYijing(hsn,edition),k=key(e),coeff=glyphCoefficients(k);
      assert.equal(decodeYijing(k),hsn);
      assert.equal(decodeGlyphCoefficients(coeff,edition),hsn);
      assert.equal(coeff.length,9);
      assert.equal(e.kingWenNumber,null);
      assert.equal(e.registrySha256,ARIADNE_SHA256);
      assert.equal(e.releaseAuthorized,false);
      const identifier=`${e.hexagramCode}/${e.contextCode}`;
      assert.equal(seen.has(identifier),false);seen.add(identifier);codes.add(e.hexagramCode);
    }
    assert.equal(seen.size,1728);assert.equal(codes.size,64);
  }
});

test('edition labels are necessary: two peer bijections cannot be silently interchanged',()=>{
  const hsn='H02.S05.N11',a=encodeYijing(hsn,CUPWAKE_EDITION),b=encodeYijing(hsn,SYMBIOSIS_EDITION);
  assert.notDeepEqual([a.hexagramCode,a.contextCode],[b.hexagramCode,b.contextCode]);
  assert.notEqual(decodeYijing({...key(a),edition:SYMBIOSIS_EDITION}),hsn);
  assert.throws(()=>decodeYijing({hexagramCode:a.hexagramCode,contextCode:a.contextCode}));
  assert.throws(()=>decodeYijing({edition:'King-Wen',hexagramCode:1,contextCode:0}));
  assert.equal(TRIGRAMS.length,8);
});

test('each of six line flips is an involution preserving context and registry',()=>{
 for(const ed of [CUPWAKE_EDITION,SYMBIOSIS_EDITION])for(const i of [0,1,144,409,1727]){
  const v=encodeYijing(decodeIndex(i).hsn,ed);
  for(let line=1;line<=6;line++){
   const t=flipLine(key(v),line),u=flipLine(key(t),line);
   assert.equal(t.contextCode,v.contextCode);
   assert.equal(u.hsn,v.hsn);assert.equal(u.hexagramCode,v.hexagramCode);
  }
 }
});

test('all 5,184 undirected binary line edges and 3,456 context-adjacent edges',()=>{
 const counts=navigationCounts();assert.deepEqual(counts,expected);
 for(const ed of [CUPWAKE_EDITION,SYMBIOSIS_EDITION]){
  const flips=new Set(),contexts=new Set();
  for(const hsn of originalAddresses){
   const e=encodeYijing(hsn,ed),k=key(e);
   for(let line=1;line<=6;line++){
    const t=flipLine(k,line);flips.add([hsn,t.hsn].sort().join('~'));
   }
   for(let axis=0;axis<3;axis++){
    const t=stepContext(k,axis,1);
    if(t.status!=='HOLD'){
     contexts.add([hsn,t.hsn].sort().join('~'));
     assert.equal(stepContext(key(t),axis,-1).hsn,hsn);
    }
   }
  }
  assert.equal(flips.size,5184);assert.equal(contexts.size,3456);
 }
});

test('glyph coefficients are six binary lines plus three balanced ternary values',()=>{
 for(const ed of [CUPWAKE_EDITION,SYMBIOSIS_EDITION])for(let code=0;code<64;code+=7)for(let context=0;context<27;context+=3){
  const keyv={edition:ed,hexagramCode:code,contextCode:context},g=glyphCoefficients(keyv);
  assert.equal(g.length,9);
  assert.ok(g.slice(0,6).every(x=>x===-1||x===1));
  assert.ok(g.slice(6).every(x=>[-1,0,1].includes(x)));
  assert.equal(decodeGlyphCoefficients(g,ed),decodeYijing(keyv));
  assert.match(glyphDigitalToken(keyv),/^YJC1:07533cf7a6b6:/);
 }
});

test('analytical cymatic field is dimensionless; cannot infer physical frequency or source semantics',()=>{
 const k=key(encodeYijing('H04.S05.N06'));
 const g=glyphCoefficients(k),grid=dimensionlessGlyphGrid(k,12);
 assert.equal(grid.rows.length,12);assert.equal(grid.rows[0].length,12);
 assert.equal(grid.fieldUnits,'DIMENSIONLESS');assert.equal(grid.frequencyHz,null);
 assert.equal(grid.physicalCalibration,'NOT_PERFORMED');
 assert.ok(grid.rows.flat().every(x=>Number.isFinite(x)&&Math.abs(x)<=1.0000000001));
 for(const y of [0,0.3,1]){
  assert.ok(Math.abs(analyticGlyphSample(g,0,y).value)<1e-12);
  assert.ok(Math.abs(analyticGlyphSample(g,1,y).value)<1e-12);
 }
 assert.throws(()=>analyticGlyphSample(g,0.5,NaN));
 assert.throws(()=>dimensionlessGlyphGrid(k,65));
 assert.equal(symbolicDigest(k).length,64);
});

test('external KG8/META145/WaveLattice glyphs are source-pinned pointers, never exact encoding or real vibrations',()=>{
 const record={hsn:'H03.S03.N03',namespace:'KG8Q',sourceEdition:'kg8-r03',sourceSha256:SHA('a'),token:'KG8Q:07533cf7a6b6:sala.sala.sala',mode:'WORK',relationKind:'COMPUTATIONAL_OPERATOR'};
 const v=inspectGlyphPointer(record);
 assert.equal(v.wireCompatible,false);assert.equal(v.semanticMappingVerified,false);
 assert.equal(v.sourceRightsVerified,false);assert.equal(v.review,'PROPOSED_UNREVIEWED');
 for(const bad of [ {...record,mode:'PLAY'},{...record,sourceSha256:'bad'},{...record,relationKind:'EXACT_IDENTITY'},{...record,token:''}])assert.throws(()=>inspectGlyphPointer(bad));
});

test('untrusted Proxy/accessor and malformed extra fields are rejected without executing attacker code',()=>{
 const keyv=key(encodeYijing('H01.S02.N03'));
 let calls=0;
 const bad={...keyv};Object.defineProperty(bad,'contextCode',{enumerable:true,get(){calls++;throw Error('getter ran');}});
 assert.throws(()=>glyphCoefficients(bad));assert.equal(calls,0);
 assert.throws(()=>decodeYijing(new Proxy(keyv,{get(){calls++;throw Error('proxy ran')}})));
 assert.equal(calls,0);
 assert.throws(()=>glyphCoefficients({...keyv,extra:'private'}));
 assert.throws(()=>decodeGlyphCoefficients(new Proxy([1,1,1,1,1,1,0,0,0],{})));
 assert.equal(stepContext({edition:keyv.edition,hexagramCode:0,contextCode:0},0,-1).status,'HOLD');
});

test('same gateway-issued result feeds original aliases and sidecar, without re-ranking or a second inference',async()=>{
 let calls=0;
 const query=SHA('b'),source=SHA('c'),model=SHA('d');
 const scores=Array.from({length:1728},(_,i)=>(i%5)-i/1000);
 const gateway={async request(){calls++;return {schema:'atlas.neural.issued/v1',method:'neural',fallbackUsed:false,issuer:'canonical-gateway',modelSha256:model,registrySha256:ARIADNE_SHA256,querySha256:query,sourceId:'work-fixture',sourceSha256:source,sourceEdition:'edition-r01',scores};}};
 const policy=async()=>({decision:'ALLOW',epoch:'epoch1'});
 const reviewClosure=async()=>({status:'MATCHED_PINNED_METADATA',releaseAuthorized:false,authorityEffect:'NONE'});
 const kernel=createGeometryKernel({gateway,policy,reviewClosure});
 const base=await kernel.run({requestId:'yijing-fixture',querySha256:query,sourceId:'work-fixture',sourceSha256:source,sourceEdition:'edition-r01',purpose:'INFERENCE',k:12,scope:'WORK'});
 assert.equal(base.status,'PREPARED_NOT_HOSTED');assert.equal(calls,1);
 const a=attachYijingGlyphs(base,CUPWAKE_EDITION),b=attachYijingGlyphs(base,SYMBIOSIS_EDITION);
 assert.equal(a.status,'PREPARED_SYMBOLIC_ONLY');assert.equal(b.status,'PREPARED_SYMBOLIC_ONLY');assert.equal(calls,1);
 assert.equal(a.originalResult,base.result);assert.equal(a.originalConsumers,base.consumers);
 assert.equal(a.projection.length,12);assert.equal(a.modelInvocationsAdded,0);assert.equal(a.rankChanged,false);
 assert.deepEqual(a.rankOrder,base.result.candidates.map(c=>c.hsn));
 assert.deepEqual(a.projection.map(c=>c.originalScore),base.result.candidates.map(c=>c.score));
 assert.deepEqual(a.rankOrder,flatReference(scores,12).map(c=>c.hsn));
 assert.notDeepEqual(a.projection.map(c=>c.cymatic.digitalToken),b.projection.map(c=>c.cymatic.digitalToken));
 assert.equal(a.releaseAuthorized,false);assert.equal(a.trainingEligible,false);
 assert.equal(attachYijingGlyphs({...base,neuralCalls:2}).status,'HOLD');
});

for(let house=1;house<=12;house++)test(`H${house} 12 Sphere examples preserve both peer Yijing code editions`,()=>{
 for(let sphere=1;sphere<=12;sphere++){
  const hsn=`H${String(house).padStart(2,'0')}.S${String(sphere).padStart(2,'0')}.N12`;
  for(const edition of [CUPWAKE_EDITION,SYMBIOSIS_EDITION]){
   const out=encodeYijing(hsn,edition);assert.equal(decodeYijing(key(out)),hsn);
   assert.equal(decodeGlyphCoefficients(glyphCoefficients(key(out)),edition),hsn);
  }
 }
});
test('malformed issued results do not invoke root or nested getters',()=>{
 let called=0;
 const x={neuralCalls:1,result:{},consumers:{}};
 Object.defineProperty(x,'status',{enumerable:true,get(){called++;return 'PREPARED_NOT_HOSTED';}});
 const held=attachYijingGlyphs(x);assert.equal(held.status,'HOLD');assert.equal(called,0);
 assert.equal(attachYijingGlyphs(new Proxy({status:'PREPARED_NOT_HOSTED'},{})).status,'HOLD');
 const y={status:'PREPARED_NOT_HOSTED',neuralCalls:1,consumers:{}};
 Object.defineProperty(y,'result',{enumerable:true,get(){called++;return {}}});
 assert.equal(attachYijingGlyphs(y).status,'HOLD');assert.equal(called,0);
});
test('forged canonical name without issuer/source identity cannot obtain symbolic adapter',()=>{
 const fake={status:'PREPARED_NOT_HOSTED',neuralCalls:1,result:{schema:'atlas.geometry.cleanroom.result/v1',releaseAuthorized:false,fallbackUsed:false,rankingMethod:'NEURAL_EXACT',modelInvocations:1,source:{registrySha256:ARIADNE_SHA256}},consumers:{}};
 assert.equal(attachYijingGlyphs(fake).status,'HOLD');
});
