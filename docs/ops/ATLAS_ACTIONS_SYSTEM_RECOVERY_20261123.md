# Atlas GitHub Actions system recovery (2026-11-23)

**P0 / RUNNER ADMISSION HELD / ROOT CAUSE UNKNOWN / NO CI ACCEPTANCE / NOT CANON.**

## Executed diagnostic: isolated no-secrets hosted job

Workflow installed on public `atlaslattice/Atlas-Intelligence` `main`:
[`.github/workflows/atlas-runner-admission-smoke.yml`](https://github.com/atlaslattice/Atlas-Intelligence/blob/a37b2069d350d743c438bd62a68e690770d936fc/.github/workflows/atlas-runner-admission-smoke.yml).
Commit: `a37b2069d350d743c438bd62a68e690770d936fc`.

The source-file-only push trigger produced
[run 45240063934](https://github.com/atlaslattice/Atlas-Intelligence/actions/runs/45240063934),
job `137921988371`, on 2026-11-23 18:35 UTC. **Two-second failure,
`runner_id=0`, no runner name, `steps=[]`.** The workflow did not use
`actions/checkout`, third-party actions, private data, secrets, model calls,
dependencies, or application source. This separately reproduces a pre-step
runner admission/reporting failure; it does **not** prove a billing, policy or
GitHub infrastructure root cause.

Corroborating readbacks:
- Providers [run 45237255178](https://github.com/atlaslattice/atlas-lattice-providers/actions/runs/45237255178), job `137912144365`, runner 0, steps 0;
- Noosphere [run 45211955478](https://github.com/atlaslattice/noosphere-archive/actions/runs/45211955478), job `137822841328`, runner 0, steps 0;
- Atlas ONE v2 [run 45230509128](https://github.com/atlaslattice/Atlas-Intelligence/actions/runs/45230509128), job `137888449822`, runner 0, steps 0.

[GitHub Status history](https://www.githubstatus.com/history) did not show
a general Nov 22–23 GitHub Actions incident at inspection, which does not
exclude selective runner allocation failure. GitHub documentation says that
standard GitHub-hosted runners on public repos are free; **no paid runners
or billing settings were activated**.

## Owner / platform blocker

Exact annotation text is **NOT READABLE** through the connected GitHub
interface. It is known that one check-run annotation exists.

From a local GitHub CLI already authenticated as the repo owner, perform a
read-only request:

```bash
gh api repos/atlaslattice/Atlas-Intelligence/check-runs/137921988371/annotations
```

Inspect the account's own billing Usage/Budgets and Actions restriction
notifications and per-repository Settings → Actions → General. The owner
`atlaslattice` is a **User**, not an Organization. Do not guess that
changing an action allowlist, billing card, spending cap, hosted runner labels,
or workflow YAML will fix this; no cause is established yet. If settings and
annotation do not explain the failure, escalate via
[GitHub Support](https://support.github.com/contact) with run/job/check IDs,
UTC times and the original `runner_id=0;steps=[]` API readback.

## Source-pinned recovery and acceptance

The machine classifier under `scripts/atlas_ci_admission.py` is offline by
default. It takes a fixed JSON snapshot, or uses `--live` to perform **GET-only**
public GitHub REST requests (no write APIs, workflow dispatch, or reruns).
The optional `GH_TOKEN` or `GITHUB_TOKEN` environment variable is
never written to output. No token is needed for offline mode.

```bash
python3 -m unittest discover -s tests -p test_atlas_ci_admission.py -v
python3 scripts/atlas_ci_admission.py --snapshot data/atlas_ci_admission_snapshot.json
# expected exit code: 3 for held CI, not 0
```

The classifier requires an exact pinned commit SHA, real nonzero runner ID,
executed passing steps, and separately verified logs before marking *hosted
execution* accepted. Hosted CI success **never** implies CANON, source rights,
release readiness or deployment permission.

After runner admission is demonstrably restored, rerun:
- Providers PR #53 head `75b03b5d6b7582726e70adf400634ae9f0374323`, candidate matrix [45054220943](https://github.com/atlaslattice/atlas-lattice-providers/actions/runs/45054220943) and Eight Gates 45054220992;
- Atlas PR #5 v0.3 head `705d1ab9f33e13f85ffe66f0103a1d10c70c78e9`, source+upstream probes [45079949846](https://github.com/atlaslattice/Atlas-Intelligence/actions/runs/45079949846);
- Noosphere PR #29 head `a8e3426e9217f2744bb4b1e45e3e384f443b6da7`, Digital Continuity 45098142660, SwarmHub 45098142667;
- Noosphere PR #26 head `279e064f499f0d3d535c6cb503d440ee21712383`, registry [45113670505](https://github.com/atlaslattice/noosphere-archive/actions/runs/45113670505);
- Providers PR #59 head `d28f72a27eff88fcbc32b79f9ee65791e5352ba6`, Eight Gates 45115443422 **and a separate targeted 19-test source suite**;
- Atlas ONE v2 source checks only after refreshing the current head (historical run SHA is stale).

These are historical source pins, **not live PR-head attestations**. Re-fetch
head/base/check details and target workflow files before any new run. Preserve
all original failures and 234/234 local v0.3 receipts; do not treat a historical
rerun as a current-head check. Keep all merges, branch-policy changes,
licensing, publishing, CANON and hosted deployment under independent approval.
