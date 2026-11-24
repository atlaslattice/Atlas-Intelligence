# Atlas Intelligence

Atlas Intelligence brings together an application interface, source-qualified
knowledge tools and bounded engineering programs. Start with the component you
want to use; each has its own tests and evidence limits.

## Choose a starting point

| Your goal | Entry point |
| --- | --- |
| Find the right component or document | [Documentation guide](docs/README.md) |
| Set up a change and run checks | [Contributing](CONTRIBUTING.md) |
| Inspect the planned engineering program | [Excellence 1728](programs/excellence1728/README.md) |
| Use the reusable software kernels | [Civilization R01](programs/civilization-r01/README.md) |
| Prepare source-qualified context | [Context integration](programs/context-integration/README.md) |
| Inspect the existing corpus mechanisms | [Corpus synthesis](programs/corpus-synthesis/README.md) |
| Review a change or report a problem | [Pull requests](https://github.com/atlaslattice/Atlas-Intelligence/pulls) · [Issues](https://github.com/atlaslattice/Atlas-Intelligence/issues) |

## Run a first check

The application uses Node.js and npm. Some program checks also use Python 3.
Use the committed lockfile when installing the application dependencies:

```sh
npm ci
npm run lint
npm run build
```

`lint` currently runs TypeScript's `tsc --noEmit`; it is a type check. `build`
creates the frontend and server bundles. Neither command deploys the application.
See [the check matrix](CONTRIBUTING.md#choose-the-checks-for-your-change) for the
smaller checks appropriate to a specific change.

Documentation can be checked without installing npm dependencies:

```sh
python3 scripts/check_project_docs.py
```

For local application development, the existing entry point is `npm run dev`.
Application configuration, Firebase access and live provider use are separate
from the offline program checks. Keep private data and credentials out of commits
and browser bundles.

## What is available in this repository

| Component | Source entry | Local command |
| --- | --- | --- |
| Application | `src/`, `server.ts`, `server/` | `npm run lint` and `npm run build` |
| Planned engineering program | `programs/excellence1728/` | `npm run excellence:status` |
| Reusable software kernels | `programs/civilization-r01/` | `npm run civilization:status` |
| Context adapter | `programs/context-integration/` | `npm run test:context-integration` |
| Corpus synthesis | `programs/corpus-synthesis/` | `npm run test:corpus-synthesis` |
| Optional classifier | `programs/corpus-synthesis/classification/` | `npm run test:corpus-classification` |

The context and classifier tests have source-dependent cases. Those cases require
the owner's exact `ATLAS_ARIADNE_ORIGINAL_FILE`; an unavailable source is reported
as a skip. Generic fixtures do not authorize importing an owner's corpus.

The server multi-provider adapter currently reports `provider_unavailable` until
a real adapter is configured. Credential presence alone does not establish
readiness. The frontend Gemini SDK path is separate from that server boundary.

## Read release status accurately

Default-branch source, open PR candidates, local tests, hosted CI and deployment
are separate states. Check the exact commit and environment before relying on a
result. The current runner-admission investigation is tracked in
[issue #15](https://github.com/atlaslattice/Atlas-Intelligence/issues/15), with
the analyzer candidate in [PR #14](https://github.com/atlaslattice/Atlas-Intelligence/pull/14).
Those links are live records; this README is not a release certification.

Program coverage and coordinate counts describe software structure. They do not
prove semantic coverage, scientific validation or completion of every planned task.

## Architecture, history and related repositories

The [Unified HyperMatrix decision](docs/canon/ATLAS_UNIFIED_HYPERMATRIX_20261123.md)
records independent coordinate systems with typed, source-qualified crosswalks.
The existing agent allocation cap is distinct from knowledge-matrix cardinality.
The [architecture document](docs/UNIFIED_ARCHITECTURE.md) retains its historical
implementation narrative with an amendment at the top.

- [Providers](https://github.com/atlaslattice/atlas-lattice-providers): adapter and interoperability work.
- [Noosphere](https://github.com/atlaslattice/noosphere-archive): shared task and evidence contracts.
- [Atlas repository guide](https://github.com/atlaslattice/atlaslattice): entry points across the account.

[License and architectural attribution](LICENSE) remain unchanged. The
[previous repository overview](https://github.com/atlaslattice/Atlas-Intelligence/blob/7ce2ba169feb118b50be310c568300ccd4eec209/README.md)
preserves the earlier schema summary and feature descriptions.
