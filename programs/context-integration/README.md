# Source-qualified context integration

This additive package connects caller-owned Ariadne source bytes to an optional
local Atlas runtime. It preserves original source fields and keeps the existing
application's historical LCP labels in a separate namespace. It does not bundle
the original registry, private Work records, local databases, model credentials,
or the separately distributed local runtime.

## Exact source access

```js
import {readFile} from 'node:fs/promises';
import {createAriadneSourceAdapter, ariadneNodeReference} from './index.mjs';

const source = await createAriadneSourceAdapter(await readFile(ownerSourcePath));
const reference = ariadneNodeReference('H01.S01.N01');
const originalNode = source.node(reference);
const {sphere, house} = source.ancestry(reference);
```

`ownerSourcePath` is an explicitly selected local file. The adapter verifies the
SHA-256 of its exact bytes against the public Ariadne v0.7 pin before parsing.
The accepted registry has 1,728 nodes, 144 Spheres and 12 Houses. Node reads return
detached complete original objects, including their definitions, inclusions,
exclusions, original roles and uncertainty labels. Module import performs no
source loading or network request. Source loading is explicit and bounded at
8 MiB; request/result JSON is bounded at 2 MiB.

A reference has exactly these fields:

```json
{
  "namespace": "ARIADNE_HSN",
  "edition": "ariadne-reader/v0.7",
  "sha256": "07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6",
  "coordinate": "H01.S01.N01"
}
```

Constructing or validating that metadata alone does not establish possession of
the source bytes, host permissions, semantic equivalence, or scientific truth.
`createAriadneSourceAdapter` verifies the actual supplied bytes. There is no
conversion from `ATLAS_LCP_LEGACY`, engineering `EX.Wxx.Cxx.Pxx`, supporting-kernel
House IDs, glyph geometry, or another namespace to an original Ariadne node.
The current LCP substring classifier retains its labels but now reports its
legacy namespace and `confidence: null`; no calibrated probability is claimed.
Newly saved LCP-tagged memories carry that namespace in metadata. Existing memory
records are not migrated or relabelled.

## Optional local runtime

The owner can instantiate the separately provided `AtlasIntegratedModule`
(`INTEGRATION_RUNTIME_VERSION = 'atlas.integration.runtime/v1'`) with its actual
source inputs, local database path, artifact root and owner/project/WORK scope.
Its persistent worker changes local `.work` transport. Existing source and
context facets remain the original runtime implementation.

This repository imports no external module automatically. Pass the existing
instance explicitly:

```js
import {createAtlasContextAdapter, ariadneNodeReference} from './index.mjs';

const scope = {ownerId: 'LOCAL_OWNER', projectId: 'LOCAL_PROJECT', mode: 'WORK'};
const adapter = createAtlasContextAdapter({source, runtime: ownerRuntime, scope});
const plan = await adapter.prepareContext({
  references: [ariadneNodeReference('H01.S01.N01')],
  domainSubject: null,
  request: {
    scope: {...scope, revision: 1}, expectedRevision: 1,
    task: {id: 'CONTEXT_1', query: 'Review the selected source.',
      requiredConstraints: ['Retain source exclusions and uncertainty.'],
      preferences: ['Quality first.']},
    memoryRecords: [], now: '2026-11-24T00:00:00.000Z',
    budget: {maxUtf8Bytes: 65536, reserveBytes: 4096}
  }
});
adapter.close();
// The owner remains responsible for awaiting ownerRuntime.close() when done.
```

Supply the current request time and revision in actual use. Method nodes require
an explicit original domain subject in the same source House, preserving the
scope stated in their original definitions. A request with methods from multiple
Houses must be split into separately qualified subject requests. Cross-House
domain sources may still be selected together without asserting equivalence.
The adapter resolves source-qualified
references and passes their coordinates to the existing context assembler; it
does not change retrieval weights or invent expertise. Wrong owner, project,
mode or revision returns `SCOPE_HOLD` before delegation. Bare coordinate fields
inside `request` are rejected so they cannot bypass qualification.

