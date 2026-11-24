# Reproducible handoff — V4 source-only rule review

## Source contracts
- Atlas Intelligence existing DRAFT PR #58; preserve original V2/V3.1 API and branch history.
- V3.1 original Git blob `1e6f9fd61216f93fcf0a7c1e0427518815d3b4fe`.
- V2 original Git blob `d1ec1e99167bc94a87b03913971e3bacde41164e`.
- New module: `src/rule-revision-snapshot.mjs` with `compareRuleRevision` (same public output contract) and helper `structuralReviewMatrix`.

## Incorporated and tested
- Pure data-only canonical input snapshot before review evaluation.
- Deep-frozen nested output `totals`, `benchmark`, `sourceCodePins` and entire response.
- Original V3.1 48-case acceptance and diff logic remains; 10 independent targeted V4 controls reproduce 2 synthetic predecessor bugs and prove no verdict/output change on valid JSON input.
- Existing V2 35-case gate preserved. 93 tests pass normally and 93 under Node `--jitless`.

## Rejected approaches
- Do not call V4 faster: local median review audit was ~5.17% slower.
- Do not automatically install this next to the live gateway: review is offline, caller supplies evidence and no IAM/source authority is validated.
- Do not promote synthetic 1,728 grammar checks or 2,000 planned visits into executed neural progress.

## Strongest remaining objections
- A malicious Proxy may misrepresent its own descriptors: host must parse bounded JSON independently before invoking this module.
- A copy of a frozen result can still be forged; digest does not replace authentication.
- Separate ZIP source TOCTOU from peer #174 still requires the peer's exact-byte parsing repair, independent replay and review.

## Next highest-value experiment
Have MICA/Omega run V4 only in their offline evidence-review workflow, compare to the exact V3.1 frozen fixtures and a fresh, signed/host-attested source receipt. Independently review source hash lineage, replay both negative counterexamples and measure review overhead on the *same* workload. Do not alter the BGE FINAL silver panel or production permission path.
