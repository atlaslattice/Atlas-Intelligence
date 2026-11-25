import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createWorkLearningGateway, dispatchResponsesFunctionCall, createMcpRouter,
  toGraphFabricPart, toMeta145Evidence} from '../src/index.mjs';

// Deliberately synthetic backend responses: these tests exercise the release
// boundary, not a trained model, source truth, or the private owner corpus.
const hash = value => createHash('sha256').update(value).digest('hex');
const REGISTRY = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
const pins = {workspaceId: 'synthetic-search-review', registrySha256: REGISTRY,
  configSha256: 'a'.repeat(64), corpusSha256: 'b'.repeat(64), checkpointSha256: 'c'.repeat(64)};
const source = {id: 'synthetic-source', version: 'v1', sha256: hash('Synthetic full source v1'), uri: 'urn:atlas:test:source:v1'};
const registry = {id: 'ariadne:v0.7', version: 'v0.7', sha256: REGISTRY, uri: 'urn:atlas:test:registry'};
const excerpt = 'Synthetic source excerpt.';
const item = {id: 'synthetic-item', sourceId: source.id, textSha256: hash(excerpt)};
const canonicalItem = {...item, sourceVersion: source.version, sourceSha256: source.sha256, sourceUri: source.uri,
  excerptSha256: hash(excerpt), excerptTruncated: false};
const args = {query: 'synthetic query', limit: 1, target: 'corpus'};

function corpusResult() {
  return {target: 'corpus', method: 'neural', primaryMethod: 'neural', fallbackUsed: false,
    fallbackReason: null, semanticAcceptance: false, hits: [{id: item.id, title: 'Synthetic fixture',
      score: .75, source_id: source.id, source_version: source.version, source_sha256: source.sha256,
      source_uri: source.uri, text_sha256: item.textSha256, excerpt, excerpt_sha256: hash(excerpt),
      excerpt_truncated: false, hsn_candidates: ['H01.S01.N01']}],
    provenance: {...pins, sourceRefs: [{...source}], itemRefs: [{...item}]}};
}

function nodeResult() {
  return {target: 'nodes', method: 'learned_addressed_graph', primaryMethod: 'neural', fallbackUsed: false,
    fallbackReason: null, hits: [{hsn: 'H01.S01.N01', name: 'Synthetic node fixture', score: .5,
      registry_sha256: REGISTRY, checkpoint_sha256: pins.checkpointSha256}],
    provenance: {...pins, sourceRefs: [{...registry}], itemRefs: []}};
}

function fixture(t, {result = corpusResult(), sources = [source], items = [canonicalItem], authorize = () => true,
  backend = {execute: async () => result}} = {}) {
  const gateway = createWorkLearningGateway({owner: 'synthetic-owner', workspaceId: pins.workspaceId,
    sourceManifest: {sources, ...(items === null ? {} : {items})}, verifyPins: () => ({...pins}), authorize, backend});
  t.after(() => gateway.close());
  return gateway;
}

test('valid corpus results retain exact source and item identities through direct and Responses consumers', async t => {
  const gateway = fixture(t), output = await gateway.search(args);
  assert.deepEqual(output, corpusResult());
  assert.ok(Object.isFrozen(output.hits[0]));
  assert.equal(toGraphFabricPart(output).edges.length, 1);
  assert.equal(toMeta145Evidence(output).proposals[0].semanticAccepted, false);
  const call = await dispatchResponsesFunctionCall(gateway, {type: 'function_call', call_id: 'valid-search',
    name: 'atlas_work_learning_search', arguments: JSON.stringify(args)});
  assert.equal(JSON.parse(call.output).ok, true);
  assert.equal(JSON.parse(call.output).result.hits[0].text_sha256, item.textSha256);
});

for (const [field, replacement] of [['source_id', 'unadmitted-source'], ['source_version', 'unadmitted-v2'],
  ['source_sha256', 'f'.repeat(64)], ['source_uri', 'urn:atlas:test:unadmitted']]) {
  test(`search withholds a hit whose ${field} contradicts its admitted source tuple`, async t => {
    const result = corpusResult(); result.hits[0][field] = replacement;
    await assert.rejects(fixture(t, {result}).search(args), error => error.code === 'RESULT_HIT_SOURCE_MISMATCH');
  });
}

