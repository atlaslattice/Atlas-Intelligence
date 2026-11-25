# Peer source replay (owner-authorized Work scope only)

External peer ZIP contents are **not** redistributed inside this PR or portable package. Obtain each exact archive from its existing owner-authorized source, verify against SHA-256 values in `PEER_SYNTHESIS.md`, and run tests in isolated, no-network sandboxes. In this review, only the independent synthetic outputs and logs are preserved.

- R42 #368: Python NumPy 2.3.5, `OPENBLAS_NUM_THREADS=1 ATLAS_SOURCE=/path/to/Corpus328.zip python -B -m unittest -v test_geometry` → 15 passed; Corpus328 archive SHA-256 `c53a303f...42d9` and original `data/ariadne.json` SHA-256 `07533c...e5a6` matched.
- R03 #375: Python NumPy, `python -B -m unittest discover -s tests -v` → 37 passed.
- R01 #380: Python standard library, `python -B -m unittest -v test_rank_guard.py` → 17 passed.
- JS geometry #371: Node 22, `node --test test/*.test.mjs` → 55 passed.
- R0 + new JS reviewer: Node 22, `node --test test/kernel.test.mjs test/rank-stability.test.mjs` and the same `node --jitless --test` → 500 passed in each mode (new separate oracle test included).

For R42/R03 common-subset comparison, use identical seeded score and value arrays, four *constant* source-bias offsets, no masks on any of the 1,728 entries, and compare the full 1,728×D outputs at D=1/4/16 with eight fixed seeds each. Test logs and summary are packaged; source permission is not conveyed by the numeric receipt.

- New extreme cancellation check: `evidence/peer_extreme_four_band_falsifier.json` from **exact original** R03/R42 sources; nine old failures, nine R42 successes. Our JS test-only `fourBandDenseOracle` reproduces independent dense reference values. No peer private code redistributed.
