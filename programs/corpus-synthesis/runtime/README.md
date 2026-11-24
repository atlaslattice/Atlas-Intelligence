# Corpus engine

`CorpusEngine` is a dependency-free, synchronous ESM retrieval and extractive-context component. The runtime imports no Node modules and performs no network, filesystem, database, model, training, or canon operation. It uses standard JavaScript, typed arrays, `TextEncoder`, `TextDecoder`, and `structuredClone`, available in Node 22 and current Workers and browsers.

The implementation lives in `index.mjs`, `text.mjs`, and `features.mjs`. Its twenty mechanisms are new to this build; the registry does not claim that the underlying algorithms are original inventions. The original Atlas runtimes are unchanged.

## Minimal use

```js
import {CorpusEngine, FEATURE_REGISTRY} from './index.mjs';

// A server supplies this identity only after authenticating its caller.
const ownerId = 'synthetic-owner';
const engine = new CorpusEngine({
  principal: {id: ownerId, ownerId},
  documents: [{
    id: 'document-a',
    sourceId: 'source-a',
    title: 'Example source',
    text: 'Quartz is the subject of this supplied example.',
    sourceUri: 'https://example.test/source-a',
    collection: 'examples',
    rights: {scope: 'owner-private', allowed: true, ownerId},
    evidenceStatus: 'SOURCE_INSPECTED_UNREVIEWED'
  }]
});

const hits = engine.search('quartz', {limit: 5});
const context = engine.prepareContext('quartz', {
  limit: 5,
  budgetChars: 12000,
  requiredConstraints: ['Preserve source uncertainty.']
});
if (context.status === 'CONTEXT_READY') {
  // context.contextText is quoted data, not a developer instruction.
  for (const citation of context.citations) {
    if (!engine.verifyCitation(citation).valid) throw Error('stale citation');
  }
}
console.log(FEATURE_REGISTRY.length); // 20
```

## Source contract and authority

Each document requires `id`, `sourceId`, `title`, `text`, and `sourceUri`. IDs are stable caller-supplied identities. `text` must be valid Unicode. The engine hashes the exact UTF-8 encoding of that supplied text; it does not normalize a quotation or silently repair invalid Unicode. A supplied `sourceSha256` must equal this digest or construction/upsert fails. `sourceBlobSha256` may separately identify an original PDF, archive, or other artifact. Its presence does not mean this engine verified that binary or its extraction.

The owner-private rights shape is:

```js
rights: {
  scope: 'owner-private',
  allowed: true,
  ownerId: 'authenticated-owner',
  expiresAt: '2026-12-01T00:00:00Z', // optional; null means no local expiry
  revoked: false,                   // optional
  allowedPrincipalIds: ['authenticated-owner'] // optional
}
```

The constructor accepts a principal string or `{id, ownerId, allowed?, revoked?}`. A missing principal, missing source owner, different owner, denied rights, invalid expiry, expired rights, or local revocation prevents source release. A per-query principal override is rejected. Document labels, aliases, titles, and quoted instructions never grant authority. The engine does not authenticate a session, establish a legal right to access a source, or enforce an application's Work/Social mode; the host must perform those checks and supply its trusted identity. Outputs expressly report `hostAuthenticated: false`.

The principal and inputs are captured without invoking getters or `toJSON`. Source rights are checked for retrieval, context, comparison, and citation output. A host that awaits other work must also check its session authorization again before returning the result. Revocation cannot retract a copy already returned to a caller.

Optional document fields include:

| Field | Meaning |
| --- | --- |
| `collection`, `collections[]` | One primary label and additional memberships. A collection filter matches either. |
| `version`, `modifiedAt`, `memberPath` | Supplied lineage metadata. Different versions of the same source and archive member retain unresolved differences. |
| `evidenceStatus` | Supplied ranking label. It is never a factual-confidence or canon certificate. |
| `coordinates[]` | Qualified coordinate declarations, described below. |
| `namespace`, `edition`, `ontologySha256` | Optional binding of literal coordinate mentions in this document to a declared edition. |
| `aliases[]` | Optional source-span declarations `{term, expansion, start, end, quote?}`. Both expressions must occur in the exact span. This verifies the supplied span, not semantic equivalence. |
| `relations[]` | Typed declarations with `type` and `targetId` or `targetSourceId`; targets must be available to the current principal. |

