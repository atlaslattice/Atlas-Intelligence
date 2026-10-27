# Alexandria / Atlas Intelligence: Project-Aware Morning Research Brief
**2026-10-27 · ARCHITECTURE GAP / PRODUCT REQUIREMENT · PROPOSED, NOT IMPLEMENTED**
**Origin:** User direction for a trustworthy morning report covering breaking developments, older overlooked research, policies, science, and their consequences for active Atlas Lattice projects.

## Problem to solve
The user currently has to ask multiple separate AI assistants for updates; their contexts differ and their news/search feeds are often noisy, clickbait-biased or insufficiently grounded. A general news API or prominent wire service is **not** equivalent to a credible science/technical evidence feed. Existing Atlas Intelligence README does not itself document an operational project-aware morning briefing or integrated, validated news ingestion service. Treat this as a gap until tested.

## Desired morning experience
A single opt-in morning **Alexandria Report by Atlas Intelligence**, contextualized against the authorized Alexandria corpus, research lineages, open questions, Canon governance, existing artifacts and active workstreams. Each item answers:
1. **What's actually new?** Precise event date and publication/update date; distinguish correction/republication from new evidence.
2. **Why does it matter for our work?** Specific project IDs, hypotheses, ledger variables, affected assumptions and related internal documents.
3. **What does primary evidence say?** Link the original paper, dataset, regulator, filing, standard, tender, industry disclosure, patent publication or original announcement, and separately label secondary reporting.
4. **How confident are we?** Source provenance, independent corroboration where warranted, epistemic badge and identified limitations/contradictions.
5. **What should be checked or recalculated?** An actionable research queue with reproducible suggested tests; never auto-promote sources or start hazardous/high-impact actions.
6. **What old work has become relevant?** Historical research from the user's own corpus and older technical literature, not just today's headlines.

## Editorial boundaries and relevance
- **No general politics, partisan debate or clickbait by default.** Include policy, legislative or geopolitical news *only* when it materially affects a named workstream: industrial AI standards, manufacturing permits, export controls, critical-mineral supply, water/energy regulation, grid interconnection, patent law or resilience funding, etc.
- Strong examples: Chinese **industrial AI / intelligent manufacturing** national or sectoral announcements, implementing regulations, interoperability standards, industrial-scale deployments, supplier qualification, standards effective dates, and primary-data changes. Confirm what specific program or figure an announcement actually denotes; never conflate press releases with deployed factories or realized impact.
- Other example project watches: STARS 2.0 proton–boron literature/EXFOR releases and detector advances; desalination, brine mining and LNG cold energy; fertilizer, waste-resource and industrial automation; Maui/Lahaina water, waste and permitting; U.S. energy/logistics and material supply.
- The product should **not** be an engagement-maximizing infinite feed. Limit to decision-relevant facts, unresolved questions and meaningful deltas.

## Two separate discovery lanes
**A. Breaking and current-event lane:** Timely policy/regulatory updates, official scientific releases, technical standards, facility announcements, patents and carefully corroborated reporting.

**B. Deep and historical research lane:** Older publications, uncited engineering approaches, patent-family prior art, longitudinal datasets, prior versions of technical standards, and previously overlooked project documents retrieved for relevance to an active question. A paper need not be recent to appear if it meaningfully changes current analysis.

Both lanes feed a **common provenance and contradiction ledger**, but must be labeled so historical papers are not misrepresented as new discoveries.

## Evidence sourcing: priority is contextual, not blindly outlet-based
1. Original records: journal/preprint (clearly distinguish), arXiv metadata and version, original datasets and evaluation bodies, official standards/regulator notices, patent office documents including legal-status checks, published government procurement records, technical specifications, company financial/operational reports.
2. Independent technical reporting and credible specialized outlets as leads and contextual checks, triangulated back to originals when material.
3. Major wire services (including Reuters) as **discovery signals**, not automatic certification; inspect whether the story is sourced to original documentation, anonymous remarks or recycled releases.
4. General news/search/social feeds only as low-trust discovery input with stringent filtering; exclude sensational headlines absent substantive evidence.
5. For jurisdiction-specific research (China, India, US etc), access official-language materials when possible and retain both original-language excerpt/reference and a labeled translation.

An outlet/domain alone never determines truth. A government or manufacturer announcement is first-party evidence **that a claim was made**, not necessarily evidence it was implemented or that forecast performance was realized.

## Source and evidence scoring design (proposal, not deployed)
Score **individual claims**, not publisher brands, across:
- source directness (primary record vs derivative paraphrase);
- explicit identity, document number, version, timestamp and stable URL;
- supporting datasets/methods and potential reproduction;
- conflict/contradiction with independent evidence;
- measurement vs simulation vs commercial aspiration;
- topic relevance to project, decision urgency and novelty against Alexandria history;
- licensing/access and safe use;
- freshness measured from **event date** plus publication date, with edition/correction flags.

