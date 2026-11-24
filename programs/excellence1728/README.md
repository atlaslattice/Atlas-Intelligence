# Atlas computational excellence: executable 1,728-step program

This is the authoritative source package for `ATLAS-EXCELLENCE-1728-20261123`, revision 1. Its 144 authored capabilities are grouped into 12 engineering workstreams and expanded through 12 explicit engineering phases into exactly 1,728 dependency-linked tasks. Each task has a concrete action, artifact, acceptance contract, negative cases, source bindings and measurement scope. The initial program has **1,728 planned steps and zero completed production steps**.

The program includes an actual compiler, scheduler, evidence ledger, functional memory, META145 integration logic and portable JavaScript query interface. The immutable bundled plan is reproducible from the catalog; it is compressed to avoid committing a second 4.9 MB expanded copy. Plan SHA-256:

```text
47084b895a6317db16275a92c3878a340d31af15fb9ab479db7101953c18e49c
```

## Inspect and verify

From the repository root, using Node.js 22 or newer and Python 3.10 or newer:

```bash
npm run excellence:status
npm run excellence:ready
node scripts/run_excellence1728.mjs task EX.W05.C03.P07
node scripts/run_excellence1728.mjs query functional memory
npm run test:excellence
```

These commands require no new package installation. The build command writes the expanded plan under this program's ignored `outputs/` directory and checks its exact digest against the bundled artifact. The JavaScript interface performs bounded status, task, search, dependency-root and prepared-handoff operations. It never executes task action strings, changes task state or posts a room message.

## Source layout

| Path | Responsibility |
| --- | --- |
| `catalog/capabilities.json` | All 144 authored capability definitions, concrete targets, contracts, source references and dependencies |
| `catalog/phases.json` | Twelve explicit engineering phases and their dependency graph |
| `catalog/source_inventory.json` | Source editions and exact readback digests |
| `catalog/coverage.json` | Original Ariadne coordinate IDs and their separate source identity |
| `catalog/canon_reference.json` | Reference to the existing HyperMatrix canon decision |
| `runtime/excellence1728/` | Deterministic compiler, scheduler, signed evidence ledger, functional memory and META145 aggregation |
| `integrations/` | Hash-verified portable JavaScript API and compressed program artifact |
| `tests/` and `integrations/test/` | Synthetic and real-plan verification, including rejection of forged completion and stale evidence |
| `docs/catalog/EX1728_CATALOG.md` | Human-readable engineering workstreams, capabilities and phase contracts |

See [runtime/README.md](runtime/README.md) for execution policies, measurement semantics and the trusted-process boundary. See [integrations/README.md](integrations/README.md) for JavaScript and existing Work-host interfaces.

## Independent coordinates and qualified evidence

`EX.W01.C01.P01` is an engineering identifier. It does not identify an Ariadne House, Sphere or node by matching ordinal positions. The program retains all 12 original Houses, 144 original Sphere perspectives and 1,728 original node IDs under the original source digest. Semantic crosswalk review remains explicitly pending. Original private labels and bodies are not copied into this package.

`ATLAS-UHM-CANON-20261123-001` remains the separately approved architecture decision. This engineering program references it and does not invent another canon amendment. The initial source plan does not prove improved deity associations, scientific relationships, production speedups, completed resident reviews or genuine Macroturns.

Task completion requires registered host acceptance evidence. The scheduler retains the one-third Work allocation and treats dependency/budget readiness separately from current source and permission preflight. META145 requires qualified evidence across all 144 source perspectives and all 1,728 reviewed tasks before full local integration readiness; unmeasured work, regressions and no-change outcomes remain explicit. No speedup ratios are multiplied.

Noosphere and Providers source ports reference this program by immutable commit and digest. Existing Work-host callbacks retain authorization and posting responsibility. Those ports do not create a broker, grant issuer or alternate runtime authority.
