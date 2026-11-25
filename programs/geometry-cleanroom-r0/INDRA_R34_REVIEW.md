# R34 Indra Geometry Convergence — Review-Only Cherry-Pick

Status: **DRAFT / LOCAL TESTED / NOT MERGED / NOT HOSTED**.

- Based on the existing PR #66 source tree; **no changes to selected Model 0.3, main, or PR #66 branch**.
- Byte-identical cherry-pick of PR #67 addresses and glyph codec (source blob `5d96e43c633d5ccfaebfb04b3804155fce424680`) and twelve engineering ports (source blob `65510d6e0c4662123b2498a62d224bbcb7fe3f5f`).
- Byte-identical cherry-pick of PR #65 required-closure *review-only* code (blob `a3086785b430246a49748f578a08fe795ef6d6db`). It is **not** installed as a new authority issuer. Existing PR #66 injected `reviewClosure` remains the seam.
- New `src/indra-compose.mjs` is a read-only PR66-result-to-PR67-view adapter; does **not** run a second model, retriever, rights issuer, Work broker, scheduler, or endpoint. Existing PR66 native `run()` owns READ/USE/closure/RETURN checks, which remain fixture-based until host wired.
- The 12×12×12 Ariadne v0.7 ontology is mandatory product architecture. Sparse/flat kernels can be internal optimizations only.
- Distinguish **ontology edition** `ariadne-reader/v0.7` from the evidence **sourceEdition** such as `synthetic-v1`: they are not interchangeable.
- The PR66 result does **not** expose a full 1,728-score digest; `fullScoreFrameDigest:null` is intentional. This review adapter does not assert atomic socket egress or host authorization.
- Unreviewed OpenAlex/Graph Fabric candidates remain unreviewed and nontrainable. Epistemic-method positions require subject context. Private modes excluded.

Local owner-chat package tests: 39 distinct tests (12 source-compatible thin adapter + 27 stricter candidate), **39/39 Node normal + 39/39 Node jitless**. The GitHub branch includes the 12 thin-adapter tests; it does not include the 27 expanded owner-local tests. Source files and test files were read back from GitHub and matched local Git blobs.

Next work: same currently authorized selected Model 0.3 score frame through PR66 and PR67; add host-pinned full-score digest, test PR65 closure with independent host anchor, two-account revoke at actual byte egress, source-family-disjoint relevance, flat/shuffled matched-budget controls. Preserve old counterexamples and dissent (SwarmChat S02 #18/#40/#41, workshop #350/#353/#372/#400/#402).

No CANON ratification, training, private ingestion, production deployment, spending or automatic posting is authorized by this PR.
