# One rewrite, not five adopted runtimes

The new implementation is original source, informed by **documented OSS design patterns**, not copies of framework internals. No LangGraph/Temporal/CrewAI/AutoGen/Prefect runtime is installed. The selected abstractions are rewritten as code in `src/*`.

| Source/framework | Useful documented concept | Atlas ONE v2 implementation | Deliberately excluded |
|---|---|---|---|
| OpenAI Agents SDK | Agent tools, handoffs, guardrails, tracing and human review | `src/openai.mjs` bounded opt-in model reviewer | Network on import, default sensitive tracing, model-given rights |
| OpenAI Responses API / MCP | Native tool calling, transport-neutral function schemas | `src/mcp.mjs` with owner-local four-tool read-only interface | A new remote broker or fabricated ChatGPT app registration |
| LangGraph | Explicit graph state and durable checkpoints | Finite five-stage `src/engine.mjs`, `src/journal.mjs` | External LangGraph runtime/state-store migration |
| Temporal | Idempotency, replay, recovery after worker failure | Immutable per-run inputs, hash-linked events, exclusive local lock and uncertain effects | Unbounded retries and claims of exact-once network side effects |
| CrewAI | Specialist delegation and task separation | OpenAI-native reviewer role and future constrained specialist tools | Another crew/orchestration server |
| PydanticAI | Typed input/output validation | One bounded internal schema plus `parseStrictJson` for unpinned ingress | Competing Python model runtime |
| Prefect | Observable step outcomes, reproducible operations | Versioned stage/evidence receipts and test matrix | A second workflow scheduler |
| AutoGen (historic) | Genuine conversational critique | Typed cross-agent hypotheses/objections in existing Work broker | Archived AutoGen framework and pseudo-peers |
| Event sourcing | Append-only accountable history | Digest chain journal, read-only verification, no erasure | Automatic replay of uncertain external effects |
| Data provenance and scientific reproducibility | Source identity, falsification, independent review | Exact Ariadne source SHA, paper URLs, `NOT_EXECUTED`, `REVIEW_REQUIRED` | Claiming complete human knowledge or measured intelligence gains |

Reference documentation (for provenance and current compatibility):
- OpenAI Agents SDK: https://openai.github.io/openai-agents-js/
- OpenAI Responses/MCP: https://developers.openai.com/api/docs/guides/tools
- LangGraph source: https://github.com/langchain-ai/langgraph
- Temporal source: https://github.com/temporalio/temporal
- CrewAI source: https://github.com/crewAIInc/crewAI
- PydanticAI source: https://github.com/pydantic/pydantic-ai
- Prefect source: https://github.com/PrefectHQ/prefect
- AutoGen historical source: https://github.com/microsoft/autogen

The original code here does not depend on copying nontrivial third-party software. Keep any future vendored code's exact licenses and source references in a separate manifest and audit before distribution.
