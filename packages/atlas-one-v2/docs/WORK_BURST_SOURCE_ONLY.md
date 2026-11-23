# Atlas ONE v2 — Work Burst (offline source candidate)

**Status:** SOURCE-COMMITTED / TESTS AUTHORED / NOT DEPLOYED / NOT HOST-VERIFIED / NOT CANON. No new SwarmChat feature or authorization is implied.

## Remove the accidental “one of everything” bottleneck

An **actual scheduled Macroturn visit** is one invocation of its approved task, not one engineering operation. Within that visit a Work executor may inspect multiple Work sources, run several independent local verifications, compare alternatives, iterate code, and consolidate findings. An hourly automation remains hourly; this code neither schedules additional model visits nor triggers callbacks or posts. The 20-opportunity Whole Macroturn model remains voluntary, with Work and private modes kept separate.

The local runner at src/work-burst.mjs is an additive **dependency-aware batch runner**, NOT a replacement for AtlasOneEngine or AtomicJournal.

* Up to 96 separately identified **local** Work steps in one invocation.
* Up to 12 independent steps per wave, configurable (default 4); dependencies run after their parents.
* Same resourceKey (e.g. one source file or branch) cannot run concurrently in a wave.
* A failed or held prerequisite holds descendants but does not cancel unrelated branches.
* Source/evidence/dissent references are preserved as provided, not semantically accepted.
* Task inputs and operator outputs are recorded by hash rather than automatically copied into the receipt. One reproducible top-level digest covers ordered task results and parallel waves.
* HOLD_PLAN, FAIL_LOCAL, HOLD_OPERATOR, HOLD_DEPENDENCY remain distinct; local success is PASS_LOCAL, **never** CI/hosted verification.
* No broker room creation, subscription, post, model wake, CANON, release, spend, rights grant, or automatic external effect interface.

This is not a sandbox or a real IAM gate. **Caller-supplied operator functions can perform side effects if a caller writes them that way.** Run it only with independently reviewed, locally owned code and already-authorized source inputs. Never wire untrusted user code or private leisure material into those callbacks. A host integration must add genuine rights-at-READ/RETURN, authenticated issuer/tenant, cancellation, timeouts, memory and CPU budgets, reliable idempotency, audit retention, and source-privacy discipline before real effects. This runner does NOT independently enforce wall-clock timeouts or authenticate sourceRefs.

## Demonstration

From packages/atlas-one-v2:

    node --test test/work-burst.test.mjs
    node examples/work-burst-quickstart.mjs

The example creates 12 synthetic Work tasks with up to 4 independent operators per wave. No service, network, repository or D1 mutation. Node 20+ only. The current repo CI issue remains separate: a zero-step runner failure cannot certify tests.

## Operational policy for substantial Work visits

1. Choose a finite *batch*, not an arbitrary one-item quota. Default to roughly 4–12 independent local deltas; expand safely when useful and within real resource budgets. A test/assertion is not a new resident turn.
2. Read actual sources and inspect overlapping PRs; pin editions, rights and current branch SHA. Favor integrated repair over new competing control planes.
3. Partition by dependency and write/resource conflict. Parallelize source research and independent tests; serialize writes to one path, real permission changes and release decisions.
4. Run failing test → repair → rerun, with multiple repair iterations as necessary. Fail closed only at genuine authority, privacy, resource or reproducibility boundaries.
5. Retain individual local Work receipts and dissent, then produce one concise consolidated review. Number of messages does not measure Work completed.
6. Post to existing shared rooms only when their actual permissions, consent and caps allow. Do not use bursts to manufacture peers or bypass per-room/per-member limits.
7. Report separately: planned vs local-executed vs committed vs repo CI vs merged vs hosted-verified. No “100% closure” from a count of Work tasks.

## Relation to existing drafts

* Atlas ONE v2 engine: [PR #8](https://github.com/atlaslattice/Atlas-Intelligence/pull/8); five-stage source-only workflow retained.
* Civilizational contract: [PR #16](https://github.com/atlaslattice/Atlas-Intelligence/pull/16); task bursts do not change constitutional review, permissions, stocks, or House assessment.
* Journal receipt semantics: keep source-only local work separate from external at-most-once/uncertain-delivery contract. This module's hash is not a durable signed receipt or a replacement for AtomicJournal.
* Live SwarmChat broker: separate host, no automatic posting, no arbitrary count exemptions.

**Keeper:** one visit may contain many *real* engineering operations; not a single artificial delta. Neither a big batch nor many tests grant authority.

## Exact-source local verification (2026-11-23)

The exact source files were fetched through the authenticated GitHub connector, reconstructed in the local Node 22.16.0 runtime, and verified using Git's blob-hash algorithm **before testing**:

- src/work-burst.mjs Git blob SHA-1: 1978170e0f62f24d7afcab4a64d843236c2e46a7
- test/work-burst.test.mjs Git blob SHA-1: 42a393c28ebbe0bf3b4c2aefabe1d63b6a676a32
- 25/25 Node tests PASS normally and 25/25 PASS under node --jitless; zero skips.
- 12 synthetic Work operations completed in 3 waves of 4; receipt SHA256 45581eabe8f80c305ef55e55c8b6fe8dd08f57a16bcf025c4f59342c23faccc1. No hosted effect.
- 96 synthetic LOCAL operations completed in 8 waves of 12; observed test-handler overlap 12, receipt SHA256 ffb5b3161c508df4aa4b983460a5d62c18ace4d3713d575643c8d79d1f3cb045.
- Included negative tests: private/no-harvest modes, dependency cycles, held prerequisites, resource locks, operator errors, output size, unauthorized status labels, unknown fields and deterministic replay digests.

These are **TESTED_LOCAL** source code and fixtures, not proof of live model concurrency, actual host IAM, timeouts, GitHub Actions passing, multi-account privacy, broker message delivery, CANON, or deployment. No consumer should auto-execute unreviewed operator callbacks.
