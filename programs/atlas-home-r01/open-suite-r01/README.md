# Atlas OS Open Suite R02 — original native review addon

**Make great things. Keep what you make.** A tested, offline source-first application catalog for the clean-sheet Atlas Native OS R03 experiment. This is an original addon, **not** a bootable app manager, actual sign-in provider, VPN, malware scanner, store, kernel driver or installed suite. Nothing in this addon executes third-party software.

## What is here

- `web/atlas-open-suite.html`: accessible standalone local web preview with 44 source-linked app candidates (17 ArtCraft preview apps), search, four opt-in bundles, original links, local planning, VPN/SSO limitations. Browser never fetches apps automatically, stores cookies or localStorage, or requests accounts.
- `data/catalog.json`: 44 namespaced candidates across editor, images, movies, music, games, files, browser, identity and infrastructure. Every license/status/release remains **PENDING_EXACT_LICENSE_AND_ASSET_REVIEW**, all binaries unspecified, and zero apps marked installed.
- `src/aos_open_suite.c/.h`: **original freestanding native C** admission contract. All inputs are simulated review facts, and even a fully positive case returns **PREPARED_NO_EXECUTION**; no privileged operations are performed.
- `src/catalog_service.py`: read-only catalog rules, reversible local simulated identity plans, per-app OIDC enrollment candidate and non-operational installation/VPN advice. No credentials, tokens or secrets.
- `data/assessment_144.json`: 12 lanes ×12 acceptance criteria, **144 PROPOSED** checks only, not 144 completed features.
- `docs/ARCHITECTURE.md`, `docs/PROVENANCE_POLICY.md`, `docs/SOURCE_REFERENCES.json`: integration and attribution details, what can be inherited from source, and what cannot.
- `tests/`: native checks, identity/source/license negatives, actual Chromium desktop/mobile interactions, all local. The offline HTML works without a command line once opened. Technical contributors may invoke the Makefile for reproducibility.

## Local offline preview

Open `web/atlas-open-suite.html` in a compatible browser. No login is needed to look at the catalog; only deliberate clicks on upstream source links navigate externally. The user can search, filter, inspect provenance and choose a **plan**, not install software.

## What Atlas can truly promise

1. **A great curated set of optional FOSS apps**, zero subscriptions for those local apps. Installed by a real verified native package service only after release/asset/rights review.
2. **Once per-device unlock** for locally controlled, already-permitted apps. OpenID Connect or per-site passkeys for providers who support them. No magic login to arbitrary third-party websites, no shared plaintext master credentials, no unauthorized access.
3. **Hardened browser defaults** such as LibreWolf/uBlock Origin. Update via reviewed package manager; optional privacy profile, site exceptions under user control.
4. **VPN routing as an opt-in** with a separately chosen endpoint/provider, tested kill switch and DNS. WireGuard alone cannot supply free privacy bandwidth.
5. **Security with rapid explanation and rollback** when an authenticated OS implements the required update/attestation/quarantine services; no autonomous destructive repair in this source-only prototype.
6. **Upstream credit and licenses** as architectural constraints, not something to hide. The code licenses of open-source projects and the rights to their artwork/trademarks/user-interface assets may differ.

## Compatibility with Atlas Native R03 and R13

- Original freestanding ELF baseline SHA256 `06e68681508a86dd4cde4f438f0ce02040bac7d9a68989bfef850fc8fd8fef29`. No changes to its original source or link.
- Original Ariadne HSN SHA256 `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`. **No app ID is an HSN address, hardware frame or grant.**
- R13 CANON remains separate and unratified by this source. Palace/Imagine/Dream/Play/Social/Habitat private contents are never read, harvested or installed as Work software.
- Rollback removes this additive directory; R03 and its release archive remain exactly as before. Any future public distribution must separately audit upstream sources, code and asset notices, format migration, supported hardware, current authenticated rights and live update behavior.

## Reproduce

Run `make test` (the native gate in standard and ASan/UBSan modes, Python reference and installed Chromium browser smoke) then `make freestanding` for an import-free C object. `python3 tools_build_ui.py` and `python3 tools_review_matrix.py` reproduce the browser and 144 pending checklist. `python3 tools_release.py` creates deterministic source-only ZIP. If Chromium isn't available, browser tests must be reported as skipped, never silently counted as passes.

**Status**: `TESTED_LOCAL_SOURCE_ONLY`, no package installs, no host SSO, no proprietary code copied, no GUI live deployment, no boot and no Work/Private transfer.

## R02 peer convergence (additive)

Reconciled **peer Open Desktop 55** to this release by its exact source ZIP SHA `2bb1c2183ec55cb3e311a6dba4cae4c64e14d355096330e0109370c73fd6bebb`. Its 55 entries overlap our 44 in 19 exact IDs and 17 ArtCraft aliases; 19 more are staged for independent review, yielding 63 distinct source candidates without assuming 63 installs. See `data/peer_desktop55_crosswalk.json` and `docs/PEER_DESKTOP_CONVERGENCE.md`. Peer original source is not redistributed in this draft; the exact comparison test is skipped on machines that lack authorized access to the owner peer ZIP. The standalone 44-item UI remains the opt-in curated default.
