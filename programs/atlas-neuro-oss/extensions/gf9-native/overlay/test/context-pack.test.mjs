import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {planFamilyContext, prepareFamilyContext, authorizeFamilyContextRelease} from '../src/context-pack.mjs';
import {createWorkLearningGateway} from '../src/gateway.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const pins = {workspaceId: 'synthetic-family-pack', registrySha256: hash('registry'), configSha256: hash('config'),
  corpusSha256: hash('corpus'), checkpointSha256: hash('checkpoint')};
const source = {id: 'synthetic-source', version: 'v1', sha256: hash('source'), uri: 'urn:synthetic:source'};
function fixture(t, {host = true} = {}) {
  const state = {use: true, release: true, pins, calls: 0, released: []};
  const hits = Array.from({length: 6}, (_, i) => {
    const excerpt = `Synthetic context ${i} with Unicode Ω漢🙂.`;
    return {id: `item-${i}`, title: `Fixture ${i}`, family_id: `family-${Math.floor(i / 2)}`,
      scope: 'SYNTHETIC_TEST', author_kind: 'SYNTHETIC', evidence_status: 'SYNTHETIC_UNREVIEWED',
      hsn_candidates: [], score: 1 - i / 10, source_id: source.id, source_version: source.version,
      source_sha256: source.sha256, source_uri: source.uri, text_sha256: hash(excerpt),
      excerpt, excerpt_sha256: hash(excerpt), excerpt_truncated: false,
      semantic_status: 'RETRIEVAL_NOT_ACCEPTANCE', training_label_status: 'NO_ACCEPTED_HSN_LABELS'};
  });
  const inventory = hits.map(hit => ({id: hit.id, sourceId: source.id, textSha256: hit.text_sha256,
    sourceVersion: source.version, sourceSha256: source.sha256, sourceUri: source.uri,
    excerptSha256: hit.excerpt_sha256, excerptTruncated: false,
    evidenceMetadataSchema: 'atlas.work-learning.item-evidence/v1',
    evidenceMetadata: Object.fromEntries(['title', 'family_id', 'scope', 'author_kind', 'evidence_status', 'hsn_candidates'].map(k => [k, hit[k]]))}));
  const page = {target: 'corpus', method: 'neural', semanticAcceptance: false, hits,
    provenance: {...pins, sourceRefs: [source], itemRefs: hits.map(hit => ({id: hit.id, sourceId: source.id, textSha256: hit.text_sha256}))}};
  const options = {owner: 'synthetic-owner', workspaceId: pins.workspaceId,
    sourceManifest: {sources: [source], items: inventory}, verifyPins: () => state.pins,
    authorize: () => true, authorizeUse: () => state.use,
    backend: {execute: async () => {state.calls++; return page;}}};
  if (host) options.hostOwnedFinalReturnSync = check => {state.released.push(check); return state.release;};
  const gateway = createWorkLearningGateway(options); t.after(() => gateway.close());
  return {gateway, state, page};
}

test('exact family packing beats a greedy positive control on its declared utility objective', () => {
  const items = [{id: 'a', familyId: 'A', cost: 6, utility: 9}, {id: 'b', familyId: 'B', cost: 4, utility: 8},
    {id: 'c', familyId: 'C', cost: 4, utility: 8}];
  const plan = planFamilyContext(items, {budget: 8});
  assert.deepEqual(plan.selectedIds, ['b', 'c']); assert.equal(plan.utility, 16);
  assert.equal(plan.cost, 8); assert.equal(plan.scoreIsConfidence, false); assert.equal(plan.permissionGranted, false);
});

test('family exclusion, deterministic ties, zero budget and item ceiling are explicit', () => {
  const items = [{id: 'b', familyId: 'same', cost: 4, utility: 8}, {id: 'a', familyId: 'same', cost: 4, utility: 8},
    {id: 'c', familyId: 'other', cost: 4, utility: 8}];
  assert.deepEqual(planFamilyContext(items, {budget: 8}).selectedIds, ['a', 'c']);
  assert.deepEqual(planFamilyContext(items.slice().reverse(), {budget: 8}).selectedIds, ['c', 'a']);
  assert.equal(planFamilyContext(items, {budget: 8, maxItems: 1}).selectedIds[0], 'a');
  assert.deepEqual(planFamilyContext(items, {budget: 0}).selectedIds, []);
});

test('144 fixed small contexts match an independent exhaustive subset utility oracle', () => {
  let seed = 1728;
  const rand = () => {seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed;};
  for (let run = 0; run < 144; run++) {
    const items = Array.from({length: 10}, (_, i) => ({id: `i${i}`, familyId: `f${Math.floor(i / 2)}`,
      cost: 1 + rand() % 12, utility: 1 + rand() % 40}));
    const budget = 4 + rand() % 28, maxItems = 1 + rand() % 5;
    let best = 0;
    for (let mask = 0; mask < 1024; mask++) {
      const selected = items.filter((_, i) => mask & (1 << i));
      if (selected.length > maxItems || new Set(selected.map(x => x.familyId)).size !== selected.length) continue;
      if (selected.reduce((a, x) => a + x.cost, 0) > budget) continue;
      best = Math.max(best, selected.reduce((a, x) => a + x.utility, 0));
    }
    const plan = planFamilyContext(items, {budget, maxItems});
    assert.equal(plan.utility, best, `case ${run}`); assert.ok(plan.cost <= budget);
    assert.ok(plan.selectedIds.length <= maxItems);
  }
});

