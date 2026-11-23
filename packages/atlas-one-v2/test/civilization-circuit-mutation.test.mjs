import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {CivilizationCircuit} from '../src/civilization-circuit.mjs';
import {constructorFixture} from './civilization-circuit.fixture.mjs';

const source=process.env.ATLAS_ARIADNE_ORIGINAL_FILE;
const enabled=Boolean(source&&existsSync(source));
let template;
const opts={mode:'LOCAL_OWNER_SOURCE'};
function setup(){
  template??=constructorFixture(readFileSync(source));
  const input=structuredClone(template);
  return {input,circuit:new CivilizationCircuit(input)};
}
const local=(name,fn)=>test(name,{skip:!enabled},fn);

local('constructor node mutation cannot rewrite source card or prepared reference',()=>{
  const {input,circuit}=setup();
  const card=structuredClone(circuit.node('H01.S01.N01',opts));
  const proposal=structuredClone(circuit.prepareWorkProposal('H01.S01.N01',{...opts,roomId:'synthetic-room-01'}));
  input.nodeRecords[0].sourceDefinition='FORGED_AFTER_VALIDATION';
  input.nodeRecords[0].sourceNodeSHA256='0'.repeat(64);
  input.nodeRecords[0].receiptSHA256='1'.repeat(64);
  input.nodeRecords[0].candidatePerspectives[0].overlapTokens.push('FORGED');
  assert.deepEqual(circuit.node('H01.S01.N01',opts),card);
  assert.deepEqual(circuit.prepareWorkProposal('H01.S01.N01',{...opts,roomId:'synthetic-room-01'}),proposal);
});
local('constructor Sphere mutation cannot rewrite source name, shortlist or home references',()=>{
  const {input,circuit}=setup();const before=structuredClone(circuit.sphere('H01.S01',opts));
  input.sphereReviews[0].sphereName='FORGED_SPHERE';
  input.sphereReviews[0].homeNodes[0].name='FORGED_HOME_NODE';
  input.sphereReviews[0].shortlist[0].semanticReview='FORGED_APPROVED';
  input.sphereReviews[0].falsifiers.push('FORGED');
  assert.deepEqual(circuit.sphere('H01.S01',opts),before);
});
local('constructor House mutation cannot rewrite original identity or review fields',()=>{
  const {input,circuit}=setup();const before=structuredClone(circuit.house('H01',opts));
  input.houseFollowups[0].houseName='FORGED_HOUSE';
  input.houseFollowups[0].sphereIds[0]='H12.S12';
  input.houseFollowups[0].rightsConcern='FORGED_RIGHTS';
  input.houseFollowups[0].contrastingHouseQuestions[0].counterpartHouse='H12';
  assert.deepEqual(circuit.house('H01',opts),before);
});
local('constructor paired-followup mutation cannot rewrite ancestry or semantic gate',()=>{
  const {input,circuit}=setup();const before=structuredClone(circuit.houseSphereFollowup('H01.S01','H01',opts));
  input.houseSphereFollowups[0].semanticGate='FORGED_SAME_AS';
  input.houseSphereFollowups[0].question='FORGED_QUESTION';
  input.houseSphereFollowups[0].sourceSHA256='0'.repeat(64);
  input.houseSphereFollowups[0].sphereReviewSHA256='1'.repeat(64);
  assert.deepEqual(circuit.houseSphereFollowup('H01.S01','H01',opts),before);
});
local('constructor manifest mutation cannot rewrite validated inventory',()=>{
  const {input,circuit}=setup();const before=structuredClone(circuit.status());
  input.manifest.pairEvaluations=999;
  input.manifest.houseSphereReferencedPositionsNotFresh=1;
  assert.deepEqual(circuit.status(),before);
});
local('returned node candidate arrays remain locally editable without poisoning later reads',()=>{
  const {circuit}=setup();const result=circuit.node('H01.S01.N01',opts);const before=structuredClone(result);
  result.data.candidates[0].overlapTokens.push('FORGED_RETURN');
  result.data.candidates.push({sphereId:'H12.S12',status:'FORGED_APPROVED'});
  assert.deepEqual(circuit.node('H01.S01.N01',opts),before);
});
local('returned Sphere nested fields cannot poison later source reads',()=>{
  const {circuit}=setup();const result=circuit.sphere('H01.S01',opts);const before=structuredClone(result);
  result.data.homeNodes[0].sourceNodeSHA256='0'.repeat(64);
  result.data.shortlist[0].semanticReview='FORGED_APPROVED';
  result.data.falsifiers.push('FORGED_RETURN');
  assert.deepEqual(circuit.sphere('H01.S01',opts),before);
});
local('returned House arrays cannot poison later source reads',()=>{
  const {circuit}=setup();const result=circuit.house('H01',opts);const before=structuredClone(result);
  result.data.spheres[0]='H12.S12';
  result.data.contrastingHouseQuestions[0].counterpartNode='H12.S12.N12';
  assert.deepEqual(circuit.house('H01',opts),before);
});
local('snapshot rejects unsupported callable metadata through a named Hold',()=>{
  const {input}=setup();let calls=0;input.manifest.extra=()=>{calls++;return true;};
  assert.throws(()=>new CivilizationCircuit(input),e=>e.name==='AtlasHold'&&e.code==='CIRCUIT_INPUT_NOT_SNAPSHOTABLE');
  assert.equal(calls,0,'snapshot must not execute the unsupported function');
});
