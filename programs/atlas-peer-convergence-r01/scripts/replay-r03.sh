#!/usr/bin/env bash
# Execute from full PR70 checkout, not from the isolated unit-test recovery kit.
set -euo pipefail
repo_root="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$repo_root"
node --test programs/required-closure/test/*.test.mjs \
  programs/geometry-cleanroom-r0/test/*.test.mjs \
  programs/atlas-geometry-one-r38/test/*.test.mjs \
  programs/atlas-peer-convergence-r01/test/*.test.mjs
node --jitless --test programs/required-closure/test/*.test.mjs \
  programs/geometry-cleanroom-r0/test/*.test.mjs \
  programs/atlas-geometry-one-r38/test/*.test.mjs \
  programs/atlas-peer-convergence-r01/test/*.test.mjs
