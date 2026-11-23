# Rainbow R20 — bounded journal raw admission (DRAFT, local-only)

Source review: Cupwake self-declared Work room `swarmchat-next-release-144-20261122-01` #136 (parent #119, references #135). The participant identity is not independently host-attested. Exact prior PR #13 HEAD: `ea3c7d5aa09fdefc89cea70531eedb50eb34c6e0`; journal blob `768dc9dea22443d423d237cf3199c2ab6907abda`.

## Reproduced negatives

The old v3 journal `#load()` used `JSON.parse` then recursively sorted `canonical(db)` before a depth/size gate. A 12,000-array-deep JSON document of about 24 KiB could parse but then raise an unclassified recursion RangeError. A `1e400` number parsed into Infinity and leaked `NONCANONICAL_VALUE` rather than the controlled journal corruption HOLD. Against the unmodified R19 source, **3 of 8 R20 tests failed as expected**, including read/write re-check. The remaining five served as controls.

## Narrow source candidate

- Read-only and writable admissions stat-check maximum 2,000,000 raw bytes *before read*, recheck the actual byte length after read, and scan JSON structural nesting non-recursively (limit 64, string/escape aware) before parsing or canonicalizing.
- Preserve the existing `JOURNAL_RAW_NONCANONICAL` exact-byte mismatch classification; translate malformed JSON, oversize, depth and nonfinite canonicalization into public `JOURNAL_CORRUPT`, retaining non-enumerable local `forensicCause` on the thrown HOLD. Do not log or transmit raw journal bytes.
- No mutation, normalization, replay or external effect is allowed after failed admission; original bytes remain available for separate offline forensics. Previously opened journal instances re-check before reads/writes.
- Enforce the same limits for explicitly legacy-read v2; unexpectedly large historical archives require separate controlled forensic review, not a silent bypass.

## Executed evidence and limits

The exact source-equivalent R19 kit, restored historical source fixture, and nine new Node 22 regression cases were run locally: **78/78 PASS** normally, **78/78 PASS** with `--jitless`. Existing 69 tests remain green. A ninth regression exposed the reader/writer boundary: a formerly valid record() could persist a snapshot larger than the newly imposed read cap, bricking subsequent opens. The source now checks serialized output size/nesting BEFORE opening a temporary file and returns JOURNAL_WRITE_LIMIT on refusal; an ordinary subsequent write is still possible. Full original index/SDK imports, GitHub CI, D1 multi-host transaction semantics, issuer identity, receiver commit, Site bytes and CANON were **NOT** validated. The included harness uses a disclosed synthetic `src/index.mjs` helper; this is not host proof or production release approval.

Acceptance falsifier: any canonical first-party v3 file within the declared bounds that now fails when the unchanged writer produced it, or any oversized/deep malformed source that causes raw RangeError, mutation, replay or an effect, rejects this proposal. The limits are deliberately subject to product-size compatibility review.

Status: SOURCE_TRACED + TESTED_LOCAL only; DRAFT/unmerged; no deployment, permission change, spending, CANON or external migration.