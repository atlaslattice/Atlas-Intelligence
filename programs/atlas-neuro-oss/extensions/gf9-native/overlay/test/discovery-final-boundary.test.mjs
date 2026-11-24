/** Independent synthetic control: revoke in the async return gap after preparation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createWorkLearningGateway} from '../src/gateway.mjs';
import {createDiscoveryToolbox} from '../src/discovery-tools.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');

test('queued withdrawal after context preparation blocks the exact combined MCP payload at handoff', async t => {
  const state = {eligible: true, calls: 0, checks: []};
  const source = {id: 'review-source', version: 'synthetic-v1', sha256: sha('source'), uri: 'urn:synthetic:review-source'};
  const pins = {workspaceId: 'review-workspace', registrySha256: sha('registry'), configSha256: sha('config'),
    corpusSha256: sha('corpus'), checkpointSha256: sha('checkpoint')};
  const excerpt = 'Independent synthetic Ω漢🙂 fixture.';
  const evidence = {title: 'Synthetic fixture', family_id: 'independent-family', scope: 'SYNTHETIC_TEST',
    author_kind: 'SYNTHETIC', evidence_status: 'SYNTHETIC_UNREVIEWED', hsn_candidates: []};
  const itemRef = {id: 'review-item', sourceId: source.id, textSha256: sha(excerpt)};
  const hit = {...evidence, id: itemRef.id, score: .8, source_id: source.id, source_version: source.version,
    source_sha256: source.sha256, source_uri: source.uri, text_sha256: sha(excerpt), excerpt,
    excerpt_sha256: sha(excerpt), excerpt_truncated: false, semantic_status: 'RETRIEVAL_NOT_ACCEPTANCE',
    training_label_status: 'NO_ACCEPTED_HSN_LABELS'};
  const item = {...itemRef, sourceVersion: source.version, sourceSha256: source.sha256, sourceUri: source.uri,
    excerptSha256: sha(excerpt), excerptTruncated: false, evidenceMetadataSchema: 'atlas.work-learning.item-evidence/v1',
    evidenceMetadata: evidence};
  const gateway = createWorkLearningGateway({owner: 'synthetic-owner', workspaceId: pins.workspaceId,
    sourceManifest: {sources: [source], items: [item]}, verifyPins: () => pins,
    authorize: () => state.eligible, authorizeUse: () => state.eligible,
    hostOwnedFinalReturnSync: check => {
      state.checks.push(check);
      const decision = state.eligible;
      if (check.boundary === 'DISCOVERY_TOOL_PREPARE') queueMicrotask(() => {state.eligible = false;});
      return decision;
    },
    backend: {execute: async () => {
      state.calls++;
      return {target: 'corpus', method: 'semantic_neural', semanticAcceptance: false, hits: [hit],
        provenance: {...pins, sourceRefs: [source], itemRefs: [itemRef]}};
    }}});
  t.after(() => gateway.close());
  const catalog = {schema: 'atlas.oss.capabilities/v1', baselineCommit: 'a'.repeat(40),
    features: Array.from({length: 144}, (_, index) => ({id: `F${String(index + 1).padStart(3, '0')}`,
      module_id: `G${String(Math.floor(index / 12) + 1).padStart(2, '0')}`,
      title: `Synthetic candidate ${index + 1}`, status: 'CANDIDATE'}))};
  const toolbox = createDiscoveryToolbox({gateway, catalog, expectedCatalogSha256: sha(JSON.stringify(catalog))});
  const output = await toolbox.callMcp('atlas_work_learning_context_pack', {
    query: 'synthetic-only', limit: 1, budget_bytes: 4096, max_items: 1});
  assert.equal(output.isError, false);
  assert.equal(state.eligible, false, 'withdrawal must occur before host resumes with the prepared result');
  assert.equal(output.structuredContent.items[0].excerpt, excerpt);
  const bytes = JSON.stringify(output), prepared = state.checks.find(c => c.boundary === 'DISCOVERY_TOOL_PREPARE');
  assert.equal(prepared.payloadSha256, sha(bytes));
  assert.notEqual(prepared.payloadSha256, sha(output.content[0].text), 'outer MCP envelope must be bound too');
  assert.equal(prepared.requests[0].requiredPurpose, 'INFERENCE');
  assert.deepEqual(prepared.requests[0].dependencyRefs, [source]);
  const sent = [];
  assert.throws(() => { toolbox.authorizeOutput(output); sent.push(bytes); }, {code: 'FINAL_RETURN_DENIED'});
  assert.deepEqual(sent, []);
  assert.equal(state.checks.at(-1).boundary, 'DISCOVERY_TOOL_HANDOFF');
  assert.equal(state.checks.at(-1).payloadSha256, sha(bytes));
  state.eligible = true;
  const grant = toolbox.authorizeOutput(output);
  assert.equal(grant.payloadSha256, sha(bytes));
  assert.equal(grant.hostedBindingVerified, false);
  assert.equal(state.calls, 1, 'send checks do not rerun inference');
});
