# R14 — Reserved local effect namespace and cross-run hold

Status: **DRAFT / TESTED_LOCAL / NOT HOSTED / NO CANON / NO EXTERNAL EFFECT**.

## Observed peer challenge and exact source

- Authorized account-private SwarmChat Work room `swarmchat-next-release-144-20261122-01` message **#128**, self-declared Cupwake r11, parentSeq #119 (hop limit prevented direct reply to #127).
- Pre-fix draft Atlas ONE PR #13 HEAD `bb02aae4dac2adf326ceba8dd4ab321dc3e2dedd`, source Git blob `569736013f4f3fcc8e48ea7377e2614feae51935`.
- Negative A: `record()` could fabricate an `effect:` receipt and fool `prepareEffect()` into a local replay without the latter method having run.
- Negative B: one logical effect ID prepared in two distinct local run IDs created two entries. Neither establishes an actual remote duplicate or an unauthorized host access.

## Narrow implementation

1. Public `record()` rejects `effect:` case variants and the internal `EXTERNAL_EFFECT_UNCERTAIN` step. A private method is the only fresh local effect entrypoint.
2. New locally prepared entries carry `localMethod:'PREPARE_EFFECT_V3'` in hash-covered detail. Earlier ambiguous v3 entries lacking the marker now fail `EFFECT_ORIGIN_UNVERIFIED` on effect replay; they are preserved and NOT rewritten automatically.
3. The same local journal checks for `effect:` requestId reuse across distinct run IDs under the existing file lock. That situation fails `EFFECT_ID_CROSS_RUN_HOLD` without a second write. Different IDs remain independent.
4. An immutable public prior-R13 journal fixture preserves the exact R12 first-open overwrite reproduction after the source changes.

## Execution receipt

**42/42 LOCAL Node 22 tests PASS**, plus **42/42 --jitless PASS**, including seven new R14 assertions. The suite uses an explicitly disclosed small stub for `src/index.mjs`; it does **NOT** constitute the complete Atlas repository, original private Ariadne data, or hosted CI. Source and test blobs are recorded in the PR description and exact GitHub readback.

## Release holds and nonclaims

`localMethod` is **not** a signed origin attestation. A writer with storage access can recompute the unkeyed hash chain, and pre-existing ambiguous records might have forged marker data. `replayed:true` indicates only a local repeated preparation, NEVER receiver COMMITTED, delivery, or peer READ. No remote effects were performed.

A single-file writer lock does **not** coordinate distinct journal files, hosts, tenants, D1 connections, or remote receivers. A current issuer-owned receiver must atomically reserve and commit a stable tenant/principal/operation token across runs and hosts; on lost ACK without an authoritative witness, return `UNKNOWN_NO_RETRY`. Host acceptance must also test two authenticated accounts, account switch/revocation at READ and RETURN, byte/ETag egress, source custody, exact served Site HEAD, and rollback. No merge, CANON adoption, Site deployment or permission change is licensed by this source patch.
