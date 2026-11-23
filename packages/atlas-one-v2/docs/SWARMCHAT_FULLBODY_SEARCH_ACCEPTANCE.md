# Atlas ONE v2 · Source-complete Work-page retrieval candidate

**Status:** SOURCE-COMMITTED / LOCAL-TESTED / NOT HOST-DEPLOYED. This is one additive feature on the existing Atlas ONE v2 package. It creates neither a second SwarmChat broker nor a new graph storage plane.

## Genuine 2026-11-23 Work evidence (on-demand Whole Macroturn)

- Actual authorized account Work room: `atlas-v32-evolution-50-work-20261123-s01`, source message #5, source body length **1,704 JavaScript UTF-16 units**.
- The source text includes `HOLD_TYPE_MODALITY` at UTF-16 offset **428**. This was checked by an exact `swarm_read_room({afterSeq:4})` read, not guessed from Graph Fabric excerpts.
- Live `swarm_graph_context({afterSeq:4,query:'HOLD_TYPE_MODALITY',mode:'local',depth:1,limit:10})` returned message #7 as `QUERY_TOKEN_MATCH`, and #5 **only** as `EXPLICIT_REFERENCE_NEIGHBOR`. Thus #5 was **not** a direct indexed hit even though its body contains the term.
- Positive control `query:'admission'` returned #5 as `QUERY_TOKEN_MATCH`.
- Query sourceWindow: `firstAfterSeq=4`, `nextAfterSeq=7`, `hasMore=false`, `complete=false`. Never interpret `hasMore=false` as whole-room completeness. A reference neighbor is not proof of a direct text match.
- Peer investigation and negative controls: the evolution room's Work messages #3–#7, including #5/#6/#7. This implementation is **not** a correction to the currently served Graph Fabric search index; its internal source is not installed here.

## Rewritten one-core remedy

`src/work-search.mjs` exports `WorkFullBodySearchPort` using the existing Atlas ONE v2 host-port approach. An authorized host injects exactly four callbacks: `session`, `admission`, `readPage`, and `egress`. Caller/model requests may supply only `roomId`, ASCII `query`, `afterSeq`, `pageSize`, and `purpose=research`. No identity, rights grant, source body or tenant can be asserted by a request.

1. Check the host session and current Work-only lease **before reading**. Reject all other purposes/modes.
2. Obtain a bounded, publisher-authorized page from the existing SwarmChat Work service. Each record must carry matching tenant/account/room, `kind=WORK`, ascending `seq`, full `body`, and exact `bodySHA256=sha256(UTF8(body))`.
3. Scan the **entire body for that page**, without using a shortened graph excerpt. ASCII case-folding preserves offsets; return first direct substring occurrence as both UTF-16 and UTF-8 offsets, source seq and body digest. Do **not** return the body, private context, nearby excerpt, or inferred neighbor matches.
4. Recheck the principal and rights epoch after source read, then call host `egress` to recheck lease/epoch before returning results. The real publisher must independently enforce an **atomic current-rights check at network return**, not just trust the callback response.
5. On no hit, return `NO_MATCH_IN_SCANNED_PAGE_NOT_GLOBAL_ABSENCE`. Always mark `fullRoomCoverageProven:false`. Querying an incomplete cursor/window or an over-limit body never becomes global absence.

Limits: 1–20 rows per page, 64 KiB per body, 256 KiB total page, seq 1–500. Oversize, wrong tenant, duplicate/order violation, non-Work row, body-digest mismatch, unexpected callback and revocation all fail closed. There is no model call, new subscription, post, graph write, CANON effect, or cross-mode ingestion.

**Source-code caution:** even when injected fixture callbacks return ALLOW, `hostAuthenticated:false` and `rightsVerified:false` remain false. This module does not own a trusted issuer and is not a live authorization implementation.

## Tests and pre-ship acceptance

- **20/20** newly authored Node tests, both normal and `node --jitless`. Local source-only test uses synthetic bodies; no actual private Play text is included.
- **139/139** tests in the earlier Atlas ONE v2 offline baseline bundle with the SHA-pinned original Ariadne registry; the new 20 are included. A newer branch may have additional tests not exercised by this local baseline; exact new-host checkout CI remains separate.
- The new source and test file Git blob identities were independently compared with the local executed files after GitHub commit. Not a claim of public CI.
- The currently served v32 Graph Fabric index **has not** been patched or redeployed.

Publisher acceptance requires a real two-account cross-tenant negative; wrong mode; limited/full paging; lost authorization after READ and before RETURN; source digest mismatch; message editing/version drift; stop/revoke; room expiry; and pre/post deployment readback on exact Site HEAD. The live broker must preserve original source URLs, message sequence and reply graph, not automatically upgrade a reference-neighbor match. A signed-in visual Workboard and normal search should visibly distinguish `DIRECT_TEXT_MATCH`, `REFERENCE_NEIGHBOR` and `COVERAGE_UNKNOWN`.

## Rollback and integration

Import through `@atlas-one/native-core/work-search` or `src/adapters.mjs`. The legacy `WorkHostPort.query` is unchanged. Remove the optional new host route to roll back. Neither the original Graph Fabric code, D1, room state, credentials, Play/Imagine/Brain/Palace, nor any source registry is mutated by this change.

This is one real Work delta from an optional on-demand Whole Macroturn; it is **not** a fictional 20-message sequence or a claim to have executed a scheduled automation visit.
