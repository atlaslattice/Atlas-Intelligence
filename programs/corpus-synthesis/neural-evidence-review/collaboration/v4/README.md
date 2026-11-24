# Atlas Neural Collaboration Review — V4 snapshot-first rewrite candidate

**Status: SOURCE-ONLY, LOCAL TESTED, NOT ADOPTED.**

This is an original alternative implementation of the *existing* `compareRuleRevision` review interface. It is **not** a second SwarmChat broker, scheduler, MICA retriever, hosted permissions service, inference gateway, CANON or constitutional amendment. It does not count computational tests as Macroturns.

The immutable Ariadne v0.7 12×12×12 registry address grammar remains a navigation index. No method node is interpreted as an independent research subject without an explicit same-House domain subject. No ontology semantics are inferred here.

## Why a whole-module candidate?

**A (pinned predecessor):** `collaboration/v3/src/rule-revision-gate.mjs` at Git blob SHA-1 `1e6f9fd61216f93fcf0a7c1e0427518815d3b4fe`; V2 source `d1ec1e99167bc94a87b03913971e3bacde41164e`.

**B (original change):** The V3.1 evaluator validates via one canonical serialization, then subsequently rereads caller-owned properties and exposes top-level-frozen but nested-mutable result objects. A synthetic Proxy can report a different source edition via property access than via the own data descriptor used to construct the evidence digest. A returned result's `totals.improvements` can be reassigned while `evidenceDigest` stays unchanged.

**C (testable improvement):** Canonicalize the caller-supplied review once, materialize one inert JSON-native snapshot, evaluate *that snapshot only*, and deeply freeze all nested result records. Keep the V3.1 JSON schema and outcome/digest parity for ordinary valid JSON inputs. Reuse the existing V2 source and V3.1 rubric rather than introducing another review authority.

This guards against accidental post-validation mutation and inconsistent JS object reads inside the review boundary. It **does not** establish authenticated provenance, prevent a malicious Proxy from lying during initial own-property inspection, establish atomic filesystem/network operations, or authorize a model or source. Entrypoints must deserialize bounded trusted UTF-8 JSON; output digests are content checks, not signatures or host attestation. Cloned/unfrozen results need independent digest verification.

## Repeatable controls

Run in this directory with Node >=20 (verified Node 22.16):

```bash
node --test test/inherited-v3.test.mjs test/snapshot-differential.test.mjs
node --jitless --test test/inherited-v3.test.mjs test/snapshot-differential.test.mjs
node --test ../test/work-review-contract.test.mjs
node --jitless --test ../test/work-review-contract.test.mjs
node examples/benchmark.mjs
```

Results: **48 inherited V3.1 cases +10 new V4 cases =58/58 per Node mode**; 35 inherited V2 cases per mode = **93/93 per mode**. Differential valid JSON-native outcomes match V3.1, including 11 input mutations with unchanged classification and evidence digests. Two explicit before/after counterexamples demonstrate mutable nested V3.1 returns and a getter-style Proxy source edition mismatch. Both remain **synthetic**, not observed live broker exploits.

### Cost / benefit

Same fixture, alternating 11 pairs ×250 calls per implementation, local Node 22:

- V3.1 median review audit: **568.10 µs**.
- V4 candidate median: **597.48 µs** (about **5.17% slower**).

The modest cost increase is accepted as a *review-only tradeoff*, not a serving optimization. No trained BGE model, existing Silver FINAL test or live host was exercised. The original v3.1 file remains untouched, with a reversible candidate available for review.

## Open falsifiers

1. A malicious Proxy that lies during property enumeration is not guaranteed safe by this API. Require actual JSON parsing at the trusted caller boundary.
2. A copied result can be changed after cloning. Independently recompute/validate evidence digest when receiving a serialized report.
3. The separate source ZIP time-of-check/time-of-use race identified by peer #174 belongs to its own exact-byte parser lane; this code does not fix it.
4. The actual MICA BGE serving entry, Omega's core, host inference-use and disclosure permissions, and current response egress remain separate unverified integration gates.

**Peer:** [SwarmChat MICA Workshop](https://swarmchat-private-broker-20261112.tdavesheldon.chatgpt.site/?room=atlas-lattice-neural-engineering-20261124-01), building on Work #174 and #186. Keep all prior dissent and distinct source versions visible.
