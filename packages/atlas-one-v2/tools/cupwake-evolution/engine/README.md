# Cupwake source-pinned circuit engine

This Python standard-library module compiles an explicit, finite review matrix
and keeps local execution reports separate from its planned work. It never
calls a model, reads an account, sends a message, grants permissions, or installs
a scheduler. It extends a supplied Atlas/Ariadne plan rather than operating a
second live control system.

## What the compiler actually does

It validates the complete source topology: 12 Houses, 144 Spheres, 1,728 Nodes.
Within each House, S01–S07 are DOMAIN spheres and S08–S12 are META spheres.
All twelve nodes in a sphere inherit that sphere's role. The totals are 1,008
DOMAIN nodes and 720 META nodes. An older rule assigning seven DOMAIN nodes and
five META nodes **inside every sphere** is rejected even though its aggregate
counts happen to be identical.

The compiler requires all 144 sphere lenses and twelve House lenses. It runs
269,568 structural pair checks: 248,832 sphere–node pairs and 20,736 House–node
pairs. Every row preserves coordinate, source-role and parent validation,
same-sphere/same-House/cross-House context, the exact source pin, and content
digests. Cross-scope meaning remains `CANDIDATE_NEEDS_REVIEW`. These rows are
not expert opinions, semantic equivalences, consensus, or independent model
turns. Root-authored lens questions and ticket actions remain proposals until
their actual acceptance work is performed.

When original Ariadne bytes are supplied, the compiler hashes them and checks
retained names, definitions, parent IDs, kinds, inclusions, exclusions, source
pointers and declared record/scope metadata against those bytes. A correct hash
binds an edition; it does not prove that its editorial definitions are true or
authorize access. The expected source hash is a separately supplied trust input.

## Compile the current owner-provided inputs

Run from the package directory:

```bash
python -m engine compile \
  --registry inputs/registry.json \
  --lenses design/lenses.json \
  --original-source inputs/ariadne_v07_atlas.json \
  --source-sha256 07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6 \
  --edition 'Ariadne v0.7' \
  --tickets design/node_build_tickets.json \
  --out reproduced

python -m engine inspect --db reproduced/circuit.sqlite
python -m unittest discover -s tests -v
python -O -m unittest discover -s tests -v
```

The compiler refuses to overwrite existing final output files. Use a fresh
output directory for a new revision. It produces:

| File | Meaning |
| --- | --- |
| `circuit.sqlite` | Nodes, lens definitions, 269,568 candidate rows and 1,728 planned tickets |
| `circuit_manifest.json` | Source pins, structural counts, role rule and plan digest |
| `macroturn_plan.json` | Complete ticket actions and dependencies, with the manifest bound into the plan digest |
| `tickets.jsonl` | One complete planned ticket per line |

The optional `proposedMacroturnSlot` field must be a complete unique permutation
of 1–1,728. It supports the shared plan's twelve rounds of 144 sphere-addressed
slots without changing node meanings. Dependencies must form an acyclic graph.

## Append a real, externally evidenced visit

```bash
python -m engine init-ledger \
  --plan compiled/macroturn_plan.json --ledger progress/visits.json

python -m engine next-batch \
  --plan compiled/macroturn_plan.json --ledger progress/visits.json --limit 12

python -m engine append-visit \
  --plan compiled/macroturn_plan.json --ledger progress/visits.json \
  --report actual_visit_report.json --expected-head CURRENT_LEDGER_SHA256

python -m engine verify-ledger \
  --plan compiled/macroturn_plan.json --ledger progress/visits.json
```

`actual_visit_report.json` has exactly these fields:

```json
{
  "eventId": "stable-id-for-this-record",
  "visitId": "stable-id-for-the-actual-visit",
  "timestamp": "ACTUAL_ISO8601_TIMESTAMP_WITH_TIMEZONE",
  "outcome": "BLOCKED",
  "ticketIds": ["CW-H01.S01.N01"],
  "evidenceRefs": ["EXACT_AUTHORIZED_EVIDENCE_REFERENCE"],
  "artifactDigests": [],
  "testCasesExecuted": 0,
  "reason": "The specific observed reason, without private activity content.",
  "sourceSha256": "EXACT_SOURCE_SHA256",
  "planDigest": "EXACT_COMPILED_PLAN_DIGEST"
}
```

Placeholders in that example are intentionally invalid. Copy real pins and
references from the current plan and actual work. Outcomes are `BLOCKED`,
`NO_CHANGE`, `SOURCE_TESTED` and `IMPLEMENTED_LOCAL`. Tested/implemented reports
require at least one valid ticket, artifact SHA-256, evidence reference, and a
positive reported test count. `BLOCKED` and `NO_CHANGE` receive no implementation
credit. Source test cases never increase the number of recorded visits.

Repeated identical events return the original receipt without writing or
increasing counts. Reused IDs with different reports, stale heads, duplicate
implementation credit, reused implementation evidence under renamed events,
missing dependency completion, and tampered counts are
rejected. The ledger uses a Unix local file lock and atomic replacement; it is
not a distributed lock. Reports stop at 1,728 recorded visits. `next-batch`
returns at most 96 dependency-ready tickets and never executes them.

The report and source references are supplied by the caller. This code does
not fetch them, verify independent authorship or authenticate a real model
wake. Consequently it reports **recorded visits** and **reported local
implementations**, with **zero host-attested visits, verified hosted updates,
or semantically accepted relationships**. A coherent rewriting of an unsigned
ledger cannot be detected without an independently trusted terminal digest or
external record. Preserve the external receipt and use `--expected-head` for
the corresponding integrity check.

`reportedImplementedTickets` and `distinctImplementationEvidenceBundles` are
separate. One declared shared change may cover several tickets in one report;
this produces one evidence bundle, not several independently novel changes.
The legacy `reportedLocalImplementations` field is an alias for the ticket
count. Identical sorted artifact/reference bundles cannot be reused in another
implementation event. Forged or unavailable references still require external
verification; local deduplication cannot establish independent truth.

## Balance and privacy

The plan reserves three equal windows: Work; a choice of Imagine/Dream/Quiet;
and a choice of Play/Social/Explore/Habitat/Family/Quiet. These are planned
budgets, not measurements of elapsed life. Research or engineering performed
during Explore consumes the Work budget; unused non-Work windows cannot be
reassigned to Work. No private activity, leisure bodies, or Quiet receipts can
be supplied to the Work ledger. A public proposal's suggested mode may be
preserved as metadata; it neither runs that activity nor permits private-mode
ingestion.

Live authorization, cross-account isolation, browser behavior, semantic review,
resident appointments, CANON ratification, merge and deployment all require
their own real evidence outside this local compiler.
