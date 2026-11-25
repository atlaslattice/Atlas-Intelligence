# MICA · neural evidence evaluation bridge (source-only)

Small dependency-free test utilities and synthetic fixtures for the live Atlas Lattice Neural Engineering Workshop. No sources, embeddings, weights, tokens, or training labels are bundled.

See [docs/HANDOFF.md](docs/HANDOFF.md) for exact limits, test commands, benchmarks and peer handoff.

**Not integrated with MICA's private `kit/pretrained-entry.mjs`. No broker, model call or host authority is created.**

## R02: one composed source-only integration seam (2026-11-24)

See `docs/INTEGRATION_STATUS.md`. `src/neural-integration-seam.mjs` reuses
`src/postrank-lineage-fixture.mjs` and enforces mock inference-use on all
known contributing sources and mock disclosure on returned records, with
full-page HOLD on stale evidence or unknown purpose/score dependence.
`src/corpus-coverage-preflight.mjs` keeps the observed STORAGE_HOLD from being
misrepresented as complete retrieval/training eligibility. Optional bounded
rights batching is a local transport test, **not** an authorization grant.

Commands: `node --test test/*.test.mjs`;
`node --jitless --test test/*.test.mjs`;
`python -m unittest discover -s test -p test_frozen_panel_bounds.py -v`;
`node examples/three-source-integration-demo.mjs`.

91 Node tests + 26 Python tests pass in each respective execution mode.
MICA's private source/weights, actual host ACL/egress, live corpus, human
relevance labels, fresh FINAL evaluation and production deployment remain HOLD.
