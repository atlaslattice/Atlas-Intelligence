import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
import {Meta145GlyphCircuit} from '../src/meta145-glyph.mjs';
import {Hold} from '../src/index.mjs';
const root=(process.env.ATLAS_META145_GLYPH_OUTPUT||'__SOURCE_ONLY_OUTPUT_NOT_CONFIGURED__').replace(/\/?$/,'/');
const source=process.env.ATLAS_ARIADNE_ORIGINAL_FILE||'__OWNER_PRIVATE_SOURCE_NOT_CONFIGURED__';
const available=existsSync(source)&&existsSync(root+'META145_GLYPH_MEMORY.json');
const testWithSource=available?test:test.skip;
function art(){const files={};for(const n of ['node_glyphs_1728.json','perspectives_144.json','sphere_reviews_144.json','house_syntheses_12.json','house_sphere_followups_1728.jsonl'])files[n]=readFileSync(root+n);return files;}
function load(overrides={}){return new Meta145GlyphCircuit({originalAriadneBytes:readFileSync(source),metaBytes:readFileSync(root+'META145_GLYPH_MEMORY.json'),artifactBytes:art(),memoryPolicy:JSON.parse(readFileSync(root+'functional_memory_replay.json','utf8')),...overrides});}
const core=available?load():null;
testWithSource('144 perspectives, 248832 pairs, 1728 aliases',()=>{const s=core.status();assert.equal(s.perspectives,144);assert.equal(s.nodes,1728);assert.equal(s.evaluatedPairs,248832);assert.equal(s.houseSphereFollowupReceipts,1728);assert.equal(s.hostAuthenticated,false);});
testWithSource('HSN native alias is correct and nonauthorizing',()=>{const r=core.resolve('H08.S01.N10');assert.equal(r.name,'Instrument design');assert.equal(r.nodeKind,'DOMAIN_SPECIALIZATION');assert.equal(r.physicalMeaningFromHSN,false);});
testWithSource('KG8 aliases recover exact original HSN identity',()=>{for(const alias of ['KG8Q:07533cf7a6b6:tiri.sala.turu','KG8S:07533cf7a6b6:nil.gal.nul'])assert.equal(core.resolve(alias).coordinate,'H08.S01.N10');});
testWithSource('GF7 belongs to visual-only namespace, not knowledge equivalence',()=>{const x=core.resolve('GF7.B08.M01.C10');assert.equal(x.coordinate,'H08.S01.N10');assert.equal(x.requestedNamespace,'GF7_VISUAL_ONLY');assert.equal(x.cymaticRelation,'POSITIONAL_VISUAL_INDEX_ONLY');});
testWithSource('invalid H00/unaligned glyphs always HOLD',()=>{for(const a of ['H00.S01.N01','KG8Q:000000000000:tiri.sala.turu','Q:tiri.sala.turu','GF7.B00.M01.C10','KG8Q:07533cf7a6b6:qqq.sala.turu'])assert.throws(()=>core.resolve(a),Hold);});
testWithSource('all source profile IDs available and role axis S07 vs S08',()=>{for(let h=1;h<=12;h++)for(let s=1;s<=12;s++){const id=`H${String(h).padStart(2,'0')}.S${String(s).padStart(2,'0')}`;const r=core.sphereReview(id);assert.equal(r.homeNodes.length,12);assert.equal(r.role,s<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META');assert.equal(r.semanticEdgesAccepted,0);}});
testWithSource('historical music false friend never declared scientific sensor',()=>{const x=core.resolve('H08.S01.N10');assert.equal(x.name,'Instrument design');assert.notEqual(x.name,'Nuclear instrumentation');});
testWithSource('twelve House syntheses remain advisory',()=>{for(let h=1;h<=12;h++){const x=core.houseReview('H'+String(h).padStart(2,'0'));assert.equal(x.sphereCount,12);assert.equal(x.canonAuthority,false);}});
testWithSource('memory replay changes index selection, never model weights or permission',()=>{const x=core.functionalMemory();assert.equal(x.selectedPolicy,'POSTINGS_INDEX');assert.equal(x.hasModifiedModelWeights,false);assert.equal(x.continuousBackgroundLearning,false);assert.equal(x.rightsVerified,false);});
testWithSource('preparing Work proposal never posts, imports Play or grants rights',()=>{const x=core.prepareWorkDraft('H01.S01.N01','testroom-alpha');assert.equal(x.status,'PREPARED_NOT_POSTED');assert.equal(x.canPost,false);assert.equal(x.privateModeIngested,false);assert.equal(x.rightsVerified,false);});
testWithSource('unsafe or malformed Work room IDs held',()=>{assert.throws(()=>core.prepareWorkDraft('H01.S01.N01','play/secret'),Hold);});
testWithSource('source digest tamper fails closed',()=>{const src=Buffer.from(readFileSync(source));src[100]^=1;assert.throws(()=>load({originalAriadneBytes:src}),Hold);});
testWithSource('manifest tamper fails closed',()=>{const m=JSON.parse(readFileSync(root+'META145_GLYPH_MEMORY.json'));m.nodes=1727;assert.throws(()=>load({metaBytes:Buffer.from(JSON.stringify(m))}),Hold);});
testWithSource('published record substitution fails even when other data preserved',()=>{const a=art(),nodes=JSON.parse(a['node_glyphs_1728.json']);nodes[0].name='CORRUPT';a['node_glyphs_1728.json']=Buffer.from(JSON.stringify(nodes));assert.throws(()=>load({artifactBytes:a}),Hold);});
testWithSource('missing followups cause HOLD, not false 1728 completed',()=>{const a=art();delete a['house_sphere_followups_1728.jsonl'];assert.throws(()=>load({artifactBytes:a}),Hold);});
testWithSource('wrong registry source digest cannot be grandfathered',()=>{const m=JSON.parse(readFileSync(root+'META145_GLYPH_MEMORY.json'));m.sourceRegistrySHA256='0'.repeat(64);assert.throws(()=>load({metaBytes:Buffer.from(JSON.stringify(m))}),Hold);});
testWithSource('false learning policy rejected',()=>{assert.throws(()=>load({memoryPolicy:{selected:'ADOPT_MODEL_WEIGHTS',siteDeployed:true,sourceSHA256:'0'.repeat(64)}}),Hold);});

testWithSource('older build memory cannot be promoted to current META145',()=>{const old=JSON.parse(readFileSync(root+'functional_memory_replay.json'));old.sourceInputDigest='a'.repeat(64);assert.throws(()=>load({memoryPolicy:old}),Hold);});
