import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {CivilizationCircuit} from '../src/civilization-circuit.mjs';
import {Hold} from '../src/index.mjs';
const file=process.env.ATLAS_ARIADNE_ORIGINAL_FILE;
const dir=process.env.ATLAS_1728_CIRCUIT_DIR;
const eligible=Boolean(file&&dir&&fs.existsSync(file)&&fs.existsSync(dir));
let instance=null;
function build(){
  if(instance)return instance;
  const registryBytes=fs.readFileSync(file),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
  const nodeRecords=fs.readFileSync(path.join(dir,'node_passes_1728.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  const sphereReviews=JSON.parse(fs.readFileSync(path.join(dir,'sphere_reviews_144.json')));
  const houseFollowups=JSON.parse(fs.readFileSync(path.join(dir,'house_followups_12.json')));
  const houseSphereFollowups=fs.readFileSync(path.join(dir,'house_sphere_followups_1728.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  instance=new CivilizationCircuit({originalAriadneBytes:registryBytes,manifest,nodeRecords,sphereReviews,houseFollowups,houseSphereFollowups});return instance;
}
test('a registry cannot be invented or caller supplied as a prepared dictionary',()=>{
  assert.throws(()=>new CivilizationCircuit({originalAriadneBytes:{houses:{}}}),e=>e instanceof Hold);
});
test('an unrelated registry byte sequence is refused before metadata',()=>{
  assert.throws(()=>new CivilizationCircuit({originalAriadneBytes:Buffer.from('{}')}),e=>e.code==='ARIADNE_SOURCE_DIGEST_MISMATCH');
});
test('source-verified circuit covers exactly 1728, 144, 12, 248832', {skip:!eligible},()=>{
  const status=build().status();assert.equal(status.nodes,1728);assert.equal(status.spheres,144);
  assert.equal(status.houses,12);assert.equal(status.comparisons,248832);assert.equal(status.actualMacroturns,0);
});
test('real original H08 musical instrument false friend remains source-labeled', {skip:!eligible},()=>{
  const result=build().node('H08.S01.N10',{mode:'LOCAL_OWNER_SOURCE'});
  assert.equal(result.status,'SOURCE_REVIEW_CARD_UNREVIEWED');
  assert.equal(result.data.nodeName,'Instrument design');
  assert.match(result.data.sourceDefinition,/musical instruments/i);
  assert.equal(result.semanticAccepted,false);
});
test('no one can turn self-declared Work scope into a read', {skip:!eligible},()=>{
  const x=build().node('H01.S05.N09',{mode:'WORK'});
  assert.equal(x.status,'HOLD');assert.equal(x.data,null);
});
test('source read sees a real nuclear instrumentation node without rights', {skip:!eligible},()=>{
  const x=build().node('H01.S05.N09',{mode:'LOCAL_OWNER_SOURCE'});
  assert.equal(x.status,'SOURCE_REVIEW_CARD_UNREVIEWED');assert.equal(x.data.nodeName,'Nuclear instrumentation');assert.equal(x.hostAuthenticated,false);
});
test('all 144 sphere summaries home 12 and separate META roles', {skip:!eligible},()=>{
  for(let h=1;h<=12;h++)for(let s=1;s<=12;s++){
    const x=build().sphere(`H${String(h).padStart(2,'0')}.S${String(s).padStart(2,'0')}`,{mode:'LOCAL_OWNER_SOURCE'});
    assert.equal(x.status,'SPHERE_COMPUTED_REVIEW_NOT_ADJUDICATED');assert.equal(x.data.homeNodes.length,12);assert.equal(x.data.externalEvaluated,1716);
    assert.ok(x.data.shortlist.every(n=>n.nodeKind==='DOMAIN_SPECIALIZATION'&&n.semanticReview==='UNADJUDICATED'));
  }
});
test('all 12 houses retain separate source and ethical checks', {skip:!eligible},()=>{
  for(let h=1;h<=12;h++){
    const x=build().house(`H${String(h).padStart(2,'0')}`,{mode:'LOCAL_OWNER_SOURCE'});
    assert.equal(x.status,'HOUSE_FOLLOWUP_SOURCE_ONLY');assert.equal(x.data.spheres.length,12);
    assert.match(x.data.rightsConcern,/non-offsettable/);
  }
});
test('H00 is never an admissible node and aliases cannot silently shift', {skip:!eligible},()=>{
  const x=build().node('H00.S01.N01',{mode:'LOCAL_OWNER_SOURCE'});assert.equal(x.status,'HOLD');
});
test('Work projection is a reference only; no posting authority', {skip:!eligible},()=>{
  const x=build().prepareWorkProposal('H01.S05.N09',{roomId:'synthetic-room-01',mode:'LOCAL_OWNER_SOURCE'});
  assert.equal(x.status,'PREPARED_NOT_POSTED');assert.equal(x.posted,false);assert.equal(x.hostAuthenticated,false);assert.equal(x.noPrivateModeRead,true);
});
test('Iron Empire fiction is opt-in and never exported as scientific evidence', {skip:!eligible},()=>{
  assert.equal(build().ironEmpireSeed('H10',{mode:'WORK',optIn:true}).status,'HOLD');
  assert.equal(build().ironEmpireSeed('H10',{mode:'IMAGINE_LOCAL',optIn:false}).status,'HOLD');
  const x=build().ironEmpireSeed('H10',{mode:'IMAGINE_LOCAL',optIn:true});assert.equal(x.status,'FICTIONAL_DRAFT_NOT_POSTED');assert.equal(x.noWorkIndexing,true);assert.equal(x.canonEffect,'NONE');
});
test('source-carrying forged readiness flags are rejected', {skip:!eligible},()=>{
  const registryBytes=fs.readFileSync(file),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
  const nodeRecords=fs.readFileSync(path.join(dir,'node_passes_1728.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  const sphereReviews=JSON.parse(fs.readFileSync(path.join(dir,'sphere_reviews_144.json')));
  const houseFollowups=JSON.parse(fs.readFileSync(path.join(dir,'house_followups_12.json')));
  const houseSphereFollowups=fs.readFileSync(path.join(dir,'house_sphere_followups_1728.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  const forged={...manifest,siteDeployments:1};
  assert.throws(()=>new CivilizationCircuit({originalAriadneBytes:registryBytes,manifest:forged,nodeRecords,sphereReviews,houseFollowups,houseSphereFollowups}),e=>e.code==='CIRCUIT_MANIFEST_NOT_SOURCE_LOCKED');
});
test('forged original definition is refused even if caller recalculates node receipt', {skip:!eligible},async()=>{
  const {digest}=await import('../src/index.mjs');
  const registryBytes=fs.readFileSync(file),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
  const nodeRecords=fs.readFileSync(path.join(dir,'node_passes_1728.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  const sphereReviews=JSON.parse(fs.readFileSync(path.join(dir,'sphere_reviews_144.json')));
  const houseFollowups=JSON.parse(fs.readFileSync(path.join(dir,'house_followups_12.json')));
  const houseSphereFollowups=fs.readFileSync(path.join(dir,'house_sphere_followups_1728.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  const altered={...nodeRecords[0],sourceDefinition:'FORGED SCIENTIFIC EQUIVALENCE'};delete altered.receiptSHA256;
  nodeRecords[0]={...altered,receiptSHA256:digest(altered)};
  assert.throws(()=>new CivilizationCircuit({originalAriadneBytes:registryBytes,manifest,nodeRecords,sphereReviews,houseFollowups,houseSphereFollowups}),e=>e.code==='CIRCUIT_NODE_SOURCE_OR_STATUS_CONFLICT');
});
test('forged House name cannot borrow valid source digest', {skip:!eligible},async()=>{
  const {digest}=await import('../src/index.mjs');
  const registryBytes=fs.readFileSync(file),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
  const nodeRecords=fs.readFileSync(path.join(dir,'node_passes_1728.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  const sphereReviews=JSON.parse(fs.readFileSync(path.join(dir,'sphere_reviews_144.json')));
  const houseFollowups=JSON.parse(fs.readFileSync(path.join(dir,'house_followups_12.json')));
  const houseSphereFollowups=fs.readFileSync(path.join(dir,'house_sphere_followups_1728.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  const fake={...houseFollowups[0],houseName:'Unknown Authority'};delete fake.receiptSHA256;
  houseFollowups[0]={...fake,receiptSHA256:digest(fake)};
  assert.throws(()=>new CivilizationCircuit({originalAriadneBytes:registryBytes,manifest,nodeRecords,sphereReviews,houseFollowups,houseSphereFollowups}),e=>e.code==='CIRCUIT_HOUSE_SOURCE_OR_AUTHORITY_CONFLICT');
});

test('each sphere has all twelve independent House followup perspectives', {skip:!eligible},()=>{
  const x=build();assert.equal(x.status().houseSphereFollowups,1728);
  assert.equal(x.status().reusedPositionReferences,2985984);
  for(let h=1;h<=12;h++)for(let s=1;s<=12;s++)for(let lens=1;lens<=12;lens++){
    const sid=`H${String(h).padStart(2,'0')}.S${String(s).padStart(2,'0')}`;
    const hid=`H${String(lens).padStart(2,'0')}`;
    const c=x.houseSphereFollowup(sid,hid,{mode:'LOCAL_OWNER_SOURCE'});
    assert.equal(c.status,'HOUSE_SPHERE_FOLLOWUP_UNREVIEWED');
    assert.equal(c.data.reusedPerspectiveDataNotNewComputation,true);
    assert.equal(c.semanticAccepted,false);
  }
});
test('epistemic Sphere cannot be treated as a domain-equivalence followup', {skip:!eligible},()=>{
  const meta=build().houseSphereFollowup('H01.S08','H10',{mode:'LOCAL_OWNER_SOURCE'});
  const domain=build().houseSphereFollowup('H01.S07','H10',{mode:'LOCAL_OWNER_SOURCE'});
  assert.equal(meta.data.sphereRole,'EPISTEMIC_METHOD');
  assert.equal(meta.data.semanticGate,'EPISTEMIC_METHOD_ONLY_NOT_SAME_AS');
  assert.equal(domain.data.sphereRole,'DOMAIN_SUBJECT');
  assert.equal(domain.data.semanticGate,'DOMAIN_CANDIDATE_NOT_SAME_AS');
});
test('cross-mode read cannot access House-Sphere review', {skip:!eligible},()=>{
  assert.equal(build().houseSphereFollowup('H01.S01','H10',{mode:'IMAGINE_LOCAL'}).status,'HOLD');
});