test('nonfinite, ambiguous identity, unsafe numeric and explicit-null options reject', () => {
  const valid = {id: 'a', familyId: 'f', cost: 1, utility: 1};
  for (const value of [NaN, Infinity, -Infinity, true, 0, -1])
    assert.throws(() => planFamilyContext([{...valid, utility: value}], {budget: 3}));
  for (const cost of [true, 1.5, 0, -1, 65537])
    assert.throws(() => planFamilyContext([{...valid, cost}], {budget: 3}));
  assert.throws(() => planFamilyContext([valid, valid], {budget: 3}), {code: 'CONTEXT_DUPLICATE_ID'});
  assert.throws(() => planFamilyContext([{...valid, familyId: null}], {budget: 3}), {code: 'CONTEXT_ITEM_INVALID'});
  assert.throws(() => planFamilyContext([valid], {budget: 3, maxItems: null}), {code: 'CONTEXT_BOUNDS_INVALID'});
  assert.throws(() => planFamilyContext([valid], {budget: true}), {code: 'CONTEXT_BOUNDS_INVALID'});
});

test('work and state caps fail visibly instead of returning a silently approximate optimum', () => {
  const items = [{id: 'a', familyId: 'a', cost: 1, utility: 1}, {id: 'b', familyId: 'b', cost: 1, utility: 1}];
  assert.throws(() => planFamilyContext(items, {budget: 3, maxTransitions: 1}), {code: 'CONTEXT_PACK_WORK_BUDGET'});
  assert.throws(() => planFamilyContext(items, {budget: 3, maxStates: 1}), {code: 'CONTEXT_PACK_STATE_BUDGET'});
});

test('authorized corpus packing preserves result identity, exact Unicode and full dependency binding', async t => {
  const f = fixture(t), result = await f.gateway.search({query: 'synthetic', target: 'corpus', limit: 6});
  const original = JSON.stringify(result), prepared = await prepareFamilyContext(result, {budgetBytes: 4096});
  assert.equal(JSON.stringify(result), original); assert.equal(f.state.calls, 1);
  assert.deepEqual(prepared.envelope.selectedIds, ['item-0', 'item-2', 'item-4']);
  assert.equal(prepared.envelope.items[0], result.hits[0]);
  assert.equal(prepared.envelope.selectedItemsBytes, Buffer.byteLength(JSON.stringify(prepared.envelope.items)));
  assert.ok(prepared.envelope.selectedItemsBytes <= 4096);
  assert.ok(prepared.totalPayloadBytes > prepared.envelope.selectedItemsBytes);
  assert.equal(prepared.release.payloadSha256, hash(prepared.serializedPayload));
  const grant = authorizeFamilyContextRelease(prepared);
  assert.equal(grant.payloadSha256, hash(prepared.serializedPayload));
  assert.equal(f.state.released.at(-1).requests[0].itemRefs.length, 6);
  assert.equal(f.state.released.at(-1).requests[0].requiredPurpose, 'INFERENCE');
});

test('copied retrieval and prepared objects cannot acquire the existing gateway authority', async t => {
  const f = fixture(t), result = await f.gateway.search({query: 'synthetic', target: 'corpus', limit: 6});
  await assert.rejects(prepareFamilyContext(JSON.parse(JSON.stringify(result))), {code: 'AUTHORIZED_RESULT_REQUIRED'});
  const prepared = await prepareFamilyContext(result);
  assert.throws(() => authorizeFamilyContextRelease(JSON.parse(JSON.stringify(prepared))), {code: 'FAMILY_CONTEXT_PREPARED_REQUIRED'});
});

test('withdrawn inference use and changed source pins hold during async context preparation', async t => {
  const f = fixture(t), result = await f.gateway.search({query: 'synthetic', target: 'corpus', limit: 6});
  f.state.use = false;
  await assert.rejects(prepareFamilyContext(result), {code: 'SOURCE_USE_DENIED'});
  f.state.use = true; f.state.pins = {...pins, configSha256: hash('changed-config')};
  await assert.rejects(prepareFamilyContext(result), {code: 'SOURCE_PIN_MISMATCH'});
  assert.equal(f.state.calls, 1);
});

test('last-moment host withdrawal withholds the exact prepared payload before send', async t => {
  const f = fixture(t), result = await f.gateway.search({query: 'synthetic', target: 'corpus', limit: 6});
  const prepared = await prepareFamilyContext(result), sent = [];
  f.state.release = false;
  assert.throws(() => {authorizeFamilyContextRelease(prepared); sent.push(prepared.serializedPayload);}, {code: 'FINAL_RETURN_DENIED'});
  assert.deepEqual(sent, []);
});

test('required-host default, explicit local mode and strict null flags stay distinct', async t => {
  const f = fixture(t, {host: false}), result = await f.gateway.search({query: 'synthetic', target: 'corpus', limit: 6});
  await assert.rejects(prepareFamilyContext(result), {code: 'FINAL_RETURN_FENCE_REQUIRED'});
  await assert.rejects(prepareFamilyContext(result, {requireHostFence: null}), {code: 'CONTEXT_BOUNDS_INVALID'});
  const prepared = await prepareFamilyContext(result, {requireHostFence: false});
  assert.equal(prepared.release.finalReturnMode, 'ASYNC_POLICY_ONLY');
  assert.throws(() => authorizeFamilyContextRelease(prepared), {code: 'FINAL_RETURN_FENCE_REQUIRED'});
});
