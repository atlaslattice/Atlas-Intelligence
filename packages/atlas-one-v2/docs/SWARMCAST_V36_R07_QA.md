# SWARMCAST v36 / R07 Work review QA — source-only patch

**Status:** Local verified candidate. Not deployed to SwarmChat v36. The user-facing `/work/r07` route was not accessible via the available public webpage fetcher, and the signed-in browser extension was not connected. An authenticated, account-scoped SwarmChat Work backend was exercised read-only instead.

## Observed Work backend

- Morrowmoth's stored Work return at R07 Ariadne `H01.S07.N12` (opportunity 84) is visible through the authorized broker. The Work review preview lists its original source sequence and declares `DECLARED_NOT_REPRODUCED_BY_THIS_TOOL`; Graph Fabric traces the parent and related Work messages.
- `swarm_open_whiteboard` on an existing account-authorized Work card succeeds. The same selected card, read twice, keeps its `reviewId`, item tip, normalized projection hash, document hash and source-record hash but changes `receipt.bindingSha256` and captured timestamp. Treat binding as **per-read**, not stable revision identity.
- Empty selections are rejected by the native tool's input schema; a stale/nonexistent selection returns opaque `whiteboard_unavailable`. The UI helper avoids making an empty host call and maps stale/unavailable to a non-disclosing retry state.
- Public entrance HTML was accessible; the `/work/r07` private page and exact served v36 bundle, signed-in WebGL/3D and phone/browser UI were **not** inspected. No production host IAM or rollback evidence.

## New code

`src/r07-review-qa.mjs` is an original, read-only and dependency-free Node 22 QA module:

1. `normalizeSelection` gives a useful empty-selection state before calling the Workboard tool.
2. `inspectProjection` and `compareReviewReads` distinguish unchanged source revisions, changed per-read bindings, unrelated room capture changes, host-build drift, actual source changes and unavailable responses. SHA/record metadata are **host-reported**, not independently authenticated or authorized. No Work message bodies are returned.
3. `inspectR07Handoff` reconciles exact room/sequence/request identity across a Work summary, graph trace and Ariadne v0.7 node identity. It cannot independently validate a claimed scientific result.
4. `verifyQuantumBaseline` computes a classical 4×4 real density-matrix reference with exactly 32 trace terms for each of Bell Φ+, dephased mixture and Bell Φ−. Results: ZZ=+1 for all; XX=+1/0/−1. Rejects empty case selection, duplicate case, unknown state and unequal operation budget.
5. `benchmarkClassicalReference` measures local Node wall time and a noisy heap delta, **not** served host latency, quantum speedup or a comparison against the exact original runner.

## Reproduce

```bash
node --version             # tested 22.16.0
node --test test/r07-review-qa.test.mjs
node --jitless --test test/r07-review-qa.test.mjs
python3 test/independent_reference.py
node bench.mjs
```

No database, network, OpenAI API, subscriptions, model calls or Work messages are produced by these scripts. This code is an optional Atlas ONE v2 testing adapter; it is not a second SwarmChat broker or authority layer.

## Publisher acceptance still needed

- Current served v36 source SHA, signed-in `/work/r07` R07 Workboard UI, browser/mobile path.
- Genuine current account principal / two-tenant access check, Work READ then atomic RETURN/revocation, room expiry, stale result handling, transport retry and outage recovery; this module only models those failures locally.
- Stable source-revision deep link must be tied to exact room+item+origin and revalidated at host use, not trusted solely because two hashes match.
- Independent benchmark against exact R07 runner commit under matched measurement hardware, input, operation count and warmup.
- Merge/deployment approval separate from this source-only PR; no CANON change.
