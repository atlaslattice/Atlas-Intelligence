// Bounded JSON snapshots for the first six supporting-capability kernels.
export function expect(ok, message) { if (!ok) throw new TypeError(message); }
export function object(value, label) { expect(value !== null && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`); return value; }
export function keys(value, allowed, required = allowed, label = 'record') {
  object(value, label);
  expect(Object.keys(value).every(k => allowed.includes(k)), `${label} contains an unknown field`);
  expect(required.every(k => Object.hasOwn(value, k)), `${label} omits a required field`);
}
export function text(value, label, max = 256) { expect(typeof value === 'string' && value.length > 0 && value.length <= max, `${label} must be bounded nonempty text`); return value; }
export function id(value, label = 'id') { text(value, label, 128); expect(/^[A-Za-z0-9][A-Za-z0-9_.:/-]*$/.test(value), `${label} contains unsupported characters`); return value; }
export function number(value, label, min = -1e15, max = 1e15) { expect(typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max, `${label} must be a bounded finite number`); return value; }
export function integer(value, label, min, max) { number(value, label, min, max); expect(Number.isSafeInteger(value), `${label} must be a safe integer`); return value; }
export function array(value, label, max = 8192) { expect(Array.isArray(value) && value.length <= max, `${label} must be a bounded array`); return value; }
export function ids(value, label, max = 8192) { array(value, label, max); value.forEach(v => id(v, label)); expect(new Set(value).size === value.length, `${label} contains duplicates`); return value; }
export function pin(value, label = 'digest') { expect(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), `${label} must be lowercase SHA-256 text`); return value; }
export function bool(value, label) { expect(typeof value === 'boolean', `${label} must be boolean`); return value; }

export function snapshot(value) {
  let count = 0, chars = 0;
  const active = new WeakSet();
  function visit(v, depth) {
    expect(++count <= 150000 && depth <= 20, 'Input exceeds structural bound');
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'number') { expect(Number.isFinite(v), 'Input contains nonfinite number'); return v; }
    if (typeof v === 'string') { chars += v.length; expect(chars <= 2000000, 'Input exceeds text bound'); return v; }
    expect(typeof v === 'object' && !active.has(v), 'Input must be acyclic JSON');
    expect(Object.getOwnPropertySymbols(v).length === 0, 'Symbols are not JSON fields');
    const descriptors = Object.getOwnPropertyDescriptors(v);
    expect(Object.values(descriptors).every(d => !('get' in d) && !('set' in d)), 'Input accessors are forbidden');
    active.add(v);
    let out;
    if (Array.isArray(v)) {
      expect(v.length <= 32768 && Object.keys(descriptors).length === v.length + 1, 'Input arrays must be bounded and dense');
      out = Array.from({length:v.length}, (_, i) => { expect(Object.hasOwn(descriptors, String(i)), 'Sparse array'); return visit(descriptors[String(i)].value, depth + 1); });
    } else {
      expect(Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null, 'Only plain JSON objects are accepted');
      out = {};
      for (const [k,d] of Object.entries(descriptors)) {
        expect(d.enumerable && !['__proto__','prototype','constructor'].includes(k), 'Unsupported JSON key or hidden field');
        out[k] = visit(d.value, depth + 1);
      }
    }
    active.delete(v);
    return out;
  }
  return visit(value, 0);
}

export function store(label) {
  const states = new WeakMap();
  return {
    put(state) { const token = Object.freeze({kernel:label}); states.set(token,state); return token; },
    get(token) { expect(token !== null && typeof token === 'object' && states.has(token), 'Unknown or forged prepared dataset'); return states.get(token); },
  };
}
export function random(seed) { integer(seed, 'seed', 0, 0xffffffff); let x=seed>>>0; return () => { x=(Math.imul(x,1664525)+1013904223)>>>0; return x/0x100000000; }; }
export function sizeOf(size, min=16, max=1024) { return integer(size, 'fixture size', min, max); }
export function fixturePin(value) { return (value>>>0).toString(16).padStart(64,'0'); }
export function sorted(values) { return [...values].sort(); }
export function mapPush(map,key,value) { const rows=map.get(key); if(rows)rows.push(value);else map.set(key,[value]); }