for (const [field, replacement] of [['id', 'unreferenced-item'], ['text_sha256', 'f'.repeat(64)]]) {
  test(`search withholds a hit whose ${field} contradicts its item reference`, async t => {
    const result = corpusResult(); result.hits[0][field] = replacement;
    await assert.rejects(fixture(t, {result}).search(args), error => error.code === 'RESULT_HIT_ITEM_MISMATCH');
  });
}

test('Responses and MCP return a bounded error without releasing an inconsistent hit', async t => {
  const result = corpusResult(); result.hits[0].source_uri = 'urn:atlas:test:unadmitted';
  const gateway = fixture(t, {result});
  const response = await dispatchResponsesFunctionCall(gateway, {type: 'function_call', call_id: 'invalid-search',
    name: 'atlas_work_learning_search', arguments: JSON.stringify(args)});
  const parsed = JSON.parse(response.output);
  assert.equal(parsed.ok, false); assert.equal(parsed.error.code, 'RESULT_HIT_SOURCE_MISMATCH');
  assert.equal(Object.hasOwn(parsed, 'result'), false);
  const route = createMcpRouter({gateway});
  await route({jsonrpc: '2.0', id: 1, method: 'initialize', params: {protocolVersion: '2025-11-25', capabilities: {},
    clientInfo: {name: 'synthetic-test', version: '1'}}});
  await route({jsonrpc: '2.0', method: 'notifications/initialized'});
  const reply = await route({jsonrpc: '2.0', id: 2, method: 'tools/call',
    params: {name: 'atlas_work_learning_search', arguments: args}});
  assert.equal(reply.result.isError, true);
  assert.equal(reply.result.structuredContent.error.code, 'RESULT_HIT_SOURCE_MISMATCH');
  assert.ok(!JSON.stringify(reply).includes('urn:atlas:test:unadmitted'));
});

test('search refuses a target substitution and a page exceeding the requested limit', async t => {
  const wrongTarget = corpusResult(); wrongTarget.target = 'nodes';
  await assert.rejects(fixture(t, {result: wrongTarget}).search(args), error => error.code === 'RESULT_SEARCH_TARGET_MISMATCH');
  const tooMany = corpusResult(); tooMany.hits.push({...tooMany.hits[0]});
  await assert.rejects(fixture(t, {result: tooMany}).search(args), error => error.code === 'RESULT_SEARCH_BOUNDS');
});

test('search refuses a secondary unvalidated results collection in its envelope', async t => {
  const result = corpusResult(); result.results = [{id: 'unvalidated-secondary-item', excerpt: 'Synthetic secondary result.'}];
  await assert.rejects(fixture(t, {result}).search(args), error => error.code === 'RESULT_SEARCH_FIELDS');
});

test('search refuses duplicate corpus identities even within the requested page size', async t => {
  const result = corpusResult(); result.hits.push({...result.hits[0]});
  await assert.rejects(fixture(t, {result}).search({...args, limit: 2}), error => error.code === 'RESULT_HIT_DUPLICATE');
});

test('search rejects an altered excerpt or an untruncated excerpt that differs from the item hash', async t => {
  const altered = corpusResult(); altered.hits[0].excerpt = 'Altered synthetic text.';
  await assert.rejects(fixture(t, {result: altered}).search(args), error => error.code === 'RESULT_HIT_EXCERPT_MISMATCH');
  const rehashed = corpusResult(); rehashed.hits[0].excerpt = 'Different synthetic text.';
  rehashed.hits[0].excerpt_sha256 = hash(rehashed.hits[0].excerpt);
  await assert.rejects(fixture(t, {result: rehashed}).search(args), error => error.code === 'RESULT_HIT_EXCERPT_MISMATCH');
});

