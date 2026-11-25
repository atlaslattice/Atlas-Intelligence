import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectSphereProfile,PROFILE_CODEC,LEGACY_CODEC,ARIADNE_SOURCE_SHA} from '../src/profile_hash_codec.mjs';
const hash=x=>createHash('sha256').update(x,'utf8').digest('hex');
function profile(text='Farmer’s right to receive evidence',sphere='H05.S10'){
 const p={sphere_id:sphere,house_id:sphere.slice(0,3),kind:Number(sphere.slice(-2))>7?'epistemic_meta':'domain',name:text,source_node_ids:[sphere+'.N01']};
 const sorted=JSON.stringify(Object.fromEntries(Object.keys(p).sort().map(k=>[k,p[k]])));
 return {...p,profile_sha256:hash(sorted)};
}
test('original apostrophe encoded as literal UTF8 profile',()=>{
 const p=profile();const result=inspectSphereProfile(p);
 assert.equal(result.status,'LOCAL_UTF8_DIGEST_MATCH');
 assert.equal(result.profileCodec,PROFILE_CODEC);
 assert.equal(result.historicalScopeRequiresFreshReview,true);
 assert.notEqual(result.calculatedAsciiEscapedSha256,result.calculatedUtf8Sha256);
 assert.equal(result.canPromote,false);assert.equal(result.rightsAttested,false);
});
test('ordinary ASCII profile remains equivalent to legacy',()=>{
 const p=profile('plain ASCII review');const r=inspectSphereProfile(p);
 assert.equal(r.status,'LOCAL_UTF8_DIGEST_MATCH');assert.equal(r.historicalScopeRequiresFreshReview,false);
 assert.equal(r.legacyCodec,LEGACY_CODEC);
});
test('wrong profile digest held',()=>{
 const p=profile();p.profile_sha256='0'.repeat(64);assert.equal(inspectSphereProfile(p).status,'HOLD');
});
test('forged ontology registry holds',()=>{
 assert.equal(inspectSphereProfile(profile(),{expectedRegistrySha256:'f'.repeat(64)}).status,'HOLD');
});
test('missing namespace edition scope held',()=>{
 const p=profile();p.sphere_id='GF7.B05.M10';assert.equal(inspectSphereProfile(p).status,'HOLD');
});
test('incorrect method/domain role held',()=>{
 const p=profile();p.kind='domain';assert.equal(inspectSphereProfile(p).status,'HOLD');
});
test('incorrect parent House held',()=>{
 const p=profile();p.house_id='H01';assert.equal(inspectSphereProfile(p).status,'HOLD');
});
test('proxy profile held without accepting content',()=>{
 assert.equal(inspectSphereProfile(new Proxy(profile(),{})).status,'HOLD');
});
test('getter profile cannot execute user code',()=>{
 const p=profile();let count=0;Object.defineProperty(p,'name',{enumerable:true,get(){++count;throw Error('INVOKED')}});
 assert.equal(inspectSphereProfile(p).status,'HOLD');assert.equal(count,0);
});
test('getter options cannot execute user code',()=>{
 let count=0;const opts={};Object.defineProperty(opts,'expectedRegistrySha256',{enumerable:true,get(){++count;throw Error('INVOKED')}});
 assert.equal(inspectSphereProfile(profile(),opts).status,'HOLD');assert.equal(count,0);
});
test('injected toJSON function is not executed',()=>{
 const p=profile();let count=0;p.toJSON=()=>{count++;return {}};
 assert.equal(inspectSphereProfile(p).status,'HOLD');assert.equal(count,0);
});
test('extra symbol properties cannot secretly change scope',()=>{
 const p=profile();p[Symbol('extra')]='bad';assert.equal(inspectSphereProfile(p).status,'HOLD');
});
test('literal Unicode changes digest with source content',()=>{
 const p=profile('Atypical institution’s history');const q=profile('Atypical institution history');
 assert.notEqual(p.profile_sha256,q.profile_sha256);
 assert.equal(inspectSphereProfile(p).status,'LOCAL_UTF8_DIGEST_MATCH');
});
test('no approval even when all syntactic fields match',()=>{
 const r=inspectSphereProfile(profile());assert.equal(r.canPromote,false);
 assert.equal(r.semanticAccepted,false);assert.equal(r.authorityEffect,'NONE');
});
