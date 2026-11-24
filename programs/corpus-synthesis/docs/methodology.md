# Research basis for the corpus quality increment

This increment combines established techniques with Atlas-specific provenance, permissions, and ontology contracts. The implementation is new to this build; it is not claimed to be a world-first retrieval algorithm. Published results below motivate design choices; they do not substitute for evaluation on this corpus.

## Primary sources and engineering decisions

| Foundation | Source | A + B = C in this build | Boundary |
|---|---|---|---|
| Probabilistic lexical ranking | Stephen Robertson and Hugo Zaragoza, *The Probabilistic Relevance Framework: BM25 and Beyond* (2009), [DOI](https://doi.org/10.1561/1500000019) | Term specificity + document-length normalization = a less repetition-sensitive lexical ranking. | BM25 relevance is not a probability that the retrieved claim is true. |
| Rank fusion | Gordon Cormack, Charles Clarke and Stefan Büttcher, *Reciprocal Rank Fusion…* (SIGIR 2009), [author-hosted paper](https://cormack.uwaterloo.ca/cormack/cormacksigir09-rrf.pdf) | Lexical and noisy-query rankings + rank-based fusion = one candidate order without assuming their raw scores share a scale. | The paper's benchmark gains do not establish gains for Atlas. Fusion can still worsen a particular query. |
| Relevance and diversity | Jaime Carbonell and Jade Goldstein, *The Use of MMR, Diversity-Based Reranking…* (SIGIR 1998), [author-hosted paper](https://www.cs.cmu.edu/afs/cs/Web/People/jgc/publication/MMR_DiversityBased_Reranking_SIGIR_1998.pdf) | Query relevance + dissimilarity to already-selected evidence = less redundant context. | Diversity is useful only among relevant evidence. The build must not insert unrelated sources merely to satisfy a quota. |
| Retrieval evaluation | Christopher Manning, Prabhakar Raghavan and Hinrich Schütze, *Introduction to Information Retrieval*, chapter 8, [authors' online chapter](https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-ranked-retrieval-results-1.html) | Frozen source targets + ranked outputs = reproducible identity recall and reciprocal rank. | Our small known-source set is not a pooled relevance collection; no general precision or human-answer-quality claim follows. |
| Selective answering | Amita Kamath, Robin Jia and Percy Liang, *Selective Question Answering under Domain Shift* (ACL 2020), [paper](https://aclanthology.org/2020.acl-main.503/) | Retrieval match evidence + an explicit abstention path = unsupported requests can return an evidence gap. | Atlas's configured threshold is heuristic unless calibrated on representative labeled queries. No model confidence calibration is claimed. |
| Provenance and revisions | W3C, *PROV-DM: The PROV Data Model* (Recommendation, 2013), [specification](https://www.w3.org/TR/prov-dm/) | Immutable source identity + explicit derivation and revision links = traceable outputs and preserved predecessor records. | Content hashes prove byte identity, not truth, consent, authorship, or access rights. This increment is inspired by PROV concepts, not asserted to implement full PROV conformance. |
| Duplicate-aware evaluation | Katherine Lee et al., *Deduplicating Training Data Makes Language Models Better* (ACL 2022), [paper](https://aclanthology.org/2022.acl-long.577/) | Exact-body grouping + retained source aliases = copied text does not multiply evidence counts. | That paper studies language-model training; the present use is an engineering inference for retrieval evaluation. No model training or training-quality gain is claimed here. |

## Evaluation rules

1. Freeze known-source queries and exact-body gold groups before running the candidate.
2. Compare against both a simple occurrence-count baseline and an independently implemented document BM25 baseline. A gain against keyword count alone is not evidence of superiority over mature search systems.
3. Deduplicate rankings by exact body hash for identity metrics. The relevant set for each task is one known document group, possibly with several source aliases.
4. Report `known_source_hit_at_5`, `known_source_hit_at_10`, and reciprocal rank at 10. These are source-location results, not fact-checking or answer-generation scores.
5. Keep real-corpus results separate from synthetic controls for authorization, citation tampering, contradictory records, version changes, budget limits, and unsupported queries.
6. Preserve failing cases and iteration receipts. Implementation repairs informed by this set turn it into a development benchmark; they do not turn it into an untouched held-out evaluation.
7. Never derive a source's truth, accepted canon status, or independent authorship from search rank, identical hashes, or a new timestamp.
