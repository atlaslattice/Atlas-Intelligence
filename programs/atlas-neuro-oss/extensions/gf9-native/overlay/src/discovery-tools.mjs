/** Optional original OpenAI Responses/MCP adapters over the existing gateway.
 * No SDK, credential lookup, model call, registration, transport or scheduler.
 */
import {createHash} from 'node:crypto';
import {captureData, deepFreeze, parseStrictJson, plainObject, publicError, requireCondition} from './contracts.mjs';
import {authorizedResultMetadata, authorizeResultRelease} from './gateway.mjs';
import {prepareFamilyContext} from './context-pack.mjs';

const sha = text => createHash('sha256').update(text).digest('hex');
const object = properties => ({type: 'object', properties, required: Object.keys(properties), additionalProperties: false});
const definitions = deepFreeze([
  {name: 'atlas_work_learning_capabilities', description: 'Read selected source-pinned engineering candidates. Candidate status is not deployment, source permission or demonstrated neural improvement.',
    parameters: object({ids: {type: 'array', minItems: 1, maxItems: 12, items: {type: 'string', pattern: '^F(00[1-9]|0[1-9][0-9]|1[0-3][0-9]|14[0-4])$'}}})},
  {name: 'atlas_work_learning_context_pack', description: 'Retrieve eligible corpus evidence with the existing neural gateway and prepare bounded evidence with at most one item per source family. Budget is UTF-8 item-array bytes, not tokens or confidence.',
    parameters: object({query: {type: 'string', minLength: 1, maxLength: 4096}, limit: {type: 'integer', minimum: 1, maximum: 20},
      budget_bytes: {type: 'integer', minimum: 2, maximum: 65536}, max_items: {type: 'integer', minimum: 1, maximum: 20}})}
]);
export function createDiscoveryResponsesTools() {
  return deepFreeze(definitions.map(({name, description, parameters}) => ({type: 'function', name, description,
    parameters: captureData(parameters), strict: true})));
}
export function createDiscoveryMcpTools() {
  return deepFreeze(definitions.map(({name, description, parameters}) => ({name, description,
    inputSchema: captureData(parameters), annotations: {readOnlyHint: true, destructiveHint: false,
      idempotentHint: true, openWorldHint: false}})));
}
const integer = (x, lo, hi) => Number.isSafeInteger(x) && x >= lo && x <= hi;
function exactKeys(args, required) {
  requireCondition(plainObject(args) && Object.keys(args).length === required.length
    && required.every(key => Object.hasOwn(args, key)), 'DISCOVERY_ARGUMENTS');
}

/** The host injects a pinned catalog and the already-authorized gateway.
 * The catalog is captured once; no model argument can choose a path or replace it.
 * Existing five tools remain unchanged. These two adapters are explicit opt-ins.
 */
