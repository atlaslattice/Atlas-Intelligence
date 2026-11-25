# R35 — Atlas Indra Dual-Frame Convergence (source-only)
Status: **DRAFT, locally tested, NOT merged/deployed**.

## Linear review ancestry (preserve upstream authors and choices)
- PR67 provides the geometry-first 12×12×12 shared runtime and twelve typed Work port views.
- PR70 literally inherits peer PR65 required closure and PR66 ranked/numerical review, with a single issued-frame convergence view.
- PR71 adds **explicitly edition-tagged** reversible symbolic navigation (Cupwake X4 versus Symbiosis X3) and preserves old counterexamples. Original HSN remains the one primary coordinate.
- R35 is a **child** of PR71; imports R34's source-only `issued-page-adapter` with only its import path adjusted to the inherited PR67 original address module. R34 PR68 is preserved as a sibling review, NOT silently merged.
- No new neural model, provider, host, broker, scheduler, or rights issuer is created.

## Concrete ABI mismatch repaired
PR66 `atlas.neural.issued/v1`: `method: 'neural'`, no `requestId` in the issued page.
PR67 `atlas.geometry-one.issued/v1`: `method: 'NEURAL_ONLY'`, `requestId` required.

The R35 `makeDualIssuedGeometry()` uses an existing **single** 1,728-score Float32 or Float64 buffer and returns both exact schema shapes pointing at **one defensively snapshotted immutable score array**. It never runs inference and does not alter candidate rankings.

The original R34 score binding hashes the exact big-endian IEEE754 bytes. R35 adds a separate SHA256 identity for tenant, logical target, contract version, request, purpose, ontology pin, evidence edition/source/model/query/issuer and original score binding. Explicit `expectedBinding` detects mismatches but **is caller-supplied and NOT an authenticated host attestation**.

Important empirical falsifier: JSON.stringify maps +0 and -0 to the same numeric text. Distinct bit-level source frames can therefore produce the same PR67/PR70 JSON frame digest. R35's byte binding distinguishes this case; source-closure, current access and final byte egress must remain host-controlled.

## Ontology roles and symbolic overlays
Ariadne `ariadne-reader/v0.7` SHA256 `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`.
The original 1,728 positions contain 1,008 DOMAIN nodes in S01–S07 and 720 METHOD nodes in S08–S12 (84 DOMAIN and 60 METHOD Spheres). Role is **not determined by N**. A method subject must refer to an explicit DOMAIN coordinate in the **same House**; `checkMethodSubject` establishes structural scoping, NOT semantic acceptance. PR71's version-tagged Yijing and authored glyph displays do not modify HSN or original source rights.

## Local verification
- 29 new distinct R35 tests plus 10 inherited R34 tests: **39/39 standard and 39/39 Node --jitless** in a branch-shaped local fixture.
- Four GitHub-created source/test blobs fetched back and confirmed equal to the exact locally tested Git blobs:
  - `issued-page-r34.mjs` `ed74e4aa08546074b9b338d711b80fb1b06738bf`
  - `dual-issued-geometry.mjs` `0c08d13a679a5a7d411d6c57e87b7a5477408169`
  - `issued-page-r34.test.mjs` `9c02b06ec53180fb97fc125ba8d660ef8ec5f2e8`
  - `dual-issued-geometry.test.mjs` `f4e89ee277dd8df50f4fa3f50a7b1480e462b857`
- This is **not** full peer-suite CI, a selected Model 0.3 model call, a hosted API request or a learned quality gain.
- Different `sourceEdition` (evidence) versus `EDITION` (ontology) is explicit. Alternate Yijing codecs never count as interchangeable source identities.

## Adversarial cases kept
Wrong scope, source revision, sparse/nonfinite/wrong-length scores, accessor/Proxy input, malicious score-buffer getter, typed-array subclass, SharedArrayBuffer, source-buffer mutation, tenant/target/request changes, f32/f64 ambiguity, +0/-0, wrong/forged expected digest, invalid H00, METHOD without same-House DOMAIN, and unauthorized training claims fail or remain review-only.
Existing source-family leakage (#41), role-drift (#47), near-tie/cancellation (#382), context divergence (#353), flat/shuffled geometry losses, full-score source withdrawal and two-account byte-RETURN authorization remain live falsifiers.

## Next integration, not implied by this PR
Use a host-issued current selected0.3 score frame, one actual PR67 gateway and PR66/70/71 read-only consumers, PR65 independently selected required-set closure, source-family/time-disjoint human relevance, per-source current USE/RETURN/egress authorization, and matched-budget flat/geometry/shuffle tests. No private modes, automated schedules, CANON edits or deployment.