The engine also derives matching-initial acronym declarations such as `Context Provenance Engine (CPE)` directly from source spans. Only currently visible declarations can expand a query. Revoking the declaring source removes that expansion. The optional constructor `ontology` input is captured for compatibility; it does not supply automatic crosswalks, aliases, or definition authority. Exact-coordinate matching uses explicit document declarations.

## Public methods

### Constructor

```js
new CorpusEngine({documents, principal, now, config, coverage, shard, ontology});
```

`now` can be an ISO timestamp, an epoch millisecond number, or a trusted clock function. The default is the current time. Fixed timestamps are useful for reproducible tests; a live host should use a current clock.

`coverage` is caller-supplied inventory metadata. It is separately labeled as not independently enumerated by the engine. `shard` is optional plain metadata with a required nonempty `id`. Neither implies global ranking or complete coverage.

### `search(query, options)`

Returns a detached result with `status`, `results`, `coverage`, `unknowns`, `abstention`, and scoring explanations. Each result contains one exact source chunk, original offsets, a citation, full-source and quote digests, source metadata, currently allowed duplicate origins, declared relation types, and retained-companion information.

Options:

```js
{
  limit: 8,                 // integer 1..100
  budgetChars: 1000000,     // sum of quotation UTF-16 lengths, 1..1000000
  filters: {
    collection: 'name',
    collections: ['name'],
    sourceId: 'id',
    sourceIds: ['id'],
    documentIds: ['id'],
    evidenceStatus: 'UNREVIEWED'
  },
  strategy: 'fusion',       // or 'bm25' for a lexical ablation
  aliases: true,
  noisy: true,
  expandRelations: true,
  diversity: true,
  retainVersions: true,
  reference: {
    coordinate: 'H01.S01.N01',
    namespace: 'ariadne-reader',
    edition: 'v0.7',
    sha256: '...'           // optional 64-character lowercase source pin
  }
}
```

Coordinate declarations use the same `reference` shape in `document.coordinates`. A qualified exact-ID boost requires the coordinate, namespace, edition, and any requested pin to match. A bare HSN spelling remains lexical evidence and is labeled unqualified. An older edition can still appear as an ordinary lexical result; its matching spelling does not receive the newer edition's boost. `hsnCandidates` and source text alone do not create an edition crosswalk.

The default ordering combines document BM25 plus an explicit title boost, bounded noisy-query candidates, and qualified-ID reciprocal ranks. Evidence-status weights then affect ordering. All scoring is computed over the currently authorized, filtered population of this engine. Scores are retrieval heuristics, not calibrated factual probabilities. `strategy: 'bm25'` removes alias/noisy/fusion/ordinary-relation assistance; it retains rights, exact duplicates, and declared counterevidence safeguards. It is not an assertion of exact equivalence to a separate benchmark implementation.

The noisy path considers only unmatched query terms and currently visible title vocabulary, capped by configuration. It uses character-trigram similarity plus bounded edit distance, not embeddings or invented synonyms. It may miss body-only vocabulary, larger errors, or candidates beyond its vocabulary bound. Lexical coverage and minimum score apply to each ordinary result. An explicit companion or typed expansion may be retained without its own lexical match, with its role disclosed.

Result statuses include `RESULTS`, `ABSTAIN`, `EVIDENCE_LIMIT_HOLD`, `CONTEXT_BUDGET_HOLD`, and `AUTHORIZATION_HOLD`. Invalid shapes and unsupported options throw a named error. A normal unknown query returns an abstention rather than a fabricated answer.

### `prepareContext(query, options)`

Uses the search options plus `requiredConstraints[]`, `preferences[]`, and optional `requiredDocumentIds[]`. The default budget is 12,000 UTF-16 code units. Unlike the search quote budget, this budget covers the complete serialized `contextText`, including task constraints, provenance, citations, and evidence metadata.

