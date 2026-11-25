# Atlas R15 — immutable-by-copy issued-score receipt

**Status:** TESTED_LOCAL / DRAFT_REVIEW. Additive follow-up to source-verified R14 on draft PR #76. No source authority, training, model, host, CI, main-branch release, or private-mode import.

## Reproduced defect (original R14 exact source preserved)

`Object.freeze({ scores: clean, beBytes: binary, ... })` froze the receipt object but left its native nonempty TypedArray and Node Buffer mutable. A client could alter `receipt.scores[13]` or `receipt.beBytes[0]` after computation while the stored `rawDigest` remained unchanged. On the original implementation, a focused nine-test new suite recorded **5 pass / 4 fail**; the four failures independently demonstrate the two exposed mutable aliases for Float32 and Float64.

## Minimal fix

Retain original strict native type brand checks, exact 1,728 indexed descriptors, finite score requirements, shared/resizable/detached rejection, signed-zero binary digest, and unchanged PR66/PR67 issued page contracts. Keep committed `clean` and `binary` lexical/private. Make the frozen receipt's `.scores` and `.beBytes` *own read-only accessor properties* that return **fresh native copies** on every read. The public consumption interface remains a genuine Float32Array/Float64Array and Buffer; consumers cannot mutate retained state via a previously retrieved alias.

No second neural computation is introduced. The existing R34/P73 bridge reads those snapshots synchronously, and all peer tests pass. The accessors themselves are trusted local implementation functions, not untrusted user-defined objects.

## Executed tests

- Focused **nine** new regression tests: 9/9 PASS in normal mode, including four direct mutable-alias reproductions.
- Combined previous 207 and new nine = **216/216 distinct Node tests normal**, **216/216 `node --jitless`** (fresh extraction also required).
- Original private Ariadne v0.7 source remains SHA-locked `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`.

## Separate owner-private Sphere145 source audit

A new source-only Python Work review engine performed **144 distinct source-specific Sphere contract computations + 12 House summaries + one E145**, using the exact original Ariadne registry and owner-private derived `sphere_profiles.json`. **18** of the derived profile `profile_sha256` claims do NOT match canonical serialization of their record bytes; 126 match. All 144 are structurally evaluated, but the 18 discrepancies remain HOLD. It also executes 924 synthetic adversarial cases; those are not real MacroTurns, specialist knowledge, actual source evidence, or human-reviewed semantics. That source corpus and its review records are NOT copied into this public PR.

## Negative and release limits

No actual selected-0.3 authenticated issuer is integrated in this revision; the private original registry is not published. Even an immutable numerical snapshot is not source authorization. Current READ/INFERENCE_USE/RETURN, independently complete negative evidence, monotonic cross-worker ABA checks, and atomic network delivery remain separate host requirements. Retain old source history and known negative results. The 24-opportunity Work/Play/Social/Imagine/Dream/Quiet/Explore balance and user-owned scheduling remain unchanged.

Reviewers should test this exact generic numerical accessor with PR77 Home and PR75/PR74/PR73 peer adapters before any promotion, and compare current head/blob SHAs. No automatic merge or deployment.
