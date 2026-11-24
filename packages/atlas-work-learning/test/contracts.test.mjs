import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {createWorkLearningGateway, createResponsesTools, dispatchResponsesFunctionCall, runResponsesWorkLearning,
  createMcpRouter, parseStrictJson, validateArguments, toMeta145Evidence, composeAtlasGraphFabric,
  attachMeta145Context, createAtlasConsumers, createProviderPlugin} from '../src/index.mjs';

const REGISTRY = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
const pins = {workspaceId: 'work-fixture', registrySha256: REGISTRY, configSha256: 'a'.repeat(64),
  corpusSha256: 'b'.repeat(64), checkpointSha256: 'c'.repeat(64)};
const source = {id: 'source-1', version: 'v1', sha256: 'd'.repeat(64), uri: 'urn:atlas:test:source-1'};
const hash = value => createHash('sha256').update(value).digest('hex');
const excerpt = 'Synthetic fixture source excerpt.';
const item = {id: 'item-1', sourceId: source.id, textSha256: hash(excerpt)};
const canonicalItem = {...item, sourceVersion: source.version, sourceSha256: source.sha256, sourceUri: source.uri,
  excerptSha256: item.textSha256, excerptTruncated: false};
const result = () => ({target: 'corpus', hits: [{id: item.id, title: 'Source candidate', score: .75,
  source_id: source.id, source_version: source.version, source_sha256: source.sha256, source_uri: source.uri,
  text_sha256: item.textSha256, excerpt, excerpt_sha256: item.textSha256, excerpt_truncated: false,
  hsn_candidates: ['H01.S01.N01']}], provenance: {...pins, sourceRefs: [{...source}], itemRefs: [{...item}]}});
function fixture(options = {}) {
  const log = [], count = {calls: 0};
  const gateway = createWorkLearningGateway({owner: 'owner-1', workspaceId: pins.workspaceId,
    sourceManifest: {sources: [source], items: [canonicalItem]}, verifyPins: async () => ({...pins}),
    authorize: async check => { log.push(`${check.action}:${check.kind}`); return true; },
    backend: {execute: async () => { count.calls++; log.push('BACKEND'); return result(); }}, ...options});
  return {gateway, log, count};
}

test('strict Responses schemas close every argument object and exclude paths, identities and budgets', () => {
  const tools = createResponsesTools(); assert.equal(tools.length, 5);
  for (const definition of tools) {
    assert.equal(definition.type, 'function'); assert.equal(definition.strict, true);
    assert.equal(definition.parameters.additionalProperties, false);
    assert.deepEqual(definition.parameters.required, Object.keys(definition.parameters.properties));
    for (const key of Object.keys(definition.parameters.properties)) assert.ok(!/path|owner|budget|workspace|pin/i.test(key));
  }
  assert.throws(() => validateArguments('status', {owner: 'attacker'}));
  assert.throws(() => validateArguments('search', {query: 'x', limit: 21, target: 'corpus'}));
  assert.throws(() => validateArguments('node', {hsn: 'H00.S00.N00'}));
  assert.throws(() => validateArguments('train', {}));
  assert.throws(() => validateArguments('status', Object.defineProperty({}, 'path', {get() { throw Error('getter invoked'); }, enumerable: true})), error => error.code === 'DATA_PROPERTY');
});

test('JSON arguments reject duplicates, malformed numbers, control whitespace, and prototype keys', () => {
  assert.deepEqual(parseStrictJson('{"query":"a\\nb","limit":2}'), {query: 'a\nb', limit: 2});
  for (const value of ['{"query":"one","query":"two"}', '{"__proto__":{}}', '{"n":1e999}', '{"n":01}', '{"x":1}\v', '{"a":[1,]}']) assert.throws(() => parseStrictJson(value));
});

test('gateway checks READ before backend and all RETURN gates before releasing frozen provenance', async () => {
  const {gateway, log} = fixture(); const output = await gateway.search({query: 'test', limit: 1, target: 'corpus'});
  assert.deepEqual(log, ['READ:SERVICE', 'READ:SOURCE', 'BACKEND', 'READ:ITEM', 'RETURN:SERVICE', 'RETURN:SOURCE', 'RETURN:ITEM']);
  assert.equal(Object.isFrozen(output.provenance.sourceRefs[0]), true);
  assert.equal(output.hits[0].score, .75);
});

test('denied service/source READ prevents backend access and wrong owner never becomes tool authority', async () => {
  for (const denyKind of ['SERVICE', 'SOURCE']) {
    const {gateway, count} = fixture({authorize: check => check.kind !== denyKind});
    await assert.rejects(gateway.status(), error => error.code === 'ACCESS_DENIED'); assert.equal(count.calls, 0);
  }
  const {gateway, count} = fixture({authorize: check => check.owner === 'different-owner'});
  await assert.rejects(gateway.status(), error => error.code === 'ACCESS_DENIED'); assert.equal(count.calls, 0);
});

