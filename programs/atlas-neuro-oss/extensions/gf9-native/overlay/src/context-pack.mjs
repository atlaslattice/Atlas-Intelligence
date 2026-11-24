/** Original bounded family-aware context selection; no tokenizer or model call.
 * Related source patterns and license roles are recorded in docs/oss144.
 * Utilities are an explicit optimization objective, never calibrated confidence.
 */
import {createHash} from 'node:crypto';
import {captureData, deepFreeze, requireCondition} from './contracts.mjs';
import {authorizedResultMetadata, revalidateAuthorizedResult, authorizeResultRelease} from './gateway.mjs';

const preparedPacks = new WeakMap();
const sha = text => createHash('sha256').update(text).digest('hex');
const integer = (value, low, high) => Number.isSafeInteger(value) && value >= low && value <= high;
const name = value => typeof value === 'string' && value.length > 0 && value.length <= 512;
const keys = (value, allowed) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).every(key => allowed.includes(key));
const compareIds = (left, right) => {
  const a = [...left].sort(), b = [...right].sort();
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return a.length - b.length;
};
function better(a, b) {
  return !b || a.utility > b.utility || (a.utility === b.utility &&
    (a.count > b.count || (a.count === b.count &&
      (a.cost < b.cost || (a.cost === b.cost && compareIds(a.ids, b.ids) < 0)))));
}

/** Exact multiple-choice knapsack within explicit work/frontier bounds.
 * Select at most one item per family. Fails visibly when a bound is exceeded.
 * The caller chooses the cost unit; this pure planner grants no source access.
 */
export function planFamilyContext(rawItems, rawOptions = {}) {
  const options = captureData(rawOptions, {maxBytes: 2048, maxNodes: 16, maxDepth: 2});
  requireCondition(keys(options, ['budget', 'maxItems', 'maxTransitions', 'maxStates']), 'CONTEXT_OPTIONS_INVALID');
  const {budget, maxItems = 12, maxTransitions = 1_000_000, maxStates = 32768} = options;
  requireCondition(integer(budget, 0, 65536) && integer(maxItems, 1, 24)
    && integer(maxTransitions, 1, 2_000_000) && integer(maxStates, 1, 65536), 'CONTEXT_BOUNDS_INVALID');
  const items = captureData(rawItems, {maxBytes: 262144, maxNodes: 2048, maxDepth: 4});
  requireCondition(Array.isArray(items) && items.length <= 144, 'CONTEXT_ITEMS_INVALID');
  const ids = new Set(), groups = new Map();
  for (const item of items) {
    requireCondition(keys(item, ['id', 'familyId', 'cost', 'utility']) && name(item.id) && name(item.familyId)
      && integer(item.cost, 1, 65536) && typeof item.utility === 'number'
      && Number.isFinite(item.utility) && item.utility > 0 && item.utility <= 1_000_000,
    'CONTEXT_ITEM_INVALID');
    requireCondition(!ids.has(item.id), 'CONTEXT_DUPLICATE_ID'); ids.add(item.id);
    if (!groups.has(item.familyId)) groups.set(item.familyId, []);
    groups.get(item.familyId).push(item);
  }
  let states = new Map([['0:0', {cost: 0, count: 0, utility: 0, ids: []}]]), transitions = 0;
  for (const family of [...groups.keys()].sort()) {
    const next = new Map(states);
    for (const state of states.values()) {
      if (state.count === maxItems) continue;
      for (const item of groups.get(family)) {
        requireCondition(++transitions <= maxTransitions, 'CONTEXT_PACK_WORK_BUDGET');
        if (state.cost + item.cost > budget) continue;
        const candidate = {cost: state.cost + item.cost, count: state.count + 1,
          utility: state.utility + item.utility, ids: [...state.ids, item.id]};
        requireCondition(Number.isFinite(candidate.utility), 'CONTEXT_NUMERIC_OVERFLOW');
        const key = `${candidate.count}:${candidate.cost}`;
        if (better(candidate, next.get(key))) next.set(key, candidate);
        requireCondition(next.size <= maxStates, 'CONTEXT_PACK_STATE_BUDGET');
      }
    }
    states = next;
  }
  let best;
  for (const state of states.values()) if (better(state, best)) best = state;
  const selected = new Set(best.ids);
  return deepFreeze({schema: 'atlas.work-learning.family-context-plan/v1',
    selectedIds: items.filter(item => selected.has(item.id)).map(item => item.id),
    omittedIds: items.filter(item => !selected.has(item.id)).map(item => item.id),
    cost: best.cost, budget, utility: best.utility, families: best.count, transitions,
    states: states.size, optimalWithinDeclaredObjective: true, scoreIsConfidence: false,
    qualityImprovementEstablished: false, permissionGranted: false,
    objective: 'MAX_UTILITY_THEN_FAMILY_COUNT_THEN_MIN_COST_THEN_LEXICAL_IDS'});
}

