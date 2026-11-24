# META145 v0.6 — source-safe horizon synthesis and READ/RETURN snapshot repair

**Scope:** additive, draft-only to the existing Atlas Excellence 1728 source and PR #45. Does **not** create an issuer, scheduler, broker, resident, future forecast, model weight update, scientific validation, or CANON amendment.

## Why this patch

The existing `meta145-host-admission.mjs` checked that the identity and ACL matched at READ and RETURN, but stored references to host callback result objects. A host callback that reused and mutated the **same object** between phases could fool equality of those references. The original module also accepted inherited `verified`/`allowed` fields or getters for required properties.

A new local, real-HTTP regression suite reproduced nine incorrect acceptances in twelve checks on the exact predecessor file (Git blob `15a654040c83a139c107483e29c5e518ac22df34`). The repair extracts independently frozen, own-data-only minimal snapshots immediately at READ and RETURN, then compares the snapshots. It passes 12/12 new adversarial cases, including two positive controls. This is **defense in depth**: the genuine host must still issue verified principal data and current Work ACL; a JavaScript `Proxy` is not sandboxed, and mock callback results are not a host attestation.

The original, unpatched source and the before/after test receipts remain preserved in the owner-private release. No existing exported functions were removed.

## Source-only horizon bridge

`meta145-horizon-review.mjs` consumes only a preselected, exact-byte SHA-256-pinned simulation receipt. It imports the EXISTING `isVerifiedProgram` authority and checks the exact original Ariadne v0.7 and Excellence program digests. It exposes a read-only advisory descriptor and `PREPARED_NOT_POSTED` work-reference metadata. No source bodies, private mode content or local peer messages enter the public GitHub files.

The private source computer performed 1,728 × 1,728 = **2,985,984 explicit deterministic modular arithmetic updates**. It mathematically fast-forwarded the 1,728-repeat recurrence to a total of **5,159,780,352 virtual positions** with exact affine exponentiation. Fictional "years" are indices, not elapsed time, forecasting, independent physics simulation or research-quality measurements. All 144 Sphere and 12 House position groupings remain structural; 20 local review rounds used 20 actual account-private Work message references but are **not 20 new authenticated peer turns**. No auto-accepted mappings, experimental truth or completed official engineering tasks.

The adapter explicitly rejects fake `host_deployed`, `canon_changed`, `independently_authenticated_peer_turns`, source digest, completed engineering steps, or a private non-Work mode.

## Verification and current release state

- 12 new adversarial READ/RETURN identity tests: 9/12 RED against predecessor, 12/12 GREEN after repair.
- 13 public source-horizon adapter tests; 1 private original-receipt integration test.
- Combined local Node tests: **79/79 passing**, comprising **76/76 GitHub-ready cases** and **3 owner-private original-receipt cases**.
- Private Python reference generator: **25/25 normal and optimized**.
- Actual offline Chromium UI test: search, House filter, pagination, 20 review refs, no outbound requests, no JS errors PASS. This does not prove the hosted SwarmChat 3D client.
- `node --jitless` **fails in three server-test files** under this environment: Node 22's bundled undici requires WebAssembly, which `--jitless` disables. Normal Node 22 tests are green. Do not count jitless as passed.
- GitHub Actions issue #15 continues: pre-runner failed jobs with zero executed steps. No host issuer/ACL callback on current Atlas `server.ts`; PR remains **DRAFT / HOSTED HOLD**.

## Acceptance gate

Current PR review, actual GitHub CI runner step/logs on HEAD, trusted issuer and Work-room ACL injected by existing publisher, two-tenant READ/RETURN revocation, exact source epoch recheck, D1 restore invalidation, real browser regression, and reversible deployment proof. No test here authorizes a production write or merge.

**Do not confuse synthetic 1,728-node coverage, 20 local analysis rounds, or 1,728 symbolic recurrence repeats with real resident collaborations, scientific acceptance, or deployed code.**
