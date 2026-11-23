# Replacing the earlier drafts: capability-by-capability acceptance

| Earlier implementation | New v2 destination | Safe current action | Host condition before cutover |
|---|---|---|---|
| Atlas Intelligence Firebase substrate and mock LLM `/api/llm/generate` | OpenAI Agents SDK opt-in manager under v2 | Treat existing app as archived implementation/data source; no automatic transfer | Replace mock response, verify real billing/model/identity, migrate permissions separately |
| Sheldonbrain RAG (Gemini embeddings + Pinecone, 12x12+1) | v2 provenance-aware retrieval port and native Ariadne 1-based HSN | Metadata-only migration preview with old hash and edition | Explicit 0-base collision review, owner rights + corpus provenance, contract tests |
| Alexandria and old Google Drive index | Immutable source references exposed to v2 | Original stores remain unchanged | Real authorized source retrieval and rights-at-return |
| AtlasGPT 0.5.x plugins | v2 OpenAI-native research client and MCP wrapper | Private source release with exact code digest | Verify native plugin skill visibility, host MCP registration and signed-in use |
| SwarmChat v27/v32 experimental Site/D1 | **Same** existing broker with v2 Work interface | Continue independent account-private Work smoke | Exact served HEAD, two-account D1 tests, event delivery and rollback |
| Legacy CANON and HSN variants | Edition-qualified historical records | Keep predecessor text and dissent unchanged | Separate elected/human ratification; never auto-upgrade |
| Optional simulations/REEFCORE/Glyphforge/Quantum Labs | Typed `tool` ports, later registered behind OpenAI Agents SDK guardrails | Keep simulations distinct, source-only | Domain-specific execution calibration and safety gates |

## Definition of replaced

Legacy code can be marked **superseded**, not deleted, only after a v2 owner-local source run passes, exact feature parity is documented, signed-in publisher release is witnessed and rollback tested. `Atlas ONE v2 source built` is a valid milestone; `all Atlas deployed` is not.

## Gate summary

- Test reproducibility and negative cases: implemented owner-locally.
- Original HSN source pin: owner-local verified only; complete original source **not** in public repo.
- OpenAI Agents SDK: mocked or opt-in only; no real model call or spend claimed.
- SwarmChat host: no publisher file write or real two-account test in this package.
- Live OpenAlex/arXiv/Crossref: no network fetch in this package; historical snapshots preserved.
- Scientific claim adjudication: none automatically accepted.
- CANON: unchanged, no signing or ratification performed.
