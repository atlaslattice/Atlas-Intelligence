import {createHash} from 'node:crypto';
import {open} from 'node:fs/promises';
import {constants} from 'node:fs';
import {isAbsolute} from 'node:path';
import {captureData, canonical, deepFreeze, HSN, OPERATIONS, SHA256, plainObject, requireCondition, validateArguments, WorkLearningError} from './contracts.mjs';

const approvedResults = new WeakMap();
const sha = value => createHash('sha256').update(value).digest('hex');
const sourceKey = ref => canonical([ref.id, ref.version, ref.sha256, ref.uri]);
const PIN_NAMES = ['registrySha256', 'configSha256', 'corpusSha256', 'checkpointSha256'];
function identity(value, workspaceId) {
  const pins = captureData(value, {maxBytes: 16_384});
  requireCondition(plainObject(pins) && pins.workspaceId === workspaceId, 'WORKSPACE_PIN_MISMATCH');
  for (const name of PIN_NAMES) requireCondition(SHA256.test(pins[name] ?? '')
    || (['corpusSha256', 'checkpointSha256'].includes(name) && pins[name] === null), 'SOURCE_PIN_MISMATCH');
  return Object.fromEntries(['workspaceId', ...PIN_NAMES].map(k => [k, pins[k]]));
}
function sourceRef(ref) {
  requireCondition(plainObject(ref) && typeof ref.id === 'string' && ref.id.length > 0 && ref.id.length <= 512
    && typeof ref.version === 'string' && ref.version.length > 0 && ref.version.length <= 512
    && SHA256.test(ref.sha256 ?? '') && typeof ref.uri === 'string' && ref.uri.length <= 4096, 'SOURCE_REFERENCE_INVALID');
  return {id: ref.id, version: ref.version, sha256: ref.sha256, uri: ref.uri};
}

const SEARCH_FIELDS = new Set(['target', 'method', 'primaryMethod', 'fallbackUsed', 'fallbackReason',
  'hits', 'semanticAcceptance', 'provenance']);
const ITEM_FIELDS = new Set(['id', 'sourceId', 'sourceVersion', 'sourceSha256', 'sourceUri',
  'textSha256', 'excerptSha256', 'excerptTruncated']);

function itemInventory(manifest, sources) {
  // A legacy source-only manifest can still serve status/node reads, but cannot
  // establish a corpus hit's membership in one exact admitted source edition.
  if (!plainObject(manifest) || !Object.hasOwn(manifest, 'items')) return null;
  requireCondition(Array.isArray(manifest.items) && manifest.items.length <= 100_000, 'ITEM_MANIFEST_INVALID');
  const items = new Map();
  for (const entry of manifest.items) {
    requireCondition(plainObject(entry) && Object.keys(entry).length === ITEM_FIELDS.size
      && Object.keys(entry).every(key => ITEM_FIELDS.has(key)) && typeof entry.id === 'string'
      && entry.id.length > 0 && entry.id.length <= 512 && SHA256.test(entry.textSha256 ?? '')
      && SHA256.test(entry.excerptSha256 ?? '') && typeof entry.excerptTruncated === 'boolean'
      && (entry.excerptTruncated || entry.excerptSha256 === entry.textSha256), 'ITEM_MANIFEST_INVALID');
    const source = sourceRef({id: entry.sourceId, version: entry.sourceVersion,
      sha256: entry.sourceSha256, uri: entry.sourceUri});
    requireCondition(sources.has(sourceKey(source)), 'ITEM_MANIFEST_SOURCE_MISMATCH');
    const key = canonical([entry.id, entry.sourceId]);
    requireCondition(!items.has(key), 'DUPLICATE_ITEM_MANIFEST');
    items.set(key, deepFreeze(entry));
  }
  return items;
}

/** Check the returned search page before any consumer can release or adapt it.
 * Corpus identity and excerpt bytes bind a trusted inventory exported from the
 * pinned corpus, separately from backend-supplied result provenance. Source
 * fidelity does not establish semantic truth or relevance.
 */
