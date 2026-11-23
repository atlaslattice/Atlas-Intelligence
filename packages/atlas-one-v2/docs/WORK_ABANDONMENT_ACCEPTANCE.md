# Atlas ONE v2 Work query abandonment — bounded source candidate

Status: **DRAFT / SOURCE-TESTED ONLY / NOT DEPLOYED / NOT A HOST PRIVACY PROOF**.

This is an additive companion to PR #10 (itself dependent on Atlas ONE v2 PR #8). The existing SwarmChat Site, room permissions, D1, Work database, queues, private modes and CANON remain unchanged.

## Why this exists
SwarmChat Work #120 (self-declared Thimblecurrent, direct parent #119) observed that client abandonment/disconnect may still allow deferred reads and delivery callbacks to progress. A uniform public HOLD in PR #10 does **not** guarantee no effects after a disconnect, source revocation, or account switch. The author did not claim live Site exploitation.

Original negative model: the request starts; the caller abandons it; a queued read finishes; a weak egress callback may still run. Even a later HOLD cannot undo bytes already committed or notifications previously queued. E<W<D (enqueue before withdraw, delivery after withdraw) must be measured; it cannot be described as automatic deletion.

## Narrow, opt-in source-only behavior
`WorkHostPort.query(request, {signal})` accepts an actual `AbortSignal` only as an **optional early-stop hint**, never as authentication. The source callback contract and the original single-argument invocation stay compatible. The explicit public query shape remains `{roomId,sourceSeqs,purpose}`; caller principal, issuer epoch, tenant and rights authority remain forbidden.

- Before callbacks, and after each asynchronous `session`, `admission`, `read`, second `session`, and `egress`, an observed abort returns the same public `HOLD / WORK_UNAVAILABLE`.
- For an abort detected after an asynchronous READ, **no new egress callback is initiated** by this local adapter.
- Aborts DURING a previously started `egress` cannot prevent its possible external side effects. The adapter must not claim "zero delivery" or "exactly once" from a HOLD return.
- The host must observe real client disconnects (not request text), cancel queued work where safe, reauthenticate at actual sink commit, and independently constrain caches, ETags, 304s, outbound queues, delivery receipts and correlation headers.
- None of the new checks attests a signed platform principal, D1 read isolation, current lease epoch, SHA computed from original Work source bytes, actual first-byte delivery, or production noninterference.

## Reproduce and expected counterexamples

`node --test packages/atlas-one-v2/test/work-abandonment-observation.test.mjs`

The test file covers no-signal baseline, valid active signal, pre-abort with zero callbacks, fake/forged options, null options, mid-session/admission/read/egress abort, revoked egress and post-result abort. The **mid-egress case deliberately increments a synthetic effect counter before returning HOLD**. Any claim that a cancelled query has caused zero external effects FAILS this case.

## Publisher-only acceptance

On exact *current served Site HEAD*, only with the real publisher's authorization and disposable two-account Work data:

1. Pin issuer, principal, tenant, account, room, source edition, source byte SHA, rights epoch/lease and a stable request ID; separately attest the return-side session.
2. Establish a disconnect / abort at each stage: before admission, while storage read is in flight, after return admission, during queue enqueue, and before first protected network byte.
3. Independently observe source D1 queries, cache writes/reads, 304/ETag and correlation headers, outbound queued/attempted/committed effects, receiver ACKs and read receipts. Compare A→B account switch and W=withdraw, E=enqueue, D=deliver permutations.
4. Require **zero new protected responses or side effects after the host-defined atomic fence** where no effect was already committed. Preserve a bounded UNCERTAIN state for in-flight external side effects; do not blindly retry.
5. Do not claim retroactive erasure of bytes already delivered before withdrawal.
6. Record the real host revision, executed CI job steps/logs, source-release acceptance and tested rollback separately. A test passed with mocked callbacks is not proof.

This companion does not close any of the 17 host/human release gates, and it never changes CANON or real user permissions.
