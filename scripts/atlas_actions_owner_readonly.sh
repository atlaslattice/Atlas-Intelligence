#!/usr/bin/env bash
# Owner-authenticated READ-ONLY GitHub Actions incident collector.
# No workflow dispatch, reruns, policy changes, secrets or payment operations.
set -euo pipefail
command -v gh >/dev/null || { echo 'GitHub CLI required' >&2; exit 2; }
ROOT='./atlas-actions-owner-private-evidence'
if [ "$#" -ge 1 ]; then ROOT="$1"; fi
umask 077
mkdir -p "$ROOT"
date -u +'%Y-%m-%dT%H:%M:%SZ' > "$ROOT/collection-time-utc.txt"
get() {
  local endpoint="$1" output="$2"
  if gh api "$endpoint" > "$ROOT/$output"; then
    chmod 600 "$ROOT/$output"
    printf 'GET OK %s\n' "$output"
  else
    rm -f "$ROOT/$output"
    printf 'GET UNAVAILABLE %s\n' "$output" >&2
  fi
}
get 'repos/atlaslattice/Atlas-Intelligence/actions/runs/45240063934' 'atlas-smoke-run.json'
get 'repos/atlaslattice/Atlas-Intelligence/actions/runs/45240063934/jobs?per_page=100' 'atlas-smoke-jobs.json'
get 'repos/atlaslattice/Atlas-Intelligence/check-runs/137921988371/annotations' 'atlas-smoke-annotations.json'
get 'repos/atlaslattice/atlas-lattice-providers/actions/runs/45237255178/jobs?per_page=100' 'providers-jobs.json'
get 'repos/atlaslattice/atlas-lattice-providers/check-runs/137912144365/annotations' 'providers-annotations.json'
get 'repos/atlaslattice/noosphere-archive/actions/runs/45211955478/jobs?per_page=100' 'noosphere-jobs.json'
get 'repos/atlaslattice/noosphere-archive/check-runs/137822841328/annotations' 'noosphere-annotations.json'
get 'repos/atlaslattice/Atlas-Intelligence/actions/permissions' 'atlas-actions-permissions.json'
get 'repos/atlaslattice/atlas-lattice-providers/actions/permissions' 'providers-actions-permissions.json'
get 'repos/atlaslattice/noosphere-archive/actions/permissions' 'noosphere-actions-permissions.json'
printf '%s\n' 'Review/redact this PRIVATE evidence directory before sharing. Do not publish raw account messages or secrets.'
