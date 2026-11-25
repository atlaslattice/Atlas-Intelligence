#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
node scripts/verify-release.mjs
npm test
npm run test:jitless
npm run check
node src/demo.mjs > /dev/null
if python3 -c 'import playwright' 2>/dev/null && test -x /usr/bin/chromium; then
 python3 test/browser_smoke.py
 python3 test/standalone_smoke.py
else
 echo 'Browser smoke SKIPPED: explicit Playwright/Chromium dependency unavailable' >&2
fi
