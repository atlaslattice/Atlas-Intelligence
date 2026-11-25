import {createHash} from 'node:crypto';
import {authorizedResultMetadata} from './gateway.mjs';
import {captureData, canonical, deepFreeze, HSN, OPERATIONS, requireCondition} from './contracts.mjs';

const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
const bounded = (value, limit = 180) => typeof value === 'string' ? value.slice(0, limit) : '';
const sourceKey = source => canonical([source.id, source.version, source.sha256, source.uri]);
function selectedHits(result) {
  const metadata = authorizedResultMetadata(result);
  requireCondition(metadata.operation === 'search', 'SEARCH_RESULT_REQUIRED');
  const hits = result.hits ?? result.results;
  requireCondition(Array.isArray(hits) && hits.length <= 20, 'SEARCH_HITS_REQUIRED');
  return hits;
}

/** Uses the existing Graph Fabric's graph_rag_byog selected-source contract. No stored graph is changed. */
export function toGraphFabricPart(result) {
  const metadata = authorizedResultMetadata(result), hits = selectedHits(result), provenance = result.provenance;
  const nodes = [], edges = [], sourceNodes = new Map();
  for (const source of provenance.sourceRefs) {
    const key = sourceKey(source), id = 'source:' + digest(key);
    sourceNodes.set(key, id);
    nodes.push({id, kind: 'source_reference', label: bounded(source.id), sourceRef: captureData(source)});
  }
  for (let index = 0; index < hits.length; index++) {
    const hit = hits[index], id = 'retrieval:' + digest([hit.id ?? hit.hsn ?? index, index, provenance.checkpointSha256]);
    let key;
    if (result.target === 'nodes') {
      const registry = provenance.sourceRefs.filter(ref => ref.id === 'ariadne:v0.7' && ref.sha256 === provenance.registrySha256);
      requireCondition(registry.length === 1 && HSN.test(hit.hsn ?? hit.id ?? ''), 'GRAPH_NODE_SOURCE_MISMATCH');
      key = sourceKey(registry[0]);
    } else {
      requireCondition(typeof hit.source_id === 'string' && typeof hit.source_version === 'string'
        && typeof hit.source_sha256 === 'string' && typeof hit.source_uri === 'string', 'GRAPH_HIT_SOURCE_REQUIRED');
      key = sourceKey({id: hit.source_id, version: hit.source_version, sha256: hit.source_sha256, uri: hit.source_uri});
      requireCondition(sourceNodes.has(key), 'GRAPH_HIT_SOURCE_MISMATCH');
      requireCondition(provenance.itemRefs.some(ref => ref.id === hit.id && ref.sourceId === hit.source_id
        && ref.textSha256 === hit.text_sha256), 'GRAPH_HIT_ITEM_MISMATCH');
    }
    nodes.push({id, kind: 'retrieval_candidate', label: bounded(hit.title ?? hit.name ?? hit.hsn ?? hit.id ?? 'Retrieval candidate'),
      evidenceStatus: 'RETRIEVAL_CANDIDATE_NOT_SEMANTIC_ACCEPTANCE'});
    edges.push({from: id, to: sourceNodes.get(key), kind: 'retrieved_from_source'});
  }
  const revision = provenance.checkpointSha256 ?? provenance.corpusSha256 ?? provenance.configSha256;
  return deepFreeze({system: 'graph_rag_byog', sourceIdentity: {accountScope: metadata.owner, purpose: 'WORK',
    artifactRef: 'atlas-work-learning:' + digest(metadata.workspaceId).slice(0, 32), revision,
    digest: digest({provenance, nodes, edges})}, nodes, edges});
}

/** The actual host composer is injected, preserving its independent current authorization boundary. */
export async function composeAtlasGraphFabric(result, {composeSelectedGraph, authorize} = {}) {
  const metadata = authorizedResultMetadata(result);
  requireCondition(typeof composeSelectedGraph === 'function' && typeof authorize === 'function', 'GRAPH_FABRIC_ADAPTER_REQUIRED');
  const graph = await composeSelectedGraph([toGraphFabricPart(result)], {owner: metadata.owner, authorize, maxItems: 400});
  // Composer nodes deliberately contain no source bodies. Keep numeric retrieval provenance separate.
  return deepFreeze({graph, retrievalEvidence: {provenance: captureData(result.provenance),
    scores: selectedHits(result).map((hit, rank) => ({id: hit.id ?? hit.hsn ?? String(rank), rank: rank + 1,
      score: typeof hit.score === 'number' ? hit.score : null})),
    method: result.method ?? null, status: 'SOURCE_BOUND_RETRIEVAL_CANDIDATES', semanticAcceptance: false}, writesPerformed: false});
}

