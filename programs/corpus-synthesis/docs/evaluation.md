# Evaluation scope and aggregate development results

The public package contains reproducible invented fixtures. A separate owner-private development evaluation used 24 known-source queries over 303 existing body records. Its source texts, document names, identifiers, queries, and per-query outputs are not distributed here.

Queries and exact-body target groups were frozen before the first candidate run. Exact duplicate bodies counted as aliases of one source group. The benchmark compared simple occurrence counting, an independently implemented document BM25 baseline (k1=1.2, b=0.75), and this runtime. Target location is not the same measurement as answer correctness or comprehensive topical relevance.

| Development metric | Occurrence count | Independent BM25 | Candidate |
|---|---:|---:|---:|
| Target first | 0/24 | 18/24 | 19/24 |
| Target among first five | 5/24 | 22/24 | 23/24 |
| Target among first ten | 8/24 | 23/24 | 23/24 |
| Mean reciprocal rank at ten | 0.079282 | 0.828125 | 0.861111 |

The final candidate's MRR was approximately 3.98% higher relative to the BM25 comparator on these tasks. One target remained absent from the first ten results. All 219 returned citations matched the independently checked original text spans and hashes, and all 24 context checks fit their declared 3,200-character budget with valid citations.

This is a small convenience set. Repairs informed by initial failures make the final result a development result, not an untouched held-out evaluation. No statistical significance, broad retrieval superiority, general answer-quality increase, model-training improvement, or improvement across every knowledge-node metric is claimed.

The evaluated core entry was pinned at SHA-256 `b19768402cbae80997b744ef21b4beb2daa317571a7fc15f4760ced3f5e542c4`. Evaluation of a later modified core needs a new receipt. The public adapter is separately covered by synthetic authorization and integration tests.

A deployed host may introduce a first-stage index, shards, fragment loading, or different ranking populations. Such a host must be evaluated separately. These document-level results cannot establish its ranking quality, live source access, latency, production memory use, or corpus completeness.

## Classification verification

The separate Node classifier has exact-source preservation tests and invented
adversarial controls for source identity, method subjects, duplicate origins,
streamed metadata, Unicode offsets, byte counts, oversized-body holds, and
hash-bound output shards. Its end-to-end fixtures provide the original ontology
explicitly at runtime; the public package contains none of those source bytes.
Without the supplied file, source-dependent cases are visibly skipped.

Those tests establish artifact and admission behavior. They do not measure
semantic classification precision, recall across an actual document collection,
domain expertise, or downstream answer quality. All classification links remain
unreviewed candidates, and all generated node definitions retain their original
source scope and exclusion text for a later review.
