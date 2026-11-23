# Automatic local four-system integration

This layer consumes completed source-bound twelve-pass results from the existing
Cupwake circuit. It materializes review candidates for Atlas, Ariadne, SwarmChat,
and Iron Empire in durable local files. It does not run its own scheduler.

## What executes

`SourceRegistry` independently hashes the original Ariadne v0.7 bytes and the
pinned NEXT144 catalogue. A projection binds the coordinate, source edition,
whole-file hash, original record's declared digest, recomputed original-record
JSON digest, homogeneous Sphere role, pass, run and destination. The two record
digests remain distinct. Source definitions, names, optional initiative bodies,
private activity and fiction scenes do not enter the transport projection.

`DeliveryOutbox` atomically enqueues one stable idempotency key per
run/pass/node/platform/route. It uses SQLite transactions, expiring worker leases,
an append-only hash chain and exact payload identity. `LocalFileAdapter` writes a
file using an atomic create-if-absent operation, fsyncs it, and rereads its hash.
Replay of a previously delivered projection does not create a second file.

```python
from pathlib import Path
from integrations import (
    SourceRegistry, DeliveryOutbox, LocalFileAdapter, LocalOwnerAuthorizer,
)

registry = SourceRegistry(
    Path("inputs/ariadne_v07_atlas.json").read_bytes(),
    Path("peer-inputs/next144-civilizational-capabilities.json").read_bytes(),
)
# slots come from the existing twelve-pass engine's outbox_slots().
envelopes = [registry.projection(
    s["nodeId"], s["platform"], s["runId"], s["passId"], s["route"],
) for s in slots]
box = DeliveryOutbox("output/integration.sqlite", registry)
box.enqueue_many(envelopes)
result = box.drain(
    LocalFileAdapter("output/platform-references"),
    LocalOwnerAuthorizer(principal="owner"),
    worker_id="existing-circuit-controller",
)
box.verify()
print(box.summary())
```

The default drain consumes the current eligible snapshot. A caller may set a
smaller `limit` for latency or resource reasons. Failed requests are attempted at
most once within that invocation, so a retry cannot starve unrelated work.

All four output directories contain local reference cards. A file under
`SWARMCHAT` is **not a stored broker message**. An `IRON_EMPIRE` file is a
`SOURCE_SCHEMA_REVIEW_ONLY` candidate, not an authored scene or canon update.

## Existing Atlas Work Burst integration

`workburst-bridge.mjs` executes the existing PR19/PR27 Work Burst implementation,
the original NEXT144 binder, and the recovered Cupwake R02 mode ingress. It
verifies the exact SHA-256 of all three modules and R02's relative NEXT144 import
before loading. `reused-mode-ingress.mjs` is the byte-identical R02 source. Its
existing import expects `../peer-inputs/next144.mjs` next to this package.

```bash
node integrations/workburst-bridge.mjs \
  /private/projections.json \
  /private/original_ariadne_v07.json \
  /private/next144-civilizational-capabilities.json \
  /existing/atlas-one-v2/src/work-burst.mjs \
  /private/peer-inputs/next144.mjs \
  /private/integrations/reused-mode-ingress.mjs
```

The input is a JSON array of complete `SourceRegistry.projection` envelopes.
All 6,912 node/platform projections have been executed through 72 existing native
Work Burst calls of 96 checks each, at the original runner's maximum parallelism
of twelve. These are local source checks, not 6,912 implementations, model
invocations or hosted actions. The original runner retains its resource locks
and dependency semantics; no duplicate task controller was introduced.

The pipeline preserves 104 Work and 40 optional NEXT144 initiatives. Proposal
evidence may follow only the 104 Work initiatives (1,248 node positions).
Independent `NODE_WORK_REVIEW` retains all 1,728 knowledge coordinates with
`initiative: null`; no optional activity's evidence is borrowed. The node is not
the initiative. Actual execution still needs a current authorization callback.

## Retrieval scope and Iron Empire

`scope_match` reports literal affirmative-text, exclusion-text, mixed, identity,
or browse-only matches. Its explanation can pass through a projection without
becoming semantic acceptance or Work authority. A match in `excludes` stays an
exclusion hit.

Iron Empire source pins refer to the recovered public Continuum Universe Bible
v0.2 and the PR74 editorial overlay. Both remain proposals. Their historical
versions are not merged or rewritten, and disputed Federation chronology is not
resolved by the integration. The metadata-only `fictional_review` checks explicit
local opt-in, known consent, source identity, the `IRON-HIST` namespace, selected
film-event restrictions and unit consistency. It rejects Film V coronation and
holds unknown events. Its narrow gate does not validate a whole scene, narrative
semantics, cultural authenticity, real science or unlisted continuity claims.
It never writes a scene or promotes story canon.

## Host boundary and failure recovery

`LocalOwnerAuthorizer` represents only local filesystem permission. It cannot
authorize an external adapter. A configured external callback must obtain
`HOST_CALLBACK_REPORTED` grants, bind their principal, request ID, payload hash,
platform, expiry and epoch, and implement both `send` and `readback`. Fresh grants
are checked at READ, immediately before dispatch, before return/readback, and
after readback. The module cannot independently authenticate a callback's claims.
Successful callback evidence remains `CALLBACK_RECEIPT_RECORDED` and
`hostedChangesVerified: 0`, never independent hosted proof.

External dispatch is durably recorded before calling the callback. A lost ACK,
post-send revocation or expired worker after possible external dispatch becomes
`SENT_RETURN_HELD`. Such a request is not automatically resent. Reconciliation
must inspect the actual destination by the stable request ID; only then should
the existing controller call `release_hold` with a concrete review reason.
Local atomic-file writes can safely replay after a crash. A worker that loses
its lease reports `LEASE_LOST` and cannot overwrite its successor's state.

Only the real host can make authorization atomic with its write/read return.
This package supplies no publisher signer, hosted execution endpoint, resident
authentication, model budget or network client. The observed SwarmChat broker
reported `workspace.execution=false` and `externalProtocolAdapter=false` during
this build. Ordinary authorized room contributions remain separate real actions
with their own broker readback evidence.

`verify` binds current delivery states, attempts, leases and receipt digests to
the append-only event chain. The ledger is unsigned local evidence; it cannot
prove an independent host action or resist a fully compromised local process.

## Verification and packaging

The Python suite covers exact source pins, all 6,912 projections, 1,248/480 mode
separation, exclusion hits, canon/consent/unit refusals, transactional enqueue,
replay, expired grants, mid-return revocation, stale workers, crash recovery,
lost remote ACKs, nonfinite leases, forged delivery states and receipt mutation.
Native tests run against actual source modules, not constant stubs.

The Python tests use conspicuously synthetic source records by default and patch
the pinned constants only inside the isolated test harness. Production
`SourceRegistry` has no configurable hash bypass; an explicit regression proves
the synthetic fixture is rejected under its unmodified trust policy. To repeat
the owner-source suite, set `CUPWAKE_PRIVATE_SOURCE_ROOT` to the complete private
kit directory. Native tests requiring original bytes skip in a public checkout
without those separate inputs; their reported private-source runs have no skips.

Public source changes should include implementation, tests and this document.
Keep the owner's registry, generated projection inventory, outputs and receipts
in the private reproducible artifact. The `reference/` directory is a retrieved
public-source audit snapshot, not an additional runtime or source of new canon.
