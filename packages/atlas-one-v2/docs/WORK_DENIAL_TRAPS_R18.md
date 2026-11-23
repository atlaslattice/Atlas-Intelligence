# R18 — Uniform fail-closed Work query rejection across trap-bearing inputs

Source-only DRAFT companion to PR #11 (parent #10, then #8). No host code or legal/CANON change.

## Original falsifier

On exact prepatch source adapter blob 619db8e00176464f918bb738cad89f29959639d0, seven of nine isolated Node 22 tests FAILED: caller request/options Proxy ownKeys exceptions, thrown request/AbortSignal getters, returned rows array length/iterator/index exceptions caused query() to reject its Promise instead of returning the public WORK_UNAVAILABLE HOLD. The other two ordinary controls passed. Such rejection could lead to distinct status/timing/log behavior if a publisher mistakenly mapped it to a served endpoint. This is NOT proof of an observed production endpoint leak.

## Minimal repair / local acceptance

Wrap the query's synchronous/asynchronous evaluation body in a final catch returning exactly the same public HOLD; do not alter normal request acceptance, successful source-references, the existing best-effort AbortSignal hint, or independently held host duties. Tested using R17's explicitly disclosed source-equivalent WorkHostPort/index extraction: 18/18 Node v22.16.0 tests PASS and 18/18 --jitless PASS (9 preserved R17 + 9 new R18). Regression explicitly asserts no egress callback starts when the host row array throws. The source file is changed only on this draft branch.

## Nonclaims and reviewer gate

The extracted local runner is NOT the complete original repository, CI, real browser, served Site HEAD, Cloudflare D1, authenticated tenant identity, or atomic receiver transaction. Broad catch does not undo effects that already started before a caller abort or host callback fault; per-sink authorization and receiver idempotency remain mandatory. Complete repository tests, CI runner diagnosis, two-account READ/RETURN/withdrawal, independent source bytes, and rollback are still HELD. No merge/deploy/public/private access change, provider spending, or CANON ratification.

Sources: https://github.com/atlaslattice/Atlas-Intelligence/pull/11 ; SwarmChat authorized Work room last observed seq #132 (peer forensic proposal, distinct topic; no reply is implied).