test('search preserves multiple admitted source editions and a correctly marked truncated excerpt', async t => {
  const second = {...source, version: 'v2', sha256: hash('Synthetic full source v2'), uri: 'urn:atlas:test:source:v2'};
  const result = corpusResult(), fullText = 'A synthetic second excerpt whose ending is omitted.';
  const text = 'A synthetic second excerpt';
  const secondItem = {id: 'synthetic-item-v2', sourceId: second.id, textSha256: hash(fullText)};
  result.provenance.sourceRefs.push(second); result.provenance.itemRefs.push(secondItem);
  result.hits.push({...result.hits[0], id: secondItem.id, source_version: second.version,
    source_sha256: second.sha256, source_uri: second.uri, text_sha256: secondItem.textSha256,
    excerpt: text, excerpt_sha256: hash(text), excerpt_truncated: true});
  const secondCanonical = {...secondItem, sourceVersion: second.version, sourceSha256: second.sha256, sourceUri: second.uri,
    excerptSha256: hash(text), excerptTruncated: true};
  const output = await fixture(t, {result, sources: [source, second], items: [canonicalItem, secondCanonical]}).search({...args, limit: 2});
  assert.deepEqual(output.hits.map(hit => hit.source_version), ['v1', 'v2']);
  assert.equal(new Set(toGraphFabricPart(output).edges.map(edge => edge.to)).size, 2);
});

test('empty corpus result is valid and does not manufacture item references', async t => {
  const result = corpusResult(); result.hits = []; result.provenance.itemRefs = [];
  const output = await fixture(t, {result}).search(args);
  assert.deepEqual(output.hits, []); assert.deepEqual(output.provenance.itemRefs, []);
});

test('node search accepts exact registry identities and a source-bound lexical fallback', async t => {
  const result = nodeResult(), gateway = fixture(t, {result, sources: [registry], items: []});
  const output = await gateway.search({...args, target: 'nodes'});
  assert.equal(output.hits[0].hsn, 'H01.S01.N01');
  const lexical = nodeResult(); lexical.method = 'original_definition_bm25'; lexical.fallbackUsed = true;
  lexical.fallbackReason = 'NEURAL_STATE_UNAVAILABLE_OR_WITHHELD';
  delete lexical.hits[0].registry_sha256; delete lexical.hits[0].checkpoint_sha256;
  assert.equal((await fixture(t, {result: lexical, sources: [registry], items: []}).search({...args, target: 'nodes'})).fallbackUsed, true);
});

test('node search refuses a source reference that does not bind the original registry', async t => {
  const result = nodeResult(); result.provenance.sourceRefs = [source];
  await assert.rejects(fixture(t, {result}).search({...args, target: 'nodes'}), error => error.code === 'RESULT_NODE_SOURCE_MISMATCH');
});

test('node search refuses invalid or repeated HSN identities', async t => {
  const invalid = nodeResult(); invalid.hits[0].hsn = 'H99.S01.N01';
  await assert.rejects(fixture(t, {result: invalid, sources: [registry], items: []}).search({...args, target: 'nodes'}), error => error.code === 'RESULT_HIT_NODE_INVALID');
  const duplicate = nodeResult(); duplicate.hits.push({...duplicate.hits[0]});
  await assert.rejects(fixture(t, {result: duplicate, sources: [registry], items: []}).search({...args, target: 'nodes', limit: 2}), error => error.code === 'RESULT_HIT_DUPLICATE');
});

test('node search refuses per-hit registry or checkpoint identity drift', async t => {
  for (const field of ['registry_sha256', 'checkpoint_sha256']) {
    const result = nodeResult(); result.hits[0][field] = 'f'.repeat(64);
    await assert.rejects(fixture(t, {result, sources: [registry], items: []}).search({...args, target: 'nodes'}), error => error.code === 'RESULT_HIT_PIN_MISMATCH');
  }
});

test('trusted item inventory rejects a borrowed but independently admitted source edition', async t => {
  const second = {...source, version: 'v2', sha256: hash('Synthetic full source v2'), uri: 'urn:atlas:test:source:v2'};
  const result = corpusResult(); result.provenance.sourceRefs.push(second);
  Object.assign(result.hits[0], {source_version: second.version, source_sha256: second.sha256, source_uri: second.uri});
  await assert.rejects(fixture(t, {result, sources: [source, second]}).search(args), error => error.code === 'RESULT_HIT_INVENTORY_MISMATCH');
});

