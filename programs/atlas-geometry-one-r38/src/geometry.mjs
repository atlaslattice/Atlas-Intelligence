/**
 * One 12x12x12 numerical substrate.
 * "Cuboctahedral" is a mathematical neighborhood choice, not a proof of
 * semantic, historical, Indigenous, or physical correspondence.
 */
import { NODE_COUNT, HSN, fromIndex, toIndex } from './addresses.mjs';

const vertices = [];
for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) {
  if (Math.abs(x) + Math.abs(y) + Math.abs(z) === 2) vertices.push([x, y, z]);
}
if (vertices.length !== 12) throw new Error('CUBO_VERTEX_COUNT');
const NEIGHBORS = vertices.map(p => vertices.flatMap((q, i) =>
  (p.reduce((sum, v, k) => sum + (v - q[k]) ** 2, 0) === 2) ? [i] : []
));
if (!NEIGHBORS.every(row => row.length === 4)) throw new Error('CUBO_NEIGHBOR_COUNT');

function permutation(seed, salt) {
  let x = ((seed ^ salt) >>> 0) || 1;
  const out = Array.from({ length: 12 }, (_, i) => i);
  for (let i = 11; i > 0; --i) {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    const j = (x >>> 0) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
const cache = new Map();
function neighborIndices(profile, seed) {
  if (!['CUBOCTAHEDRAL', 'SHUFFLED_MATCHED'].includes(profile) ||
      !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new TypeError('GEOMETRY_PROFILE_INVALID');
  }
  const key = `${profile}:${seed}`;
  if (cache.has(key)) return cache.get(key);
  const perAxis = [0, 1, 2].map(axis => {
    const perm = profile === 'CUBOCTAHEDRAL'
      ? Array.from({ length: 12 }, (_, i) => i)
      : permutation(seed, 0x9e3779b9 + axis);
    const inverse = new Array(12);
    perm.forEach((v, i) => { inverse[v] = i; });
    return Array.from({ length: 12 }, (_, i) =>
      NEIGHBORS[inverse[i]].map(v => perm[v])
    );
  });
  const result = Array.from({ length: NODE_COUNT }, (_, i) => {
    const { h, s, n } = fromIndex(i);
    const coords = [h - 1, s - 1, n - 1];
    const out = [];
    for (let axis = 0; axis < 3; ++axis) for (const next of perAxis[axis][coords[axis]]) {
      const p = coords.slice();
      p[axis] = next;
      out.push(toIndex(p[0] + 1, p[1] + 1, p[2] + 1));
    }
    return Uint16Array.from(out);
  });
  cache.set(key, result);
  return result;
}
export function finiteScores(input) {
  if (!Array.isArray(input) && !(input instanceof Float32Array) &&
      !(input instanceof Float64Array)) throw new TypeError('NEURAL_SCORE_VECTOR_REQUIRED');
  if (input.length !== NODE_COUNT) throw new TypeError('NEURAL_SHAPE_1728_REQUIRED');
  const out = Float64Array.from(input);
  if (!out.every(Number.isFinite)) throw new TypeError('NEURAL_NONFINITE');
  return out;
}
export function route(input, { profile = 'CUBOCTAHEDRAL', alpha = 0, seed = 145 } = {}) {
  const base = finiteScores(input);
  if (typeof alpha !== 'number' || !Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    throw new TypeError('ROUTING_ALPHA_INVALID');
  }
  if (alpha === 0) return base; // exact baseline scores, zero geometry overhead
  const table = neighborIndices(profile, seed);
  const next = new Float64Array(NODE_COUNT);
  for (let i = 0; i < NODE_COUNT; ++i) {
    let total = 0;
    for (const j of table[i]) total += base[j];
    next[i] = (1 - alpha) * base[i] + alpha * total / table[i].length;
  }
  if (!next.every(Number.isFinite)) throw new TypeError('ROUTING_NONFINITE');
  return next;
}
export function topK(input, k = 10) {
  const scores = finiteScores(input);
  if (!Number.isInteger(k) || k < 1 || k > 20) throw new TypeError('TOPK_BOUNDS');
  return Object.freeze(Array.from({ length: NODE_COUNT }, (_, i) => i)
    .sort((a, b) => scores[b] - scores[a] || a - b)
    .slice(0, k)
    .map(i => Object.freeze({ hsn: HSN[i], index: i, score: scores[i] })));
}
export function reductions(input) {
  const scores = finiteScores(input);
  let maximum = -Infinity;
  for (const v of scores) maximum = Math.max(maximum, v);
  const h = new Float64Array(12), s = new Float64Array(144);
  let denominator = 0;
  for (let i = 0; i < NODE_COUNT; ++i) {
    const mass = Math.exp(scores[i] - maximum);
    denominator += mass;
    h[Math.floor(i / 144)] += mass;
    s[Math.floor(i / 12)] += mass;
  }
  if (!Number.isFinite(denominator) || denominator <= 0) throw new TypeError('MASS_INVALID');
  return Object.freeze({
    house: Object.freeze(Array.from(h, v => v / denominator)),
    sphere: Object.freeze(Array.from(s, v => v / denominator)),
    logNormalizer: maximum + Math.log(denominator),
    interpretation: 'NORMALIZED_SCORE_MASS_NOT_SEMANTIC_TRUTH'
  });
}
export function exclusiveFourBands(input, source, offsets = [0, 0, 0, 0]) {
  const scores = finiteScores(input);
  if (!Number.isInteger(source) || source < 0 || source >= NODE_COUNT ||
      !Array.isArray(offsets) || offsets.length !== 4 ||
      !offsets.every(v => typeof v === 'number' && Number.isFinite(v))) {
    throw new TypeError('FOUR_BAND_INPUT');
  }
  const ownSphere = Math.floor(source / 12), ownHouse = Math.floor(source / 144);
  const bands = Array.from({ length: 4 }, () => []);
  for (let i = 0; i < NODE_COUNT; ++i) {
    const b = i === source ? 0 : Math.floor(i / 12) === ownSphere ? 1
      : Math.floor(i / 144) === ownHouse ? 2 : 3;
    bands[b].push(scores[i] + offsets[b]);
  }
  const max = Math.max(...bands.flat());
  const weights = bands.map(rows => rows.reduce((t, x) => t + Math.exp(x - max), 0));
  const sum = weights.reduce((a, b) => a + b, 0);
  return Object.freeze({
    masses: Object.freeze(weights.map(v => v / sum)),
    counts: Object.freeze(bands.map(x => x.length)),
    interpretation: 'FOUR_DISJOINT_STRUCTURAL_BANDS_NOT_LEARNED_SEMANTICS'
  });
}
export const geometryContract = Object.freeze({
  addressShape: Object.freeze([12, 12, 12]), nodes: NODE_COUNT,
  cuboctahedronVertices: 12, nodeDegree: 12, sourceIdentityPreserved: true,
  defaultEffect: 'NO_RERANKING', scientificAdvantageClaimed: false
});
