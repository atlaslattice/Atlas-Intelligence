# Source-pinned Ariadne candidate classification

This additive component connects supplied corpus **bodies** to the original Ariadne v0.7 vocabulary using reviewable, exact-offset evidence. It does not change the original ontology, accept semantic edges, certify domain expertise, or promote anything to canon. It performs no model call or training.

The original source is pinned to SHA-256 `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`. The source census is 12 Houses, 144 Spheres, and 1,728 nodes: 1,008 `DOMAIN_SPECIALIZATION` and 720 `EPISTEMIC_META`. Full source node records, including their original definitions, includes, exclusions, and role labels, are exported unchanged once in `ontology-nodes.jsonl`.

## Run

This is a Node-only component. Import the generic API from
`programs/corpus-synthesis/classification/index.mjs`, or the additive context entry
`programs/context-integration/classification.mjs`. The browser-compatible context
entry does not import this filesystem or Node crypto code.

From the repository root:

```sh
npm run test:corpus-classification
ATLAS_ARIADNE_ORIGINAL_FILE=/owner/source/ariadne_v07_atlas.json npm run test:corpus-classification

npm run corpus:classify -- \
  --input /owner/corpus/corpus.json \
  --ontology /owner/source/ariadne_v07_atlas.json \
  --output /owner/results/classification-run-001 \
  --owner EXAMPLE_TRUSTED_OWNER_ID
```

All four CLI arguments are required. The caller supplies the original source and
its rights-bound corpus; this repository supplies no ontology bytes or document
bodies. Put generated artifacts in a location with the source owner's intended
access controls. Original definitions and quoted evidence in those artifacts
inherit the supplied sources' access constraints.

The CLI accepts v1 inline `{documents:[{text,...}]}`, v2 `{documents:[{sourceSha256,...}],texts:{sha256:text}}`, and v3 `{documents:[{sourceSha256,...}],textFiles:{sha256:{path,bytes,chars}}}` normalized corpora. V3 is the intended format for a large corpus. Its paths are relative to the manifest directory; each body is streamed, validated, scanned and released separately. The engine does not retain the full collection of body strings in memory. It admits only sources with an explicit allowed, unexpired owner-private binding matching `--owner`. The host must authenticate that owner; this offline classifier does not establish session identity or verify provider access rights.

For a large metadata inventory, v3 replaces the inline `documents` array with `documentsFile: {path:'documents.jsonl', sha256, count, bytes}`. Metadata rows are decoded and grouped incrementally; inline body strings are forbidden in this path. The complete metadata SHA-256, byte count, and record count must verify before any classification output stream opens. A final byte pass ensures this metadata file did not change during the run. Provisional callback rows are local in-memory state only; a failed metadata receipt produces no completed release. The metadata grouper holds origin metadata, not all source bodies.

V3 text files must be regular files inside the manifest directory with no symlink traversal. Absolute or escaping paths are rejected. The loader hashes the entire raw UTF-8 stream, validates UTF-8, preserves a literal BOM, and counts both UTF-16 code units and Unicode codepoints across chunk boundaries. A descriptor's `charsUnit` (or legacy `charUnit`) can explicitly identify UTF-16 code units or Unicode codepoints; when its `chars` count is supplied, a mismatch is held. An unspecified unit is reported as unverified metadata, never guessed. No source is partly classified. If the character bound is exceeded, retained chunks are discarded while the remainder is still hashed and counted; the complete source receives `SOURCE_SIZE_HOLD`. Missing, malformed, mismatched, or inaccessible bodies receive explicit holds with no quotations or candidate links. A completed summary distinguishes processed, verified, scanned, oversized, and integrity-held bodies.

Optional arguments are `--now`, `--max-candidates`, `--max-pending`, and `--max-source-chars`. A completed release is not overwritten. Choose a new empty output directory for a subsequent run. The public CLI writes only into that explicit directory and creates no pointer or cache next to its code.

Every completed run checks that its input corpus bytes, original ontology bytes, and implementation bytes remained unchanged during execution. Partial files from an interrupted or failed run do not acquire a completed summary. The summary binds all successful artifacts by hash.

## Outputs

