# Atlas Work Learning

A private, reproducible learning workspace for an owner's body of work. It combines the **original Ariadne 12 Houses / 144 Spheres / 1,728 Nodes**, source-linked corpus records, productive-work evidence, a trainable addressed graph, and OpenAI function tools. A local MCP adapter and optional Atlas Graph Fabric / Meta145 adapters use the same read boundary.

Version **0.1.0** delivers a functioning local system and a reusable personal skill. The numerical model is an experimental retrieval encoder. Software integration, actual parameter learning, source fidelity and semantic retrieval quality are separate claims with separate receipts.

## What is implemented

| Layer | Implemented behavior |
|---|---|
| Original ontology | Exact-byte SHA-256 verification; all 1,728 addresses, definitions, includes/excludes, parents and role fields retained |
| Work corpus | JSON/JSONL admission, source/version/text pins, exact-text deduplication with aliases, transitive family splits, explicit holds and partial coverage |
| Productive work | Owner-bound SQLite event chain for attempted output, correction, artifact, test/evidence receipts, reviewer claim and eligibility |
| Neural core | Shared learned text projection, 1,728 trainable address vectors, 144 learned Sphere gates, 12 learned House gates, query-conditioned graph attention |
| Training | Finite NumPy optimizer, definition anchors, source-linked correction pairs, deterministic seeds, validation-only checkpoint selection, explicit continuation |
| Evaluation | Matched flat control, TF-IDF and BM25, frozen source-family test split, exact fragment leakage exclusion and retained failure/regression evidence |
| OpenAI interface | Five strict Responses function tools and an optional injected-client tool loop; no provider calls by default |
| Local MCP | `initialize`, `ping`, `tools/list`, `tools/call`; bounded stdio transport to a fixed Python workspace |
| Atlas integrations | Existing Graph Fabric selected-source composition, Meta145 evidence proposals/context, shared consumers for Atlas Intelligence, AtlasGPT and SwarmChat |
| Reproduction | Private immutable inputs, checkpoint manifests, protocol/run receipts, code pins and an installed skill snapshot |

This package does not alter OpenAI model weights, register a remote MCP server, publish a site, or grant identity from a coordinate. E145/Meta145 can consume evidence through their existing host boundary; this package does not claim to replace their operational authority.

## Original identities

Production loading accepts the original Ariadne v0.7 registry:

```text
07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6
```

Addresses remain `H01.S01.N01` through `H12.S12.N12`. The role division is on the Sphere axis: S01–S07 are `DOMAIN_SPECIALIZATION`; S08–S12 are `EPISTEMIC_META`. This preserves 1,008 DOMAIN and 720 METHOD nodes.

The learned vectors are state attached to those addresses. They do not replace original definitions or establish accepted semantic mappings. Candidate HSN assignments remain candidates and never become supervised labels merely because they occur in an imported record. GlyphForge's 12³ numeric wave space remains a separate coordinate system; the graph does not identify its voxels with Ariadne semantics.

## Runtime

Python 3.10+ with NumPy and SciPy, and Node.js 20+ for JavaScript adapters. The verified run used CPython 3.12.14, NumPy 2.3.5, SciPy 1.17.0, float64 and one numerical thread. No OpenAI SDK, PyTorch or npm dependency is required for local operation. An existing OpenAI client can be injected when a host explicitly enables provider use.

Use the installed skill's wrapper, or run the source package without installing it:

```bash
export PYTHONPATH="/absolute/path/to/packages/atlas-work-learning/python"
python -m atlas_work_learning --help
```

The module entrypoint sets a process-local thread bound before NumPy import. `ATLAS_WORK_LEARNING_THREADS` accepts 1–8; the default is 1. Matching seeds alone do not establish bitwise replay across different numerical environments.

## Create a workspace

The workspace is separate from source control. It contains private source snapshots, a ledger, learned weights and reports. Its configuration uses relative paths, so the directory can be restored elsewhere intact.

```bash
python -m atlas_work_learning init \
  --workspace /private/atlas-work \
  --registry /private/original-ariadne-v07.json \
  --owner owner-local

python -m atlas_work_learning ingest \
  --workspace /private/atlas-work \
  --input /private/authorized-work.jsonl \
  --input-sha256 EXACT_INPUT_SHA256

python -m atlas_work_learning verify --workspace /private/atlas-work
```

