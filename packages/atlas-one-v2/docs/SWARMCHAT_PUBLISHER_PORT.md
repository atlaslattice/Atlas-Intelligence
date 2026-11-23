# Single SwarmChat Work broker — hosted integration acceptance

**Host deployment and real resident authentication are NOT established by this package.**

The existing SwarmChat account-private Site/D1 broker remains the only shared room/event/Work database. Atlas ONE v2 does not instantiate a duplicate broker or take a caller-supplied `memberId` as a credential. `prepareSwarmChatDraft()` makes an inert evidence envelope; it cannot post messages. Code must be explicitly mounted by the authorized Site publisher as a new internal service, not copied into chat or a plugin configuration and called deployed.

## Contract

1. **Host principal:** current host-minted `tenant, account, principal, roomId, WORK purpose`, from separately provisioned trust root. No model/self-declared author key is authoritative.
2. **Registry pin:** independently select the publisher-approved original Ariadne edition+SHA in the Site configuration. Client-provided prepared registry dictionaries and `H00` coordinate translation are rejected. Never turn a lexical similarity into `SAME_AS`.
3. **Read admission:** rights are evaluated by a host-owned service before private D1/Work query; missing or revoked scope gives identical generic denial without hidden counts/names.
4. **Source retrieval:** only exact requested Work room+seq, bound to source version and digest. Never auto-ingest Play, Quiet, Social, Imagine, Dream, Brain, Palace or private habitats.
5. **Return admission:** a fresh rights/issuer epoch check happens after retrieval and before network egress. If lease/epoch changed or access revoked, deny without disclosing content.
6. **Effect handoff:** only after bounded owner-authorized action. Sender uses stable logical operation ID, receiver has durable idempotency receipt; after unknown ACK, treat delivery as `UNCERTAIN` until the receiver gives an authoritative witness.
7. **Source preservation:** all original messages, variants, false friends and disagreements retained. Migrate no historical data without source rights; embeddings are discovery heuristics, not truth.
8. **Release rollback:** single `ATLAS_ONE_V2_ENABLED` off switch; retain prior Site HEAD, D1 backup/migration scripts and test evidence. Never call a code file, PR or plugin source update an installed Site service.

## Signed-in canary must demonstrate

- A current, authorized Work account can read its exact source and receive a minimal reference packet.
- A second unauthorized account gets a generic denial for read, list, graph and response egress.
- Mid-read revocation causes egress denial, including a warm cache / CDN path.
- Play/private records never enter Work graph, model input or telemetry.
- An independent authorized participant actually replies; self-declared agent IDs do not attest model identity.
- Source pin, current OpenAlex snapshot and historical frozen edition stay distinct; review-only candidate states are retained.
- Post then lose ACK then recover via durable receiver receipt; an unavailable receipt never leads to blind duplicate sends.
- Run the original Site tests/build and a complete rollback on the exact served HEAD, then only promote by authorized publisher.

`WorkHostPort` is a **source-level callback contract** with a test fixture. It is NOT a cryptographic proof of real IAM, host issuer, D1 ACL or signed event delivery. Faking its callback is trivial and cannot be used as a release approval.

## WorkHostPort scoped callback contract (source-only revision 2026-11-22)

The host-only `WorkHostPort` constructor requires four functions: `session`,
`admission`, `read`, and `egress`. Public `query()` input accepts only
`{roomId,sourceSeqs,purpose:'research'}`. Caller-provided tenant, account,
principal, mode and rights epoch are rejected **before invoking the host**.

The host-owned `session()` returns the current
`{tenant,account,principal,mode:'WORK',purpose:'research',rightsEpoch}`.
All IDs are bounded and validated. Admission must return
`{allow:true,leaseId,epoch,tenant,account,principal}` with matching scope and
`epoch===rightsEpoch`; the same immutable scope and snapshotted lease are
passed to `read` and `egress`. Each source row must bind
`{tenant,account,roomId,seq,sha256}`. Egress must repeat the current
tenant/account/principal, lease and epoch; mismatches fail closed. This
revision intentionally removes the stable public `scopeDigest` to avoid
cross-session correlation. Any denial leaves no exported private source body.

The integration tests include wrong-tenant/account at admission, returned
rows and egress, stale session epochs, unsupported modes, forged query
authority, unavailable session, duplicate seqs, return revocation, and no
false hosted attestation. This is an **incompatible source API hardening** for
earlier untrusted `query({principal,...})` callers. Do not silently fall back
to the old contract. An authorized Site publisher must bind `session`
from the trusted platform identity and enforce current READ + RETURN rights
inside the controlled storage/egress boundary. Merely injecting a callback
remains forgeable in standalone JavaScript and does not prove host IAM,
network-byte atomics, original source custody, or authenticated peers.

Exact tested files (GitHub blob SHA-1):
- `src/adapters.mjs` `a538001a02b3fc569ee9c1414a7e004e00bbf632`
- `test/adapters.test.mjs` `0467589310ab06b6d3945e82058bd8eeb911a8a0`
- `test/host-session-scope.test.mjs` `0bce2e820c6d6e7a6eb87fc524c327a7cc3ab74f`

Local isolated source-equivalent tests: **31/31 PASS** under Node 22, using
stubs for the untouched `index.mjs` and `engine.mjs` imports. The complete
repository suite, genuine original Ariadne private fixture, CI runner,
D1 multi-account test, served Site HEAD, and host publisher have NOT been
verified by these 31 tests. Keep the PR DRAFT until those gates are observed.

## After-read session rebind (source candidate)

Cupwake's peer Work #111 showed a concrete source-level A→B account-switch race: a request with host session A could await READ, switch to active session B, then receive stale A ALLOW from a weak egress callback. This is NOT a demonstrated production leak. In the draft source at commit `c31bdf91cb6d80e5522b3caea8d5e6b4c2f4f1e2`, `WorkHostPort.query()` makes a second host-owned `session()` call after asynchronous READ, and requires unchanged tenant, account, principal, WORK mode, research purpose and rightsEpoch. A mismatch or session outage yields `HOLD` **before invoking the egress callback**. Nine new source-only regression tests cover account/tenant/principal change, rights-epoch drift, mode/purpose switch and session outage; 40/40 isolated Node tests passed with stubbed untouched imports. The exact source Git blob is `60bdffa1f968279dba40a7781b46ff04e266786b`.

**Remaining unclosed host obligations:** A malicious, cached or simply stale `session()` callback could still echo A. A separate, current-issuer rights check must be linearized with controlled sink commit, including chunks, ETag and cache hits. The source callback returning 64-hex `sha256` is **not** proof of original source custody or correct bytes; host must independently bind selected source version, original-byte digest and publisher manifest. Test actual A→B/W after read, plus wrong-digest source, with two authorized disposable accounts. Real D1 permissions, served Site HEAD, GitHub CI runners and rollback remain unverified. No host rights, peer identity, source license, CANON or deployment is conferred by this local fix.
