# R04 source-pinned overlay of the existing Open Commons R05 catalogue

**Do not create a fourth selected catalogue.** The owner-private Open Commons R05 catalog remains immutable, with its own source and app identity. The original canonical Ariadne HSN registry remains separate from all app IDs and hardware addresses. Our R04 37-app Git-source-pinned metadata is a **review overlay** only. GitHub PR #81 adds no third-party source, selected installer or credential broker.

- R04 JSON source SHA256 `c84287c3311118e5cc3e8595f4cfcef54c378ce17d26b7dfeec7a24c3e54bddd`, 37 apps / 36 Git commit pins / 17 ArtCraft apps plus launcher / 0 signed binary pins / 0 installed.
- Recovered owner-private Open Commons R05 catalog SHA256 `854adb2b7d6154e983db9442d6e205b63d2bfe8e32a66316f4491cf94fd7ded3`, 42 candidates, status `PREPARED_CATALOG_NOT_INSTALLED` and scope `SOURCE_LINKS_AND_PRODUCT_EVALUATION_ONLY`.
- Exactly **21** R04 entries share an identical ID+source URL with an R05 entry; these remain `REVIEW_EXACT_ID_AND_SOURCE_URL` **not** `SAME_RELEASE`.
- **Five** have identical candidate IDs but different upstream URLs (for example a GitHub mirror versus another official code host), and are `HOLD_SAME_ID_DIFFERENT_SOURCE_URL` pending source and license provenance.
- **One** shares an upstream URL under different IDs (Nextcloud server); it remains `REVIEW_SAME_SOURCE_URL_DIFFERENT_ID`, not a merged service/client app.
- **Ten** R04 candidates have no match in R05; **16** R05 candidates are not represented by the R04 37-item overlay. Neither set is discarded or automatically installed.
- **0 accepted app-ID aliases, 0 approved releases, 0 signed packages, 0 installations**. Matching a commit or display name does not provide binary provenance, service origin, app-specific permissions, or installation rights.

Reproduce with explicitly authorized source:

```sh
python tools/reconcile_catalogue.py catalog/apps_catalog.json /private/Atlas_OS_Open_Commons_R05_App_Catalog.json /private/peer_crosswalk.json
python tests/crosswalk_test.py
```

The complete 37-row crosswalk and the original R05 source belong only in the **owner-private** package, not this public Git repository. Public tests use synthetic peer rows. The script independently rejects duplicate IDs, unsafe upstream origins, and any source falsely marked deployed.

**A+B=C:** A existing Commons R05 42 app candidate IDs and statuses; B original R04 Git metadata + native C userland plan; C non-promoting typed provenance suggestions and compatibility holds, without a second app registry. Rollback remove R04 overlay; the R05 catalog remains byte-identical. Need an owner-selected canonical ID+binary digest/arch/distribution/edition map plus independent license and application fidelity before any adoption.
