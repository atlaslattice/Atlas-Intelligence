# Atlas Indra Foundry R37 — exact 1,728-node Work source compiler

**This is a child review of draft PR #73, not another Atlas core.** It consumes an owner-authorized original Ariadne v0.7 source registry and a distinct original 1,728-job Atlas Explorer. No private source bytes, resident discussions, agent state, model weights, credentials, private modes, or raw work documents are committed here.

## Actual source anchors

Ariadne v0.7 SHA256: `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`.

Original 1,728-job Explorer SHA256: `24396d4acf8cb3b92277e9705192cdfe45d4eb1f39e97585f167b2fcb887752e`.

Owner-local R37 source run (separately provided in private artifact) crossmatched all 1,728 coordinates, parent/role/name/record hash and unique source jobs; executed **1,728 positive local source-contract validations** and **20,736 deliberately changed source/mode/authority/role/job rejection cases**. Additional 1,728 local mock Work views and 1,728 denied RETURN cases passed. The private R37 package includes 144 Sphere, 12 House, META145, SQLite and offline inspector outputs.

The exact original Explorer itself reports every legacy source job as LOCAL_FIXTURE_BUILT, NOT_ADJUDICATED, NOT_DEPLOYED and NOT_REGISTERED. **The R37 source pass does not change those original statuses.** Source program ATLAS-EXCELLENCE-1728-20261123 separately reported 1,728 PLANNED, 0 IMPLEMENTED/VERIFIED/INTEGRATED; same count does NOT imply HSN-to-EX.WCP mapping.

## Public-safe module

`source-map.mjs` has one purpose: reject nonmatching source bytes before parsing, validate every source-defined HSN and its exact job, and return a nonpromoting local Work-map. It calls no encoder/provider/retriever and never grants rights, CANON or production release. Source role is derived from **Sphere S01–07 DOMAIN, S08–12 METHOD**, not Node ordinal. The source job's paired HSN remains an unreviewed positional candidate, not SAME_AS.

To run exact-source tests, set both owner-controlled paths:

```sh
ATLAS_R37_ORIGINAL_REGISTRY=/path/to/ariadne_v07_atlas.json \
ATLAS_R37_ORIGINAL_EXPLORER=/path/to/Atlas_1728_Explorer.html \
node --test programs/atlas-peer-convergence-r01/foundry1728/source-map.test.mjs
```

Without both sources, the public structural test still runs and the exact-source tests are explicitly **SKIPPED**, not claimed passed. The owner-local companion compiler executed the 17/17 source-facing tests with exact private source in both standard and jitless Node; that result does not independently establish public-branch CI.

## Architectural and Work limitations

Geometry is mandatory **12 Houses ×12 Spheres ×12 Nodes**, with original Ariadne source identity, parent and role. Flat buffers and sparse matrices are optimizations inside that architecture. Other 12-dimensional code and Excellence namespaces are not original Houses.

The Foundry R37 companion records only source-reported Work peer placement references (eight HSNs, no semantic adjudication); no private Palace, Dream, Imagine, Play, Social or Quiet content. For external source/Model0.3/Graph Fabric/PR73 use, separately require host-origin issuer, fresh source READ/USE/RETURN and final byte egress, independently pinned adverse closure, authenticated source family holdout and explicit human semantics. All those gates remain held.

Rollback: close this child draft or revert the additive source-map module/tests/docs; PR #73 and every peer branch remain untouched.
