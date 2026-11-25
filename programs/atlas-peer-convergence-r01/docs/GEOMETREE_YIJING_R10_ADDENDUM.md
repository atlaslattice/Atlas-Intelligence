# Atlas Geometree R10 — Yijing/GF7/MacroTurn additive integration for PR70

**Stage:** TESTED_LOCAL / DRAFT_REVIEW. **Not:** CI-verified, merged, hosted, trained, authorized source egress, semantic crosswalk, calibrated acoustic measurement or completed MacroTurns.

## Architectural dependency

This is an **additive** sidecar to existing draft PR70 (`programs/atlas-peer-convergence-r01`), based on PR67's original `createGeometryOne` and PR65/66 review-only source modules. It does **not** create a second encoder, head, retriever, broker, source-authority issuer, Work scheduler, CANON interpreter or model. `inspectIssuedYijing` accepts the output of the **already-issued** `createGeometryOne.inspect()` and returns symbolic/analytic annotations. It never invokes a model or a Work publisher.

Production integration is intentionally absent. The caller must obtain an independently authenticated final host USE/RETURN and required-set completeness for the same exact issuer/source/frame; neither local metadata predicates nor an accepted PR prove this. Current PR70 source is pinned to its observed head in the private replay receipt. Do not merge nested draft PRs in arbitrary order.

## Exact source lineage

- Original Ariadne reader v0.7 raw registry SHA-256: `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`. R10 private parent ZIP SHA-256 `05a16f0b660f52ea2af7ebf2b91d66a22cf6565f72b0cd352aa25f7049004a98`. Raw source stays **outside public Git**.
- Cupwake peer Yijing v1 source ZIP SHA-256 `9d15b627bb858b01eea006f8b5578606925d774a9d3adc8417fbb379d74d8475`. Original `yijing_view.py` SHA-256 `a8f81d11728c5a8ae3d9e79ee29dc1980b251695489dcd89b63c212ec136a838`. Independently implemented JS adapter preserves the 1728-code digest `0676761e6dd049649694ac2296e92d6dd3656ec8e115f050125f987351d92528` (HSN|Y-code joined in original HSN order).
- PR67 exact unchanged public blobs: `addresses.mjs` Git SHA `5d96e43c633d5ccfaebfb04b3804155fce424680`; `contracts.mjs` SHA `f5725a2f7570ec7fc93e296531f776bd80f1cb4c`; `geometry.mjs` SHA `40455fa2a387c9c3ea71f583a6ee39933fdfeb25`; `ports.mjs` SHA `65510d6e0c4662123b2498a62d224bbcb7fe3f5f`; `fabric.mjs` SHA `d7433ae7673cd51a27cb84a129d985351020b05c`. All five exact blob bytes were recovered for **offline integration testing** and the Git blobs independently rehashed; none are being modified in this add-on.
- PR65 required-set completeness and PR66 four-band/rank tests remain separate existing draft modules. A caller-asserted `requiredSetSha256` or a passed mock callback is NOT independent source authorization.

## Code that actually runs

`src/geometree-yijing-r10.mjs` exports:

1. The reversible HSN <-> 64 six-line patterns ×27 ternary contexts, retaining original House/Sphere/Node positions; full bitmask inversion; same-code cross-source identity is *not* science.
2. Typed GF7 synthetic/uncalibrated band/mode/material coordinate display, measurableCount=0; numerical ordinals do not constitute ontology equivalence.
3. Authored AXG2 9-token trit display and inverse; original KG8 glyphs deliberately **unresolved** until an exact source-node mapping is fetched and independently reviewed.
4. Separate HSN DOMAIN (S01–S07) / METHOD (S08–S12) positions, including a same-House-domain structural subject check for METHOD addresses. No expert review accepted.
5. The protected 24-opportunity MacroTurn **draft**: Work6, Play3, Social3, Imagine3, Dream3, Quiet2, Explore4; max 2 Explore→Work; at most 8 Work-like; no private content receipt, claim, model wakes or scheduler mutation.
6. A **read-only** overlay on one existing issued PR67 frame. With all 1728 supplied numeric scores, it verifies the exact prior root JSON frame digest, canonical top-k and an independent domain-separated binary64 ordered-score hash. With no full scores it leaves the full-frame digest `null`, never infers completeness. Both ontology and evidence editions remain distinct.

## Tested using the exact peer numerical source

