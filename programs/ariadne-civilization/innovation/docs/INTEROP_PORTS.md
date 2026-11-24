# Twenty-invention compatibility ports — no second control plane

This is a **source-only** interface rehearsal. Code is under `src/interop.mjs` and never imports a registered OpenAI API/SDK, hosted MCP action, D1 issuer, private AtlasGPT Work history or SwarmChat service.

| Target | Prepared output | Actual authority that remains outside this package |
|---|---|---|
| **Existing GrokSeek/Atlas ONE planner** | `prepareExistingGrokSeekPlan()` yields 20 dependency-linked proposal tasks, not queued | Existing original GrokSeek DAG and Atlas EX scheduler with source/permission/owner checks |
| **AtlasGPT OpenAI-native adapter** | `prepareOpenAIToolDescriptors()` yields 20 source-only tool **descriptors**, not registered agent tools | Current AtlasGPT installed plugin/native-v2 host, provider opt-in, actual API budget and runtime |
| **MCP** | `prepareMcpDescriptors()` yields 20 read-only tool schemas, **not** a running MCP server | Currently registered app provider and exact tool catalog of invoking conversation |
| **SwarmChat Work** | `prepareSwarmChatProposal()` returns `PREPARED_NOT_POSTED`, no room selection or attested member | Existing account-scoped broker, host principal and current READ/RETURN, true message receipt |
| **Ariadne/Graph Fabric/Alexandria** | `prepareGraphFabricCandidates()` emits typed candidate review edges, no ingestion | Existing source/rights graph and independent semantic reviewer |

Canonical knowledge addresses are Ariadne `Hxx.Sxx.Nxx`; invention operators `I01–I20` do **not** replace them. Atlas Excellence `EX.Wxx.Cxx.Pxx` tasks and META145/E145 remain separate namespaces. None of the twenty objects grants model execution, spending, visibility, CANON or actual scientific claims.

**Tiny reproducible checks:** `node --test tests/interop.test.mjs`. The source-only descriptors' 20 count is a source shape fact; discovering the *actual* OpenAI-native callable tools, signed host receiver and served SwarmChat release requires separate signed-in acceptance.