/** Evidence proposals only: API invocation is neither task completion nor training evidence. */
export function toMeta145Evidence(result) {
  const metadata = authorizedResultMetadata(result), proposals = [];
  if (metadata.operation === 'search') for (const hit of selectedHits(result)) {
    const coordinates = new Set([hit.hsn, hit.coordinate, HSN.test(hit.id ?? '') ? hit.id : null,
      ...(Array.isArray(hit.hsn_candidates) ? hit.hsn_candidates.map(c => typeof c === 'string' ? c : c.hsn ?? c.coordinate) : [])].filter(value => HSN.test(value ?? '')));
    for (const hsn of coordinates) proposals.push({hsn, sphereId: hsn.slice(0, 7), houseId: hsn.slice(0, 3),
      itemId: hit.id ?? hsn, score: typeof hit.score === 'number' ? hit.score : null,
      scoreType: hit.score_type ?? result.method ?? null,
      status: 'MAPPING_PROPOSAL_UNREVIEWED', sourceScoreChanged: false, semanticAccepted: false});
  }
  const measurementRefs = metadata.operation === 'evaluation' ? [{kind: 'SAVED_EVALUATION_RECEIPT',
    receiptSha256: digest(result), checkpointSha256: result.provenance.checkpointSha256,
    interpretation: 'REPORTED_EVALUATION_REQUIRES_ITS_DATASET_AND_METRIC_SCOPE'}] : [];
  const body = {schema: 'atlas.work-learning.meta145-evidence/v1', workspaceId: metadata.workspaceId,
    registrySha256: result.provenance.registrySha256, provenance: captureData(result.provenance), proposals, measurementRefs,
    APIReadIsTrainingEvidence: false, taskCompletionClaimed: false, modelWeightsUpdatedByAdapter: false,
    semanticAccepted: false, sourceClaimsAccepted: 0, authorityEffect: 'NONE', writesPerformed: false};
  return deepFreeze({...body, evidenceSha256: digest(body)});
}

/** Optional native Meta145 context uses its actual resolve() API without modifying its ranking or memory. */
export function attachMeta145Context(result, circuit) {
  const evidence = toMeta145Evidence(result);
  requireCondition(circuit && typeof circuit.status === 'function' && typeof circuit.resolve === 'function', 'META145_ADAPTER_REQUIRED');
  requireCondition(circuit.status().sourceSHA256 === evidence.registrySha256, 'META145_SOURCE_MISMATCH');
  return deepFreeze({evidence, contexts: evidence.proposals.map(proposal => captureData(circuit.resolve(proposal.hsn))),
    memoryWritten: false, modelTrainingPerformed: false});
}

/** Same gateway for all existing consumer names. This does not register or deploy hosted tools. */
export function createAtlasConsumers(gateway) {
  requireCondition(gateway && typeof gateway.execute === 'function', 'GATEWAY_REQUIRED');
  const consumer = Object.freeze(Object.fromEntries(OPERATIONS.map(operation => [operation,
    (args = {}, options) => gateway.execute(operation, args, options)])));
  return Object.freeze({atlasIntelligence: consumer, atlasgpt: consumer, swarmchat: consumer,
    hostedRegistration: false, modelTrainingPerformed: false});
}

/** Optional provider integrations require an explicit host enable flag; no auto-discovery or model calls. */
export function createProviderPlugin({name, enabled = false, invoke} = {}) {
  requireCondition(typeof name === 'string' && /^[a-z][a-z0-9_-]{0,63}$/.test(name), 'PROVIDER_NAME');
  if (enabled === true) requireCondition(typeof invoke === 'function', 'PROVIDER_IMPLEMENTATION_REQUIRED');
  return Object.freeze({name, enabled: enabled === true,
    async invoke(input, options) {
      if (enabled !== true) return {status: 'PROVIDER_DISABLED', providerCalls: 0};
      return invoke(captureData(input), options);
    }});
}
