# GitHub Support case — Atlas runner admission failure (2026-11-23)

**Prepared, NOT SUBMITTED.** The owner must provide the exact check
annotation, inspect account restrictions and submit through
https://support.github.com/contact.

**Subject:** Three public repositories under GitHub user atlaslattice:
GitHub Actions fails before any hosted runner is assigned

Hello GitHub Support,

Every tested GitHub-hosted `ubuntu-latest` job under the three public Atlas
repositories fails in about two seconds with `runner_id=0`, no runner name,
`steps=[]`, no executed tests and no usable job logs.

Most importantly we installed a new no-secrets, no-checkout, no-third-party
Actions and no-application-dependency diagnostic on Atlas Intelligence's public
`main`. It was automatically triggered only by its own file change.
- Commit: https://github.com/atlaslattice/Atlas-Intelligence/commit/a37b2069d350d743c438bd62a68e690770d936fc
- Run: https://github.com/atlaslattice/Atlas-Intelligence/actions/runs/45240063934
- Job / check run: 137921988371
- Time: 2026-11-23 18:35:48–18:35:50 UTC
- Result: `completed/failure`, `runner_id=0`, `runner_name=""`, `steps=[]`.

Independent same-account examples:
- Providers https://github.com/atlaslattice/atlas-lattice-providers/actions/runs/45237255178 (job 137912144365).
- Noosphere https://github.com/atlaslattice/noosphere-archive/actions/runs/45211955478 (job 137822841328).
- Atlas ONE v2 https://github.com/atlaslattice/Atlas-Intelligence/actions/runs/45230509128 (job 137888449822).

The Checks API reports one annotation for the failed smoke, but the connected
GitHub read interface rejects individual check-run annotation requests.
Owner's annotation text: [PASTE EXACT MESSAGE HERE].

Please investigate the exact server-side pre-runner rejection, identifying
whether an account restriction, effective Actions policy, runner entitlement,
GitHub service/backend condition, or another cause is responsible. Please
recommend the smallest corrective change supported by server-side evidence,
and a way to confirm standard public GitHub-hosted Ubuntu runner admission.

This is a personal GitHub **User** account (not an Organization). We did not
alter billing, paid runners, policy, account permissions, branch protection,
secrets or deployments. GitHub's published status at inspection had no
matching globally announced incident; this does not exclude selective failure.

Evidence tracking:
https://github.com/atlaslattice/Atlas-Intelligence/issues/15
https://github.com/atlaslattice/atlas-lattice-providers/issues/54
https://github.com/atlaslattice/noosphere-archive/issues/28
https://github.com/atlaslattice/Atlas-Intelligence/pull/14

**Owner attachments, redacted:** original check-run annotation, relevant
Settings → Actions → General screenshot, personal Billing Usage/Budgets
restriction status, the listed job metadata and UTC timestamps.
Do NOT send passwords, access tokens, payment card numbers or private data.
