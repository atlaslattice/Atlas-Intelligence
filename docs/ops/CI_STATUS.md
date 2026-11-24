# CI status and local checks

The CI evidence tools can be tested offline. GitHub-hosted acceptance remains
blocked by the tracked [runner admission incident](https://github.com/atlaslattice/Atlas-Intelligence/issues/15).
That issue is the single incident entry point; the earlier recovery notes and
failed run records remain available as history.

## Run the checks

From the repository root, with Python 3.11 or newer:

```sh
python3 -m unittest discover -s tests -p 'test_atlas_ci_*.py' -v
python3 -O -m unittest discover -s tests -p 'test_atlas_ci_*.py' -v
```

The suite uses only the Python standard library and synthetic API responses.
It does not call GitHub, run paid providers, load a corpus, or start residents.
The integrated R04 suite contains 88 test methods. This is existing regression
coverage brought into the repository, not 88 new discoveries.

[`CI evidence tools`](../../.github/workflows/atlas-ci-tools.yml) runs those same
commands for changes to these scripts or tests. It uses a limited checkout and
read-only repository permission. The separate
[`runner admission smoke`](../../.github/workflows/atlas-runner-admission-smoke.yml)
retains its original no-checkout diagnostic purpose.

## Understand the two tools

| Tool | Question answered | Limit |
| --- | --- | --- |
| [`atlas_ci_admission.py`](../../scripts/atlas_ci_admission.py) | Do the supplied jobs show executed steps on the pinned source? | Missing runner metadata stays unknown; the live collector never verifies logs itself. |
| [`atlas_ci_required_coverage.py`](../../scripts/atlas_ci_required_coverage.py) | Do independently pinned workflow requirements, observations and log-review receipts agree? | A consistent result does not authenticate its inputs or authorize release. |

To evaluate the preserved incident snapshot locally:

```sh
python3 scripts/atlas_ci_admission.py --snapshot data/atlas_ci_admission_snapshot.json
```

Exit `3` means **held** and is expected for this historical failed-run snapshot.
Exit `2` means the input could not be evaluated. Exit `0` covers only the
supplied execution evidence; it is not a merge or deployment approval.
Optional `--live` uses bounded GitHub GET requests and must be requested
deliberately. Do not put tokens or private API responses in issues or commits.

The coverage module exposes `assess(manifest, observation, receipts,
external_pins=...)`. Its example structures and negative cases live in
[`test_atlas_ci_required_coverage.py`](../../tests/test_atlas_ci_required_coverage.py).
The caller must independently obtain the required checks and log review;
matching hashes alone do not establish authentication.

## Current release observations

Checked 24 November 2026, Hawaiʻi time. These are dated observations, not a live dashboard.

| Candidate | Exact reviewed head | All-event Actions result at inspection |
| --- | --- | --- |
| [Providers #67](https://github.com/atlaslattice/atlas-lattice-providers/pull/67) | `6eb67fffd8eb42ada3cb2a94ab3169d7010302e5` | Five failed runs: one pull request and four push runs. |
| [Atlas #42](https://github.com/atlaslattice/Atlas-Intelligence/pull/42) | `fc74dd5a6c744bed4a7b454762936f93ca45bb8f` | Three failed runs: two pull request and one push run. |
| [Noosphere #38](https://github.com/atlaslattice/noosphere-archive/pull/38) | `cfd3a6a69732a542953889c5f5ad180f196d51c3` | No exact-head runs returned. |
| [Noosphere #41](https://github.com/atlaslattice/noosphere-archive/pull/41) | `bdc9e937ef5d0afa5b15c3294ec8fe1c1101ae39` | No exact-head runs returned. |

All four candidates were open drafts and unmerged. The three inspected current-head
pull-request jobs and the isolated historical smoke job explicitly returned
`runner_id=0`, `steps=[]` and a failure conclusion. No test execution is inferred
from that symptom. The other push jobs were not individually inspected.

## What unblocks release

1. Read the exact annotation for [isolated smoke job 137921988371](https://github.com/atlaslattice/Atlas-Intelligence/actions/runs/45240063934/job/137921988371).
   The connected annotation endpoint currently returns a tool-level `400`; no
   annotation text has been read. Its absence is not an infrastructure diagnosis.
2. Obtain the actual required-check policy through an authorized owner interface.
   The connected required-status-checks endpoint returned `403: Resource not
   accessible by integration`. That response does not mean no checks are required.
3. After an evidence-supported infrastructure correction, obtain a real runner,
   executed steps and retrievable logs. Recheck each PR's current head and exact
   workflow source before accepting the corresponding result.

Keep [the original recovery history](ATLAS_ACTIONS_SYSTEM_RECOVERY_20261123.md)
and [prepared support handoff](GITHUB_SUPPORT_ATLAS_ACTIONS_20261123.md).
The support handoff is not a submitted ticket. Local tests, hosted checks,
merge, release, deployment and host attestation remain separate states.