An already canonical corpus can be passed to `init --corpus ... --corpus-sha256 ...` or attached with `ingest --canonical`. `prepare-r08` replays the existing selected R05/R08 Work snapshot and verifies its original occurrence spans; it does not open a larger sealed archive.

The owner is a trusted local process binding. It is not an authentication system for a public or shared host. A host adapter must supply its own current identity and access decisions.

## Corpus contract

Each imported record has:

| Field | Meaning |
|---|---|
| `id` | Stable excerpt/item identity |
| `source_id`, `source_version`, `source_uri` | Exact source identity, edition and retrieval location |
| `source_sha256` | Hash of the complete source snapshot referenced by the record |
| `text`, `text_sha256` | Exact excerpt and SHA-256 of its UTF-8 bytes |
| `title`, `family_id` | Human label and declared lineage group |
| `scope` | Must be `WORK` |
| `author_kind` | `human`, `model`, `mixed`, `unknown` or `synthetic`; do not infer human authorship |
| `evidence_status` | What was actually verified, independent of whether the text is true |
| `hsn_candidates` | Optional proposed addresses with retained status; never accepted training labels |
| `aliases` | Optional exact-text source/version references retained after deduplication |
| `related_family_ids` | Optional known relationships between versions, branches or derived work |

Admission checks hashes and required metadata, joins known source IDs, full-source hashes, exact text and declared family relationships, then assigns each connected family wholly to train, validation or test. Held records still contribute known lineage connections. Revoked, non-Work, incomplete-context and invalid records are retained as hold receipts rather than silently promoted.

An imported digest verifies the submitted snapshot; it is not fresh provider authentication or proof that every paraphrase belongs to the correct lineage. Connector adapters must record current source rights and editions where required. The initial experiment uses a previously verified owner-local Work subset, not a newly reauthenticated entire archive.

## Train and evaluate

```bash
python -m atlas_work_learning train \
  --workspace /private/atlas-work \
  --updates 180 \
  --evaluate

python -m atlas_work_learning evaluation --workspace /private/atlas-work
```

Each training call runs the addressed graph and a matched flat model with the same corpus, seed, budget and correction episodes. The default model has 47,796 parameters: 6,144 projection weights, 24 biases, 41,472 node-vector values, 144 Sphere gates and 12 House gates. The flat control retains the addressed bank but disables the 156 hierarchy gates.

Training pairs use non-overlapping prefix/remainder views of an excerpt. Very short records are omitted. Every cross-split repeated normalized fragment is excluded before fitting, with IDs and reasons recorded. Source-derived fragment targets are self-supervised diagnostics; they are not independent relevance judgments or evidence that a node's meaning has been learned correctly.

The optimizer performs at most 180 updates per call. Batches select independent source families. Definition anchors cycle over all original addresses, and eligible correction episodes enter the contrastive objective. The fixed validation panel contains up to 64 hash-selected queries against the whole validation candidate set. Selection maximizes nDCG@10 and keeps the earliest checkpoint on a tie, including step zero when training fails to improve it.

`evaluate` scores the selected checkpoints on the held-out test after selection. It retains the initial graph, selected graph, selected flat, TF-IDF and actual-serving BM25 comparisons. Calling it again returns the saved report instead of rerunning the test. Later runs report previous package test exposures. A reused panel is not a fresh independent test.

Continue the same pinned corpus edition explicitly:

```bash
python -m atlas_work_learning train \
  --workspace /private/atlas-work \
  --updates 24 \
  --continue-previous
```

Continuation validates parent configuration, registry, corpus and evidence eligibility, preserves parent hashes, and resets Adam moments for a new finite run. It is not an exact optimizer-resume claim. A changed corpus needs a new replay/migration decision; the package does not silently substitute source pins under an old checkpoint.

## Record productive work

`record --input episode.json` appends a real work episode; it does not rewrite history. Required fields include `id`, `task_id`, `family_id`, `split`, `scope`, source and corpus-item references, input, attempted output, author kind, feedback kind, evidence status and explicit `training_eligible`.

