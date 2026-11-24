# META145 v0.8 — source-safe parallel codebase configuration search

**Status:** tested locally, additive DRAFT, host deployment HOLD. No model-weight training, autonomous residents or 1,728 fully-authored repos.

The owner-private code trial used the **exact original Ariadne v0.7 registry** SHA256 `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`. It constructed 1,728 unique *executable policy compositions* from a 12×12×12 array: source lookup algorithms (linear, 12-node Sphere bucket, or source-keyed direct index), bounded memoization capacities and eviction variants, and prefetch/scheduler strategies. Each ran 1,728 **synthetic computational years** with a source-node revision and three lookups per year. A real `ProcessPoolExecutor(max_workers=4)` ran candidate tasks concurrently, but no 1,728 simultaneous OS processes existed.

Nine training mutation decisions were considered per candidate over the first 1,296 years. The remaining 432 synthetic years were held frozen for leaderboard evaluation; this prevents direct future-data learning. All 1,728 candidates checked their source-derived output consistency and current rights-epoch cache key. The winner was selected against **estimated cost units** with modeled index setup and cache penalties; it is not a globally optimal software implementation. The leaderboard used to select the winner is selection-biased. An independently generated synthetic canary tested the frozen winner again. Results are not a scientific or societal welfare gain.

A separately measured local Python benchmark ran the selected and baseline executable lookup/cache algorithms on 21 paired alternating-order original-source workloads; this physical timing is **not** the simulation's modeled cost ratio and cannot be multiplied by a separate Node review-reducer benchmark.

## Native reducer refactor

The original v0.7 `meta145-evidence-portfolio.mjs` sorted all source review records and repeatedly scanned the 1,728-entry array for 144 Sphere groups. The v0.8 rewrite places each validated zero-padded coordinate directly at its unique ordinal slot, then slices 12 contiguous entries per Sphere and 12 Sphere summaries per House. The source-safe v0.7 original is preserved as a **test fixture**; the public 8-case differential test requires complete response, digest and source-row equality under shuffled sources, all review states and negative rights cases. The original 19 Node tests still pass.

Local Node 21-pair benchmarks on three workloads show small measured gains, without any changed result receipt. No additional source publication, host permission, CANON, OpenAlex adjudication or expert claim is made.

## Work-only use

`createMeta145CodebaseEvolution` requires (1) an existing `isVerifiedProgram` Excellence object, (2) exact output bytes, and (3) independently configured expected SHA-256 from a trusted operator. It checks the source registry digest, cardinality and non-claims and offers only `PREPARED_NOT_POSTED` previews with HSN and EX task namespaces distinct. A source hash is **not authorization**, and the module does not mount itself on a live publisher or create rooms. The private source corpus is not bundled in GitHub; use a legitimately permitted local copy for full replay.

## Reproduce public synthetic tests

```bash
node --test programs/excellence1728/integrations/test/meta145-v08-equivalence.test.mjs programs/excellence1728/integrations/test/meta145-codebase-evolution.test.mjs
python -m unittest discover -s programs/excellence1728/experiments/v08/tests -p test_synthetic.py -v
```

For owner-private source test and 1,728 four-worker run, use the complete archive and consult its README. This experimental code does not replace Atlas ONE v2 orchestration, the Atlas Excellence source ledger, the existing SwarmChat Work publisher, or any private resident Brain/Palace.

**Release gates remain:** source-current CI with actual GitHub Actions runner steps (issue #15), review against Atlas ONE v2 interfaces, genuine current publisher issuer/ACL at READ and RETURN, two-tenant revocation, cold/warm resource benchmarks and verified rollback. Preserve original v0.7 for emergency reversal; no implicit merge or deployment.
