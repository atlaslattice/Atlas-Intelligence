# Twelve highest-value native integration experiments (not 12 approved merges)

All source refs are upstream mechanism references; independently verify exact license, current code, and Atlas overlap. No privacy or hosted authority changes.

## 01 · NEURO.M02.F07 — ANN exhaustive-recall delta probe
- **Upstream:** https://github.com/facebookresearch/faiss (MIT) and https://github.com/nmslib/hnswlib (Apache-2.0)
- **Proposed native function:** Compare approximate HNSW recall against eligible brute-force baseline
- **Falsifier:** ANN is called complete without exact-ID audit
- **Preflight:** CANDIDATE_REQUIRES_EXACT_GAP_REVIEW; PERMISSIVE_UPSTREAM_INSPIRED_CLEAN_REWRITE; evidence must be an exact source/branch diff and a measured test
- **Release:** REVIEW_ONLY; no training/deployment/CANON

## 02 · NEURO.M03.F07 — True-flat-shuffled hierarchy controls
- **Upstream:** https://github.com/pyg-team/pytorch_geometric (MIT) and https://github.com/huggingface/peft (Apache-2.0)
- **Proposed native function:** Compare equal active trainable budgets for semantic HSN routing
- **Falsifier:** Shuffled internal HSN assignments outperform true topology
- **Preflight:** CANDIDATE_REQUIRES_EXACT_GAP_REVIEW; PERMISSIVE_UPSTREAM_INSPIRED_CLEAN_REWRITE; evidence must be an exact source/branch diff and a measured test
- **Release:** REVIEW_ONLY; no training/deployment/CANON

## 03 · NEURO.M04.F02 — Per-Sphere low-rank residual bank
- **Upstream:** https://github.com/huggingface/peft (Apache-2.0) and https://github.com/pyg-team/pytorch_geometric (MIT)
- **Proposed native function:** Learn gated Sphere adapters with bounded active parameter counts
- **Falsifier:** Wider hidden layer alone claimed to prove HSN alignment
- **Preflight:** CANDIDATE_REQUIRES_EXACT_GAP_REVIEW; PERMISSIVE_UPSTREAM_INSPIRED_CLEAN_REWRITE; evidence must be an exact source/branch diff and a measured test
- **Release:** REVIEW_ONLY; no training/deployment/CANON

## 04 · NEURO.M05.F01 — Discrete leaky integrate-and-fire oracle
- **Upstream:** https://github.com/jeshraghian/snntorch (MIT) and https://github.com/fangwei123456/spikingjelly (Apache-2.0)
- **Proposed native function:** Run CPU-reference LIF state against deterministic event streams
- **Falsifier:** Spike threshold or reset violates source-independent oracle
- **Preflight:** CANDIDATE_REQUIRES_EXACT_GAP_REVIEW; PERMISSIVE_UPSTREAM_INSPIRED_CLEAN_REWRITE; evidence must be an exact source/branch diff and a measured test
- **Release:** REVIEW_ONLY; no training/deployment/CANON

## 05 · NEURO.M05.F10 — SynOps versus FLOPs accounting
- **Upstream:** https://github.com/fangwei123456/spikingjelly (Apache-2.0) and https://github.com/neuralensemble/elephant (BSD-3-Clause)
- **Proposed native function:** Count computational events separately from measured energy
- **Falsifier:** SynOps are presented as measured watts
- **Preflight:** CANDIDATE_REQUIRES_EXACT_GAP_REVIEW; PERMISSIVE_UPSTREAM_INSPIRED_CLEAN_REWRITE; evidence must be an exact source/branch diff and a measured test
- **Release:** REVIEW_ONLY; no training/deployment/CANON

## 06 · NEURO.M06.F01 — Bitemporal evidence memory
- **Upstream:** https://github.com/getzep/graphiti (Apache-2.0) and https://github.com/mem0ai/mem0 (Apache-2.0)
- **Proposed native function:** Separate event occurrence, observation, correction and retraction times
- **Falsifier:** Old fact shown as newly verified current
- **Preflight:** EXISTING_CAPABILITY_EXTEND_OR_ABLATE; PERMISSIVE_UPSTREAM_INSPIRED_CLEAN_REWRITE; evidence must be an exact source/branch diff and a measured test
- **Release:** REVIEW_ONLY; no training/deployment/CANON

