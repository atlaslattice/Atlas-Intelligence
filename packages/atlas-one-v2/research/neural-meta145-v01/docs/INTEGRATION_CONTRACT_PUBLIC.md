# Public portable neural-evidence sidecar interface

The sidecar accepts an existing pretrained retrieval ranking. The **existing trusted publisher** retains all rights, source-reader, owner, permission and final-return responsibilities. The sidecar **never authenticates a resident, serializes protected source bodies, changes neural weights, trains from user data or grants CANON**.

## Candidate input (proposed; compatible with source-reported predecessor fields)

`documentId`, `sourceId`, `lane`, finite `score`, source `citation`, exact `sourceSha256`, typed `ontology: { id, sourceRegistrySha256 }`, optional reversible `glyphAliases` and Canon-only exact `sourceProvenance: { sourceSpan }`. The source reader must independently recover and pin family root, record revision, correction status, current rights, source span, effective dates and source mode. A model's `familyRoot` prediction is not source evidence.

The public Node entrypoint is `stageMicaEvidence` in `js/pretrained-evidence-sidecar.mjs` (function name retained only for downstream compatibility). It returns `PREPARED_NEURAL_CANDIDATES_NOT_RETURNED`, source reference IDs and an audit status, **not** a claim that a host has authorized any return. The actual application must call its existing host-owned final-return synchronizer and check current principal/tenant/source/version/rights/epoch inside the committed egress transaction.

The Python companion implements source-only synthetic READ and RETURN checks to test candidate selection and abstention. It cannot prove a host-owned ACL callback or complete absence of a microsecond race; no runtime may replace the trusted publisher with these simulations.

## Regression acceptance

- Foreign document borrows an otherwise valid vector; identity-mismatched candidate must HOLD.
- Two paraphrases share an originating experiment; count one independent family, preserve a separate eligible contradiction.
- Revision/citation changes while semantic embedding is unchanged; hold stale metadata and rebuild current evidence bindings.
- Source rights revoked between rank and RETURN; no protected text, label, count, glyph or clipboard survives.
- Unknown ancestry may be displayed as UNKNOWN, never counted as independent evidence or training-positive eligible.
- Unreviewed graph edges and exact HSN/glyph aliases do not become semantic equivalence.
- Strictly separate direct neural recall, graph expansion, lexical backup and final eligible citation metrics.
- Freeze a **new** source-family/time-disjoint human-reviewed test for future quality evaluation; do not optimize on a prior consumed final panel.

Reviewable source-only code can be pushed to a draft PR. Owner-private model release identifiers, archived source bodies, vectorizers and neural model weights remain outside public Git.
