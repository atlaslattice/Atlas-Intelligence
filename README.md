# Element 145 / ATLAS

## ATLAS ARI — GPT-centric UWS (experimental full tool access)

**[Run the real local UWS + compatible-model integration](integrations/README.md)** · **[Draft integration PR #2](https://github.com/atlaslattice/Atlas-Intelligence/pull/2)**

The versioned Python agent bridges GPT-compatible model tool calls to the user's local [UWS CLI](https://github.com/atlaslattice/uws), including supported **read and write** operations across authorized providers. External writes require native UWS dry-run and human approval. This does not connect or expose a public browser execution endpoint. The existing browser proxy remains a **mock** (now labeled as such), not verified inference. Models, OAuth, live providers, and user consent must be configured on the local host.

Firebase-backed multi-provider AI substrate with strict data-layer invariants. The browser multi-provider proxy is a simulation pending authenticated SDK wiring; the local ARI UWS agent is the separately executable real-model integration.

Most "agent frameworks" wrap an LLM call in retry logic and call it autonomy. This kernel is different.

## What this is
- **Constitutional Data Layer:** Firebase rules enforce core invariants. Agents possess restricted roles and are strictly scoped by user boundaries.
- **Architectural 144-Cap:** Enforced at the schema level.
- **Role-bounded Agent Dispatch:** Autonomous assignment initialized across the defined Houses.
- **Unified Epistemic Interface:** All claims flow through the verification engine to explicitly denote confidence tiers. Unverified information defaults to `NOT_VERIFIED`.
- **Zero Erasure:** The canonical memory avoids destructive deletes by architectural design, establishing an append-only timeline mapping over the user scope.

## What this isn't
- It is NOT a simple wrapper for API completion endpoints.
- It doesn't treat AI as infallible. It surfaces uncertainty, rejects unsupported facts, and actively tracks conflict of interest by explicitly tracking the multi-model `provider` of each spawned agent record.

### Key Refinements Active
- **Provider Norm:** `server.ts` scales responses generically as `{ provider, text, tokens_used, finish_reason }`.
- **Token Boundaries:** `max_tokens` limits explicitly managed.
- **COI Transparent:** `provider` field tracks agent records continuously.

## Schema Summary
**MemoryEntry** (`users/{userId}/memories/{memoryId}`)
- `userId`: String (Owner)
- `content`: String
- `tier`: String ('volatile', 'working', 'canonical')
- `tags`: Array of Strings (optional)
- `metadata`: Object (optional)
- `createdAt`: Number (timestamp)
- `confidenceTier`: String ('VERIFIED', 'DESIGN_CHOICE', 'CREATIVE_OVERLAY', 'NOT_VERIFIED')
- `supersedes`: String (optional ID of the entry this replaces)
- `supersededBy`: String (optional ID of the new entry that replaces this)

**Agent** (`users/{userId}/agents/{agentId}`)
- `userId`: String
- `houseId`: String
- `provider`: String
- `system_prompt`: String
- `status`: String ('ready', 'running', 'halted', 'completed', 'failed')
- `createdAt`: Number
- `updatedAt`: Number

**IntelligenceNode** (`users/{userId}/intelligence/{nodeId}`)
- `userId`: String
- `type`: String ('core', 'willow', 'gnome', 'sycamoreG')
- `data`: Object
- `createdAt`: Number
- `updatedAt`: Number