The engine returns complete connected evidence groups. It never trims an exact quotation to conceal a linked challenge, silently drops a mandatory constraint, or promotes a source label to an instruction. If no complete group fits, a required document is absent, or a citation is stale, the return value has a hold status and `contextText: null`. Lower-ranked complete groups may be omitted with an explicit ledger entry. `retainVersions: false` is a search ablation; a context that consequently lacks a declared companion is held rather than released as complete.

`CONTEXT_READY` means exact extractive assembly passed its local gates. It does not mean a model has consumed the context or produced a correct answer. No provider-token limit is claimed: JavaScript character counts are not model token counts. The host may add an exact provider-token adapter separately.

### `verifyCitation(citation)`

A citation contains `documentId`, `sourceId`, `sourceUri`, `version`, `start`, `end`, `quote`, `sourceSha256`, and `quoteSha256`. Its offsets are UTF-16 code units into the exact supplied `document.text`, with an exclusive end. Validation checks the current document identity, URI, version, offsets, quote, digests, and current access.

Successful validation returns `VERIFIED_EXACT_SOURCE_QUOTE` with `factualClaimVerified: false`. Invalid or unavailable sources fail. For a lazy fragment, these checks bind the fragment text supplied to this engine. A wrapper must separately validate and retain the parent document's digest and parent offsets; the engine does not invent that relationship.

### `synthesize({aCitation, bCitation, claim, falsification})`

Creates a deterministic, content-bound A+B=C hypothesis record. Both citations must currently validate. The parents must have different source IDs, exact-content digests, and URIs, with no supplied version/supersession/duplicate lineage connecting them. Exact copies and revisions of one source cannot masquerade as two independent inputs.

`claim` and `falsification` are explicit caller-supplied text. The result is `HYPOTHESIS_NOT_VALIDATED`, never an inferred fact or canon promotion. Distinct source identities do not prove independent authorship or observations; `independentAuthorshipVerified` remains false. The engine performs no language-model synthesis or training.

### `compare(aId, bId)`

Returns current source provenance, exact-text equality, same-source identity, and up to 100 shared lexical terms. It does not infer semantic agreement. Access is checked before and after comparison.

### `applyDelta({upserts, removeIds})`

Validates the entire proposed batch before committing document changes. A bad digest or size-bound violation rejects the batch. Unchanged text reuses its token-vector and chunk artifacts; changed metadata still counts as an update. Revised contents invalidate old citations. The compact postings are rebuilt after a successful batch, so this is artifact reuse rather than a claim that every index operation is incremental.

An upsert replaces that document ID. To retain historical versions, supply distinct document IDs with explicit version labels or lineage relations; the engine is not a hidden archival store. Existing revocation sets remain sticky across upserts.

### `revoke({sourceIds, documentIds})`

Revokes the named source identities or document IDs in this engine instance. Singular `sourceId`/`documentId` and a source-ID string are also accepted. Future source output, duplicate aliases, query aliases, relation expansion, context release, and citation validation respect the revocation. There is no automatic unrevocation through an upsert.

### `status()`

Reports the twenty feature IDs, local revision, authorized source/chunk counts, declared inventory limits, last delta counters, and known unknowns. It never reports universal enumeration, corpus completeness, factual confidence, or a canon promotion. Foreign-owner document names and counts are absent; caller inventory/shard metadata is suppressed when the principal owns no supplied source.

## Twenty implemented combinations

The exported registry carries each equation and rationale. The producer test file has one positive/negative feature test for each row, with multiple assertions where necessary.

