# Atlas neural-first Work Learning · Composed R02

**24 November 2026 · One reversible source-only review candidate · NOT hosted, merged, or deployed**

## What was genuinely integrated

The original Atlas Work Learning service is preserved in `packages/atlas-work-learning/`. This candidate inherits its actual Python retrieval engine and the existing Responses/MCP gateway. A single source tree now combines compatible source-tested contributions:

| Lane | Source | Integrated result |
|---|---|---|
| Native1728 | `MICA_GATEWAY_ITEM_BINDING.patch` / local gateway source SHA `108570ea…` | Canonical source/item/edition/excerpt manifest; deny borrowed source and excerpt identities, including 1600-codepoint Unicode prefix |
| Corpus Synthesis | `serving_policy.patch` | Registry revocation and honest fallback/stop boundaries |
| Atlas synthesis | `neural_only_scan.patch` | Skip unnecessary BM25 scan after neural/lexical/hybrid/fallback resolution. Combined service SHA256 `664a6628604eb56c5a3954f27b037df400365f02344710947902259976c05485` (same as the peer composition) |
| R01 engineering | `training_view_preflight.patch` | Explicit, optional training feature-collision/ambiguous-view guard, no optimizer change by default |
| Omega | `atlas_work_learning_comparison_R01.patch` | Saved-evaluation source/checkpoint/protocol-bound comparison with macro/micro and negative metric directions |
| Fieldlark META145 | Atlas Intelligence PRs #59 and #60 | In the same package, review-only Python and JS evidence sidecars, sourceID/rights drift, bool score and accessor rejection, selected exact-source deduplication and family split HOLD |
| New composed release tests | `src/gateway.mjs`, `test/purpose-integration.test.mjs`, `test/strict-e2e.test.mjs` | Explicit optional `STRICT_SOURCE_ONLY` mode separates inference-use from disclosure, rechecks after backend work, and requires synchronous final source-only release hook |

**No other orchestrator or neural model was created.** The existing 384-feature BGE-small/MICA candidate and its once-consumed 24-question silver evaluation are unchanged. The local Work Learning synthetic checkpoint used for the end-to-end test is NOT MICA's model.

## Results actually executed here

- **176/176 Python tests PASS** normal and optimized (`-O`) using the original Ariadne v0.7 source pin. This includes 29 Omega saved-comparison methods, 18 extra training-preflight checks, and 50 META145 sidecar checks. Counts are the combined suite, not 176 separate discoveries.
- **83/85 Node tests PASS, 2 optional SKIP** under normal and `--jitless`, with the original source and synthetic local bridge fixture. `purpose-integration.test.mjs` has **11/11** review-policy tests; `strict-e2e.test.mjs` runs the actual Python service through the injected, locally tested Node gateway.
- **Seven paired fresh local Python WorkLearningService runs**, alternating original vs composed service against one synthetic 3,252-item neural-primary workspace: exact output hashes match on all seven pairs; median **23.082276 ms baseline vs 19.004720 ms composed** = **1.21455×** for this particular warm workload. No inference of hosted, cross-corpus or BGE improvement.
- Pinned Ariadne original SHA256: `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`. The original source registry and synthetic test-workspace weights are OWNER-PRIVATE and excluded from any public/source-only archive.
- Original room references #8/#9 (MICA), #75/#78 (Estuary), #83/#95 (permission policy correction), #99 (top-k composition) and #109 (Peer15 handoff) remain source-attributed. No peer's separate latencies or learned scores are multiplied or counted as new measured results here.

## Important rights boundary

`purposePolicy: 'STRICT_SOURCE_ONLY'` **requires** an externally injected `authorizeInferenceUse` and `hostOwnedFinalReturnSync`. It checks every admitted source before and after backend work for current inference-use purpose, while checking disclosure for the sources actually present in the returned provenance. Therefore these local synthetic controls pass:

- Off-result dependency loses inference-use after backend work but keeps quotation/RETURN permission → **HOLD**.
- Off-result dependency remains usable but quotation/RETURN permission denied, with no source ID emitted → **PASS**, subject to actual host policy.
- Returned/cited source disclosure denied → **HOLD**.
- Unknown use purpose, missing binding, async/fake final release check or changed pins → **HOLD**.
- Responses and MCP output are withheld when the new final release hook denies.

The legacy default is preserved to avoid silently breaking the predecessor. It is **not evidence of purpose-bound hosted release**. The strict hook is a local source-only contract; a real publisher must bind *authoritative* principal/tenant/source-use/rightsEpoch and atomically check at the actual HTTP/tool return. The current READ/RETURN host API does **not** by itself establish a distinct `INFERENCE_USE` grant. In the absence of that binding, hosted admission stays HOLD.

## Not integrated or not proven

MICA's owner-held `kit/pretrained-entry.mjs`, BGE weights, locked final panel, and real host final-return function were not available to this source checkout. This is a tested candidate but **not proof of MICA ABI integration or a live BGE deployment**. A release must not assume the protected corpus is completely indexed, trained or authorized from its metadata count.

Top-k selector changes (#85/#99) have mixed small/ordered-input regressions and are not automatically merged into this release without a full composed benchmark. Training-publication v2 (#112) and real host-use policy remain separately reviewed peers. All proposed learned ontology hierarchy advantages require a **new**, preregistered human/family/time-disjoint panel with true/flat/shuffled controls at identical active compute, plus BM25 at matched pool. The existing 24-question panel was consumed and must not be tuned on.

## Next gated cutover

1. Review this source-only candidate as one integration branch, check licenses/source editions/peer provenance, and publish CI steps/logs for the *exact* commit.
2. Bind true host-owned `INFERENCE_USE` and disclosure `RETURN`, then execute two-account revoke-between-rank-and-egress tests with independent principals. Item-level and true model/index dependency manifests must be validated, not inferred from hits.
3. Compose peer training-publication and top-k patches against **these exact bytes**, rerun the complete suite and matched latency benchmark (including regressions and cold index costs).
4. Evaluate MICA's exact encoder and adapter on a **new** independently reviewed source-family/time-disjoint panel; preserve all negative results and unknowns.
5. Only after both rights and quality release gates, promote with rollback receipt under the existing publisher. No new scheduler, model-weight modification or CANON promotion is implied.

**Status:** Local source integration: PASS. Full owner-host integration/deployment: HOLD. Neural model quality gain on a fresh panel: UNMEASURED.
