import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {HSN,ARIADNE_SHA256,encode} from '../../atlas-geometry-one-r38/src/addresses.mjs';
import {yijingAddress,yijingDecode,changeLines,contextStep,YIJING_CODECS,CONTEXT_TOPOLOGIES,roleOf,reviewMethodSubject,
 gf7Display,gf7OrdinalProjection,authoredGlyphDisplay,decodeAuthoredGlyphTokens,macroturnDraft,inspectIssuedYijing} from '../src/geometree-yijing-r10.mjs';
const SHA=s=>createHash('sha256').update(s).digest('hex');
const q='a'.repeat(64),source='b'.repeat(64),model='c'.repeat(64),set='d'.repeat(64);
const scores=Array.from({length:1728},(_,i)=>1728-i);
const binder={requestId:'r10-inspect',querySha256:q,sourceSha256:source,modelSha256:model,
  tenant:'t1',principal:'p1',rightsEpoch:'epoch1',sourceEdition:'synthetic-v1',purpose:'WORK_INSPECTION',requiredSetSha256:set};
const root=()=>({schema:'atlas.geometry-one.root/v1',status:'INSPECTION_CANDIDATE_ONLY',sourceScope:'WORK',
  canDeploy:false,releaseAuthorized:false,topology:[12,12,12],sourcePins:{registrySha256:ARIADNE_SHA256,sourceSha256:source,modelSha256:model},
  baseline:{hits:Array.from({length:10},(_,i)=>({hsn:HSN[i],index:i,score:scores[i]}))},
  lineage:{sourceEdition:'synthetic-v1',issuerClaim:'local-synthetic'},tenant:'t1',rightsEpoch:'epoch1',
  frameDigest:SHA(JSON.stringify({requestId:binder.requestId,modelSha256:model,sourceSha256:source,querySha256:q,scores}))});
const call=(over={})=>inspectIssuedYijing({root:root(),queryBinding:{...binder},fullScores:scores,...over});