export function createDiscoveryToolbox({gateway, catalog: rawCatalog, expectedCatalogSha256} = {}) {
  requireCondition(gateway && typeof gateway.status === 'function' && typeof gateway.search === 'function', 'GATEWAY_REQUIRED');
  const catalog = deepFreeze(captureData(rawCatalog, {maxBytes: 2_097_152, maxNodes: 100_000, maxDepth: 32}));
  const catalogSha256 = sha(JSON.stringify(catalog));
  requireCondition(typeof expectedCatalogSha256 === 'string' && /^[a-f0-9]{64}$/.test(expectedCatalogSha256)
    && expectedCatalogSha256 === catalogSha256, 'DISCOVERY_CATALOG_PIN_MISMATCH');
  requireCondition(catalog.schema === 'atlas.oss.capabilities/v1' && /^[a-f0-9]{40}$/.test(catalog.baselineCommit ?? '')
    && Array.isArray(catalog.features) && catalog.features.length === 144, 'DISCOVERY_CATALOG_INVALID');
  const byId = new Map();
  for (const [index, feature] of catalog.features.entries()) {
    const id = `F${String(index + 1).padStart(3, '0')}`, moduleId = `G${String(1 + Math.floor(index / 12)).padStart(2, '0')}`;
    requireCondition(feature.id === id && feature.module_id === moduleId && typeof feature.title === 'string'
      && feature.title.length > 0 && typeof feature.status === 'string', 'DISCOVERY_CATALOG_INVALID');
    byId.set(id, feature);
  }
  const outputs = new WeakMap();
  async function invoke(name, rawArgs, options) {
    const args = captureData(rawArgs, {maxBytes: 20_480, maxDepth: 4, maxNodes: 64});
    if (name === definitions[0].name) {
      exactKeys(args, ['ids']);
      requireCondition(Array.isArray(args.ids) && args.ids.length >= 1 && args.ids.length <= 12
        && new Set(args.ids).size === args.ids.length && args.ids.every(id => byId.has(id)), 'DISCOVERY_IDS');
      const bound = await gateway.status({}, options);
      requireCondition(authorizedResultMetadata(bound).operation === 'status', 'DISCOVERY_BOUND_STATUS_REQUIRED');
      return {bound, value: {schema: 'atlas.oss.capability-page/v1', catalogSha256, baselineCommit: catalog.baselineCommit,
        features: args.ids.map(id => byId.get(id)), reviewScope: 'PINNED_LOCAL_RUNTIME_AND_SELECTED_UPSTREAM_FILES',
        semanticAcceptance: false, hostedRegistration: false, qualityImprovementEstablished: false}};
    }
    requireCondition(name === definitions[1].name, 'UNKNOWN_TOOL');
    exactKeys(args, ['query', 'limit', 'budget_bytes', 'max_items']);
    requireCondition(typeof args.query === 'string' && args.query.length >= 1 && args.query.length <= 4096
      && integer(args.limit, 1, 20) && integer(args.budget_bytes, 2, 65536) && integer(args.max_items, 1, 20), 'DISCOVERY_ARGUMENTS');
    const bound = await gateway.search({query: args.query, limit: args.limit, target: 'corpus'}, options);
    const prepared = await prepareFamilyContext(bound, {budgetBytes: args.budget_bytes, maxItems: args.max_items});
    return {bound, value: prepared.envelope};
  }
  function bind(output, bound) {
    const prepared = deepFreeze(output), serializedPayload = JSON.stringify(prepared);
    authorizeResultRelease([bound], {serializedPayload, boundary: 'DISCOVERY_TOOL_PREPARE', requireHostFence: true});
    outputs.set(prepared, {bound, serializedPayload});
    return prepared;
  }
  async function dispatchResponses(rawCall, options = {}) {
    const call = captureData(rawCall, {maxBytes: 32_768, maxDepth: 8, maxNodes: 128});
    requireCondition(call?.type === 'function_call' && typeof call.call_id === 'string'
      && /^[A-Za-z0-9_-]{1,200}$/.test(call.call_id), 'INVALID_FUNCTION_CALL');
    try {
      const {bound, value} = await invoke(call.name, parseStrictJson(call.arguments), options);
      return bind({type: 'function_call_output', call_id: call.call_id, output: JSON.stringify({ok: true, result: value})}, bound);
    } catch (failure) {
      return deepFreeze({type: 'function_call_output', call_id: call.call_id,
        output: JSON.stringify({ok: false, error: publicError(failure)})});
    }
  }
  async function callMcp(name, args, options = {}) {
    try {
      const {bound, value} = await invoke(name, args, options);
      return bind({content: [{type: 'text', text: JSON.stringify(value)}], structuredContent: value, isError: false}, bound);
    } catch (failure) {
      const held = {ok: false, error: publicError(failure)};
      return deepFreeze({content: [{type: 'text', text: JSON.stringify(held)}], structuredContent: held, isError: true});
    }
  }
  function authorizeOutput(output) {
    const record = outputs.get(output);
    requireCondition(record, 'DISCOVERY_PREPARED_OUTPUT_REQUIRED');
    return authorizeResultRelease([record.bound], {serializedPayload: record.serializedPayload,
      boundary: 'DISCOVERY_TOOL_HANDOFF', requireHostFence: true});
  }
  return Object.freeze({catalogSha256, responsesTools: createDiscoveryResponsesTools(), mcpTools: createDiscoveryMcpTools(),
    dispatchResponses, callMcp, authorizeOutput});
}
