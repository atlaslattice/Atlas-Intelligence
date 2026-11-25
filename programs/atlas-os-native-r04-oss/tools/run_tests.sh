#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$ROOT/receipts" "$ROOT/build"
python3 "$ROOT/tools/build_catalog.py"
for mode in gcc clang sanitize; do
  case "$mode" in
    gcc) cc=gcc; flags='-O2' ;;
    clang) cc=clang; flags='-O2' ;;
    sanitize) cc=gcc; flags='-O1 -fsanitize=address,undefined -fno-omit-frame-pointer';;
  esac
  "$cc" -std=c11 -Wall -Wextra -Werror -Wno-misleading-indentation $flags -I"$ROOT/src" "$ROOT/tests/appgate_100.c" "$ROOT/src/atlas_appgate.c" "$ROOT/src/apps_catalog.c" -o "$ROOT/build/appgate-$mode"
  "$ROOT/build/appgate-$mode" >"$ROOT/receipts/100-$mode.jsonl" 2>"$ROOT/receipts/100-$mode.stderr"
  echo "$mode $(sha256sum "$ROOT/receipts/100-$mode.jsonl")"
done
cmp "$ROOT/receipts/100-gcc.jsonl" "$ROOT/receipts/100-clang.jsonl"
cmp "$ROOT/receipts/100-gcc.jsonl" "$ROOT/receipts/100-sanitize.jsonl"
clang --target=wasm32-unknown-unknown -O2 -ffreestanding -fno-builtin -nostdlib -Wl,--no-entry -Wl,--export-all "$ROOT/src/atlas_appgate.c" "$ROOT/src/apps_catalog.c" -o "$ROOT/build/atlas-appgate.wasm"
node "$ROOT/tests/verify_wasm.mjs" "$ROOT/build/atlas-appgate.wasm"
python3 "$ROOT/tests/verify_catalog.py"
echo 'ALL ATLAS OSS APPLICATION CANDIDATE TESTS PASS'
# Explicit source-level join with R03's unchanged original aOSK userspace fixture.
AOSR03=${AOSR03:-/mnt/data/atlas_os_native_r03/atlas-os-native-r03}
for mode in gcc clang sanitize; do
 case "$mode" in gcc) cc=gcc;flags='-O2';;clang) cc=clang;flags='-O2';;sanitize) cc=gcc;flags='-O1 -fsanitize=address,undefined -fno-omit-frame-pointer';;esac
 "$cc" -std=c11 -Wall -Wextra -Werror -Wno-misleading-indentation $flags -I"$ROOT/src" -I"$AOSR03/src" "$ROOT/tests/bridge_test.c" "$ROOT/src/atlas_appbridge.c" "$ROOT/src/atlas_appgate.c" "$ROOT/src/apps_catalog.c" "$AOSR03/src/aosk.c" -o "$ROOT/build/bridge-$mode"
 "$ROOT/build/bridge-$mode"
done
