# Atlas HSN-180 · Original source-safe experiment and META145 adapter

This original implementation evaluates **1,885** hierarchical finite synthetic simulations at **180 years each** (six predeclared policy tracks per simulation) on properly scoped 1,728/144/12 original Ariadne coordinates. **It does not contain the original Ariadne registry, original Node names/definitions, private Work conversations, resident leisure material, model weights or Atlas account credentials.**

This is an additive extension of the existing Atlas v0.9 source-to-compute verification, not a replacement broker. The owner-private source registry and predecessor v0.9 receipts are required for full, original-source replay. Do not invent these bytes or downgrade the pinned digest.

## Local source-free checks

```sh
node --test integrations/test/meta145-hierarchy180.test.mjs
python -m unittest discover -s experiments/v10/test -p 'test_hierarchy180_public.py' -v
```

The included `excellence-program.mjs` and `excellence-plan-data.mjs` are exact publicly authored original Atlas files from the user's existing repository, included only to support standalone source-safe Node testing; they are already present in the target Atlas repository and should **not** be re-committed there. No third-party open-source code has been copied.

## Repository integration paths

- `programs/excellence1728/integrations/meta145-hierarchy180.mjs` — source-only, SHA-locked, genuine-Excellence-object status and Work preview.
- `programs/excellence1728/integrations/test/meta145-hierarchy180.test.mjs` — 16 no-secret regression cases, including tamper and fake authority controls.
- `programs/excellence1728/experiments/v10/hierarchy180.py` — deterministic original hierarchical policy circuit.
- `programs/excellence1728/experiments/v10/test/test_hierarchy180_public.py` — 12 synthetic, public-safe Python tests.
- `programs/excellence1728/docs/ATLAS_HSN180_METHODS.md` — source/provenance and nonclaims.

Owner-private complete source release additionally includes exact original source digest 07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6, individual annual Node receipts, 144 Sphere/12 House/META trajectories, a previous-version archive and browser explorer. The model's units are **fictional utility points** and **synthetic review costs**, never human welfare, scientific validity or cognitive ability.

**Status:** `TESTED_LOCAL / HOST_READ_RETURN_HOLD / CI_RUNNER_HOLD / NO_CANON_EFFECT / NO_PRIVATE_LEISURE_INGEST`.
