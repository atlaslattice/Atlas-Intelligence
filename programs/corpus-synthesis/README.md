# Corpus synthesis: twenty source-grounded combinations

This optional package makes caller-supplied text searchable and turns selected evidence into bounded, exactly cited context. It includes twenty working retrieval, provenance, version, and access mechanisms. The runtime is dependency-free ESM and performs no network, filesystem, provider, model-training, room-posting, or canon operation.

It is an additive corpus capability alongside the existing source-qualified Ariadne context adapter. This repository includes **generic code and invented test fixtures**. It does not include a personal corpus, source inventory, account identifier, decryption key, encrypted private assets, or historical memory database.

## Use the existing context entry point

```js
import {
  CorpusEngine,
  createCorpusSynthesisAdapter,
  CORPUS_FEATURES
} from '../context-integration/index.mjs';

// The application authenticates the caller and supplies its trusted owner ID.
const ownerId = 'EXAMPLE_VERIFIED_OWNER';
const engine = new CorpusEngine({
  principal: ownerId,
  documents: [{
    id: 'example-document',
    sourceId: 'example-source',
    title: 'Invented retrieval example',
    text: 'Quartz is the subject of this supplied test record.',
    sourceUri: 'https://example.invalid/example-source',
    collection: 'examples',
    rights: {scope: 'owner-private', allowed: true, ownerId},
    evidenceStatus: 'SOURCE_REPORTED'
  }]
});

const port = createCorpusSynthesisAdapter({
  engine,
  // Bind this to the application's current authorization decision.
  authorize: () => applicationStillAuthorizesCurrentOwner()
});

const result = port.search('quartz', {limit: 5});
const context = port.prepareContext('quartz', {
  budgetChars: 12000,
  requiredConstraints: ['Preserve source uncertainty and exact quotations.']
});
console.log(CORPUS_FEATURES.length); // 20
```

The package also exports these APIs directly from `programs/corpus-synthesis/index.mjs`.

`createCorpusSynthesisAdapter` accepts the actual `CorpusEngine` instance and a synchronous authorization callback. It checks the callback before and after every operation. A denial returns an empty `AUTHORIZATION_HOLD`; throwing or promise-returning callbacks do not authorize access. The callback is supplied by the host, so this component does not independently authenticate a session. Closing the port blocks future calls without destroying the caller-owned engine.

The engine itself checks source ownership, current local expiry, and sticky revocation. The application remains responsible for live provider rights, session authentication, storage, and updates. Importing a module does not load sources or activate a service.

## A + B = C

Each registry entry states two inputs and the resulting capability. These combinations are new to this package; BM25, rank fusion, diversity ranking, and provenance are established ideas. See [the methodology and primary sources](docs/methodology.md).

| # | A + B | C |
|---|---|---|
| 1 | Original offsets + sentence boundaries | Exact, rejoinable source chunks |
| 2 | Exact UTF-8 hash + source identity | Content-bound provenance |
| 3 | Source-declared acronym spans + query terms | Auditable query aliases |
| 4 | Term frequency + visible inverse frequency | BM25 lexical ranking |
| 5 | Trigrams + bounded spelling distance | Conservative noisy-query recovery |
| 6 | Coordinate + namespace and edition | Source-qualified identifier boost |
| 7 | Lexical, noisy, and identifier rankings + reciprocal ranks | Explicit fused order |
| 8 | Ranked content groups + source limits | Less repetitive evidence selection |
| 9 | Supporting evidence + declared challenges | Complete evidence groups or an explicit hold |
| 10 | Declared source status + bounded weight | Status-aware ordering without truth promotion |
| 11 | Exact evidence and citations + serialized budget | Bounded extractive context |
| 12 | Identical text + permitted origins | Duplicate collapse with retained provenance |
| 13 | Version lineage + changed content | Visible unresolved revisions |
| 14 | Original quotation + current digests and offsets | Citation verification |
| 15 | Configurable evidence thresholds + explicit unknowns | Honest abstention |
| 16 | Two distinct cited inputs + a falsifiable claim | An unvalidated A+B=C hypothesis |
| 17 | Changed source hashes + reusable text artifacts | Atomic incremental updates |
| 18 | Owner binding + current expiry and revocation | Filtered source output |
| 19 | Supplied inventory + unknown collection boundaries | Explicit coverage accounting |
| 20 | Declared relation kinds + visible targets | Typed, bounded evidence expansion |

Details, defaults, limits, optional fields, and individual method contracts are in the [runtime reference](runtime/README.md).

## Quality and interpretation

All citations refer to exact slices of the supplied extracted text. Hashes and offsets establish source fidelity; they do not establish factual truth or the accuracy of extraction from an original PDF or archive. Original binary hashes may be retained separately.

A bare HSN coordinate remains a lexical query. An identifier boost requires a matching namespace, edition, and optional source pin. Existing legacy LCP labels, Ariadne source definitions, and mathematical coordinate systems remain separate.

Declared counterevidence and explicit differing versions are retained together or held when limits prevent a complete group. This is structural preservation of supplied relationships, not automatic natural-language contradiction detection. A+B=C synthesis accepts explicit caller-proposed text with two current citations and a falsification route. It rejects exact copies, same-source revisions, and supplied common lineage as independent parents; distinct IDs do not prove independent authorship.

No calibration is claimed for retrieval scores. Context budgets count complete serialized UTF-16 characters, not provider tokens. Aggregate private-development results are described with their limits in [evaluation notes](docs/evaluation.md); they are separate from the invented-fixture gates reproduced here.

## Original-source classification

The optional [Node classifier](classification/README.md) connects source bodies to
the caller-supplied, digest-pinned Ariadne v0.7 vocabulary. It preserves all 1,728
original node definitions and exclusions in a separate generated registry and
produces exact-span candidate links for review. A source name or coordinate does
not establish domain expertise. Methods remain pending until an explicit
same-House domain subject is present; any resulting link remains unreviewed.

Large corpora can use a v3 manifest with streamed document metadata and one UTF-8
body file per full-text hash. Bodies are verified one at a time, duplicate origins
are retained in a separate alias artifact, and the lookup index is divided into
hash-bound prefix shards. Unsupported, oversized, or corrupt sources receive
explicit holds. The classifier has its own Node-only context entry at
`programs/context-integration/classification.mjs`; importing the browser-compatible
context API does not load it.

The original ontology and generated evidence are supplied and retained by the
caller. `npm run corpus:classify -- --input ... --ontology ... --output ... --owner ...`
requires explicit paths and writes only to the chosen output directory. Current
host rights must still be checked whenever generated evidence is returned.

## Verification

From the repository root:

```sh
npm run test:corpus-synthesis
npm run test:corpus-classification
npm run test:context-integration
```

The corpus suite covers twenty feature cases, forty-four independently authored integrity controls, three text/hash primitive cases, and the public adapter. Classification adds streaming admission, source-preservation, method-subject, graph, and synthetic CLI checks. Source-dependent classification and context cases require the caller's exact `ATLAS_ARIADNE_ORIGINAL_FILE` and are explicitly reported as skipped when it is unset.

The public package is inert until a caller supplies sources and explicitly constructs an engine. No existing application data is migrated, no source is silently promoted to canon, and no hosted system is activated by these exports.
