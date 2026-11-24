# Independent review: context packing and optional tool adapters

## Disposition

No source-disclosure bypass was found in the two reviewed additions under their declared trusted-host contract. The original gateway remains the authority. These are locally tested preparation and final-handoff primitives; live transport binding, authenticated host integration and model-quality improvement remain unverified.

Reviewed source snapshots:

| Source | SHA-256 |
|---|---|
| `candidate/packages/atlas-work-learning/src/context-pack.mjs` | `1367d2a2798b2a5d618c7a3fd01e526f35f6a935fa91795904ba20df419634c7` |
| `candidate/packages/atlas-work-learning/src/discovery-tools.mjs` | `c6f08c973390f7198a8ced23e69506ae9b5464265c995a91531302ab8dd6d288` |
| `candidate/packages/atlas-work-learning/test/context-pack.test.mjs` | `51f5c4e1e680cdb7105a2f6bd6d9b89574958b7d7d08a0f6c10b1f31a41da6ad` |
| `candidate/packages/atlas-work-learning/test/discovery-tools.test.mjs` | `f90c069f63e46147e3f0beced44b31b0572a78215005158a2ac2c954955a08ae` |

The existing gateway and data-capture implementations were inspected at the identities recorded in `evidence/DISCOVERY_BOUNDARY_REVIEW.json`. No production source was edited in this review.

## Findings

1. **Selection has a bounded, explicit objective.** The multiple-choice knapsack selects at most one record per declared source family, has finite transition/state limits, and fails visibly when those limits are exceeded. It optimizes declared reverse-rank utility, not semantic correctness or a calibrated probability. Original order and source-bound hit objects are retained in the resulting packet. The existing 144 small exhaustive tests check utility on synthetic contexts; their count is not 144 executed Atlas language trials.

2. **Byte accounting is precise about its scope.** The selected item-array budget counts UTF-8 JSON bytes, including separators and brackets. The full envelope can be larger and is reported separately. This provides no token-window or tokenizer claim. Empty selection remains within the minimum two-byte array budget.

3. **Captured data cannot introduce later getters or serializers.** Arguments and the fixed catalog are copied with the existing descriptor-aware `captureData`, which rejects proxies, accessors, caller-defined prototypes, cycles, nonfinite numbers and functions. Returned payloads are frozen before serialization and release. The successful output's exact outer MCP/Responses envelope is hashed for the final check; the inner context text alone is insufficient.

4. **Packing does not create or narrow authority.** The original result must retain its existing gateway brand and be a corpus search. Preparation rechecks current source use and disclosure. Release conservatively includes the original full dependency and item inventories, including omitted hits. A changed source generation, revoked use, missing required host fence, cloned result or foreign toolbox output cannot obtain the existing brand through these functions.

5. **Final send remains a distinct required step.** An awaited dispatch can return after its preparation check. The host must call `authorizeOutput(output)` or `authorizeFamilyContextRelease(prepared)` synchronously immediately before each actual send/resend, using the same branded object and exact serialized bytes. A queued revocation after preparation is expected to block at this step. No transport is invoked or registered by these additions, and the grant correctly keeps `hostedBindingVerified: false`. Safe error outputs are unbranded; hosts must use their existing error-delivery policy rather than manufacturing success authority.

6. **Catalog identity is not catalog disclosure permission.** The 144-record catalog is captured once and SHA-pinned; tool arguments select IDs only and cannot replace its path/content. The full selected feature cards are returned. Their source-review metadata can include absolute local baseline paths or owner-specific review evidence. The injected catalog therefore needs an appropriate owner/private or public-safe review before its output reaches an external recipient. A matching hash and a workspace status result do not authenticate arbitrary catalog content or establish a new source grant. The current factory is an opt-in trusted-host input, not a public-data sanitizer.

## Independent execution

One new control exercised the combined MCP context envelope. A host callback returned `true` at `DISCOVERY_TOOL_PREPARE` and queued revocation in a microtask. The caller resumed with a prepared object after eligibility had become false. The synchronous `DISCOVERY_TOOL_HANDOFF` check denied its exact outer payload, and no bytes were sent. Restoring eligibility allowed a fresh final check of the same immutable payload without repeating inference.

- Result: **1 test passed; 0 failed, skipped or cancelled.**
- Receipt: `evidence/DISCOVERY_BOUNDARY_REVIEW.json`, SHA-256 `c7b46a7e2bc2abd4a291a31d49d52ab5af930d890d7cf9ed7185ef03a0353a91`.
- Reproducer: `node --test evidence/discovery-final-boundary.test.mjs`, from the expansion root.
- The receipt pins the test and source files before execution and verifies unchanged hashes afterward.
- No provider call, model call, training update, corpus access or host deployment occurred.

## Remaining falsifier

The next host-integration test should use the actual transport adapter with a resolved send callable, prove that its final authorization covers the exact complete outbound payload, and revoke a contributing source between preparation and send. Success requires zero outbound bytes after revocation. This local review does not certify an uninspected transport or grant issuer.

Publication disposition: the two source additions can proceed to the parent's source-only review gate. This report and the full research catalog remain owner-private handoff material unless their absolute paths and owner-specific metadata are independently reviewed for public release. No PR publication or live registration is claimed here.