| Artifact | Purpose |
| --- | --- |
| `classification-index.json` | Small v2 manifest listing SHA-prefix shards, with each shard's path, hash, bytes and record count. |
| `classification-index/<first-two-hex>.json` | Compact full-text-SHA lookup for that prefix. Candidate coordinate, role, review status, lexical score, exact span offsets/quote hash, original node digest, and subject gating. No copied source paragraphs or repeated node definitions. |
| `candidates.jsonl` | One full classification record per unique authorized body. Contains exact evidence quotations, qualifier and subject evidence, pending lenses, bounds/unknowns, and a reference/count for its origin aliases. |
| `source-aliases.jsonl` | One exact-content origin per line, joined by source-text SHA. This avoids a giant JSON string for a body with many duplicate origins. |
| `ontology-nodes.jsonl` | The 1,728 original source records, retained intact, with role and digest bindings. Definitions and exclusions are stored here once. |
| `graph.jsonl` | Source Houses/Spheres, source hierarchy edges, exact-content aliases, unreviewed candidate edges, and unscoped pending lens mentions. Relation types are distinct. |
| `classification-summary.json` | Input and code hashes, source census, admission holds, scan counts, node coverage, bound/deferred counts, resource diagnostics, and zero accepted/canon/model/training counts. |

The compact index has this structure:

```js
{
  schema: 'atlas.corpus.classification-index/v2',
  ontology: {namespace:'ARIADNE_HSN', edition:'ariadne-reader/v0.7', sha256:'07533c...'},
  corpusSha256: '...',
  codeSha256: {/* all classifier, runner and streaming helper hashes */},
  registry: 'ontology-nodes.jsonl',
  lensTemplates: [/* 60 source-derived templates and their12 House variants */],
  scoreIsProbability: false,
  semanticEdgesAccepted: 0,
  canonPromotions: 0,
  shards: {
    ab: {path:'classification-index/ab.json', sha256:'...', bytes:1234, count:2}
  }
}

// A separately hashed shard:
{
  schema:'atlas.corpus.classification-shard/v1', prefix:'ab',
  ontologySha256:'07533c...',
  byTextSha256: {
    '<complete source-text digest>': {
      status: 'CANDIDATES_READY_FOR_REVIEW',
      scanComplete: true,
      candidates: [{
        coordinate:'H01.S01.N01', role:'DOMAIN',
        status:'UNREVIEWED_DOMAIN_CANDIDATE', score:9,
        nodeSha256:'...',
        evidence:[{start:10,end:29,quoteSha256:'...'}],
        subjectGate:'NOT_APPLICABLE'
      }],
      pendingLenses: [],
      counts: {/* eligible, retained, deferred, and unqualified counts */}
    }
  }
}
```

The example numbers are illustrative schema values, not reported corpus measurements. Actual node digests are SHA-256 of canonical JSON of the unchanged parsed node record. `sourceRecordSha256`, when present in the full registry, is a separately preserved field from the original source; it is not relabeled as the digest of the exported node record.

## Matching and limits

The implementation compiles original node names, original definition focus phrases, House/Sphere labels, original exclusion text, and source-derived method-name suffixes into a token-level phrase matcher. It scans each unique body once, using NFKC/lowercase tokens only for matching. It retains original UTF-16 offsets and exact original quotations; normalization never rewrites a citation. The validator checks full-source SHA-256, original slices, quote hashes, and every generated evidence span before a record is written.

Titles do not create a body candidate. There are no invented synonyms, external embeddings, or inferred definitions. A multiword domain name or its source definition focus can yield an unreviewed candidate. An isolated broad one-word node name requires additional source ancestry/focus evidence. Merely mentioning a node in software, an ontology catalog, an exclusion, or a plan does not establish knowledge of that domain. Exclusion text appearing in a source is flagged and points back to the unchanged node scope for review.

Default bounds retain up to 24 lexical-only node candidates and 12 unscoped lens templates per unique text, with up to three evidence spans for each result. Every explicitly qualified source address is retained in addition to the lexical bound. Deferred candidate counts are recorded; this is not an exhaustive mapping claim. Sources over 64,000,000 UTF-16 code units receive `SOURCE_SIZE_HOLD` without pretending their body was fully scanned. The scan can miss paraphrases, spelling variations, unrecorded source aliases, and undeclared relations.

`score` is a deterministic ranking heuristic combining source name/focus matches, declared ancestry, capped occurrence contribution, and exact qualified references. It is not a probability, calibrated factual confidence, semantic entailment, or measured answer quality. No language-model output is involved.

## Qualified references and method subjects

A current-source qualifier must match all fields:

