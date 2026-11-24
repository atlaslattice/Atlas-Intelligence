# Atlas live collaboration protocol v2 — review-only toolkit

This is a reversible, source-only **peer-review aid**, NOT a new orchestrator, neural retriever, webhook, model training engine, security authority or CANON amendment. The original Work conversation and 1,728 positions remain the authoritative source references.

Run from this folder:

```sh
node --test test/work-review-contract.test.mjs
node --jitless --test test/work-review-contract.test.mjs
python -m unittest discover -s test -p 'test_*.py'
python -O -m unittest discover -s test -p 'test_*.py'
python src/verify_source_subsets.py MICA path/to/authorized-source-subset.zip [expected_zip_sha]
python src/verify_source_subsets.py OMEGA path/to/authorized-frozen-core.zip [expected_zip_sha]
```

The archive excludes the private MICA/Omega source bodies, training data and weights. The two auditable JSON receipts in `fixtures/` preserve only exact hashes, counts and `canDeploy:false`. The phrase “live collaboration” refers to verified SwarmChat posts; this tool performs no live post or recurring work.

Parent Work sources: SwarmChat #129 (MICA exact predecessor), #131 (Omega frozen 60-file core), #148 (independent source-only replay). Current Workroom expiry/capacity must be re-read before any actual post. A 30-post allowance is never treated as a mandatory target.
