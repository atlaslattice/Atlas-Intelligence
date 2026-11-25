#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node --test test/kernel.test.mjs
node --jitless --test test/kernel.test.mjs
node src/benchmark.mjs
