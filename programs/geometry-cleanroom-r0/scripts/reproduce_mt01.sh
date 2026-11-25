#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
node --test test/kernel.test.mjs test/rank-stability.test.mjs test/four-band-oracle.test.mjs
node --jitless --test test/kernel.test.mjs test/rank-stability.test.mjs test/four-band-oracle.test.mjs
if [[ -f SOURCE_MANIFEST_MT01.json ]]; then
  python - <<'PY'
import hashlib,json,pathlib
p=pathlib.Path('SOURCE_MANIFEST_MT01.json')
m=json.loads(p.read_text())
for name,exp in m['files'].items():
    assert hashlib.sha256(pathlib.Path(name).read_bytes()).hexdigest()==exp,name
print('Verified',len(m['files']),'source/evidence hashes')
PY
else
  echo 'SOURCE_MANIFEST_MT01.json not included in source-only checkout: full archive hash verification NOT RUN.'
  echo 'Obtain and independently pin the owner-private MT01 R2 ZIP for exact 47-payload integrity checks.'
fi
