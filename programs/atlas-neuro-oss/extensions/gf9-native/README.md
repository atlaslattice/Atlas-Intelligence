# Atlas GF9 native engineering additions — source review

**144 source-grounded candidates, five original optional modules, and retained
counterexamples.** This review complements Atlas Neural OSS Forge PR #62. It
does not add 144 completed features to the parent catalog: the two catalogs are
alternative scoped engineering reviews, with overlap and different source depth.

**A + B = C:** the existing source-bound Atlas neural gateway plus bounded context,
numerical event and evaluation primitives yields a reproducible candidate whose
correctness and failure modes can be measured before adoption.

## Exact edition and scope

- Private Work Learning baseline: `76e6eeefeafbcc1cc4c6f94c00afcb9700fc19ba`, version 0.2.0.
- Installed manifest: `12ebee51314e983581452cab0bc90faaa5971258af915d6f2c66a8a85b235821`.
- Verified installed files: 88. All 87 non-README files match the repository edition;
  the sole README packaging-link difference is explicitly recorded.
- The predecessor's neural retrieval, source checks, five default tools, graph
  adapters, original 1,728 identities and existing source history are retained.
- This public directory contains original additions, synthetic evidence and source
  metadata. It contains no owner corpus, model weights, credentials, original
  registry bodies, non-Work content or live room transcript.
- No trained model, hardware interface, scheduler or provider loop is added.

The baseline is a separate, authorized dependency. It is not in the parent public
repository and is not smuggled into this review. A source hash identifies its
edition; it grants no access. The replay helper requires the existing exact bytes
and fails on a missing or changed baseline.

## Browse the 144 candidates

- [Offline feature explorer](overlay/docs/oss144/Atlas_144_Feature_Explorer.html)
- [Complete readable catalog](overlay/docs/oss144/FEATURES_144.md)
- [CSV](overlay/docs/oss144/FEATURES_144.csv)
- [Machine-readable catalog](overlay/docs/oss144/feature-catalog.json)
- [Pinned source and license register](overlay/docs/oss144/source-registry.json)
- [Source attribution and scope](overlay/docs/oss144/SOURCE_ATTRIBUTION.md)
- [Detailed API, mathematics and integration guide](overlay/docs/oss144/INTEGRATION.md)

The catalog has exactly twelve engineering groups with twelve candidates each:

| Group | Capability area |
| --- | --- |
| G01 | Neural representations and retrieval |
| G02 | Eligible training data and objectives |
| G03 | Indexing, compression and rank stability |
| G04 | Typed graph discovery and learning |
| G05 | Stable neuron dynamics |
| G06 | Event encoding and sparse computation |
| G07 | Temporal state and learning experiments |
| G08 | Interchange and reversible lattice addresses |
| G09 | Serving, inference and startup behavior |
| G10 | Evaluation, abstention and calibration diagnostics |
| G11 | Context and evidence memory |
| G12 | OpenAI, MCP and developer interoperability |

G identifiers are engineering categories, not renamed Ariadne Houses. Every row
remains `CANDIDATE` and `NOT_ADOPTED`; local prototype evidence is a separate field.
The reviewed source set is **29 projects**, with exact code/license snapshots for
**28**. ONNX Runtime remains a source-snapshot HOLD for F101 and F102. Cursor
coverage is limited to its public `create-plugin` subtree; proprietary IDE code,
model weights and dataset rights are not inferred from repository code licenses.

## Implemented additions

| Addition | Code | Demonstrated behavior |
| --- | --- | --- |
| Family context selection | `overlay/src/context-pack.mjs` | Exact bounded utility selection, one hit per family, full dependency preservation, explicit final-send recheck |
| Native tool dispatch | `overlay/src/discovery-tools.mjs` | Two opt-in strict Responses tools and corresponding MCP adapters using the existing gateway |
| Event primitives | `overlay/python/atlas_work_learning/event_lattice.py` | Stable held-input leak, explicitly sampled reset, residual delta encoding, canonical address round trips, immutable temporal reference |
| Compression diagnostics | `overlay/python/atlas_work_learning/retrieval_audits.py` | Actual symmetric-int8 row payload, reconstruction errors, rank agreement and retained order reversals |
| Selective evaluation | `overlay/python/atlas_work_learning/selective_evaluation.py` | Validation-only threshold selection, source/family isolation, nominal Wilson diagnostics and paired family bootstrap |

Only two existing source files change: `src/index.mjs` and `src/index.d.ts` receive
append-only exports/declarations. `OVERLAY_MANIFEST.json` records their complete
predecessor/candidate hashes and the exact appended text. All new files have
individual SHA-256 pins. The original runtime manifest must not be reused to
authorize a revised executing runtime.

## Actual observations

