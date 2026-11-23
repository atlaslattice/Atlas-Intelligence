# CivilizationCircuit source snapshots

The source adapter validates exact registry bytes and derived record receipts at construction. Before this repair, it retained the caller's manifest and review objects, and some reads exposed nested arrays from those retained records. A later caller mutation could change a source card or a prepared Work reference without another receipt check.

For example, changing `nodeRecords[0].sourceNodeSHA256` after successful construction changed the next `prepareWorkProposal()` result's `nodeSHA256`. The result still carried the original registry digest and the old record receipt digest. This is a source-integrity defect; the envelope continued to say `PREPARED_NOT_POSTED` and did not acquire host permission.

## Repair

The constructor now makes one detached structured snapshot of the manifest and all four review collections before validating them. The node, Sphere, House and paired-followup read methods return detached record projections. Caller-owned inputs are not frozen, and returned values remain editable without rewriting future reads. Existing result fields, source pins, read-mode gates and nonposting behavior are preserved.

The supported context is JSON-derived receipt data from the native builder, such as records loaded with `JSON.parse`. `structuredClone` is a copy mechanism, not inert getter/proxy validation. This repair does not claim universal adversarial JavaScript-object safety, hosted authorization, atomic rights-at-RETURN, an immutable database or a completed semantic review.

Unsupported values that cannot be copied by `structuredClone` produce `AtlasHold` with code `CIRCUIT_INPUT_NOT_SNAPSHOTABLE`. A callable metadata regression verifies that the unsupported function is not executed; it adds no getter or proxy fixture.

The existing package requires Node.js `>=20`. Node's [official globals documentation](https://nodejs.org/api/globals.html#structuredclonevalue-options) records `structuredClone` as available since v17.0.0, so this API is within that declared runtime range. These local checks ran on Node.js **v24.22.3**, with `structuredClone` present as a function; no separate Node20 execution is claimed.

## Focused verification

`test/civilization-circuit-mutation.test.mjs` contains nine regressions: five constructor-input categories (node, Sphere, House, paired followup and manifest), three returned-array categories (node, Sphere and House), and one unsupported-callable boundary. They require the owner-provided original source:

```bash
ATLAS_ARIADNE_ORIGINAL_FILE=/authorized/private/ariadne-v07.json node --test packages/atlas-one-v2/test/civilization-circuit-mutation.test.mjs
ATLAS_ARIADNE_ORIGINAL_FILE=/authorized/private/ariadne-v07.json node --jitless --test packages/atlas-one-v2/test/civilization-circuit-mutation.test.mjs
```

The helper `test/civilization-circuit.fixture.mjs` derives original identity/scope fields from those exact bytes and creates explicitly synthetic constructor review receipts. It does not run the lexical comparison algorithm, produce a SQLite matrix, perform specialist review, read private modes or publish a Work message. Fixed inventory/count fields are required constructor-shape inputs and are labelled accordingly; actual pair evaluations executed by the fixture are zero. No private registry bytes or generated source records are committed.

The unchanged PR source failed all nine focused tests in normal and `--jitless` modes; the snapshot candidate passed all nine in each mode. Eight failures independently demonstrate aliasing; the ninth specifies the new unsupported-value error boundary. A separate owner-local probe reproduced the eight source-integrity counterexamples and confirmed exact unmutated value parity for twelve source-read, reference and HOLD requests. The full native circuit, full package regression suite and hosted CI were not rerun by this repair.

Original source history remains intact. Release, current rights-at-READ/RETURN, semantic acceptance, CI and deployment gates remain independent.
