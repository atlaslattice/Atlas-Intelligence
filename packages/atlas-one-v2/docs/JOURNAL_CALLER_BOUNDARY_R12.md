# Atlas ONE v2 journal caller-boundary review — R12

**DRAFT / SOURCE-ONLY / TESTED LOCAL / NOT HOSTED / NO CANON / NO PERMISSION CHANGE**

## Exact source and negative controls

Base is the still-open draft companion PR #12 head `3f7124950c7532371bd907e4fb900d7c24ee614d`; original journal Git blob `9498b4d7849a645e599914d5cc1962ec767452a4`. These bugs are present in that local implementation; they do **not** establish any deployed Site behavior.

1. Valid run identifier `constructor` was read through `db.runs[runId]`, which inherited `Object.prototype.constructor`, then failed `RUN_IDEMPOTENCY_CONFLICT`. Likewise `inspect('toString')` attempted to clone the inherited built-in function and raised `DataCloneError` instead of returning null.
2. A caller-supplied plain `detail` object with a mutable getter yielded `'first'` during event-hash derivation and `'second'` when serialized by `#atomicWrite`. The stored entry's hash then failed validation on first subsequent inspect. The original source test explicitly reproduced all three failures before patching.

## Minimal reversible repair

- Only read run entries when `Object.hasOwn(db.runs,runId)` is true, both for inspection and recording.
- Materialize one strict, inert `stableDetail=JSON.parse(canonical(detail))` snapshot before the hash and file image, and use **only this same snapshot** for idempotency compare, hashing and persistence.
- Preserve v3 binding of input digest/requestId, read-only v2 legacy quarantine, original event format, unknown remote-effect no-retry policy and parent source history.

## Acceptance and limits

- **23/23 locally executed Node 22 `node --test` callbacks PASS**, comprising 14 preserved v3 receipt tests and 9 new R12 regression tests.
- **23/23 locally executed Node 22 `node --jitless --test` PASS**.
- Original unmodified PR #12 source gave **3 fail / 1 pass** in the initial four-test negative control; the repaired code passed all 9 new regressions.
- Exact modified source Git blob `9a6c728d77fbb1d3f6b79e1e0af84c0d59b58a6e` and exact test Git blob `c45412b96c445e2aa0047c8e5983edd25916ddb9`.
- The local `src/index.mjs` dependency was a disclosed small source-equivalent stub copied from the prior R11 kit; no full original repository test/CI, private Ariadne source, current signed host identity, served Site, D1, real receiver or production deployment proof.
- This does not make the journal a signed/tamper-proof witness. External sink transactions, replay after lost ACK, revocation fences and host read/return still require separate tests.

**Review gate:** do not merge this child ahead of PR #12 or any parent. Re-run the full original source tests and genuine GitHub CI with recorded job steps; verify review/rollback and source migration before merge or publication.
## Fresh Work #124 first-open collision — executed counterexample and repair

Cupwake's genuinely stored, self-declared Work #124 (referencing Rainbow #123, ancestor #119 due to 10-hop limit) identified a separate cold-start race in the **same parent PR #12 blob**. The constructor called `existsSync` and `#atomicWrite({version:3,runs:{}})` outside the existing writer lock. Two processes starting an absent journal could interleave: B sees missing, A creates and commits a valid receipt, B resumes and atomically replaces A's file with a valid empty journal. A local valid hash chain therefore **does not imply a preserved committed receipt**.

The additive repair uses `#guard` (the same exclusive file lock used by `record`) around cold initialization, and rechecks `existsSync` while holding it. Contention fails closed as `JOURNAL_BUSY_OR_STALE_LOCK`, not an overwrite or permission to blindly retry an unknown external effect. It is a local single-filesystem lock, **not** a distributed host/D1 transaction or external exactly-once delivery proof.

The 2-test deterministic original-source interleaving harness injects a second actual Node child writer between first existence check and the paused constructor's write. Old source **loses receipt while leaving a valid v3 journal** (expected-bad red); patched source preserves A's one committed request. Tested using actual Node child process with disclosed injected interleaving, not host D1. Original pre-race source Git blob `9a6c728d77fbb1d3f6b79e1e0af84c0d59b58a6e` was derived byte-identically and verified in the fixture; patched source `032ae64adba4fb0e75238849eb9d159551245af5`. Current new test Git blob `1e3f0faf9236bc0fe4e0cb0b713b9da2f5a269f3`. **25/25 locally executed tests PASS in Node 22 normal and --jitless** (14 preserved + 9 caller/prototype + 2 first-open). No full original repo or CI pass. Preserve peer attribution and owner/host release hold.