test('trusted item inventory rejects a self-rehashed invented truncated excerpt', async t => {
  const prefix = 'Synthetic admitted prefix', fullText = prefix + ' followed by the remaining source text.';
  const trusted = {...canonicalItem, textSha256: hash(fullText), excerptSha256: hash(prefix), excerptTruncated: true};
  const result = corpusResult(); result.provenance.itemRefs[0].textSha256 = trusted.textSha256;
  Object.assign(result.hits[0], {text_sha256: trusted.textSha256, excerpt: 'Invented synthetic prefix',
    excerpt_sha256: hash('Invented synthetic prefix'), excerpt_truncated: true});
  await assert.rejects(fixture(t, {result, items: [trusted]}).search(args), error => error.code === 'RESULT_HIT_EXCERPT_MISMATCH');
});

test('trusted item inventory accepts a 1600-code-point Unicode prefix without a UTF-16 length error', async t => {
  const prefix = '😀'.repeat(1600), fullText = prefix + 'additional source text';
  assert.equal(prefix.length, 3200);
  const trusted = {...canonicalItem, textSha256: hash(fullText), excerptSha256: hash(prefix), excerptTruncated: true};
  const result = corpusResult(); result.provenance.itemRefs[0].textSha256 = trusted.textSha256;
  Object.assign(result.hits[0], {text_sha256: trusted.textSha256, excerpt: prefix,
    excerpt_sha256: hash(prefix), excerpt_truncated: true});
  assert.equal((await fixture(t, {result, items: [trusted]}).search(args)).hits[0].excerpt, prefix);
});

test('legacy manifest withholds corpus search before backend access while status and node search remain available', async t => {
  let calls = 0;
  const gateway = fixture(t, {items: null, sources: [registry], backend: {execute: async () => { calls++; return nodeResult(); }}});
  await assert.rejects(gateway.search(args), error => error.code === 'ITEM_MANIFEST_REQUIRED');
  assert.equal(calls, 0);
  assert.equal((await gateway.status()).provenance.registrySha256, REGISTRY);
  assert.equal((await gateway.search({...args, target: 'nodes'})).hits[0].hsn, 'H01.S01.N01');
  assert.equal(calls, 2);
});

test('trusted item inventory refuses ambiguous identities and unadmitted source tuples at construction', t => {
  assert.throws(() => fixture(t, {items: [canonicalItem, {...canonicalItem}]}), error => error.code === 'DUPLICATE_ITEM_MANIFEST');
  assert.throws(() => fixture(t, {items: [{...canonicalItem, sourceVersion: 'unadmitted-v2'}]}), error => error.code === 'ITEM_MANIFEST_SOURCE_MISMATCH');
});

test('trusted item inventory is detached from later host object mutation', async t => {
  const supplied = {...canonicalItem};
  const gateway = fixture(t, {items: [supplied]});
  supplied.sourceVersion = 'changed-after-construction'; supplied.excerptSha256 = 'f'.repeat(64);
  assert.equal((await gateway.search(args)).hits[0].source_version, source.version);
});

test('RETURN checks include an off-result source that could have influenced the learned checkpoint', async t => {
  const other = {id: 'synthetic-other-source', version: 'v1', sha256: hash('Another synthetic source'), uri: 'urn:atlas:test:other'};
  let backendCompleted = false;
  const gateway = fixture(t, {sources: [source, other],
    authorize: check => !(backendCompleted && check.action === 'RETURN' && check.kind === 'SOURCE' && check.ref.id === other.id),
    backend: {execute: async () => { backendCompleted = true; return corpusResult(); }}});
  await assert.rejects(gateway.search(args), error => error.code === 'ACCESS_DENIED');
});

test('stable two-source reads succeed and a returned-source revocation still withholds the page', async t => {
  const other = {id: 'synthetic-other-source', version: 'v1', sha256: hash('Another synthetic source'), uri: 'urn:atlas:test:other'};
  const returns = [];
  const stable = fixture(t, {sources: [source, other], authorize: check => {
    if (check.action === 'RETURN' && check.kind === 'SOURCE') returns.push(check.ref.id);
    return true;
  }});
  assert.equal((await stable.search(args)).hits.length, 1);
  assert.deepEqual(returns, [source.id, other.id]);
  const revoked = fixture(t, {sources: [source, other], authorize: check => !(check.action === 'RETURN'
    && check.kind === 'SOURCE' && check.ref.id === source.id)});
  await assert.rejects(revoked.search(args), error => error.code === 'ACCESS_DENIED');
});
