/**
 * Source, purpose and authority separation for an inspection-only candidate.
 * The final published-byte authorization remains in the existing trusted host.
 */
import { createHash } from 'node:crypto';
import { types as utilTypes } from 'node:util';
import { ARIADNE_SHA256 } from './addresses.mjs';
const SHA = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:/@-]{0,159}$/;
const REQUEST_FIELDS = Object.freeze([
  'requestId','tenant','logicalTarget','contractVersion','querySha256','sourceId',
  'sourceSha256','sourceEdition','modelSha256','registrySha256','scope','purpose','subject'
]);
const ISSUED_FIELDS = Object.freeze([
  'schema','requestId','querySha256','sourceId','sourceSha256','sourceEdition',
  'modelSha256','registrySha256','method','fallbackUsed','issuer','scores'
]);
export class Hold extends Error {
  constructor(code) { super(code); this.name = 'GeometryOneHold'; this.code = code; }
}
export function objectData(value, keys) {
  if (!value || typeof value !== 'object' || utilTypes.isProxy(value) ||
      Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Hold('UNTRUSTED_OBJECT');
  }
  const desc = Object.getOwnPropertyDescriptors(value);
  const names = Reflect.ownKeys(desc);
  if (names.length !== keys.length || names.some(k => typeof k !== 'string' || !keys.includes(k))) {
    throw new Hold('UNEXPECTED_FIELDS');
  }
  const copy = Object.create(null);
  for (const k of keys) {
    if (!desc[k] || !Object.hasOwn(desc[k], 'value') || !desc[k].enumerable) {
      throw new Hold('ACCESSOR_OR_MISSING_FIELD');
    }
    copy[k] = desc[k].value;
  }
  return Object.freeze(copy);
}
export function validateRequest(input) {
  const r = objectData(input, REQUEST_FIELDS);
  for (const k of ['requestId','tenant','logicalTarget','contractVersion','sourceId','sourceEdition']) {
    if (typeof r[k] !== 'string' || !ID.test(r[k])) throw new Hold('REQUEST_IDENTITY');
  }
  for (const k of ['querySha256','sourceSha256','modelSha256','registrySha256']) {
    if (typeof r[k] !== 'string' || !SHA.test(r[k])) throw new Hold('SOURCE_DIGEST');
  }
  if (r.registrySha256 !== ARIADNE_SHA256 || r.scope !== 'WORK' ||
      !['INFERENCE','CITATION'].includes(r.purpose) ||
      (r.subject !== null && (typeof r.subject !== 'string' || r.subject.trim().length < 1 || r.subject.length > 256))) {
    throw new Hold('SOURCE_SCOPE_OR_ROLE');
  }
  return r;
}
export function validateIssued(input, request) {
  const x = objectData(input, ISSUED_FIELDS);
  if (x.schema !== 'atlas.geometry-one.issued/v1' || x.method !== 'NEURAL_ONLY' ||
      x.fallbackUsed !== false || !ID.test(x.issuer)) throw new Hold('UNVERIFIED_NEURAL_METHOD');
  for (const k of ['requestId','querySha256','sourceId','sourceSha256','sourceEdition','modelSha256','registrySha256']) {
    if (x[k] !== request[k]) throw new Hold('ISSUED_SOURCE_OR_MODEL_DRIFT');
  }
  // Numerical-array contents are frozen by a fresh defensive copy in geometry.
  return x;
}
export function canonicalDigest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
export async function checkHostPhase(policy, phase, request, expectedEpoch = null) {
  if (typeof policy !== 'function') throw new Hold('HOST_POLICY_UNBOUND');
  let response;
  try { response = await policy(phase, request); }
  catch { throw new Hold('HOST_POLICY_EXCEPTION'); }
  const p = objectData(response, ['allow','epoch']);
  if (p.allow !== true || typeof p.epoch !== 'string' || !ID.test(p.epoch)) {
    throw new Hold('HOST_RIGHTS_DENIED');
  }
  if (expectedEpoch !== null && expectedEpoch !== p.epoch) throw new Hold('HOST_RIGHTS_EPOCH_CHANGED');
  return p.epoch;
}
export async function checkRequiredClosure(review, request, issued) {
  if (typeof review !== 'function') throw new Hold('REQUIRED_CLOSURE_UNBOUND');
  let response;
  try {
    response = await review({
      requestSha256: request.querySha256, sourceSha256: request.sourceSha256,
      modelSha256: issued.modelSha256, registrySha256: request.registrySha256,
      sourceEdition: request.sourceEdition, purpose: request.purpose
    });
  } catch { throw new Hold('REQUIRED_CLOSURE_EXCEPTION'); }
  const c = objectData(response, ['status','releaseAuthorized','authorityEffect']);
  if (c.status !== 'PINNED_COMPLETE_FOR_REVIEW' || c.releaseAuthorized !== false ||
      c.authorityEffect !== 'NONE') throw new Hold('REQUIRED_CLOSURE_HOLD');
  return Object.freeze({ status: c.status, authorityEffect: 'NONE' });
}
export function logicalEffectKey(r) {
  // Cross-interface alias identity: host-selected target, NOT interface name.
  return canonicalDigest([
    r.tenant,r.logicalTarget,r.contractVersion,r.requestId,
    r.sourceId,r.sourceSha256,r.modelSha256,r.querySha256
  ]);
}
export function holdReceipt(error) {
  return Object.freeze({
    status: 'HOLD_INSPECTION_ONLY',
    reason: error instanceof Hold ? error.code : 'UNEXPECTED_ERROR',
    canDeploy: false, canTrain: false, canDisclose: false, authorityEffect: 'NONE'
  });
}
