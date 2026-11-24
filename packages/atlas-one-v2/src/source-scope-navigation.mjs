// Pure local navigation. No host API, authorization, write or scheduler behavior.
export const SOURCE_PIN = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
export function assertNodeId(value, nodes) {
  if (typeof value !== 'string' || !/^H(?:0[1-9]|1[0-2])\.S(?:0[1-9]|1[0-2])\.N(?:0[1-9]|1[0-2])$/.test(value) || !Object.hasOwn(nodes, value)) {
    throw new Error('UNKNOWN_OR_NONCANONICAL_NODE');
  }
  return value;
}
export function sourceFragment(nodeId, nodes) {
  assertNodeId(nodeId, nodes);
  return `#node=${nodeId}&source=${SOURCE_PIN}`;
}
export function parseSourceFragment(fragment, nodes) {
  const params = new URLSearchParams(fragment.replace(/^#/, ''));
  const entries = [...params.entries()];
  if (entries.length !== 2 || params.getAll('node').length !== 1 || params.getAll('source').length !== 1 ||
      entries.some(([key]) => key !== 'node' && key !== 'source')) throw new Error('INVALID_SOURCE_LINK');
  if (params.get('source') !== SOURCE_PIN) throw new Error('SOURCE_EDITION_MISMATCH');
  return assertNodeId(params.get('node'), nodes);
}
export function searchSource(nodes, query, {house = '', sphere = '', limit = 40} = {}) {
  if (typeof query !== 'string' || !Number.isSafeInteger(limit) || limit < 1 || limit > 1728) throw new Error('INVALID_SEARCH');
  if (house && !/^H(?:0[1-9]|1[0-2])$/.test(house)) throw new Error('INVALID_HOUSE');
  if (sphere && !/^H(?:0[1-9]|1[0-2])\.S(?:0[1-9]|1[0-2])$/.test(sphere)) throw new Error('INVALID_SPHERE');
  if (house && sphere && !sphere.startsWith(house + '.')) throw new Error('FILTER_CONFLICT');
  const q = query.trim();
  const exactId = /^[hH]\d{2}\.[sS]\d{2}\.[nN]\d{2}$/.test(q) ? assertNodeId(q, nodes) : null;
  const needle = q.toLowerCase();
  const matches = [];
  for (const [nodeId, node] of Object.entries(nodes)) {
    if (exactId && nodeId !== exactId) continue;
    if ((house && !nodeId.startsWith(house + '.')) || (sphere && !nodeId.startsWith(sphere + '.'))) continue;
    const fields = ['name', 'definition', 'includes', 'excludes'].filter(field => q && node[field].toLowerCase().includes(needle));
    let reason, rank;
    if (!q) { reason = 'BROWSE_SELECTION'; rank = 3; }
    else if (q === nodeId) { reason = 'EXACT_CANONICAL_ID'; rank = 0; }
    else if (fields.length) { reason = 'LITERAL_SOURCE_TEXT_MATCH'; rank = fields.includes('name') ? 1 : 2; }
    else continue;
    // A lexical hit in an exclusion is evidence of a mention, not inclusion.
    // Preserve the old reason contract; add an explicit orthogonal scope signal.
    const affirmative = fields.some(field => field !== 'excludes');
    const excluded = fields.includes('excludes');
    const scopeMatch = !q ? 'BROWSE_ONLY' : exactId ? 'IDENTITY_ONLY' :
      excluded ? (affirmative ? 'MIXED_SCOPE_TEXT' : 'EXCLUSION_TEXT_ONLY') : 'AFFIRMATIVE_TEXT_ONLY';
    if (scopeMatch === 'EXCLUSION_TEXT_ONLY') rank = 4;
    matches.push({nodeId, name: node.name, reason, matchedFields: fields, rank, scopeMatch,
      semanticAcceptance: false, stableReturn: sourceFragment(nodeId, nodes)});
  }
  matches.sort((a,b) => a.rank - b.rank || a.nodeId.localeCompare(b.nodeId));
  return {total: matches.length, results: matches.slice(0, limit), truncated: matches.length > limit,
    normalization: 'ECMASCRIPT_UNICODE_LOWERCASE_LITERAL_SUBSTRING', sourceSHA256: SOURCE_PIN,
    graphNeighborsIncluded: false, hostedSearchParityClaimed: false};
}
export function inspectPosition(nodeId, perspectiveId, nodes, spheres, houses) {
  assertNodeId(nodeId, nodes);
  let phase;
  if (Object.hasOwn(spheres, perspectiveId)) phase = 'SPHERE';
  else if (Object.hasOwn(houses, perspectiveId)) phase = 'HOUSE';
  else throw new Error('UNKNOWN_PERSPECTIVE');
  const relation = phase === 'SPHERE' && nodeId.slice(0,7) === perspectiveId ? 'OWN_SPHERE' :
    nodeId.slice(0,3) === perspectiveId.slice(0,3) ? 'OWN_HOUSE' : 'CROSS_HOUSE_RELEVANCE_UNREVIEWED';
  return {phase, perspectiveId, nodeId, relation, structuralStatus: 'SOURCE_IDENTITY_BOUND',
    substantiveReviewStatus: 'PENDING', createsSemanticEdge: false, createsCompletedMacroturn: false};
}
