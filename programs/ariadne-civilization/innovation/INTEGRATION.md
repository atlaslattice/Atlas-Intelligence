# Atlas ONE twenty-invention integration contract (source-only)

**Target**: Add one optional import under the existing Atlas Intelligence `programs/ariadne-civilization/innovation/`, stacked on source-only draft PR #46 (which itself stacks over #44 → #42 → #39 → #25 → ...). Do not replace the native-v2 registry, AtlasGPT `wired.mjs`, SwarmChat D1 broker or the existing Ariadne source index.

## Strongly separated namespaces

- `H01.S01.N01`: Ariadne **knowledge** position (original v0.7 source, exact hash).
- `EX.W01.C01.P01`: Atlas Excellence **implementation** step (distinct plan SHA).
- `I01`: twenty-invention **algorithm candidate** (independent operator namespace).
- `H00.S00.N00` / E145 / META145: **symbolic owner/meta advisory** designation, not new knowledge node or credential.
- Glyph, cymatic, physical, constitutional and research topic coordinates retain original namespaces/editions; suffix/position equivalence does not grant relation identity.

## Safe source port

`runInnovation(id, syntheticInput)` returns `LOCAL_SYNTHETIC_CANDIDATE` or constant-shaped `HOLD`. The returned schema explicitly says `authorityEffect: NONE`, `hostVerified: false`, `scientificAcceptance: false`. No host READ/RETURN is inferred by passing `originMode:'WORK'`; this is merely a negative mode filter. Data must already be verified by an existing trusted host before any candidate may be used with sensitive sources. The runner only uses source-derived labels and synthetic toy fixtures. `prepareWorkCandidate` returns `PREPARED_NOT_SENT` with explicit `readRightsVerified:false` and `returnRightsVerified:false`.

`composeInnovationCircuit(HSN)` runs exactly 20 local synthetic operators and creates **one** non-authorizing META145-inspired advisory receipt. `meta145InnovationRollup(cards)` checks each local synthetic receipt SHA (tamper evidence, not publisher identity), then verifies 1728 distinct HSN receipts grouped into 144 Spheres and 12 Houses; it never creates semantic edges or claim truth. Future real rights-bearing Work integration must use the **existing** Atlas ONE host port, not an injected model callback or a second issuer.

## Component slots

- **Ariadne**: optional `Ixx` hypothesis operators for exactly source-resolved HSN coordinates (original full source loader required).
- **Atlas Intelligence 2.0**: append-only Work proposal/review object; no direct Firestore write from this package.
- **AtlasGPT native-v2**: optional bounded tools; opt-in SDK calls only; no model cost in this package.
- **SwarmChat**: participant-authorized Work envelope with explicit room, seq, source digest, current rights and challenge/reply; *no autonomous post here*.
- **GrokSeek/OpenManus/Eigent**: adapt existing source-based DAG plan output through typed prepared packets after license review, not by vendoring entire third-party repos.
- **Alexandria/Graph Fabric**: typed candidate edges, dissent, source-family siblings and review status kept distinct from accepted semantic edges.

## Release sequence

1. Keep existing PR #46 draft and base on its exact HEAD; add pure module, tests and catalog under one new source-only child PR. Do not merge the stacked branch automatically.
2. Independently run Node tests and source-pinned 1728-loop; compare manifest SHA, output stability, negative fixtures and right/false-friend guards.
3. Have a different reviewer attack each operator (implementation/meaning/permission, not just shape). Publish negative results as first-class records.
4. Pilot on one real authorized Work question with at least two Houses and a method Node. Compare each lab against a same-input flat baseline; treat null and regression results as valuable.
5. Only then consider hosted AtlasGPT tool exposure and SwarmChat UI, after current host READ/RETURN rights, two-account cross-tenant test, cache/egress and rollback evidence.

**Current gate**: LOCAL_TESTED / HOSTED_HOLD / SCIENCE_HOLD / PERMISSIONS_UNVERIFIED / GLOBAL_NOVELTY_UNVERIFIED.
