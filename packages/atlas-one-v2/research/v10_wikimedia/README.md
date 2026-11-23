# Atlas × Ariadne × Wikimedia R10 — twelve-pass research ingestion

**Edition:** 2026-11-23 • **Status:** SOURCE-ONLY CODE IMPLEMENTED / OFFLINE STRUCTURAL REPLAY VERIFIED / WIKIMEDIA LIVE FETCH NOT PERFORMED / CANON UNCHANGED.

This extends the original source-pinned Ariadne v0.7, Atlas ONE, SwarmChat and OpenAlex/arXiv R09 research circuit. It does **not** replace the original 1,728 node registry, create a second agent scheduler, expose protected creative materials or treat encyclopedic claims as scientific truth.

## What is built

1. **Twelve separately hashed offline validation passes**, applied to the original 269,568 source-pinned Sphere/House × node review rows. Total: **3,234,816 real programmatic row evaluations**, not 12 model visits or peer judgments. Each pass has a different invariant and forms a hash-linked audit chain.
2. **Wikipedia/OpenAlex intake.** The historical 4,516 OpenAlex T-IDs remain deduplicated and unreviewed; each topic is queued for metadata refresh. Only an actual current `ids.wikipedia` value from a topic record may create a Wikipedia article *candidate*. No title-only or positional fake identity.
3. **Wikipedia REST metadata parser.** Checks article title, page ID, revision ID/time, wikitext content model, content digest and the actual per-page CC BY-SA license. Extracts bounded heading *hints* only; a separate revision-pinned MediaWiki `action=parse` pathway extracts official section/category/external-link-host metadata without copying page text or claiming references were verified. Stores no copied article body in the evidence database. Attribution tracks page history, exact revision and license URL.
4. **Wikipedia Action API pageprops resolver.** Resolves `wikibase_item` to a Wikidata QID; validates the query revision against the REST page revision, rejecting stale cross-snapshot identities.
5. **Wikidata Action API parser.** Revision-locks `Q...` identities, `enwiki` sitelink and a conservative allowlist of claims, carrying property IDs, rank, statement ID and number of reference entries. Structured Wikidata is CC0; individual statements are unreviewed and references are NOT independently verified. Person/biography class `Q5` is held for separate privacy review.
6. **Private append-only SQLite evidence store** with typed namespaces: Ariadne HSN 1,728, OpenAlex topics 4,516, unreviewed topic→HSN candidate edges 22,580, arXiv route seeds 4,884, unassigned specialist roles 1,884; plus versioned Wikipedia/Wikidata source records, typed statements and candidate review receipts. **No CANON table or automatic normative promotion exists.**
7. **Read-only provider transport** with fixed host/path allowlists, explicit opt-in, contact-bearing User-Agent, 3 second minimum spacing, max 3 requests per run, no redirects, no write APIs, and fail-stop on HTTP 429/503. It saves raw returned provider JSON only to an operator-chosen private directory; never automatically publishes it.
8. **Accessible offline HTML explorer** with all 1,728 source names and historical topic candidates, exact node lookup, House/role filters, and all 12 audit perspectives. Runs without network access and never claims a Wikipedia page or Wikidata QID was fetched.

## Grounded counters

| Quantity | Current offline result | Interpretation |
|---|---:|---|
| Source nodes | 1,728 | Authenticated by exact private registry SHA-256 locally |
| Sphere perspectives × node | 248,832 | Original source-only structural checks per pass |
| House follow-ups × node | 20,736 | Original source-only structural checks per pass |
| Twelve-pass total | 3,234,816 | Distinct computational validation evaluations, not 12 authenticated residents |
| Historical OpenAlex topics | 4,516 | Frozen unique T-IDs; current names/hierarchy require refresh |
| Unreviewed OpenAlex→HSN edges | 22,580 | Five suggestions per topic, **none approved** |
| Domain HSN addresses with candidate | 969 / 1,008 | Candidates only, not verified matches |
| Domain addresses with no candidate | 39 | Explicit research gaps |
| arXiv source route candidates | 4,884 | No new arXiv API calls |
| Resident expert slots | 1,884 | Node 1,728 + Sphere 144 + House 12, all unassigned |
| Wikimedia pages or QIDs actually fetched | **0** | Current execution environment lacks outbound network DNS |
| CANON amendments or measured real-world gains | **0** | No automatic promotion |

## Quickstart (offline, reproducible)

```bash
cd atlas_wikimedia_r10
PYTHONPATH=src python -m unittest discover -s tests -v
PYTHONPATH=src python -O -m unittest discover -s tests -v
python examples/offline_synthetic_demo.py
```

For a **private**, source-authenticated regeneration from the user's retained R09 inputs:

```bash
python src/civilization_12pass.py \
  --circuit-db /private/R09/independent_replay/circuit.sqlite \
  --registry /private/R09/sources/ariadne_v07_atlas.json \
  --out /private/R10/TWELVE_CIRCUIT_PASS_RECEIPT.json
```

The `build_private_knowledge.py` compiler takes the exact original Ariadne registry and frozen OpenAlex CSV plus R09 output directory; it strictly refuses a changed source digest or changed topic cardinality. Keep the private inputs OUT of public Git.

A publisher with *separate* actual authority can later provide preapproved Wikimedia GET URLs, compliant contact information, and an external rights/budget gate to the opt-in fetcher. The fetcher **does not authenticate the caller or install a schedule**. Do not run a large research crawl through the public API; Wikimedia recommends dumps for large bulk sets.

## Public and private boundary

- `src/` + `tests/` + `docs/` + `examples/` are portable source-only modules; tests use conspicuously **synthetic** Wikimedia fixtures and no private originals.
- `private_output/` contains the owner's exact-source node names/HSN material, frozen-topic candidate records, sqlite evidence store, and interactive observer. Preserve privately.
- Original Iron Empire fiction drafts and private experiences remain separate from Wikipedia research evidence. The R09 six-film continuity guard and existing draft Iron Empire PR remain unchanged. Scientific source metadata may inform *proposed* fiction; it cannot ratify fictional chronology or validate invented alien technology.
- No independent resident is authenticated by a self-declared specialist nomination. Opt-in at the actual host is required for future scheduled research.

## External reference specifications

- Wikimedia REST page object: https://www.mediawiki.org/wiki/API:REST_API/Reference
- Wikidata Action vs REST: https://www.wikidata.org/wiki/Wikidata:REST_API/Comparison
- Wikimedia API access policy: https://www.mediawiki.org/wiki/Wikimedia_APIs/Access_policy
- Wikimedia API 2026 rate limits: https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits
- Wikidata CC0 structured data: https://www.wikidata.org/wiki/Wikidata:Licensing
- OpenAlex topics, including `ids.wikipedia`: https://help.openalex.org/data/topics/

## Remaining release gates

Host READ/RETURN rights, provider API connectivity, response format compatibility on real samples, correct rate/usage policy at deployment time, cross-account privacy/revocation tests, high-volume snapshot/dump licensing, scientific-review criteria, CI, and CANON/creative rights are **HELD**. Local passing tests prove only what was exercised locally.
