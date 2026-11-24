# Existing-host integration ports

The 1,728 engineering steps are a source-defined plan. These adapters expose that
plan through the existing Atlas ONE and SwarmChat interfaces. They do not run step
action strings, post messages, start agents, modify canon, or certify completion.

## JavaScript

`excellence-program.mjs` works in Node and a host with Web Crypto. Load exact JSON
bytes using an expected SHA-256 selected by the integrating source manifest:

```javascript
import {createExcellenceProgram, isVerifiedProgram} from './excellence-program.mjs';
const program = await createExcellenceProgram(planBytes, expectedPlanFileSHA256);
program.descriptor();
program.query({workstream:'EX.W06', phase:'P04', offset:0, limit:12});
program.task('EX.W06.C03.P04');
program.ready({limit:12});
```

The expected hash covers the original transport bytes. It is distinct from the
Python engine's deterministic JSON digest if the file contains indentation.
`isVerifiedProgram` uses private instance membership, so copying method names
onto another object does not create a verified program.

`ready()` returns the initial dependency roots only. It accepts no caller-supplied
completion list. Use the Python evidence ledger for later execution state,
budgeting, invalidation, and META145 aggregation.

The optional `createExcellenceWorkBridge(program, hostPort)` consumes the existing
publisher-injected WorkHostPort `query()` interface. It checks the selected room
and sequence on every call and returns only source pointers. An injected host
callback's success remains a reported result; this adapter cannot independently
authenticate the host or grant current rights.

The CLI accepts only a plan file, exact expected file hash and one read command:

```text
node integrations/run_excellence_program.mjs PLAN_JSON EXPECTED_SHA256 status
node integrations/run_excellence_program.mjs PLAN_JSON EXPECTED_SHA256 task EX.W06.C03.P04
node integrations/run_excellence_program.mjs PLAN_JSON EXPECTED_SHA256 search memory
node integrations/run_excellence_program.mjs PLAN_JSON EXPECTED_SHA256 ready 12
```

## Python source references

`excellence_reference.py` is the same small read-only port in Noosphere and
Providers. It checks an externally selected reference digest, an immutable
Atlas-Intelligence commit, per-file source hashes, the exact program counts, and
zero completion claims. The actual task must still be resolved in the primary
program and checked against its current evidence ledger before execution.

Noosphere's additive `prepare_excellence_work()` sends the resulting metadata
through its existing `Orchestrator(Sentinel())` candidate review. Providers'
existing `HierarchicalGoalDecompositionEngine` accepts an explicit
`excellence_reference_bytes` argument for this path; its previous default remains
unchanged. Neither adapter uses the legacy zero-based Providers coordinate parser
to interpret Ariadne or engineering coordinates.

## Distinct namespaces and states

- `EX.W01.C01.P01` identifies an engineering workstream, capability and phase.
- `H01.S01.N01` identifies an original Ariadne node under its source edition.
- Matching counts or ordinal positions establish no semantic identity.
- The adopted HyperMatrix decision remains a reference. This program's planned
  tasks have no new canon effect.
- Work budgeting retains the one-third allocation; no planning pass counts as a
  genuine resident Macroturn.

Run the complete program checks with `npm run test:excellence` from the
Atlas-Intelligence repository root. The reference ports are additionally tested
through each repository's existing host call path by
`python3 -m unittest discover -s tests -p test_excellence_source_port.py -v`.