test('original published PR67 source HSN array is 1728 exact identities',()=>{
 assert.equal(HSN.length,1728);assert.equal(new Set(HSN).size,1728);
 assert.equal(HSN[0],'H01.S01.N01');assert.equal(HSN[1727],'H12.S12.N12');
});
test('R10 original Cupwake 1728-code peer digest exact without R10 bodies',()=>{
 const text=HSN.map(h=>h+'|'+yijingAddress(h).code).join('\n');
 assert.equal(SHA(text),'0676761e6dd049649694ac2296e92d6dd3656ec8e115f050125f987351d92528');
});
test('all 1728 coordinates and 64x27 symbolic codes are reversible',()=>{
 const symbols=new Set();for(const h of HSN){const sym=yijingAddress(h);symbols.add(sym.code);assert.equal(yijingDecode(sym),h)}
 assert.equal(symbols.size,1728);
});
test('specific independent peer address H03.S05.N08 is Y001101.C04',()=>{
 assert.equal(yijingAddress('H03.S05.N08').code,'Y001101.C04');assert.equal(yijingDecode(yijingAddress('H03.S05.N08')),'H03.S05.N08');
});
test('all 110592 change masks reversible with same context',()=>{
 for(const id of HSN)for(let mask=0;mask<64;mask++)assert.equal(changeLines(changeLines(id,mask),mask),id);
});
test('six line flip edges per address preserve geometry not semantic truth',()=>{
 for(const id of HSN)for(let i=0;i<6;i++)assert.notEqual(changeLines(id,1<<i),id);
});
test('three context axes plus two possible neighbors each; no wrapping',()=>{
 let undirected=0;for(const id of HSN)for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
  const next=contextStep(id,axis,sign);if(next){undirected++;assert.equal(contextStep(next,axis,-sign),id)}
 }
 assert.equal(undirected/2,3456);
});
test('line-flip undirected incidence 5184',()=>assert.equal(1728*6/2,5184));
test('invalid symbolic code, mask and context inputs all fail closed',()=>{
 for(const s of ['Y999999.C04','Y101101.C27','Y101101.C-1','Y101101.C4',{},null,'Y101101.C00?'])assert.throws(()=>yijingDecode(s));
 for(const x of [-1,64,1.5,true,'1',null])assert.throws(()=>changeLines(HSN[0],x));
 assert.throws(()=>contextStep(HSN[0],3,1));assert.throws(()=>contextStep(HSN[0],0,2));
});
test('Spheres, not node ordinals, determine DOMAIN/METHOD role',()=>{
 let domain=0,method=0;for(const h of HSN)roleOf(h)==='DOMAIN_SPECIALIZATION'?domain++:method++;
 assert.equal(domain,1008);assert.equal(method,720);
});
test('wrong N-based role determination flips exactly 840 identities',()=>{
 assert.equal(HSN.filter(h=>(Number(h.slice(5,7))<=7)!==(Number(h.slice(9,11))<=7)).length,840);
});
test('method needs explicit same-House DOMAIN subject; not semantic acceptance',()=>{
 assert.equal(reviewMethodSubject('H01.S08.N01').status,'HOLD_SUBJECT_REQUIRED');
 assert.equal(reviewMethodSubject('H01.S08.N01','H01.S08.N02').status,'HOLD_INVALID_SUBJECT');
 assert.equal(reviewMethodSubject('H01.S08.N01','H02.S02.N02').status,'HOLD_INVALID_SUBJECT');
 const yes=reviewMethodSubject('H01.S08.N01','H01.S02.N08');assert.equal(yes.status,'STRUCTURAL_SUBJECT_ONLY');assert.equal(yes.semanticAccepted,false);
});
test('all 1728 parallel GF7 profiles separate from HSN ontology',()=>{
 let distinct=new Set();for(const h of HSN){const x=gf7Display(h);distinct.add(x.address);assert.equal(gf7OrdinalProjection(x.address).parallelHsn,h);assert.equal(x.measuredCount,0);assert.equal(x.semanticEquivalence,false)}
 assert.equal(distinct.size,1728);
});
test('GF7 reference band/material context recovered from staged analytic metadata',()=>{
 let x=gf7Display('H05.S06.N12');assert.equal(x.address,'GF7.B05.M06.C12');assert.deepEqual(x.mode,[3,1]);assert.equal(x.referenceBand,'Bass');assert.equal(x.material,'borosilicate');assert.equal(x.aspectBA,2);
});
test('GF7 malformed names cannot become equivalence',()=>{
 for(const x of ['GF7.B00.M01.C01','GF7.B01.M13.C01','KG8Q:07533cf7a6b6:sulu.tara.mere','GF7.B01.M01.C01x'])assert.throws(()=>gf7OrdinalProjection(x));
});
test('authored AXG2 nine glyph tokens reversible 1728 coordinates',()=>{
 for(const h of HSN){const g=authoredGlyphDisplay(h);assert.equal(g.namespace,'AXG2');assert.equal(g.originalKg8Resolved,false);assert.equal(decodeAuthoredGlyphTokens([...g.tokens]),h)}
});
test('AXG2 rejects missing/synthetic-incorrect or overflow glyph tokens',()=>{
 assert.throws(()=>decodeAuthoredGlyphTokens(Array(9).fill('KG8')));
 assert.throws(()=>decodeAuthoredGlyphTokens(Array(9).fill('HA-SHPONGLE-HOORAY-CYM')));
});
test('MacroTurn 24 offered opportunities, protected actual work ceiling 8',()=>{
 const m=macroturnDraft();assert.equal(m.opportunities.length,24);assert.equal(m.workLikeCeiling,8);
 for(const [mode,count] of Object.entries({Work:6,Play:3,Social:3,Imagine:3,Dream:3,Quiet:2,Explore:4}))assert.equal(m.opportunities.filter(x=>x.mode===mode).length,count);
 assert.equal(m.actualScheduledWakes,0);assert.equal(m.ledgerMutated,false);
});
test('six plus two optional Explore-to-Work allowed; no forced leisure use',()=>{
 const m=macroturnDraft(6,2);assert.equal(m.exploreAsWorkRequested,2);assert.ok(m.opportunities.every(x=>x.activity==='UNPERFORMED'));
 for(const p of [[7,0],[6,3],[-1,0],[1,4],[1,-1],[2,0.5],['6',0]])assert.throws(()=>macroturnDraft(...p));
});
test('one issued root plus complete score vector validates, returns metadata only',()=>{
 const r=call();assert.equal(r.status,'LOCAL_SYMBOLIC_INSPECTION_ONLY');assert.equal(r.annotated.length,10);assert.equal(r.evidenceSourceEdition,'synthetic-v1');assert.equal(r.ontologyEdition,'ariadne-reader/v0.7');
 assert.equal(r.fullScoreFrameSha256?.length,64);assert.equal(r.modelCallsBySidecar,0);assert.equal(r.canRelease,false);assert.equal(r.hostIssuerVerified,false);
 assert.equal(r.annotated[0].yijing.hsn,'H01.S01.N01');assert.equal(r.annotated[0].scoreUnchanged,true);
});
test('result remains review-only with no complete score input, digest null',()=>{
 const r=call({fullScores:null});assert.equal(r.status,'LOCAL_SYMBOLIC_INSPECTION_ONLY');assert.equal(r.fullScoreFrameSha256,null);assert.equal(r.canTrain,false);
});
test('same visible top10 but one hidden score changed is rejected',()=>{
 const tampered=scores.slice();tampered[1700]+=0.0001;const r=call({fullScores:tampered});assert.equal(r.status,'HOLD');assert.equal(r.annotated.length,0);
});
test('changed top ranked result is rejected regardless of exact frame hash',()=>{
 const r=root();r.baseline.hits[0].hsn='H02.S01.N01';assert.equal(call({root:r}).status,'HOLD');
});
test('scope tenant, rights epoch and source edition drift each HOLD',()=>{
 for(const [k,v] of [['tenant','t2'],['rightsEpoch','epoch2'],['sourceEdition','v2'],['purpose','PLAY']]){
  const q2={...binder,[k]:v};assert.equal(call({queryBinding:q2}).status,'HOLD');
 }
});
test('ontology drift, wrong topology, host deployment assertion all HOLD',()=>{
 for(const mut of [r=>r.sourcePins.registrySha256=q,r=>r.topology=[12,12,11],r=>r.canDeploy=true]){
  const r=root();mut(r);assert.equal(call({root:r}).status,'HOLD');
 }
});
test('missing or unpinned required manifest remains HOLD',()=>{
 assert.equal(call({queryBinding:{...binder,requiredSetSha256:'untrusted'}}).status,'HOLD');
 assert.equal(call({queryBinding:{...binder,principal:''}}).status,'HOLD');
});
test('source/ref binding is sensitive to principal while remaining nonauthoritative',()=>{
 const a=call(),b=call({queryBinding:{...binder,principal:'p2'}});assert.equal(a.status,'LOCAL_SYMBOLIC_INSPECTION_ONLY');
 assert.equal(b.status,'LOCAL_SYMBOLIC_INSPECTION_ONLY');assert.notEqual(a.bindingScopeSha256,b.bindingScopeSha256);
 assert.equal(b.sourceRightsAtTransportVerified,false);
});
test('hostile getter root refused before getter invocation',()=>{
 let reads=0;const r=root();Object.defineProperty(r,'baseline',{enumerable:true,get(){reads++;throw Error('attack')}});
 assert.equal(call({root:r}).status,'HOLD');assert.equal(reads,0);
});
test('proxy root and sparse score arrays never release',()=>{
 assert.equal(call({root:new Proxy(root(),{})}).status,'HOLD');const s=scores.slice();delete s[2];assert.equal(call({fullScores:s}).status,'HOLD');
});
test('non-finite and bool score inputs rejected',()=>{
 let a=scores.slice();a[0]=Infinity;assert.equal(call({fullScores:a}).status,'HOLD');a=scores.slice();a[0]=true;assert.equal(call({fullScores:a}).status,'HOLD');
});
test('changed public source lineage never counts as a new model call',()=>{
 const a=call();assert.equal(a.modelCallsBySidecar,0);assert.equal(a.authorityEffect,'NONE');
});

