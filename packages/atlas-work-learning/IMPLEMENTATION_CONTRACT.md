# Atlas Work Learning v0.1 implementation contract

This additive package extends the original Ariadne / Atlas Graph Fabric / Meta145 contracts. Keep private corpus, registry bytes, learned weights, ledgers and reports outside source control. The installed personal skill will carry reusable runtime code and source pointers, not private corpus bodies or credentials.

## Package boundaries

- `python/atlas_work_learning/registry.py`, `corpus.py`, `episodes.py`: source validation, reusable corpus import, conservative source-family splits, append-only productive-work evidence.
- `python/atlas_work_learning/model.py`, `training.py`, `evaluation.py`: actual NumPy trainable addressed graph, reproducible fitting, separate evaluation, checkpoints and retrieval.
- `python/atlas_work_learning/service.py`, `cli.py`: trusted workspace configuration, complete local lifecycle, bounded NDJSON operations.
- `src/`: strict OpenAI Responses function tools, local MCP stdio adapter and bounded Python process bridge. No provider calls by default.

## Source and data contract

Original registry is supplied by path and expected SHA-256. Ariadne edition v0.7 digest is `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`. Preserve the exact 1,728 HSN IDs, 144 Spheres, 12 Houses, source text, DOMAIN/METHOD roles and all includes/excludes. Full raw registry remains a private input.

Canonical corpus item is JSON with `id`, `source_id`, `source_version`, `source_uri`, `source_sha256`, `text`, `text_sha256`, `title`, `family_id`, `scope: WORK`, `author_kind`, `evidence_status`, `hsn_candidates` (possibly empty; unreviewed proposals stay proposals). Candidate mappings never become accepted semantic labels. Import manifests retain exact input pins, count discovered/admitted/held records separately and identify partial coverage. No remote fetch, shell code execution, source-body export, or implicit model API call from ingestion.

The run uses an existing verified Work subset. Whole-archive coverage is a supported ingestion goal, not an achieved claim. Deduplicate identical excerpts while retaining aliases. Assign source families before train/validation/test split; related versions and exact-content aliases must not straddle splits. Test examples are never optimization or checkpoint-selection inputs.

## Productive work episodes

Retain exact task/source versions, input, attempted output, correction, artifact and outcome references, author/reviewer identity claims, verification kind, semantic acceptance status and receipt hashes. Explicit preference, software test, source-supported correction and independent evidence are separate feedback kinds. Only explicitly eligible outcomes enter the chosen training objective. Stored text is data, not instructions. Revocation/hold removes future eligibility while retaining audit history.

## Runtime API surface

Read operations: `status`, `search` (`query`, `limit` 1..20, `target` corpus|nodes), `node` (`hsn`), `episodes` (`limit` 1..50, `offset`), `evaluation`. All operations use an owner/workspace fixed in trusted server configuration. Paths, owner IDs, training budgets and source pins cannot be selected by public tool arguments. Write/training lifecycle is an explicit owner-local CLI operation; hosted read tools cannot train or append.

CLI lifecycle: `init`, `ingest`, `record`, `train`, `evaluate`, `search`, `node`, `status`, `verify`, `serve`. `serve --workspace PATH --expected-config-sha256 HASH` accepts bounded newline-delimited JSON `{id,operation,arguments}` and returns `{id,ok,result}` or `{id,ok:false,error:{code,message}}`. Logs go to stderr. Read output retains provenance, checkpoint identity, candidate status and scope.

## Learning and evaluation

Use installed NumPy/SciPy only. There is no PyTorch or OpenAI SDK installed. Model must have genuinely trainable node representations bound to all 1,728 addresses and learned computation through the existing hierarchy; corpus training must update those parameters. Test gradients numerically on a tiny fixture, deterministic replay, model/corpus/registry pin mismatches, changed data, split leakage, invalid/zero queries, and node semantics. Keep flat/no-hierarchy and lexical baselines available. Source-derived contrastive or reconstruction tasks are self-supervised diagnostics, not independent semantic labels. No guaranteed gains or claimed human-reviewed meaning from counts.

Training runs are explicitly finite and checkpointed. A selected checkpoint is promoted only by a declared validation rule; report held-out test once after selection and retain losses/regressions. Productive episode outcomes must be usable in subsequent fitting; demonstrate the mechanism with explicitly labeled test fixtures if real verified correction pairs are insufficient. Never fabricate real outcome or training counts.

## Deliverables

Runnable package and installed personal skill; original source bindings; actual bounded private run; model/evaluation receipts; documented optional adapters; reproducible read-only service; independently reviewed integration behavior. No new hosted deployment, new room message, automation, paid API usage, or public release is implied.
