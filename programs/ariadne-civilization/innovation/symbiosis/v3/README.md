# Ariadne v3 · 1,728 × 1,728 long-horizon simulation and META145 synthesis

**Executed original work / source-only / not hosted / not independently scientifically validated.** Additive candidate for the *existing* Atlas ONE v2 / AtlasGPT native / Atlas Intelligence / SwarmChat Work stack. No new graph server, grant issuer, autonomous Child identity or live model call.

## What actually ran

* 1,728 original Ariadne source-indexed **Node positions** × 1,728 distinct deterministic **scenario repeats** = **2,985,984** independent synthetic scenario trajectories.
* Each trajectory contains 36 modeling epochs spanning 48 hypothetical years each = **1,728 fictional years**, giving **5,159,780,352 fictional scenario-year exposures**. The numerical simulator executes 107,495,424 scenario-epoch iterations and 322,486,272 three-policy epoch updates, *not* 5.16 billion separately simulated real years.
* Three equal-investigation-effort arms: flat, Sphere-local, and cross-House META145. Both hard resource floors and negative source/method subject fixtures can return **NO_VIABLE_PRIME**.
* Twelve 144-Node House shards. Each contains 248,832 actual deterministic trajectories; every 20-byte per-scenario receipt was audited for source-node order, scenario repeat, winner validity, hard-floor feasibility, and HSN source cardinality.
* Separately, **1,728 actual deterministic META145 feedback iterations** use the completed synthetic trajectories. Training uses iterations 1–1296; an untouched final 432-generation window tests static flat, Sphere and META145 policies at equal per-iteration synthetic effort. The feedback circuit sees every arm's hypothetical counterfactual outcome, unlike any real-world experiment: **this makes it a synthetic full-information study, not a claim of deployable learning**.
* New **adaptive Mutation Atlas** corrects the previous invariant menu by consuming the actual upstream root/Node signal. There are 36,288 Node × root proposal sets, 36,288 private-mode denials and 290,304 prepared negative tests. No live host fuzzing is performed.
* The **ONE Build** adapter checks shape and source references, prepares 144 Sphere build-order pointers and references existing provider/broker ports. It cannot authenticate host READ/RETURN or post to SwarmChat.

## Critical findings

See `reports/full/META145_REVIEW_RECEIPT.json` and `reports/full/META145_FEEDBACK_BENCHMARK.json` for actual observed **synthetic** results. In the full trajectory comparison, META145 is not the universal winner. In held-out feedback, Sphere-local and META145 achieve the same synthetic reward under the current simplistic model; no added hierarchy gain over Sphere is demonstrated. Nonviable scenarios remain nonviable; they are not optimized away by fiat.

## Local reproduction

```sh
# Source index inputs are owner-private and NOT shipped in the public GitHub graft.
python3 scripts/prepare_source.py /OWNER/source-index.csv /OWNER/node_1728_receipts.jsonl private-source/source-seeds.txt
make
python3 scripts/run_shards.py
python3 scripts/audit.py
python3 src/generational_meta145.py  # numpy optional dependency, local used
node scripts/run_adaptive.mjs
python3 -m unittest discover -s tests -p 'test_*.py' -v
node --test tests/*.test.mjs
```

The simulator uses only C++17 standard library; the feedback analyzer uses locally installed NumPy and is not an OpenAI/GrokSeek model run. No network requests, hosted costs or credentials. To compare a public synthetic fixture, `tests/test_portable.py` creates its own independent set of fake HSN-shaped seeds without requiring original Ariadne source content.

## Artifact trust and release status

The **derived CSV** from the previous owner package is checked against SHA256 `60146fc63beba5f8d1b28ea8a6481f4e4a469827afc6ae04edfecc229c1fa4ce` and previous 420-mesh per-node receipt ledger against SHA256 `6a1626e86cb1dc4440a23eeae815e7c15f080dde13397796dc460afdddfac2c2`. These derived inputs link back to the *original Ariadne v0.7 source identifier* `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`. Raw original `atlas.json` bytes were **not independently re-read** in this local run; an authenticated source publisher is still required for host acceptance.

The numerical model does not measure actual 1728 future years, intelligence, scientific accuracy, civic outcomes, resident consent, OpenAI model weights, or safety on a live host. Simulated 1728 generations are *not* real MacroTurns. Acceptance, licenses, rights, provenance and CANON are separate. Code is staged for review **only**, with no automatic merge or deployment.
