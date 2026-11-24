# Retain source state across consumer edits

`Meta145GlyphCircuit` and `CivilizationUnifiedBuild` return detached data
snapshots. Callers may annotate a returned review or build in their own code;
those edits do not alter the engine's retained source or later receipts.

Before this repair, the shallowly frozen engine still exposed mutable arrays
from its private source data. Editing `sphereReview().anchorTerms`, for example,
changed later reviews while retaining the original perspective digest. Editing
`sphere().homeNodes` could make a later build fail with
`SPHERE_SOURCE_MISMATCH`. The memory policy also retained the caller's original
object, allowing its selected policy and evidence to change after validation.

The repair isolates these boundaries:

- Retain only the memory policy's required primitive data properties and a
  dense array of string event identifiers. Shared-memory views, sparse or
  non-string identifiers, and behavior-bearing proxies/accessors are refused.
  Unused caller metadata is not read, so unrelated getters cannot run during
  source validation.
- Return copied Sphere node, term and candidate arrays, House perspective
  digests, and memory evidence identifiers.
- Return copied Civilization source arrays, including those embedded in a full
  build result.

The return schema, unedited values, source digest checks, unreviewed semantic
status, and host/permission boundaries are unchanged. The return objects stay
mutable for consumers. No new broker, persistent service or source authority
is introduced.

## Reproduce

The integration regressions require the exact, separately authorized original
Ariadne registry and valid META145 artifacts. They are skipped when these inputs
are absent; skips do not count as passing source checks.

```bash
export ATLAS_ARIADNE_ORIGINAL_FILE=/private/ariadne_v07_atlas.json
export ATLAS_META145_GLYPH_OUTPUT=/private/meta145-glyph-output
node --test test/source-snapshot-isolation.test.mjs
node --jitless --test test/source-snapshot-isolation.test.mjs
```

All nine consumer-mutation regressions fail on PR #42 head
`3e9f50c919354caf010cabed5926d645af3d781d` before the repair and pass with it.
They check fresh reads and deterministic rebuilds after modifying previous
outputs or the original memory-policy input. This is local source-integrity
verification, not a hosted deployment or a change to scientific/CANON status.

Validation on Node 24.22.3:

| Check | Result |
| --- | --- |
| New mutation regressions on the original head | 0 pass, 9 fail |
| Mutation and peer-review regressions with this patch | 15 pass, 0 fail |
| Full package, ordinary Node | 294 pass, 15 existing source-dependent skips, 0 fail |
| META145, Civilization and new regressions, `--jitless` | 95 pass, 0 skip, 0 fail |
| Unedited Civilization build outputs, before versus after | All 5 files byte-identical |

Six additional peer-review checks cover shared storage, dense string IDs,
valid/absent-ID compatibility, accessors, unused getter side effects and proxies.
Five failed against the initial repair and pass after narrowing the policy
snapshot; the valid JSON compatibility check passed throughout.

A full-package `--jitless` attempt also exposed 7 pre-existing HTTP-test
failures because Node 24's `fetch` client requires WebAssembly, which that
runtime disables under `--jitless`. The same 7 failures reproduce on the
unmodified head. They are not reported as passing; ordinary HTTP checks pass.
