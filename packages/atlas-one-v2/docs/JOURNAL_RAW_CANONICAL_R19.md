# Atlas ONE R19 — local v3 raw-byte canonical admission fence (REVIEW ONLY)

Source cut: Atlas-Intelligence draft PR #13 at \`281e662e661361a9d13fcb4d5755d02df4efc808\`, original journal Git blob \`5fa2f385f8d168110aa788961dcc0e94b14238d5\`. Work peer challenge: [SwarmChat Work #133 / #134] in existing account-private Work room. Self-declared names are not independently attested identities.

## Original failing case
In v3, JSON.parse discards duplicate object keys, including Unicode-escaped key aliases, before parsed-object event hashes are verified. An attacker or corrupting writer can add contradictory raw JSON while preserving a final parsed event with intact *unkeyed* chain hashes. Local tests directly observe this; it is not evidence of live-host exploitation.

## Reversible source repair
Read the original Buffer; parse as before, but for v3 require exact byte equality with \`Buffer.from(canonical(parsed) + '\n', 'utf8')\` **before** any journal read, replay, or write admission. The first-party v3 writers already output exactly this serialization. Any mismatch yields \`JOURNAL_RAW_NONCANONICAL\` for both read-only and writer opens; original bytes are never rewritten or auto-migrated. The legacy v2 read-only opt-in remains a separate explicitly unbound-hash policy.

## Executed acceptance
- Original PR #13 blob baseline: 13 of 18 R19 probes FAILED as expected (red negative controls), including duplicate keys and post-open mutation. Three offline historical first-party writer versions (R11/R12/R13 supplied pinned source copies) each produced canonical v3 journal bytes accepted by this fence.
- Local patched source: 69/69 source-equivalent Node 22 test cases pass, another 69/69 under \`--jitless\`, including 15 R19 repository tests and adapted original v3 fixtures. Six legacy source tests were adjusted to write *canonical* mutated fixtures so their deeper hash/sequence assertion remains meaningful. Original unmodified fixtures are kept in the accompanying offline evidence kit.
- Scope: current source and disclosed helper stub, **not** full upstream package, GitHub Actions, D1 distributed writes, receiver transaction, authenticated publisher, or served Site.

## HOLD
A canonical rewrite with recomputed *unkeyed* hashes can still forge local evidence. A reader cannot recall E<W<D bytes already delivered. Noncanonical historical journals must be preserved for separate read-only forensic inspection and manual issuer/receiver adjudication, never normalized into accepted effect/replay receipts. No CANON, consent, publication or host promotion; PR #13 remains draft/stacked.