Before returning a ready plan, the adapter checks the exact selected source
texts, roles, uncertainty labels, source record hashes and original ancestry,
unaccepted semantic status, absence of source authority, owner/project/mode/revision, task query and constraints,
preferences, absence of essential-record discard, canonical capsule digest and
stable-prefix digest. It independently counts the prefix and capsule's UTF-8
bytes plus the caller's reserve against the byte budget. These are byte bounds,
not a verified model token count. Callback accounting must match these independent
counts; it cannot admit an oversized result. Non-ready results must contain no
capsule or context text.
Caller input, the callback's delegated input, the validation baseline and returned
JSON are detached. Closing the adapter prevents a
late in-flight result from being returned; it does not cancel or close the
caller-owned runtime.

The runtime is explicitly injected by the owner. These checks validate its
reported result; they do not independently authenticate the implementation or
the host. A digest does not grant READ or RETURN rights. Current account/room
authorization and revocation checks remain responsibilities of the existing
publisher and WorkHostPort. This adapter posts no messages and creates no
schedulers, provider sessions, model calls or canon decisions. Original domain
outcome contracts receive zero completion credit.

## Server provider boundary

The server's `/api/llm/generate` route has no installed provider SDK adapter.
Valid requests now receive HTTP 503 `provider_unavailable`, with
`reason: PROVIDER_ADAPTER_NOT_CONFIGURED`, `modelInvoked: false` and
`outputGenerated: false`. No response text, token usage or finish reason is
invented. Malformed prompts, provider names and integer token bounds produce
HTTP 400. `/api/integrations/status` retains legacy credential-presence booleans
and separately reports `adapterConfigured: false` and `ready: false` for each
server provider; the booleans are not readiness claims.

The existing frontend Gemini SDK path and its error handling remain separate.
No provider calls are issued by these tests. The UI's local label/URL checker is
now labelled **Output format checks**; it is not source or claim verification.

## Verification

From the repository root:

```sh
npm run test:context-integration
ATLAS_ARIADNE_ORIGINAL_FILE=/owner/source/ariadne_v07_atlas.json npm run test:context-integration
npm run test:civilization
npm run test:excellence
npm run lint
npm run build
```

Without an explicitly supplied source file, exact-source and runtime callback
fixtures are reported as skipped, never as passed. With the exact file, the suite
compares all 1,728 complete nodes and ancestry, then exercises scope/revision,
method-subject, mutation, source/task corruption, HOLD and late-close boundaries.
The callback fixtures are synthetic local structural tests, not provider calls
or live host authentication. The existing core's broader parity/performance
evidence is separate. This package makes no new timing or domain-quality claim.

## Optional corpus retrieval and A+B=C synthesis

This entry point also exports `CorpusEngine`, `CORPUS_FEATURES`,
`CORPUS_ENGINE_VERSION`, `CORPUS_SYNTHESIS_SCHEMA`, and
`createCorpusSynthesisAdapter` from the additive
[corpus-synthesis package](../corpus-synthesis/README.md). Callers explicitly supply
source documents and a trusted owner binding. The optional port requires a current
synchronous host authorization callback before and after source-returning methods.

The twenty mechanisms provide lexical retrieval, source-qualified identifier
boosts, duplicate/version/counterevidence preservation, exact citations, bounded
context, and falsifiable A+B=C hypothesis records. They neither replace the
original Ariadne source adapter nor reinterpret legacy LCP addresses. Generic
runtime code and invented fixtures are included; private source bodies, account
identifiers, encryption material, and model credentials are not.

Run `npm run test:corpus-synthesis` for the new package. The existing
`npm run test:context-integration` gate remains unchanged.

## Optional Node classification

`programs/context-integration/classification.mjs` separately exports the generic
source-pinned classifier, metadata admission helpers, streaming UTF-8 loader,
evidence validator, and graph/index functions. This Node-only entry is separate
from `index.mjs` because it uses Node crypto and the filesystem; the frontend
continues to import the browser-compatible context entry.

Callers provide the exact original ontology bytes and explicitly authorized
source bodies. Generated links remain unreviewed candidates, preserve original
source scopes and exclusion text, and carry alias-specific method-subject gates.
The classifier does not establish session identity, provider rights, or semantic
truth. See the [classifier contract](../corpus-synthesis/classification/README.md)
for v3 streaming input, bounds, generated artifacts, and CLI usage.

Run `npm run test:corpus-classification`. Exact-source and end-to-end classification
fixtures require `ATLAS_ARIADNE_ORIGINAL_FILE`; unconfigured cases are skipped.
