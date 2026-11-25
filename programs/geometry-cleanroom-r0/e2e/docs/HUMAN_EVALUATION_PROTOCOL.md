# Fresh, blinded, independently judged 12×12×12 quality comparison

**Current status: PREPARED, ZERO independent human judgments.** Do not treat this file, 12 model queries, or the synthetic `quality-gate.test.mjs` as a semantic-quality acceptance.

1. Use new, explicitly eligible WORK source-family/time-disjoint questions whose source permissions allow researcher inspection, inference, independent review and aggregated output. Record exact source IDs/editions and current rights epochs without importing private non-Work modes.
2. Freeze one query dataset and at least 6 unrelated source families **before comparing arms**. A reviewer independent of algorithm authors chooses ground-truth judgments; at least 2 independent reviewers per query. Log conflicts and retain both raw grades.
3. Compare selected Model 0.3 flat, same-head geometry view, and (only if genuine score change) matched-parameter true, shuffled, uniform and no-geometry controls using the exact same BGE/flat-head source snapshots and an authenticated one-activation stream.
4. Present labels and candidate text without telling reviewers which algorithm produced each result. Randomize presentation deterministically; retain candidate HSN, source digest and actual source-use entitlement in a secure private evaluation file. Reviewer access does NOT imply source disclosure rights to a third party.
5. No overlap of training/previously consumed 548-panel derivative sources, time splits or source families. Freeze all evaluation prompts before computing final nDCG@10, recall@10, abstention, citation correctness, latency and resource costs.
6. Require missing judgments, incomplete sources, disagreement, revoked rights, unverified reviewer identity, unsupported candidate or contamination to yield `HOLD` rather than fabricated score.
7. Report paired confidence intervals by independent SOURCE FAMILY (not by redundant queries), worst-House regressions, negative cases and pre-registered multiplicity corrections. No gain claim if interval includes zero or shuffled control wins.
8. Keep reviewer names/grants and source text PRIVATE; only explicitly release-approved aggregate metrics may be exported.

Input shape for `eval/quality-gate.mjs`: `panel.queries[]` with independent query/source family ID, baseline/candidate IDs, 2 review records per query, exact query hash; `independentAuthority` supplied by a trusted external service with methods `verifyResearchScope`, `verifyReviewers`, `verifyFamilies`. The local reviewer cannot independently attest that service, and the mathematical result still sets `independentlyCertifiedQualityGain:false` and `releaseAuthorized:false`.

**What is required outside this environment:** genuine independent human graders, source-use/licensing approvals, and a pre-registered evaluation authority. They are not supplied by this package.