test('revoked RETURN policy, wrong source edition, and pin drift withhold complete pages', async () => {
  const denied = fixture({authorize: check => !(check.action === 'RETURN' && check.kind === 'ITEM')});
  await assert.rejects(denied.gateway.status(), error => error.code === 'ACCESS_DENIED');
  const wrongSource = fixture({backend: {execute: async () => { const r = result(); r.provenance.sourceRefs[0].version = 'v2'; return r; }}});
  await assert.rejects(wrongSource.gateway.status(), error => error.code === 'UNADMITTED_RESULT_SOURCE');
  let checks = 0;
  const drift = fixture({verifyPins: async () => ({...pins, corpusSha256: ++checks === 1 ? pins.corpusSha256 : 'f'.repeat(64)})});
  await assert.rejects(drift.gateway.status(), error => error.code === 'SOURCE_PIN_MISMATCH');
  const wrongCheckpoint = fixture({backend: {execute: async () => { const r = result(); r.provenance.checkpointSha256 = 'f'.repeat(64); return r; }}});
  await assert.rejects(wrongCheckpoint.gateway.status(), error => error.code === 'RESULT_PIN_MISMATCH');
});

test('Responses function call/output keeps exact call_id and returns bounded public errors', async () => {
  const {gateway} = fixture();
  const call = {type: 'function_call', call_id: 'call_123', name: 'atlas_work_learning_status', arguments: '{}'};
  const output = await dispatchResponsesFunctionCall(gateway, call);
  assert.equal(output.type, 'function_call_output'); assert.equal(output.call_id, call.call_id);
  assert.equal(JSON.parse(output.output).result.provenance.registrySha256, REGISTRY);
  const denied = await dispatchResponsesFunctionCall(gateway, {...call, name: 'train_everything'});
  assert.equal(JSON.parse(denied.output).error.code, 'UNKNOWN_TOOL');
  const duplicate = await dispatchResponsesFunctionCall(gateway, {...call, arguments: '{"owner":"a","owner":"b"}'});
  assert.equal(JSON.parse(duplicate.output).ok, false);
});

test('injected Responses loop preserves reasoning items, explicit limits and function outputs without external calls', async () => {
  const {gateway} = fixture(), requests = [];
  const client = {responses: {create: async request => {
    requests.push(request);
    if (requests.length === 1) return {id: 'r1', output: [
      {type: 'reasoning', id: 'reason1', summary: []},
      {type: 'function_call', id: 'fc1', call_id: 'call1', name: 'atlas_work_learning_status', arguments: '{}'}]};
    return {id: 'r2', output: [{type: 'message', role: 'assistant', content: [{type: 'output_text', text: 'Ready.'}]}]};
  }}};
  assert.equal((await runResponsesWorkLearning({client})).status, 'PROVIDER_DISABLED'); assert.equal(requests.length, 0);
  const run = await runResponsesWorkLearning({enabled: true, client, gateway, model: 'test-injected-client', input: 'Check status'});
  assert.equal(run.providerCalls, 2); assert.equal(run.toolCalls, 1); assert.equal(run.status, 'COMPLETED');
  assert.equal(requests[0].store, false); assert.equal(requests[0].parallel_tool_calls, false);
  assert.deepEqual(requests[1].input[1], {type: 'reasoning', id: 'reason1', summary: []});
  assert.equal(requests[1].input[3].call_id, 'call1'); assert.equal(requests[1].input[3].type, 'function_call_output');
});

test('Responses runner enforces tool budget before dispatch and rejects replayed call IDs', async () => {
  const {gateway, count} = fixture();
  const output = [{type: 'function_call', call_id: 'same', name: 'atlas_work_learning_status', arguments: '{}'}];
  const client = {responses: {create: async () => ({output})}};
  await assert.rejects(runResponsesWorkLearning({enabled: true, client, gateway, model: 'fixture', input: 'x', maxToolCalls: 0}), error => error.code === 'TOOL_CALL_BUDGET');
  assert.equal(count.calls, 0);
  await assert.rejects(runResponsesWorkLearning({enabled: true, client, gateway, model: 'fixture', input: 'x'}), error => error.code === 'DUPLICATE_TOOL_CALL');
  assert.equal(count.calls, 1);
});

test('MCP supported lifecycle is complete and policy denial is a tool error, not false success', async () => {
  const {gateway} = fixture({authorize: () => false}), route = createMcpRouter({gateway});
  assert.equal((await route({jsonrpc: '2.0', id: 1, method: 'tools/list'})).error.code, -32002);
  const init = await route({jsonrpc: '2.0', id: 2, method: 'initialize', params: {protocolVersion: '2025-11-25', capabilities: {}, clientInfo: {name: 'test', version: '1'}}});
  assert.equal(init.result.protocolVersion, '2025-11-25');
  assert.equal(await route({jsonrpc: '2.0', method: 'notifications/initialized'}), null);
  assert.equal((await route({jsonrpc: '2.0', id: 3, method: 'tools/list'})).result.tools.length, 5);
  const denial = await route({jsonrpc: '2.0', id: 4, method: 'tools/call', params: {name: 'atlas_work_learning_status', arguments: {}}});
  assert.equal(denial.result.isError, true); assert.equal(denial.result.structuredContent.error.code, 'ACCESS_DENIED');
  assert.deepEqual((await route({jsonrpc: '2.0', id: 5, method: 'ping'})).result, {});
  assert.equal((await route({jsonrpc: '2.0', id: 6, method: 'train'})).error.code, -32601);
});