A trainable correction additionally requires a corrected output, reviewer identity claim, exact verification receipts, a known Work training-family binding, and a verified/reviewed status. An automated test harness can verify code behavior; it must not be presented as human approval. Preference feedback, software tests, source-supported corrections and independent evidence remain distinct. Mere model repetition does not make an output verified.

```bash
python -m atlas_work_learning record --workspace /private/atlas-work --input /private/episode.json
python -m atlas_work_learning episodes --workspace /private/atlas-work --limit 10
python -m atlas_work_learning episode-status --workspace /private/atlas-work \
  --id EPISODE_ID --status HELD --reason "Evidence needs review"
python -m atlas_work_learning revoke-source --workspace /private/atlas-work \
  --source-id SOURCE_ID --reason "Source withdrawn"
```

The ledger is append-only at the application/SQLite layer, with a verified hash chain. It is not an externally witnessed immutable log. Source revocation withholds every matching source/alias from retrieval. Withdrawal of a contributing correction disables learned inference until an eligible replay is available. This is withholding, not machine unlearning. Neural continuation refuses withdrawn parent evidence. Owner-local audit metadata remains available.

## Read and choose retrieval

```bash
python -m atlas_work_learning status --workspace /private/atlas-work
python -m atlas_work_learning search --workspace /private/atlas-work "source-linked ontology"
python -m atlas_work_learning search --workspace /private/atlas-work \
  --target nodes "evidence provenance and correction"
python -m atlas_work_learning node --workspace /private/atlas-work H01.S08.N01
```

**Corpus and node retrieval use the learned network as the primary path.** Lexical retrieval is a backup when the neural state is unavailable or withheld. Every search result reports `primaryMethod`, the actual `method`, `fallbackUsed` and its reason. A weak benchmark score does not silently switch the architecture to lexical. Source/policy failures still withhold the entire response; fallback never bypasses them.

Explicit owner-local method selection remains available for diagnostics or recovery:

```bash
python -m atlas_work_learning retrieval --workspace /private/atlas-work --method neural
python -m atlas_work_learning retrieval --workspace /private/atlas-work --method hybrid
python -m atlas_work_learning retrieval --workspace /private/atlas-work --method lexical
```

These are selectable methods, not a claim that an unmeasured hybrid is superior. Search preserves source edition, full-source hash, item-text hash, excerpt hash, candidate status and checkpoint identity. A node lookup returns the original record separately from its learned representation. Empty/invalid requests do not invent evidence.

## OpenAI Responses and local MCP

`src/openai.mjs` exports strict function definitions and an injected-client tool loop. `src/gateway.mjs` binds the trusted owner, workspace, source manifest and code/input/checkpoint pins. It checks permission at READ and RETURN, preserving tool call IDs and Responses context items. Disabled provider execution makes no API calls.

The five read tools are `status`, `search`, `node`, `episodes`, and `evaluation` with the package's exported tool names. Tool arguments cannot choose a filesystem path, identity, source pin, training budget or write action. The Python subprocess has a fixed startup workspace, bounded queue, deadlines, bounded line/output sizes and no shell invocation.

```bash
python -m atlas_work_learning export-server \
  --workspace /private/atlas-work \
  --output /private/atlas-work-mcp.json

node /absolute/path/to/packages/atlas-work-learning/src/mcp-stdio.mjs \
  --config /private/atlas-work-mcp.json
```

Regenerate the server configuration after an intentional workspace or code revision. Pin drift withholds reads. Starting this local server does not register it with ChatGPT or deploy an internet endpoint. The installed personal skill can directly use the local runtime in the workspace without pretending that remote server registration occurred.

Optional adapters accept existing host functions instead of replacing their authority:

- `composeAtlasGraphFabric` composes source-qualified retrieval candidates through the actual selected-source composer, retaining exact edition/digest/URI bindings.
- `toMeta145Evidence` emits unreviewed HSN proposals and saved measurement references. An API read never counts as completed work or a training update.
- `attachMeta145Context` verifies the original registry digest and resolves the host's native contexts.
- `createAtlasConsumers` gives Atlas Intelligence, AtlasGPT and SwarmChat the same read gateway.
- `createProviderPlugin` requires an explicit host enable flag and implementation; it performs no automatic provider discovery or calls.

## Verification and preservation

