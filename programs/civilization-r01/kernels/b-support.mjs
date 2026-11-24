// JSON-data utilities shared by the six bounded software kernels H07–H12.
// These utilities do not authenticate a caller or grant host authority.
export function requireValue(ok, message) { if (!ok) throw new TypeError(message); }
export function object(v, label = 'value') {
  requireValue(v !== null && typeof v === 'object' && !Array.isArray(v), `${label} must be an object`);
  return v;
}
export function shape(v, keys, label = 'value') {
  object(v, label);
  requireValue(Object.keys(v).every(k => keys.includes(k)), `${label} contains unknown fields`);
  return v;
}
export function text(v, label, max = 160) {
  requireValue(typeof v === 'string' && v.length > 0 && v.length <= max, `${label} must be bounded nonempty text`);
  return v;
}
export function id(v, label = 'id') {
  text(v, label, 100);
  requireValue(/^[A-Za-z0-9_.:-]+$/.test(v), `${label} must be a literal identifier`);
  return v;
}
export function integer(v, label, min = 0, max = Number.MAX_SAFE_INTEGER) {
  requireValue(Number.isSafeInteger(v) && v >= min && v <= max, `${label} must be a bounded integer`);
  return v;
}
export function bool(v, label) { requireValue(typeof v === 'boolean', `${label} must be boolean`); return v; }
export function array(v, label, max = 4096, min = 0) {
  requireValue(Array.isArray(v) && v.length >= min && v.length <= max, `${label} must be a bounded array`);
  return v;
}
export function unique(v, label, max = 4096, validate = id) {
  array(v, label, max);
  for (const item of v) validate(item, label);
  requireValue(new Set(v).size === v.length, `${label} contains duplicates`);
  return v;
}
export function snapshot(value) {
  let count = 0;
  let characters = 0;
  const ancestors = new Set();
  function inspect(v, depth) {
    requireValue(++count <= 240000 && depth <= 20, 'JSON data exceeds its structural bound');
    if (v === null || typeof v === 'boolean') return;
    if (typeof v === 'number') { requireValue(Number.isFinite(v), 'Nonfinite numbers are not JSON data'); return; }
    if (typeof v === 'string') { characters += v.length; requireValue(v.length <= 131072 && characters <= 4194304, 'String data exceeds input bound'); return; }
    requireValue(typeof v === 'object', 'Only finite JSON data is accepted');
    requireValue(!ancestors.has(v), 'Cyclic input is not JSON data');
    const proto = Object.getPrototypeOf(v);
    requireValue(Array.isArray(v) ? proto === Array.prototype : proto === Object.prototype || proto === null, 'Only plain JSON objects are accepted');
    ancestors.add(v);
    for (const key of Reflect.ownKeys(v)) {
      if (Array.isArray(v) && key === 'length') continue;
      requireValue(typeof key === 'string', 'Symbol fields are not JSON data');
      if (Array.isArray(v)) requireValue(/^(0|[1-9][0-9]*)$/.test(key) && Number(key) < v.length, 'Array properties must be exact dense integer indices');
      characters += key.length; requireValue(characters <= 4194304, 'JSON field names exceed input bound');
      const d = Object.getOwnPropertyDescriptor(v, key);
      requireValue(d && 'value' in d && d.enumerable, 'Accessors and hidden fields are not accepted');
      inspect(d.value, depth + 1);
    }
    if (Array.isArray(v)) {
      requireValue(Object.keys(v).length === v.length, 'Sparse arrays are not accepted');
      for (let i=0;i<v.length;i++) requireValue(Object.hasOwn(v,String(i)), 'Sparse arrays are not accepted');
    }
    ancestors.delete(v);
  }
  inspect(value, 0);
  return JSON.parse(JSON.stringify(value));
}
export function opaqueStore(kernel) {
  const instances = new WeakMap();
  return {
    put(state) { const token = Object.freeze({kernel, prepared: true}); instances.set(token, state); return token; },
    get(token) { requireValue(token !== null && typeof token === 'object' && instances.has(token), `${kernel} requires its genuine prepared instance`); return instances.get(token); },
  };
}
export function seeded(seed, size) {
  integer(seed, 'seed', 0, 0xffffffff); integer(size, 'size', 1, 4096);
  let state = seed || 1;
  return max => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) % max; };
}
export function shuffle(items, random) {
  for (let i = items.length - 1; i > 0; i--) { const j = random(i + 1); [items[i], items[j]] = [items[j], items[i]]; }
  return items;
}
