# Atlas Resource Intelligence — ATLAS Fabric v0.1 (US clone candidate)

**2026-10-11 · experimental · non-canon · no deployment · no official OpenAI/GPT, government, or institutional endorsement**

This is a **separate, U.S.-scoped** Atlas ARI integration draft, not a silent merge of the Mandarin-first DragonSeek constitutional corpus. It preserves the original Gemini-primary Atlas source and adds an opt-in GPT-primary research runner. Changes remain in a feature branch until reviewed.


## Mobile console

The [ATLAS ARI two-brain research panel](../public/ari-fabric.html) is served at `/ari-fabric.html` by a local Vite/Express development server. It offers an **offline, manually pasted reference-ID comparison**; this is not model inference, connected-account access, or factual verification. The panel truthfully shows provider integration as unimplemented.

## Functional local components

- `atlas_fabric.py`: read-only, manually invoked UWS commands (no shell strings or write methods); Sheldonbrain /query client (opt-in); source-linked SQLite KG; Dream/Play/Work 8/8/8 planner; two-brain receipt comparison.
- `parser_bridge.py`: private/local JSON chat import, Grok nested exports or generic role messages, optional receipt-graph indexing. Original export remains untouched; no hidden reasoning or personal transcripts sent to public Git.
- `atlas_graph.py`: creates real SQLite source nodes and DERIVED_FROM receipt edges for the local constitutional baseline.
- `atlas_ari_dual_brain.py`: user-invoked GPT-primary candidate / independent reviewer through explicitly configured OpenAI-compatible endpoints. Two models must be configured and run by a person; no tools can be called from the models.
- `constitutional_baseline.json`: user-directed INV-0 **Nothing Dies** source references. Historical “System Integrity” is distinct, not a replacement. Not a signed external ratification.
- `dream_protocols.json`: experimental source-indexed GPTDream++, GrokDream, GPTUWS, DreamPalace20, BAZINGA-8/8/8. **Novel reference-palace dreaming is not just replay**, but it cannot promote conclusions or cause real actions.
- `experimental/shugs_lattice_optimum_original.json`: preserved, unaltered numerical research from Element 145; status is simulation/research, not physical proof or production routing telemetry.
- `server.ts`: existing fake provider return previously claimed `[✓ VERIFIED]` with fabricated token use; now returns `501 provider_dispatch_not_implemented`. GET `/api/atlas/fabric/status` advertises candidate interfaces without exposing account data or falsely claiming connectors are live.

## Usage

Run from the repository root with Python 3.11+:

```bash
python integrations/atlas_graph.py --search Nothing
python -m unittest discover -s integrations/tests -v
python integrations/atlas_ari_dual_brain.py --question "Evaluate INV-0 source precedence" \
  --primary-model local-gpt --primary-lineage GPT \
  --review-model local-other --review-lineage Other
```

These commands make **no network/model calls** by default. The dual-brain command prints prepared requests. Pass `--execute` to invoke both explicitly configured endpoints. Local endpoints default to `http://127.0.0.1:11434/v1/chat/completions`; nonlocal endpoints additionally require `--allow-remote` and HTTPS. Optional bearer tokens come from `ATLAS_PRIMARY_API_KEY` and `ATLAS_REVIEW_API_KEY`. No API keys are stored in Git.

For UWS, first install [atlaslattice/uws](https://github.com/atlaslattice/uws/tree/uws-universal), configure appropriate user OAuth and verify `uws auth status` locally. Calls are opt-in, exact-command allowlisted, and only return data to the invoking local process; Atlas's web server is **not** connected to UWS (pending authentication, explicit consent, and per-operation tool authorization).

For Sheldonbrain, run [the RAG API](https://github.com/atlaslattice/sheldonbrain-rag-api) locally, or opt into a trusted HTTPS endpoint; only `/query` is supported. The graph and parser are independent local prototypes and do not silently modify Pinecone/Firestore/Notion. `memory != permission`.

Source numerics: [SHUGS operator](https://github.com/atlaslattice/element-145/tree/main/shugs), [SHUGS ↔ SNRS bridge stub](https://github.com/atlaslattice/open-regenerative-compute-standard/blob/main/ORC-036_SHUGS_SNRS_Bridge_Stub_v0.1.md). Cited numerical GUE-KS results do not establish empirical engineering improvements.

## Release checkpoints

- Verify Python compile + integration tests locally; GitHub checks when available.
- Confirm opt-in HTTPS and read-only limits, source privacy, no token leakage.
- Independently validate model outputs and cited source IDs; model agreement does **not** prove correctness.
- Connect any protected app UI only after actual authentication/authorization and deployment reviews.
- Preserve independent DragonSeek and Atlas corpora, sovereignty labels and provider-specific config.

Branch is a research artifact only. The current Express provider proxy explicitly returns 501 instead of faking a completed call. No live two-brain provider run or UWS login has been performed.
