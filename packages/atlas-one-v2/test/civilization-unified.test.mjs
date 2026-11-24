import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {CivilizationUnifiedBuild, evaluateModuleFunction,sampleModuleInput,MODULES,CIVILIZATION_SCHEMA,ARIADNE_SHA} from '../src/civilization-unified.mjs';
import {Hold} from '../src/index.mjs';

const root=process.env.ATLAS_ARIADNE_ORIGINAL_FILE;
const dir=process.env.ATLAS_META145_GLYPH_OUTPUT;
const sha=b=>createHash('sha256').update(b).digest('hex');
const good=()=>{
  const originalAriadneBytes=readFileSync(root);
  const metaManifestBytes=readFileSync(join(dir,'META145_GLYPH_MEMORY.json'));
  const names=['node_glyphs_1728.json','perspectives_144.json','sphere_reviews_144.json','house_syntheses_12.json','house_sphere_followups_1728.jsonl'];
  const artifactBytes=Object.fromEntries(names.map(x=>[x,readFileSync(join(dir,x))]));
  const memoryPolicy=JSON.parse(readFileSync(join(dir,'functional_memory_replay.json')));
  return {originalAriadneBytes,metaManifestBytes,artifactBytes,memoryPolicy};
};
const priv=Boolean(root&&dir);

// Every House owns one DISTINCT executable review schema and a deny case.
for(const m of MODULES){
  test(`portable ${m.house}: positive functional local fixture`,()=>{
    const x=evaluateModuleFunction(m.house,sampleModuleInput(m.house,`${m.house}.S01`));
    assert.equal(x.status,'LOCAL_SCHEMA_REVIEW_ONLY');
    assert.equal(x.capability,m.capability);
    assert.equal(x.hostAuthenticated,false);assert.equal(x.canonChanged,false);
  });
  test(`portable ${m.house}: bogus authority or privacy input fails`,()=>{
    const x=evaluateModuleFunction(m.house,{...sampleModuleInput(m.house),hostAuthorization:true});
    assert.equal(x.status,'HOLD');assert.equal(x.hostAuthenticated,false);
  });
}

test('portable 12 unique module IDs, capability functions and subjects',()=>{
 assert.equal(MODULES.length,12);
 assert.equal(new Set(MODULES.map(x=>x.house)).size,12);
 assert.equal(new Set(MODULES.map(x=>x.capability)).size,12);
 assert.equal(new Set(MODULES.map(x=>x.gate)).size,12);
 assert.ok(MODULES.every(x=>x.prompt.length>30));
});
test('portable resource budget equation must close',()=>{
 const x=sampleModuleInput('H07');assert.equal(evaluateModuleFunction('H07',x).status,'LOCAL_SCHEMA_REVIEW_ONLY');
 assert.equal(evaluateModuleFunction('H07',{...x,allocation:85}).status,'HOLD');
});
test('portable Water flow does not accept negative disguised correction',()=>{
 const x=sampleModuleInput('H02');
 assert.equal(evaluateModuleFunction('H02',{...x,imports:-1,closing:89}).status,'HOLD');
 assert.equal(evaluateModuleFunction('H02',{...x,withdrawals:12,closing:99}).status,'HOLD');
});
test('portable creative cannot cross from protected mode into Work',()=>{
 const x=sampleModuleInput('H08');
 assert.equal(evaluateModuleFunction('H08',{...x,mode:'WORK'}).status,'HOLD');
 assert.equal(evaluateModuleFunction('H08',{...x,optIn:false}).status,'HOLD');
 assert.equal(evaluateModuleFunction('H08',{...x,bodyImported:true}).status,'HOLD');
});
test('portable real privacy grant not established by self-reported epoch',()=>{
 const x=sampleModuleInput('H11');
 const r=evaluateModuleFunction('H11',x);assert.equal(r.hostAuthenticated,false);assert.equal(r.rightsVerified,false);
 assert.equal(evaluateModuleFunction('H11',{...x,returnEpoch:2}).status,'HOLD');
 assert.equal(evaluateModuleFunction('H11',{...x,allowedAtReturn:false}).status,'HOLD');
 assert.equal(evaluateModuleFunction('H11',{...x,hostValidated:true}).status,'HOLD');
});
test('portable no false source authority from unqualified topic labels',()=>{
 const x=sampleModuleInput('H05');assert.equal(evaluateModuleFunction('H05',{...x,labelIsAuthority:true}).status,'HOLD');
 assert.equal(evaluateModuleFunction('H05',{...x,sourceRefs:[{edition:'v0.7',sha256:'garbled',coordinate:'H01.S01.N01'}]}).status,'HOLD');
});
test('portable health cannot import personal record or infer clinical approval',()=>{
 const x=sampleModuleInput('H04');assert.equal(evaluateModuleFunction('H04',{...x,personalDataIncluded:true}).status,'HOLD');
 assert.equal(evaluateModuleFunction('H04',{...x,clinicalApproval:true}).status,'HOLD');
});
test('portable method dissent must stay unreviewed',()=>{
 const x=sampleModuleInput('H09');
 assert.equal(evaluateModuleFunction('H09',{...x,accepted:true}).status,'HOLD');
 assert.equal(evaluateModuleFunction('H09',{...x,dissentPreserved:false}).status,'HOLD');
});
test('portable community consent cannot be presumed',()=>{
 const x=sampleModuleInput('H10');assert.equal(evaluateModuleFunction('H10',{...x,consentPresumed:true}).status,'HOLD');
});
test('portable physical space model is not flight verification',()=>{
 const x=sampleModuleInput('H12');assert.equal(evaluateModuleFunction('H12',{...x,flightVerified:true}).status,'HOLD');
});
test('portable unknown module and cross-mode are not accepted',()=>{
 assert.equal(evaluateModuleFunction('H00',{mode:'WORK'}).status,'HOLD');
 assert.equal(evaluateModuleFunction('H13',{mode:'WORK'}).status,'HOLD');
 assert.equal(evaluateModuleFunction('H01',{...sampleModuleInput('H01'),mode:'IMAGINE_LOCAL'}).status,'HOLD');
});