```js
const reference = {
  coordinate:'H01.S01.N01',
  namespace:'ARIADNE_HSN',
  edition:'ariadne-reader/v0.7',
  sha256:'07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
};
```

The coordinate must also occur literally in the supplied body. Qualifiers can appear in document metadata `coordinates[]` or `qualifiedHsnReferences[]`. Explicit top-level `namespace`, `edition`, and `ontologySha256` can bind coordinate mentions in that source. A bare coordinate, old edition, wrong hash, unqualified prior classification, or title-only metadata does not acquire the original source's authority or exact-reference boost. `hsnCandidates` is not treated as qualified input.

A method remains `PENDING_LENS` until a source explicitly declares a same-House domain subject. Supported declarations are:

```js
domainSubjects: [qualifiedDomainReference]

// Or a more specific binding:
methodSubjects: [{method: qualifiedMethodReference, subject: qualifiedDomainReference}]
```

Both references must identify the pinned original edition; the subject must be a `DOMAIN_SPECIALIZATION` in the method's House; required coordinate evidence must occur in that source body. The successful state is still only `UNREVIEWED_METHOD_CANDIDATE`. A current qualified method address alone does not supply a domain subject.

Generic method phrases shared across Houses, remain `PENDING_UNSCOPED_LENS` when the text supplies no House/subject scope. The record lists the source's possible House variants without choosing one. It makes no domain link and no expertise claim.

Duplicate copies can carry different qualifier or subject metadata. The body is scanned once, but `qualifiedForDocumentIds` and `subjectReadyForDocumentIds` preserve precisely which source aliases supplied each declaration. These lists are not transferable to every duplicate origin. A host must join them to the exact currently authorized source document before allowing any method use.

## Host use

1. Authenticate the current owner and verify current source rights, expiry, and revocation.
2. Resolve a source passage to its **complete parent text digest**, select the first-two-hex shard, verify its hash/byte count, then read the complete key in that shard's `byTextSha256`. The top-level index has no giant `byTextSha256` dictionary.
3. Check the compact evidence range against the unchanged parent text and quote hash. For a fragment, translate parent and fragment offsets explicitly; never apply parent offsets directly to a fragment string.
4. Verify the node digest against the pinned `ontology-nodes.jsonl` registry and show its original definition, includes, exclusions, and role.
5. Display candidate/pending status and its quoted evidence. A lexical candidate is a review lead, not a canon edge or an accepted semantic assertion.
6. Apply alias-specific subject qualification before using a method. Recheck authorization after any awaited host work.

The graph and index are a source-based review aid. Any future semantic acceptance process must be separately authorized, evidence-bound, and recorded. This build's `semanticEdgesAccepted` and `canonPromotions` remain zero.

## Generic API

`AriadneCandidateClassifier({ontologyBytes,config})` exposes `descriptor()`, `nodeRecords()`, `hierarchyRecords()`, `lensTemplates()`, and `classify({text,sourceSha256,aliases})`. `prepareCorpusGroups` performs owner-bound admission and retains exact-copy origin aliases; `createCorpusGrouper` provides the equivalent incremental `addDocument`/`finish` interface. V3 bodies are verified by `loadSourceText`; metadata-file identity is verified by `streamDocumentsMetadata` and `verifyDocumentsFileUnchanged`. `candidateGraphRecords` exports typed graph records. `compactClassificationRecord` creates a host lookup entry. `validateCandidateEvidence` verifies original spans without claiming semantic validity. The CLI uses `includeSourceAliases:false` to avoid cloning origin lists into each result; all origins are preserved separately in the hashed alias artifact.

The tests exercise the actual source pin and census, exact scope preservation, full-body matching, Unicode offsets, generic-method negatives, old-edition/missing-body failures, alias-specific qualification, missing/cross-House/non-domain subjects, deduplication, rights/expiry, explicit bounds, and deterministic graph/index output. For an external checkout, set `ATLAS_ARIADNE_ORIGINAL_FILE` to the caller-supplied original source. The generic code does not embed a private corpus or the original source bytes.

Source-dependent tests are reported as skipped when `ATLAS_ARIADNE_ORIGINAL_FILE` is unset. An explicitly supplied but missing, malformed, or wrong-digest source fails the tests. The independent admission and streaming-file tests run without the ontology. Test bodies are invented, and any source node names used in tests are read from the caller's file at runtime.
