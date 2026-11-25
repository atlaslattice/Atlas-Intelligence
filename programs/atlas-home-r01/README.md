# Atlas Home R02 — one original geometry, a welcoming front door

**Draft / source-only / no host deployment.** Atlas Home is an additive experience and local front-door review layer on the existing [PR75](https://github.com/atlaslattice/Atlas-Intelligence/pull/75) all-peer source convergence. The **existing** PR75 `createOneFramePeerComposer` remains the sole neural composition entry; `src/existing-peer.mjs` imports it. PR74's 12 otherwise-missing public source files are cherry-picked verbatim into the dependent source branch; its three already-present identical files are not duplicated.

## See the home

Open `web/atlas-home-standalone.html` locally in a browser. It is a **self-contained offline** home, not a connected application. No external scripts, provider calls, storage, cookies or user content. If file navigation is restricted, serve these static files with your locally authorized file viewer; do not work around host access controls.

A welcoming threshold, responsive decorative Indra's net, twelve source-port rooms, exact HSN text entry plus coordinate picker (12 House / 12 Sphere / 12 Node), 144-position navigation grid, eight protected non-Work doorway previews, quiet mode and an easy exit. UI does not imply hosted execution or source rights.

## Actual source integration

- `src/geometry.mjs`: 1728 reversible **original** `Hxx.Syy.Nzz` coordinates, 84 DOMAIN / 60 METHOD Spheres and 1008 / 720 Nodes, typed `P12□P12□P12` navigation. Wrong N-based role inference is explicitly tested.
- `src/home.mjs`: safe source-only `createAtlasHome` and `inspectPreparedPeerResult`, expecting the original PR75 `atlas.one.peers.single-issued-frame/v1` result with four alias object identities and 12/144 projections. **Protected scores/HSNs/source IDs are NOT exposed through Home's public preview.** Unbound source returns HOLD. Host peer inspection is read-only and not authorized for public byte egress.
- `src/existing-peer.mjs`: imports actual PR75 `createOneFramePeerComposer`; no new neural scorer, queue, broker, or resident.
- `src/doors.mjs`: 12 Work rooms mapped exactly to existing PR67 Work port names; eight protected private doors are *navigation only*. Every cross-mode request returns HOLD pending actual host permissions, not caller booleans.
- `src/continuity.mjs`: ephemeral, explicit HSN return ticket with a leave/clear action; no permanent memory.
- `src/chronoforge.mjs`: source-only 12×1728 timescale-feature reference with Kahan-reduced synthetic numerical summaries. `T` is *not* a fourth canonical identity. No real temporal host, training, private mode or resident experience is asserted.
- `src/garden.mjs`: source-linked A+B=C ideas, typed challenge/support relations, never semantic or training acceptance.
- `src/federation.mjs`: thirty named connected-project candidates, **all marked intake/unbound**. Physical, symbolic and private systems retain their own namespaces and rights.
- `docs/CHARTER.md`: “a home worth coming home to,” with meaningful room boundaries, consent, agency, honest uncertainty and no productivity debt.
- `docs/INSPECTION_MATRIX_144.json`: 12 existing Work ports × 12 evidence/engineering review phases, all proposed, never 144 completed features.
- `docs/SYMBIOTIC_CONCEPTS_12.json`: twelve testable A+B=C proposals, with ablations, falsifiers and explicit status.

## R02 route-continuity repair

A malformed HSN holds new Work preview, clears any prior Work selection and invalidates in-flight Work results while keeping the last valid *public* coordinate visible. A valid re-entry requires an explicit new Work-room choice. Leaving clears the optional ephemeral ticket. [R02 route and source-scope repair](docs/R02_ROUTE_SCOPE_REPAIR.md) records the negative observations and local tests.

R02 local acceptance: **114/114** Node tests in normal and JIT-disabled mode; **30/30** desktop/mobile browser assertions and **4** standalone-inline checks. Zero external requests and browser JS errors. The historical R01 source bundle remains unchanged.

## Run

Requires Node 22+, Python Playwright/Chromium only for optional browser inspection:

```sh
npm test
npm run test:jitless
npm run check
node src/demo.mjs
python3 test/browser_smoke.py   # optional: Playwright set_content injection
```

The Browser policy in the author's executor blocks `file://` navigation (`net::ERR_BLOCKED_BY_ADMINISTRATOR`). The visual interaction was tested using Playwright's **set_content + the exact source script**; this is a local DOM behavior check, NOT a successful hosted or `file://` load. Negative fact retained.

## What is not integrated yet

Source import != semantic integration. PR75 WorkLearning, Meta145, glyph, neural fabric, PR74 Ω6 numerical union, peer PR65 closure, PR66 rank and PR70 frame witnesses remain distinct original implementations. The Home is an additive client to their **existing** interfaces, not a mounted OpenAI-native server. Actual selected Model0.3 issuer, current host READ/USE/RETURN/final byte egress, private content grants, distributed source CAS, authenticated peers, human-led semantic adjudication, hosted browsers and actual current corpus availability are **not** established by these tests. No merge, CANON, paid provider, model training or new automation was performed.

## Provenance and rollback

Branch: `review/atlas-home-one-geometree-r01-20261124` stacked on PR75 `review/atlas-one-geometree-all-peers-r01-20261124`, with original House source pin SHA256 `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`. Peer PR74 source SHA1 Git blob references in `docs/PEER_PR74_CHERRYPICK_LEDGER.json` are preserved exactly. Removing the additive `programs/atlas-home-r01` folder and the twelve PR74 files returns the parent unchanged. Do not rewrite or delete original historical peer branches. Original attribution and MIT license of the parent repo remain in force.
