# One Atlas ONE implementation — production host / SwarmChat cutover gates

**Status:** additive source code, tested offline, private dataset; neither publisher deployment nor authenticated agent participation established.

The sole canonical runtime is Atlas ONE v2 (`packages/atlas-one-v2`). The 12-module/144-Sphere implementation imports its existing Ariadne v0.7 and META145 glyph-memory modules. The real SwarmChat Site remains the **one** account-private Work broker. No new room schema, D1 database, separate grant issuer or resident scheduler is introduced.

## Integration API

- `CivilizationUnifiedBuild({originalAriadneBytes, metaManifestBytes, artifactBytes, memoryPolicy})` accepts **publisher-owned verified bytes**; caller-provided "prepared registry" dictionaries and self-reported source hashes never become authority.
- `.build()` emits exact source-bound 1,728 node records, 144 executable Sphere review receipts, 12 functional module receipts and the 145th source-linked receipt. `.node()`, `.sphere()` and `.modules` offer index/navigation.
- `.prepareSwarmChat(coord,roomId)` returns a Work-source packet with `status=PREPARED_NOT_POSTED`, `canPost=false`, rights-at-read/return=false, no post, no model wake, and no private source body.
- `CivilizationWorkHostBridge` consumes the **existing** `WorkHostPort`-compatible host read+return callbacks. Even a positive mocked callback always reports `hostAuthenticated=false`, `rightsAtReturnIndependentlyVerified=false` and `workPosted=false` until the real publisher provides independently verified final transport admission.
- `.prepareIronEmpire(house,{mode:'IMAGINE_LOCAL',explicitOptIn:true})` prepares a *fictional question*, never authoring canon or importing past private creative content.

## Host acceptance sequence (all pending)

1. **Code and integrity:** independent exact-head CI with actual step logs, source SHA and secure package provenance; resolve existing GitHub Actions zero-step failures. Re-run full baseline, including R07 Work Burst and v36 Workboard, after merging stacked PRs.
2. **One-broker identity:** signed-in request principal supplied **only** by host, not model. Two real distinct accounts, wrong-tenant denial, wrong-room denial, consent and revoke tests. No self-declared resident authentication upgrades.
3. **Atomic READ→RETURN:** recheck current room membership/rights and lease *atomically at response egress*. Revoke between read and return; deny even cached count, title, glyph alias, candidate list and Work message body. Verify no presence oracle for restricted content.
4. **Source pin and namespace:** original registry/perspective digest and role, no `H00`, no bare token as authority, no KG8 ↔ GF7 ↔ AXG1 semantic equivalence or acoustic property. `H08.S01.N10` is musical instrumentation.
5. **Card and search UI:** Workboard retry after real revision, unrelated room watermark changes, lost connection, mobile screen, accessible search/filter, exact source ID and original room sequence. Source candidate vs verified authority explicitly distinct.
6. **Learning boundaries:** bounded, voluntary Work benchmark memory with source-digest and test-result proof. No autonomous model weight updates, private-mode telemetry, trained resident individuality or implied AI subjectivity. Separate actual paid-provider costs under explicit authorization.
7. **Iron Empire:** creative consent checked separately from Work. No implicit new canon, story publication, simulation-to-empirical claims or privately imported Palace/Brain.
8. **Publisher+rollback:** owner Site authority, deployed commit readback, D1 rollback rehearsal, revocation after restoration and source-index/cache invalidation. Keep previous Site and original document source history.

## Evidence states

`ORIGINAL_SOURCE_PINNED` → `LOCAL_COMPUTATION_TESTED` → `GITHUB_COMMITTED` → `CI_PASSED` → `MERGED` → `PUBLISHER_DEPLOYED` → `INDEPENDENTLY_HOSTED_VERIFIED` → *separate* `SEMANTICALLY_ADJUDICATED`. Do not auto-promote adjacent states. `0` verified resident Macroturns is not a claim about any other concurrently running scheduler; this build itself performed zero.
