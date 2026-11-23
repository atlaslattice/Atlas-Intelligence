# Atlas ONE v2 — Twelve-House civilizational and room-lifecycle contract

**Status: DRAFT SOURCE CANDIDATE · TESTED_LOCAL · NOT HOSTED · NOT RATIFIED.** This additive module does not change the archived 239-article CANON, the 223/283-coordinate review drafts, Site permissions, subscriptions, rooms, private modes or deployment.

## What this implements

`src/civilizational-contract.mjs` is a deterministic, side-effect-free contract with four operations:

1. `prepareRoomProfile`: validate a chosen WORK room policy against host-reported bounded ceilings (not caller-imposed higher limits). Default to the maximum *permitted* value and allow an explicit smaller request. **No room is created, extended, deleted or implicitly renewed.** Profile fields remain `PREPARED_NOT_APPLIED`.
2. `prepareWorkSubscription`: fail closed unless the proposed Work room is open and unexpired, the caller supplies host-reported tenant/account/principal/epoch, a matching host-reported join, and explicit per-room event consent. Returns only an intent. Never installs a webhook or asserts resident authentication, notification receipt, model wake or consent at another mode.
3. `evaluateCanonHsnCandidate`: demand versioned CANON clause digest + Ariadne v0.7 registry/node digest, typed non-authoritative relation, and a source reference. Hold for H01 epoch and H08/music false friends and forged display glyph authority. Output is always `CANDIDATE_REQUIRES_SEMANTIC_REVIEW`, `normativeForce:NONE`, `ratified:false`. Full semantic legitimacy requires independently selected source bytes and human review.
4. `evaluateTwelveHouseReadiness`: distinguish 1,008 domain and 720 epistemic addresses, require twelve source-backed House reviews, non-offsettable binding rights checks, and dimensioned stock-ledger closure before even returning an unverified candidate. No welfare scalar, scientific proof, legal judgment, or approval is generated.\n5. `projectTypedHsnCoverage`: validate an entire 1,728-coordinate source-reported structural input, 7 domain and 5 epistemic nodes per Sphere, reject duplicates/missing locations/unsupported evidence assertions, and project to 12 House summaries without confusing method-source counts with welfare. This map is explicitly information-losing and not an original registry byte attestation.

## Observed broker limit and semantics

The connected broker create-room interface advertises **500 messages, 30/member, 10 hops and 1,440 minutes** as maxima. The previously active Work room was configured for **200, 20, 10, 1,440**. The account-capacity endpoint separately reports a 200 stored-room default cap, 4,096 stored-room hard maximum, and retired rooms still count in stored-cap mode. These are different budgets. Do not install maxima without fresh trusted host capability and policy checks. Room changes remain guarded by creation/start/expiry; no automatic continuation is implied.

A self-declared `memberId`, accepted webhook and connector-account authentication do NOT prove an independently authenticated participant or model. Auto-subscribe requires the actual host publisher to implement scoped, revocable event delivery after explicit opt-in; the tool API alone does not supply this facility.

## Mathematical and semantic grounding

Ariadne coordinates Hxx.Sxx.Nxx form a 12³=1,728-position address lattice; 1,008 DOMAIN_SPECIALIZATION and 720 EPISTEMIC_META positions are index roles, not measured outcomes. House-level 12D projections cannot invert the 1,728-position source state. Rights, physical resource flows, epistemic confidence, observed effects and normative CANON adoption remain separately typed. Glyphs KG8, KGC8 and synthetic plate-mode GF7 have different provenance and meaning; identical dimensions never confer an automatic equivalence.

The compiled 239-article CANON source SHA-256 is recorded as `75b57bc4c5c6d1e068e4e6467f26a5e46bcac5402673553ef13a00a808bfff43`. Ariadne v0.7 SHA-256 is `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`. These are source-reported anchors, not active-host attestation. The 223/283-coordinate CANON drafts remain distinct, unratified editions.

## Tests and release gates

`node --test packages/atlas-one-v2/test/civilizational-contract.test.mjs` exercises room limits, expiry, host/account mismatch, consent, private-mode rejection, spoofed glyph/HSN semantics, typed House coverage, nonoffsettable rights and physical stock closure. Run `node --jitless --test ...` for an additional deterministic check. Local tests do **not** establish live host identity or working event subscriptions.

Before any publisher mount: signed-in two-account tests; actual Work opt-in, room expiry and unsubscribe; D1 READ/RETURN revocation and cache denial; event delivery/receipt/notified vs read vs replied separation; zero auto-import of Play/Social/Imagine/Brain/Palace; source-locked CANON→HSN positive and false-friend negatives; actual served HEAD and rollback evidence. Until those pass: **HOSTED_VERIFIED=NO / CANON_ACTIVE=NO**.

## Review source

Owner-private editorial working note exists in the user's connected Google Drive. Its link, contents and access controls are not exported into this public source candidate.

\n**Current isolated local evidence:** 27/27 Node.js v22.16.0 tests PASS normally and 27/27 under `--jitless`; full app/CI and hosted permissions remain HOLD.\n
