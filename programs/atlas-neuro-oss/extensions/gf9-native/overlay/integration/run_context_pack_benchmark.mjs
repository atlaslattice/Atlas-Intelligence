/** Fixed synthetic utility/CPU comparison. No models, corpus or provider calls. */
import {performance} from 'node:perf_hooks';
import {writeFileSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {planFamilyContext} from '../src/context-pack.mjs';
const output = process.argv[2];
if (!output) throw new Error('A new output JSON path is required');
const median = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
function greedy(items, budget, maxItems) {
  let cost = 0, utility = 0; const families = new Set(), selectedIds = [];
  for (const item of [...items].sort((a, b) => b.utility - a.utility || a.id.localeCompare(b.id))) {
    if (families.has(item.familyId) || cost + item.cost > budget || selectedIds.length === maxItems) continue;
    cost += item.cost; utility += item.utility; families.add(item.familyId); selectedIds.push(item.id);
  }
  return {cost, utility, selectedIds};
}
const rows = [];
for (let fixture = 0; fixture < 12; fixture++) {
  const scale = fixture + 1;
  const items = [{id: 'large', familyId: 'A', cost: 6 * scale, utility: 9},
    {id: 'small-b', familyId: 'B', cost: 4 * scale, utility: 8},
    {id: 'small-c', familyId: 'C', cost: 4 * scale, utility: 8},
    {id: 'duplicate-b', familyId: 'B', cost: 3 * scale, utility: 5}];
  const budget = 8 * scale, baseline = greedy(items, budget, 3), candidate = planFamilyContext(items, {budget, maxItems: 3});
  const before = [], after = [];
  for (let warm = 0; warm < 5; warm++) {greedy(items, budget, 3); planFamilyContext(items, {budget, maxItems: 3});}
  for (let pair = 0; pair < 31; pair++) {
    const order = pair % 2 ? ['candidate', 'baseline'] : ['baseline', 'candidate'];
    for (const lane of order) {
      const start = performance.now();
      for (let repeat = 0; repeat < 20; repeat++) lane === 'baseline' ? greedy(items, budget, 3) : planFamilyContext(items, {budget, maxItems: 3});
      (lane === 'baseline' ? before : after).push((performance.now() - start) / 20);
    }
  }
  rows.push({fixture: fixture + 1, items, budget, maxItems: 3,
    baseline, candidate, baselineMs: before, candidateMs: after,
    medianBaselineMs: median(before), medianCandidateMs: median(after),
    candidateSlower: median(after) > median(before)});
}
const source = new URL('../src/context-pack.mjs', import.meta.url);
const receipt = {schema: 'atlas.oss.context-packing-experiment/v1', dataKind: 'SYNTHETIC_UTILITY_FIXTURES',
  sourceSha256: createHash('sha256').update(readFileSync(source)).digest('hex'),
  fixtures: 12, pairsPerFixture: 31, repetitionsPerSample: 20,
  utilityImprovedCases: rows.filter(x => x.candidate.utility > x.baseline.utility).length,
  utilityTiedCases: rows.filter(x => x.candidate.utility === x.baseline.utility).length,
  utilityRegressedCases: rows.filter(x => x.candidate.utility < x.baseline.utility).length,
  slowerCases: rows.filter(x => x.candidateSlower).length, rows,
  limitations: ['Fixtures deliberately expose greedy suboptimality, not representative neural relevance.',
    'Utilities are constructed; no retrieval-quality or token-saving claim.',
    'Candidate includes input validation and exact bounded optimization; baseline is a simple greedy policy.',
    'Timing is a local CPU observation, not an equal-algorithm speedup or serving SLA.'],
  modelCalls: 0, optimizerUpdates: 0};
writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({fixtures: receipt.fixtures, utilityImprovedCases: receipt.utilityImprovedCases,
  slowerCases: receipt.slowerCases, output}));
