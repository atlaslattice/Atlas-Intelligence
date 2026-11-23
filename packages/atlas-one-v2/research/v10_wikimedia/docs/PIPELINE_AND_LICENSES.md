# Wikimedia research ingestion pipeline — public-safe implementation contract

**Input path:** `HSN exact source` → `OpenAlex T-ID frozen candidate` → `refresh current /topics/T...` → `read verified ids.wikipedia` → `Wikipedia page REST metadata @ revision` → `Action pageprops @ same revision` → `Wikidata QID @ lastrevid` → `bounded structured claims + reference counts` → `review-only SQLite` → `independent literature/rights review`.

A `topic.ids.wikipedia` URL can express topical relatedness; it **does not prove** Ariadne semantic equivalence, Wikidata identity, human rights status, expertise or scientific validity. If no Wikipedia URL exists, the correct result is **NO ANCHOR**, never fabricated search match. The 2026 OpenAlex class hierarchy had substantial revisions, so historic `T` IDs must be checked for name/hierarchy drift. A current OpenAlex item with `ids.wikipedia` links to an article; pageprops resolves the Wikidata QID. The latter is a *verified data-source join when the versioned payloads agree*, not a domain-scientific assertion.

## Data model

The Wikipedia reader also supports `action=parse&oldid=<revision>&prop=sections|categories|externallinks` through a strict read-only URL template. Its section names, category labels and link-host hints remain source-reported navigation metadata, **not** verified scientific references.

The **owner-private** SQLite store retains these namespaces separately:

- `hsn_nodes`: exact historical address, parent, role, name, source digest.
- `openalex_topics`: historical topic ID and source label; `metadata_fetch_state=NOT_FETCHED` until real retrieval.
- `topic_hsn_candidates`: 22,580 source-reported top-five heuristic links, `reviewed=0`. This must never be mistaken for a fully resolved crosswalk.
- `arxiv_route_candidates`: source placement and inheritance scope, `UNREVIEWED`.
- `specialist_roles`: 1,884 opt-in/unassigned research slots, not real residents.
- `sources`: append-only `Wikipedia` and `Wikidata` source key/revision/digest/license metadata; separate versions coexist.
- `wikidata_statements`: typed allowlisted properties with statement IDs, ranks and *counts* of references. These are **NOT independently citation-verified**.
- `candidates`: digest-locked HSN↔T-ID↔Wikipedia page revision↔Wikidata QID hypotheses, permanently `REVIEW_CANDIDATE_NOT_CANON` through this adapter.
- `decisions`: reserved for independently reviewed nonnormative decisions. The adapter contains no function to create a CANON adoption or ratification record.

## License boundaries

**Wikipedia** page text generally carries attribution/share-alike obligations. This adapter retains the actual page license URL, title, revision ID, article URL, revision URL and link to contributor history. It hashes raw wikitext and stores only bounded structural headings, no article body in the working crosswalk. A separate rights review is needed before publishing substantial text, translations or derived adaptations.

**Wikidata** structured main-namespace facts are CC0 according to Wikidata, but *facts are still fallible*. The adapter keeps license and revision metadata. Do not import biographical human Q5 records without a separate privacy analysis. No agent writes to Wikimedia or replaces its community governance.

## Operational boundaries

- Network is OFF unless an operator explicitly supplies `--enable-fetch --accept-wikimedia-policy --contact https://...`.
- HTTPS host allowlist: only `www.wikidata.org` and `en.wikipedia.org`; request paths limited to read-only metadata endpoints. No redirects, POSTs, edits, arbitrary URLs or API pagination crawler.
- The explicit request list is at most three, spaced by at least three seconds. HTTP 429/503 stops immediately, respects `Retry-After` in receipt, and does not loop/retry.
- Operator-supplied flags and User-Agent are **not** a host authorization proof. A deployment must independently implement budget, access, revocation at READ/RETURN, DNS/egress policy, and audit logging.
- Evidence grade is `SOURCE_REPORTED_UNREVIEWED` until a specialist examines the individual claims' primary references, conflicts and domain appropriateness. Wikipedia is not itself the scientific primary literature source for STARS or fusion validation.

Full page content or Wikimedia dump ingestion and large-scale crawling are intentionally **out of scope** for the initial plugin. For future scale, use Wikimedia's officially documented dumps or appropriately permissioned data distribution channel, with licensing, attribution, filtering and deletion policies.

## Avoid hidden candidate-denominator errors

The full database and owner-private JSONL preserve every topic-to-node candidate, not only the first eight. `inspect_topic_candidate_display` rejects duplicate T-IDs and forged accepted status, and returns `totalCandidates`, `primaryCandidates`, `alternateCandidates`, `visibleCandidates`, `omittedCandidates`, and `omittedPrimaryCandidates`. A preview limit or top-N ranking is never evidence that missing candidates are nonexistent. The offline viewer paginates every historical candidate (40 links per click) while retaining its original rank and unreviewed status.
