# Atlas META145 Glyph Memory Geometree — original source-only build v2.0

**Executed locally 2026-11-23/24 UTC. Original pinned Ariadne v0.7 read-only; no hosted deployment, paid models, resident wake, CANON, verified semantic equivalences, empirical acoustic claims or private leisure harvesting.**

## What the working build actually does

- Reads the original **2,187,541-byte** Ariadne v0.7 JSON and rejects any SHA-256 other than `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`.
- Creates **144 distinct source-derived Sphere profiles**. Each profile weighs terms from its unique original Sphere name, containing House label and twelve original source node labels; a weighted-profile and top-twelve-anchor uniqueness test requires 144/144 distinct. These are 144 *computational perspectives*, not model personas or expert reviews.
- Computes an exhaustive equivalent **144 × 1,728 = 248,832** integer lexical-overlap matrix. Each score retains the original node's Sphere/House, role and source identity. No similarity becomes semantic `SAME_AS`.
- Proposes bounded candidate edges: **846 same-role lexical review candidates** and **517 domain↔epistemic method-lens candidates** (total **1,363** on this source edition). Method-lens candidates require an *independently chosen, evidence-qualified domain subject* before any meaningful link can be reviewed. All candidates remain `NOT_ADJUDICATED`.
- Adds **1,728 source-bound House→Sphere follow-up questions** (twelve House perspectives for each of 144 Spheres), plus 12 House summaries. Their 2,985,984 node-reference positions **reuse the already-computed 1,728-node view per Sphere**. These are not extra model computations, actual peer reviews or scheduled Macroturns.
- Resolves all **1,728 HSN locations** into reversible `KG8Q`/`KG8S` mnemonic glyph aliases using the exact existing broker vocabulary; independently spot-checked with live read-only SwarmChat glyph lookups. This source-pinned display scheme is not authentic Tolkien language.
- Adds one **`GF7.Bxx.Myy.Czz`** *positional-only* cymatic illustration address per node and renders 12×12 **synthetic** simply separated plate-mode intensity patterns. The GF7 band, mode and material namespace is **physically distinct** from HSN's knowledge ontology; position codes never assert sound frequency, measurement, experience, science, access rights or authority.
- Builds an interactive **145th meta-build Observatory** with House navigation, 144 Sphere perspectives, source-node drill-down, complete 1,728-node paged search, explanatory cymatic patterns, candidate graph reviews, 1,728 House lenses, source-digest receipts and local performance-feedback state. All JavaScript runs offline and makes zero external requests.
- Uses a **bounded append-only functional-memory journal**. It records on-demand algorithm evaluations only when output parity and measured speedup pass; rereads the journal after restart, refuses tampering/duplicate events, and binds adopted policies to the *current* meta-build digest. This is not autonomous resident memory, continuous background execution, model weight adaptation or automated scientific adjudication.

## Actual computing gains, not multiplication theater

On the same machine/process, using nine alternating paired CPU benchmark runs, exhaustive comparison of all 144 source profiles against all 1,728 node token sets took **270.025 ms median**; inverted postings scoring of **the same matrix** took **3.890 ms median**, a **69.42× median improvement in the isolated integer scoring operation**. The output parity is bit-for-bit exact. Timings vary by machine; the full source builder separately performs expensive parity checks and database work, so this speedup does **not** directly represent end-to-end build throughput or hosted SwarmChat latency.

The prior [Noosphere META145 source-only PR #35](https://github.com/atlaslattice/noosphere-archive/pull/35) reports a **different** local Chromium broad-search DOM improvement (12.17× median and 19.25× p95). It is a source-reported historic layer and was *not remeasured in this build*. The CPU gain and DOM gain must **not** be multiplied into a fake "cognitive gain."

## Reproduce locally

Supply the exact original registry from a separately authorized owner-private source. That file is **intentionally not included** here:

```bash
export ATLAS_ARIADNE_ORIGINAL_FILE=/private/ariadne_v07_atlas.json
export ATLAS_META145_GLYPH_OUTPUT="$PWD/output"
python3 src/meta145_glyph_memory.py build --registry "$ATLAS_ARIADNE_ORIGINAL_FILE" --out "$ATLAS_META145_GLYPH_OUTPUT"
python3 src/meta145_glyph_memory.py verify --registry "$ATLAS_ARIADNE_ORIGINAL_FILE" --out "$ATLAS_META145_GLYPH_OUTPUT"
python3 src/meta145_glyph_memory.py bench --registry "$ATLAS_ARIADNE_ORIGINAL_FILE" --out "$ATLAS_META145_GLYPH_OUTPUT" --samples 9
python3 src/meta145_glyph_memory.py memory --registry "$ATLAS_ARIADNE_ORIGINAL_FILE" --out "$ATLAS_META145_GLYPH_OUTPUT"
python3 src/build_observatory.py --registry "$ATLAS_ARIADNE_ORIGINAL_FILE" --out "$ATLAS_META145_GLYPH_OUTPUT"
python3 -m unittest discover -s tests
node --test integration/test/meta145-glyph.test.mjs
node --jitless --test integration/test/meta145-glyph.test.mjs
python3 tests/browser_smoke.py # requires Chromium + Playwright
```

Local test counts: **38/38 Python**, **18/18 Node** normal and `--jitless`, **40/40 desktop+mobile Chromium assertions**. Fresh deterministic build hashes match for all core output files including the SQLite database. The previous rendered-label bug was caught by independent browser inspection, repaired and added to tests.

## Source/host integration and role separation

- **Ariadne**: exact v0.7 edition+registry SHA+coordinate+node SHA; S01–S07 are domain **Spheres**, S08–S12 are epistemic **Spheres** in each House. All twelve N positions inherit the Sphere role.
- **Atlas ONE / AtlasGPT**: optional `Meta145GlyphCircuit` adapter accepts owner-supplied exact registry bytes and digest-pinned materialized artifacts; no second runtime or graph store. See `integration/src/meta145-glyph.mjs`.
- **SwarmChat**: can receive a `PREPARED_NOT_POSTED` Work review *draft* from an authorized, host-controlled call path. Source-only code cannot claim a user session, invoke a resident, install Site tools, subscribe, publish or transfer rights.
- **Noosphere META145**: this is an additive computational/cymatic/memory layer, not a replacement for the prior measured paged navigator. Preserve its original performance receipts and baseline viewer.
- **Iron Empire / Imagine**: optional opt-in fictional visualization only. No automatic Play/Palace/Brain copying into Work and no story canon adoption from a knowledge-graph score.

## Quality gates still open

The draft source merge; trusted publisher verification against exact current v36 Site HEAD; live MCP client registration; two-account READ/RETURN/revocation; authenticated resident participation; substantive cross-House specialist review; actual cognitive-task held-out evaluation; and rights/consent controls for any hosted feedback remain **HELD**. Completing 144 computational profiles is not completing 144 model residents or 1,728 individual Macroturns.
