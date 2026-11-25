# R13 strict issued-frame capture — additive peer patch

**Parent:** DRAFT PR74 head `14ced1b2e3184f9074eee40844cce1f78f7a2641`. This branch changes only the local source-only R34/R35 issued-result adapters; the PR70/71/72/73/74 original revisions remain retained in Git history. No new model, retriever, publisher, issuer, source-body store, scheduler, CANON or trusted host egress.

## Reproduced original defect (exact upstream blobs)

- Original R34 `issued-page-r34.mjs` Git blob `ed74e4aa08546074b9b338d711b80fb1b06738bf` and R35 `dual-issued-geometry.mjs` Git blob `0c08d13a679a5a7d411d6c57e87b7a5477408169` were independently recovered from PR74 and Git hashes checked before running.
- An exact-prototype `Float64Array(1728).fill(1)` with an own `Symbol.iterator` yielding 42 passed both original APIs; they emitted scores 42 despite underlying values 1. This is a **TESTED_LOCAL** source-integrity failure, not a hosted incident.
- R34 also applied `RegExp.test` to caller-supplied metadata without first requiring primitive strings. R35's original metadata grammar allowed `/` or `@` that R34's narrower grammar rejected later. Do not silently widen the accepted source edition or map it to Ariadne ontology edition.

## Narrow repair

1. `strict-issued-capture.mjs`: inspect only native Float32Array/Float64Array intrinsic data slots; reject own iterator, buffer/length/byteOffset overlays, Proxy, subclass, SharedArrayBuffer/resizable/detached memory, extra fields, nonfinite values or wrong 1,728 shape. Extract each canonical numeric indexed descriptor, then snapshot into a fresh native array, preserving signed zero and separate binary f32BE/f64BE formats.
2. R34 accepts primitive-string metadata only, then uses the strict snapshot rather than `Array.from(untrustedTypedArray)`.
3. R35 validates the exact original R34-friendly primitive grammar and native typed score snapshot before producing **both unchanged PR66 and PR67 issued-page schema shapes**. Safely validates the optional `expectedBinding` descriptor without invoking a getter.
4. The existing Ω6 `omega6-one-issued-union` implementation is **untouched**; six new source tests verify that malicious scores/metadata return HOLD before the peer union completes.
5. Exact 12×12×12 original Ariadne HSN coordinates and role split, separate ontology/evidence editions, Yijing X3/X4 namespace boundaries, source-pointer history and historical score frame APIs remain unchanged.

## Local execution (not CI)

Run `node --test programs/atlas-peer-convergence-r01/test/*.test.mjs`, then repeat with `node --jitless --test ...`.

A focused, independently extracted **201/201 distinct Node tests pass** normally and **201/201** JIT-disabled. Included: 35 new strict cases, six additional Ω6 peer tests, existing Ω5/Ω6, and 95 preserved R12 Geometree/Yijing/Work-pointer tests. Separate owner-private original Ariadne registry tests pass 7/7; the v0.7 raw registry is **NOT included in public Git**. No additional model calls or actual scheduled MacroTurns were made; 144 Sphere loops test structural cases, not 144 executed specialist algorithms.

## Release blockers, preserved

`releaseAuthorized=false`, `issuerAuthenticated=false`, `hostEgressAttested=false`: the host still must provide an authenticated and independently complete required-set manifest, actual current source READ/INFERENCE_USE/RETURN and atomic final egress, including cross-writer same-bytes ABA revocation. Current Model0.3 true selected head, signed issuer and semantic heldout relevance have not been executed in this R13 repair. Distinguish E145 symbolic/cymatic display from accepted knowledge or physical measurement. Preserve peer PR #75 319-file union as a **separate** draft; do not force-merge it or conflict with the existing scheduler/MT1728 ledger. CI remains unverified unless a real hosted run executes.
