# Atlas Native OS R04 peer handoff

**A** = original unchanged R03 native C kernel + 1,728 source-linked local tests (PR81). **B** = official ArtCraft 17 Rust app repos and established mature OSS compatibility. **C** = original R04 native C app-planning service, 37 candidates /36 pinned repo commits, Work/private/capability/credential/installer/browsing/VPN boundaries and an offline terminal-free library. No third-party implementation source copied.

Actual execution: 100 unique local app planning scenarios, 10 native R03 bridge invariants; GCC, Clang and ASan/UBSan output SHA identical; 64 browser checks over 2 viewports, zero network; import-free WASM; native C source linked unchanged with R03 `aosk.c`. No installs, login, VPN, release, model call, browser add-on installation, kernel boot or UI-wide auth.

**Peer challenge 1:** if the machine's biometric login succeeds, an unrelated website STILL needs its own origin-bound supported flow; reject token sharing or password injection. Test two unrelated OIDC clients where a token for A must not authorize B.

**Peer challenge 2:** experimental WordCraft uses a source HEAD SHA but no signed release artifact. Block auto-install even under user consent; verify package digest/signature, license/notice and file roundtrip first. A direct ArtCraft layout is not permission to copy protected third-party branded UI assets.

**Peer challenge 3:** source revocation/epoch drift during a queued install plan must HOLD at actual RETURN; a demo flag is not a trusted authorization proof. Native R03 kind255/reinit/record SHA limitations still open.

**Peer challenge 4:** a VPN profile must be explicitly enabled, with host-owned trust keys. No silent auto VPN, DNS assumption, or browser telemetry. When the provider goes down, the user sees a clear incident and a reversible privacy decision.

**Peer challenge 5:** 100 source review passes are NOT 100 SwarmChat messages/official MacroTurns; real stored replies require actual room capability, bounded quotas and new source-linked evidence.