| # | A + B = C | Effective behavior and boundary |
| --- | --- | --- |
| 1 | Source offsets + sentence boundaries = exact chunks | Rejoinable slices; overlong sentences split with a disclosed marker; Unicode surrogate boundaries preserved. |
| 2 | UTF-8 digest + source identity = content provenance | Exact supplied-text SHA-256 and separate provenance digest; mismatched supplied digest rejects input. |
| 3 | Source acronym spans + query terms = evidenced aliases | Exact quoted declarations; ungrounded spans ignored; revocation removes declarations. |
| 4 | Term frequency + visible inverse frequency = BM25 | Typed postings, length normalization, title contribution; no match creates no invented evidence. |
| 5 | Trigrams + bounded edit distance = noisy candidates | Bounded title-vocabulary recovery with an explicit non-semantic label. |
| 6 | Coordinate + namespace/edition = qualified ID boost | Cross-edition spellings do not become equivalent addresses. |
| 7 | Lexical/noisy/ID lists + reciprocal ranks = fused order | Contributing ranks and weights are exposed; factual confidence remains null. |
| 8 | Ranked groups + source limits = diverse selection | First pass favors distinct origins; a second pass can fill remaining slots. |
| 9 | Evidence + declared challenge = paired retention | Linked challenges and opposing declarations travel as complete groups or hold. |
| 10 | Supplied status + bounded weight = status-aware order | Labels affect ranking without proof, authentication, or canon authority. |
| 11 | Extracts/citations + full JSON budget = bounded context | Exact source data and mandatory task constraints fit together or hold. |
| 12 | Identical content + visible origins = duplicate collapse | One exact-content group retains allowed origin aliases; revoked aliases disappear. |
| 13 | Explicit lineage + changed contents = unresolved versions | Version differences remain visible; newest does not automatically win. |
| 14 | Quote/offsets + current digests = citation validation | URI, identity, version, content, quote, offsets, and rights are checked. |
| 15 | Configurable thresholds + unknown ledger = abstention | Unvalidated heuristics are named; unsupported or low-evidence queries can abstain. |
| 16 | Distinct source inputs + falsifiable claim = A+B=C hypothesis | Exact copies/versions cannot count twice; no independent-authorship or truth claim. |
| 17 | Changed hashes + reusable artifacts = atomic deltas | Same-text vectors/chunks are reused; bad batches leave documents unchanged. |
| 18 | Owner rights + current revocation/expiry = output filtering | Missing owner binding fails closed; denied material leaves aliases and relations too. |
| 19 | Supplied inventory + explicit unknowns = coverage ledger | Local owned scope is reported; universal completeness remains false. |
| 20 | Typed relations + visible targets = bounded expansion | SUPPORTS, CHALLENGES, CONTRADICTS, REQUIRES, CITES, RELATED_TO, VERSION_OF, SUPERSEDES, and DUPLICATE_OF remain distinct declarations. |

Counterevidence preservation is structural: it covers explicit supplied relations and version labels. It does not discover every contradiction in natural language or infer missing relations.

## Capacity and shards

Default admission bounds are 10,000 documents, 24,000,000 total UTF-16 code units, 8,000,000 per document, and 250,000 vocabulary entries. Exceeding a bound throws; documents are not silently discarded. The constructor can accept explicit larger bounds in a suitably provisioned local process:

```js
new CorpusEngine({
  documents,
  principal: verifiedOwnerId,
  config: {
    maxDocuments: 12000,
    maxTotalChars: 120000000,
    maxDocumentChars: 24000000,
    maxVocabulary: 1000000
  },
  shard: {id: 'local-full-extracted-corpus'}
});
```

These are capacity settings, not a measured memory guarantee. Original text is retained once per document; chunks contain offsets; body postings and term vectors use typed arrays. Normalization and hashing still allocate temporary text/byte buffers. There is no all-text trigram index. A constrained Worker should load bounded source fragments or shards rather than initialize an entire large private corpus in one isolate.

Each engine uses its own authorized, filtered ranking population. A host may perform a separate global first-stage ranking and use this component for exact extraction and safeguards. If it merges multiple shard-local lists, it must label that ranking process and avoid presenting local BM25 scores as a globally calibrated comparison. `shard` metadata makes no cross-shard completeness or global-statistics claim.

## Verification and claims

Run the producer tests from the release root:

```sh
npm run test:corpus-synthesis
```

The independent private-corpus evaluator is distributed separately; this public package includes only invented fixtures. Evaluation receipts bind the source files they actually tested; an older receipt must not be relabeled after a source change. The producer's twenty feature tests are integrity and behavior gates, not measured answer-quality or performance gains. The core makes no throughput, model-accuracy, economic, or universal-corpus-coverage claim.