function validateSearchResult(result, args, resultSources, inventory) {
  requireCondition(Object.keys(result).every(key => SEARCH_FIELDS.has(key)), 'RESULT_SEARCH_FIELDS');
  requireCondition(result.target === args.target, 'RESULT_SEARCH_TARGET_MISMATCH');
  requireCondition(Array.isArray(result.hits) && result.hits.length <= args.limit, 'RESULT_SEARCH_BOUNDS');
  const provenance = result.provenance, seen = new Set();
  const items = new Set(provenance.itemRefs.map(ref => canonical([ref.id, ref.sourceId, ref.textSha256])));
  if (args.target === 'nodes') {
    const registry = [...resultSources.values()].filter(ref => ref.id === 'ariadne:v0.7'
      && ref.version === 'v0.7' && ref.sha256 === provenance.registrySha256);
    requireCondition(registry.length === 1, 'RESULT_NODE_SOURCE_MISMATCH');
  }
  for (const hit of result.hits) {
    requireCondition(plainObject(hit) && typeof hit.score === 'number' && Number.isFinite(hit.score), 'RESULT_HIT_INVALID');
    for (const [field, pin] of [['registry_sha256', 'registrySha256'], ['checkpoint_sha256', 'checkpointSha256']]) {
      if (Object.hasOwn(hit, field)) requireCondition(hit[field] === provenance[pin], 'RESULT_HIT_PIN_MISMATCH');
    }
    let key;
    if (args.target === 'nodes') {
      requireCondition(HSN.test(hit.hsn ?? '') && (!Object.hasOwn(hit, 'id') || hit.id === hit.hsn), 'RESULT_HIT_NODE_INVALID');
      key = hit.hsn;
    } else {
      requireCondition(typeof hit.source_id === 'string' && typeof hit.source_version === 'string'
        && SHA256.test(hit.source_sha256 ?? '') && typeof hit.source_uri === 'string'
        && resultSources.has(sourceKey({id: hit.source_id, version: hit.source_version,
          sha256: hit.source_sha256, uri: hit.source_uri})), 'RESULT_HIT_SOURCE_MISMATCH');
      requireCondition(items.has(canonical([hit.id, hit.source_id, hit.text_sha256])), 'RESULT_HIT_ITEM_MISMATCH');
      key = canonical([hit.id, hit.source_id]);
      const admitted = inventory.get(key);
      requireCondition(admitted && admitted.sourceId === hit.source_id && admitted.sourceVersion === hit.source_version
        && admitted.sourceSha256 === hit.source_sha256 && admitted.sourceUri === hit.source_uri
        && admitted.textSha256 === hit.text_sha256, 'RESULT_HIT_INVENTORY_MISMATCH');
      requireCondition(typeof hit.excerpt === 'string' && SHA256.test(hit.excerpt_sha256 ?? '')
        && typeof hit.excerpt_truncated === 'boolean' && sha(hit.excerpt) === hit.excerpt_sha256
        && hit.excerpt_sha256 === admitted.excerptSha256 && hit.excerpt_truncated === admitted.excerptTruncated,
      'RESULT_HIT_EXCERPT_MISMATCH');
    }
    requireCondition(!seen.has(key), 'RESULT_HIT_DUPLICATE'); seen.add(key);
  }
}

/** Trusted read pin verifier; paths never appear in tool arguments or returned receipts. */
export function createFilePinVerifier({files, identity: suppliedIdentity, maxFileBytes = 1_073_741_824}) {
  const entries = captureData(files, {maxBytes: 1_048_576});
  const pinnedIdentity = deepFreeze(captureData(suppliedIdentity));
  requireCondition(Array.isArray(entries) && entries.length > 0 && entries.length <= 4096, 'PIN_FILES_REQUIRED');
  for (const file of entries) requireCondition(plainObject(file) && isAbsolute(file.path ?? '') && SHA256.test(file.sha256 ?? ''), 'PIN_FILE_INVALID');
  requireCondition(Number.isSafeInteger(maxFileBytes) && maxFileBytes > 0, 'PIN_FILE_BOUNDS');
  return async function verifyPins() {
    for (const file of entries) {
      let handle;
      try {
        handle = await open(file.path, constants.O_RDONLY | constants.O_NONBLOCK);
        const before = await handle.stat();
        requireCondition(before.isFile() && before.size <= maxFileBytes, 'SOURCE_PIN_MISMATCH');
        const hash = createHash('sha256'), chunk = Buffer.allocUnsafe(131072);
        let total = 0;
        while (true) {
          const {bytesRead} = await handle.read(chunk, 0, chunk.length, null);
          if (!bytesRead) break;
          total += bytesRead; requireCondition(total <= maxFileBytes, 'SOURCE_PIN_MISMATCH'); hash.update(chunk.subarray(0, bytesRead));
        }
        const after = await handle.stat();
        requireCondition(before.size === after.size && before.mtimeMs === after.mtimeMs
          && total === before.size && hash.digest('hex') === file.sha256, 'SOURCE_PIN_MISMATCH');
      } catch { throw new WorkLearningError('SOURCE_PIN_MISMATCH', 'Pinned local source bytes changed or are unavailable.'); }
      finally { if (handle) await handle.close(); }
    }
    return captureData(pinnedIdentity);
  };
}