| Scope | Observed outcome | Limitation retained |
| --- | --- | --- |
| Composed Node suite | 264 passed, zero failed, one skipped out of 265 | Live semantic-inference test not run; first missing-source dependency failure retained privately |
| New Python tests | 17 event + 15 quantization + 19 selective = 51 passed | Synthetic/reference tests, not a human quality benchmark |
| Context planner | 144 fixed small cases match exhaustive subset oracles | Correctness for the declared objective |
| Context comparison | Utility improved on all 12 deliberately adversarial fixtures; all 12 were slower | Utility is constructed; no answer-quality, token or serving speedup claim |
| Event sequences | 144/144 passed; all 1,728 HSN addresses round-trip | No GF9 batch or real resident conversation count |
| Delta coding | 3,456 samples become 771 records; 23,047 raw JSON bytes become 13,256 encoded bytes | 19/144 cases grew; loss is bounded by a declared quantum/tolerance |
| Lazy/dense reference | Maximum absolute difference `4.440892098500626e-16` | Immutable tuple copying remains; no measured energy or speed advantage |
| Quantization primary panel | 12/12 top-1 and ordered top-5 agreement on 24 synthetic 384D vectors | Adversarial near-tie panel has 0/1 top-1 agreement |
| Quantization payload | 9,408 actual codec bytes vs 36,864 hypothetical float32 vector bytes | Excludes IDs, indexes, object overhead and query vectors; process memory not measured |
| Selective threshold | Validation chooses .85; ordinary held-out risk .25 at coverage 2/3 | Shifted held-out risk reaches 1.0 at coverage .5 |
| Known-source leakage repair | R2 rejects a reused source hash despite renamed/disjoint family metadata | Unknown derivatives and forged declarations remain outside the guarantee |
| Peer composition | One probe passed 13/13 checks using exact peer hard-negative source pins | No peer source copied; known quantization loss remains visible |
| Boundary review | Queued revocation denies exact outer MCP payload; zero bytes sent | A real host must perform the check immediately before each actual send/resend |
| Catalog | 470/470 assembly checks | Source scope is selected repositories/files, not all open source |
| Explorer | JavaScript syntax and 29/29 filter checks pass | Browser rendering was not verified; browser executables were unavailable |

These scopes overlap. They must not be summed into a count of features, independent
scientific trials, resident turns or model improvements. All experiment receipts
include their assumptions and adverse observations. Public receipt projections
remove local filesystem paths and retain the original receipt digest separately.

The public catalog is an explicit projection of the private review. It removes
89 literal baseline-code snippets across 30 candidates and generalizes private
discussion identifiers. Source coordinates, file hashes, search terms, candidate
status, benefits, tradeoffs, falsifiers and measured results are preserved. The
537 projection checks passed; projected artifacts have their own hashes and do
not claim byte identity with their private predecessors.

## Reconstruct and test

Python 3.10+ is sufficient for the new standard-library kernels; the existing
JavaScript package requires Node 20+. No installation or download is performed.

```sh
python3 replay_overlay.py --baseline /AUTHORIZED/EXACT/WORK_LEARNING_PACKAGE \
  --output /NEW/REVIEW/CANDIDATE
cd /NEW/REVIEW/CANDIDATE
node --test test/context-pack.test.mjs test/discovery-tools.test.mjs test/oss-catalog.test.mjs test/discovery-final-boundary.test.mjs
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=python python3 tests/test_event_lattice.py
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=python python3 tests/test_retrieval_audits.py
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=python python3 tests/test_selective_evaluation.py
```

The source helper verifies all 88 baseline pins before making a fresh candidate.
It writes the exact bytes it verified and checks the reconstructed files. Its
three regression tests include a concurrent source-change counterexample:
`python3 test_replay_overlay.py`. The focused candidate run contains 19 Node tests
and 51 Python tests; these repeatability checks are not new scientific trials.
It copies only the named source files, then applies the reviewed additions. It
does not modify the baseline or activate a host. Full inherited Node tests require
the separate authorized registry and pinned META145/Graph Fabric/glyph source
checkout documented in the integration guide. Their bodies are not distributed.

The numerical Python modules can also be tested directly from `overlay` with
`PYTHONPATH=overlay/python`; no existing model is required. The peer composition
probe additionally needs the peer's exact separately provided source files.

## Review state and next falsifier

This is a dependent **draft**, with no merge, deployment, hosted registration,
provider invocation, model download, optimizer update or newly authorized source
access. GF9 experiment counts and existing campaign ledgers are unchanged.
Private non-Work remains outside this project.

The next high-value experiment is an independently labeled, source-family-disjoint
retrieval-and-answer panel. Compare the unchanged neural baseline with one
addition at a time; measure answer/citation quality, abstention errors, family
coverage, full-request tokens, cold/warm latency and process memory. Preserve
near-tie failures, unfamiliar domains and negative results. A quality floor must
pass before a cost optimization is adopted.

Rollback is to discard the reconstructed candidate or remove this isolated draft
extension. The baseline, parent program and owner's active configuration remain
unchanged. Architectural attribution to Dave Sheldon and Atlas Lattice Foundation
is preserved under the repository's existing license; implementation contributions
and upstream inspirations are separately recorded.
