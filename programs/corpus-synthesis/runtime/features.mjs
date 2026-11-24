/** New to this corpus build; no world-first or measured-performance claim. */
const definitions=[
 ['exact_chunks','Original text offsets','Sentence boundaries','Bounded exact-source chunks','A chunk stays verifiable without silently rewriting or normalizing its quotation.'],
 ['source_provenance','Exact UTF-8 digest','Source identity and URI','Content-bound provenance','A content hash establishes byte identity of supplied extracted text, not factual truth.'],
 ['evidence_aliases','Source-declared acronym spans','Query terms','Auditable alias expansion','Only aliases visible in an authorized source are expanded.'],
 ['bm25','Term frequency and document length','Visible-document inverse frequency','BM25 lexical ranking','Ranking uses the authorized population and reports a retrieval score, not confidence.'],
 ['trigram_fallback','Unmatched query spellings','Visible title vocabulary','Bounded noisy-query candidates','Character similarity recovers some misspellings without inventing semantic equivalence.'],
 ['qualified_hsn','Explicit coordinate','Matching namespace and edition','Qualified exact-ID boost','Shared HSN spelling alone never equates different source editions.'],
 ['rank_fusion','Independent lexical/noisy/ID lists','Reciprocal ranks','Explicit fused ordering','Fusion exposes contributing signals and configurable weights.'],
 ['source_diversity','Ranked content groups','Source identity limits','Diverse extractive selection','Repeated results from one source do not crowd out all others by default.'],
 ['counterevidence','Supporting source','Declared challenge or contradiction','Paired evidence retention','A retained source does not silently lose its explicitly linked counterevidence.'],
 ['evidence_status','Supplied evidence label','Explicit bounded ranking weight','Status-aware retrieval','A source label can affect ordering but grants neither truth nor canon admission.'],
 ['budgeted_context','Exact extracts and citations','Explicit character budget','Bounded data capsule','Context retains original offsets and either fits complete evidence groups or holds.'],
 ['duplicate_provenance','Identical exact text','All currently allowed origins','One content result with provenance aliases','Copies are collapsed without erasing their origins or treating copies as independence.'],
 ['version_conflicts','Explicit version lineage','Different retained contents','Unresolved version visibility','Recency does not automatically accept a claim or overwrite an earlier version.'],
 ['citation_validation','Quoted source span','Source and quote digests','Checkable citation','Tampered URI, offset, quote, version or source hash fails validation.'],
 ['honest_abstention','Configurable retrieval thresholds','Unknown and coverage ledger','Explicit abstention','Default thresholds are unvalidated heuristics, not calibrated probabilities.'],
 ['grounded_synthesis','Two distinct source identities','Explicit proposed claim and falsification','A+B=C hypothesis record','The record preserves evidence and a refutation route without asserting proof.'],
 ['delta_reuse','Changed-document hashes','Unchanged content artifacts','Atomic incremental upsert/reuse','Unchanged token/chunk artifacts are reused; revised citations become stale.'],
 ['rights_revocation','Owner-private rights','Fresh expiry and revocation checks','Filtered output boundary','Denied sources vanish from quotations, duplicate aliases and relation expansion.'],
 ['coverage_ledger','Supplied inventory facts','Explicit missing-universe limits','Honest corpus coverage','An engine built from supplied documents never claims universal enumeration.'],
 ['typed_relations','Source-declared relation kind','Visible target identity','Typed bounded expansion','SUPPORTS, CHALLENGES, REQUIRES and version relations retain distinct meanings.']
];
export const FEATURE_REGISTRY=Object.freeze(definitions.map(([id,a,b,c,rationale],index)=>Object.freeze({number:index+1,id,a,b,c,
  equation:`${a} + ${b} = ${c}`,rationale,novelty:'NEW_TO_THIS_BUILD_NOT_WORLD_FIRST',implemented:true})));