/** Mandatory host-injected owner/policy/pins; every page is withheld in full on denial. */
export function createWorkLearningGateway({backend, owner, workspaceId, authorize, verifyPins, sourceManifest,
  timeoutMs = 30_000, maxPending = 16, maxResultBytes = 4_194_304,
  purposePolicy = 'LEGACY', authorizeInferenceUse, hostOwnedFinalReturnSync} = {}) {
  requireCondition(typeof owner === 'string' && owner.length > 0 && owner.length <= 512, 'OWNER_REQUIRED');
  requireCondition(typeof workspaceId === 'string' && workspaceId.length > 0 && workspaceId.length <= 512, 'WORKSPACE_REQUIRED');
  requireCondition(backend && typeof backend.execute === 'function' && typeof authorize === 'function' && typeof verifyPins === 'function', 'TRUSTED_HOST_REQUIRED');
  requireCondition(Number.isSafeInteger(timeoutMs) && timeoutMs >= 10 && timeoutMs <= 120_000
    && Number.isSafeInteger(maxPending) && maxPending >= 1 && maxPending <= 128, 'GATEWAY_BOUNDS');
  // An explicit, opt-in source-only review seam. The actual publisher must bind
  // authoritative INFERENCE_USE and synchronous final-release checks. This is
  // not a hosted permission claim, nor a default behavior change.
  requireCondition(['LEGACY', 'STRICT_SOURCE_ONLY'].includes(purposePolicy), 'PURPOSE_POLICY_INVALID');
  const strictPurpose = purposePolicy === 'STRICT_SOURCE_ONLY';
  if (strictPurpose) requireCondition(typeof authorizeInferenceUse === 'function'
    && typeof hostOwnedFinalReturnSync === 'function', 'PURPOSE_BINDING_REQUIRED');
  const manifest = captureData(sourceManifest, {maxBytes: 32_000_000, maxNodes: 500_000});
  const entries = Array.isArray(manifest) ? manifest : manifest?.sources;
  requireCondition(Array.isArray(entries) && entries.length <= 100_000, 'SOURCE_MANIFEST_REQUIRED');
  const sources = new Map();
  for (const entry of entries) {
    const ref = deepFreeze(sourceRef(entry)), key = sourceKey(ref);
    requireCondition(!sources.has(key), 'DUPLICATE_SOURCE'); sources.set(key, ref);
  }
  const inventory = itemInventory(manifest, sources);
  let pending = 0, closed = false;
  const active = new Set();
  const policy = async (action, kind, operation, ref, signal) => {
    if (signal.aborted) throw new WorkLearningError('REQUEST_CANCELLED');
    let permitted;
    try { permitted = await authorize(deepFreeze({action, kind, operation, owner, workspaceId, ref: ref ?? null})); }
    catch { permitted = false; }
    requireCondition(permitted === true, 'ACCESS_DENIED', 'The current host policy withheld this result.');
  };
  const inferenceUse = async (phase, kind, operation, ref, signal) => {
    if (signal.aborted) throw new WorkLearningError('REQUEST_CANCELLED');
    let allowed;
    try { allowed = await authorizeInferenceUse(deepFreeze({purpose: 'INFERENCE_USE',
      phase, kind, operation, owner, workspaceId, ref})); } catch { allowed = false; }
    requireCondition(allowed === true, 'INFERENCE_USE_DENIED',
      'The current host has not authorized this source for inference.');
  };
  async function execute(operation, input, {signal: callerSignal} = {}) {
    requireCondition(!closed, 'GATEWAY_CLOSED');
    const args = validateArguments(operation, input);
    requireCondition(pending < maxPending, 'QUEUE_FULL');
    if (callerSignal?.aborted) throw new WorkLearningError('REQUEST_CANCELLED');
    const controller = new AbortController(), signal = controller.signal;
    const abort = () => controller.abort();
    callerSignal?.addEventListener('abort', abort, {once: true});
    active.add(controller); pending++;
    let timer;
    const cancellation = new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new WorkLearningError('REQUEST_CANCELLED')), {once: true});
      timer = setTimeout(() => { reject(new WorkLearningError('REQUEST_TIMEOUT')); controller.abort(); }, timeoutMs);
    });
    const work = async () => {
      await policy('READ', 'SERVICE', operation, null, signal);
      const before = identity(await verifyPins(), workspaceId);
      if (operation === 'search' && args.target === 'corpus') requireCondition(inventory !== null,
        'ITEM_MANIFEST_REQUIRED', 'Re-export the trusted server configuration with its pinned corpus item inventory.');
      // Authorize every admitted source before backend access; candidate filters cannot enlarge this inventory.
      for (const ref of sources.values()) await policy('READ', 'SOURCE', operation, ref, signal);
      // An inventory entry is not an independently audited model dependency
      // manifest. Conservatively treat all admitted sources as possible inputs.
      if (strictPurpose) for (const ref of sources.values())
        await inferenceUse('BEFORE_COMPUTE', 'SOURCE', operation, ref, signal);
      if (signal.aborted) throw new WorkLearningError('REQUEST_CANCELLED');
      const result = captureData(await backend.execute(operation, args, {signal}), {maxBytes: maxResultBytes});
      const provenance = result?.provenance;
      requireCondition(plainObject(result) && plainObject(provenance), 'RESULT_PROVENANCE_REQUIRED');
      requireCondition(canonical(identity(provenance, workspaceId)) === canonical(before), 'RESULT_PIN_MISMATCH');
      requireCondition(Array.isArray(provenance.sourceRefs) && Array.isArray(provenance.itemRefs)
        && provenance.sourceRefs.length <= sources.size && provenance.itemRefs.length <= 2048, 'RESULT_REFERENCES_INVALID');
      const resultSources = new Map();
      for (const entry of provenance.sourceRefs) {
        const ref = sourceRef(entry), key = sourceKey(ref), admitted = sources.get(key);
        requireCondition(admitted && canonical(ref) === canonical(admitted) && !resultSources.has(key), 'UNADMITTED_RESULT_SOURCE');
        resultSources.set(key, ref);
      }
      const sourceIds = new Set([...resultSources.values()].map(r => r.id)), seenItems = new Set();
      for (const item of provenance.itemRefs) {
        requireCondition(plainObject(item) && typeof item.id === 'string' && item.id.length > 0 && item.id.length <= 512
          && typeof item.sourceId === 'string' && sourceIds.has(item.sourceId) && SHA256.test(item.textSha256 ?? ''), 'RESULT_ITEM_INVALID');
        const itemKey = canonical([item.id, item.sourceId]); requireCondition(!seenItems.has(itemKey), 'RESULT_ITEM_DUPLICATE'); seenItems.add(itemKey);
        await policy('READ', 'ITEM', operation, item, signal);
      }
      if (operation === 'search') validateSearchResult(result, args, resultSources, inventory);
      // Recheck current inference-use *after* backend work, even for an
      // off-result contributor. A revoked dependency cannot retain influence
      // merely because quoting/disclosure still happens to be permitted.
      if (strictPurpose) for (const ref of sources.values())
        await inferenceUse('AFTER_COMPUTE', 'SOURCE', operation, ref, signal);
      await policy('RETURN', 'SERVICE', operation, null, signal);
      // Any admitted source may have influenced the learned checkpoint or index,
      // even when its own item is absent from the returned page.
      // In strict mode disclosure is checked for source tuples actually in
      // returned provenance. Unquoted, unreturned dependencies still require
      // INFERENCE_USE, but do not automatically need quotation permission.
      for (const ref of strictPurpose ? resultSources.values() : sources.values())
        await policy('RETURN', 'SOURCE', operation, ref, signal);
      for (const ref of provenance.itemRefs) await policy('RETURN', 'ITEM', operation, ref, signal);
      const after = identity(await verifyPins(), workspaceId);
      requireCondition(canonical(before) === canonical(after), 'SOURCE_PIN_MISMATCH');
      if (strictPurpose) {
        // Local synchronous handoff seam, not proof of actual network egress.
        // A Promise/thenable, unknown result or failed host check must HOLD.
        let decision;
        try { decision = hostOwnedFinalReturnSync(deepFreeze({owner, workspaceId,
          operation, sourceRefs: [...resultSources.values()], itemRefs: provenance.itemRefs,
          pinIdentity: before, purposePolicy})); } catch { decision = false; }
        requireCondition(decision === true, 'FINAL_RELEASE_DENIED');
      }
      if (signal.aborted || closed) throw new WorkLearningError('REQUEST_CANCELLED');
      const frozen = deepFreeze(result);
      approvedResults.set(frozen, deepFreeze({operation, owner, workspaceId, purposePolicy, provenanceDigest: sha(canonical(provenance))}));
      return frozen;
    };
    try { return await Promise.race([work(), cancellation]); }
    finally { clearTimeout(timer); callerSignal?.removeEventListener('abort', abort); active.delete(controller); pending--; }
  }
  const gateway = {execute, async close() { if (closed) return; closed = true; for (const item of active) item.abort(); await backend.close?.(); },
    stats: () => ({pending, closed, operations: [...OPERATIONS], hostedRegistration: false})};
  for (const operation of OPERATIONS) gateway[operation] = (args = {}, options) => execute(operation, args, options);
  return Object.freeze(gateway);
}

export function authorizedResultMetadata(result) {
  const metadata = approvedResults.get(result);
  requireCondition(metadata, 'AUTHORIZED_RESULT_REQUIRED');
  return metadata;
}
