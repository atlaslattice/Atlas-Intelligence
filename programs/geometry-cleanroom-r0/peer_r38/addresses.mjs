/**
 * Canonical reversible Ariadne v0.7 HSN addresses.
 * Structural positions are NOT semantic crosswalk approvals or source bodies.
 */
export const SIDE = 12;
export const NODE_COUNT = SIDE ** 3;
export const SPHERE_COUNT = SIDE ** 2;
export const HOUSE_COUNT = SIDE;
export const ARIADNE_SHA256 = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
export const EDITION = 'ariadne-reader/v0.7';
const ADDRESS = /^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const p = n => String(n).padStart(2, '0');

export function toIndex(h, s, n) {
  if (![h, s, n].every(x => Number.isInteger(x) && x >= 1 && x <= SIDE)) {
    throw new TypeError('HSN_AXIS_OUT_OF_RANGE');
  }
  return (h - 1) * 144 + (s - 1) * 12 + (n - 1);
}
export function fromIndex(index) {
  if (!Number.isInteger(index) || index < 0 || index >= NODE_COUNT) {
    throw new TypeError('HSN_INDEX_OUT_OF_RANGE');
  }
  return Object.freeze({
    h: Math.floor(index / 144) + 1,
    s: Math.floor(index / 12) % 12 + 1,
    n: index % 12 + 1,
    index
  });
}
export function encode(h, s, n) {
  toIndex(h, s, n);
  return `H${p(h)}.S${p(s)}.N${p(n)}`;
}
export function decode(address) {
  const m = typeof address === 'string' ? ADDRESS.exec(address) : null;
  if (!m) throw new TypeError('HSN_ADDRESS_INVALID');
  return fromIndex(toIndex(Number(m[1]), Number(m[2]), Number(m[3])));
}
export const HSN = Object.freeze(
  Array.from({ length: NODE_COUNT }, (_, i) => {
    const x = fromIndex(i);
    return encode(x.h, x.s, x.n);
  })
);
export function sphereId(h, s) {
  toIndex(h, s, 1);
  return `H${p(h)}.S${p(s)}`;
}
export function addressAsGlyphTokens(address) {
  const { h, s, n } = decode(address);
  // Symbolic reversible tokens, not a physical frequency or cultural assertion.
  return Object.freeze(['H', p(h), 'S', p(s), 'N', p(n), 'END', EDITION, address]);
}
export function glyphTokensToAddress(tokens) {
  if (!Array.isArray(tokens) || tokens.length !== 9 ||
      tokens[0] !== 'H' || tokens[2] !== 'S' || tokens[4] !== 'N' ||
      tokens[6] !== 'END' || tokens[7] !== EDITION) {
    throw new TypeError('GLYPH_TOKENS_INVALID');
  }
  const value = encode(Number(tokens[1]), Number(tokens[3]), Number(tokens[5]));
  if (value !== tokens[8]) throw new TypeError('GLYPH_IDENTITY_COLLISION');
  return value;
}
