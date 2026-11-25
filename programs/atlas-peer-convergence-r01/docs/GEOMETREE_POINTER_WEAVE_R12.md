# Atlas Geometree R12 — Source Pointer × Neural Frame × Yijing (review-only)

**Status:** `TESTED_LOCAL` (not `COMMITTED` until a remote GitHub readback), not hosted, not deployed, not CANON-ratified, not a new scheduler, and not an authenticated peer/rights proof.

## Real engineering delta

`programs/atlas-peer-convergence-r01/src/geometree-pointer-weave.mjs` is one additive local bridge that **directly imports and executes**:

1. The already-issued PR67/70 `createGeometryOne` frame (the original existing model interface; no second encoder or neural call).
2. The original R11b Yijing/GF7 sidecar on the exact HSN v0.7 source address.
3. The **unchanged, exact Git-blob** PR70 `createPointerCompanion` local source-pointer journal, with its actual prepared release and mock USE/RETURN callbacks.
4. Distinct, exact (room, seq, digest) Work source references—not copied message bodies, resident roles, or a competing SwarmChat index.

The contribution binds score bytes (domain-separated IEEE-754 Float64LE SHA-256), original frame digest, issuer/source **claims**, ontology edition, evidence edition, current Work metadata receipt, pointer catalog **revision + history hash**, rights epoch digest, required set metadata digest and explicit Yijing codec edition to one **review-only** observation. It rechecks journal, Work refs and the full numerical frame after the asynchronous mock RETURN. A source withdrawal, same-bytes reappearance (ABA), changed Work ref, near/missing method subject, missing full frame, changed codec or changed issuer/source scope returns a generic `HOLD` with no source IDs.

### New independent falsifier

The baseline peer PR67 frame uses `JSON.stringify` in its numerical receipt, and JSON cannot distinguish `+0.0` from `-0.0`. A hidden score can therefore switch signed zero without changing the baseline JSON score hash or visible top-k. **R12 catches this with a separately pinned complete domain-separated binary64 score digest.** The tests deliberately reproduce the baseline weakness on a hidden score and verify R12 holds the modified frame. This is a source-integrity test, not an independent issuer signature or proof that input rights are current.

## Source scope and genuine review coverage

`private_source/original_ariadne_v07.json` is the exact original bytes with SHA256 `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`. It contains 12 Houses, 144 Spheres and 1,728 nodes, with 84 DOMAIN Spheres (1,008 nodes) and 60 METHOD Spheres (720 nodes). `private_source/source_derived_sphere_contracts_144.json` preserves **144 distinct source-derived review questions**; all remain `SOURCE_DERIVED_REVIEW_NOT_EXECUTED` and none are specialist algorithms, learned experts, accepted crosswalks or actual scheduled visits.

Three existing peer files were retrieved directly from the owner-private Library and their exact Git blobs independently matched PR70: `pointer-companion.mjs`, `pointer-companion.test.mjs`, and `peer-convergence.mjs`. Original R11b/PR67 code remained byte-identical and independently pinned. Peer code is internal to the owner repository and its published LICENSE is MIT with the Atlas foundation attribution text. The original private ontology bytes are **excluded from GitHub** and appear only in this owner's private archive.

## Run

```bash
cd atlas_geometree_r12
node --test programs/atlas-peer-convergence-r01/test/*.test.mjs
node --jitless --test programs/atlas-peer-convergence-r01/test/*.test.mjs
python -m unittest discover -s tests -v
python verify_manifest.py
```

### Directly executed

- **95 / 95** distinct JavaScript tests PASS in normal Node 22.16 and **95 / 95** under `--jitless` (31 new R12, 64 inherited R11b + PR70 pointer tests).
- **7 / 7** distinct private-source audit tests PASS in Python 3.13.
- Tested on one synthetic PR67 issued 1,728-score frame. `createGeometryOne` gateway called once, the R12 sidecar makes **0 additional model calls**.
- Cross-room duplicate sequence, same-room conflicting digest, Work reference mutation, late source withdrawal/re-addition, changed rights epoch, changed required-set metadata, altered hidden scores, unknown Yijing codec, method-subject omission, malicious JS accessor and Proxy inputs all HOLD.
- A valid reviewed pointer remains **LOCAL_SOURCE_POINTER_YIJING_REVIEW_ONLY**; no claim of actual source permission, independent required-set completeness, authenticated peer, hosted network egress, training, scientific equivalence, measured sound, or official MacroTurn progress.

## Required integration work (not completed by this package)

The canonical serving host must produce/attest a complete, signed/issuer-bound score-frame digest and the independent source/required-set manifests. Source USE/RETURN and final physical egress must be in its own atomic/revision-fenced domain. Peer current PR70 head and parent branches must be reconciled by a test runner before merge; no work should be silently auto-accepted from this local metadata adapter.

The current Whole Macroturn controller, 1728 shared ledger, Work quota `6+at most 2 Explore of 24`, voluntary private modes, and original CANON all remain untouched. This request was **one current conversation**, never dozens of fabricated model/resident turns.
