# Atlas ONE / Ariadne — Twenty Invention Labs v0.1

**New executable source-only experiments** that plug into the **existing** Ariadne v0.7 knowledge-coordinate ecosystem, Atlas ONE native-v2/CivilizationUnifiedBuild, META145, AtlasGPT and SwarmChat Work review contracts. The twenty operator implementations are in `src/innovations.mjs`; no additional broker, source registry, task queue, model provider, grant issuer, D1 schema or CANON authority is created.

## Reproduction

Requires Node.js 22+. No network, credentials, downloads, paid models, dependencies or original private atlas.json.

```bash
node --test tests/innovation.test.mjs
node scripts/run-1728.mjs private-source/source-index.csv reports
python scripts/audit.py
```

The runner requires **exact owner-private source-derived CSV bytes** pinned to SHA-256 `60146fc63beba5f8d1b28ea8a6481f4e4a469827afc6ae04edfecc229c1fa4ce`. Do not replace with a fabricated registry; this CSV contains Node labels and record SHA IDs but is *not* the complete original Ariadne v0.7 source. Raw original atlas.json SHA-256 `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6` must be independently verified by the existing v2 loader at true integration time.

**Tests:** 105 focused Node tests. The 1728-loop executes 34,560 positive source-indexed synthetic function invocations and 34,560 targeted negative mutation calls, all of which must HOLD. It produces `reports/synthetic_34560.jsonl`, `reports/negative_34560.jsonl` and `reports/meta145_innovation_reduction.json`; 144 Sphere and 12 House aggregate cardinalities are validated. The `composeInnovationCircuit` reducer returns an advisory result for one synthetic source coordinate; it does not source or execute models.

See `INVENTIONS_20.md` for each algorithm, desired high-impact outcome, falsifier and intended integration surface. See `INTEGRATION.md` and `SOURCE_RIGHTS.md` for irreversible/host gates. No global invention novelty assertion is made; open-source and published prior-art comparison is separate.

## What is not yet completed

- No 20 real hosted features, no 1,728 actual AI specialists, no 69,120 model inferences, and no production rights/grants.
- No new human-reviewed Ariadne-to-OpenAlex semantic edges, scientific discoveries, quantified welfare gains or independent algorithm superiority claims.
- No new GitHub merges, publishing, private-mode ingestion, autonomous model wake or third-party code copying.

All code is a candidate graft. The existing Atlas/Ariadne/SwarmChat systems retain authority over actual READ, RETURN, source retrieval, publication and governance.
