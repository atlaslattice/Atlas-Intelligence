import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {Meta145GlyphCircuit} from '../src/meta145-glyph.mjs';
import {CivilizationUnifiedBuild} from '../src/civilization-unified.mjs';
import {Hold} from '../src/index.mjs';

// These integration regressions require the exact owner-authorized Ariadne
// bytes and digest-pinned META145 artifacts. A skipped check is not a pass.
const source = process.env.ATLAS_ARIADNE_ORIGINAL_FILE;
const output = process.env.ATLAS_META145_GLYPH_OUTPUT;
const available = Boolean(source && output && existsSync(source)
  && existsSync(join(output, 'META145_GLYPH_MEMORY.json')));
const ownerTest = available ? test : test.skip;
function inputs() {
  const names = ['node_glyphs_1728.json', 'perspectives_144.json',
    'sphere_reviews_144.json', 'house_syntheses_12.json',
    'house_sphere_followups_1728.jsonl'];
  const manifest = readFileSync(join(output, 'META145_GLYPH_MEMORY.json'));
  return {
    originalAriadneBytes: readFileSync(source), metaBytes: manifest,
    metaManifestBytes: manifest,
    artifactBytes: Object.fromEntries(names.map(n => [n, readFileSync(join(output, n))])),
    memoryPolicy: JSON.parse(readFileSync(join(output, 'functional_memory_replay.json'), 'utf8')),
  };
}

for (const field of ['homeNodes', 'anchorTerms', 'candidateNodeRefs']) {
  ownerTest(`META145 ${field} review is a detached source snapshot`, () => {
    const engine = new Meta145GlyphCircuit(inputs());
    const expected = structuredClone(engine.sphereReview('H01.S01'));
    const result = engine.sphereReview('H01.S01');
    result[field].push('consumer-local annotation');
    assert.deepEqual(engine.sphereReview('H01.S01'), expected);
  });
}

ownerTest('META145 House digest list cannot alter later source reviews', () => {
  const engine = new Meta145GlyphCircuit(inputs());
  const expected = structuredClone(engine.houseReview('H01'));
  engine.houseReview('H01').sourcePerspectiveDigests[0] = '0'.repeat(64);
  assert.deepEqual(engine.houseReview('H01'), expected);
});

ownerTest('META145 validates and retains its own memory-policy snapshot', () => {
  const config = inputs();
  const engine = new Meta145GlyphCircuit(config);
  const expected = structuredClone(engine.functionalMemory());
  config.memoryPolicy.selected = 'UNVERIFIED_REPLACEMENT';
  config.memoryPolicy.sourceInputDigest = '0'.repeat(64);
  config.memoryPolicy.evidenceEventIds.push('unverified-event');
  assert.deepEqual(engine.functionalMemory(), expected);
});

ownerTest('META145 memory projection cannot append to retained evidence', () => {
  const engine = new Meta145GlyphCircuit(inputs());
  const expected = structuredClone(engine.functionalMemory());
  engine.functionalMemory().evidenceEventIds.push('consumer-local annotation');
  assert.deepEqual(engine.functionalMemory(), expected);
});

for (const field of ['homeNodes', 'anchorTerms']) {
  ownerTest(`Civilization ${field} cannot mutate pinned Sphere state`, () => {
    const engine = new CivilizationUnifiedBuild(inputs());
    const expected = structuredClone(engine.sphere('H01.S01'));
    const result = engine.sphere('H01.S01');
    result[field][0] = 'consumer-local annotation';
    assert.deepEqual(engine.sphere('H01.S01'), expected);
  });
}

ownerTest('editing a Civilization build result cannot change a fresh build', () => {
  const engine = new CivilizationUnifiedBuild(inputs());
  const expected = structuredClone(engine.build());
  const result = engine.build();
  result.sphereExecutions[0].homeNodes.pop();
  result.sphereExecutions[0].anchorTerms.push('consumer-local annotation');
  result.metaBuild.functionalMemory.evidenceEventIds.push('unverified-event');
  assert.deepEqual(engine.build(), expected);
});

ownerTest('META145 rejects evidence identifiers backed by shared mutable memory', () => {
  const config = inputs();
  const shared = new Uint8Array(new SharedArrayBuffer(1));
  shared[0] = 1;
  config.memoryPolicy.evidenceEventIds = [shared];
  assert.throws(() => new Meta145GlyphCircuit(config),
    error => error instanceof Hold && error.code === 'MEMORY_EVIDENCE_IDS_INVALID');
});

ownerTest('META145 evidence identifiers require a dense ordinary string array', () => {
  const extra = ['valid-event'];
  extra.unexpected = new Uint8Array(new SharedArrayBuffer(1));
  for (const identifiers of [new Array(1), [1], [{}], new Uint8Array([1]), extra]) {
    const config = inputs();
    config.memoryPolicy.evidenceEventIds = identifiers;
    assert.throws(() => new Meta145GlyphCircuit(config),
      error => error instanceof Hold && error.code === 'MEMORY_EVIDENCE_IDS_INVALID');
  }
});

ownerTest('META145 keeps valid JSON identifiers and absent-evidence compatibility', () => {
  const config = inputs();
  config.memoryPolicy.evidenceEventIds = ['event-one', 'event-two'];
  assert.deepEqual(new Meta145GlyphCircuit(config).functionalMemory().evidenceEventIds,
    ['event-one', 'event-two']);
  delete config.memoryPolicy.evidenceEventIds;
  assert.deepEqual(new Meta145GlyphCircuit(config).functionalMemory().evidenceEventIds, []);
});

ownerTest('META145 policy accessors fail without being executed', () => {
  const config = inputs();
  let calls = 0;
  Object.defineProperty(config.memoryPolicy, 'selected', {
    enumerable: true,
    get() { calls++; return 'POSTINGS_INDEX'; },
  });
  assert.throws(() => new Meta145GlyphCircuit(config),
    error => error instanceof Hold && error.code === 'MEMORY_SCOPE_INVALID');
  assert.equal(calls, 0);
});

ownerTest('Civilization ignores unused memory getters before reparsing source artifacts', () => {
  const config = inputs();
  const before = new CivilizationUnifiedBuild(config).sphere('H01.S01');
  let calls = 0;
  Object.defineProperty(config.memoryPolicy, 'unusedCallerMetadata', {
    enumerable: true,
    get() {
      calls++;
      const profiles = JSON.parse(config.artifactBytes['perspectives_144.json']);
      profiles[0].anchorTerms = ['UNVERIFIED_GETTER_MUTATION'];
      config.artifactBytes['perspectives_144.json'] = Buffer.from(JSON.stringify(profiles));
      return 'ignored annotation';
    },
  });
  const engine = new CivilizationUnifiedBuild(config);
  assert.equal(calls, 0);
  assert.deepEqual(engine.sphere('H01.S01'), before);
});

ownerTest('META145 does not inspect behavior-bearing policy proxies', () => {
  const config = inputs();
  let calls = 0;
  config.memoryPolicy = new Proxy(config.memoryPolicy, {
    get(target, key) { calls++; return Reflect.get(target, key); },
    getOwnPropertyDescriptor(target, key) {
      calls++; return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  assert.throws(() => new Meta145GlyphCircuit(config),
    error => error instanceof Hold && error.code === 'MEMORY_SCOPE_INVALID');
  assert.equal(calls, 0);
});
