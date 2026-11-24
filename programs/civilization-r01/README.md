# Atlas Civilization R01 software kernels

Release `ATLAS-CIVILIZATION-R01-20261123-1` contains twelve bounded supporting software kernels, a Work-scoped action adapter, and the recorded local comparison of scan/rebuild and indexed implementations. This directory is the canonical source for the optional Noosphere and Providers references.

These implementations supply reusable operations. They complete zero specialized knowledge-node contracts and receive zero credit for the original 1,728 primary node metrics. Original knowledge-source bodies, labels, context capsules and host source snapshots are absent from this package. The EX1728 engineering program keeps its independent identifiers and source history.

## Run the source

The JavaScript implementation uses native ES modules with no external package dependencies. The reference-port tests use Python's standard library.

```sh
npm test
npm run test:source-reference
```

From the repository root, `npm run civilization:status` prints the bounded kernel catalog and release policy. `npm run test:civilization` runs both suites.

```js
import { lookupKernel } from './index.mjs';
import { civilizationKernelAction } from './integrations/kernel-actions.mjs';

const fixture = lookupKernel('H03').fixture(71, 64);
const result = civilizationKernelAction('civilization_kernel_evaluate', {
  scope: 'WORK', houseId: 'H03', ...fixture
});
console.log(result.results);
```

Every kernel exports `descriptor`, `prepare`, `reference`, `referenceQuery`, `query` and a deterministic synthetic `fixture`. Preparation validates and copies input into opaque instance state. `reference` rebuilds or scans from raw data; `referenceQuery` uses the same validated prepared snapshot as the indexed path so validation cost is not counted as an indexing improvement. Forged prepared handles are rejected.

The bounded action adapter accepts one dataset and at most 32 queries. It limits both input and output, snapshots arguments without invoking getters, and reports supporting capability rather than specialized completion. The current release policy chooses `referenceQuery` for H02 and `query` for the other eleven kernels. Direct calls to a kernel's `query` remain available for explicit comparisons.

| ID | Supporting operation |
|---|---|
| H01 | Dimension, frame and state-qualified affine conversion |
| H02 | Schema/input quality admission, missing fields and duplicate detection |
| H03 | Nonnegative routing with capacity and failure constraints |
| H04 | Interface/dependency closure and supplied trace differences |
| H05 | Source-qualified positive-term and coordinate retrieval |
| H06 | Static current grant/predicate evaluation |
| H07 | Commitment/event replay and resource-account projections |
| H08 | Lossless Unicode lexicon parsing and exact source spans |
| H09 | Finite typed Horn-rule closure |
| H10 | Scoped message projection and attribution |
| H11 | Current supplied-policy evaluation, revocation and return conditions |
| H12 | Resource-bounded ready-work selection from a DAG |

Kernel IDs and explicit source metadata are not an ordinal equivalence between different coordinate systems. A reference port does not derive an EX1728 task or original HSN from a kernel number.

## Recorded benchmark and release decision

The [complete assessment](outputs/SUPPORTING_KERNEL_ASSESSMENT.json), [human-readable results](outputs/SUPPORTING_KERNEL_BENCHMARK.md), [frozen protocol](benchmarks/SUPPORTING_KERNEL_PROTOCOL.json), [raw records](outputs/SUPPORTING_KERNEL_RAW.jsonl) and [receipt](outputs/SUPPORTING_KERNEL_BENCHMARK_RECEIPT.json) are included unchanged.

The experiment completed 480 fresh workload processes: forty for each of twelve kernels, across four input sizes. All required outputs matched. The registered twelve-kernel comparison found **eleven local gain candidates and one observed regression, H02**. The H02 median paired indexed/reference speed ratio was **0.689×**, so the release adapter retains its scan baseline as the default. This is a dispatch decision outside the frozen timed source, not a new measurement of the adapter.

Preparation cost is measured separately. The reported warm ratios do not include model calls, host authorization, network I/O or whole-system execution, and are not multiplied into a platform-wide gain. Every original primary knowledge-node metric remains unmeasured by this experiment. The 1,728-family sensitivity calculation is reported separately and grants no node credit.

`python3 benchmarks/analyze-supporting-kernels.py` rechecks source pins and reproduces the analysis from the recorded measurements. The timing controller uses exclusive file creation to preserve the recorded protocol and raw artifact. Run a new experiment only in a separate working copy with distinct evidence artifacts.

## Optional source references and host boundary

`integrations/civilization_kernel_reference.py` validates exact selected reference bytes, immutable canonical commit syntax, release identity, file fingerprints and the retained benchmark outcome. It prepares metadata only. Noosphere routes the packet through its existing Sentinel/Orchestrator candidate interface; Providers adds an explicit optional path to its existing goal decomposer.

A matching digest identifies bytes, not an authenticated owner. The reference helper does not retrieve or execute the canonical source. Its candidate retains `source_files_retrieved: false`, `execution_authorized: false`, `current_return_fence_verified: false`, `canon: false` and `deployment: false`. The host must independently resolve source pins, validate the current Work READ scope and apply its current RETURN fence before returning caller data. Neither the pure JavaScript adapter nor the Python reference helper grants host permissions, posts messages, performs model calls or promotes Canon.
