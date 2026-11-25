# Atlas OS Open Suite R01 — the software belongs to the user

**Edition:** 2026-11-25 source-only, pre-install, pre-SSO, pre-host review. A candidate under the existing Atlas Native OS R03 native architecture, not a replacement kernel or a working app store.

## Product promise

Atlas should feel like a computer that already knows what a person wants to *do*. Work, art, photos, video, music, documents, code, games, recovery and internet access should be discoverable by intent, not by vendor subscription. Preserve high-quality familiar upstream UI where its actual copyright, trademark, asset and code licenses permit it. Reuse public source with attribution and contribution back to upstream; independently implement only where genuinely warranted.

A program can be excellent and free without being appropriate for an automatic default install. Today's suite is **44 audited-discovery candidates**, including **17 ArtCraft apps** marked preview/early development. It is not 44 installed programs. The software catalog carries origin, source repo, license claim, source-of-claim, maturity, format migration caveats, server costs and auth mode. No live binaries, exact version pins, trusted signer keys, notices, UI asset permissions or app quality benchmarks have been approved. Each entry is default HOLD for installation.

## Architecture: one native kernel, a user-space app plane

```
                          user & local presence
                                  |
                 Atlas Home / conversational intent
                                  |
                 read-only curated discovery
                                  |
                 source + license + SBOM + signers
                                  |
               consent / platform / sandbox review
                                  |
          system install broker (NOT IMPLEMENTED)
               /                          \
        native Atlas app ABI       Linux guest / Flatpak compat

 Local identity / passkey vault        Network security service
 [TPM/FIDO planned, not used]         [VPN and firewall planned]
               \                          /
                  Atlas Native typed IPC
                            |
              R03 kernel capability boundary
            [lab model, not hosted or booted]
```

`src/aos_open_suite.c` is an original **freestanding C advisory gate** that can compile for the same target as R03; it never downloads, writes a file, logs in, or authorizes privileges. It has no third-party code. `src/catalog_service.py` is a local planning/reference service. The offline HTML is a self-contained, no-telemetry user interface that selects *plans only*.

Ariadne HSN (`ariadne-reader/v0.7`, SHA `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`) remains knowledge-coordinate identity; app IDs use `atlas.apps/v1`; kernel physical x/y/z and OS tasks are separate namespaces. Atlas CANON R13 is source reference, not ratified release/rights authority.

## The single-login contract: seamless where possible, never fake credentials

1. On real hardware, unlock the Atlas session with a **trusted device-bound key / security key / PIN / supported biometric**. FIDO/WebAuthn never exports biometric templates. Current code simulates presence for testing and explicitly returns `host_auth:false`.
2. Local-first apps open without app accounts and without telemetry. No need to login to Writer, photo editors, games and private files.
3. For **Atlas-first-party and selected OIDC-integrated apps**, opt in once to identity-provider enrollment. Enforce issuer, audience, tenant, scopes, expiry, token binding and independent current authorization in an actual service. Authelia is a possible open-source IdP, **not** a central root credential copied to every app. `OfflineBrokerFixture` creates NO tokens and NO network sessions.
4. For unrelated third-party websites, the remote provider still controls logins. Offer a secure, native passkey UX or per-site password-manager autofill, never bypass a site's verification or claim to unlock every service automatically. One device unlock cannot lawfully mint authorization at arbitrary websites.
5. Every app sees **only its own delegated scopes**. Private Palace/Imagine/Dream/Habitat content is excluded from default Work and app training. Logging out invalidates local plans; real cross-app revocation and network cookie/session termination remain unimplemented.

## Security that works for the user

- **Browser:** start with LibreWolf (Firefox-based, uBlock Origin included) as a curated hardened candidate. Allow familiar Firefox-compatible fallback for broken sites. Bundle verified, frequent updates; LibreWolf itself relies on package managers for updates.
- **Privacy:** tracking protection on by default, no extra browser extensions without review, permission prompts per site, no private-mode data sharing by default. Never claim a privacy toggle makes a user anonymous.
- **VPN:** WireGuard can implement an encrypted tunnel; a VPN **provider, self-hosted peer or other valid endpoint**, key exchange, exit service and bandwidth are separate. Automatic routing is opt-in, with actual DNS leak and kill-switch tests before calling it protected. Free VPN service is not bundled.
- **Rapid response (future):** immutable updates with attestations, isolate/quarantine a suspected app/network connection, roll back to a signed snapshot, preserve a trustworthy audit trail, and present plain-language recovery. Do not auto-wipe files or remove access. Separate safety authority from model suggestions. Security patches must remain timely; don't rewrite upstream crypto on aesthetic grounds.
- **Provisioning (future):** trusted publisher and artifact signature, exact upstream commit/license/NOTICE/assets, dependency SBOM, CVE/maintainer review, sandbox policy, backup, migration/rollback and accessibility. Verified Flathub publisher ownership helps discovery but is not sufficient by itself for full source integrity.

## A curated default without bloat

**Everyday:** LibreOffice, LibreWolf, VLC, KeePassXC. **Creators:** add GIMP, Inkscape, Krita, Kdenlive, OBS and Audacity. **Files & photos:** recommend server-capable Nextcloud and Immich only after the user chooses hosting, storage and independent backups. **Games:** Godot, Luanti, SuperTuxKart and OpenTTD. **Experimentation:** all seventeen ArtCraft apps are labeled as previews alongside established alternatives. None is auto-installed by this R01.

The app's native front end may be kept where permitted, while the data/commands are exposed through an Atlas-native typed service contract. However, open-source code licenses do **not** necessarily license a product's name, logo, UI artwork, bundled fonts, upstream service mark or app store assets. GPL/MPL/AGPL and permissive licenses have different distribution and linking obligations. No unreviewed commercial trade dress will be cloned.

## Proof vs intention

- **PROVED LOCALLY:** 44 schema-clean catalog records, 17 tagged ArtCraft previews, local source URLs, Python reference contract, freestanding C gate compiled, failure-denying mock policy, offline HTML interactions under Chromium, deterministic source archive, proposed 144 review cells.
- **NOT PROVED:** exact third-party source/license/asset acceptance, signed package metadata, reliable DOCX/XLSX/PSD media roundtrips, actual app installation/update/removal, functioning VPN, real biometric/passkey/SSO, TPM, kernel App IPC, authenticated install grant, hosted malware response, shipped native desktop, any subscriber payments eliminated for a real person.
- **ROLLBACK:** remove `addons/open_suite/` from the preserved R03 package. No previously established ELF, installed app, private resident system or repo is changed by this build.
