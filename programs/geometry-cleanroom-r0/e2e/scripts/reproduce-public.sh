#!/usr/bin/env bash
# Source-only public reproducibility, WITHOUT access to owner model weights.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
node --test test/*.test.mjs e2e/test/*.test.mjs
# Node 22 undici+--jitless loads WebAssembly and is not compatible with this
# environment for HTTP tests; use the supported, independently passing subset.
node --jitless --test test/*.test.mjs e2e/test/quality-gate.test.mjs
python -m unittest discover -s e2e/physics -p 'test_chladni.py' -v
python e2e/physics/chladni_check.py e2e/physics/published_chladni_2026.json
