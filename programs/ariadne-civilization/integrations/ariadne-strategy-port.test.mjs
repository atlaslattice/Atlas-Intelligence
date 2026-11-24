import test from 'node:test';
import assert from 'node:assert/strict';
import {verifySyntheticMeta145Receipt,prepareCrosswalk,prepareAtlasOneWorkGraft} from './ariadne-strategy-port.mjs';
const base={schema:'atlas.meta145.strategy-integration/v2',
 sourceRegistrySha256:'07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6',
 graphEdition:'ariadne-reader/v0.7',simulatedStrategies:1728,simulatedOptionEvaluations:5184,
 spheresCovered:144,housesCovered:12,crossHouseReviewCandidates:144,semanticRelationsAccepted:0,
 genuineMacroTurns:0,modelCalls:0,authorizationGranted:false,canonEdited:false,authorityEffect:'NONE',
 status:'LOCAL_SIMULATION_COMPLETE_HOST_AND_SEMANTIC_ACCEPTANCE_HELD',receiptSha256:'a'.repeat(64),
 houseReceipts:Array(12).fill('b'.repeat(64))};
test('expected synthetic shape accepted as shape only',()=>assert.equal(verifySyntheticMeta145Receipt(base).state,'SOURCE_SHAPE_MATCHES_NOT_AUTHENTICATED'));
test('no simulated source is hosted',()=>assert.equal(verifySyntheticMeta145Receipt(base).runtimeReady,false));
test('wrong source edition held',()=>assert.equal(verifySyntheticMeta145Receipt({...base,graphEdition:'unknown'}).state,'HOLD'));
test('fake future completion held',()=>assert.equal(verifySyntheticMeta145Receipt({...base,genuineMacroTurns:1728}).state,'HOLD'));
test('fake science edge accepted held',()=>assert.equal(verifySyntheticMeta145Receipt({...base,semanticRelationsAccepted:1}).state,'HOLD'));
test('wrong cardinality held',()=>assert.equal(verifySyntheticMeta145Receipt({...base,simulatedStrategies:1729}).state,'HOLD'));
test('unexpected source body held',()=>assert.equal(verifySyntheticMeta145Receipt({...base,private:{body:'secret'}}).state,'HOLD'));
test('wrong House count held',()=>assert.equal(verifySyntheticMeta145Receipt({...base,houseReceipts:Array(11).fill('b'.repeat(64))}).state,'HOLD'));
test('fake CANON change held',()=>assert.equal(verifySyntheticMeta145Receipt({...base,canonEdited:true}).state,'HOLD'));
test('bogus hash held',()=>assert.equal(verifySyntheticMeta145Receipt({...base,receiptSha256:'fake'}).state,'HOLD'));
test('positive pointer-only Work graft',()=>assert.equal(prepareAtlasOneWorkGraft({meta145:base,hsn:'H03.S06.N02'}).state,'PREPARED_NOT_SENT'));
test('PALACE source denied',()=>assert.equal(prepareAtlasOneWorkGraft({meta145:base,hsn:'H03.S06.N02',originMode:'PALACE'}).state,'HOLD'));
test('invalid coordinate denied',()=>assert.equal(prepareAtlasOneWorkGraft({meta145:base,hsn:'H00.S00.N00'}).state,'HOLD'));
test('cannot auto-match HSN with EX ordinal',()=>assert.equal(prepareCrosswalk({hsn:'H01.S01.N01',excellenceTaskId:'EX.W01.C01.P01'}).state,'HOLD'));
test('explicit source crosswalk remains unreviewed',()=>assert.equal(prepareCrosswalk({hsn:'H01.S01.N01',excellenceTaskId:'EX.W01.C01.P01',explicitSourceRef:'https://github.com/atlaslattice/Atlas-Intelligence/issues/40'}).state,'CANDIDATE_NOT_REVIEWED'));
test('wrong engineering namespace held',()=>assert.equal(prepareCrosswalk({hsn:'H01.S01.N01',excellenceTaskId:'MT0001',explicitSourceRef:'https://github.com/atlaslattice/Atlas-Intelligence/issues/40'}).state,'HOLD'));
test('No host permissions granted',()=>assert.equal(prepareAtlasOneWorkGraft({meta145:base,hsn:'H03.S06.N02'}).readRightsVerified,false));
test('No automatic external effects',()=>assert.equal(prepareAtlasOneWorkGraft({meta145:base,hsn:'H03.S06.N02'}).externalEffects,0));
