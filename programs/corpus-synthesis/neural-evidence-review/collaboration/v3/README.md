# Atlas collaboration rule-rewrite v3 — source-only comparison gate

**SOURCE-ONLY / locally tested / NOT HOSTED / NOT RATIFIED / NOT ADOPTED.**

This is an **additive original module** for reviewing proposed changes to the existing Atlas Whole Macroturn engineering procedure. It does not implement a SwarmChat broker, neural gateway, model retriever, training system, AI resident, human authority, CANON, or scheduler. It imports the existing v2 proposal preparer without modifying that code.

The working design is: **A** = unchanged v2 proposal and current source pins; **B** = a paired, fail-closed rule-diff evaluator; **C** = one reversible Work review candidate with genuine before/after controls, dissent and cost. One genuine visit may contain many local code/test operations. Counts of checks, generated rows, scheduled opportunities, messages and synthetic experiments are **not** independently executed Macroturns.

## Files and quick start

Within the `collaboration/` folder:

```sh
node --test test/work-review-contract.test.mjs
node --test v3/test/rule-revision-gate.test.mjs
node --jitless --test v3/test/rule-revision-gate.test.mjs
node v3/examples/preview.mjs
node v3/examples/benchmark.mjs
```

`v3/fixtures/build-sample.mjs` reproduces the synthetic sample review input exactly. `v3/fixtures/sample-review.json` contains invented test fixtures only; it is **not a stored room transcript or actual permission receipt**. Use versioned test-harness inputs; do not ingest Play, Social, Imagine, Dream, Quiet, Brain or Palace content.

## What the original v2 review helper could prepare

The exact retained original `src/work-review-contract.mjs` Git blob is `d1ec1e99167bc94a87b03913971e3bacde41164e`. Its original 35 regression tests still pass. These two local metadata controls show a review-only gap, **not** an observed hosted broker exploit:

* V2 accepts `room.status='open'` when `room.expiresAt` predates the observation time because it validates timestamp syntax but not time ordering. V3 explicitly HOLDS if observed time is at or beyond expiry. **The observedAt value is caller-supplied and not host-attested**; broker remains final authority.
* V2 accepts an HTTPS source URL containing `https://user:password@...` and copies it into returned review metadata. V3 rejects userinfo and known credential query parameter names, even though it emits no source body. Never put credentials in source references.

## Twelve invariant families

Each family requires at least one positive and one negative case, distinct case IDs and pinned metadata: source integrity; inference use; disclosure return; revocation; private/non-Work boundaries; HSN identity; same-House DOMAIN subjects for METHOD nodes; dissent retention; test reproducibility; rollback; authority; and resource budget. A previously passing safety case turning FAIL **or HOLD** is a regression, not a proposed improvement. All outcomes originate from a local caller, so a review candidate **does not certify that tests really ran**. An independently authenticated host must verify evidence before operational acceptance.

A revision also needs a source-code baseline/candidate digest, non-empty dissent ledger, documented workload/environment pins, at least seven paired latency samples with exact output hashes and a declared p95 regression budget. A test case marked synthetic does not become a measured performance gain. A new red-to-green case is necessary; improved test counts or changed identifiers alone confer no promotion.

## Actual current-turn evidence

* 35/35 inherited Node tests PASS normal and `--jitless`.
* 40/40 new Node tests PASS normal and `--jitless`. One test contains 2,048 malformed source-digest probes, so these are **not 2,048 model visits**.
* Initial candidate audit test had 39 PASS/1 FAIL: a candidate safety HOLD after baseline PASS should be `REJECT_LOCAL_REGRESSION`, not `HOLD_UNRESOLVED_CONTROLS`. Its expectation was corrected; code retained a strict rejection. Original failure log preserved separately.
* Exact local Node v22 benchmark on one synthetic 24-case/12-family review fixture, 9 paired batches × 300 invocations: median v2 metadata preparation 21.50 µs, median v3 rule audit 340.75 µs, p95 25.99 and 399.19 µs respectively. **Different work is being performed**; v3 incurs additional offline review overhead. No serving-latency, model-quality or end-to-end gain is claimed.
* Local output reports one synthetic red-to-green case, zero reported safety regressions, one open dissent and `LOCAL_REVIEW_CANDIDATE_ONLY`; no actual host permission, model training, CANON or deployment.

## Release and collaboration gates

Review exact source and failure receipts against the existing MICA workshop, Omega's frozen core, and MICA's pinned pretrained-entry subset. Keep v3 offline and off the serving hot path. Peer reviewers can attack its score drift, data-only input assumptions, declared source-digest trust, duplicate-key JSON input risk, callback rights and URL handling. **No proposal changes actual host permissions**. Promotion to project rules requires human review; constitutional ratification and production release remain independent.

Original ontology: Ariadne v0.7 SHA256 `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`. Enumerated one-based 12×12×12 identities are structural, not semantic equivalences. Test application H05.S11.N04 (agent experience methodology) to H05.S06.N12 (research software engineering subject) is an editorial scoping example.

Source and peer provenance: https://github.com/atlaslattice/Atlas-Intelligence/pull/58 ; Owner-private SwarmChat Work contribution #166 (link retained in private handoff, not embedded as a public room identifier). No private room bodies are distributed by this bundle.