// Requires original owner-private v0.7 bytes and the materialized META145 outputs.
test('owner-source SHA verifies from actual bytes before loading', {skip:!priv},()=>{
 assert.equal(sha(good().originalAriadneBytes),ARIADNE_SHA);
});
test('owner-source 1728 node build has exact unique IDs, names and source hashes', {skip:!priv},()=>{
 const a=new CivilizationUnifiedBuild(good());const out=a.build();
 assert.equal(out.nodeCatalog.length,1728);assert.equal(new Set(out.nodeCatalog.map(x=>x.coordinate)).size,1728);
 assert.equal(out.nodeCatalog.filter(x=>x.kind==='DOMAIN_SPECIALIZATION').length,1008);
 assert.equal(out.nodeCatalog.filter(x=>x.kind==='EPISTEMIC_META').length,720);
 assert.ok(out.nodeCatalog.every(x=>x.sourceNodeSha256.match(/^[a-f0-9]{64}$/)&&x.semanticAcceptance===false));
 assert.equal(out.nodeCatalog.find(x=>x.coordinate==='H08.S01.N10').name,'Instrument design');
});
test('owner-source 144 unique Sphere executions and 12 module receipts', {skip:!priv},()=>{
 const out=new CivilizationUnifiedBuild(good()).build();
 assert.equal(out.sphereExecutions.length,144);assert.equal(out.modules.length,12);
 assert.equal(new Set(out.sphereExecutions.map(x=>x.sourcePerspectiveSha256)).size,144);
 assert.ok(out.sphereExecutions.every(x=>x.homeNodes.length===12&&x.execution.fixtureVerified&&x.execution.hostEffects===0));
 assert.deepEqual(out.modules.map(x=>x.sphereCount),Array(12).fill(12));
 assert.ok(out.modules.every(x=>x.localFunctionalFixturePasses===12&&x.status.includes('REVIEW_REQUIRED')));
});
test('owner-source role boundaries are by SPHERE, not N offset', {skip:!priv},()=>{
 const a=new CivilizationUnifiedBuild(good());
 assert.equal(a.node('H01.S01.N08').kind,'DOMAIN_SPECIALIZATION');
 assert.equal(a.node('H01.S08.N01').kind,'EPISTEMIC_META');
 assert.equal(a.sphere('H01.S08').kind,'EPISTEMIC_META');
 assert.equal(a.sphere('H01.S07').kind,'DOMAIN_SPECIALIZATION');
});
test('owner-source 144 receipts form a deterministic source-linked chain', {skip:!priv},()=>{
 const a=new CivilizationUnifiedBuild(good());const x=a.build(),y=a.build();
 assert.deepEqual(x,y);
 assert.equal(x.sphereExecutions[0].previousSha256,'0'.repeat(64));
 for(let i=1;i<144;i++)assert.equal(x.sphereExecutions[i].previousSha256,x.sphereExecutions[i-1].receiptSha256);
 assert.equal(x.metaBuild.sphereChainHead,x.sphereExecutions.at(-1).receiptSha256);
});
test('owner-source wrong registry hash refuses entire build', {skip:!priv},()=>{
 const x=good();const b=Buffer.from(x.originalAriadneBytes);b[200]^=1;
 assert.throws(()=>new CivilizationUnifiedBuild({...x,originalAriadneBytes:b}),e=>e instanceof Hold);
});
test('owner-source wrong meta/registry digest refuses build', {skip:!priv},()=>{
 const x=good();const b=Buffer.from(x.metaManifestBytes);b[b.length-40]^=1;
 assert.throws(()=>new CivilizationUnifiedBuild({...x,metaManifestBytes:b}));
});
test('owner-source glyph visual representation cannot grant acoustic equivalence', {skip:!priv},()=>{
 const a=new CivilizationUnifiedBuild(good()),n=a.node('H08.S01.N10');
 assert.equal(n.name,'Instrument design');
 assert.equal(n.glyphQ,'KG8Q:07533cf7a6b6:tiri.sala.turu');
 assert.equal(n.gf7Visual,'GF7.B08.M01.C10');
 assert.equal(n.semanticAcceptance,false);
 assert.equal(n.authorityEffect,'NONE');
});
test('owner-source SwarmChat drafts are Work-only, nonposting and source-pinned', {skip:!priv},()=>{
 const a=new CivilizationUnifiedBuild(good()),d=a.prepareSwarmChat('H01.S07.N12','atlas-work-qa-room');
 assert.equal(d.status,'PREPARED_NOT_POSTED');assert.equal(d.canPost,false);
 assert.equal(d.rightsAtReturnVerified,false);assert.equal(d.source.coordinate,'H01.S07.N12');
 assert.throws(()=>a.prepareSwarmChat('H08.S01.N10','private/Play'),/ROOM_ID_INVALID/);
 assert.throws(()=>a.prepareSwarmChat('H00.S01.N01','atlas-work-qa-room'));
});
test('owner-source Iron Empire fiction requires independent opt-in', {skip:!priv},()=>{
 const a=new CivilizationUnifiedBuild(good());
 assert.throws(()=>a.prepareIronEmpire('H08',{mode:'WORK',explicitOptIn:true}));
 assert.throws(()=>a.prepareIronEmpire('H08',{mode:'IMAGINE_LOCAL',explicitOptIn:false}));
 const f=a.prepareIronEmpire('H08',{mode:'IMAGINE_LOCAL',explicitOptIn:true});
 assert.equal(f.status,'FICTIONAL_QUESTION_NOT_CANON');assert.equal(f.workIngested,false);assert.equal(f.canonRatified,false);
});
test('owner-source feedback memory remains local, model weights untouched', {skip:!priv},()=>{
 const a=new CivilizationUnifiedBuild(good());const m=a.build().metaBuild;
 assert.equal(m.functionalMemory.status,'VERIFIED_LOCAL_FEEDBACK_REPLAYED');
 assert.equal(m.functionalMemory.hasModifiedModelWeights,false);
 assert.equal(m.actualModelTrainingRuns,0);assert.equal(m.actualResidentMacroturns,0);
});
test('owner-source prior META145 evaluation totals are not multiplied as new experiments', {skip:!priv},()=>{
 const m=new CivilizationUnifiedBuild(good()).build().metaBuild;
 assert.equal(m.sourceScoringPairsPreexistingVerified,248832);
 assert.equal(m.existingHouseSphereFollowupReceipts,1728);
 assert.equal(m.sourceNodes,1728);
 assert.equal(m.localSchemaGatePasses,144);
 assert.equal(m.siteDeployed,false);
});

