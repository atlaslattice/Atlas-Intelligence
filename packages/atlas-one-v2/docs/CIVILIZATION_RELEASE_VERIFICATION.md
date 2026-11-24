# Atlas ONE integrated v3 — source and release verification

**Source input:** Original Ariadne v0.7 exact SHA-256 `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6` (2,187,541 bytes). Previous META145 R14 manifest SHA digest `b8a2eb39bdd59347b3e935ab537b348418d76d4c1bcd33a222118a59fda14310`; all seven materialized predecessor outputs remain unchanged. The source and output database are owner-private, not uploaded into public GitHub.

**Local complete run:** exactly 1,728 original nodes (1,008 domain + 720 epistemic methods), 144 unique original-Sphere execution receipts with verified source-child hashes, 12 House functional modules with twelve performed local source/schema checks each, one integrated content hash chain, zero hosted effects and no semantic approvals.

**Checks to reproduce:** Node `--test test/civilization-unified.test.mjs` with the authorized original file and outputs; repeat under `--jitless`. Without private source, test cases dependent on it are SKIP, not success. Python `tools/verify.py` independently checks exact source records, hash-chain ancestry, output manifest, modules and source scope; `tools/test_independent.py` deliberately corrupts payloads, metadata and authority claims and expects HOLD. `tools/browser_qa.py` exercises 12×12 House/Sphere controls, whole-node search and 48-per-page pagination on desktop/mobile Chromium and no external requests.

**User-visible app:** One standalone responsive HTML artifact, generated with original source metadata; viewable offline without a connected account. Only owner-private download, not a hosted SwarmChat Site deployment. Does not perform real login, post, change CANON, or read Play/Social/private Brain/Palace.

**Remaining gates:** GitHub CI step-level result, publisher-owned Site deployment, exact signed-in UI and mobile client, two-account Work authorization+revocation at RETURN, model evaluation, scientific expert review, fictional author acceptance, and rollback rehearsal.
