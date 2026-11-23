# Atlas ONE v2: R07 civilization circuit → existing Work Burst (candidate)

**Status:** EXACT PRIVATE R07 INPUT REPLAYED / SOURCE-ONLY CHECKS TESTED LOCALLY / DRAFT / NOT HOSTED / NOT CANON. This module never invokes a model, writes to the SwarmChat broker, grants a right, approves a semantic link, executes a real R07 Macroturn, or reads a private Palace, Brain, Social, Imagine, Play, Dream or Quiet body.

## Why this adapter is different from another 1,728-task planner

R07 is the owner-selected, derived Ariadne v0.7 **civilizational build-plan candidate**: 1,728 distinct H/S/N source identities, 144 Sphere perspectives, 12 House follow-ups, and per-node proposals for **SwarmChat, Atlas ONE and Ariadne**. It is not the same namespace as NEXT1728 software modules, NEXT144 sphere initiatives, 144 release tasks, or PR #24's synthetic code route registrations. Source labels are never used as join keys. The adapter **does not invent or reassign R07 tasks**; it consumes the exact owner's private plan and exposes only source-pin summaries to existing Work Burst.

This is a **child of Kettlefern's R2 symbiosis review PR #24**, itself on [#21](https://github.com/atlaslattice/Atlas-Intelligence/pull/21) → [#19](https://github.com/atlaslattice/Atlas-Intelligence/pull/19) → [#16](https://github.com/atlaslattice/Atlas-Intelligence/pull/16) → [#8](https://github.com/atlaslattice/Atlas-Intelligence/pull/8). Complementary [PR #22](https://github.com/atlaslattice/Atlas-Intelligence/pull/22)'s Whole144 improvement candidates and [PR #23](https://github.com/atlaslattice/Atlas-Intelligence/pull/23)'s NEXT144 source initiatives are *not* folded into R07 by positional matching. Keep independent versions, source digests and dissent.

## Real private R07 replay, November 23, 2026

The **actual owner-private R07 ZIP** was opened from Library `/Atlas 1728 Civilizational Circuit 2026-11-23`, its integrity manifest checked, and its original Python compiler **33/33 tests passed**, beyond the earlier 27-test summary. Its complete node plan SHA-256 is `8c6d0af535e7937eafdf406bc4d8f4bd196fdcd186389f2c1d5f543cc66f292d`; edition is `Ariadne v0.7`, original-registry SHA `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6` **source-reported, not independently rehashed from the original registry in this adapter**. Its raw node plan and `sourceReference` fields remain owner-private, not in Git.

**Actual private node-plan counts:**

| Source status | Records | Adapter treatment |
|---|---:|---|
| `PLANNED_NOT_EXECUTED`, suggested `WORK` | **1,248** | Allowed to enter **local source-pin checks**, never actual authorized execution |
| `PLANNED_NOT_EXECUTED`, suggested `PLAY/SOCIAL/IMAGINE/DREAM/QUIET` | **480** | Protected, **excluded** from Work Burst, no bodies or voluntary activity copied |
| Existing R2 **synthetic structural route registrations** | **1,100** | 796 overlap Work candidates; 304 overlap protected candidates. **No source/semantic equivalence.** |
| Genuine implemented R07 tasks | **0 established** | No work upgrades, hosted adoption, or model turn inferred |

The complete Work-only batch operation runs **13 local Work Burst invocations** of 96 bounded `LOCAL_R07_PIN` source checks: **1,248 distinct structural preflight checks**, **zero actual R07 tasks implemented**. Parent Work Burst is unchanged. The bridge is read-only and uses fixed audited local handlers; no arbitrary Work handlers are accepted. Its outputs are task fingerprints, exact edition/digests and self-described synthetic route availability, **never private node names, House source text, or untrusted code**. Additional optional commit-receipt intake remains unverified/held and cannot turn a claimed `COMMITTED` or test count into actual implementation.

## Independent nontrivial review of Sphere / House evidence

The private R07 ZIP contains a gzipped **248,832-row** *materialized* Sphere×node matrix, 144 Sphere summaries and 12 House summaries. A separate Python verifier checks the actual compressed archive SHA, all 248,832 ordered coordinates, role axis and source scopes, then 144 Sphere↔12 House relationships. Independently verified matrix scope counts: 1,728 native Sphere members, 19,008 distinct-Sphere same-House checks, 228,096 cross-House review-only checks. No cross-House lexical similarity is an approved semantic link.

**Accounting clarification:** Narrative `269,568 = (144 + 12) × 1,728` is an arithmetic Sphere-plus-House viewpoint total. But the House follow-up file reports **20,736 “nodePerspectiveAudits” per House** (= twelve constituent Sphere scans × 1,728), totaling 248,832 — the same scans already counted by the Sphere matrix. **No separate 12 × 1,728 House×node matrix is materialized in the R07 ZIP.** Thus this adapter independently verifies 248,832 actual Sphere×node row records **plus 12 House summary artifacts**, not a separate authenticated 20,736 House-node receipt corpus. Hold any stronger nonduplicated-evaluation claim for source reconciliation.

## Source-only acceptance contract

1. Owner selects an exact private R07 JSON plan and separately trusted 64-hex SHA. The code checks raw bytes, UTF-8, 34-field source shape, 1,728 ordered unique coordinates, Ariadne v0.7 role (S01–S07 domain, S08–S12 epistemic), source digests, initiative IDs, consent/authority holds, and all original `PLANNED_NOT_EXECUTED` statuses.
2. Only records already labeled `WORK` enter a local batch, max 96. Protected records remain sealed, never mutated or counted as performed. The public code sees only an operator-supplied private file path at runtime; **no private input is committed to GitHub**.
3. The local handler inside `executeLocalWorkBurst` proves **source-plan fields matched the pinned private input in this process**, not rights, a real task's implementation, a live Work message, human approval or researcher identity. Each sealed local output has `completedMacroturns:0`, `hostVerified:false`, `canPublish:false` and `authorityEffect:NONE`.
4. A source-scoped implementation receipt candidate can cite a purported Git commit and test count, but always returns `EVIDENCE_RECEIPT_CANDIDATE_NOT_VERIFIED`, never a completed Work task. Only a separate issuer, current Work rights at READ and RETURN, independent CI, source-specific human review and rollback can later change the accepted implementation state.
5. PR #24's 1,100 callable R2 synthetic rules have `sourceEdition:synthetic-hsn-v1`, so no original R07 digest or semantic/rights identity equivalence is silently inferred from matching coordinates. The 628 unregistered R2 coordinates remain unregistered, though all 1,728 have R07 planning records.

## Reproduce locally (only authorized owner-supplied files)

From `packages/atlas-one-v2/`:

```sh
node --test test/*.test.mjs
node --jitless --test test/*.test.mjs
node examples/r07-workburst-preview.mjs /private/R07/node_build_plan_1728.json 8c6d0af535e7937eafdf406bc4d8f4bd196fdcd186389f2c1d5f543cc66f292d > /private/R07/r07-work-preview.json
python3 tools/verify-r07-work-preview.py /private/R07/node_build_plan_1728.json /private/R07/r07-work-preview.json generated/generated-node-routes.mjs
python3 -O tools/verify-r07-work-preview.py /private/R07/node_build_plan_1728.json /private/R07/r07-work-preview.json generated/generated-node-routes.mjs
python3 tools/verify-r07-perspectives.py /private/R07/extracted-zip
```

The R07 original compiler was separately exercised with `python3 -m unittest discover -s tests -v` inside its owner-private ZIP. The exact-source integration regression suite adds 34 Node tests; tests use **fabricated synthetic data**, not the private R07 dataset.

## True next engineering gates

- Independently verify the actual served v32 broker / Work D1 principal+tenant, current READ/RETURN rights, revocation between stages, and idempotent effects. A source-only batch is not a model wake or saved Work delta.
- Reconcile actual 144 NEXT144 sphere initiatives and exact R07 node task passport before offering `MAG-xxxx` to a real Work room; avoid equating positional `Hxx.Sxx.Nxx` with `Nmm.ww.oo` or code route index.
- Preserve R07's private non-Work opportunities outside Work analytics and any accountability/merit scores. No forced Play/Quiet, no background polling, no automated human governance.
- Diagnose GitHub Actions runner-admission errors and obtain a **passing current-head hosted CI** result before merging stacked drafts. No automatic Site, broker, CANON or IAM changes.

**Bottom line:** The 1,728-coordinate plan can be consumed immediately as a *source-pinned offline Work review queue* with bounded, reproducible receipts; actual implementations, verified specialist reviews, semantic edges, and hosted permissions remain future independent tasks.