```bash
ATLAS_TEST_REGISTRY=/private/original-ariadne-v07.json \
OPENBLAS_NUM_THREADS=1 \
python -m unittest discover -s /absolute/path/to/packages/atlas-work-learning/tests -v

node --test /absolute/path/to/packages/atlas-work-learning/test/*.test.mjs
```

Tests cover scalar finite-difference gradients, deterministic replay, matched controls, correction effects, source/version/split drift, immutable configuration, input-replacement races, read-only ledgers, revocation, path containment, return-time evidence changes, strict JSON, bounded transports, OpenAI round trips and local MCP processes. Tests requiring the host Graph Fabric or original private registry state their prerequisites; portable fixtures remain usable after relocation.

Keep the entire private workspace together when archiving. Preserve original input snapshots, `config-history`, evidence, selected and final checkpoints, protocols, reports and test/replay receipts. Private snapshots and weights must not be added to source control or the skill. The skill carries reusable runtime code and restore/source references only.

## Compare saved observations without rescoring the test

The owner-local `compare` command reuses the existing frozen fragment protocol,
saved ranks, selected checkpoints and corpus bindings. It performs no model
inference, optimizer update, new quality evaluation, checkpoint selection or
serving-policy change. It verifies the current workspace pins before and after
the read and checks the saved evaluation against reconstructed source-family
bindings. The original evaluation and its test-exposure history remain intact.

```bash
PYTHONPATH=/absolute/path/to/packages/atlas-work-learning/python \
python -m atlas_work_learning compare \
  --workspace /private/atlas-work \
  --baseline flat --candidate graph --split test \
  --expected-config-sha256 EXACT_CURRENT_CONFIG_SHA256 \
  --output /private/new-saved-comparison.json
```

The output must be a new file. Omit `--output` to write JSON to standard output.
Lexical diagnostic comparisons require explicit `--allow-lexical-control`; this
never changes the owner's neural-primary serving choice. The public Responses
and MCP surfaces remain read-only and do not acquire a new command implicitly.

The report separates ordered-protocol compatibility, descriptive retrieval
differences, resource observations, and unestablished claims. It preserves
query-micro and equal-declared-family macro metrics, family sizes, adverse rank
changes, and missing resource evidence as `UNKNOWN`. Stored parameter equality
does not imply equal active parameters or computation. Equal optimizer updates
do not establish equal work, latency, or memory.

Checkpoint identity includes the selected manifest, weights, configuration,
registry, corpus and inspected source code. A parameter-array hash alone is not
a complete model identity. These local checks do not authenticate historical
execution or current remote source rights. Source-family labels remain declared
lineage, not independently verified origins. This command never promotes a
hierarchy claim, accepted HSN label, new training example, or deployment.

The binder currently understands the existing self-supervised fragment task.
MICA's separately pinned 24-question BGE ontology panel and other candidate
universes require their own exact protocol adapter and source bindings; their
scores cannot be inserted into this task's leaderboard. A once-consumed final
panel stays consumed. Reaggregating existing ranks is not a new test.

## Historical first-run measurements

The separately saved release report contains exact pins and receipts. Its first matched experiment admitted 3,252 source-linked Work excerpts, derived 2,079 training / 169 validation / 548 test fragment pairs, and used one real software-test correction. Both models performed 180 updates and selected step 90 using validation only.

| Frozen test method | nDCG@10 | Hit@10 |
|---|---:|---:|
| Initial graph | 0.022733 | 0.047445 |
| Trained addressed graph | 0.030229 | 0.065693 |
| Trained flat control | 0.029173 | 0.062044 |
| TF-IDF | 0.150775 | 0.253650 |
| BM25 | 0.159683 | 0.270073 |

The learned graph improved on initialization in this diagnostic, but lexical retrieval remained substantially stronger. The small graph/flat difference does not establish a hierarchy or learning-speed advantage. The owner chose neural-primary operation with lexical backup; these measurements define work to improve the neural system. The first saved evaluation retains the earlier serving decision as historical evidence, while current configuration and read results expose the active neural policy. A full 180-update graph replay reproduced the initial, selected and final state hashes, all loss/gradient records, protocol and selection exactly in the recorded environment, without rescoring the test.
