import test from 'node:test';import assert from 'node:assert/strict';
import {ARIADNE_SHA,EXCELLENCE_PLAN_SHA,validateMeta145PlanningReceipt,createMeta145ReadOnlyPort} from './meta145-native-source-port.mjs';
const m={schema:'atlas.meta145.native-strategy-circuit/v1',source_sha256:ARIADNE_SHA,atlas_excellence_plan_sha256:EXCELLENCE_PLAN_SHA,
node_count:1728,sphere_count:144,house_count:12,meta_coordinate:'E145',actual_work_macroturns:0,actual_resident_model_calls:0,
host_permission_granted:false,canon_changed:false,broker_changed:false,strategy_option_evaluations:6912,swarmchat_client_tool_count:96,
independently_hosted_components:0,meta_receipt_sha256:'a'.repeat(64),node_chain_head_sha256:'b'.repeat(64),house_root_sha256:'c'.repeat(64)};
test('shape source exact',()=>assert.equal(validateMeta145PlanningReceipt(m).geometry.nodes,1728));
test('source mismatch denied',()=>assert.throws(()=>validateMeta145PlanningReceipt({...m,source_sha256:'0'.repeat(64)}),/MISMATCH/));
test('forged progress denied',()=>assert.throws(()=>validateMeta145PlanningReceipt({...m,actual_work_macroturns:1}),/FORGED_HOST_PROGRESS/));
test('no automatic Work action',()=>assert.equal(createMeta145ReadOnlyPort(m).prepareWorkCandidate('H01.S01.N01').sent,false));
test('private Play denied',()=>assert.throws(()=>createMeta145ReadOnlyPort(m).prepareWorkCandidate('H01.S01.N01','PLAY'),/PRIVATE_OR_UNAUTHORIZED_MODE/));
test('meta root not node',()=>assert.throws(()=>createMeta145ReadOnlyPort(m).prepareWorkCandidate('H00.S00.N00'),/INVALID_SOURCE_COORDINATE/));
test('host permission held',()=>assert.equal(createMeta145ReadOnlyPort(m).preflight().host_write,false));
