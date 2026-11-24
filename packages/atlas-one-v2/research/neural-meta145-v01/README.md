# Atlas Neural META145 — Evidence-first 1728 Strategy Sidecar

**Status:** SOURCE-BOUND LOCAL SYNTHETIC EXPERIMENT / IMPLEMENTED SOURCE-ONLY SIDECAR / NOT A HOSTED MICA PATCH / NOT TRAINED BGE / NO CANON OR PERMISSION EFFECT.

The existing MICA neural-first candidate remains the predecessor. This is **not** a replacement for the pretrained model, an HSN embedding matrix, or the SwarmChat Work publisher. It adds a finite, source-aware *candidate → evidence* review contract and a reproducible META145 parameter-policy experiment. The owner-held pretrained model-release archive and its previously consumed evaluation panel were **not available here and were not read, loaded, tuned or changed**. An authorized Work discussion supplied an API sketch, not a deployable source tree.

## Built and run

- **1,728 actual local strategy configurations**, enumerated over all 1,728 original Ariadne v0.7 HSN addresses. Each exact original node has one source-record SHA and one unique parameter candidate. The mapping between configuration numbers and HSN addresses is **positional research bookkeeping, not semantic equivalence**.
- **144 Sphere selections** (best development-policy candidate from twelve per Sphere), **12 House summaries**, **one META145 candidate** chosen on development data only.
- **144 synthetic development queries** and **144 disjoint-family synthetic FINAL holdout queries**, both generated using original HSN *identities* but **fake source families and fake neural scores**. The predecessor's consumed final panel was not reused. A fitted policy is a review-order heuristic, not a trained neural encoder.
- Candidate two-stage evidence boundary: exact source/document/vector binding, current revision and correction, independent root family, contradictory evidence retention, source rights at READ and again at RETURN, no-answer abstention, separate `NEURAL_DIRECT`/`GRAPH_EXPANSION`/`LEXICAL_BACKUP` counts, no private bodies or implicit training-positive labels.
- Source-only Python prototype plus a thin **Node ES module** that accepts the upstream candidate fields (`documentId`, `sourceId`, `lane`, `score`, `citation/sourceSha256`, `ontology`, `glyphAliases`, optional Canon `sourceProvenance.sourceSpan`). The Node module **prepares references only**, never serializes protected evidence and never claims host authorization.
- Offline interactive observatory with House/Sphere filters, all 1,728 strategy records, development objective, selected policy and honest performance boundaries.

## Synthetic held-out results (NOT BGE performance)

| Condition | Conservative source-filtered baseline | META145-diversity policy |
|---|---:|---:|
| Independent source roots per query | 1.826389 | 2.750000 |
| Synthetic relevant roots per query | 1.215278 | 1.805556 |
| Contradictory source retained | 61.11% | 91.67% |
| Correct no-answer handling | 100% | 100% |
| Unauthorized or substituted source references returned | 0 | 0 |

**Limits:** The fixture generator intentionally contains duplicate origins and contradictory evidence. Better root diversity within that constructed distribution does not prove better human answer accuracy or generalization, let alone a globally optimal policy. More independent expert review and real source-family/time-disjoint data are required. The frozen MICA silver result stays separate.

## Local reproduction

```bash
# Synthetic public tests, no private corpus
PYTHONPATH=. python -m unittest discover -s tests -v
PYTHONPATH=. python -O -m unittest discover -s tests -v
node --test js/pretrained-evidence-sidecar.test.mjs

# Full original-source execution (requires owner-provided separately authorized exact bytes)
PYTHONPATH=. python -m src.simulate --registry private/ariadne-v07-exact.json --out output
PYTHONPATH=. python -m src.audit --registry private/ariadne-v07-exact.json --out output
PYTHONPATH=. python -m src.viewer --out output --dest output/NEURAL_META145_STRATEGY_OBSERVATORY.html
# Optional actual browser, requires Playwright and Chromium:
PYTHONPATH=. python tests/browser_smoke.py
```

The original v0.7 registry must SHA256 to `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`. The public source archive intentionally excludes that file, any BGE weights, real source passages, account tokens, and model-training corpora.

**Host integration blocker:** The exact owner-held pretrained-entry source, current trusted source family/revision mapping, an authenticated rights-at-RETURN port, and release-identity proof need to be bound by the existing publisher. We **did not install a plugin, invoke a BGE model, train a new model, launch background jobs, merge code or deploy a Site**.
