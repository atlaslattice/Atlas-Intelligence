# Cross-project placement and reversible integration

| Atlas component | Existing exact source or peer | New R04 behavior | Acceptance / rollback |
|---|---|---|---|
| Original Atlas kernel R03 | PR81 old head `87c7bb9cc051633fecf495d66524e01c7f3ef04d`, kernel C unchanged | userspace native app plan with synthetic epoch/domain bridge | source-linked local tests; remove `programs/atlas-os-native-r04-oss` to roll back |
| Original Ariadne 12x12x12 | registry SHA `07533cf7…e5a6` | app IDs and physical frames **remain different namespaces** | no HSN role/identity changes |
| CANON144 R13 | manifest `0670fac3…3b0a` | source version and Work/private guard only | ratification/host activation held |
| Native instruction/English | R01 and R02 exact archives | `AOS_APP_PLAN_*` typed intents; no shell or command execution | malformed action HOLD; no install |
| Native capability/IPC | original R03 `aosk.c` | bounded local synthetic caller/epoch check; never authenticates external issuer | stale/revoked domain HOLD; real IPC wire still absent |
| SwarmChat Work collaboration | real hardware and convergence rooms | app provenance/selection plan for peer technical review | no automatic cross-mode ingestion or wakes |
| Atlas identity | conceptual, not implemented | per-app credential capability, opt-in standards federation | actual FIDO2/WebAuthn/OIDC host integration required |
| Atlas memory/knowledge | original source-only R17/Geometree | app provenance and pinned source manifest; no private Brain/Palace ingestion | provenance records not neural evidence |
| Open-source creative suite | ArtCraft official 17 apps + launcher | exact Git commits; sandboxed experimental pilot | licensing, release signatures and workflow quality pending |
| Office and cloud | LibreOffice, Nextcloud | mature candidate + optional external account | file roundtrip and server/cert identity acceptance |
| Browser and network | Firefox candidate, uBlock, WireGuard/Mullvad | content blocking candidate + opt-in VPN, no forced tracking | browser and package signatures, DNS, firewall, kill switch pending |
| Media, games, productivity | Krita/Kdenlive/Blender/OBS/Godot/Lutris/Heroic etc | curated categories with source pins; none preinstalled | file workflows, codecs/licensing and GPU drivers pending |
| Security and release | Native R03 and GitHub source lineage | fail-closed local planning only | no CI, actual verified binary delivery or real host egress yet |

All exact app revision hashes, GitHub metadata license classifications, package-provenance gaps and install status are in `catalog/apps_catalog.json`. The `SOURCE_METADATA_ONLY` marker means observed upstream GitHub license metadata, NOT a legal clearance for binary redistribution.
