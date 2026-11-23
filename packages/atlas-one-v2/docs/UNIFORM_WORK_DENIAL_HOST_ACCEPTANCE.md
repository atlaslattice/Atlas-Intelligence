# WorkHostPort uniform public HOLD: source-only companion review

Status: **DRAFT / SOURCE-ONLY / NOT HOST-TESTED / NOT AN AUTHORIZATION OR RELEASE**. This companion is based on Atlas ONE v2 PR #8 at exact HEAD `8310db76277bb3860fdfde3c08d66bb20e43b23d`. The existing SwarmChat broker, D1, Site, and private data remain unchanged.

## Original red counterexample and scope

Work peers #116, #117 and #118 independently observed that `WorkHostPort.query()` returned different external HOLD reasons on source-dependent outcomes—`HOST_READ_FAILED`, `HOST_RETURN_SHAPE_INVALID`, `HOST_SOURCE_IDENTITY_INVALID`, `HOST_SOURCE_SEQUENCE_DUPLICATE`—while a valid row with revoked egress returned `REVOKED_OR_STALE_EPOCH_AT_RETURN`. Some bad-read paths skip `egress()`. Those differences can become privacy side channels if the source-only adapter is ever exposed without a host guard. No current served-Site exposure was established.

## Narrow change

All `query()` denial branches now produce the exact same public **`{schema:'atlas.one.host-port/v2',status:'HOLD',reason:'WORK_UNAVAILABLE',hostAuthenticated:false,postPerformed:false,canonEffect:'NONE',data:null}`**. The success path remains a **source-only, host-unattested reference**, not data-body export. Invalid room handling in the separate inert `prepareSwarmChatDraft()` is unchanged. Existing unit expectations were updated for the intentionally incompatible diagnostic change.

Do **not** put exact internal error categories or source identifiers into externally visible response headers, body, telemetry, caches, exceptions or 304 behavior. If internal diagnostics are needed, the publisher must implement a separate access-controlled, tenant-scoped audit channel, and confirm it cannot leak through timing or side effects.

## Tests and limits

A new 5×2 synthetic matrix covers read throw / empty / wrong-account / duplicate / valid, each under allowed / revoked egress. The negative envelopes are structurally identical; happy-path mock remains `hostAuthenticated:false`. Separate checks reject caller-supplied principal, denied admission, missing session and an A→B switch after READ.

**UNFIXED BY THIS PATCH:** a weak/stale host callback; verified issuer identity; original source SHA actually matching selected Work bytes; transactionally atomic egress with current rights; ETag/304; cache lookup order; network timing; outbox/receiver queue deltas; first-byte commitment; in-flight E<W<D irreversibility; GitHub runner admission; deployed Site, D1 or real principal. The mock deliberately retains different callback counts and latency by source outcome. Uniform strings are *not* proof of noninterference.

## Required publisher acceptance

1. On the **exact served Site HEAD** only, use disposable independent tenant/account A and B with safe source material, with publisher-approved source edition and bytes.
2. Run a **5 outcomes × 2 rights states × 3 boundary conditions** matrix: same-account, A→B during READ, and revoke **between the second session check and first sink byte**.
3. Record and compare status/body/headers, ETag/304, cached read counts, DB queries, outbox queued/attempted/committed, receiver receipts, and post-revoke emitted bytes. Sample randomized latency across a jitter baseline; do not promise constant time absent evidence.
4. Trusted host must atomically rebind current tenant, account, principal, rights epoch, room, lease, issuer-approved source edition, source-byte SHA and sink commit. A stale callback returning an old grant cannot count.
5. Missing source, bad digest, revoked or wrong account must all produce non-cacheable denial and **zero newly emitted protected bytes** after the trusted sink fence; previously delivered bytes cannot be recalled.
6. CI must execute real runner steps with reviewable logs; do not merge this dependent draft until parent source and reviewer gates permit. Preserve original failing cases and rollback path.

Original discussion references: Work room `swarmchat-next-release-144-20261122-01`, peer seq #116 → #117 → #118. All self-declared member identities remain unverified.
