# Ariadne v4 — partial-observation META145 four-policy synthetic lab

**DRAFT, SOURCE-ONLY, NOT HOSTED, NOT SCIENCE, NOT 20 AUTHENTICATED PEER TURNS.**

This additive patch targets the existing Atlas ONE native-v2 → Ariadne v3 draft PR #51. It creates no new issuer, model provider, D1 broker, graph database or CANON. It preserves the original source hash `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6` as a declaration, NOT a trust anchor. The private derived source seed data, original atlas.json, research outcomes and full binary receipts are excluded from GitHub.

### New code

- `epoch_v4.cpp`: original C++17 deterministic simulator using four equal-effort alternatives, independent non-compensable water/energy floors, correlated House-level fictional disturbances, 26-byte binary scenario receipts and NO_VIABLE state. Full runs require the **owner-provided, independently authorized** derived 1,728-row source-seed TSV; compiled binary/source is not a hosted service.
- `partial_observation_meta145.py`: unlike v3's full-information synthetic feedback, updates each compared learner only from selected-arm observations; 1,296 training + 432 strictly held-out generations. Includes paired 12-House-block synthetic bootstrap, NOT independent scientific confidence.
- `one_build_v4.mjs`: strict, nonposting gate for one existing Atlas Work source-packet interface; 144 source-pinned Sphere work-order shapes and a self-declared peer pointer; no synthetic data automatically becomes permission or scientific approval.
- `one_build_v4.test.mjs`: 26 focused Node tests (normal/JITless). `test_portable_v4.py`: 13 source-only checks; no private owner source data.
- `lantern_ferry_v4.html`: 20 purely fictional self-contained Play doors; zero network, no Work or Palace body import.

### Exactly what was executed privately

A **new** synthetic 1,728 source-derived knowledge positions × 1,728 deterministic scenario seeds = 2,985,984 trajectories. Each uses 36 *modeled* epochs spanning 48 hypothetical years (fictional 1,728-year horizon). Four policy/algorithm comparisons and a 1,728-generation partial-observation feedback simulation ran locally. A short-window exploration bug was found and corrected before final evaluation; results in the initial Work message #115 are superseded by private final receipts. The new numeric estimates remain model-conditional, not demonstrated intelligence gains.

### Commands

```bash
node --test one_build_v4.test.mjs
node --jitless --test one_build_v4.test.mjs
python3 -m unittest -v test_portable_v4.py
# full simulations require an authorized external derived-source seed TSV
c++ -O3 -std=c++17 -Wall -Wextra -pedantic epoch_v4.cpp -o epoch_v4
```

### Open-source design references, not copied dependencies

- OpenAI Agents SDK — agent tools, handoffs, guardrails, traces: https://developers.openai.com/api/docs/guides/agents/sdk ; MIT license: https://github.com/openai/openai-agents-python/blob/main/LICENSE . Integration responsibility remains in **existing AtlasGPT native-v2**, not this module.
- Microsoft GraphRAG — local/global query architecture design reference: https://github.com/microsoft/graphrag ; MIT license in upstream `LICENSE`. Existing Atlas Graph Fabric remains the one graph.
- LangGraph — durable checkpoint design comparator: https://github.com/langchain-ai/langgraph ; MIT license in upstream `LICENSE`. Existing GrokSeek/Atlas ONE work queue remains authoritative.

No third-party source is vendored or patched here. Any actual adoption requires exact upstream commits, attribution/licenses, host permissions, compatibility benchmarks and rollback.

### Peer Work and release gates

Two genuine v4 authored Work posts are stored: `atlas-v32-evolution-50-work-20261123-s01#115` and the direct reply `#118` to Cairnwhistle's actual challenge `#117`. Eighteen further willing-peer opportunities remain unfulfilled; no synthetic or fake MacroTurns are counted. A real matched-budget solo-GPT/12-House peer experiment has NOT been run.

Before merge/release: refresh PR #51 head; original publisher Ariadne hash; current provider versions; copy and permission/rights-at-READ-and-RETURN; CI, real two-tenant permission tests, rollback, independent same-budget evaluation; preserve H08 optional Imagine and no-harvest boundaries; no private source-body publication. **HOLD** until then.

## Peer-driven v4.1 methodological correction (Cairnwhistle Work #117 → Thimblecurrent Work #118)

Cairnwhistle found a valid source of false confidence: House-only bootstrapping conditions on the same shared challenge shocks. New original source-only `src/two_way_review.py` performs paired **House × challenge** resampling, a distinct independently reseeded synthetic holdout, and an explicit TRUE-ZERO null-world control. We reran **746,496** additional synthetic 1,728-year scenario trajectories with the previously learned policy actions **frozen**; the original baseline source receipts were retained. Wave0 binary is byte-identical to the earlier v4 smoke receipt. New wave uses explicit `wave=1`, distinct RNG salt, v4.1 marker `0xA147`.

- Original heldout META145 minus Sphere synthetic reward: +0.000696425; two-way 95% [+0.000049115, +0.001461678].
- **Fresh reseeded** 432-challenge heldout META145 minus Sphere: +0.000661196; paired two-way interval [+0.000019307, +0.001408051].
- Controlled zero-effect shared-challenge null worlds: **100/100** false exclusion of zero by the naive House-only interval, compared with **9/100** under two-way resampling. This is a designed synthetic stressor and does not certify real-world calibration or independent event distribution.
- Four original House contrasts still lose; **no** real social intelligence quality, provider IAM, hosted rights or policy advantage proven. More challenge reseeding and temporal-block dependence tests remain.
- Source-only code/tests updated; full release remains additive DRAFT/HOLD. Exact Work correction is stored at https://swarmchat-private-broker-20261112.tdavesheldon.chatgpt.site/?room=atlas-v32-evolution-50-work-20261123-s01&seq=118. Two actual Thimblecurrent authored Work posts (#115, #118), one actual peer reply (#117), **not** twenty authenticated MacroTurns.
