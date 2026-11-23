# Twelve-pass local evolution engine

This module extends the existing Cupwake circuit compiler. It has one immutable
source registry, one append-only SQLite computation history, and an explicit
interface to the separate integration outbox. It does not start another
scheduler or make network/model calls.

Production requires the exact original Ariadne v0.7 bytes with SHA-256
`07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`
and the exact existing NEXT144 catalogue with SHA-256
`2540f702c020efbfaee0532e84face21394860e57e91749bf36f2b1a3f3c2843`.
The complete source, normalized registry, lens definitions and catalogue remain
owner-local inputs. Do not publish those input files merely to run this module.

## What a run does

One cycle contains twelve sequential computational passes. Each pass processes
every original node against all 144 Sphere lenses and 12 House lenses. The
passes implement different structural predicates and preserve the original
definitions, exclusions, role axis, edition and proposed activity modes.

| Stage | Computation | Result meaning |
|---|---|---|
| 1 | Source identity and exact hierarchy membership | Original, declared-record and normalized hashes stay distinct. |
| 2 | Affirmative/exclusion token overlap with each lens | Literal retrieval explanation, never semantic placement approval. |
| 3 | Whole-Sphere DOMAIN/META role pairing | Meta methods remain distinguishable from domain subjects. |
| 4 | Node initiative and lens initiative mode routes | Optional proposals stay outside the Work initiative route. |
| 5 | Typed relationship categories | Candidate relation types, with no inferred `SAME_AS`. |
| 6 | Locally declared dependency closure | Existing prerequisites are checked for cycles; no prerequisite is invented. |
| 7 | Revision impact through dependencies and source hierarchy | Derived views are invalidated without modifying original source records. |
| 8 | Previous-node and input-revision consistency | Each node result references the prior pass's exact result hash. |
| 9 | Four-system review intentions | Atlas, Ariadne, SwarmChat and Iron Empire receive identity-only slots. |
| 10 | Replay/retry contract checks | Stable keys and candidate states remain replayable; no delivery is inferred. |
| 11 | Node → Sphere → House → build aggregation | Content hashes make the complete hierarchy independently checkable. |
| 12 | Full previous-history verification and final source checks | All prior stored matrices and hashes are replayed before a cycle seals. |

The Source + Spectrum geometry remains **1,728 nodes, 144 Spheres, 12 Houses,
one build**. S01–S07 are DOMAIN Spheres; S08–S12 are META Spheres. Thus the
edition contains 1,008 domain nodes and 720 meta nodes. Every node of a Sphere
inherits that Sphere's role.

The source catalogue has 104 Work initiatives and 40 optional initiatives.
Their 1,248/480 node associations remain separate. All 1,728 coordinates can
still support an independently authorized Work review of the knowledge source;
this does not convert an optional initiative into Work.

## Exact counting

Per pass:

- 248,832 Sphere predicate evaluations: 1,728 × 144.
- 20,736 House predicate evaluations: 1,728 × 12.
- 269,568 total stage predicate evaluations.
- 1,728 stored node rows, each holding an explicit 156-element `uint16` vector.
- 144 Sphere hashes, 12 House hashes and one build hash.

One twelve-pass cycle therefore performs **3,234,816 stage predicate
evaluations**, stored in 20,736 node/vector rows. The vectors use little-endian
unsigned 16-bit cells and each vector is exactly 312 bytes. The storage design
does not falsely label 20,736 SQLite rows as 3.2 million SQLite rows.

The seal independently replays earlier stored computations. Verification
replays are not added to the completed-pass count. The engine reports zero
model invocations, actual Macroturns, semantic acceptances, implemented nodes
and hosted deliveries. An engineering implementation of this engine is a
different claim from implementation of 1,728 source-specific product tasks.

## Run and resume

From the existing circuit package root, with the private inputs already in
their standard locations:

```bash
python3 -m evolution.engine run --db output/evolution.sqlite
python3 -m evolution.engine verify --db output/evolution.sqlite
python3 -m evolution.engine summary --db output/evolution.sqlite
python3 -m evolution.engine slots --db output/evolution.sqlite
```

`run` resumes an unfinished current cycle. Repeating `run` after its twelve
passes finish is an idempotent no-op. A crash or exception during a pass rolls
back every row and the head for that pass; the next invocation resumes from the
last fully committed pass. A failed physical attempt can consume CPU without
earning a committed-pass count.

The API accepts an optional `expected_head` lease. Mutation uses SQLite
`BEGIN IMMEDIATE` with a unique event key, unique cycle/stage and unique
pass/node coordinate. This serializes local writers and rejects stale leases.
These are local concurrency protections, not distributed host authorization.

## Repeat and cascade

Continuing uses an explicit new cycle in the same store:

```python
head = engine.head
engine.begin_cycle("cycle-002", expected_head=head)
engine.run_all()
```

Each new cycle appends another twelve passes. Pass IDs advance from 1–12 to
13–24. Prior events and node results stay present, and the first pass in the
new cycle links to the last pass in the preceding cycle. A repeated cycle ID
returns the existing cycle instead of inventing a new one.

