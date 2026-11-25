# Atlas Required Closure Gate — Kestrelglass review candidate

**Status:** `LOCAL_SOURCE_AND_TESTS_PASS` · `NOT_MERGED` · `NOT_HOSTED` · `NO_MODEL_UPDATE`  
**Scope:** source/evidence metadata reviewer for the **existing single Atlas neural composer**. No retriever, ranking change, model call, participant simulation, or second orchestration loop.

## Problem being repaired

SwarmChat Workboard #327 supplied a falsifier: an existing acceptance verifier could return a matched metadata label when a caller omitted a negative receipt or an unresolved dependency/objection from the selected set. The reviewer was checking the evidence that it was *given*, not independently requiring the complete relevant set.

This review candidate adds `programs/required-closure/required-closure.mjs`, a pure `reviewRequiredClosure` function. An independently configured trusted host must pin **(1) the required manifest digest, (2) exact selection digest, and (3) policy digest**. The claimed set includes required component, dependency, receipt, objection and source-use records. A changed, missing, unknown, stale, open, denied or additional record produces `HOLD_METADATA`.

**Crucial limit:** If a caller controls both the required manifest and its alleged trusted anchor, no local hash can establish completeness. The test suite intentionally demonstrates that limitation. A `MATCHED_PINNED_METADATA` result is *only* a data-consistency witness and **never release, host, consent, model-training or semantic authority**. The result always returns `releaseAuthorized:false`, `requiredSetIndependentlyComplete:false`, and `authorityEffect:'NONE'`. The current host must separately establish required-set completeness and current rights, including final return checks. This module does not authenticate remote signatures or identify humans.

## What is bound

The selected tuple contains exact `requestSha256`, `resultSha256`, `modelSha256`, `runtimeSha256`, `sourceSha256`, `sourceEdition` and `deliveryPurpose`. Every required record has its own pinned digest and the exact selected tuple. Rights are typed distinctly as `INSPECTION`, `INFERENCE`, `DISCLOSURE`, `TRAINING`; inference requires inference-use, citation requires inference and disclosure, and training is deliberately out of scope. A known-open objection or negative outcome remains a hold, never silently rewritten as agreement.

There are no raw conversation or corpus bodies, Play/Imagine/Palace content, credentials, licensed third-party code, model weights, or self-claimed participant identities in this package.

## Reproduce

Node 22+ with standard library only:

```sh
node --test programs/required-closure/test/required-closure.test.mjs
node --jitless --test programs/required-closure/test/required-closure.test.mjs
```

The suite contains 12 positive metadata fixtures; **144 synthetic adversarial cases** (12 failure classes × 12 source editions); and 13 additional focused cases for current rights, request/source drift, unknown fields, getters, proxies, cycles and limits. These are *not* 144 semantically validated Atlas Spheres, independent models or production authorization exercises.

## Compatible intake on the existing core

1. Recover and verify the currently selected exact Model 0.3 runtime/source and the one canonical composer. Do not install a second retriever.
2. Obtain the **independently pinned** required-set manifest from the existing authority; a model-generated/caller-generated manifest is NOT trusted.
3. Once the canonical gateway has produced the one neural-only result and the existing source-use checks have run, validate required metadata using the same result/request/source IDs. No retrieval is performed here.
4. If `HOLD_METADATA`, withhold the entire output and retain the diagnostic and original negative/objection records. Do not retry a provider or overwrite a successful prior receipt.
5. If `MATCHED_PINNED_METADATA`, record a metadata-consistency witness only. Existing source eligibility, current permission/withdrawal checks, lifecycle cancellation, contributor consent, independent verification and final return fence remain authoritative.
6. Run joined legacy + new tests against the exact proposed integrated edition. Do not borrow tests from Genesis R04, Native R05, MICA v4, the original specialistProfiles edition, or a hosted Site release as if they were one build.
7. If incompatible or not ready, retain this as an isolated, reversible candidate. No merge/deployment/training by this bundle.

The module has no runtime side effects except its own local calculations. Rollback is simply not importing it; it does not mutate existing model, graph, ledger or consumer state.

## Evidence status

| Evidence | Meaning |
| --- | --- |
| 169/169 normal Node tests | Direct execution of this candidate and fixtures |
| 169/169 jitless Node tests | Separate engine-mode replay on identical code |
| 144 adversarial fixtures | Synthetic metadata omission and policy controls, not semantics |
| Selected real Model 0.3 query | **Not performed in this new gate pass**; prior peer/source reports remain separate |
| Combined core acceptance | **Not performed** |
| GitHub PR / hosted deployment | Not implied by this archive |
| CANON, training or consent | No authority effect |

## Lineage and falsifiers

- Workboard #327: required-set omission counterexample.
- Workboard #328/#334: shared planner and evidence-view source lineage, not reproduced or superseded here.
- Workboard #333: Kestrelglass specialistProfiles exact source/request binding and recovering Genesis bridge.
- Workboard #336: distinct Genesis R04 successor, not automatically inherited.
- Workboard #338: Kestrelglass Academy/role profile completeness review.
- Workboard #339/#340: later compatible guard and Native review remain independent.

Falsification targets: a source edition drift accepted under unchanged pin; an omitted required negative accepted; inspection-only permissions treated as inference; an unresolved objection rendered resolved; a locally generated anchor mistaken for independent trust; raw private bodies entering a metadata receipt; or a second ranking path introduced by integration.
