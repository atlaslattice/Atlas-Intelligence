# Atlas Whole 144 — cross-House compounding, review ledgers and voluntary specialties

**ADDENDUM, DRAFT · LOCAL TESTS ONLY · NOT A HOST-SIDE IMPLEMENTATION**

The `whole-144-compounding.mjs` module is a pure, bounded, source-only extension to the existing Atlas ONE v2 research core. It introduces **three research interfaces** rather than another resident executor or control plane:

1. `proposeCompoundingGraph`: connect two of the 144 explicit Work candidates with a typed `SUPPORTS`, `CHALLENGES`, `METHOD_TRANSFER` or `REQUIRES` hypothesis. The caller supplies Work-only source references and can preserve objections. Circular `REQUIRES` dependencies are held. Symmetric or cyclic hypotheses may coexist but never prove semantic equivalence, cross-House correctness or benefit. Deterministic graph digests permit independent diffing.
2. `prepareNodeReviewLedger`: reconcile submitted source/test-digest candidate packets across at most 1,728 unique HSN addresses. Prevent duplicate or cross-position credits, reject source bodies or private-mode claims, keep 12 independent House totals. Every candidate remains `independentReview: NOT_PERFORMED` and `verifiedGain: false`.
3. `proposeResidentSpecialty`: allow a self-declared, explicitly opt-in Work nomination to one House, Sphere or Node address with source references, an originality argument and a falsifier. A public message count is *never* a merit proxy; unknown residence, identity, permission, CANON authority and source-semantic match are all held. No automatic role, node tenancy, access grant or legitimacy claim occurs. The private Brain/Palace cannot be scanned or represented through this API.

## What the graph does not assert

The original Ariadne v0.7 `Hxx.Sxx.Nxx` bytes are not included. Therefore these links connect **Work planning positions**, not proven edges of the source ontology. The twelve synthetic example edges are **test fixtures**, not a curated research graph. Every claimed original mapping requires exact source bytes/digests, independent semantic review, and any needed consent. Reused glyph labels do not establish semantic equality; no house or node receives normative force.

## Acceptance test and actual receipts

```sh
node --test test/whole-144.test.mjs test/whole-144-compounding.test.mjs
node --jitless --test test/whole-144.test.mjs test/whole-144-compounding.test.mjs
node examples/whole-144-structure.mjs
node examples/whole-144-compounding.mjs
```

The isolated fixture environment uses the same explicit **test-only stub of two House/source constants** as the original 144 structural tests; this is not a test of GitHub Action/production. The proposed PR references the genuine parent source, not the stub. The synthetic example has twelve relationship hypotheses, zero verified gains and zero assignments. A real host must still independently attest identity, consent, READ/RETURN, revocation, exact source edition, review and deployment before any operational effects.

## Next eligible improvements

- Link one genuine, source-verified issue to a specific task ID, build a minimal code patch, reproduce a falsifier and only then apply a review packet to the ledger.
- Inspect exact Ariadne semantics under authorized source rights; correct provisional mappings without public disclosure of protected registry content.
- Create an offline two-account host-rights harness (with deny-at-return) before proposing live SwarmChat notifications or resident assignments.
- Preserve dissent, community governance, open-ended play and non-work boundaries separately from Work telemetry. The goal is **substantive, original contributions**, not volume or imaginary statistics.


## Additive exact-source candidate ingress (2026-11-23 review)

`proposeSourceBoundCandidateGraph(program, referenceIndex, input)` adds a source-bound review boundary to this existing module. The three earlier APIs and their accepted fields remain unchanged.

The independently supplied `referenceIndex` contains `namespace`, `edition`, `registrySha256`, and at most 1,728 `records`. Each record has exactly the six identity fields `namespace`, `edition`, `nodeId`, `recordSha256`, `kind`, and `registrySha256`, plus an optional descriptive `label`. The program edition and registry digest must agree with the reference index. Namespace is a normalized ASCII identifier, such as `ariadne.hsn`; it is not inferred from a label. Matching these caller-supplied pins does not authenticate original registry bytes or rights.

`input` is inert ordinary data with:

- `mode: WORK`;
- `bindings: [{candidateId, node}]`, where `node` is the exact six-field identity tuple and `candidateId` remains the existing `W144-Hxx-Sxx` planning ID;
- optional `links: [{from, to, relation, sourceRefs, dissentRefs, rationale}]`, where both endpoints are complete identity tuples already selected by the bindings;
- optional `projectReviewContext`: `GENERAL_WORK_REVIEW` or `IRON_EMPIRE_FICTION`.

The accepted link relations are only `LEXICAL_CANDIDATE` and `REVIEW_CANDIDATE`. The ingress never converts lexical proximity into `SAME_AS`, `REQUIRES`, a legacy planning dependency, or authority. Repeated labels cannot merge nodes, and labels are omitted from output. Candidate IDs continue to mean planning positions with `sourceSemanticMatch: UNMAPPED`; matching a position is not semantic adoption. Ariadne v0.7 kind checks use the original Sphere axis: S01–S07 are DOMAIN_SPECIALIZATION, S08–S12 are EPISTEMIC_META, independent of node number.