Between completed cycles, a new evidence or lens revision can invalidate the
affected derived views:

```python
impact = engine.invalidate(
    "evidence-revision-001",
    [{"kind": "NODE", "id": "H01.S01.N01", "revision": evidence_sha256}],
    expected_head=engine.head,
)
engine.begin_cycle("cycle-002", expected_head=engine.head)
engine.run_all()
```

Supported revision scopes are `NODE`, `SPHERE`, `HOUSE` and `BUILD`. A Sphere
expands to its twelve nodes; a House expands to its 144 nodes. Declared
dependency descendants are then included and the affected node set telescopes
to Sphere, House and build summaries. Revision events accept only scope IDs
and SHA-256 values; they do not ingest private activity bodies. Changes while
a cycle is open are rejected so one cycle cannot silently mix input versions.

The current implementation still performs complete matrices in each new
cycle. The dirty set records the affected scope for review and downstream
materialization; it is not a claim of selective recomputation. The existing
authorized automation or caller chooses when to start another cycle.

## Four-system integration contract

After a cycle seals, `outbox_slots()` yields 6,912 records:

```json
{
  "nodeId": "H01.S01.N01",
  "passId": 12,
  "runId": "CWE-<input-bound identifier>",
  "platform": "ARIADNE",
  "route": "NODE_WORK_REVIEW"
}
```

The platform values are `ATLAS`, `ARIADNE`, `SWARMCHAT`, `IRON_EMPIRE`.
These slots contain no source bodies or story text. The separate
`integrations.adapters` module validates source identity, applies platform
policy and fresh authorization, and records actual delivery/readback results.
Only that layer can establish a delivery result. Optional initiative mode
holds continue to apply when a caller requests an initiative route instead
of independent node review.

No source coordinate automatically becomes an Iron Empire story fact or
canon. An Iron Empire adapter must supply its independent editorial source
binding, consent and continuity requirements.

## Integrity and implementation versions

Every run identity binds the original bytes, normalized registry, full lenses,
exact catalogue, declared dependencies, **the complete evolution engine source
file hash**, and the existing source validator's source file hash. Reopening a
store with different implementation bytes fails with `INPUT_BUNDLE_DRIFT`.
Changing the algorithm requires a fresh, explicitly versioned store; retain
the old store as evidence and link the version transition in the enclosing
release receipt. Hot-editing a running imported module is unsupported. Start a
fresh process for a new implementation version.

`verify()` independently recomputes event hashes, exact derived node payloads,
cell vectors, complete pass-receipt fields, parent aggregate hashes, source
roles, initiative modes, evidence-revision history and counts. A caller can
supply the previously retained head to detect rollback to an older valid
snapshot.

The chain is unsigned local integrity evidence. An attacker able to replace
the code, the database and the externally retained head can create another
history. It does not authenticate a resident or prove a real model invocation.
Use SQLite backup or close/checkpoint the database before copying it; an open
WAL-backed main database file alone may omit recent committed transactions.

## Tests

```bash
python3 -m unittest discover -s tests -p test_evolution_engine.py -v
python3 -O -m unittest discover -s tests -p test_evolution_engine.py -v
```

The public regression suite constructs an explicitly synthetic complete
geometry and patches trust constants only inside its test harness. Production
has no caller-supplied trust-pin override. A regression verifies that real
production pins reject the synthetic bytes. The owner-private production run
and independent review separately validate the actual original source.

Tests cover exact coverage, complete twelve-pass counts, source and role
drift, optional-mode laundering, exclusion-only scope hits, transaction crash
and resume, replay idempotence, stale leases, dependency cycles, reverse
invalidation, repeated cycles, source/implementation pinning and rehashed
false source or count claims.

## Automatic existing Work Burst integration

The root build command can execute the existing Atlas ONE Work Burst after
all 6,912 local reference envelopes have been delivered and read back:

```bash
python3 run_evolution.py build --root /absolute/owner-inputs \
  --state /absolute/private-runtime \
  --native-package /absolute/Atlas-Intelligence/packages/atlas-one-v2
```

In the public repository layout, the command automatically detects the
containing Atlas ONE package when its `src/work-burst.mjs` exists. The input
directory remains separate from the code directory. Without a detected or
explicit native package, the manifest records `NOT_REQUESTED_UNBOUND`.

The native bridge reuses the exact existing Work Burst, NEXT144 module and
recovered R02 mode ingress. It runs 72 local batches of 96 source projections,
validates the current input digest, run ID, latest pass, all 6,912 unique
coordinate/platform records, source/module pins and native receipt digest,
then records `native_workburst_receipt.json` and `nativeWorkBurst` in
`ONE_BUILD_MANIFEST.json`.

Every build invocation performs fresh native checks; historical receipts are
not cached as new work. Those 72 local batch invocations are counted separately
from new evolution passes, local deliveries, model turns and hosted updates.
A requested native integration failure leaves a `BUILD_HELD` manifest while
preserving already committed engine and outbox history.
