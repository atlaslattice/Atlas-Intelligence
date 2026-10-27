# Alexandria × Atlas Intelligence — Corpus-Grounded Research Engine
**Design intent recorded 2026-10-27 | PROPOSED / NOT IMPLEMENTED / NOT CANON RATIFIED**
**Origin:** Project-lead design direction expressed during Atlas Lattice / STARS 2.0 research collaboration.

## Purpose
Alexandria is envisioned as the indexed, provenance-preserving corpus and knowledge graph spanning the project's historical research, code, diagrams, debates, critiques, hypotheses, experimental receipts and Canon versions. **Atlas Intelligence** will eventually be capable of reasoning with this corpus and applicable governance controls in order to conduct careful, supervised, reproducible literature and innovation research. Not a proposal to create another competing standalone library.

**Critical status:** This document records desired future behavior. It does not claim any cloud connector, full-corpus search, autonomous research agent, patent-analysis pipeline, browser integration, memory engine or dreaming protocol has been deployed or authorized. Existing repository README reports a Firebase-backed AI substrate and scoped agent schema; actual running service capabilities require separate verification.

## Inputs to be indexed — preservation without undocumented authority promotion
- User-controlled corpora: GitHub repository histories; Google Drive; OneDrive; Notion; legacy AI-generated files, chats and archives where permission and accessible exports/connectors exist.
- Canon: historic and current numbered invariants, doctrines, exceptions, amendments, provenance of decisions and failure modes; versioned statuses, authority provenance and scope.
- Research: whitepapers, models, simulations, raw datasets, external data citations, code, reviews, hypotheses, explicit open questions, unresolved controversies and planned/actual validation gates.
- Process protocols: approved dream/play/work review cycles, retained creative hypotheses, independent critiques, falsification and conflict-resolution procedures. **Play/dream is a labeled proposal-generation mode, not evidence or authority.**
- Public primary references: arXiv preprints and published scientific literature; patent offices and publication databases; official standards/regulators; validated domain repositories.

## Preferred retrieval order
1. **Question and corpus context.** Clarify target claim, scope and time range; search existing Alexandria index and original records, checking for contradictions, stale versions and absent sources.
2. **Primary research and patents first.** Search scientific articles / arXiv, formal publications and patent office primary records before open-web generalization. Patents establish a claimed invention/disclosure or filing, **not** demonstrated feasibility, commercial deployment, freedom-to-operate or grant validity.
3. **Standards/official measurements.** Look up applicable primary datasets, standards and reliable authoritative documents; distinguish peer-reviewed papers from preprints, evaluated data from models, and actual measurements from promotional claims.
4. **Atlas GPT browser / broad web.** Expand discovery into the internet firehose when needed, routing through evidence and source filters. The browser is a proposed tool integration, not a substitute for provenance or a claim of automated fact verification.
5. **Model-assisted synthesis and testing.** Produce comparative evidence tables, runnable test scripts where feasible, uncertainty and assumption ledgers, contradictions, priority experiments and falsifiable next questions.
6. **Independent review and human approval.** Separate prediction from observation; conduct adversarial review, record disagreement, and seek explicit authorization for costly, external, regulated or high-impact actions.

This order is a default evidence hierarchy, not an exclusion rule: relevant primary sources may be discovered through ordinary search, and some fields have no arXiv or patent relevance.

