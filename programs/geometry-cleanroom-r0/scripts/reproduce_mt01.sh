#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
node --test test/kernel.test.mjs test/rank-stability.test.mjs test/four-band-oracle.test.mjs
node --jitless --test test/kernel.test.mjs test/rank-stability.test.mjs test/four-band-oracle.test.mjs
python - <<'PY'
import hashlib,json,pathlib
p=pathlib.Path('SOURCE_MANIFEST_MT01.json')
m=json.loads(p.read_text())
for name,exp in m['files'].items():
 assert hashlib.sha256(pathlib.Path(name).read_bytes()).hexdigest()==exp,name
print('Verified',len(m['files']),'source/evidence hashes')
PY
