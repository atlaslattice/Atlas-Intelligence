# Independent static review: scalar quantization audit

**Disposition:** no blocking numeric or scope defect found in the bounded source inspection. Eligible for the parent's original-source review gate. No additional experiment or broad test rerun was performed by this reviewer.

Reviewed source identities match the author's supplied freeze:

| File | SHA-256 |
|---|---|
| `python/atlas_work_learning/retrieval_audits.py` | `b2dc0a4a39cf17c968c186613e9271e39f29bece0c258c28875ce8a1d18b8563` |
| `tests/test_retrieval_audits.py` | `0aeb8439958d45055768a922ff2eb2374d9f560855e52e7b52fa4c2d72ef089e` |

Both paths are relative to `candidate/packages/atlas-work-learning/`. The author's experiment receipt is `evidence/RETRIEVAL_AUDITS_EXPERIMENT.json`, SHA-256 `64576cbae7f8e33d937575f02e9e25d96b35022658a4cc2fc8f779efb9d83d1b`; its 15 passing unit tests and two panel executions remain author-observed results, not a second independent run.

## Numeric review

- Quantization divides each component by its finite maximum absolute component before multiplying by 127, avoiding an overflowing scale-up. Reconstruction uses the ratio before the stored binary64 maximum, preserving a nonzero maximal component even for subnormal rows. The code validates canonical scales and codes, rejects nonfinite/Boolean input, and names its per-row codec separately from upstream per-dimension methods.
- Cosine normalization first divides by a maximum component, then uses bounded squared components and `math.fsum`. Nonzero reconstructed rows retain a maximal code of magnitude 127; zero rows are excluded and zero queries explicitly hold. Input dimensionality is checked before the internal zip-based dot product.
- RMS computation rescales errors before squaring. Since all corpus rows share one dimension, RMS over the per-row RMS values equals the global component RMS. Rank ties are resolved by unchanged IDs. Pair-flip counts are correctly scoped to the union of the two top-k sets, while displacement covers the eligible corpus.
- The rational/Fraction oracle, manual axis ordering, ties-to-even case, extreme/subnormal controls and explicit rank-loss case test distinct properties. The real-arithmetic component bound is explicitly not asserted for all binary64 subnormal reconstruction. The retained near-tie failure demonstrates that small reconstruction error does not establish preserved top-1 ranking.
- Work limits cover vector elements, dot products and pair comparisons. The codec payload is an actual `d + 8` bytes per row; reported float32/float64 comparisons are hypothetical vector-payload sizes and explicitly exclude IDs, dimensions, indexes and process overhead.

## Claim and privacy scope

This is an offline diagnostic over supplied numeric vectors. It neither authenticates source permission nor changes serving, model weights, training or identity. Hashes identify the input and codec payload; they are not source grants. Synthetic query records derived from corpus perturbations are not statistically independent observations. The receipt retains this distinction and the adversarial rank loss.

No private corpus text, model payload, credentials or external service operation appears in the reviewed new code or its synthetic fixture. Publication of the complete surrounding bundle remains subject to its separate path/provenance review. Payload reduction is not a measured memory, latency, throughput or model-quality improvement.

**Next useful falsifier:** after separate eligibility and source qualification, freeze a real embedding/query panel with independent relevance labels, compare this codec's ranking against the exact existing serving implementation, and retain top-k losses across source families. That step is not authorized or executed by this source review.
