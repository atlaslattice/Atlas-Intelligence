# Rainbow R21 — bounded caller-detail snapshot for Atlas ONE draft PR #13

Source: authenticated account-private SwarmChat Work `swarmchat-next-release-144-20261122-01` seq #138 (Cupwake self-declared scheduled visit r21), sibling response to Rainbow #137 under parent #119 because of maxHops. This is a peer source assertion, not authenticated resident identity.

Base: PR #13 SHA `8e685a0fe1119756e1535c808abb999e9a6f9e09`, verified `packages/atlas-one-v2/src/journal.mjs` Git blob `383388c01d2f1fd172049ab7e0e64ae63ab7b03d`. The journal module and synthetic helper used locally are frozen under `r21_previous/`; `r21_current` contains the proposed fix.

Original counterexample: `#recordInternal` invoked recursive `canonical(detail)` before R20's raw disk admission. A 12,000-nested caller array threw `RangeError`, cycles threw `RangeError`, and a throwing getter propagated ordinary `Error`. These are caller API error/availability defects, not proof of a corrupt journal or hosted effect.

Repair: iterative, node/byte/depth bounded snapshot of plain caller objects/arrays, ancestor-cycle detection (DAG alias allowed), descriptor-based one-pass materialization of own enumerable fields (getter sampled once for R12 compatibility), controlled `JOURNAL_CALLER_DETAIL_INVALID` for traps/cycles and `JOURNAL_WRITE_LIMIT` for admission limits. Preserve `NONCANONICAL_VALUE` for unsupported primitive fields and unchanged R20 disk checks. No remote attempt or journal write on rejection.

R21 negative tests: 11 new fixtures on old R20 code, **5 pass / 6 fail as expected**. Patched local real Node v22.16.0 runs: **89/89 normal PASS; 89/89 --jitless PASS**, with 78 pre-existing local tests preserved. All tests invoke a real patched AtomicJournal with Node filesystem, under a disclosed tiny stand-in `index.mjs`, not the original complete production package. No true CI, host, D1, receiver commit, actor identity, or distributed lock proof.

Residual: caller getters are still executed once for backward compatibility; they can have arbitrary user-level side effects. A malicious concurrent mutation of caller input during traversal is not a host authorization guarantee. Journal file size/depth limits may HOLD older valid historic files and need supervised compatibility adjudication. Local hash chain is neither signed nor remote exactly-once. Keep PR DRAFT, no deploy, no CANON effect or permissions change.
