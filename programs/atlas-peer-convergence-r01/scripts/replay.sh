#!/usr/bin/env bash
set -euo pipefail
# Run at the Atlas-Intelligence repository root, branch peer convergence R01.
node --test programs/required-closure/test/*.test.mjs
node --test programs/geometry-cleanroom-r0/test/*.test.mjs
node --test programs/atlas-geometry-one-r38/test/*.test.mjs
node --test programs/atlas-peer-convergence-r01/test/*.test.mjs
node --jitless --test programs/atlas-peer-convergence-r01/test/*.test.mjs
