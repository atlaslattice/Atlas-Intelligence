# Atlas GitHub Workboard: source-index integrity and non-closure gate

**Candidate / read-only / no network / not CANON / no automatic merges or task closures.**

This gates the public-source `docs/ops/ATLAS_GITHUB_OPEN_SOURCE_CUT_20261122.json` snapshot without changing its original contents. It verifies exact link formats, issue-vs-PR namespaces, unique URLs, per-repository aggregate counts, publicly scoped input, source truncation warnings, and the voluntary one-third Work rhythm. It distinguishes a verified INDEX from a verified CURRENT PR or ISSUE state.

`python scripts/workboard_integrity.py docs/ops/ATLAS_GITHUB_OPEN_SOURCE_CUT_20261122.json` checks the source-cut fixture. `python -m unittest discover -s tests -p 'test_workboard_integrity.py' -v` runs isolated tests.

Missing records in a newer snapshot are **not** merges/closures. A real closure needs an independently fetched current GitHub issue/PR state, head SHA, execution/CI evidence as appropriate and accepted review gates. No user-private Work, Social, Play, Imagine, Quiet or Brain/Palace content should enter this index. All 1,728 Ariadne node addresses remain a separate ontology, not 1,728 completed tasks.

Proposed scope: [Atlas Intelligence Workboard PR #3](https://github.com/atlaslattice/Atlas-Intelligence/pull/3), source-only already merged. This extension adds executable integrity checking, not a live-refresh job.