Suggested labels: `OFFICIAL_RECORD`, `PEER_REVIEWED`, `PREPRINT`, `PATENT_PUBLICATION`, `DATASET`, `CORPORATE_CLAIM`, `SECONDARY_REPORTING`, `RUMOR_UNVERIFIED`, plus separate `VERIFIED_REFERENCE`, `CLAIM_REPORTED`, `CONFLICTED`, `MODEL_ONLY`. These are epistemic metadata, not arbitrary single-number 'credibility scores.'

## Critical news API and integration gaps
**Gap N-01 — source coverage:** No verified unified provider/connector currently guarantees adequate official-policy, patent, arXiv, academic database, industry-standard and local-government coverage in one feed.

**Gap N-02 — timeliness:** Need per-source timestamps, explicit crawler/connector lag, failed-fetch notices, correction and withdrawal detection, and time-zone-aware daily cutoffs. Do not assert 'no news' when ingestion was down or incomplete.

**Gap N-03 — provenance:** Preserve official record IDs, filing/publication numbers, original URLs, fetch timestamps, permitted immutable hashes, changed-page history, source access permissions, and license restrictions.

**Gap N-04 — deduplication:** Cluster syndicated copies, updated headlines and reprinted press releases into one underlying event, with original attribution and surviving alternative evidence.

**Gap N-05 — cross-lingual evidence:** Maintain Chinese-language policy and industrial AI source support; avoid hallucinated translations and distinguish national, provincial and company-level initiatives.

**Gap N-06 — relevance routing:** Map every event to projects, metrics, unresolved questions, affected designs and Canon constraints. Support discoverable historical relevance.

**Gap N-07 — contradictions:** Detect when original measurement, deployment evidence or effective dates conflict with earlier stories or existing project assumptions; provide explicit updates, corrections and retractions.

**Gap N-08 — permissions/privacy:** Restrict user-owned corpus matches and confidential patents/data by source permissions; daily reports should not publicly expose private projects.

**Gap N-09 — editorial safety:** Quiet noise by default but preserve audit trail and route consequential policy/security changes; never use popularity/engagement as a proxy for value.

**Gap N-10 — morning delivery:** Scheduling, opt-in, delivery channel, failure messages, rate/cost caps, review history, and read/unread feedback not implemented or verified.

**Gap N-11 — evaluation:** Build retrospective blinded evaluations of source accuracy, missed high-value events, false positive headlines, contradictory claims, speed vs reliability, multilingual performance and actual researcher usefulness.

## Proposed report skeleton
**Alexandria Morning Intelligence — <local date> — Coverage: <time window and sources checked>**

**1. Signal summary (max ~5 major items)** — Only decision-relevant high-quality findings; identify gaps in coverage.

**2. Project deltas** — Table with project, event/older paper, exact original record, date, evidence grade, model assumption affected, action/next test.

**3. Industrial AI China / regulation** — Standards, effective dates, factory/industrial deployments and measurable numbers; isolate primary notices from vendor marketing.

**4. Scientific frontier & patents** — Papers, arXiv version changes, patents with real claim/status checks, and source disagreements.

**5. Rediscovered history from Alexandria** — Prior work resurfaced because it answers a current question.

**6. Contradictions and corrections** — Newly found evidence that challenges past Atlas summaries or models.

**7. Open questions and next experiments** — Human-reviewed, bounded research recommendations.

**8. Coverage / ingestion health** — Sources actually checked, last success, API failures, stale feeds, known blind spots, and corrections.

## Implementation roadmap
P0: Read-only registry of project watches, sources, authorization scopes, Canon versions, and corpus identifiers.
P1: Primary-source adapters: arXiv and selected journal metadata; patent-office publication APIs; standards/regulatory official pages; original datasets and official Chinese industrial sources.
P2: Event normalization, deduplication, source-to-project linkage, clear provenance receipts, contradiction/change detection.
P3: Daily candidate-generation, source-grounded writing, human review with evidence references and quiet editorial standards.
P4: Test delivery mechanics, schedule, failure reporting, feedback and opt-out. Initially supervised; no always-on autonomy claim.
P5: Reuse independent governance-controlled dream/play/research cycles to generate *labeled hypotheses*, never news or verified facts.

## Required acceptance tests
- A headline repeats a six-month-old industrial AI announcement → report correctly says *old event, new article*, or suppresses.
- One news syndication event appears at 15 outlets → collapse to a single event with primary link.
- An arXiv revision corrects a result → mark version and affected Atlas assumption.
- A Chinese GB/T standard is announced versus becomes effective → do not conflate dates or scope.
- A patent filing describes a reactor → do not present as deployed or experimentally successful.
- A breaking item is political but unrelated to any project → exclude.
- An official policy update affects a named project → include even if political.
- A provider fails for a day → report degraded coverage rather than confidently reporting nothing.
- Private Alexandria document supports an item → do not include its private content in a public report.

## Related architecture and quarantine boundary
See [Alexandria × Atlas Intelligence Research Engine design intent](ALEXANDRIA_ATLAS_INTELLIGENCE_RESEARCH_ENGINE_DESIGN_INTENT_2026-10-27.md). The historical `alexandria-canon-register` is quarantined and not an automatic authority surface. This proposal is not a system deployment, signed Canon addition, news API procurement or scheduled report.

**Principle:** *Fewer headlines; stronger evidence; more useful research.*
