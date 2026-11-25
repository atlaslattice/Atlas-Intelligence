import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createDiscoveryToolbox} from '../src/discovery-tools.mjs';
import {createWorkLearningGateway} from '../src/gateway.mjs';
const sha = x => createHash('sha256').update(x).digest('hex');
const load = name => JSON.parse(readFileSync(new URL(`../docs/oss144/${name}`, import.meta.url), 'utf8'));

test('the real 144-entry catalog round-trips through native tools in twelve bounded pages', async t => {
  const catalog = load('feature-catalog.json');
  const pins = {workspaceId: 'synthetic-catalog-reader', registrySha256: sha('registry'), configSha256: sha('config'),
    corpusSha256: sha('corpus'), checkpointSha256: sha('checkpoint')};
  const source = {id: 'synthetic-review-source', version: 'v1', sha256: sha('source'), uri: 'urn:synthetic:catalog'};
  let backendCalls = 0, releases = 0;
  const gateway = createWorkLearningGateway({owner: 'synthetic-owner', workspaceId: pins.workspaceId,
    sourceManifest: {sources: [source]}, verifyPins: () => pins, authorize: () => true,
    hostOwnedFinalReturnSync: () => {releases++; return true;},
    backend: {execute: async operation => {assert.equal(operation, 'status'); backendCalls++;
      return {status: 'SYNTHETIC', provenance: {...pins, sourceRefs: [source], itemRefs: []}};}}});
  t.after(() => gateway.close());
  const tools = createDiscoveryToolbox({gateway, catalog, expectedCatalogSha256: sha(JSON.stringify(catalog))});
  const seen = [];
  for (let page = 0; page < 12; page++) {
    const ids = catalog.features.slice(page * 12, (page + 1) * 12).map(x => x.id);
    let prepared, data;
    if (page % 2) {
      prepared = await tools.callMcp('atlas_work_learning_capabilities', {ids});
      assert.equal(prepared.isError, false); data = prepared.structuredContent;
    } else {
      prepared = await tools.dispatchResponses({type: 'function_call', call_id: `catalog_page_${page}`,
        name: 'atlas_work_learning_capabilities', arguments: JSON.stringify({ids})});
      const parsed = JSON.parse(prepared.output); assert.equal(parsed.ok, true); data = parsed.result;
    }
    assert.deepEqual(data.features, catalog.features.slice(page * 12, (page + 1) * 12));
    assert.equal(data.hostedRegistration, false); assert.equal(data.qualityImprovementEstablished, false);
    tools.authorizeOutput(prepared); seen.push(...data.features.map(x => x.id));
  }
  assert.equal(backendCalls, 12); assert.equal(new Set(seen).size, 144);
  assert.equal(releases >= 24, true);
});
