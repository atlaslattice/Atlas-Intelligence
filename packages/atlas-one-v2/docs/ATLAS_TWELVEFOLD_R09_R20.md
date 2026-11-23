# R09–R20 Twelvefold · Atlas ONE source module

This is an additive **public-safe** implementation candidate stacked on the existing Atlas ONE v2 / Ariadne / Iron Empire drafts. It exports `./twelvefold` and `./twelvefold/broker` when accepted. **No new control plane, Work room, subscriptions, deployment, autonomous model calls, authority votes or background job is installed.**

## Function contracts

- `validateStructuralNodeDelta(packet)` checks the edition-qualified node and four Work proposal ports. It does not authenticate source bytes.
- `verifyNodeWaveDigest(packet)` independently reproduces Python's canonical JSON SHA256, blocks accessors/cycles/oversized or malformed inputs, and returns a **local packet hash check**. A matching caller-supplied digest alone is not issuer authority.
- `prepareFourSystemCascade(packet)` returns four per-node Work questions, always as `CANDIDATE_NOT_POSTED`.
- `prepareSwarmChatHandoff(...)` enforces a caller-described open Work room, current tenant/account/principal/epoch, explicit event opt-in, source SHA and remaining capacity; it prepares an intent and **never** joins, subscribes, posts or wakes anyone.
- `createWorkRelayPort({session,room,readParent,rights,post,readback,clock})` is a **publisher-bound host callback contract**, not wired to a real Site. It derives host context first, checks room/consent, authorizes READ before obtaining any peer message, rechecks RETURN, attempts at most one genuinely source-linked Work reply, and verifies exact broker readback. Missing ACK or readback means no blind retry.
- `validateWaveReceiptSummary` and `validateCandidateLink` keep structural source evidence, calculated comparisons and unreviewed semantics separate from real participant activity, deployment and normative force.

## Manual tests

Without private source, run `node --test test/twelvefold-*.test.mjs` (private-source tests SKIP); with the owner-authorized generated JSONL, set `ATLAS_TWELVEFOLD_WAVE_JSONL=<local exact file>` and rerun. The full-source private compiler is in the owner's own R09–R20 archive; do **not** commit that archive or private creative modes in this public repository. The tests use mock publisher callbacks and are not signed-in hosted authentication evidence.

## Context

Original Ariadne v0.7 registry SHA: `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`.

One full twelve-wave private execution yields 3,234,816 computed comparisons, 20,736 node-wave candidate deltas, 82,944 four-system proposed work records, 1,728 Sphere and 144 House follow-up records, 1,884 structural hierarchy edges and 1,583 unreviewed lexical candidates. Zero peer conversations, CANON amendments, room permissions or hosted deployments are established by computation.

The existing scheduled Atlas v2 `MT0001–MT1728` format is **144 perspective Spheres × 12 target Houses**, each bundle containing 144 original source node IDs. A derived crosswalk may be used to navigate but is NOT a shared ledger claim, not completed scheduled visits, and not a rewrite of the separately version-guarded automation SQLite database. Preserve other agents' task claims and original source histories.

Current provider/publisher host acceptance remains the release blocker. Never silently flatten Play, Social, Imagine, Dream, Quiet, Brain or Palace into Work or telemetry.