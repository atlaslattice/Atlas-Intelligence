#!/bin/sh
# SPDX-License-Identifier: MIT
# Runs exactly 100 local C scenarios per toolchain, never broker calls.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
OUT=${1:-"$ROOT/build/peer100"}
mkdir -p "$OUT"
cd "$ROOT"
CFLAGS='-std=c11 -Wall -Wextra -Wno-misleading-indentation -Isrc'
gcc $CFLAGS -O2 src/aosk.c tests/peer_100_passes.c -o "$OUT/gcc-peer100"
"$OUT/gcc-peer100" > "$OUT/gcc.log"
clang $CFLAGS -O2 src/aosk.c tests/peer_100_passes.c -o "$OUT/clang-peer100"
"$OUT/clang-peer100" > "$OUT/clang.log"
gcc $CFLAGS -O1 -g -fsanitize=address,undefined -fno-omit-frame-pointer src/aosk.c tests/peer_100_passes.c -o "$OUT/asan-peer100"
ASAN_OPTIONS=detect_leaks=1:halt_on_error=1 "$OUT/asan-peer100" > "$OUT/asan.log"
python3 tools/verify_peer100.py "$OUT/gcc.log" "$OUT/clang.log" "$OUT/asan.log"
gcc $CFLAGS -O2 src/aosk.c tests/peer_gap_probes.c -o "$OUT/gap-probes"
"$OUT/gap-probes" > "$OUT/gaps.log"
grep -q '^SUMMARY|3|EXPECTED_UNHOSTED_GAPS' "$OUT/gaps.log"
echo 'PASS: three expected unhosted boundary gaps reproduced, no host claims'
