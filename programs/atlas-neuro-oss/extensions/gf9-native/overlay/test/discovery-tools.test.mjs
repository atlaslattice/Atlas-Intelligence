import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createDiscoveryToolbox, createDiscoveryResponsesTools, createDiscoveryMcpTools} from '../src/discovery-tools.mjs';
import {createResponsesTools} from '../src/openai.mjs';
import {createWorkLearningGateway} from '../src/gateway.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const catalog = {schema: 'atlas.oss.capabilities/v1', baselineCommit: 'a'.repeat(40),
  features: Array.from({length: 144}, (_, i) => ({id: `F${String(i + 1).padStart(3, '0')}`,
    module_id: `G${String(1 + Math.floor(i / 12)).padStart(2, '0')}`, title: `Synthetic candidate ${i + 1}`, status: 'CANDIDATE'}))};
const expectedCatalogSha256 = hash(JSON.stringify(catalog));
function fixture(t, {host = true} = {}) {
  const state = {read: true, use: true, release: true, calls: [], releases: []};
  const pins = {workspaceId: 'synthetic-discovery', registrySha256: hash('registry'), configSha256: hash('config'),
    corpusSha256: hash('corpus'), checkpointSha256: hash('checkpoint')};
  const source = {id: 'source', version: 'v1', sha256: hash('source'), uri: 'urn:synthetic:source'};
  const hits = Array.from({length: 4}, (_, i) => {
    const excerpt = `Synthetic evidence ${i} Ω漢🙂.`;
    return {id: `item-${i}`, title: `Fixture ${i}`, family_id: `family-${Math.floor(i / 2)}`,
      scope: 'SYNTHETIC_TEST', author_kind: 'SYNTHETIC', evidence_status: 'SYNTHETIC_UNREVIEWED', hsn_candidates: [],
      score: 1 - i / 10, source_id: source.id, source_version: source.version, source_sha256: source.sha256,
      source_uri: source.uri, text_sha256: hash(excerpt), excerpt, excerpt_sha256: hash(excerpt), excerpt_truncated: false,
      semantic_status: 'RETRIEVAL_NOT_ACCEPTANCE', training_label_status: 'NO_ACCEPTED_HSN_LABELS'};
  });
  const itemRefs = hits.map(hit => ({id: hit.id, sourceId: source.id, textSha256: hit.text_sha256}));
  const items = hits.map((hit, i) => ({...itemRefs[i], sourceVersion: source.version, sourceSha256: source.sha256,
    sourceUri: source.uri, excerptSha256: hit.excerpt_sha256, excerptTruncated: false,
    evidenceMetadataSchema: 'atlas.work-learning.item-evidence/v1',
    evidenceMetadata: Object.fromEntries(['title', 'family_id', 'scope', 'author_kind', 'evidence_status', 'hsn_candidates'].map(k => [k, hit[k]]))}));
  const args = {owner: 'synthetic-owner', workspaceId: pins.workspaceId, sourceManifest: {sources: [source], items},
    verifyPins: () => pins, authorize: () => state.read, authorizeUse: () => state.use,
    backend: {execute: async (operation, args) => {state.calls.push({operation, args});
      if (operation === 'status') return {status: 'SYNTHETIC', provenance: {...pins, sourceRefs: [source], itemRefs: []}};
      return {target: 'corpus', method: 'semantic_neural', semanticAcceptance: false, hits,
        provenance: {...pins, sourceRefs: [source], itemRefs}};}}};
  if (host) args.hostOwnedFinalReturnSync = check => {state.releases.push(check); return state.release;};
  const gateway = createWorkLearningGateway(args); t.after(() => gateway.close());
  const toolbox = createDiscoveryToolbox({gateway, catalog, expectedCatalogSha256});
  return {gateway, toolbox, state};
}
const call = (name, args) => ({type: 'function_call', call_id: 'call_native_1', name, arguments: JSON.stringify(args)});
const contextArgs = {query: 'synthetic', limit: 4, budget_bytes: 4096, max_items: 4};

