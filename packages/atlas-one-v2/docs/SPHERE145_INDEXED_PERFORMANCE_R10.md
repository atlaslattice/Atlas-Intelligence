# Atlas Sphere-145 / source-indexed perspective performance (DRAFT)
**Review-only; not hosted, not an IAM permission, not a scientific or CANON claim.**

## Problem and measured repair
Original R09 source-only analysis computes 144 Sphere and 12 House lexical-candidate profiles by scanning all 1,728 nodes for each perspective: 269,568 logical pair evaluations for a complete result. An inverted token->node bitset computes **exactly the same candidate-count result**, with union and integer popcount per Sphere/House. Edges remain LEXICAL CANDIDATES, never semantic SAME_AS or REQUIRES. No original private Ariadne registry is committed.

### Executed, source-bound local evidence
- Input: derived, owner-scoped TSV SHA-256 `598495239d7e856af91aad87724bb9055eb813714f242975c1201755f425ec56`; mode-metadata SHA-256 `feea3491423c986ad0fc87f75310e8e3b0a4b63f23d2217a1312dfadc7120815`; registry **edition claim** `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6` (not original raw registry bytes in public repo).
- Private R10 indexed engine, 25 original and 200 indexed repeated measurements in Python 3.13.5 x86_64: median **85.203 ms original** versus **0.5808 ms** indexed re-evaluation, **146.7× warm**. Including a fresh index construction: median 16.237 ms build + 0.581 ms reevaluation, **5.07×** faster than one original scan. P95 93.812 ms versus 0.858 ms. Warm caching is scoped to exact source identity.
- **Exact result equality:** baseline and indexed full Sphere+House results have the same deterministic SHA-256 `e9bc22c3eaca3a2fa303eaa534b488126678b43b88d6f9db55f40e8bf90c7091`.
- The public-safe port in this PR was separately executed over those same derived source-index bytes and matched the original R09 result tuple exactly; a separate 20-vs-200 run measured median **90.91 ms original** and **0.754 ms** in the public port (**120.5× local warm**). These are distinct benchmark runs, not merged into a single number.
- Local R10 executed **144 separate source-bound Sphere review records** followed by meta review #145; there are also 1,728 House–Sphere COMPUTATIONAL requirements. Independent Python audited every source record/chain and rejected 10 mutation cases. Its 170 unit tests and 24 offline desktop+mobile browser checks passed.
- **No hosted WebGL, browser network, D1, SwarmChat message delivery, LLM inference or user-observed response latency has been measured.** The speeds are only CPU evaluation of the candidate lens in one local environment; no speedup guarantee for all hardware.

## Exactly what this draft adds
- `tools/fast_sphere145.py`: pure stdlib Python class with exact SHA-pinned source-index and mode bytes supplied by a caller. It checks 1,728 distinct canonical coordinates, homogeneous source roles (7 domain Spheres + 5 epistemic Spheres per House), 104 WORK Spheres and 40 optional-mode Spheres, then returns in-memory lexical summary profiles. No source bodies are logged or exported.
- `tools/test_fast_sphere145.py`: 14 synthetic unit tests (no owner data) for original-vs-inverted count parity, source/role/mode drift, unknown editions, malformed Unicode, and zero authority.
- The existing R09 circuit, PR25, PR26, PR27, PR28 and PR30 Work-port remain unchanged; this child PR is an **optional performance implementation**, not another broker, index database or model scheduler.

## Host gates and reversibility
The actual hosted publisher would need current authenticated tenant/principal, original registry bytes and rights check at READ and RETURN; no Work search index should outlive revocation or changed source SHA/edition. Apply invalidation at source/permissions epoch; never cache private room bodies or infer consent from a SHA. Run the real Site build and two-account D1 revocation tests, verify stable UI source links and measure signed-in p50/p95 end-to-end latency before claiming a user-visible improvement. Keep old linear path as reversible fallback. The current source code neither posts nor changes CANON or Iron Empire fiction.

**Decision: DRAFT LOCAL PERFORMANCE CANDIDATE. CI_VERIFIED=NO. HOST_DEPLOYED=NO.**
