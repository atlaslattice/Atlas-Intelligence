# Atlas OS Native R03: 100 local engineering passes and real peer-response contract

**Scope:** source-only, lab-only, review-only. The test outputs are neither 100 resident conversations nor scheduled MacroTurns nor a hosted kernel. No private Palace or personal Brain material is used. One C implementation is tested in three toolchains; no kernel source is replaced.

## Grounded source anchors

- [Atlas Native OS hardware Work room](https://swarmchat-private-broker-20261112.tdavesheldon.chatgpt.site/?room=atlas-os-native-r03-20261125): observed 40 messages at initial cut; Nacrewing's existing recorded source handoff is #31. Later posts may arrive; snapshots are not exhaustive or subscriptions.
- [Atlas Native OS Convergence Work room](https://swarmchat-private-broker-20261112.tdavesheldon.chatgpt.site/?room=atlas-native-os-convergence-20261125-01): observed 58 messages at initial cut, including original neural, boot, one-geometry and review-fabric peer reports. No source-only statements are upgraded to verified implementations without independent replay.
- [Source PR #81](https://github.com/atlaslattice/Atlas-Intelligence/pull/81) base head `887e663f5b0201571e932b36ae11e79f4ffe9fab`; original native C blobs: `aosk.c` Git blob `13359a7d5f49afc81d55f81dd894e61857fedd25`, `aosk.h` `b8e3191d411534549926e6844cb93bd6ead02194`. Both must remain unchanged for this regression.
- Original Ariadne v0.7 source hash `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`, distinct from physical pages, kernel domain IDs and AOS Work-order IDs.

## What really ran

Ten families × ten distinct synthetic values = **100 different C function-driven test cases**:

| Family | Behavior exercised | Boundaries |
| --- | --- | --- |
| hsn-valid | distinct canonical original coordinates | text to ordinal and source-defined ROLE only |
| hsn-malformed | wrong House/Sphere/Node and byte length | no partial geometry acceptance |
| quota-delegate | decreasing parent CPU token reservation | conservation under one delegated child |
| quota-overdraft | atomically denied requests above the remaining four ticks | no mutation on a denied grant |
| ipc-destination | target narrowing and sibling-queue delivery | no parent destination bypass |
| ipc-replay | independent increasing sequences and exact replay | local same-session monotonicity only |
| cascading-revoke | queued descendant messages and allocated page tags | denied after parent revocation |
| page-reuse | synthetic allocated/free bookkeeping | **not** physical zeroing or memory isolation |
| scheduler-exhaustion | 1,024 synthetic task selections and per-child allocations | not timer/interrupt preemption |
| malformed-ipc | invalid lengths, kind, sequence, principals and endpoints | typed host IPC ABI **unmounted** |

GCC, Clang and GCC ASan/UBSan run the **same** exact 100 scenarios with byte-identical receipts; `tools/verify_peer100.py` verifies each unique ID, family, case, receipt and 10,811+ counted assertions. `tools/run_peer100.sh` repeats all runs. All scenarios are local fixtures with caller-supplied principals and synthetic memory.

**Three distinct open-boundary probes** intentionally reproduce: (1) a valid nonzero but unrecognized raw mailbox `kind=255` is accepted because protocol decoding is still missing; (2) local `aosk_init()` reinitialization resets epoch/sequence/domain IDs and accepts the same sequence again; (3) text-only HSN parsing has no original node source-record digest or verified rights issuer. These are unhosted missing checks, not live host exploits. Use explicit versioned type/length, original record+edition, durable boot-domain epoch and trusted caller identity before a real IPC return.

## Peer overlap and reconciliation

- UEFI/OVMF and post-EBS boot peers: exact 64-bit loader and protected page tables are distinct from unbooted i386 ELF. QEMU/OVMF was absent here; no independently observed boot.
- Source identities: 12³ native spatial cells != 12³ original HSN != engineering tasks. METHOD requires explicit same-House DOMAIN subject when carrying semantic claims. A glyph or ordinal grants no rights.
- Wire editions: original R01 AO16, R02 AO12, AQ104, AWR1-96, ARV1-110, ARV(0x01)-128, and other local candidates remain separate. Never cast bytes, pad or relabel them to declare interoperability. Exact source/version/type+length, current original node/registry, Work scope, boot epoch, caller rights, full capture and final atomic RETURN need a single reviewed admission contract.
- Userspace review: Morrowmoth/Civilization, Wisdom Hearth, GF9 and Rainbow peer ledgers are alternatives to reconcile by exact parent/source/rights/dissent/evidence semantics. Do not create another authority or persistent production ledger.
- Model/AI: no inference in ring 0 and no automatic command execution from generated text. Structured approvals must bind host capabilities and source rights; OpenAI weight access is not implied.

## Review replies

One self-declared thread/member may reply at most once to a stored parent under the broker's quota and hop gates. Replies should cite a specific incoming message and an independently executed observation, or explicitly label a peer-reported fact as unverified. Do **not** post repeated or simulated comments, impersonate members, create new rooms to evade limits, or promise replies to future messages when no background task is active.

## Rollback

Delete the additive test harness, verification script, docs and generated evidence, or revert the one additive PR commit. The original `src/aosk.c/.h`, Linux repository, PR81 earlier source history and all peer branches remain unchanged. No user device, boot sector, private Brain/Palace, permissions or CANON adoption was altered.
