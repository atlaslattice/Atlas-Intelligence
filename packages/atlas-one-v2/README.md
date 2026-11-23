# Atlas ONE v2 — OpenAI-native replacement core

**STATUS: source-built / local tests passing / not a verified hosted release.**

This is an **original rewrite** of Atlas's orchestration layer, not another agent framework. The previous Atlas Intelligence/Firebase and Sheldonbrain/Gemini/Pinecone engines are *legacy data sources and migration references*, not the logic source of truth. A single package in `packages/atlas-one-v2` owns orchestration contracts; AtlasGPT packages this code as a private OpenAI-native client, and the existing SwarmChat Site remains the only broker. No private source assets are included in the public package.

## Capabilities verified locally

- SHA-pinned authentic Ariadne v0.7 source, 12 Houses, 144 Spheres, 1,728 nodes; source names/semantic definitions preserved and not equated to evidence.
- Strict parsing of **unpinned** JSON objects, including duplicate / NFC key aliases and numeric overflow/underflow; measured scientific decimals should be typed strings with units rather than approximated JavaScript floats.
- Multi-House scientific hypotheses, typed relationships, source URLs, falsifiers and independent-review-required outcomes.
- Five deterministic journaled stages: `PREPARED -> SOURCE_MAPPED -> EVIDENCE_TRACED -> COUNTER_REVIEW_REQUESTED -> REVIEW_REQUIRED`.
- Atomic single-local-host event journal with exclusive lock, content-digest replay checks and `NO_REMOTE_RETRY_WITHOUT_WITNESS` for lost acknowledgements.
- Current-access Work read/return callback contract; no model-provided identity or rights accepted; only minimal source-reference projections exported. Simulated host callbacks do not confer production authentication.
- Read-only owner-local MCP tool router and loopback HTTP preview; bounded optional OpenAI Agents SDK reviewer. SDK tracing is off by default. Model calls are opt-in; **no API credits were spent in this build**.
- Metadata-only, not automatic, legacy memory and agent migration preview. No old memory body is shipped or moved to a new backend.

## Run

Node.js 20+; no `npm install` needed for tests or source-only execution.

```bash
npm test
ATLAS_ARIADNE_ORIGINAL_FILE=/authorized/private/atlas.json npm run smoke
ATLAS_ARIADNE_ORIGINAL_FILE=/authorized/private/atlas.json node src/mcp-stdio.mjs
ATLAS_ARIADNE_ORIGINAL_FILE=/authorized/private/atlas.json npm run serve:local
```

The original `atlas.json` must match SHA-256:

`07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`

The first command runs a large synthetic/cross-boundary test suite. Tests requiring the *real original source bytes* skip unless `ATLAS_ARIADNE_ORIGINAL_FILE` is set. The demo uses four source-cited **unreviewed research hypotheses** and does not call a model or broker.

## OpenAI-native model path

The optional reviewer supports `@openai/agents` (install in the authorized **host runtime** only) using a bounded number of turns, no default tracing, and source-reference minimization. All model statements remain review suggestions. The model cannot sign a grant, change CANON, wake a resident or write to a private Work room. The local MCP router can be launched by the owner for inspection, but is **not** automatically registered with ChatGPT or the production SwarmChat Site.

## Migration philosophy

The new core replaces earlier prototypes as *architecture*. Existing user data and source history stay in their original stores. The opt-in migration API creates only provenance pointers and schema/rights review queues. Legacy `VERIFIED`, `canonical`, previous `Mxx` IDs, old 0-based coordinates, and self-declared agents never become automatically ratified Ariadne or hosted rights.

See `docs/REWRITE_AND_CHERRYPICK.md`, `docs/SWARMCHAT_PUBLISHER_PORT.md`, and `docs/MIGRATION_ACCEPTANCE.md`.

The HTTP preview binds only `127.0.0.1` and returns candidate/source data only. Do **not** expose it through a public reverse proxy without separately installed, signed-in, host-controlled authorization. The legacy Express server remains unmodified until publisher migration acceptance.
