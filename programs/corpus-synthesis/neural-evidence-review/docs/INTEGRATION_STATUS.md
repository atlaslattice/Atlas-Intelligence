# MICA × Atlas Neural: one additive integration seam (R02)

**Date:** 2026-11-24  
**Classification:** PUBLIC-SAFE SOURCE-ONLY / MOCK RIGHTS / LOCAL TESTED / DRAFT.  
**Not:** pretrained model update, production deployment, trained new weights, host-signed rights decision, or new FINAL evaluation.

## A + B = C

- **A — MICA:** `kit/pretrained-entry.mjs` → `createPretrainedEntry({owner,authorize,hostOwnedFinalReturnSync,servingDecisionPath})` reported by MICA in the authorized Work room. BGE-small 384 native features, 1,728 preserved ontology identifiers and a **consumed once** 24-question FINAL silver panel (23/24 Hit@10). Exact private application source and weights are **not mounted or independently replayed here**. Do not reinterpret the panel as development data.
- **B — peers:** explicit inference-use vs disclosure distinction (#75/#81/#83), off-result influencing-source revocation (#31/#47/#70), source-family/correction lineage (#3/#4/#9), mock family testkits (#18/#24), parameter-matched ablations (#15/#69/#82), covered-corpus STORAGE_HOLD (#33/#39/#57), typed glyph navigation-only (#22/#32) and training-publication withdrawal (#68/#73).
- **C — this patch:** `stageNeuralEvidenceReview` composes the existing `reviewPostrank` fixture with a **complete local influence-inventory contract**; it checks INFERENCE_USE on every contributing source (including off-result), DISCLOSURE_RETURN only on emitted sources, refuses UNKNOWN purpose, refuses stale/mismatched source identity for the full page, and conditionally permits filtering revoked rows **only when per-item independent scoring is verified by a trusted issuer**. A separate `evaluateCorpusCoverage` rejects unavailable storage/decryption/rights metadata and never treats inventory size as retrievable text.

## How to run (dependency-free Node.js 22 and Python)

```bash
node --test test/postrank-lineage-fixture.test.mjs test/neural-integration-seam.test.mjs
node --jitless --test test/postrank-lineage-fixture.test.mjs test/neural-integration-seam.test.mjs
python -m unittest discover -s test -p test_frozen_panel_bounds.py -v
python -O -m unittest discover -s test -p test_frozen_panel_bounds.py -v
node examples/three-source-integration-demo.mjs
```

Exactly **91/91** Node tests in each Node mode, **26/26** Python tests in each Python mode. The new integration test suite includes **59** cases; 32 prior postrank controls and 26 prior paired protocol controls are unchanged.

## Security and truth boundaries

This package **does not prove actual permissions**. In tests, callbacks called `host.*` are user-owned **mocks**. The real host must derive tenant/session/principal, source manifest/epoch, influence dependencies, and purpose-specific permissions; it must bind the current decision atomically to **actual final response egress**. It must separately enforce source READ, INFERENCE_USE, TRAINING_USE and DISCLOSURE_RETURN as defined in its verified host policy. The current workshop specifically notes that generic READ is not proof of permitted inference and denied quotation on an uncited source is not necessarily denied inference. This adapter does not infer purpose from such labels. For source inventories larger than 64, the local review contract uses an explicitly supplied batch permission transport, up to 256 source decisions per call, with full receipt-order and epoch checks. A 924-source mock therefore uses eight batch calls across two checks rather than 1,848 per-item calls; this is **callback accounting**, not a measured hosted latency gain. No batched result is a real host permission attestation.

The local gate checks all listed dependencies; no caller-owned list can *establish* completeness. If the exact trusted host influence manifest is absent, the production integration must HOLD rather than trust a guessed list or a 924-pool count. Unknown listwise/coupled scoring remains HOLD on selective filtering. Training-positive export remains false even for a locally consistent record. Neither source identifiers nor source text appear in output receipts. A pass leaves CANON effect `NONE`.

The `evaluateCorpusCoverage` positive result is explicitly `LOCAL_COVERAGE_METADATA_CONSISTENT`, **not FULL verified**, even when its input claims decryption/rights and a complete chunk list. For MICA's observed `STORAGE_HOLD` state, the status is HOLD. A 248k-record inventory cannot establish usable full-corpus access.

## Compatibility / no duplicate controller

This code stays inside `programs/corpus-synthesis/neural-evidence-review/` and imports the original R01 postrank fixture. It **does not replace** the Work Learning gateway being composed by Estuary, MICA's private entrypoint, the selected neural model, or Atlas ONE/SwarmChat brokers. Its demo is synthetic, standalone, and never posts. After independently reviewing MICA's exact code and host ABI, useful assertions can migrate into the existing final-return path rather than mounting this shim in parallel. Keep original peer artifacts attributed and unmerged unless exact compatibility tests pass.

### Required next host acceptance

1. Obtain MICA's exact source and model/index pins without exporting private corpus; map its candidate fields to existing source/revision/record hashes and source-family attestations. Refuse silently substituting `sourceSha256` for `recordSha256`.
2. Verify entire influence manifest from host-owned index/training provenance. Run a rejected off-result dependency and a disclosure-denied but inference-eligible uncited dependency. If inference-use purpose semantics are unknown, HOLD.
3. Reproduce final async-gap revocation, cached-vector source substitution, changed citation without vector changes, all-ineligible abstention, crash/restart rights epoch, paired direct-neural/graph/lexical route labeling and source-replacement checks against exact server code. Current test mocks are insufficient.
4. Verify storage, decryption, per-chunk read and current source/training eligibility before training or claiming exhaustive recall.
5. Maintain the already-consumed FINAL silver panel untouched. Preregister and create a **new human-reviewed, family/time-disjoint** evaluation; compare frozen dense, equal-**active**-parameter flat, true and shuffled *internal* hierarchy at equal data/candidates/compute and no-answer tests. Report by House/Sphere only with adequate independent families.
6. Check actual signed-in SwarmChat/AtlasGPT integration, host permissions and CI runner admission with executed steps/logs before merge or deploy. No billable actions authorized by this source-only patch.

**Peer handoff:** [MICA workshop](https://swarmchat-private-broker-20261112.tdavesheldon.chatgpt.site/?room=atlas-lattice-neural-engineering-20261124-01). The prior additive Git [PR #58](https://github.com/atlaslattice/Atlas-Intelligence/pull/58) is the review destination. The owner should prefer Estuary's single service/gateway integration lane if both approaches are compatible; no silent merge or double invocation.
