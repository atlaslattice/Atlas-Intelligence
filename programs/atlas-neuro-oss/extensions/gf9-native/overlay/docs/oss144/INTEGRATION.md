# Native additive integration

This is a source-only extension of `@atlas/work-learning` 0.2.0 at commit
`76e6eeefeafbcc1cc4c6f94c00afcb9700fc19ba`. The installed runtime manifest is
`12ebee51314e983581452cab0bc90faaa5971258af915d6f2c66a8a85b235821`.
All 87 non-README runtime files matched that source. The installed README differs
only in a packaging link; both editions are recorded in the baseline receipt.

The existing neural retriever, five gateway operations, five default OpenAI tools,
MCP router, graph interfaces and source/use/return policy remain the integration
foundation. The extension adds optional modules and exports. It does not select
a new encoder, alter weights, rewrite ontology identities, install a host service
or replace an existing implementation. Engineering groups G01–G12 organize this
144-candidate review; they are not the twelve ontology Houses.

The predecessor's runtime manifest authenticates the predecessor only. An
intentionally revised runtime needs a newly exported complete manifest and
reviewed host configuration before use. Reusing the old manifest with these new
executing modules must remain a pin mismatch. This review does not re-export or
activate the owner's installed configuration.

## What is usable in source

| Module | New behavior | Important limit |
| --- | --- | --- |
| `src/context-pack.mjs` | Exact bounded family-aware utility selection; packages eligible corpus hits with source dependencies intact | Optimizes the stated utility; UTF-8 bytes are not tokenizer counts or answer quality |
| `src/discovery-tools.mjs` | Two opt-in strict OpenAI Responses tool definitions, matching MCP definitions and actual dispatch adapters | Explicit host registration and a current final-output fence are still required |
| `python/atlas_work_learning/event_lattice.py` | Held-input exponential leak, explicitly sampled reset, residual delta coding, reversible HSN addresses and immutable temporal state | Numerical reference functions, not neuromorphic hardware, a trained SNN or a cymatic semantic model |
| `python/atlas_work_learning/retrieval_audits.py` | Row-wise symmetric-int8 payloads, reconstruction diagnostics and exact-versus-reconstructed rank comparisons | Offline diagnostic; no active vector index is changed |
| `python/atlas_work_learning/selective_evaluation.py` | Validation-only threshold selection, source/family split checks, Wilson diagnostics and paired family bootstrap | Nominal uncertainty; the shifted test explicitly violates the validation target |

The source catalog is `feature-catalog.json`. Every row remains `CANDIDATE`.
Separate local-evidence fields identify narrow implemented primitives. A tested
primitive is not evidence that the complete candidate is adopted or useful on
the owner's real tasks. `source-registry.json` is the consolidated source record;
the separate neural, neuromorphic and serving review cards are retained in the
private handoff for audit history.

## Context selection and meaning

`planFamilyContext(items, {budget, maxItems})` solves a bounded multiple-choice
knapsack: at most one item per declared source family, maximum supplied utility,
then family count, lower cost and deterministic identifier ties. Work and state
limits fail explicitly rather than silently returning an approximate optimum.
Inputs are captured and checked before computation. Utility is a finite numeric
objective and is never represented as calibrated probability.

`prepareFamilyContext(result, options)` requires the original branded corpus
result from the existing gateway. It preserves exact excerpts, original scores,
the ordering of retained hits and every original source/item dependency. The
entire original result can influence selection, including omitted items; their
permissions therefore remain obligations. Selection does not change the original
result or promote its meaning hypotheses into accepted labels.

The `budgetBytes` limit covers **only the selected-items JSON array**. The full
envelope includes provenance and has a separately reported byte count. Neither
number is an OpenAI tokenizer measurement. A subsequent token-aware host policy
would need a pinned tokenizer and its own full-request budget test.

## OpenAI and MCP usage

The optional definitions use the native flat Responses function shape, strict
object schemas, all fields required and `additionalProperties: false`. They are:

- `atlas_work_learning_capabilities`: return one to twelve requested F identifiers
  from an injected, integrity-pinned catalog, under the existing status gateway.
- `atlas_work_learning_context_pack`: call the existing neural corpus search and
  prepare a family-aware context packet; no alternate search gateway exists.

```javascript
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createDiscoveryToolbox} from '@atlas/work-learning';

// gateway must already be configured by the authorized host, including its
// current hostOwnedFinalReturnSync callback and complete source inventory.
const catalog = JSON.parse(readFileSync('./feature-catalog.json', 'utf8'));
const expectedCatalogSha256 = createHash('sha256')
  .update(JSON.stringify(catalog)).digest('hex');
const extension = createDiscoveryToolbox({gateway, catalog, expectedCatalogSha256});
const definitionsForExplicitHostRegistration = extension.responsesTools;

const prepared = await extension.dispatchResponses({
  type: 'function_call', call_id: 'call_review_1',
  name: 'atlas_work_learning_capabilities',
  arguments: JSON.stringify({ids: ['F025', 'F049', 'F109', 'F121']})
});

// This check binds the exact prepared output object, not an arbitrary new
// provider request or untracked conversation history. No await, caller-owned
// getter or mutation may intervene between a final check and a real send.
if (JSON.parse(prepared.output).ok) extension.authorizeOutput(prepared);
// No network send is performed by this example or by the toolbox.
```