## 07 · NEURO.M07.F05 — Multi-positive contrastive loss protocol
- **Upstream:** https://github.com/huggingface/sentence-transformers (Apache-2.0) and https://github.com/huggingface/trl (Apache-2.0)
- **Proposed native function:** Allow one query several positives with task-bound labels
- **Falsifier:** A known relevant off-diagonal gets negative gradient
- **Preflight:** CANDIDATE_REQUIRES_EXACT_GAP_REVIEW; PERMISSIVE_UPSTREAM_INSPIRED_CLEAN_REWRITE; evidence must be an exact source/branch diff and a measured test
- **Release:** REVIEW_ONLY; no training/deployment/CANON

## 08 · NEURO.M08.F03 — No-answer calibration curve
- **Upstream:** https://github.com/huggingface/evaluate (Apache-2.0) and https://github.com/huggingface/sentence-transformers (Apache-2.0)
- **Proposed native function:** Benchmark abstention as all eligible sources are removed
- **Falsifier:** System hallucinates a source after full revocation
- **Preflight:** CANDIDATE_REQUIRES_EXACT_GAP_REVIEW; PERMISSIVE_UPSTREAM_INSPIRED_CLEAN_REWRITE; evidence must be an exact source/branch diff and a measured test
- **Release:** REVIEW_ONLY; no training/deployment/CANON

## 09 · NEURO.M09.F05 — SQLite local vector sandbox
- **Upstream:** https://github.com/asg017/sqlite-vec (Apache-2.0) and https://github.com/pgvector/pgvector (PostgreSQL)
- **Proposed native function:** Provide optional no-network vector experiment backend
- **Falsifier:** Prototype auto-replaces primary Atlas index
- **Preflight:** CANDIDATE_REQUIRES_EXACT_GAP_REVIEW; PERMISSIVE_UPSTREAM_INSPIRED_CLEAN_REWRITE; evidence must be an exact source/branch diff and a measured test
- **Release:** REVIEW_ONLY; no training/deployment/CANON

## 10 · NEURO.M10.F03 — Item-level inference-use policy matrix
- **Upstream:** https://github.com/openai/openai-agents-python (MIT) and https://github.com/deepset-ai/haystack (Apache-2.0)
- **Proposed native function:** Distinguish per-item deny from otherwise allowed parent source
- **Falsifier:** Hidden item denial bypasses source-level checks
- **Preflight:** CANDIDATE_REQUIRES_EXACT_GAP_REVIEW; PERMISSIVE_UPSTREAM_INSPIRED_CLEAN_REWRITE; evidence must be an exact source/branch diff and a measured test
- **Release:** REVIEW_ONLY; no training/deployment/CANON

## 11 · NEURO.M11.F04 — Accessible 1,728-node keyboard explorer
- **Upstream:** https://github.com/huggingface/transformers.js (Apache-2.0) and https://github.com/microsoft/vscode (MIT)
- **Proposed native function:** Navigate tree without requiring 3D or color perception
- **Falsifier:** Keyboard-only user cannot reach a node
- **Preflight:** CANDIDATE_REQUIRES_EXACT_GAP_REVIEW; PERMISSIVE_UPSTREAM_INSPIRED_CLEAN_REWRITE; evidence must be an exact source/branch diff and a measured test
- **Release:** REVIEW_ONLY; no training/deployment/CANON

## 12 · NEURO.M12.F01 — Versioned Cursor project-rule pack
- **Upstream:** https://github.com/PatrickJS/awesome-cursorrules (CC0-1.0) and https://github.com/microsoft/vscode (MIT)
- **Proposed native function:** Generate scoped .cursor/rules and AGENTS.md from Atlas source contract
- **Falsifier:** Cursor instructions silently bypass source/permission gates
- **Preflight:** CANDIDATE_REQUIRES_EXACT_GAP_REVIEW; PERMISSIVE_UPSTREAM_INSPIRED_CLEAN_REWRITE; evidence must be an exact source/branch diff and a measured test
- **Release:** REVIEW_ONLY; no training/deployment/CANON

