# Telescope add-on — R07 source-only 12-pass engine

Import `runTelescope` or `runTelescopeRounds` from `./src/telescope/core.mjs`. Supply exact operator-authorized R07 plan bytes and their separately grounded digest. The original private R07 data must never enter the public Git tree.

Run 12 stages once: `runTelescope(raw,digest)`.
Run 12 successive whole-build rounds: `runTelescopeRounds(raw,digest,{rounds:12})` (finite local computation, NOT a scheduler).
Continue a later authorized evaluation from a verified head: `runTelescopeRounds(raw,digest,{rounds:12,fromHead:previousFinalHead})`.

Use the CLI `node examples/run-telescope-12.mjs /PRIVATE/plan.json /PRIVATE/report.json [prior-head]`. Verify from a separate Python implementation: `python tools/verify-telescope.py /PRIVATE/plan.json /PRIVATE/report.json [/PRIVATE/R07-work-preflight.json]`.

The result is data-only source review. All reported Work, host, model, consent, science and Iron Empire story-CANON effects remain NONE. The source-test/host gate details are in `docs/ATLAS_TELESCOPE_12_PASSES.md`.

**R2 source-integrity correction:** `prepareSwarmChatEnvelope` refuses caller-owned source dictionaries even when they contain plausible hashes. First obtain a frozen, in-process source capability with `bindR07WorkSource(rawOwnerPlanBytes, expectedPlanDigest, coordinate)`, which verifies the complete R07 catalogue and admits only its original Work source record. This is source-shape proof only, **not** a trusted issuer or current READ/RETURN grant.
