# Atlas Indra Peer Convergence R03 — source-linked integration, not release

**Status:** DRAFT_SOURCE_CHERRY_PICKED / TESTED_LOCAL_R03 / HOST_EGRESS_HOLD.

This change is one incremental follow-up to draft [PR #70](https://github.com/atlaslattice/Atlas-Intelligence/pull/70), not another gateway, model, program or operating state. The existing selected Model 0.3 remains the reference system. The user's canonical **original Ariadne Hxx.Sxx.Nxx** is the only primary knowledge identity; the exact original registry is distinguished from a separately versioned evidence-source identity.

## Literal current public peer imports

| Peer | Base | Source preserved | Selection |
| --- | --- | --- | --- |
| PR #67 | Geometry ONE | 16 original parent files, unchanged | structural 12/144/1728 plus 12 views |
| PR #65 | Required closure | Six source/test/doc files, Git blobs unchanged | review-only metadata gate; no authority |
| PR #66 | Geometry cleanroom | 23 source/test/negative files, Git blobs unchanged | stable top-K, four-band/oracle alternatives |
| PR #68 | Indra R34 | Six original files, with peer-local source aliases | separate alternative, NOT silently selected |
| PR #69 | Omega4 | Three source/doc/test files, direct peer review | optional independent objection visibility |
| PR #71 | Geometree Yijing R10 | Four original files, Git blobs unchanged | two explicitly versioned symbolic views |

The PR #68 review includes duplicates of existing PR #65/67 source under `peer_closure` and `peer_r38`, retained for *exact historical replay*, not loaded as another authoritative runtime. Keep separate editions and refactor **only after** direct functional compatibility and source-use review.

## Original authored R03 code

* `frame-byte-witness.mjs`: strict own-data validation of source, issuer, model, selected head, original registry, principal, tenant, rights epoch, request and required-set claim. Separate SHA-256 domain hashes for 384-D embedding, all 1,728 scores, canonical ordered HSN, scope and the full binary frame. IEEE754 little-endian encoding preserves signed zero and subnormals; f32 only accepts exact f32 values. No extra encoder call or host permission.
* `guardPointerIncarnations` in the same module: prevents silently reusing a withdrawn pointer's logical ID in this local process. Source revisions/withdrawals remain append-only in the existing R02 journal. **The tombstone guard is local/in-memory: NOT a durable multi-writer or D1 recovery solution.**
* `one-frame-r03.mjs`: original synthetic PR70 review + the byte witness must both agree on the exact original frame; no selected model update or response authorization.
* `pinned-one-frame-r03.mjs`: static peer binding to the real original PR65/66/67 source. Caller cannot substitute fake peer validators through this entry. The exact peer suites must still run together in the actual GitHub checkout.

## Measured, attributed testing

* 34 original PR70 R02 focused tests, **PASS** in each Node mode.
* 38 recovered **exact PR #71 Git-blobs** Yijing unit tests, **PASS** in each Node mode against a locally rewritten *PR67-compatible address API*. The 9 original PR71 integration tests requiring full PR67 Fabric have **NOT RUN** locally.
* 37 original R03 byte/witness/withdrawal tests, **PASS** in each Node mode.
* 14 original R03 one-frame composite tests, **PASS** in each Node mode using test validators (not the real PR65/66 closures).
* 13 PR69 *older Library test-edition* tests passed against the **exact new PR69 source blob** after one local import-path-only adjustment. That old test SHA does **not** match current PR69 Git tests and must not be counted as their execution.
* Together **136 distinct local checks** pass per mode. This is **not** equivalent to a complete PR65/66/67/68/69/70/71 full Git checkout test; CI/whole-system and actual host egress are still unverified.

A useful negative found by peers #435/#437/#439: the two reversible 8×8×27 symbolic mappings differ for **1720/1728** HSNs. Current PR71 handles both with explicit codec/namespace/topology tags. Bare symbolic codes cannot be used as primary keys or decoded across editions. Current source evidence shows 84 DOMAIN and 60 METHOD Spheres (1008/720 nodes), not a Node-ordinal role guess.

Additional negative from peers #438/#433: `JSON.stringify` erases signed-zero differences. The binary witness therefore distinguishes two otherwise identical visible top-k arrays. A raw 1,728-score issuer frame must be supplied and bound explicitly; PR66 top-k alone is insufficient. A self-declared digest or permission boolean never authenticates the host.

## Reproduction

In the *full draft PR #70 checkout* with peer modules present:

```
node --test programs/required-closure/test/*.test.mjs programs/geometry-cleanroom-r0/test/*.test.mjs programs/atlas-geometry-one-r38/test/*.test.mjs programs/atlas-peer-convergence-r01/test/*.test.mjs
node --jitless --test programs/required-closure/test/*.test.mjs programs/geometry-cleanroom-r0/test/*.test.mjs programs/atlas-geometry-one-r38/test/*.test.mjs programs/atlas-peer-convergence-r01/test/*.test.mjs
```

Local independent R03 replay uses the included exact PR71 source/tests, original R02 authored source and a narrow PR67-compatible address shim. It cannot prove full PR67/61/62 live compatibility. Original source may only be adopted with author/license compliance and explicit host rights.

## Open exact checks

1. Test the entire PR #70 source tree, exact source hashes and GitHub CI; retain failures.
2. Verify all **384 actual selected Model 0.3 embedding** values and **1,728 raw score** values from **one** original issuer, with selected-head/policy and source identity independently anchored. No second encoder/head.
3. Host-controlled current READ / INFERENCE_USE / DISCLOSE / RETURN and atomic final byte-egress, including source withdraw, restart and source pointer incarnation; mock hooks do not suffice.
4. Verify all required negative receipts, dependencies, dissent and purpose rights through an independent pinned closure manifest.
5. Held-out family/subfield/time-separated human relevance quality and matched flat/shuffled/geometric resource costs; preserve inconclusive or losing geometry results while retaining 12³ architectural identity.
6. No automatic merge into `main`, deployment, private Play/Social/Brain/Palace import, paid provider call, CANON ratification, resident wake or synthetic MacroTurn credit.

**Historical peer source is copied byte-for-byte; additions remain reversible.**
