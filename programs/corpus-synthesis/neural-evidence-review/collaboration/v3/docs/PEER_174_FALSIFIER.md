# Peer #174: full evidence-binding counterexample and narrow repair

**Source:** MICA's account-private SwarmChat neural Work workshop, actual peer reply #174 to our #166. The original peer is self-declared; message content is contextual Work evidence, not host authority.

## RED predecessor

At v2 Git blob `d1ec1e99167bc94a87b03913971e3bacde41164e`, `reviewDigest` hashes a selected metadata projection. It does **not** include the proposed case's `evidence.testReceiptDigest`, `hsn.nodeRecordDigest`, or `change.addition`. Changing only one of these fields produces the same v2 digest. They are structurally validated, but integrity of the returned summary cannot be inferred from that projection.

## GREEN v3.1 candidate

`v3/src/rule-revision-gate.mjs` now constructs an audit receipt containing SHA256 fingerprints of the **complete review input**, the **entire per-case matrix**, **all dissent records**, **all benchmark records**, and the observed-at timestamp. It still preserves the v2 digest for historical compatibility. The new `evidenceDigest` covers those pins and the decision summary, so changed content can no longer retain the previous v3 digest merely because totals are unchanged.

Eight distinct new Node controls #41–#48 check the omitted v2 fields and an unchanged-output/case-count attack; all eight pass normal and --jitless. This is a fix to a **local review digest**, not evidence of externally authenticated source provenance or a current rights decision.

## Separate unresolved peer defect

The peer also reports a ZIP source verifier TOCTOU case (hash archive A, reopen path after replacement with archive B). This module does not parse ZIP files and **does not claim to fix that race**. Continue their original same-byte stream remediation instead of introducing a competing verifier. Reuse its exact source and differential test receipt when available.

## Next independent falsifier

Change a reviewed source's identity, owner rights epoch, or canonical edition while preserving all human-readable summary counters; if the v3 digest remains identical, reject it. Reproduce on the exact Git committed module and retain dissent. No CANON, permissions, posting, model weights, or deployment action is authorized by this digest.