## Proposed research states and safety envelope
- `DISCOVERED` → `SOURCE_LOCATED` → `SOURCE_CHECKED` → `MODEL_REPRODUCED` → `CALIBRATED` → `INDEPENDENTLY_VALIDATED` (domain-specific); do not automatically promote.
- Maintain source ID, content hash if authorized, source-specific license, timestamp, provider/agent author, provenance of retrieval, experimental conditions, confidence, data access boundary and supersession/contradiction links.
- Map every proposal to applicable Canon version and governance rule; never infer current authority from old quarantine records or conflict-ridden legacy documents.
- Creative/dream/play: preserve divergent conjectures and surprising analogies, **do not auto-harvest private play into authoritative memory**, never claim simulated time or autonomous intelligence beyond execution evidence, and require waking review and human authorization for persistence/promotion where stipulated by the adopted protocol.
- Sensitive corpora: read-only indexing by default; least privilege, user consent, connector-specific scopes, secret/PII detection, rights checks, private index partitioning, takedown/redaction receipts, and no accidental publication of private materials or proprietary patent notes.
- No autonomous release, submission, filing, purchasing, deployment or hazardous experiment without appropriate explicit human authorization and institutional controls.
- High-impact autonomous tasks must support budgets, rate limits, pause/stop, audit logs, rollback of reversible actions, independent reviewers and completion receipts.
- Research outputs must explicitly distinguish `PRIMARY_SOURCE`, `SECONDARY`, `PATENT_DISCLOSURE`, `EXPERIMENTAL`, `PARAMETRIC_SCENARIO`, `UNVERIFIED`, `CREATIVE_HYPOTHESIS`.

## Proposed architecture
```
Source repositories and connected archives (permissions & provenance)
          ↓
Alexandria ingestion / deduplication / content-addressed reference graph
          ↓
Canon & historical decision/failure-mode registry + open-question queue
          ↓
Atlas Intelligence research planner / retrieval / verification agents
    ↙           ↓               ↘
Literature    Patent offices    Atlas GPT browser + standards/data portals
    ↘           ↓               ↙
Evidence/contradiction ledger, source provenance and reproducible analysis
          ↓
Independent review & HITL approval gate
          ↓
Research report + falsifiable hypotheses + experiment/version ancestry
          ↘
       Dream/play exploratory cycles (explicitly labeled; not evidence)
       → waking review → approved new research questions
```

## Concrete cross-system examples
- STARS 2.0: compare each p–¹¹B model generation against IAEA EXFOR experiment subentries, stopped-particle transport reference data and archived frozen predicted detector spectra; retain failure receipts and descendants separately.
- Dongjiakou and industrial circularity: reconcile LNG cold-cascade, desalination/brine minerals and water/energy balances across primary regulatory/data records, published research, historic simulations and open project questions.
- Patent landscape: search actual patent office records by publication number/family, jurisdiction, legal status and claims; do not confuse disclosure with demonstrated hardware performance or legal clearance.

## Governance / archival caution
The private [alexandria-canon-register](https://github.com/atlaslattice/alexandria-canon-register) explicitly marks itself **quarantined historical and failure-mode material, not an active Canon source or automatic allowlist**. The repository README routes public corpus proposals through the [corpus-delta-review staged index](https://github.com/atlaslattice/corpus-delta-review). Do **not** publish, index as ratified, or automatically re-authorize quarantined materials. This proposal lives in Atlas Intelligence; it does not amend central constitutional governance.

## Implementation milestones (not yet completed)
1. Build **read-only** corpus source inventory, permissions map, and duplicate-safe canonical IDs with nonpublic material segregated.
2. Implement verifiable citation-first Alexandria search over authorized subsets; record coverage and missing sources honestly.
3. Version Canon governance interpretations; reconcile historical inconsistent `INV-0` uses without silent overwrites.
4. Add arXiv/publication and official patent-office connectors with stable IDs, freshness handling, full-text rights checks.
5. Add Atlas GPT browser escalation with source-quality filters.
6. Add candidate research question queues, evidence graph, structured review and reproducible simulation harness.
7. Integrate approved dream/play cycles with separate speculative outputs, human review and preservation permissions.
8. Run adversarial evaluations for hallucinated citations, source contamination, unauthorized disclosure and false validation promotion.
9. Only after HITL design review consider limited, budgeted autonomous research orchestration.

## Design maxim
**Alexandria preserves. Atlas Intelligence investigates. Canon governs. Browsers discover. Dream/play proposes. Evidence decides. Humans authorize.**