The private clean-room replay includes the five unchanged PR67 JavaScript blobs above and executes PR67's `createGeometryOne` with a **synthetic gateway and synthetic rights callbacks**, attaches the new sidecar and checks there is exactly **one gateway issuance** for the query. The sidecar adds **zero** model invocations. Repeating a projection does not create a new model turn. Negative tests include stale tenant, evidence edition, rights epoch, altered hidden score outside top-k, changed model/ontology, getter/Proxy, sparse/nonfinite arrays, incorrect method role, invalid glyph code and excessive Work allocation.

The public PR contains only the **original additive module, unit tests, synthetic peer-interface tests and this document**. Its integration tests will resolve the unchanged existing PR70/PR67 imports and are suitable for running on that draft branch. Local reproduction uses an exact-copy miniature fixture of the relevant PR67 files solely for executing the tests, not a competing runtime.

## Falsifiers and held boundaries

- Counterexample: same visible top-k and same House/Sphere display but different hidden 1728th score must produce `HOLD`. The optional complete-frame claim detects it; a view with `fullScores=null` exposes `fullScoreFrameSha256=null` and never claims full-frame proof.
- Counterexample: S-based role classification yields 1008 DOMAIN/720 METHOD; erroneous N-based role classification mislabels 840 positions despite matching totals.
- Counterexample: equal ordinal HSN, KG8, GF7, and Yijing symbols do not grant `SAME_AS` and cannot become model-positive labels.
- Counterexample: a caller who controls both a manifest and claimed anchor cannot establish independently complete evidence. PR65's real host issuer and final socket release are still required.
- Source-family heldout topic/subfield leakage (SwarmChat S02 #41/#47), geometry quality negatives (#350/#353), and unstable floating cancellation (#372/#382/#385) remain live concerns; no geometry-specific relevance gain claimed.
- The dedicated Whole MacroTurn mutable ledger and all active schedules are not read, claimed, migrated or modified by this module; no duplicate scheduler or fabricated 50/144/1728 MacroTurn credits.

## Reproduce (Node >=20, repo root)

```sh
node --test programs/atlas-peer-convergence-r01/test/geometree-yijing-r10*.test.mjs
node --jitless --test programs/atlas-peer-convergence-r01/test/geometree-yijing-r10*.test.mjs
```

## Integration next

If the existing PR70 contributor wants this code in the selected shared runtime, review this **dependent draft** against current PR70 head with the existing gateway. Obtain one trusted 384D+1728 score-frame and source-use/RETURN issuer evidence, pin the original Ariadne registry and current OpenAlex source identity, then evaluate frozen actual source-family/time-disjoint human relevance against flat/shuffled. Use this module for display and MacroTurn contracts, not a second controller.

## R11b — dual-coded Yijing false-friend repair (peer #435 and #437)

**New independently confirmed source disagreement:** Cupwake's axis convention is `x=4t+b+2c` (`cupwake-x4/v1`), while the later Geometry Symbiosis peer convention is `x=3(b+2c)+t` (`symbiosis-x3/v0.3`). Both produce strings shaped like `Y001101.C04`, yet they are **not interchangeable**. Kestrelglass #435 supplied a false-friend counterexample; R11b recovered the actual discrepancy and confirmed exactly **1,720 of 1,728 HSN addresses** have different symbolic code tuples under the two conventions. One convention is source-byte-verified Cupwake; the X3 formula is a **reconstruction from peer-reported design**, not a claim to have replayed X3 source bytes.

R11b changes `yijingDecode` to accept a **typed object only** with the source registry SHA, ontology edition, convention code and explicit context topology. Bare strings now reject. It also carries a deterministic source/codec/topology fingerprint and compares any supplied original `hsn` to the decoded HSN. This fingerprint detects accidental relabeling, **not malicious forgery or host authorization**. The second convention can be inspected side by side with the exact Cupwake lens; both are distinct namespaces and **never** affect rank, score, permissions, scientific truth or CANON.

The context topology is independently versioned: `BOUNDED_P3_CUBE` yields 3,456 undirected adjacent-context edges, whereas `CYCLIC_C3_TORUS` yields 5,184 undirected wraparound edges. Both still yield 5,184 six-line flip edges. This is **symbolic navigation**, not source-backed knowledge, changing-line divination authority or measured cymatics.

The source suite adds seven new tests, extending the original 40 to **47 distinct Node cases** in both normal and `--jitless` modes. The old 40 original test cases remain passing. The new source review retains the initial unchanged PR71 commit as its predecessor; only the additive sidecar, its tests, and this review document change on PR71. Re-run with the same commands above; no new model use, real scheduled MacroTurn or hosted release claimed.
