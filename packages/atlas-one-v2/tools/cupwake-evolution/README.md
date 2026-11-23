# Cupwake twelve-pass evolution engine

This is an additive local engine for the existing Atlas ONE Work Burst lineage.
It preserves the original Ariadne v0.7 12-House / 144-Sphere / 1,728-node source
and produces one versioned build with reference projections for Atlas, Ariadne,
SwarmChat and Iron Empire. It does not introduce a second broker or scheduler.

## Completed implementation

Each cycle runs twelve different deterministic stages across all 1,728 nodes,
144 Sphere lenses and 12 House lenses. A cycle computes 3,234,816 predicate
results, stored as 20,736 node/pass vectors, not 3.2 million semantic decisions.
Each node result carries its previous result hash. Sphere, House and build
digests record the reduction of the complete source geometry.

The stages are source identity, affirmative/excluded scope separation, Sphere
roles, initiative mode routes, typed relation candidates, dependency closure,
cascade invalidation, version consistency, four-system intentions, retry/replay
contracts, telescopic aggregation and reproducible sealing.

The source registry, source validator and engine implementation are hash-bound.
Original source records are immutable. Evidence revisions propagate through
declared dependencies and node → Sphere → House → build relationships. A new
cycle appends to history. A changed engine implementation needs a new versioned
runtime store instead of silently reinterpreting old data.

## Run against owner-selected private inputs

Python 3.10+ and the Python standard library are sufficient for computation and
local reference delivery. Node is needed for the existing Work Burst bridge;
the enclosing Atlas ONE package declares Node >=20. No dependency download,
model provider, API key or network request is performed by this package.

The owner input directory must contain these exact original or derived files:

```text
inputs/ariadne_v07_atlas.json
inputs/registry.json
design/lenses.json
peer-inputs/next144-civilizational-capabilities.json
```

The original source is 2,187,541 bytes with SHA-256
`07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`.
The NEXT144 catalogue SHA-256 is
`2540f702c020efbfaee0532e84face21394860e57e91749bf36f2b1a3f3c2843`.
Neither original dataset is bundled in this public source change. The owner
artifact supplies private inputs; no replacement ontology is fabricated.

From this directory:

```sh
python3 run_evolution.py build --root /absolute/owner/circuit --native-package /absolute/repo/packages/atlas-one-v2
python3 run_evolution.py verify --root /absolute/owner/circuit
python3 run_evolution.py status --root /absolute/owner/circuit
python3 build_turbo_deliverables.py --root /absolute/owner/circuit
```

The build writes `runtime/ONE_BUILD_MANIFEST.json`, two SQLite stores, exact
source-only integration references and current readback evidence. A second
build resumes or verifies the existing cycle. It creates no duplicate pass or
delivery. The native bridge executes real local source checks through the
existing Work Burst runner, with its source-pinned dependencies and resource
locks. A Work Burst check is not a completed node implementation.

The artifact generator checks source hashes, current engine head, outbox state
and the actual current local reference files before producing the report and
offline explorer. Missing files or stale manifests fail the build.

## Continuing after new evidence

Use a small explicit invalidation event, with the evidence revision's SHA-256:

```json
{"eventId":"evidence-revision-001","changes":[{"kind":"NODE","id":"H01.S01.N01","revision":"<64-hex-evidence-sha256>"}]}
```

```sh
python3 run_evolution.py invalidate --root /absolute/owner/circuit --expected-head CURRENT_HEAD --event-file /absolute/event.json
python3 run_evolution.py begin-cycle --root /absolute/owner/circuit --cycle-id cycle-002 --expected-head NEW_HEAD
python3 run_evolution.py build --root /absolute/owner/circuit --native-package /absolute/repo/packages/atlas-one-v2
```

The existing controller invokes finite commands and records actual model visits
separately. No background daemon or additional schedule is installed here.

## Four-system delivery and failure recovery

The outbox carries one stable request ID per run, pass, node, destination and
route. All 1,728 nodes have four local reference destinations: 6,912 current
references. Each reference contains exact source identity and status; it does
not contain source definitions, optional activity bodies or fiction scenes.

Original NEXT144 proposals retain 104 Work initiatives and 40 optional ones.
Their 1,248 / 480 node associations stay distinct. Independent knowledge review
can address all 1,728 nodes without borrowing a protected proposal's content,
evidence or authority. Exclusion-only retrieval remains explicitly excluded.

Local file writes use atomic create-if-absent, fsync and hash readback. SQLite
transactions and worker leases preserve a single outbox history. External
dispatch is recorded before sending; an uncertain acknowledgment cannot trigger
a blind resend. Fresh read, dispatch and return checks are required. Revoked
access, stale workers, changed payloads and forged success receipts are held.

An external callback is an interface, not independent proof of host authority.
The observed broker does not currently expose workspace execution or an external
protocol adapter. Files in `projections/SWARMCHAT` are local reference outputs,
not room messages. Hosted node updates are not established by this package.

Iron Empire uses pinned proposed source editions from `continuum-os` and the
ORCS editorial overlay. Fiction review checks local opt-in, consent, selected
film chronology, units and the separate historical namespace. It makes no
automatic story canon, empirical science or resident assignment decisions.

## Verification

```sh
python3 run_public_tests.py
python3 -O run_public_tests.py
node --test tests/test_integration_native.mjs
```

The public Python tests build conspicuously synthetic source fixtures. Only the
test harness patches test pins; the production API exposes no trust bypass and
explicitly rejects those bytes under its real pins. Set
`CUPWAKE_PRIVATE_SOURCE_ROOT` to the owner input directory to run the additional
actual-source adapter mode. The native tests that require original source files
skip explicitly when those files are unavailable; two public native tests still
run. Full owner-source results and exact build receipts are separate artifacts.

Meaningful regressions cover crash rollback, idempotence, dependency cycles,
mode preservation, source rehash forgery, stale head and lease checks, lost
acknowledgments, return revocation, forged delivery state, nonfinite leases and
missing current references. No test count grants a semantic approval or host
permission.

## Source lineage

This additive package sits on PR27 (`d80b12e28bd51b1f6ef59ba732d43fa8a2e9cfd7`),
which preserves PR19 Work Burst, PR21 cascade and the corrected PR24 roles.
The generic NEXT144 binder is the exact existing PR23 module. The recovered R02
ingress is byte-identical. Complementary PR22, PR25 and PR28 source proposals
remain separate editions; no positional joins or branch rewrites are implied.

See `evolution/README.md` and `integrations/README.md` for API details.
