# Indra Net · shared-result evidence projection (review-only)

**Edition:** 2026-11-24.r1  
**Status:** LOCAL CONTRACT TESTS PASSED; NOT IN CANON; NOT MOUNTED; NOT MERGED; NOT HOSTED  
**Parent:** same Atlas Intelligence draft PR #65, existing `required-closure.mjs` reviewer; no new registry, retriever, composer, model or scheduler.

## A + B = C

- **A:** The Atlas Model 0.3 / Genesis / Native shared facade prepares a single neural result with canonical Ariadne HSN identities. `specialistProfiles` is an optional SOURCE_CONTEXT consumer of that same result. Council proposals and other consumer outputs have independent evidence status.
- **B:** Independently pinned `reviewRequiredClosure` enforces a declared set of components, dependencies, receipts, objections and source-use decisions, within the existing authority's policy. The source/right checks and final RETURN gate remain authoritative.
- **C:** `projectIndraNet` links the same *claimed* result/request/issuer/model/runtime/source-edition/rights-epoch hashes across bounded consumer metadata and canonical `Hxx.Sxx.Nxx` references. It exposes a transient typed relation projection and refuses mismatches. It neither retrieves nor ranks nor writes to the canon graph.

This is a reversible review layer, **not** a deployed common neural network. It does not certify the authenticity of a caller's result/issuer, independently validate permission epochs, or prove that a supplied required set is complete. A caller who supplies both the supposed trusted anchor and evidence can create internally consistent metadata; even then the returned decision has `releaseAuthorized:false`, `requiredSetIndependentlyComplete:false`, `observationIndependentlyVerified:false`, `crossHostParityVerified:false` and `authorityEffect:'NONE'`.

## Interface

```javascript
import {projectIndraNet} from './indra-net-projection.mjs';
const check=projectIndraNet({
  source: existingPreparedNeuralResultMetadata,  // already retrieved by canonical gateway
  consumers: existingTypedServiceMetadataReceipts, // SAME request/result/issuer/source rights epoch
  closure: existingIndependentlyPinnedClosureInput // required manifest and observed receipts
});
if (check.status === 'HOLD_CONTEXT') {
  // Hold the complete output; no provider retry, fallback search or authority change.
}
// A match is a metadata-consistency witness ONLY.
// The existing source-use, consent, cancellation and RETURN fences still apply.
```

**Envelope and receipts.** `source` must be a strict `atlas.indra-net.prepared-source/v1` data object with WORK scope, `operation:'search'`, `primaryMethod:'neural'`, `fallbackUsed:false`, exact SHA-256 fields for request, result, issuer, model, runtime, source and current rights epoch, a source edition, delivery purpose and 1–1,728 valid HSN addresses. The `consumers` array holds 1–64 strict `atlas.indra-net.consumer-receipt/v1` objects. Every consumer must have precisely the same request/result/issuer/model/runtime/source/edition/rights epoch, and its HSN subset must have appeared in that supplied result. The consumer ID roster must match *exactly* the pinned `closure.manifest.required.components` roster; an omitted consumer cannot disappear from an otherwise internally consistent selection. The host must independently pin that roster—this module cannot invent it.

**Statuses.** `LOCAL_TESTED`, `SYNTHETIC_FIXTURE`, `PROPOSED_NOT_EXECUTED`, `HELD` are **reported** observations, not attested statuses. Derived `CLAIMS_CONSUMPTION_OF_SHARED_RESULT` edges are immutable transient metadata and cannot promote a link to a semantic crosswalk, CANON vote, participant endorsement, source right or scientific observation.

**Privacy and scope.** Unknown fields are rejected. Work-only sources and consumers are required. Do not pass private Palace, Habitat, Imagine, Dream, Play, Quiet, Social or corpus bodies. Exact HSN validation and source digests do not mean the other 1,728 nodes were individually processed or that a valid expert judgment exists. META145/E145 are navigation and synthesis concepts, not authorization overrides.

## Verification

With Node 22+ from the package root:

```sh
node --test programs/required-closure/test/*.test.mjs
node --jitless --test programs/required-closure/test/*.test.mjs
```

- Existing required closure predecessor: **174 distinct tests** (no source changes to predecessor).
- New derived projection: **168 distinct tests** including **144 synthetic adversarial controls** (12 mutation classes × 12 synthetically varied House-index source editions), 12 positive House-index controls, 1 explicit 1,728-HSN syntax traversal, and 11 additional controls. The 144 are **not** semantic Sphere acceptances.
- Combined: **342 distinct passing tests** per mode, no skips. This is source-only verification, not neural quality improvement, live hosted interoperability or a model run.
- A new local RED test caught omission of a required consumer, despite matching observed closure; the revised adapter cross-checks the exact pinned component roster. Preserve that counterexample.

## Open integration work and falsifiers

- Incorporate only compatible source into the existing pinned Model 0.3 / Genesis R04 / Native and shared composer after exact ABI and source review. None of their prior passing tests may be credited to this edition.
- Host must authenticate source/issuer/required manifest, current READ/USE/RETURN/withdrawal checks, and independently enroll a held-out evaluation. Source epoch drift or a revoked source must fail at the canonical fence, not through a mere JSON equality comparison.
- Preserve Workboard #327 missing-negative-dissent objection, #342/#355 planner scope-revision concern, #350 negative Geometree ablation, #353 Atlas ONE/SwarmChat source-context divergence, and Genesis original open source-use-policy objection.
- Falsifiers: same coordinates from different source editions accepted; changed issuer/model/rights epoch accepted; a required component absent but metadata matched; a caller's synthetic manifest interpreted as host authority; a proposed faculty seat treated as a real person; or a derived graph edge accepted into CANON or training without separate approval.

**Rollback:** do not import this optional pure module. It writes nothing to the owner source workspace, model weights, active head, council, graph, scheduler or hosted SwarmChat broker.