`IRON_EMPIRE_FICTION` is an explicit project-review provenance marker. It leaves Ariadne node kind unchanged, returns `evidenceModality: FICTION_REVIEW`, and always returns `scientificEndorsement: false`. It does not ingest private Imagine/Dream/Palace content or turn fictional mechanics into a scientific result. Reference-index labels are caller-authorized source metadata only; source bodies and private-mode fields are rejected by the input shape.

The output remains `SOURCE_BOUND_CANDIDATE_ONLY`, with zero verified gains, semantic equivalences or resident assignments; no publication, host, CANON or rights effect. Nested identity, link, source-reference and dissent arrays are frozen. Exact identity checks, deterministic digests and frozen data do not replace independent source authenticity, consent, semantic review or trusted host READ/RETURN.

### Executed verification for this additive change

The original 66 Whole144 and compounding tests were independently rerun against exact fetched `civilizational-contract.mjs` and catalogue dependencies, without the earlier constants stub: 66/66 PASS in Node normal and `--jitless`. The new suite adds 29 cases: 13 same-label identities, all six endpoint substitutions, wrong edition/registry/kind, missing/duplicate bindings, unknown/private/authority fields, accessors and custom iterators, candidate-only links, explicit fiction provenance, source mutation resistance and legacy compatibility. Combined: 95/95 PASS normally and 95/95 PASS under `--jitless` (Node v24.22.3). These are scoped local module tests, not full-repository CI or live host validation.

```sh
node --test test/whole-144.test.mjs test/whole-144-compounding.test.mjs test/whole-144-source-bound.test.mjs
node --jitless --test test/whole-144.test.mjs test/whole-144-compounding.test.mjs test/whole-144-source-bound.test.mjs
```

Committed test records are explicitly synthetic; the private original ontology and Iron Empire project source bodies are not included. A separate authorized integration can supply the genuine pinned source index and retain its independent byte-verification receipt without changing this review boundary into a trusted signer or scheduler.
# Original-source integration check

An owner-private, exact-byte Ariadne v0.7 integration exercised all 1,728 source
bindings and twelve explicitly unreviewed lexical links through this API.
Eight real-source negative controls rejected edition, digest, role, planning-slot,
private-mode, relation and authority substitutions. The caller verified original
registry bytes separately; the callee continues to state that it only compares
supplied source pins.

The causal-inference regression preserves thirteen source identities. In the raw
registry, one title is unqualified and twelve META titles carry their House
prefix. A derived topic facet may remove that exact prefix for discovery, while
full titles and coordinate identities remain intact. It is not a semantic join.
Private registry bytes and project-fiction bodies are not embedded in this code.

## Bounded source-bound batch review

`proposeSourceBoundCandidateBatch(program, referenceIndex, inputs)` is an additive
synchronous entry point for up to 144 ordered requests. Each request uses the
same shape as `proposeSourceBoundCandidateGraph`; the original single-request
API remains available. The batch accepts at most 1,728 bindings and 6,912 links
across its requests. It rejects an empty, sparse, oversized or augmented request
array, and rejects an aggregate over budget without truncating any request.

The batch validates the program and all supplied source records once, copies
the program's allowed positions and source pins, and shares those detached
values only inside that invocation. Every request, six-field endpoint, typed
link, reference and dissent is still checked. There is no persistent cache,
caller-provided prevalidated state, authenticated catalog, or new permission.
The next invocation validates the current inputs again. As with the existing
single API, callers must supply inert ordinary data; this is not a Proxy sandbox.
The batch additionally requires primitive-string program digest, source edition
and source digest fields. Boxed strings are rejected even when frozen, so the
copied receipt metadata cannot retain those caller-owned objects.

Results retain input order. Each entry of `results` is the exact graph or HOLD
returned for that request by the single API on the same valid shared source.
`SOURCE_BOUND_BATCH_CANDIDATE_ONLY` means no request was held;
`SOURCE_BOUND_BATCH_WITH_HOLDS` explicitly exposes one or more held requests.
`candidateGraphCount` and `heldRequestCount` describe those results. A malformed
shared program or index holds the entire batch with the existing validation
reason. A bad request is never dropped or represented by a neighboring graph.
The envelope and all returned nested data are frozen and detached from the
caller. The ordered envelope has a deterministic `batchDigest`.

This removes repeated source-index validation when reviewing 144 groups of
twelve bindings. A single private graph implementation serves both APIs. The
single-request path retains its original preparation, exact six-field matching,
sorting and digest algorithm; only the batch's private call can supply its
detached context. A public extra argument cannot bypass fresh validation. The new
API does not batch the original-byte scope matcher, alter its 128-node cap,
or imply that caller-supplied reference pins authenticate original bytes.

The batch retains zero verified gains, scientific endorsements, semantic
equivalences, assignments, publication, rights, hosted or CANON effects. The
144 requests are review inputs, not 144 implemented evolutions or peer returns.

```js
const review = proposeSourceBoundCandidateBatch(program, referenceIndex, inputs);
// Inspect review.status, heldRequestCount and every ordered result before use.
// Keep existing source authenticity, consent and host handoff gates in place.
```

Synthetic tests cover the complete 144-by-12 workload, full 1,728-node input,
all six pin substitutions, request ordering, a bad middle request, shared
scope failures, private modes, forged cache/authority fields, collection and
aggregate bounds, revalidation between calls and detached immutable outputs.
They are local checks and do not claim hosted or production performance.

```sh
node --test test/whole-144*.test.mjs
node --jitless --test test/whole-144*.test.mjs
```

