# Atlas Yijing/Cymatic MT03 — real-model acceptance matrix

**Edition:** `atlas.mt03.local-acceptance/v1`  
**Source:** original Ariadne 0.7 `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`  
**Selected trained head:** `736fdd341778468d32d89ca3cb60b71d415f678dae7b2efdcec978a08b7432d8`  
**BGE frozen ONNX weight digest:** `828e1496d7fabb79cfa4dcd84fa38625c0d3d21da474a00f08db0f559940cf35`

## Executed, not proposed

| Acceptance criterion | Evidence | Result |
|---|---|---|
| Exact private model restoration | 3-part 147074569-byte archive, verified SHA-256, 194 unique objects / 270 files | VERIFIED LOCAL |
| Real trained inference | Executed BGE-small-en-v1.5 ONNX weights via peer source-bound PyTorch evaluator, trained flat180 head, full 384D+1728 scores | VERIFIED LOCAL |
| Same-result Yijing identity | Both edition-specific 8×8×27 transforms on same score object, inverse correct | VERIFIED LOCAL |
| No ranking drift | 12 new natural-language Work questions, top12 = 144 positions, identical original vs Geometree ranks/scores | VERIFIED LOCAL |
| No false uniform symbolic code | 143 /144 top12 codes differ across editions as allowed; both invert to same HSN | VERIFIED LOCAL |
| Local HTTP authentication | Loopback bearer token, response 200 vs unauthenticated 401 | VERIFIED LOCAL |
| Bound real model/head identity | BGE and head source hashes and 1728-score SHA; negative altered-model/hidden-score fixture | VERIFIED LOCAL CONTRACT |
| Permission revocation before return | Host-owned local policy READ/INFERENCE_USE/DISCLOSE/RETURN, late revocation tests | VERIFIED **LOCAL POLICY FIXTURE** |
| Source-only code/test suite | Node normal 566/566; jitless supported subset 555/555; Python physical4/4 | VERIFIED |
| Jitless HTTP test module | Node v22 undici internally expects WebAssembly unavailable under --jitless; normal host tests pass | ENVIRONMENT LIMITATION |
| Human quality | Fresh author-chosen questions are NOT source-family/time-disjoint independent human relevance judgments | HELD |
| Actual physical Chladni observation | External 2026 published five pairs reproduced; NO new Atlas glyph/plate experiment | HELD FOR ATLAS CALIBRATION |
| Current third-party source entitlements | Local policy is NOT authoritative provider READ/USE/DISCLOSE/RETURN rights | HELD |
| Independent closure of required negative evidence | PR65 metadata-only validator does not attest a host-selected required set | HELD |
| Public authenticated hosted deployment | No internet-facing server/site model installed; Atlas ONE reports provider unconfigured | HELD |
| Improvement vs selected0.3 flat control | Identical retrieval order only, no advantage shown | NOT ESTABLISHED |
| Weight updates, external provider calls, production merge | None performed | 0 |

## Architecture invariant

This adds a host boundary on top of the SAME existing selected Model 0.3, not a second model or a new owner training job. The offline worker is **read-only** and issues one BGE+head execution per authenticated query. All consumer projections are derived views. A digest is byte identity, not a grant. Host-public release needs independently authenticated source contracts and a final transport egress fence; loopback token alone cannot establish that.

## Exact reproduction (owner-private workspace required)

```sh
# From the parent project root:
node --test test/*.test.mjs e2e/test/*.test.mjs
node --jitless --test test/*.test.mjs e2e/test/quality-gate.test.mjs
python -m unittest discover -s e2e/physics -p 'test_chladni.py' -v
python e2e/physics/chladni_check.py e2e/physics/published_chladni_2026.json
# Optional private real model:
ATLAS_OWNER_WORKSPACE=/path/to/verified/workspace ATLAS_OWNER_R06=/path/to/verified/R06 \
  python e2e/private-tests/run-real-http.py
```

The private workspace and independent R06 source must be explicitly restored by an authorized owner; neither is included in this public-source package. The original 12-question score frame is PRIVATE, redacted receipt only.

## Rollback

This candidate adds isolated `e2e/` files to draft PR66. No changes to selected model, active head, source data, server deployment, current owner consent, or existing 12×12×12 registry. To roll back, remove its import/mount or close the draft; no data migration is necessary.