/** Package eligible corpus hits without changing the original retrieval result.
 * budgetBytes bounds only the selected-items JSON array; total envelope bytes
 * are separately reported. It is deliberately not a token/context-window claim.
 */
export async function prepareFamilyContext(result, rawOptions = {}) {
  const options = captureData(rawOptions, {maxBytes: 2048, maxNodes: 16, maxDepth: 2});
  requireCondition(keys(options, ['budgetBytes', 'maxItems', 'requireHostFence']), 'CONTEXT_OPTIONS_INVALID');
  const {budgetBytes = 8192, maxItems = 12, requireHostFence = true} = options;
  requireCondition(integer(budgetBytes, 2, 65536) && integer(maxItems, 1, 24)
    && typeof requireHostFence === 'boolean', 'CONTEXT_BOUNDS_INVALID');
  const metadata = authorizedResultMetadata(result);
  requireCondition(metadata.operation === 'search' && result.target === 'corpus' && Array.isArray(result.hits),
    'CONTEXT_CORPUS_SEARCH_REQUIRED');
  requireCondition(!requireHostFence || metadata.finalReturnMode === 'HOST_CALLBACK', 'FINAL_RETURN_FENCE_REQUIRED');
  const candidates = result.hits.map((hit, index) => {
    requireCondition(name(hit.id) && name(hit.family_id), 'CONTEXT_BOUND_FAMILY_REQUIRED');
    return {id: hit.id, familyId: hit.family_id, cost: Buffer.byteLength(JSON.stringify(hit)) + 1,
      utility: result.hits.length - index};
  });
  const plan = planFamilyContext(candidates, {budget: budgetBytes - 1, maxItems});
  const selected = new Set(plan.selectedIds), items = result.hits.filter(hit => selected.has(hit.id));
  const selectedItemsBytes = Buffer.byteLength(JSON.stringify(items));
  requireCondition(selectedItemsBytes <= budgetBytes, 'CONTEXT_SERIALIZATION_BUDGET');
  const envelope = deepFreeze({schema: 'atlas.work-learning.family-context/v1',
    sourceResultSha256: sha(JSON.stringify(result)), provenance: result.provenance,
    originalRetrievalMethod: result.method, originalRankingChanged: false,
    selectionObjective: 'SUM_OF_ORIGINAL_REVERSE_RANKS_WITH_ONE_ITEM_PER_FAMILY',
    costUnit: 'UTF8_BYTES_OF_SELECTED_ITEMS_JSON_ARRAY', budgetBytes, selectedItemsBytes,
    selectedIds: plan.selectedIds, omittedIds: plan.omittedIds, items,
    semanticAcceptance: false, scoreIsConfidence: false, qualityImprovementEstablished: false});
  const serializedPayload = JSON.stringify(envelope);
  await revalidateAuthorizedResult(result);
  const release = authorizeResultRelease([result], {serializedPayload, boundary: 'FAMILY_CONTEXT_PREPARE', requireHostFence});
  const prepared = deepFreeze({envelope, serializedPayload, totalPayloadBytes: Buffer.byteLength(serializedPayload), release});
  preparedPacks.set(prepared, {result, serializedPayload});
  return prepared;
}

/** Current host decision required at actual send/resend; copied JSON is not a brand. */
export function authorizeFamilyContextRelease(prepared) {
  const record = preparedPacks.get(prepared);
  requireCondition(record, 'FAMILY_CONTEXT_PREPARED_REQUIRED');
  return authorizeResultRelease([record.result], {serializedPayload: record.serializedPayload,
    boundary: 'FAMILY_CONTEXT_SEND', requireHostFence: true});
}
