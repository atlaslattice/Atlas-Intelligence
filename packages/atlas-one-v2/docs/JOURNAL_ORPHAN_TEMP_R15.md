# R15 — Atlas ONE local journal orphan-temp recovery

Status: **DRAFT / SOURCE_TESTED_LOCAL / NOT CI_VERIFIED / NOT HOSTED / NO CANON EFFECT**.

## Source and falsifiable negative
Pinned parent PR #13 head before this repair: `d370e0c447613121d64a56b6db44099b9b009a44`, `src/journal.mjs` exact Git blob `0cdff1687e4216a025902dd223b87e6c6d1969c9`.
The old `#atomicWrite()` used `this.file+'.tmp.'+process.pid` with exclusive `'wx'`. A crashed write can leave this file behind; a subsequently reused OS PID makes every fresh constructor or record fail with `EEXIST`, even though the on-disk v3 journal and its hash chain are intact. This is LOCAL availability, not evidence of remote receipt duplication or a hosted exploit.

**Actual old-source negative executed:** create a real v3 journal, place `journal.json.tmp.<current_pid>` containing `ORPHAN_CREATED_BY_PRIOR_INTERRUPTED_WRITE`, call `record(...)` => `EEXIST`. The orphan was preserved, and the existing journal remained schema-valid. The test uses synthetic local data only.

## Reversible minimal repair
- Change temp allocation to `this.file+'.tmp.'+process.pid+'.'+randomUUID()` using Node's standard crypto module. The existing exclusive `'wx'`, 0600 mode, file fsync, atomic rename, directory fsync and writer lock are preserved.
- Do not inspect, copy, delete, trust or automatically recover abandoned old temp files. The active lock remains authoritative; this patch does not allow bypassing lock contention or stale-lock holds.
- Add six real Node test cases: interrupted-write orphan during record and constructor; no new orphan after success; idempotent replay; held writer lock; explicit `NO_REMOTE_RETRY_WITHOUT_WITNESS` on prepared external effects.
- All **48/48 real Node v22.16.0 tests PASS** normal and **48/48 --jitless PASS** against the checked R14 package plus the R15 patch; 42 existing + six new. Old negative reproduced before patch.
- Exact GitHub readback after patch: journal blob `458c1fc71903cdad2bdfc38fdb709e11fda241a7`; new test blob `a74cdb31faccdc841f99db155c89993cb2c78ccf`.

## Acceptance HOLD
This does **not** claim full original Ariadne/private fixture tests, published binary, GitHub-hosted passing CI, a trusted issuer, distributed D1 atomicity, global exactly-once remote effects, tamper-resistant audit, or a release/permission/CANON decision. The journal remains a *single-local-file* durability primitive. The publisher must verify the exact original package and full workflow run with executed steps, current host revision, authenticated READ/RETURN and rollback before promoting any dependent PR. Do not silently merge the stacked draft branches.

Follow-up: independently exercise a controlled interrupted-write after `openSync(...,'wx')` on the actual target operating system; verify source bytes, preserved journal head, no secondary external sink effect, and incident recovery procedure.