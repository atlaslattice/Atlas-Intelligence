/** Synthetic source gate regression; not real Site IAM or release proof. */
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {inspectReleaseSource,reviewManifestFile,parseFlatManifestBytes} from '../scripts/source-release-preflight.mjs';
const baseline=JSON.parse(readFileSync(new URL('../docs/RELEASE_GATES.json',import.meta.url),'utf8'));
const withVal=(k,v)=>({...baseline,[k]:v});

test('source manifest produces NO-GO without impersonating publisher',()=>{
  const r=inspectReleaseSource(baseline);
  assert.equal(r.status,'SOURCE_REVIEW_HOLD');assert.equal(r.canPublish,false);
  assert.equal(r.hostAttested,false);assert.equal(r.canonEffect,'NONE');
  assert.ok(r.heldFields.includes('twoAccountD1'));
});
test('changed canPublish boolean is rejected as source self-promotion',()=>{
  assert.equal(inspectReleaseSource(withVal('canPublish',true)).reason,'SELF_CLAIMED_PUBLISH_PERMISSION');
});
test('arbitrary source string VERIFIED cannot provide host attestation',()=>{
  const fake={...baseline};for(const k of ['currentServedSiteHead','hostOwnedIssuer','twoAccountD1','workReadAndReturnRevoke','signedConversationCallback','productionDeployment'])fake[k]='VERIFIED';
  const r=inspectReleaseSource(fake);assert.equal(r.status,'SOURCE_REVIEW_HOLD');assert.equal(r.canPublish,false);assert.equal(r.hostAttested,false);
});
test('fake CANON adoption cannot change normative state',()=>{
  const r=inspectReleaseSource(withVal('canonAdoption','RATIFIED'));assert.equal(r.canPublish,false);assert.equal(r.canonEffect,'NONE');
});
test('wrong schema fails closed',()=>{assert.equal(inspectReleaseSource(withVal('schema','something-else')).status,'INVALID_SOURCE_MANIFEST')});
test('missing mandatory gate fails closed',()=>{const x={...baseline};delete x.twoAccountD1;assert.equal(inspectReleaseSource(x).reason,'MISSING_OR_UNKNOWN_GATE_FIELD')});
test('unrecognized gate key fails closed',()=>{assert.equal(inspectReleaseSource(withVal('secretOverride','yes')).status,'INVALID_SOURCE_MANIFEST')});
test('nonobject input fails closed',()=>{for(const x of [null,[],false,'string'])assert.equal(inspectReleaseSource(x).canPublish,false)});
test('unbounded gate value fails closed',()=>{assert.equal(inspectReleaseSource(withVal('twoAccountD1','x'.repeat(1000))).status,'INVALID_SOURCE_MANIFEST')});
test('wrong candidate version fails closed',()=>{assert.equal(inspectReleaseSource(withVal('candidateVersion','3.0.0')).reason,'UNPINNED_CANDIDATE_VERSION')});
test('current exact JSON file remains held',()=>{
  assert.equal(reviewManifestFile(new URL('../docs/RELEASE_GATES.json',import.meta.url)).status,'SOURCE_REVIEW_HOLD');
});
test('duplicate-key document remains non-authorizing even if JSON.parse accepts it',()=>{
  const p=join(mkdtempSync(join(tmpdir(),'atlas-release-')),'gates.json');
  writeFileSync(p,readFileSync(new URL('../docs/RELEASE_GATES.json',import.meta.url),'utf8').replace('"canPublish":false','"canPublish":false,"canPublish":true'));
  assert.equal(reviewManifestFile(p).canPublish,false);
});
test('invalid UTF-8 file fails closed',()=>{
  const p=join(mkdtempSync(join(tmpdir(),'atlas-release-')),'invalid.json');writeFileSync(p,Buffer.from([0x7b,0x22,0xff,0x22,0x3a,0x31,0x7d]));
  assert.equal(reviewManifestFile(p).status,'INVALID_SOURCE_MANIFEST');
});
test('missing file fails closed',()=>{assert.equal(reviewManifestFile('/definitely-not-present-atlas-gates.json').canPublish,false)});

// R08: exact former JSON.parse weakness was accepting two identical gate keys
// and silently choosing the last value. These are source ingress tests only.
const encoded=x=>Buffer.from(x,'utf8');
const baselineBytes=readFileSync(new URL('../docs/RELEASE_GATES.json',import.meta.url));
test('R08: flat source manifest accepted and still never authorizes publishing',()=>{
  const parsed=parseFlatManifestBytes(baselineBytes);
  assert.equal(parsed.canPublish,false);
  assert.equal(inspectReleaseSource(parsed).canPublish,false);
});
test('R08: identical duplicate gate keys rejected before map construction',()=>{
  const dup=baselineBytes.toString('utf8').replace('"twoAccountD1":"UNVERIFIED"','"twoAccountD1":"UNVERIFIED","twoAccountD1":"VERIFIED"');
  assert.throws(()=>parseFlatManifestBytes(encoded(dup)),/INVALID_SOURCE_JSON/);
});
test('R08: JSON escaped key alias rejected rather than overwritten',()=>{
  const dup=baselineBytes.toString('utf8').replace('"twoAccountD1":"UNVERIFIED"','"twoAccountD1":"UNVERIFIED","twoAccountD\\u0031":"VERIFIED"');
  assert.throws(()=>parseFlatManifestBytes(encoded(dup)),/INVALID_SOURCE_JSON/);
});
test('R08: canonically equivalent NFC key aliases rejected',()=>{
  assert.throws(()=>parseFlatManifestBytes(encoded('{"é":"a","e\\u0301":"b"}')),/INVALID_SOURCE_JSON/);
});
test('R08: unpaired surrogate key and value rejected',()=>{
  for(const src of ['{"\\ud800":"x"}','{"k":"\\udfff"}'])assert.throws(()=>parseFlatManifestBytes(encoded(src)),/INVALID_SOURCE_JSON/);
});
test('R08: unsupported nested JSON and numeric gates rejected',()=>{
  for(const src of ['{"twoAccountD1":{}}','{"twoAccountD1":12}','{"twoAccountD1":[]}','[1]'])assert.throws(()=>parseFlatManifestBytes(encoded(src)),/INVALID_SOURCE_JSON/);
});
test('R08: UTF-8 BOM and trailing data rejected',()=>{
  assert.throws(()=>parseFlatManifestBytes(Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),baselineBytes])),/INVALID_SOURCE_JSON/);
  assert.throws(()=>parseFlatManifestBytes(encoded(baselineBytes.toString('utf8')+' false')),/INVALID_SOURCE_JSON/);
});
test('R08: quoted strings with escaped separators are read exactly',()=>{
  const out=parseFlatManifestBytes(encoded(JSON.stringify({schema:'atlas.one.release-gates/v2',note:'quoted: "hi"'})));
  assert.equal(out.note,'quoted: "hi"');
});
test('R08: missing or oversized raw bytes fail closed before decoding',()=>{
  assert.throws(()=>parseFlatManifestBytes('not buffer'),/SOURCE_SIZE_LIMIT/);
  assert.throws(()=>parseFlatManifestBytes(Buffer.alloc(32769)),/SOURCE_SIZE_LIMIT/);
});
