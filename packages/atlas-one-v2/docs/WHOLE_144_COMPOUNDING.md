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
