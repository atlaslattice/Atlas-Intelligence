# Atlas OS Native R04 — Open-Source Garden & application provenance

**Original Atlas OS userspace component, not an Ubuntu/Linux fork, distro ISO, installation or SSO deployment.**

This repo adds a native C application-planning gate and source-pinned, curated 37-entry application catalog. It incorporates the **entire observed official 17-app ArtCraft lineup + launcher**, with early-stage labels, alongside established FOSS candidates. The code has no installer, credential issuer, VPN activation or network calls. It never imports third-party application code or protected Palace/Dream/Imagine/Quiet records.

## Source lineage

- Original Atlas R03 userspace/kernel source: GitHub `atlaslattice/Atlas-Intelligence` draft PR #81 at pinned prior head `87c7bb9cc051633fecf495d66524e01c7f3ef04d`. This R04 code does **not** modify the native R03 core or its historical C instruction engine.
- Ariadne original v0.7 registry SHA256 `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`. HSN is source identity, never hardware page, app ID, physical address, or authorization.
- CANON 144 R13 manifest SHA256 `0670fac32fab8c4cc8f1e1abc30af26acb788b68fd4c31dbfd605f9368fd3b0a`. Version pin is **normative candidate**, not human ratification/technical activation.
- ArtCraft official catalog: https://getartcraft.com/apps ; exact GitHub `storytold` repo revision pins live in `catalog/apps_catalog.json`. No upstream application source is copied here.

## Actual behavior

Native `aos_app_plan` validates a supplied app ID, latest synthetic session epoch, protected-mode selection, opt-in for experimental builds, license-review state, user presence, source release and package-proof *claims*, explicit per-service OIDC compatibility and consent, opt-in VPN, scoped file portal selection, browser extension permission, and a final-return-local flag. Every output is either HOLD, a non-effect catalog result or PREPARED_NO_EFFECT. This is **not** a trusted security authority: flags are caller-supplied fixture values and must be replaced with attestations from the actual OS identity/permission service before release.

`aos_app_plan_bound` uses the **unchanged original R03 aosk.c** to check synthetic domain, owner, SEND right and a local boot epoch before making any plan. Compiled/linked and tested in GCC/Clang/ASan+UBSan; no new kernel privilege or driver is added. The original R03 raw mailbox still admits unknown nonzero kind and resets epoch after init; those blockers remain open and should be fixed at the typed transport boundary before any real app action.

## Reproduce (safe, no install)

```sh
./tools/run_tests.sh
python3 tests/browser.py
```

Dependencies: GCC, Clang with wasm32 target, Node.js, Python 3, Chromium/Playwright for optional browser tests. `run_tests.sh` requires the separately authorized exact R03 C directory for its optional native bridge. Use `AOSR03=/path/to/atlas-os-native-r03` to override. Build is offline and non-destructive. The C/WASM test modules have no app downloads or authentication.

Test evidence: 100 distinct C app/action/scoping scenarios, **identical 100-row receipts** in GCC/Clang/ASan+UBSan; native bridge 10 assertions in each mode, source catalog audit, import-free WASM, **64 local desktop/mobile browser checks**. An initial UI profile reset error was reproduced and repaired; an initial bridge test correctly found an epoch update after granting, then verified rebind, not an override. Neither is a deployed vulnerability.

## Roadmap / acceptance gates

1. Package pin + signature and reproducible binary review per source commit; follow every applicable license and copyright notice.
2. Actual native app sandbox and filesystem portal, with independent per-app session and revocation.
3. Device FIDO2/biometric authentication unlocking a secure credential broker; opt-in OIDC/WebAuthn/approved federation per participating service, never cross-origin cookie or password injection.
4. Firewall, browser content filtering, DNS/privacy and verified opt-in WireGuard/VPN, with secure recovery and transparent network failure behavior.
5. Real on-device install/launch/update/rollback; no core app is silently installed; no forced cloud accounts.
6. Linux/Ubuntu compatibility compartment for existing apps; progressive original Atlas-native replacements only where tested; preserve upstream brands/visuals where licensing permits and never claim unaffiliated sponsorship.
7. Real kernel boots, MMU/interrupt/userspace isolation and hosted final RETURN rights before authorizing any privileged action.
8. Explicit cross-platform file-open/save round trips and independent performance/quality panel for apps (ArtCraft should not replace mature production tools until tests pass).

**Never confuse installed, reviewed, tested, proposed, source-pinned, signed, or hosted.**