test('Meta145 evidence preserves proposal status and does not turn a read into training proof', async () => {
  const {gateway} = fixture(); const response = await gateway.search({query: 'test', limit: 1, target: 'corpus'});
  const evidence = toMeta145Evidence(response);
  assert.equal(evidence.proposals[0].hsn, 'H01.S01.N01'); assert.equal(evidence.proposals[0].semanticAccepted, false);
  assert.equal(evidence.APIReadIsTrainingEvidence, false); assert.equal(evidence.measurementRefs.length, 0);
  const evaluated = toMeta145Evidence(await gateway.evaluation());
  assert.equal(evaluated.measurementRefs[0].kind, 'SAVED_EVALUATION_RECEIPT');
  assert.throws(() => toMeta145Evidence(result()), error => error.code === 'AUTHORIZED_RESULT_REQUIRED');
  assert.throws(() => attachMeta145Context(response, {status: () => ({sourceSHA256: 'f'.repeat(64)}), resolve() {}}), error => error.code === 'META145_SOURCE_MISMATCH');
});

const graphPath = new URL('../../../lib/atlas-graph-adapters.mjs', import.meta.url);
test('authorized neural hits compose through the actual existing Atlas Graph Fabric adapter', {skip: !existsSync(graphPath)}, async () => {
  const {composeSelectedGraph} = await import(graphPath.href), {gateway} = fixture();
  const response = await gateway.search({query: 'test', limit: 1, target: 'corpus'});
  const combined = await composeAtlasGraphFabric(response, {composeSelectedGraph, authorize: check => check.owner === 'owner-1'});
  assert.equal(combined.graph.schemaVersion, 'atlas.graph.fabric/selected-sources-v0.1');
  assert.equal(combined.graph.nodes.length, 2); assert.equal(combined.graph.edges.length, 1);
  assert.equal(combined.retrievalEvidence.scores[0].score, .75); assert.equal(combined.retrievalEvidence.semanticAcceptance, false);
  await assert.rejects(composeAtlasGraphFabric(response, {composeSelectedGraph, authorize: () => false}));
});

test('Atlas consumer aliases share the exact gateway and optional provider plugins stay disabled', async () => {
  const {gateway} = fixture(), consumers = createAtlasConsumers(gateway);
  assert.equal(consumers.atlasgpt, consumers.swarmchat);
  assert.deepEqual(await consumers.atlasIntelligence.status(), await consumers.atlasgpt.status());
  let calls = 0; const plugin = createProviderPlugin({name: 'optional_provider', invoke: async () => { calls++; }});
  assert.equal((await plugin.invoke({})).status, 'PROVIDER_DISABLED'); assert.equal(calls, 0);
});

test('Graph Fabric preserves multiple source editions and refuses a hit whose exact source tuple differs', {skip: !existsSync(graphPath)}, async () => {
  const {composeSelectedGraph} = await import(graphPath.href);
  const second = {...source, version: 'v2', sha256: 'f'.repeat(64), uri: 'urn:atlas:test:source-1:v2'};
  const secondExcerpt = 'Synthetic fixture source excerpt from version two.';
  const item2 = {...item, id: 'item-2', textSha256: hash(secondExcerpt)};
  const twoResults = () => {
    const r = result(); r.provenance.sourceRefs.push(second); r.provenance.itemRefs.push(item2);
    r.hits.push({...r.hits[0], id: item2.id, source_version: second.version, source_sha256: second.sha256,
      source_uri: second.uri, text_sha256: item2.textSha256, excerpt: secondExcerpt,
      excerpt_sha256: item2.textSha256}); return r;
  };
  const secondCanonical = {...item2, sourceVersion: second.version, sourceSha256: second.sha256, sourceUri: second.uri,
    excerptSha256: item2.textSha256, excerptTruncated: false};
  const {gateway} = fixture({sourceManifest: {sources: [source, second], items: [canonicalItem, secondCanonical]},
    backend: {execute: async () => twoResults()}});
  const response = await gateway.search({query: 'x', limit: 2, target: 'corpus'});
  const composed = await composeAtlasGraphFabric(response, {composeSelectedGraph, authorize: () => true});
  assert.equal(composed.graph.nodes.filter(n => n.kind === 'source_reference').length, 2);
  assert.equal(new Set(composed.graph.edges.map(e => e.to)).size, 2);
  assert.ok(composed.graph.nodes.filter(n => n.kind === 'retrieval_candidate').length === 2);
  const bad = fixture({backend: {execute: async () => { const r = result(); r.hits[0].source_uri = 'urn:wrong'; return r; }}});
  await assert.rejects(bad.gateway.search({query: 'x', limit: 1, target: 'corpus'}), error => error.code === 'RESULT_HIT_SOURCE_MISMATCH');
});
