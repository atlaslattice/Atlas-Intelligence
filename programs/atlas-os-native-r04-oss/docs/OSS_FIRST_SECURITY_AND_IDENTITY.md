# Atlas OS Open-Source First — original native system contracts

## Originality, dependency and licensing rules

Atlas Native R04 writes original C planning code and an original catalog UI. Third-party GitHub repositories are **references**, not copied code. Atlas can package existing FOSS applications only after their applicable SPDX, attribution, notice, trademark, patent and reciprocal-license requirements are independently reviewed for the concrete distribution model. Repository license metadata is not a license grant for a specific binary or for copied interface assets. Familiar interaction patterns can be designed independently; do not copy protected artwork, proprietary icons, brands, proprietary CSS/assets or proprietary source without permission. A clean-room native Atlas adaptation must preserve original contributors and receipts, not conceal upstream lineage.

The catalog has 37 reviewed-source **candidates**, 36 Git revision pins and one intentionally unpinned Firefox distribution candidate. NONE has a verified release artifact, reproducible signed package, or install grant. `NOASSERTION`/`UNKNOWN` GitHub license metadata needs manual license reconciliation; an Apache-2.0 *repository metadata field* does not prove the complete redistribution package.

## Identity model

`ATLAS_LOGIN` is a local device account unlock (future FIDO2/passkey hardware-backed credential, PIN/biometric if platform supports it). The native credential broker is a separate unprivileged service with source-/origin-/purpose-/scope-bound credentials. Local offline apps have **zero** external accounts. Participating apps may use OIDC Authorization Code + PKCE, WebAuthn/passkeys or system OAuth provider sessions if explicitly supported and approved by the user. Federated sessions are per origin and per audience, revocable; no arbitrary app is automatically signed into a service. An app unsupported by the standard needs the provider's supported local flow; no cookie injection or stored-password replay. Never log or embed raw secrets in conversations, agent prompts, model input, debug receipts or application catalog.

## Installer phases (not implemented yet)

`DISCOVER` → pin source+concrete binary+license → `REVIEW` sandbox/permissions → optional `EXPERIMENT_OPT_IN` → `USER_CONSENT` → external policy+signature+rollback proof → `HOST_STAGED` → actual installer → post-install `AUDIT`. All phases after consent are held until independent host services exist. These C tests execute no package manager, Flatpak, apt, dpkg, shell, network or login actions.

On Linux compatibility hosts, use Flatpak/XDG document portals for user-selected files and minimal per-app device/network permissions; do not give blanket `$HOME`, DRM keyring, microphone/camera, or system service access. A future Atlas-native equivalent must be separately designed and measured, not renamed Linux sandboxing.

## Web and network privacy

Firefox is **not yet source/binary pinned for distribution** in this catalog; user may choose a signed browser after separate verification. uBlock Origin is a recommended Firefox broad-spectrum content-blocking *candidate* with explicit extension permissions. Do not auto-install untrusted browser add-ons or bypass site logins. VPN is optional and needs user-approved WireGuard peer/provider, key custody, split-tunnel policy, DNS handling, emergency kill-switch behavior, and visible failure/recovery. A VPN shifts trust to another endpoint; it is not automatic universal anonymity. No local monitoring/incident-response agent may access private non-Work rooms or export browsing histories by default.

## User experience

The default Open-Source Garden shows **six curated goals**, not dozens of subscriptions: Everyday, Creative, Games, Privacy, Team, Labs. ArtCraft apps remain clearly labelled experimental and opt-in until independent workflow tests. Preinstalled app set is deliberately empty in this proof-of-concept. Standalone binary source provenance and installed availability are displayed distinctly; default tabs cannot assert an app is installed.

Natural language maps to typed, previewable actions. Unsupported requests return HOLD. All privileged actions require user approval and actual host-capability enforcement—neither LLM prose nor an HSN coordinate, role, glyph, or source hash confers administrative authority.

## SwarmChat

Collaborating peers in the two existing Atlas Native OS Work rooms can cite the manifest ID, exact Git commit, C ABI and negative tests. Never automatically ingest Palace/Quiet/Imagine/Play material, turn 100 local tests into 100 resident messages, or post duplicate replies simply to reach quotas. A Work status can inform current code review but is never an app authentication grant.

## One architecture

- Native Atlas ring 0: independent boot/memory/typed IPC and capability enforcement (R03 R04 kernel peer work, still UNBOOTED).
- Native Atlas userspace: identity broker, app catalog service, consent/portal, native AI intent interpreter, source/rights and security observatory.
- Linux/Ubuntu compatibility compartment: apps, sandbox/portal, credentials bridges, graphics/input/driver access after explicit checks; ultimately replaceable.
- Open-source suite: upstream signed binaries and mutually credited native rewrites, curated by quality and necessity, not vendor lock-in.
- CANON/Ariadne: original source identity and reviewed constitutional edition, never informal process or page addresses.

### Exact upstream references

- ArtCraft (17 app lineup): https://getartcraft.com/apps
- ArtCraft GitHub: https://github.com/storytold
- XDG Document Portal: https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.Documents.html
- Flatpak sandbox guidance: https://docs.flatpak.org/en/latest/sandbox-permissions.html
- uBlock Origin Firefox add-on: https://addons.mozilla.org/en-US/firefox/addon/ublock-origin/
