# Original-source query evidence for the existing Whole144 ingress

This additive module explains why a query matched an exact original Ariadne node
before calling the existing `proposeSourceBoundCandidateGraph` API. It creates no
new broker, queue, scheduler, provider port or WorkBurst invocation. The original
candidate APIs and their accepted fields remain unchanged.

## API

```js
import { prepareSourceScopeEvidence, originalNodePin }
  from './src/source-scope-evidence.mjs';
import { proposeScopeMatchedCandidateGraph }
  from './src/whole-144-scope-ingress.mjs';

// registryBytes are explicitly supplied by an authorized local owner.
const explanation = prepareSourceScopeEvidence(registryBytes, {
  query: ownerQuery,
  nodeIds: selectedOriginalNodeIds
});

// Bindings retain the existing W144 planning ID and complete six-field node pin.
// Use originalNodePin(originalRecord) to compute that pin from the full record.
const result = proposeScopeMatchedCandidateGraph(program, registryBytes, {
  mode: 'WORK',
  query: ownerQuery,
  bindings,
  links,
  projectReviewContext: 'GENERAL_WORK_REVIEW'
});
```

`prepareSourceScopeEvidence` accepts an inert ordinary object containing exactly
`query` and `nodeIds`. It rehashes a copied `Buffer` or `Uint8Array` against the
original v0.7 registry digest, checks selected original identities, then executes
the unchanged recovered R02 matcher. Selection is bounded to 128 unique canonical
node IDs; query UTF-8 bytes are bounded to 2,048. Getter/proxy inputs, missing or
unknown keys, sparse arrays and malformed text hold.

`proposeScopeMatchedCandidateGraph` additionally snapshots the complete existing
parent program and request, validates the six-field pins against the actual
original records, then calls the existing ingress only when every selected node
satisfies the scope gate. Its accepted request fields are `mode`, `query`,
`bindings`, optional `links`, and optional `projectReviewContext`. Supplied scope
labels, evidence receipts, approval flags or dispatch commands are not accepted.

The six-field pin remains `namespace`, `edition`, `nodeId`, `recordSha256`, `kind`
and `registrySha256`. This module uses namespace `atlas.ariadne.v0.7.original` and
the parent program's edition `v0.7`. `recordSha256` is the local digest of the
**entire original node record**, using sorted keys, compact UTF-8 JSON and unescaped
Unicode. The source-declared record hash is preserved separately; its original
hash recipe is not claimed to be independently verified.

## Meaning of the gate

| R02 scope class | Candidate ingress gate | Interpretation |
| --- | --- | --- |
| `IDENTITY_ONLY` | Eligible for the existing unreviewed candidate path | An exact source address was requested; no scope fit is inferred |
| `AFFIRMATIVE_TEXT_ONLY` | Eligible for the existing unreviewed candidate path | Query appears in name, definition or includes, with no exclusion match |
| `MIXED_SCOPE_TEXT` | Hold | Positive and exclusion text both match; conservative handling requires further review |
| `EXCLUSION_TEXT_ONLY` | Hold | Query appears only in the original exclusions |
| `BROWSE_ONLY` | Hold | Browsing is not query evidence |
| No match (`scopeMatch: null`) | Hold | The selected original record does not match the query |

`candidateIngressEligible` refers only to this source/query gate. It is **not**
Work-mode eligibility, permission to read/share/write, semantic placement approval,
an execution decision, or hosted evidence. Every result keeps
`semanticPlacementEligible: false`, `semanticAcceptance: false`,
`dispatchAllowed: false`, and `workModeEligibility: NOT_EVALUATED`. The existing
104/40 mode distinction, current action-specific rights, explicit subject evidence
for epistemic nodes and independent semantic review remain separate gates.

Mixed matches are intentionally held even when a name or definition matches.
That conservative choice keeps an explicit exclusion from being hidden behind a
positive field. Held evidence remains inspectable in the local return value.

The existing candidate API still reports its own caller-pin comparison limit.
The outer receipt separately reports that these specific original registry bytes
were rehashed locally. Neither claim authenticates a host, principal, rights
epoch, current served source, or source authority beyond the specified edition.

## Evidence and privacy

Receipts bind the exact query bytes and normalization, selected node set, local
record digests, original source-declared hashes, matched field names, R02 category,
original role/lens/status and stable source return. Coverage is explicitly limited
to the selected records; it is not a whole-lattice or hosted-search result.

Original scope fields are **not automatically copied** into receipts. The exact
caller query **is retained** in `query.text`, and a caller may have typed a whole
definition, exclusion or other sensitive text. Therefore receipt hashes do not
make receipts safe to publish: keep them in authorized owner-local handling and
recheck current rights before any sharing. No private source bodies or example
queries derived from private scope text are included in this public module.

Existing typed candidate links and dissent references are preserved. `SAME_AS`
and other unsupported relationship types still hold in the original API. No
scope evidence creates a completed review, implementation, assignment, genuine
macroturn, scientific endorsement, CANON effect or external action.

## Verification

The actual complete parent program contains 144 tasks and serializes to 82,659
bytes at the pinned review head. It fits the 50,000-entry / 512-KiB inert snapshot;
tests use that full program, without a constants stub.

With explicitly supplied original bytes, the 95 existing scoped tests and 22 new
tests pass in Node normal and `--jitless`. Without the private registry, the new
suite passes ten source-independent tests and explicitly skips the twelve
original-source cases. Neither result is hosted CI or a deployment claim.

```sh
node --test test/whole-144-scope-ingress.test.mjs
ARIADNE_V07_FILE=/authorized/local/original.json node --test test/whole-144.test.mjs test/whole-144-compounding.test.mjs test/whole-144-source-bound.test.mjs test/whole-144-scope-ingress.test.mjs
```
