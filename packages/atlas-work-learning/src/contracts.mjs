/** Closed read-only contracts. Corpus text and model arguments never confer authority. */
export const VERSION = '0.1.0';
export const HSN = /^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
export const SHA256 = /^[a-f0-9]{64}$/;
export const OPERATIONS = Object.freeze(['status', 'search', 'node', 'episodes', 'evaluation']);

export class WorkLearningError extends Error {
  constructor(code, message = 'The requested Work operation was withheld.') {
    super(message); this.name = 'WorkLearningError'; this.code = code;
  }
}
export function requireCondition(condition, code, message) {
  if (!condition) throw new WorkLearningError(code, message);
}
export const plainObject = value => value !== null && typeof value === 'object'
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

/** Capture data without invoking accessors, toJSON, or a caller's prototype. */
export function captureData(value, {maxBytes = 4_194_304, maxDepth = 32, maxNodes = 100_000} = {}) {
  const seen = new WeakSet(); let nodes = 0;
  function visit(item, depth) {
    requireCondition(++nodes <= maxNodes && depth <= maxDepth, 'DATA_BOUNDS');
    if (item === null || typeof item === 'boolean' || typeof item === 'string') return item;
    if (typeof item === 'number') { requireCondition(Number.isFinite(item), 'DATA_NUMBER'); return item; }
    requireCondition(Array.isArray(item) || plainObject(item), 'DATA_OBJECT');
    requireCondition(!seen.has(item), 'DATA_CYCLE'); seen.add(item);
    if (Array.isArray(item)) {
      const result = [];
      requireCondition(Reflect.ownKeys(item).length === item.length + 1, 'DATA_ARRAY_PROPERTIES');
      for (let i = 0; i < item.length; i++) {
        const descriptor = Object.getOwnPropertyDescriptor(item, String(i));
        requireCondition(descriptor && Object.hasOwn(descriptor, 'value'), 'DATA_ACCESSOR');
        result.push(visit(descriptor.value, depth + 1));
      }
      seen.delete(item); return result;
    }
    const result = {};
    for (const key of Reflect.ownKeys(item)) {
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      requireCondition(typeof key === 'string' && descriptor.enumerable && Object.hasOwn(descriptor, 'value')
        && !['__proto__', 'prototype', 'constructor'].includes(key), 'DATA_PROPERTY');
      Object.defineProperty(result, key, {value: visit(descriptor.value, depth + 1), enumerable: true, writable: true, configurable: true});
    }
    seen.delete(item); return result;
  }
  const result = visit(value, 0);
  requireCondition(Buffer.byteLength(JSON.stringify(result)) <= maxBytes, 'DATA_BYTES');
  return result;
}
export function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (plainObject(value)) return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}

/** JSON.parse with duplicate-key rejection, explicit input bounds and no reviver side effects. */
export function parseStrictJson(text, maxBytes = 16_384) {
  requireCondition(typeof text === 'string' && Buffer.byteLength(text) <= maxBytes, 'JSON_BOUNDS');
  let offset = 0, count = 0;
  const whitespace = () => { while (offset < text.length && /[ \t\r\n]/.test(text[offset])) offset++; };
  const fail = () => { throw new WorkLearningError('INVALID_JSON', 'Invalid JSON arguments.'); };
  function string() {
    if (text[offset] !== '"') fail();
    const start = offset++;
    while (offset < text.length) {
      const c = text[offset++];
      if (c === '\\') offset++;
      else if (c === '"') { try { return JSON.parse(text.slice(start, offset)); } catch { fail(); } }
    }
    fail();
  }
  function value(depth) {
    if (++count > 100_000 || depth > 32) fail();
    whitespace(); const c = text[offset];
    if (c === '"') return string();
    if (c === '{') {
      offset++; whitespace(); const result = {}, keys = new Set();
      if (text[offset] === '}') { offset++; return result; }
      while (true) {
        whitespace(); const key = string();
        if (keys.has(key) || ['__proto__', 'prototype', 'constructor'].includes(key)) fail();
        keys.add(key); whitespace(); if (text[offset++] !== ':') fail();
        result[key] = value(depth + 1); whitespace();
        if (text[offset] === '}') { offset++; return result; }
        if (text[offset++] !== ',') fail();
      }
    }
    if (c === '[') {
      offset++; whitespace(); const result = [];
      if (text[offset] === ']') { offset++; return result; }
      while (true) {
        result.push(value(depth + 1)); whitespace();
        if (text[offset] === ']') { offset++; return result; }
        if (text[offset++] !== ',') fail();
      }
    }
    const token = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(offset));
    if (!token) fail(); offset += token[0].length;
    const result = JSON.parse(token[0]);
    if (typeof result === 'number' && !Number.isFinite(result)) fail();
    return result;
  }
  const result = value(0); whitespace(); if (offset !== text.length) fail();
  return result;
}

