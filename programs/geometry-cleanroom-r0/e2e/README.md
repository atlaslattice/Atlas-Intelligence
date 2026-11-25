# Atlas Geometree · MT03 REAL trained-model local acceptance

**Edition:** `atlas.local.mt03.2026-11-24`  
**Status:** REAL PRIVATE TRAINED INFERENCE + AUTHENTICATED LOCAL LOOPBACK ACCEPTED; INTERNET HOSTED/THIRD-PARTY RIGHTS/HUMAN QUALITY/GLYPH-TO-PHYSICAL CALIBRATION HELD.

This is an additive, reversible acceptance component for the original 12×12×12 Atlas Geometree. It does not replace the original Ariadne source or the selected trained 0.3 weights. `e2e/worker/selected_model_worker.py` depends on the explicitly authorised owner-only 0.3 restored workspace and the separately pinned R06 source tree; neither is bundled here. The source tree may be checked and the public synthetic tests run without those assets.

## What actually ran

- Restored the exact 147,074,569-byte 0.3 private archive, 270 files/194 objects, unchanged state/head/ontology source.
- Executed original 384D BGE weight computation via source-verified PyTorch evaluator and exactly selected trained flat180 head to produce 1,728 scores for a fresh natural-language request. One encoder/head each authenticated request, no lexical fallback, zero weight updates.
- Ran an owner-local Node HTTP server bound to `127.0.0.1`, authenticated bearer 200s for two Yijing editions and denied an unauthenticated request with HTTP 401. Full-score and embedding digests identical across editions; baseline neural ordering preserved, glyph Hz always null.
- Ran a 12-fresh-natural-language-query local panel: 144 original top-12 rankings/scores identical in geometry projection and both Yijing editions; 143 symbolic pairs differed across editions by design. **Zero independent human judgments; no quality improvement claim.**
- Local source-only tests: 566/566 Node normal; 555/555 Node `--jitless` supported subset; Python plate-evidence study checks 4/4. HTTP test file under `--jitless` fails at Node 22 internal undici/WebAssembly bootstrap; it passes 11/11 in normal mode. Do not report 566/566 jitless.
- Reproduced 2026 open-access published Chladni plate experiment Figure 16 five *corresponding image* simulated/experimental frequency pairs. Raw differences across those five illustrative pairs have RMSE 131.44 Hz, NOT the paper's independently fit calibration RMSE 6.3341 Hz. No experiment or physical glyph-frequency model is claimed for Atlas.

## Running

From the outer `programs/geometry-cleanroom-r0` directory (Node 22+, Python stdlib for plate tests):

```bash
./e2e/scripts/reproduce-public.sh
```

For real trained neural inference, privately restore `Atlas_Neural_Model_Private_0.3.0.zip` using the author's exact parts manifest and the authorised R06 peer source (R06 archive `aa9eab4b443fd372f51067118c21f1792ab7635cc43fa913295a8b4c21a7d33c`). Verify source digests, then:

```bash
ATLAS_OWNER_WORKSPACE=/absolute/path/to/verified/workspace \
ATLAS_OWNER_R06=/absolute/path/to/verified/R06 \
python e2e/private-tests/run-real-http.py
```

The script creates a random local bearer token, starts a loopback-only Python/Node model worker, exercises HTTP, and terminates it. Do not expose to a public network or forward the token. Host-specific issuer and real third-party purpose rights are NOT supplied by the script.

## Public/private separation

A public source ZIP includes only exact source, tests, synthetic fixtures, study attribution, and *redacted* aggregate receipts. The private 147MB model, private source/corpus, raw 12-question score vectors, human reviewer material and loopback credential never enter GitHub or the source ZIP. The isolated private workspace remained unchanged.

## Remaining real prerequisites

See `docs/ACCEPTANCE_MATRIX.md` and `docs/HUMAN_EVALUATION_PROTOCOL.md`. To establish independent relevance improvement obtain source-family/time-disjoint eligible Work examples and blinded adjudicated grades. To establish physical cymatic predictions acquire plate-specific frequency/mode images with material, geometry, boundary, drive and calibration details. To establish hosted rights/deployment bind genuine host issuer/READ/USE/RETURN and final egress, independently required evidence closure, and authenticated provider model registration. None can be inferred from a localhost credential, a source digest, symbolic numerology or passing synthetic tests.

**Current internal reviewers are not independent human or external rights authorities.**