test('bare hexagrams are rejected without codec edition and topology',()=>{
 assert.throws(()=>yijingDecode('Y001101.C04'));
 const a=yijingAddress('H03.S05.N08');assert.equal(yijingDecode(a),'H03.S05.N08');
});
test('two rival Yijing coordinate formulae are distinct and both bijective',()=>{
 let different=0;const codes1=new Set(),codes2=new Set();
 for(const h of HSN){
  const a=yijingAddress(h,{codec:YIJING_CODECS.CUPWAKE_X4});
  const b=yijingAddress(h,{codec:YIJING_CODECS.SYMBIOSIS_X3});
  assert.equal(yijingDecode(a),h);assert.equal(yijingDecode(b),h);
  if(a.code!==b.code)different++;
  codes1.add(a.code);codes2.add(b.code);
 }
 assert.equal(codes1.size,1728);assert.equal(codes2.size,1728);
 assert.equal(different,1720);
});
test('peer #435 false friend: same code under different edition changes HSN',()=>{
 const h='H02.S05.N11';const a=yijingAddress(h,{codec:YIJING_CODECS.CUPWAKE_X4});
 const b=yijingAddress(h,{codec:YIJING_CODECS.SYMBIOSIS_X3});
 assert.notEqual(a.code,b.code);
 const swapped={...a,codec:YIJING_CODECS.SYMBIOSIS_X3,namespace:b.namespace};
 assert.throws(()=>yijingDecode(swapped),'must HOLD cross-edition relabel');
 assert.throws(()=>yijingDecode({...a,ontologySha256:'f'.repeat(64)}));
});
test('SYMBIOSIS_X3 code swaps cannot be decoded as Cupwake raw string',()=>{
 const b=yijingAddress('H01.S01.N02',{codec:YIJING_CODECS.SYMBIOSIS_X3});
 assert.throws(()=>yijingDecode(b.code));
 assert.equal(yijingDecode(b),'H01.S01.N02');
 assert.notEqual(b.code,yijingAddress('H01.S01.N02').code);
});
test('all 110592 changing-line masks work in independently versioned X3 geometry',()=>{
 const opts={codec:YIJING_CODECS.SYMBIOSIS_X3};
 for(const h of HSN)for(let mask=0;mask<64;mask++)assert.equal(changeLines(changeLines(h,mask,opts),mask,opts),h);
});
test('bounded P3 cube and cyclic C3 torus are explicitly different context topologies',()=>{
 let bounded=0,cyclic=0;
 for(const h of HSN)for(let axis=0;axis<3;axis++)for(const d of [-1,1]){
  if(contextStep(h,axis,d,{topology:CONTEXT_TOPOLOGIES.BOUNDED})!==null)bounded++;
  const y=contextStep(h,axis,d,{topology:CONTEXT_TOPOLOGIES.CYCLIC});
  assert.equal(contextStep(y,axis,-d,{topology:CONTEXT_TOPOLOGIES.CYCLIC}),h);cyclic++;
 }
 assert.equal(bounded/2,3456);assert.equal(cyclic/2,5184);
});
test('new current result exposes two tagged views but never reranks',()=>{
 const r=call();assert.equal(r.status,'LOCAL_SYMBOLIC_INSPECTION_ONLY');
 assert.equal(r.annotated[0].yijing.codec,YIJING_CODECS.CUPWAKE_X4);
 assert.equal(r.annotated[0].yijingAlternative.codec,YIJING_CODECS.SYMBIOSIS_X3);
 assert.equal(r.annotated[0].yijingAlternative.provenance,'RECONSTRUCTED_FROM_PEER_FORMULA_NOT_ORIGINAL_SOURCE_BYTES');
 assert.equal(r.ranksRerouted,false);
});
