import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {AriadneRegistry,prepareResearch,parseStrictJson,versionInfo,Hold,publicUrl,validCoord,digest,sha256,HSN_SHA256,canonical} from '../src/index.mjs';
const src=process.env.ATLAS_ARIADNE_ORIGINAL_FILE;
const cases=JSON.parse(readFileSync(new URL('../examples/four-source-candidates.json',import.meta.url),'utf8'));
let registry=src?new AriadneRegistry(readFileSync(src)):null;
function fails(fn,code){assert.throws(fn,e=>e instanceof Hold&&e.code===code);}
test('version explicitly non-hosted',()=>{const v=versionInfo();assert.equal(v.hostDeployment,'NOT_VERIFIED');assert.equal(v.canon,'UNCHANGED');});
test('SHA256 deterministic',()=>assert.equal(sha256(Buffer.from('abc')),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'));
test('canonical input deterministic regardless of key order',()=>assert.equal(digest({z:4,a:2}),digest({a:2,z:4})));
test('no digest for unsafe JS value',()=>fails(()=>canonical({nested:undefined}),'NONCANONICAL_VALUE'));
for(const [name,val,code] of [
 ['duplicate','{"x":1,"x":2}','DUPLICATE_OR_UNICODE_ALIAS_KEY'],
 ['unicode alias','{"é":1,"e\\u0301":2}','DUPLICATE_OR_UNICODE_ALIAS_KEY'],
 ['nonfinite','{"x":1e400}','NONFINITE_NUMBER'],
 ['underflow','{"x":1e-400}','NUMERIC_UNDERFLOW'],
 ['unsafe int','{"x":9007199254740993}','UNSAFE_INTEGER'],
 ['long mantissa','{"x":0.1234567890123456789}','LOSSY_DECIMAL_LEXEME'],
 ['trailing','{"x":1} junk','TRAILING_JSON_DATA'],
 ['malformed','{"x":}','INVALID_JSON_TOKEN'],
 ['unterminated','{"x":"foo}','UNTERMINATED_JSON_STRING'],
 ['leading zero','{"x":01}','JSON_COMMA_REQUIRED'],
 ['comment','{/*bad*/}','JSON_STRING_EXPECTED'],
 ['nonarr','[2,]','INVALID_JSON_TOKEN']
])test('strict parser rejects '+name,()=>fails(()=>parseStrictJson(val),code));
for(const val of ['{}','[1,2,3]','{"n":0.1,"x":"valid"}','{"nested":{"q":true,"r":null}}','{"emoji":"🌊"}'])test('strict parser accepts bounded shape '+val.slice(0,12),()=>assert.ok(parseStrictJson(val)!==undefined));
test('strict parser enforces size',()=>fails(()=>parseStrictJson('{"hello":"world"}',{maxBytes:3}),'JSON_SIZE_LIMIT'));
test('strict parser enforces nesting',()=>fails(()=>parseStrictJson('[[[]]]',{maxDepth:1}),'JSON_NESTING_LIMIT'));
for(const c of ['H00.S01.N01','H13.S01.N01','H01.S00.N01','H01.S01.N13','H1.S01.N01','H01.S01.N01#x'])test('reject legacy or malformed HSN '+c,()=>assert.equal(validCoord(c),false));
for(const u of ['http://doi.org/10.1/2','https://example.com/source','https://doi.org/abc?secret=1','https://user:pass@doi.org/a','https://doi.org/x#secret'])test('deny unsafe source URI '+u,()=>assert.equal(publicUrl(u),false));
test('allow safe DOI',()=>assert.equal(publicUrl('https://doi.org/10.1000/abc'),true));
test('owner source digest known',()=>assert.equal(HSN_SHA256,'07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'));
test('reject arbitrary source bytes',()=>fails(()=>new AriadneRegistry(Buffer.from('{}')),'ARIADNE_SOURCE_DIGEST_MISMATCH'));
test('reject registry as dict not bytes',()=>fails(()=>new AriadneRegistry({nodes:{}}),'ORIGINAL_REGISTRY_BYTES_REQUIRED'));
test('research rejects caller forged prepared registry',()=>fails(()=>prepareResearch(cases[0],{lookup:()=>{}}),'REGISTRY_TRUST_ANCHOR_REQUIRED'));
test('four example cases are all Work-only and plausible',()=>{assert.equal(cases.length,4);for(const c of cases){assert.equal(c.mode,'WORK');assert.ok(c.nodes.length>=2);}});
test('registry source full crosshouse packet', {skip:!registry},()=>{
 assert.equal(registry.size,1728);assert.equal(registry.lookup('H08.S01.N10').name,'Instrument design');
 assert.match(registry.lookup('H08.S01.N10').definition,/musical instruments/i);
 for(const c of cases){const p=prepareResearch(c,registry);assert.equal(p.review,'CANDIDATE_NOT_ADJUDICATED');assert.equal(p.canPublish,false);assert.equal(p.nodes.length,c.nodes.length);}
});
for(const [name,make,code] of [
 ['wrong mode',a=>{a.mode='PLAY';},'CASE_INVALID_OR_NOT_WORK'],
 ['forged authority',a=>{a.ownerAdmin=true;},'UNTRUSTED_AUTHORITY_FIELD'],
 ['zero based coord',a=>{a.nodes[0]='H00.S00.N00';},'NODES_INVALID'],
 ['duplicated coord',a=>{a.nodes[1]=a.nodes[0];},'NODES_INVALID'],
 ['single house',a=>{a.nodes=['H01.S05.N02','H01.S05.N09'];},'CROSS_DOMAIN_REQUIRED'],
 ['false DOI source',a=>{a.papers[0].url='https://evil.test/x';},'PAPER_ID_OR_URL_INVALID'],
 ['unknown relation',a=>{a.relation='SAME_AS';},'RELATION_UNSUPPORTED'],
 ['duplicate paper',a=>{a.papers.push({...a.papers[0]});},'DUPLICATE_SOURCE_ID'],
 ['zero cited paper',a=>{a.papers=[];},'PAPERS_INVALID'],
 ['bad calendar date',a=>{a.papers[0].publishedDate='2026-02-30';},'PAPER_DATE_OR_STATUS_INVALID'],
 ['not enough text',a=>{a.hypothesis='abc';},'MISSING_HYPOTHESIS_CONTENT']
])test('owner-source research HOLD '+name,{skip:!registry},()=>{let c=structuredClone(cases[0]);make(c);fails(()=>prepareResearch(c,registry),code);});
