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

## Current HyperMatrix project canon

The owner-approved [Atlas Unified HyperMatrix decision](docs/canon/ATLAS_UNIFIED_HYPERMATRIX_20261123.md) establishes independent coordinate systems with typed, source-qualified crosswalks and revisable functional deity profiles. The existing agent allocation cap is distinct from knowledge-matrix cardinality. [Debate mappings and indexing improvements](https://github.com/atlaslattice/Atlas-Intelligence/issues/40). Canon adoption does not establish hosted deployment or scientific validation.

## Source-defined 1,728-step engineering program

The executable program, authored capability catalog, dependency scheduler, evidence ledger, functional memory and META145 integration logic live in [programs/excellence1728](programs/excellence1728/README.md). The initial release contains 1,728 planned steps and zero completed production steps. Original Ariadne coverage remains separately identified by its source digest and coordinates.

Run `npm run excellence:status` to inspect the hash-verified bundled program, `npm run excellence:ready` to list initial dependency roots, and `npm run test:excellence` to rebuild the exact plan and verify the source package. These entry points do not execute task text, post to rooms or grant host permissions.


## R01 supporting software kernels

The [canonical R01 source package](programs/civilization-r01/README.md) implements twelve bounded reusable kernels and an optional Work-scoped adapter. Its recorded local synthetic comparison retains eleven gain candidates and one H02 regression; the release adapter uses H02's scan fallback by default. These observations complete no specialized knowledge-node contracts and award no original 1,728 primary metric credit.

Run `npm run civilization:status` for the source catalog and release policy, or `npm run test:civilization` for the JavaScript and source-reference tests. Noosphere and Providers can prepare optional immutable source references to this package without carrying duplicate kernel engines. Current host authorization and return checks remain separate from source metadata validation.
