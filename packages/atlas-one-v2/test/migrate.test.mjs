import test from 'node:test';import assert from 'node:assert/strict';
import {previewLegacyMemory,previewLegacyAgent} from '../src/migrate.mjs';
function m(){return {userId:'test_user_01',content:'A scientific source note from an older system',confidenceTier:'VERIFIED',houseId:'H01',sphereId:'S03'};}
test('legacy verified claim cannot be accepted as v2 evidence',()=>{const x=previewLegacyMemory(m(),{origin:'atlas-intelligence-firebase'});assert.equal(x.confidenceClaimFromLegacy,'VERIFIED');assert.equal(x.review,'UNVERIFIED_MIGRATION_CANDIDATE');assert.equal(x.canonEffect,'NONE');assert.equal(x.payloadCopied,false);});
test('Sheldonbrain old memory converted only to pointer',()=>{const x=previewLegacyMemory(m(),{origin:'sheldonbrain-rag-api'});assert.equal(x.origin,'sheldonbrain-rag-api');assert.equal(x.sourceRights,'NOT_VERIFIED');});
test('legacy body never exported in pointer',()=>{const x=previewLegacyMemory(m(),{origin:'atlas-intelligence-firebase'});assert.ok(!JSON.stringify(x).includes('scientific source note'));});
test('legacy ontology is not automatically Ariadne equivalent',()=>{const x=previewLegacyMemory(m(),{origin:'atlas-intelligence-firebase'});assert.equal(x.legacyOntology.crosswalk,'EXPLICIT_EDITION_REVIEW_REQUIRED');});
test('legacy empty body refused',()=>assert.throws(()=>previewLegacyMemory({...m(),content:''},{origin:'atlas-intelligence-firebase'})));
test('legacy unknown origin refused',()=>assert.throws(()=>previewLegacyMemory(m(),{origin:'private-brain'})));
test('legacy missing user refused',()=>assert.throws(()=>previewLegacyMemory({...m(),userId:null},{origin:'atlas-intelligence-firebase'})));
test('legacy agent stays self-declared',()=>{const x=previewLegacyAgent({userId:'test_user_01',provider:'gemini'});assert.equal(x.modelInvoked,false);assert.equal(x.workRoomJoined,false);assert.equal(x.sourceStatus,'SELF_DECLARED_AGENT_NOT_AUTHENTICATED');});
test('legacy agent invalid origin refused',()=>assert.throws(()=>previewLegacyAgent({userId:'test_user_01',provider:'gpt'},{origin:'palace'})));
