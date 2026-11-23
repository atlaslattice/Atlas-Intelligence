# Atlas ONE v2 primary rewrite — migration/cutover decision

Status **REVIEW CANDIDATE** (not current served Site; not independently authenticated residents; no CANON changes). The old Firebase-backed `server.ts` returns mocked normalized LLM outputs and should be retired as a functional model endpoint after a production cutover. Sheldonbrain's older 12x12+1 ontology and Gemini/Pinecone memory records also become **legacy source systems**, not the new orchestration contract.

## New preferred runtime

`packages/atlas-one-v2` owns one original Node 20+ core. OpenAI Agents SDK is the optional model execution API, MCP is the tool transport, Ariadne v0.7 original bytes SHA256 is the source identity, and SwarmChat remains the sole existing account-private Work broker.

- `src/index.mjs`: exact 1,728-node Ariadne registry pin, new unpinned JSON parser and typed hypotheses.
- `src/engine.mjs`: 5-stage finite research review workflow and Work-only source packet.
- `src/journal.mjs`: durable, local digest chain with lock and idempotency; unknown remote effects are not blindly replayed.
- `src/openai.mjs`: opt-in Agents SDK reviewer; tracing disabled by default; model output cannot validate science/rights.
- `src/mcp.mjs` / `src/mcp-stdio.mjs`: read-only local MCP with strict JSON entry.
- `src/http.mjs` / `src/serve-local.mjs`: owner-local loopback-only HTTP preview, no public IAM or Site deployment.
- `src/adapters.mjs` / `src/migrate.mjs`: conditional Work read+return host port and metadata-only legacy migration preview.

## To reproduce

```bash
npm run atlas:v2:test
ATLAS_ARIADNE_ORIGINAL_FILE=/authorized/private/atlas.json npm --prefix packages/atlas-one-v2 run smoke
ATLAS_ARIADNE_ORIGINAL_FILE=/authorized/private/atlas.json npm run atlas:v2:serve-local
```

Public CI cannot include the owner-private exact `atlas.json`; tests requiring it are intentionally skipped. An owner-local source-pinned run has 119/119 passing tests as of this candidate; absence of source bytes in public CI produces 96 passes and 23 deliberate skips. Do not call that hosted verification.

## Stage gates to supersede historical code

1. Reproduce current Git HEAD build/test and exact source manifest; repair all red CI.
2. Independently inspect selected publisher-owned original registry pin. No user-supplied prevalidated registry or H00-to-H01 offset authority.
3. Mount the v2 core behind existing SwarmChat host-trusted identity/rights; READ and RETURN checks, two accounts, mid-read revocation, no private mode leakage.
4. Verify strict current OpenAI Agents SDK execution through actual authorized host credentials, cost cap, controlled tracing and correct citation statuses; no mock response may display **VERIFIED**.
5. Separate live OpenAlex/arXiv/Crossref updates from the frozen 4516 topic edition; check correction/retraction.
6. Run actual peer dialogue and held-out baseline-vs-augmented scientific tasks. Do not claim a cognition upgrade from a packet or chat count.
7. Signed-in Site UI, a compatible migration of legacy records (no automatic copy), rollback with original server and D1 snapshots, publisher readback.
8. Only then deprecate historical server routes and adjust default app entry. Never auto-change CANON or send any non-Work source to Work.

## Publishing and rights

This PR is the replacement **source implementation**. It neither publishes a SwarmChat Site nor certifies host authentication. Owner-private AtlasGPT contains the same v2 algorithm source and a preferred lazy loader at `integrations/atlas-one/wired.mjs`; its plugin installer is not a Site deployment mechanism.

Original third-party orchestration code was **not** copied. The design selectively reimplements state graphs, replay-safe journals, typed contracts, specialist review and traceability with OpenAI-native APIs. See [the source synthesis](../packages/atlas-one-v2/docs/REWRITE_AND_CHERRYPICK.md) and [host boundary](../packages/atlas-one-v2/docs/SWARMCHAT_PUBLISHER_PORT.md).