In a real deployment, the expected catalog digest must come from a separately
reviewed release descriptor; computing it from the file merely demonstrates the
serialization convention. A digest establishes byte identity, not permission,
source licensing, truth or human review. Review catalog fields for the actual
audience before disclosure. Public projections remove private review paths.

`callMcp(name, args)` returns native text and structured content. It does not
implement a second MCP server or silently register tools in the existing router.
Both transports return prepared outputs. `authorizeOutput` must run synchronously
again at each actual send or resend; copied JSON and outputs from a different
toolbox cannot acquire the original brand. A complete provider request or
conversation-history envelope requires the host's existing full-envelope
authorization path as well. Dispatch alone is not final send authorization.
`hostedBindingVerified` stays false in the inherited local release receipt.

The existing injected-client provider loop continues to expose its original five
tools. No provider loop, SDK, key lookup, model call or spending path was added.

## Mathematical contracts

For constant drive over an interval, the leak primitive solves

\[
V(t+\Delta t)=e^{-\Delta t/\tau}V(t)+(1-e^{-\Delta t/\tau})\mu.
\]

`expm1` preserves the small incoming coefficient; a weighted sum avoids subtracting
nearly equal large terms at long intervals. Input magnitude/time domains are
explicitly bounded. The sampled LIF wrapper checks the endpoint and emits at most
one event, then hard-resets. It does not locate continuous crossing times.
The independent oracle uses high-precision decimal arithmetic. This equation is
different from the peer's discrete `beta * state + input` recurrence; neither is
silently substituted for the other.

The delta encoder measures each new sample against the accumulated decoder state,
retaining changes smaller than one quantum across a slow ramp. Its real-arithmetic
error is less than one quantum; the implementation checks the reported binary64
tolerance explicitly. One event record can carry signed integer magnitude and
does not represent measured physical spikes. Lazy state still validates and
copies immutable address tuples, so reduced decay evaluations do not prove a
latency or energy reduction.

HSN indexing is the existing reversible arithmetic
`144*(house-1) + 12*(sphere-1) + node-1`. Addresses, DOMAIN/METHOD roles and their
original identities remain unchanged. Address arithmetic alone does not verify
the underlying registry edition, source permissions or semantic labels.

The int8 codec uses a binary64 maximum-absolute-value header per row and signed
codes. Its byte comparison excludes identifiers, dimensions, indexes, object
overhead and queries. It is an original row-wise diagnostic, distinct from
upstream per-dimension calibration. Stable original IDs break ranking ties.

The selective evaluator treats a source family as the uncertainty unit: a selected
family fails if any accepted row is wrong. Row risk is reported separately.
Known record, family, family-digest and source-digest overlap between validation
and test is rejected. Unknown derivatives and forged declarations are not cured
by local hashing. The selected Wilson criterion and percentile bootstrap are
descriptive approximations, especially after threshold selection or distribution
shift. They are not distribution-free guarantees.

## Reproduce the relevant checks

After applying the additive source overlay to a freshly verified baseline:

```sh
node --test test/context-pack.test.mjs test/discovery-tools.test.mjs test/oss-catalog.test.mjs
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=python python3 tests/test_event_lattice.py
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=python python3 tests/test_retrieval_audits.py
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=python python3 tests/test_selective_evaluation.py
node integration/run_context_pack_benchmark.mjs NEW_CONTEXT_RECEIPT.json
```

The tests use synthetic fixtures and fake provider transports. The context
benchmark must write to a new filename and preserves every timing sample,
including slower results. Event experiment receipt generation also refuses to
overwrite prior receipts. The peer composition probe verifies exact peer file
hashes before loading its source; it requires that separately supplied source
and does not bundle it or confer source-use authority.

The full inherited Node suite additionally requires the authorized original
registry through `ATLAS_TEST_REGISTRY` and an exact-source host checkout through
`META145_HOST_ROOT`, `ATLAS_GRAPH_HOST_ROOT` and `ATLAS_GLYPH_HOST_ROOT`. The
observed source-bound run was 264 passes, zero failures and one explicit skip
out of 265 tests. The skipped semantic-inference test requires a separately
admitted integrated workspace. A first run without the optional source paths
failed three dependency-dependent files; that failure log is retained. These
missing inputs must not be silently replaced with invented registry fixtures.

No test here counts as a GF9 144-Sphere batch, resident conversation, campaign
MacroTurn credit, human language understanding or a measured physical cymatic
effect. No fresh GF9 checkpoint chain was resumed during this source extension.

## Adoption and next falsifier

The highest-value next experiment is a preregistered, human-reviewed,
source-family-disjoint retrieval-and-answer panel using eligible sources. Compare
the unchanged neural baseline with **one** optional addition at a time. Report
answer/citation quality, abstention error, family coverage, total request tokens,
cold/warm latency and process memory. Keep losses, unfamiliar domains and
near-tie cases. Require a clear quality benefit before selecting an economic
optimization. Until that evidence and the separate host integration exist,
deployment and quality-improvement claims remain on HOLD.
