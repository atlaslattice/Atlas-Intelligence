# Element 145 / ATLAS

Firebase-backed multi-provider AI substrate with strict data-layer invariants. Currently routing primary calls to Gemini; multi-provider proxy scaffold ready for SDK wiring.

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


## New Atlas ARI v0.1 research fabric (DRAFT)

See [integrations/README.md](integrations/README.md) for the source-linked opt-in **UWS** read-only adapter, **Sheldonbrain** private parser/query integration, functional **SQLite knowledge graph**, **GPT-primary + independent reviewer** two-brain CLI, exploratory **8/8/8 Dream/Play/optional Work** registry, and sandboxed **SHUGS** numerical data.

**Operational truth:** The existing Express LLM endpoint has not been connected to vendor SDKs. It now returns `501 provider_dispatch_not_implemented` rather than the previous falsely labeled `[✓ VERIFIED]` mock answer. `GET /api/atlas/fabric/status` reports capabilities only; it does not run UWS, Sheldonbrain or models. The separate local Python tools never execute without explicit user invocation. The constitutional baseline is user-directed INV-0 **Nothing Dies**, not a signed government or vendor ratification.

This is a review branch; run tests and secure the web app before connecting any private account or promoting to production.
