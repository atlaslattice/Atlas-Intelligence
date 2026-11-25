import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateCatalogue,featureLibraryStatus,parseHSN,openAICompatibleTools} from '../src/native_core.mjs';
import {generateWorkOrders} from '../src/workboard.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/feature_candidates_144.json',import.meta.url)));
const sources=JSON.parse(fs.readFileSync(new URL('../data/source_registry.json',import.meta.url)));
const okay=()=>validateCatalogue(data,sources);
test('catalogue exactly 144 reviewed candidates with no authority',()=>{
 const r=okay(); assert.equal(r.status,'SOURCE_LINKED_CANDIDATES_PREPARED');assert.equal(r.features,144);
 assert.equal(r.modules,12);assert.equal(r.installedFeatures,0);assert.equal(r.canPublish,false);assert.equal(r.canTrain,false);
});
test('distinct sources and no private ontology meaning inferred',()=>{
 assert.equal(new Set(data.features.map(x=>x.title)).size,144);
 assert.equal(new Set(data.features.map(x=>x.reviewSlotOnly)).size,144);
 assert.ok(data.features.every(x=>x.semanticMappingStatus==='UNREVIEWED_NO_SAME_AS'));
});
test('SOURCE copy eligibility does not grant model/dataset rights',()=>{
 assert.equal(featureLibraryStatus('MIT','ACTIVE'),'REVIEW_PERMISSIVE_NOTICE_AND_MODEL_DATA_SEPARATELY');
 assert.equal(featureLibraryStatus('AGPL-3.0','COPY_REVIEW_REQUIRED'),'HOLD_COPYRIGHT_REVIEW');
 assert.equal(featureLibraryStatus('LGPL-3.0','COPY_REVIEW_REQUIRED'),'HOLD_COPYRIGHT_REVIEW');
 assert.equal(featureLibraryStatus('GPL-3.0','COPY_REVIEW_REQUIRED'),'HOLD_COPYRIGHT_REVIEW');
 assert.equal(featureLibraryStatus('CeCILL-2.1','COPY_REVIEW_REQUIRED'),'HOLD_COPYRIGHT_REVIEW');
 assert.equal(featureLibraryStatus('UNKNOWN','ARCHIVED_2026_05_13'),'HOLD_ARCHIVED');
 assert.equal(featureLibraryStatus('NOASSERTION','ACTIVE'),'HOLD_LICENSE');
});
test('tampered upstream license does not pass',()=>{const c=structuredClone(data);c.features[0].upstreamLicensePrimary='MIT';assert.equal(validateCatalogue(c,sources).status,'HOLD_NOT_AUTHORIZED')});
test('tampered upstream ref does not pass',()=>{const c=structuredClone(data);c.features[0].primaryRepo='private/repo';assert.equal(validateCatalogue(c,sources).status,'HOLD_NOT_AUTHORIZED')});
test('candidate claims cannot be promoted',()=>{const c=structuredClone(data);c.features[0].adoption='DEPLOYED';assert.equal(validateCatalogue(c,sources).status,'HOLD_NOT_AUTHORIZED')});
test('duplicate engineering slot fails',()=>{const c=structuredClone(data);c.features[1].reviewSlotOnly=c.features[0].reviewSlotOnly;assert.equal(validateCatalogue(c,sources).status,'HOLD_NOT_AUTHORIZED')});
test('one-based HSN and uniform domain/method roles',()=>{
 assert.equal(parseHSN('H05.S06.N12').role,'DOMAIN_SPECIALIZATION');
 assert.equal(parseHSN('H05.S11.N04').role,'EPISTEMIC_META');
 assert.equal(parseHSN('H12.S12.N12').ordinal,1728);
 assert.equal(parseHSN('H00.S00.N00'),null);
});
test('workboard has no publishing, training or automation',()=>{
 const x=generateWorkOrders(data,sources);assert.equal(x.status,'PREPARED_NOT_POSTED');assert.equal(x.orderCount,144);
 assert.equal(x.authorities.canPost,false);assert.equal(x.authorities.canTrain,false);assert.ok(x.workOrders.every(y=>y.canPublish===false&&y.hostAuthorized===false));
});
test('original OpenAI-compatible descriptor is not installed tool',()=>{
 const x=openAICompatibleTools();assert.equal(x[0].type,'function');assert.equal(x[0].parameters.additionalProperties,false);
 assert.equal(x.length,1);
});
test('source metadata flags archive and copyleft',()=>{
 let sp=sources.sources.find(x=>x.repo==='lava-nc/lava');assert.equal(sp.upstreamStatus,'ARCHIVED_2026_05_13');
 assert.equal(sp.codeCopyEligible,false);
 assert.equal(sources.sources.find(x=>x.repo==='BindsNET/bindsnet').codeCopyEligible,false);
});
for(const f of data.features){
 test(`144-cell independent source and negative-control review ${f.id}`,()=>{
  assert.match(f.id,/^NEURO\.M\d\d\.F\d\d$/);
  assert.ok(f.proposedDesign.length>=35);
  assert.ok(f.testThatWouldDisproveIt.length>=25);
  assert.ok(f.primaryUrl.startsWith('https://github.com/'));
  assert.ok(f.secondaryUrl.startsWith('https://github.com/'));
  assert.equal(f.adoption,'PROPOSED_NOT_IMPLEMENTED');
  const o=generateWorkOrders(data,sources).workOrders.find(x=>x.workId===f.id);
  assert.ok(o);assert.equal(o.releaseStatus,'PROPOSED_NOT_IMPLEMENTED');
 });
}