test('two optional strict native tools preserve the existing five-tool default', () => {
  assert.equal(createResponsesTools().length, 5);
  const responses = createDiscoveryResponsesTools(), mcp = createDiscoveryMcpTools();
  assert.equal(responses.length, 2); assert.equal(mcp.length, 2);
  for (let i = 0; i < 2; i++) {
    const tool = responses[i]; assert.equal(tool.type, 'function'); assert.equal(tool.strict, true);
    assert.equal(tool.parameters.additionalProperties, false);
    assert.deepEqual(tool.parameters.required, Object.keys(tool.parameters.properties));
    assert.deepEqual(mcp[i].inputSchema, tool.parameters); assert.equal(mcp[i].annotations.readOnlyHint, true);
  }
});
test('catalog identity is pinned, complete, ordered and captured before tool calls', t => {
  const f = fixture(t);
  assert.throws(() => createDiscoveryToolbox({gateway: f.gateway, catalog, expectedCatalogSha256: '0'.repeat(64)}), {code: 'DISCOVERY_CATALOG_PIN_MISMATCH'});
  const malformed = {...catalog, features: catalog.features.slice(1)};
  assert.throws(() => createDiscoveryToolbox({gateway: f.gateway, catalog: malformed,
    expectedCatalogSha256: hash(JSON.stringify(malformed))}), {code: 'DISCOVERY_CATALOG_INVALID'});
});
test('Responses catalog dispatch preserves call_id, fixed source edition and current host fence', async t => {
  const f = fixture(t), output = await f.toolbox.dispatchResponses(call('atlas_work_learning_capabilities', {ids: ['F001', 'F144']}));
  assert.equal(output.type, 'function_call_output'); assert.equal(output.call_id, 'call_native_1');
  const data = JSON.parse(output.output); assert.equal(data.ok, true);
  assert.deepEqual(data.result.features.map(x => x.id), ['F001', 'F144']);
  assert.equal(data.result.catalogSha256, expectedCatalogSha256);
  assert.equal(f.state.calls.length, 1); assert.equal(f.state.calls[0].operation, 'status');
  assert.equal(f.toolbox.authorizeOutput(output).payloadSha256, hash(JSON.stringify(output)));
  f.state.release = false;
  assert.throws(() => f.toolbox.authorizeOutput(output), {code: 'FINAL_RETURN_DENIED'});
});
test('MCP dispatch uses the existing neural corpus gateway and returns a source-bound context packet', async t => {
  const f = fixture(t), output = await f.toolbox.callMcp('atlas_work_learning_context_pack', contextArgs);
  assert.equal(output.isError, false); assert.equal(output.content[0].text, JSON.stringify(output.structuredContent));
  assert.deepEqual(output.structuredContent.selectedIds, ['item-0', 'item-2']);
  assert.equal(output.structuredContent.originalRetrievalMethod, 'semantic_neural');
  assert.equal(output.structuredContent.semanticAcceptance, false);
  assert.deepEqual(f.state.calls[0], {operation: 'search', args: {query: 'synthetic', limit: 4, target: 'corpus'}});
  assert.equal(f.toolbox.authorizeOutput(output).payloadSha256, hash(JSON.stringify(output)));
  assert.equal(f.state.releases.at(-1).requests[0].requiredPurpose, 'INFERENCE');
  assert.equal(f.state.releases.at(-1).requests[0].itemRefs.length, 4);
});
test('invalid names, duplicate JSON, extra keys, null and numeric strings hold before computation', async t => {
  const f = fixture(t), invalid = [call('unknown', {}), call('atlas_work_learning_capabilities', {ids: ['F001', 'F001']}),
    call('atlas_work_learning_capabilities', {ids: ['F145']}), call('atlas_work_learning_context_pack', {...contextArgs, max_items: null}),
    call('atlas_work_learning_context_pack', {...contextArgs, limit: '4'}),
    call('atlas_work_learning_context_pack', {...contextArgs, target: 'nodes'}),
    {...call('atlas_work_learning_capabilities', {}), arguments: '{"ids":["F001"],"ids":["F002"]}'}];
  for (const input of invalid) assert.equal(JSON.parse((await f.toolbox.dispatchResponses(input)).output).ok, false);
  assert.equal(f.state.calls.length, 0);
});
test('copied outputs, foreign toolbox brands and forged gateways cannot acquire release authority', async t => {
  const f = fixture(t), other = fixture(t), output = await f.toolbox.callMcp('atlas_work_learning_capabilities', {ids: ['F001']});
  assert.throws(() => f.toolbox.authorizeOutput(JSON.parse(JSON.stringify(output))), {code: 'DISCOVERY_PREPARED_OUTPUT_REQUIRED'});
  assert.throws(() => other.toolbox.authorizeOutput(output), {code: 'DISCOVERY_PREPARED_OUTPUT_REQUIRED'});
  const forged = createDiscoveryToolbox({catalog, expectedCatalogSha256, gateway: {status: async () => ({}), search: async () => ({})}});
  const held = await forged.callMcp('atlas_work_learning_capabilities', {ids: ['F001']});
  assert.equal(held.isError, true); assert.equal(held.structuredContent.error.code, 'AUTHORIZED_RESULT_REQUIRED');
});
test('source withdrawal and missing host binding never emit successful context', async t => {
  const f = fixture(t); f.state.use = false;
  const held = await f.toolbox.callMcp('atlas_work_learning_context_pack', contextArgs);
  assert.equal(held.isError, true); assert.equal(f.state.calls.length, 0);
  const local = fixture(t, {host: false});
  const result = await local.toolbox.callMcp('atlas_work_learning_capabilities', {ids: ['F001']});
  assert.equal(result.isError, true); assert.equal(result.structuredContent.error.code, 'FINAL_RETURN_FENCE_REQUIRED');
});
