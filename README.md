# Element 145 / ATLAS

Firebase-backed AI application with an existing frontend Gemini SDK path. The separate server multi-provider proxy reports unavailable until a real provider adapter is configured; credential presence alone does not establish readiness.

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
- **Server Provider Boundary:** `server.ts` returns an explicit `provider_unavailable` error while its SDK adapter is unconfigured. It fabricates no response text or token usage.
- **Token Boundaries:** Server `max_tokens` accepts integers from 1 to 16,000.
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

## Source-qualified context integration

[The context integration adapter](programs/context-integration/README.md) verifies explicitly supplied Ariadne v0.7 bytes and preserves complete original node records. It optionally delegates context preparation to an owner-injected local `AtlasIntegratedModule`, checking returned source/task fidelity, scope and digests. The registry, private Work bodies, database and local runtime are not bundled here. Existing LCP labels remain explicitly `ATLAS_LCP_LEGACY`; matching H/S numbers are not a semantic crosswalk. Run `npm run test:context-integration`; source-dependent fixtures require the owner's exact `ATLAS_ARIADNE_ORIGINAL_FILE` and are otherwise reported as skipped.

## Source-defined 1,728-step engineering program

The executable program, authored capability catalog, dependency scheduler, evidence ledger, functional memory and META145 integration logic live in [programs/excellence1728](programs/excellence1728/README.md). The initial release contains 1,728 planned steps and zero completed production steps. Original Ariadne coverage remains separately identified by its source digest and coordinates.

Run `npm run excellence:status` to inspect the hash-verified bundled program, `npm run excellence:ready` to list initial dependency roots, and `npm run test:excellence` to rebuild the exact plan and verify the source package. These entry points do not execute task text, post to rooms or grant host permissions.


## R01 supporting software kernels

The [canonical R01 source package](programs/civilization-r01/README.md) implements twelve bounded reusable kernels and an optional Work-scoped adapter. Its recorded local synthetic comparison retains eleven gain candidates and one H02 regression; the release adapter uses H02's scan fallback by default. These observations complete no specialized knowledge-node contracts and award no original 1,728 primary metric credit.

Run `npm run civilization:status` for the source catalog and release policy, or `npm run test:civilization` for the JavaScript and source-reference tests. Noosphere and Providers can prepare optional immutable source references to this package without carrying duplicate kernel engines. Current host authorization and return checks remain separate from source metadata validation.

## Optional corpus synthesis

[Corpus synthesis](programs/corpus-synthesis/README.md) adds twenty source-grounded
retrieval, provenance, and context mechanisms through the existing context entry
point. It uses explicitly supplied owner-bound sources, exact citations,
version and counterevidence retention, and a current authorization callback.
A+B=C produces a falsifiable hypothesis record with two cited inputs; it does not
promote source claims into accepted facts. The package includes generic code and
invented fixtures, with no personal corpus or automatic source loading.

Run `npm run test:corpus-synthesis`. [Aggregate development results and their
limits](programs/corpus-synthesis/docs/evaluation.md) are separate from live
application behavior and general model-quality claims.

An optional [Node classifier](programs/corpus-synthesis/classification/README.md)
uses caller-supplied original Ariadne bytes to produce source-pinned, exact-span
review candidates while preserving all original node scopes and exclusions.
Large corpora use a metadata manifest and streaming per-hash text files.
`npm run test:corpus-classification` runs its generic controls; exact-source cases
require `ATLAS_ARIADNE_ORIGINAL_FILE`. The classifier entry remains separate from
the browser-compatible context API, and every generated semantic link remains
unreviewed.
