# Pointer companion R02 — integration of Atlas Round Two R04

Original owner R04 source in the private Geometry Native Clean Sheet is retained. This is an **adapted additive port**, not an identical blob cherry-pick: it targets PR67's **one existing prepared frame** through `inspectConvergence()` without re-encoding or creating a new retriever. Runtime emits source-pointer metadata only; input locators are opaque and no source bodies or vectors are stored or loaded.

## Exact lineage

- Inherits PR67 geometry-one (`review/atlas-geometry-one-clean-sheet-r38-20261124`, preserved in this branch).
- Uses the new PR65+PR66 peer-convergence review token; any stale root/frame or missing closure causes HOLD.
- Bounded local journal: UPSERT/WITHDRAW, immutable version source IDs, exact source-version predecessor, collision/replay checks, event order, `generation` and catalog digest, and late change/return check.
- Separate mock INFERENCE_USE, DISCLOSE and RETURN phases; **not an authenticated host permission**. A caller-supplied `authorize` callback can self-approve, so output is always `LOCAL_POINTERS_ONLY`, never `releaseAuthorized` or hosted attestation. Pointers and saved origin family declarations do not grant independent corroboration.
- Original 12×12×12 HSN addresses remain intact. Engineering house names `Cxx` remain a separate namespace.

## Tests and failure cases

`node --test programs/atlas-peer-convergence-r01/test/{peer-convergence,pointer-companion}.test.mjs` and with `node --jitless --test` both pass **34/34 distinct tests**. New pointer tests cover exact replay, id collision, fork, stale prior SHA, rebind, withdrawal, returned source drift, disclosure denial and nested mutation during RETURN. They are synthetic/mock source-boundary tests, NOT the full peer-source/host integration. See `evidence/ADAPTER_POINTER_{NORMAL,JITLESS}.log` in the private package.

The private R04 fixture's 83.97% reduction was a comparison of **serialized metadata size** only. It is not a total vector database speed/memory comparison and should not be reported as new work by this integration. No new BGE or scientific-quality benchmark is run in R02.

## Current status

`LOCAL_ADAPTER_TESTED; PUBLIC_PR_DRAFT; PEER_SOURCE_IMPORTED; HOST_BINDING_HOLD; FULL_PEER_SUITE_NOT_RUN`.

**Remaining work:** clean checkout of all peer files + `scripts/replay.sh`, exact current Model 0.3 frame/issuer identity, host permission and final socket byte return, source family/time-disjoint held-out evaluation, and authoritative required-closure selection. PR61/62 remain separate existing systems; no new gateway/registrar.
