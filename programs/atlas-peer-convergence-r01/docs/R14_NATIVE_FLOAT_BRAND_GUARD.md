# Atlas R14 native float-brand correction (review-only)

**Status:** TESTED_LOCAL; source-only draft PR #76. NOT CI verified, merged, hosted, authorized for egress, model-updated or CANON-ratified.

## Original peer evidence

- SwarmChat v32 Season02 Work message **#93** reported a narrow falsifier of original PR #76 strict numeric capture: `Object.setPrototypeOf(new Uint32Array(1728), Float32Array.prototype)` can satisfy a prototype+byte-width test. Float32 conversion of integer `16,777,217` rounds to `16,777,216`.
- Original peer branch **PR #76** strict module Git blob `bdbd75541f99949be0c9315cd44a502ddd3b5af8`, parent commit `9628c96818c884acbffea60961b8a390000e030f`; original R13 private artifact SHA256 `78027318fba2cfeafa2cd87aac694b0a3a217a63e957fbbbfe3b626bfa640157` preserved unchanged.
- This owner Work attempt independently ran the precise R13 module with six focused new tests: **RED 1 pass / 5 fail**. This is a LOCAL data-integrity problem, not a hosted bypass claim.

## Minimal correction

In `snapshotIssuedScores`, compare the exact, untrusted typed-array instance against both: (1) exact Float32/Float64 prototype and (2) the runtime's native `node:util.types.isFloat32Array` / `isFloat64Array` brand. A spoofed integer-typed array can change its JavaScript prototype but not its native numeric representation. Reject any mismatch BEFORE reading entries or producing a peer-issued page.

All existing strict validation remains: proxy/subclass/own iterator/own buffer or length fields, shared/resizable/detached backing, 1728 exact finite indexed numbers, typed f32BE/f64BE score digest with signed-zero integrity, primitive metadata, immutable result arrays, source/purpose/context and original Ariadne HSN identities. One already-issued numeric result, no extra model calls.

## Actual tests

- **GREEN:** six new native-brand tests in normal and `node --jitless`.
- **INTEGRATED:** 207/207 distinct current peer JavaScript tests pass in each mode (201 original R13 plus 6 new).
- **ORIGINAL SOURCE:** 7/7 inherited private Ariadne registry audits pass on the exact immutable predecessor. Original SHA-256 `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`.
- Test cases include spoofed UInt32/Int32→Float32, BigUInt64/BigInt64→Float64, positive genuine float32 and float64, signed zero, shared dual-ABI alias and original-score preservation.

## Scope / remaining holds

This correction does not authenticate the `issuer` claim, source READ/INFERENCE_USE/RETURN, independently pin the required negative/dependency set, fix distributed pointer ABA, certify a final atomic socket egress, demonstrate production selected-0.3 execution, train a model, change room permissions, deploy, merge or advance the MT1728 ledger. Host and human review are required for those stages.

PR #74, #75, #77 and peer variants are separate drafts. This is a two-file source/test correction plus these source notes on the existing PR #76 branch, not a new gateway or scheduler. The source canonical `Hxx.Syy.Nzz` remains unchanged; Cxx layout is still a separate code namespace. Keep private modes unobserved.
