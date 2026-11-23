# Atlas ONE ↔ Ariadne v0.7 ↔ OpenAlex/arXiv: source-only research port

**Status: DRY-RUN CANDIDATE. No network, no installed MCP provider tool, no resident identity and no scheduler.** This portable Python worker receives *caller-supplied* HSN Work queue candidates in the shape prepared by the owner-private R08 circuit. It prepares exact read-only provider URL **plans** and parses synthetic metadata fixtures, never fetching real provider content.

- Valid HSNs are `H01..H12.S01..S12.N01..N12`; original ontology is separately source-pinned to SHA256 `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6` in the private publisher's trusted registry. The worker does **not** authenticate caller-provided registry bytes or catalog entries. Host MUST supply a source-verified queue handle and current-scoped permissions.
- Frozen 4,516-topic OpenAlex v0.7 crosswalk is kept **private**; this package has no private 22,580 candidate edges, no story bodies, no Work-room bodies and no credentials.
- OpenAlex Oct/Nov 2026 classifier/taxonomy revisions mean IDs, labels, subfields and work assignments require independently revisioned refresh. A keyword match is not semantic identity.
- arXiv: official Atom API, no more than one request each 3 seconds under a real host; handle 429/503, rights/consent, authentication and spend budgets. Metadata-only; no copyrighted full texts.
- Intended trusted host ports: `authorizeWorkAtRead`, `getSourcePinnedQueue`, `admitBudget`, `fetchMetadata`, `validateProviderRecords`, `authorizeWorkAtReturn`, `storeCandidateEvidence`, `requestIndependentExpertReview`. No port is implemented or granted here. A request plan must never be treated as its response or a host-attested receipt.
- Nomination cards for 12 House + 144 Sphere + 1,728 Node specialist roles are **unassigned opportunities**, not 1,884 actual residents. Participation must remain opt-in, authenticated where needed, scope-bound, revocable and non-exclusive.
- Private Play/Social/Imagine/Dream/Quiet/Brain/Palace content must not become Work input, analytics or model context. Fictional Iron Empire scenes are separately scoped and do not enter scientific sources.

To execute synthetic tests from the repo root:

```bash
python3 -m unittest discover -s packages/atlas-one-v2/test -p test_ariadne_research_public.py -v
```

Next integration: publish only after a private preview with current publisher/source HEAD, OpenAlex provider authorization/budget, two-account read/return revocation cases, outbox de-duplication, permission-aware receipts and rollback. This code is intended as an additive implementation **in the existing Atlas ONE source**, not a new broker or agent control plane. No CANON activation.
