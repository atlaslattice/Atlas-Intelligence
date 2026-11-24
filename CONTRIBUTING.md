# Contributing to Atlas Intelligence

Start from the current default branch and an existing issue when one covers the
same problem. Keep changes small enough to review as a coherent result, with
clear acceptance and reproducible checks.

## Choose the right place

| Work | Location |
| --- | --- |
| Application interface | `src/` |
| Server integration | `server.ts`, `server/` |
| Reusable programs | `programs/` and each program's README |
| Contributor documentation | `README.md`, `CONTRIBUTING.md`, `docs/README.md` |
| Operational investigation | Existing issue or `docs/ops/` |

Neural and corpus changes may have active parallel work. Check recent PRs before
editing their paths. Preserve source versions and coordinate definitions; a shared
number is not evidence of a cross-system semantic mapping.

## Choose the checks for your change

Run commands from the repository root. Node tests use the built-in runner; the
application type check and build require `npm ci` first. Python commands use the
standard library unless the relevant component says otherwise.

| Change | Command | What it checks |
| --- | --- | --- |
| Contributor docs and templates | `python3 scripts/check_project_docs.py` | Explicitly maintained docs, local link paths and documented npm script names |
| Application types | `npm run lint` | TypeScript type checking |
| Application build | `npm run build` | Frontend and server bundle compilation |
| Context integration | `npm run test:context-integration` | Adapter and provider-boundary regressions; exact-source cases can skip |
| Excellence program | `npm run test:excellence` | Rebuild plus JavaScript and Python checks; may regenerate program outputs |
| Civilization kernels | `npm run test:civilization` | Kernel and source-reference suites |
| Corpus mechanisms | `npm run test:corpus-synthesis` | Existing generic synthesis controls |
| Classifier | `npm run test:corpus-classification` | Generic classification controls; exact-source cases can skip |
| Workboard integrity | `python3 -m unittest discover -s tests -p 'test_workboard_integrity.py' -v` | Existing source workboard checks |

Run the relevant checks once and investigate actual failures. Record skips and
unavailable dependencies alongside passes. Do not turn an absent test or missing
hosted result into a success. `npm run dev` starts the application; it is not a test.

## Prepare the pull request

Explain the observed problem, the resulting behavior and how you verified it.
Include the issue, dependency PRs, exact tested revision and rollback approach.
If a change depends on another unmerged branch, name it explicitly. Preserve
review objections and historical edition references.

Use the existing [pull request template](.github/pull_request_template.md).
Bug reports should include a small reproduction; improvement requests should
describe the user task and a concrete acceptance condition.

## Source and release boundaries

Use synthetic fixtures or explicitly authorized Work sources. Private Play,
Social, Imagine, Dream, Quiet, Habitat, Brain and Palace content is outside the
Work corpus. A digest verifies bytes; it does not establish access rights.

Never include credentials, personal corpus extracts or restricted datasets in a
public issue, log, fixture or patch. Keep licenses and original attribution intact.
Changes to permissions, secrets, spending, deployment or constitutional editions
require their own relevant authority and review.

Record these separately: locally tested, checked in, CI passed, merged, deployed
and observed functioning in the named hosted environment. Draft status, open
discussions and unresolved dependencies remain visible until their gates are met.

## Accessibility and clarity

Use descriptive link text, heading levels in order and a short explanation before
an acronym. Prefer a working command and its purpose to a claim of completeness.
For interface changes, check keyboard use, focus visibility, labels and readable
contrast alongside the relevant behavior.
