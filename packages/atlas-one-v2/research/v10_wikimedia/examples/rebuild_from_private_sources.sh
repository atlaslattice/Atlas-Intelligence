#!/usr/bin/env bash
# Owner-private offline replay; never downloads or publishes data.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p private_regenerated
python src/civilization_12pass.py \
  --circuit-db private_inputs/circuit.sqlite \
  --registry private_inputs/ariadne_v07_atlas.json \
  --out private_regenerated/TWELVE_CIRCUIT_PASS_RECEIPT.json
python src/build_private_knowledge.py \
  --registry private_inputs/ariadne_v07_atlas.json \
  --crosswalk private_inputs/openalex_to_ariadne_ALL_4516.csv \
  --r09-output private_inputs/r09_output \
  --out private_regenerated \
  --v09-src private_inputs/v09_src
python src/build_explorer.py \
  --input private_regenerated \
  --audit private_regenerated/TWELVE_CIRCUIT_PASS_RECEIPT.json \
  --out private_regenerated/ATLAS_R10_WIKIPEDIA_HSN_RESEARCH_EXPLORER.html
printf 'REBUILT_PRIVATE_OFFLINE_SOURCE_ONLY\n'
