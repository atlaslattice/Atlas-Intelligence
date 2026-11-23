# R03 topic-coverage validation

## Source and baseline

This patch extends open draft Atlas-Intelligence PR #28, exact observed head `debe5e4c7f5a89fe4412932479b08986ea27d648`. All seven baseline files were recovered at that head and their Git blob hashes independently matched the locally stored bytes. The original baseline passed **61/61 Python tests** in normal and optimized (`-O`) modes.

The current baseline's hosted workflow `Atlas ONE v2 isolated source conformance` reported **failure**, run `45284008061`, job `138075471504`. Step summaries were empty and job-log retrieval returned 404/BlobNotFound. These local checks do not resolve or override that hosted failure.

PR #29 at `245c048dc9685a44bf46b1ca190df750a7cb6c61` prepares provider requests and parses fixtures. PR #30 at `17fbad874bfd05a828040bb9612d89b69966edff` prepares Work handoffs. Their current source was inspected for overlap; this patch adds scoped coverage to the existing PR #28 bridge and does not replace those modules.

## Executed local verification

- **82/82 tests pass normally; 82/82 pass under `python3 -O`.** This is 61 preserved baseline tests and 21 new synthetic tests, not 164 distinct features or live research operations.
- New controls cover explicit scope denominators; cap zero/partial/exact/over-total; source, score and ID ordering; alternate-only coverage; unchanged meta/uncovered nodes; immutable verified caches and detached output; malformed caps; changed edition/digest; duplicate/out-of-scope visible IDs; reference requirements; under-return findings; and zero semantic or host authority.
- The coverage CLI was executed against original registry SHA256 `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6` and frozen crosswalk SHA256 `a306c7306a79754b033e9f8c41c0de5ff5176b4544a6a80b5c740e2f8d2cc903`.
- A separate verifier reconstructed all **1,728 × 3 = 5,184 node/scope projection records** directly from CSV/JSON, including labels, raw row positions, candidate ranks, source order, score order, presentation order, counts and omissions. These are computed consistency checks, not semantic reviews or completed implementations.
- The privately generated index has SHA256 `46e93e0d09364bc0085d8eaa086d65f59fd3a9fad546f3708eb868024ba39544`. It is not included in public source changes.

The verified frozen-source totals are 4,516 primary links plus 18,064 alternate links, across 4,516 unique topic rows. Primary candidates cover 737 domain nodes; alternates cover 953; their union covers 969. There are 232 alternate-only domain nodes, 39 uncovered domain nodes and no topic links for the 720 meta nodes. The frozen source asserts zero verified-exact primary matches and zero reviewer-accepted mappings. No semantic acceptance was performed by this patch.

## Current connector comparison

A separately retained current connector response was compared with the exact historical source. Its graph cap-zero and cap-five results were correctly interpreted within the **primary-candidate scope**. The comparison retains observed ordering, visible/total/omitted counts and a digest-bound observation reference. It reports neither served-Site verification nor a live OpenAlex lookup. The capped sample does not distinguish possible internal selection algorithms, and none is inferred.

## Remaining limits

The full prior-plan/circuit `build()` pipeline was not rerun in this slice because the exact separately pinned prior plan and circuit SQLite were not supplied to this candidate checkout. The new coverage-only CLI and public API were exercised with the original registry/crosswalk, and the existing build path now adds their scoped projection as an additive node field. Source inspection confirms the prior node fields remain present; the preserved source-only tests exercise the prior API and queue behavior.

This is local source and fixture evidence. It does not establish hosted CI success, deployment, current provider taxonomy, access grants, independent resident identity, expert approval, publication rights or CANON adoption. No provider request, scheduler change, broker post or remote source mutation is performed by this module or its verification script.
