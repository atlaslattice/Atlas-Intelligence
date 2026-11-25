# One registry, not two application stores

## Actual peer intake

Foundry #159 published owner-private Atlas Open Desktop R01, ZIP SHA256 `2bb1c2183ec55cb3e311a6dba4cae4c64e14d355096330e0109370c73fd6bebb`, Library `libfile_fa2bd4cda6908191b77272eab0640078`. We recovered exactly that source, verified its seven checksum entries, and compared its 55 declared app IDs with our 44-app R01 catalogue. **No peer source implementation or private body has been incorporated into the public Atlas app runtime.**

- **19** app IDs exactly match.
- **17** ArtCraft names are the same products but use different ID conventions (`photocraft` vs `artcraft-photocraft`). We preserve the existing Atlas ID, retain the peer alias and keep these software previews *experimental*. This is not 17 extra applications.
- **19** peer-only products or infrastructure entries (including Okular, restic, Firefox, Keycloak, ClamAV, Sigstore/TUF, Heroic and additional platform tools) are staged for per-product review. A peer source list is evidence of a candidate, not validation of its license, security or availability.
- The union has **63 unique source candidates**, not 99 installed applications and not 63 live services. The original user-curated 44 remain the only selectable local preview until peer-only records pass full provenance checks.

## No silent promotion

`data/peer_desktop55_crosswalk.json` records 55 source-linked matches, aliases and held candidates. All statuses say `can_install=false`, `license_approved=false` and `host_auth=false`. The native review gate does not know or assume these records are authorized. The peer-source URL is retained as provenance, without laundering it into an authoritative release signature.

To reproduce, supply the owner's exact peer ZIP to `tools_peer_reconcile.py` (digest pinned) and compare its output to the committed crosswalk. This is a **metadata comparator**, not a source-code merge, library dependency, app build or public-source permission grant. Any future installer promotion must pass the shared 144 proposed acceptance cells, independent current source and asset review, explicit user consent and a real host service.

## Rollback

Delete `tools_peer_reconcile.py`, the crosswalk, its test and this document. The base R01 44-app catalog, R03 kernel and Home PR78 are untouched; staged peer candidates do not create user data or revoke existing source history.