const objectSchema = properties => ({type: 'object', properties, required: Object.keys(properties), additionalProperties: false});
export const TOOL_DEFINITIONS = deepFreeze([
  {operation: 'status', name: 'atlas_work_learning_status', description: 'Read the current pinned local Work-learning coverage, checkpoint and training status.', parameters: objectSchema({})},
  {operation: 'search', name: 'atlas_work_learning_search', description: 'Search admitted Work corpus or original Ariadne nodes using the selected local checkpoint. Scores and candidate mappings are not accepted facts.', parameters: objectSchema({query: {type: 'string', minLength: 1, maxLength: 4096}, limit: {type: 'integer', minimum: 1, maximum: 20}, target: {type: 'string', enum: ['corpus', 'nodes']}})},
  {operation: 'node', name: 'atlas_work_learning_node', description: 'Read an exact original Ariadne node, its preserved definition and source provenance.', parameters: objectSchema({hsn: {type: 'string', pattern: HSN.source}})},
  {operation: 'episodes', name: 'atlas_work_learning_episodes', description: 'Read a bounded page of productive Work episode metadata, verification kinds and eligibility. Does not append or train.', parameters: objectSchema({limit: {type: 'integer', minimum: 1, maximum: 50}, offset: {type: 'integer', minimum: 0, maximum: 1_000_000}})},
  {operation: 'evaluation', name: 'atlas_work_learning_evaluation', description: 'Read the saved evaluation receipt, baselines, held-out results and limitations. Does not run or select a model.', parameters: objectSchema({})}
]);
const byOperation = new Map(TOOL_DEFINITIONS.map(d => [d.operation, d]));
const byName = new Map(TOOL_DEFINITIONS.map(d => [d.name, d]));
export const definitionForName = name => byName.get(name);
export function validateArguments(operation, input) {
  const definition = byOperation.get(operation);
  requireCondition(definition, 'UNKNOWN_OPERATION', 'Unknown read-only Work operation.');
  const args = captureData(input, {maxBytes: 16_384, maxDepth: 4, maxNodes: 32});
  requireCondition(plainObject(args), 'INVALID_ARGUMENTS');
  const properties = definition.parameters.properties;
  requireCondition(Object.keys(args).length === Object.keys(properties).length
    && Object.keys(args).every(k => Object.hasOwn(properties, k)), 'INVALID_ARGUMENTS');
  for (const [key, schema] of Object.entries(properties)) {
    const value = args[key];
    if (schema.type === 'integer') requireCondition(Number.isSafeInteger(value) && value >= schema.minimum && value <= schema.maximum, 'INVALID_ARGUMENTS');
    if (schema.type === 'string') requireCondition(typeof value === 'string'
      && (schema.minLength === undefined || value.trim().length >= schema.minLength)
      && (schema.maxLength === undefined || value.length <= schema.maxLength)
      && (!schema.enum || schema.enum.includes(value))
      && (!schema.pattern || new RegExp(schema.pattern).test(value)), 'INVALID_ARGUMENTS');
  }
  return deepFreeze(args);
}
export function publicError(error) {
  return {code: error instanceof WorkLearningError ? error.code : 'INTERNAL_ERROR',
    message: error instanceof WorkLearningError ? error.message : 'The local Work operation could not complete.'};
}
