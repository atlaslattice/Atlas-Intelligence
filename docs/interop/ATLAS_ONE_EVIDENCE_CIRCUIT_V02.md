# Atlas ONE — source-to-review evidence circuit v0.2

**CANDIDATE · SOURCE-ONLY · NOT HOSTED · NOT CANON · AUTHORITY: NONE**  
**Version:** 0.2 · **Date:** 2026-11-22 · **Scope:** one public-metadata review circuit, not a real peer exchange

## What now executes

One local command turns a source-indexed, edition-aware `A+B=C` collision review into **eight deterministic, SHA-256-linked events**:

1. `FABRIC_PREFLIGHT` — validate the full 17-module federated manifest.
2. `SOURCE_METADATA_BOUND` — locate already-pinned public source IDs; **do not** independently claim complete raw export or source rights.
3. `COORDINATES_TYPED` — verify namespace, edition, address syntax and source pin independently for A and B.
4. `A_PLUS_B_EQUALS_C_CANDIDATE` — preserve the proposed synthesis as **unreviewed**; prohibit `same_as` or approved semantics.
5. `COUNTEREVIDENCE_PRESERVED` — retain independent objections and falsifiable tests as hashes, not synthetic peer endorsements.
6. `TWELVE_HOUSE_REVIEW` — record all 12 Ariadne House concerns separately; no numeric compensation, fake score or imported historical ontology label.
7. `HUMAN_AND_HOST_HOLDS` — human review not requested, no authenticated participant, no broker post; report existing 13 held host gates.
8. `LOCAL_RECEIPT` — replayable local receipt with explicit zero model calls and zero SwarmChat messages.

**This is a genuine, bounded execution of code.** It is not an active autonomous resident, a hosted A2A exchange, a source-validation certificate, or a real SwarmChat post.

## One real public source discrepancy

The synthetic *workflow packet* points to two real, source-pinned public historical documents:

- [ORCS H01 manifest](https://github.com/atlaslattice/open-regenerative-compute-standard/blob/main/codebase-artifacts/houses/H01_philosophy_logic/manifest.yaml): H01 = Philosophy & Logic.
- [Aluminum OS ontology draft](https://github.com/atlaslattice/aluminum-os/blob/master/docs/architecture/SOURCE_OF_TRUTH.md): H1 = Science in its cited draft.

Both use a `H01`-like identifier but have different definitions. **Candidate conclusion:** source- and edition-qualified coordinates are required; no name collision can authorize an implicit semantic link. The factual observation is limited to the dated/pinned documents, not a statement about current human doctrine. A legitimate manually-reviewed `RELATED` crosswalk may exist; the validator neither assumes nor rules that out. This is an integration-engineering finding, **not** a scientific-paper discovery.

## Run

```bash
cd public
python -m unittest discover -s tests -p 'test_atlas*.py' -v
python interop/atlas_fabric.py interop/atlas_project_manifest.v0.1.json --pretty
python interop/atlas_one_circuit.py interop/atlas_collision_h01.work.v0.2.json --pretty
```

`atlas_one_circuit.py` does not write the receipt; use shell redirection in an authorized local sandbox if it should be retained. Verify the replay chain with `verify_receipt` before interpreting the output. The hash is Python-local deterministic JSON encoding, **not RFC 8785, a signature, an authentication token, original-source completeness, or independent human review**. Even if a malicious editor recomputes the full local chain, independent stage assertions reject counterfeit peer-read, hosted, mapping-approved, source-complete and CANON signals. An attacker able to rewrite all bytes may still produce a new structurally valid but unauthenticated source-only candidate; cryptographic signatures and authoritative originals remain separate requirements.

## Actual Noosphere and GoldenTrace source contracts (CI only)

A second read-only command imports exact public upstream Python files and exercises one **synthetic** ingestion packet and one GoldenTrace `invariant_check` event. Importing local Python executes code: use only previously reviewed, pinned checkouts.

```bash
python interop/atlas_contract_bridge.py \
  --noosphere _pinned_public/noosphere/core/swarmhub_contracts.py \
  --goldentrace _pinned_public/aluminum/kintsugi/sdk/golden_trace.py
```

Pinned public repo commit refs for CI:

- `atlaslattice/noosphere-archive`: `82469d1ee6269b1886f3c2cdce83dcf8bb974106`
- `atlaslattice/aluminum-os`: `9fbe55e8e4edbc27abd5af4df331451bd608aa48`

The Noosphere adapter deliberately maps a partial export to `INCOMPLETE_HELD` even when Noosphere's `validate_ingestion` reports `SOURCE_REPORTED_ONLY` for both partial and hashed source metadata. The adapter *never* upgrades a reported hash to independently verified source completeness. The GoldenTrace adapter links the Atlas circuit terminal digest to an existing local SHA3-256 event without claiming cross-runtime canonicalization, durable storage or signer authenticity.

The GitHub workflow `atlas-one-source-contracts.yml` runs stdlib tests on Python 3.11 and 3.13 and checks pinned upstream public sources on 3.11. **As checked on 2026-11-22:** GitHub Actions attempted this workflow on PR #5. All three jobs immediately reported failure with `runner_id:0`, zero executable steps, and an unavailable job log. The jobs therefore **did not execute the test suite or checkout the pinned upstreams**. The root runner/account cause is not exposed by the available connector; `CI_FAILED_BEFORE_STEPS` is a host blocker, not an independently diagnosed source-code failure.

## Actual local test results

**161/161** standard-library regression tests passed on Python 3.13 in this bounded visit. The full coordinate-space test executes **4,032 unique edition-qualified address forms**: 1,728 Ariadne 1-based, 1,728 provider 0-based, 3 × 144 historical 2-D, and 144 global UWS spheres. These are syntax/index checks, **not** validated scientific node mappings. The source-only circuit performs eight actual local processing events with zero model calls and zero broker posts.

## Noncancelling House checks

H01–H12 are recorded as distinct `DIRECT` / `ENABLER` / `GATE` roles, all with `NOT_VALIDATED` evidence and **no numeric ranking**. This prevents a high energy/economic value from masking unresolved rights, contamination, cultural, health or consent risks. Detailed 1,728-node semantic assessments remain **NOT PERFORMED**; the separate exhaustive coordinate test only verifies all 1,728 *address shapes* in each 3-D namespace, not knowledge or scientific correctness.

## Integration remains blocked where appropriate

- No current hosted SwarmChat principal, D1 authorizer, signed callback/lease, Work CAS or READ/RETURN revocation proof.
- No automatic resident wake, independent peer acknowledgement, real Work conversation or semantic CANON approval.
- No direct private Ariadne body, OpenAlex crosswalk, Play/Social/Quiet/Imagine/Brain/Palace/Habitat body or secret transferred into the public branch.
- No assumption that the public source blobs remain current or their labels grant global authority.
- No production changes in the connected Sites, GitHub default branches, external systems, funds or credentials.

## Rollback and forward path

The new circuit, tests, CI and documentation are **additive files on a draft feature branch**. Revert by closing the draft PR (the history remains) or deleting only that branch after provenance-safe archival; no need to rewrite any base repository. To move toward a live pilot, the owner must explicitly authorize a specific Work room and current principal; broker permission and revocation must be checked at read/post and readback. Scientific evidence needs separate primary source verification, not merely a local syntactic replay.
