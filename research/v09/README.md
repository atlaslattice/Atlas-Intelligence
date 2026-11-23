# Atlas ONE v2 — Ariadne research routing candidate v0.9

**DRAFT / SOURCE-ONLY / LOCAL TESTS / NOT HOSTED / NO RESIDENT AUTH / NO CANON**

This additive Python-standard-library companion accepts **separately supplied owner-authorized source files** from Ariadne v0.7, a frozen OpenAlex 4,516-row historical candidate CSV, the source-pinned existing 1,728-node plan and an existing Cupwake 269,568-row circuit SQLite. The sensitive source bytes are **not** committed to GitHub.

The code produces per-HSN research queries, explicit no-match gaps, 22,580 historical unreviewed candidate topic mappings, 1,884 unassigned expert slots, 144 Sphere + 12 House research follow-up summaries, and 1,728 Iron Empire editorial proposals. All outputs are **proposals**, not accepted semantic identity, model awakenings or implementation credit.

The `research_runner.py` queues read-only, **offline** OpenAlex topic-singleton and arXiv category query *templates*; a data-only adapter prepares bounded local jobs for the existing PR #19 Work Burst, not a competing host or scheduler. Host-owned authentication, current READ/RETURN rights, user/owner consent, provider budget and revocation are mandatory. No live OpenAlex or arXiv traffic, model spend, resident assignment, CANON or story-canon change.

The `iron_empire_continuity.py` module evaluates authored, structured six-film editorial proposal fixtures: Film II audit and Mars flashbacks, III incomplete restoration and assassination, IV potential recovery, V uncrowned prince/independent bugs, VI coordinated siege and species self-name/coronation. Fictional acoustic/xenobiological mechanisms are not measured science.

## Source-free local test

```bash
python -m unittest discover -s tests -q
python -O -m unittest discover -s tests -q
```

No external Python packages are needed, no original owner-private inputs are used by these source-only tests. Full-source integration and final browser/simulation verification receipts are preserved in the owner-private research bundle, **not** in public Git.

## Crosswalk status

- 4,516 topics; each frozen record has five HSN *candidates* (22,580 unreviewed edges).
- 969 domain-node positions have one or more suggestions; 39 domain nodes lack stored suggestions; 720 epistemic meta nodes must not be forcibly mapped as research subjects.
- arXiv source placements are scope-preserving *category routing proposals*, never proof of topical equivalence.
- Official references: https://help.openalex.org/data/topics/ ; https://help.openalex.org/api/authentication/ ; https://info.arxiv.org/help/api/user-manual.html . Check updated limits and current category taxonomy before real operation.

No exact original registry names or metadata, 4,516-row crosswalk, 1,728 node packet bodies, private conversation modes, fictional drafts, credentials, or actual provider responses are published in this code review. They remain separately access-controlled.

## R03: explicit scoped topic coverage

This local patch extends PR #28 at `debe5e4c7f5a89fe4412932479b08986ea27d648`. It adds coverage projection to the existing `research_bridge.py` and to that module's `build()` node output. The original `topicCandidateCount` continues to mean **all primary and alternate candidate links**; the added `topicCoverage` carries an explicit scope, cap and ordering. It does not execute or replace the provider queues in PR #28 or #29, or the Work handoff in PR #30.

```python
from research_bridge import FrozenTopicCoverage

coverage = FrozenTopicCoverage(registry_path, crosswalk_path)
summary = coverage.summary()
receipt = coverage.node(hsn, scope='PRIMARY', limit=5, order='TOPIC_ID')
```

Construction verifies the exact registry and crosswalk bytes using the original pinned loaders. Recursive immutable snapshots prevent later mutation of cached input dictionaries, lists or source metadata. Returned receipts are detached ordinary JSON data.

`scope` is required: `PRIMARY`, `ALTERNATE` or `ALL_CANDIDATES`. Every node receipt reports primary, alternate and all-candidate counts independently, then `visible`, `total` and `omitted` **within the selected scope**. `capReached` and `truncated` are separate: an exactly complete view can reach its cap with zero omissions. All 720 meta nodes retain empty topic sets.

`order` may be `SOURCE_ORDER`, `CANDIDATE_RANK_THEN_HEURISTIC_SCORE` or `TOPIC_ID`. The fields have distinct meanings:

| Field | Meaning |
|---|---|
| `sourceRowOrdinal` | One-based frozen CSV data-row position |
| `candidateRankWithinTopic` | This node's position among that topic's five candidate targets |
| `primaryHeuristicScore` | Historical primary-candidate score; null for alternates; never a probability |
| `sourceOrderPosition` | Position within the selected node/scope in original CSV order |
| `candidateOrderPosition` | Position after candidate rank, descending primary score and topic-ID tie break |
| `presentationPosition` | Position in the returned visible list |

The exact frozen crosswalk covers **737 nodes with primary candidates**, **953 with alternates** and **969 in their union**. **232 nodes are alternate-only**; 39 of the 1,008 domain nodes have neither. The source asserts zero exact matches and zero reviewer-accepted primary mappings. The projection performs zero semantic acceptances.

### Build the private display artifact

```bash
python3 src/research_bridge.py coverage \
  --registry /authorized/path/ariadne-reader-v0.7-exact.json \
  --topics /authorized/path/openalex_to_ariadne_ALL_4516.csv \
  --out /private/output/topic_coverage_1728.json \
  --limit 5 --order TOPIC_ID
```

The result has `summary.counts` and `nodes[hsn][scope]` for every original node and all three scopes. The source files and this derived display artifact are owner-private inputs/outputs, not public test fixtures. No prior-plan SQLite or provider access is needed for this coverage-only operation.

### Compare a retained graph observation

`coverage.observe_graph(observation)` requires exactly `hsn`, `scope`, `limit`, `visibleTopicIds`, `observationRef` and `source`. The source object must contain `registryEdition`, `registrySha256`, `crosswalkEdition` and `crosswalkSha256` matching the frozen source context. Duplicate IDs, out-of-scope alternates, over-cap returns, changed editions/digests and extra authority fields are rejected. An undersized return is retained as a finding through `countMatchesCap=False`.

The supplied observation reference is **not authenticated by this Python function**. Its output keeps the observed return order, identifies the reference, and remains `SOURCE_CHECKED_GRAPH_OBSERVATION_NOT_HOST_ATTESTATION`. It neither verifies a served Site build nor performs a live OpenAlex lookup. An observed ID-sorted prefix does not establish which selection algorithm the connector used.

`tools/verify_topic_coverage.py` independently reconstructs the node/scoped denominators, order lists and displayed metadata directly from CSV/JSON without importing the projection implementation. Its optional `--observation` path then exercises the public comparison API against a separately retained connector response. See `VALIDATION.md` for the executed local checks and remaining CI limitation.