test('portable H01 quantity syntax is an explicit decimal, not a fictitious measurement',()=>{
 const x=sampleModuleInput('H01');
 assert.equal(evaluateModuleFunction('H01',{...x,quantity:'NaN'}).status,'HOLD');
 assert.equal(evaluateModuleFunction('H01',{...x,quantity:'1e400'}).status,'HOLD');
});
test('portable H05 refuses wrong edition, H00 and caller-made digest despite identical labels',()=>{
 const x=sampleModuleInput('H05');
 for(const sourceRefs of [[{edition:'v0.6',sha256:ARIADNE_SHA,coordinate:'H01.S01.N01'}],
  [{edition:'Ariadne v0.7',sha256:ARIADNE_SHA,coordinate:'H00.S01.N01'}],
  [{edition:'Ariadne v0.7',sha256:'a'.repeat(64),coordinate:'H01.S01.N01'}]]){
  assert.equal(evaluateModuleFunction('H05',{...x,sourceRefs}).status,'HOLD');
 }
});
test('portable H07 budget requires native unit and refuses fake spending approval',()=>{
 const x=sampleModuleInput('H07');
 assert.equal(evaluateModuleFunction('H07',{...x,unit:''}).status,'HOLD');
 assert.equal(evaluateModuleFunction('H07',{...x,spendingAuthorized:true}).status,'HOLD');
});
import {CivilizationWorkHostBridge} from '../src/civilization-host-bridge.mjs';
test('portable source Work adapter requires a genuine engine and injected port',()=>{
 assert.throws(()=>new CivilizationWorkHostBridge({engine:{},hostPort:{query:async()=>({})}}));
});
test('owner Work adapter accepts mock source read as untrusted, never host attestation', {skip:!priv},async()=>{
 const engine=new CivilizationUnifiedBuild(good());
 const port={query:async()=>({status:'HOST_REPORTED_READ_RETURN_RECHECKED_SOURCE_ONLY',data:{sourceCount:1,references:[{roomId:'test-work-room',seq:71,sourceSHA256:'b'.repeat(64)}]}})};
 const bridge=new CivilizationWorkHostBridge({engine,hostPort:port});const r=await bridge.inspect({roomId:'test-work-room',seq:71,coordinate:'H01.S07.N12'});
 assert.equal(r.status,'HOST_CALLBACK_REPORTED_SOURCE_POINTER_NOT_ATTESTED');
 assert.equal(r.data.sourceAriadne.coordinate,'H01.S07.N12');
 assert.equal(r.hostAuthenticated,false);assert.equal(r.rightsAtReturnIndependentlyVerified,false);
 assert.equal(r.bodyReturned,false);assert.equal(r.workPosted,false);
});
test('owner Work adapter denies any revoked or wrong-source result without count leak', {skip:!priv},async()=>{
 const engine=new CivilizationUnifiedBuild(good());
 for(const response of [
  {status:'HOLD',data:{sourceCount:0}},
  {status:'HOST_REPORTED_READ_RETURN_RECHECKED_SOURCE_ONLY',data:{sourceCount:1,references:[{roomId:'wrong-room',seq:71,sourceSHA256:'b'.repeat(64)}]}},
  {status:'HOST_REPORTED_READ_RETURN_RECHECKED_SOURCE_ONLY',data:{sourceCount:1,references:[{roomId:'test-work-room',seq:71,sourceSHA256:'BAD'}]}}]){
  const bridge=new CivilizationWorkHostBridge({engine,hostPort:{query:async()=>response}});
  const r=await bridge.inspect({roomId:'test-work-room',seq:71,coordinate:'H01.S07.N12'});
  assert.equal(r.status,'HOLD_SOURCE_OR_RIGHTS_UNVERIFIED');assert.equal(r.data,null);
 }
});
test('owner Work adapter rejects request-level mode and name-only source', {skip:!priv},async()=>{
 const engine=new CivilizationUnifiedBuild(good());
 let calls=0;const port={query:async()=>{calls++;throw Error('should not be called')}};
 const b=new CivilizationWorkHostBridge({engine,hostPort:port});
 const r=await b.inspect({roomId:'test-work-room',seq:71,coordinate:'H01.S07.N12',mode:'PLAY'});
 assert.equal(r.status,'HOLD_SOURCE_OR_RIGHTS_UNVERIFIED');
 const f=await b.inspect({roomId:'test-work-room',seq:71,coordinate:'Instrument design'});
 assert.equal(f.status,'HOLD_SOURCE_OR_RIGHTS_UNVERIFIED');assert.equal(calls,0);
});
