# Atlas ONE v2 journal receipt binding — DRAFT source repair

**NOT HOSTED • TESTED_LOCAL_SOURCE_EQUIVALENT • MIGRATION REQUIRED • NO CANON/permissions/deployment.** Branch started from parent PR #8 exact HEAD `8310db76277bb3860fdfde3c08d66bb20e43b23d`. This companion is deliberately non-merging while the parent and host remain held.

## Reproduced flaw on exact unchanged source

Historical `src/journal.mjs` Git blob `1e7562f66ce41e511e575471649dc336075f7243` used v2 event hash:

`digest({runId,seq,step,detail,prev})`

But durable replay authority looked up **`requestId`** and validated **`inputDigest`** independently, without committing either to the event hash. An untrusted or accidentally modified local journal file could change `runs[id].events[0].requestId` from `req-111` to `req-222` and change `inputDigest` while leaving all existing v2 hash-chain checks valid. A subsequent replay of `req-111` appended another event (rather than returning `replayed:true`). This is a **source-level local-file journal integrity/idempotency gap**, **NOT an observed live broker duplicate delivery or a demonstrated attacker with filesystem access**.

Exact old source was reproduced from its Git blob SHA-1. A Node 22 negative control intentionally demonstrated the old silent replay `seq=2, replayed=false` after a modified `requestId` and matching altered `inputDigest`.

## Candidate v3 repair

- Fresh local journals now use schema version 3, binding `inputDigest` and `requestId` into every event hash along with `runId,seq,step,detail,prev`.
- Verify requestId grammar and **uniqueness within each run**, plus all existing chain, hash, step and run checks.
- **Never silently rewrite historical v2**: ordinary open or append of a v2 file fails `LEGACY_JOURNAL_HASH_UNBOUND`. To inspect original v2 history without modifying bytes, explicit `new AtomicJournal(path,{readOnly:true,legacyRead:true})` is required. Such inspection adds `integrity:'UNATTESTED_LEGACY_REQUEST_BINDING'` for each returned run. No automatic promotion of old receipts, migration, delete, or replay.
- `prepareEffect` retains `EXTERNAL_EFFECT_UNCERTAIN` and **NO blind remote retry**.
- The change intentionally introduces a **v2↔v3 file format incompatibility**, which must be reviewed with the parent engine and owned migration plan before merge or default release.

## Reproducibility

- Local Node 22.16.0 `node --test test/journal-receipt-binding-v3.test.mjs`: **14/14 PASS**.
- Local `node --jitless --test ...`: **14/14 PASS**.
- A separate old-source negative-control `node --test test/repro-original.mjs` reproduced the old bug (**1/1 passed expected-bad witness**), not a fixed feature.
- New v3 implementation Git blob `9498b4d7849a645e599914d5cc1962ec767452a4`, test blob `7aad8d713b3be8c6b2b1701eee0fb5c238c6b849`: locally generated files were byte-matched with GitHub readback.
- Source equivalent local harness uses a narrowly reconstructed `index.mjs` canonical/digest/Hold import. It is **not** a byte-identical complete repository suite or independent GitHub CI.
- Negative test explicitly demonstrates that an attacker able to edit the journal and recompute **unkeyed** hashes can still forge v3 records. V3 detects unrecomputed changes and fixes field omission; it is **not a digital signature, platform identity, remote exactly-once guarantee, or tamper-proof archive**.

## Independent acceptance gates

1. Current parent PR #8 HEAD and any stacked companion branch reconciliation; full original repository Node suite and actual hosted GitHub Actions executed steps/logs.
2. Audit existing v2 journals, permissions, backups and historical receipt provenance. Preserve original bytes. Design a separately reviewed explicit migration or continue v2 read-only; never trust old `requestId` as durable replay authority.
3. Prove one host-owned idempotent receiver/sink, current tenant/principal/room/rights epoch, original source bytes digest, and atomic rights-at-RETURN. Reproduce W/E/D, cross-account, ACK-loss, crash-after-effect, and denied cached response.
4. Publisher-controlled served HEAD, rollback, independent privacy review, and CANON human governance remain held. **No deployment, grant, private-mode harvest, external model run, or merge in this PR.**

Source peer input: SwarmChat authorized Work #122 (Cupwake, self-declared) emphasized sink-side idempotency, lost-ACK, and durable receipt witnesses. This patch narrows one **different local journal** failure; it does **not** implement Cupwake's remote receiver contract.
