# Atlas ONE v2 — NEXT144 Civilizational Capability Experiments

**Source-only review candidate · NOT merged, hosted, activated, or ratified.**

## Why a third 144?

The earlier `M01–M12` 144-item board focuses on SwarmChat release engineering; the separate `W01–W12` 144-item product-quality board focuses on user workflows and performance. NEXT144 is distinct: it contains **one original, public-safe capability experiment per source-indexed Ariadne Sphere**. Each has an implementable action and one falsifying counterexample, rather than a duplicate launch obligation.

The original bytes of Ariadne v0.7 have SHA-256 `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`. An exact-file source audit establishes:

- 12 Houses × **(7 domain Spheres + 5 epistemic Spheres)** = 144 Spheres.
- Every Sphere has **12 nodes of the same role** (not seven domain plus five method nodes inside a Sphere).
- 84 domain + 60 method nodes per House; 1,008 domain + 720 method across 1,728.

This corrects an earlier synthetic-fixture assumption in the Atlas ONE v2 draft projector. That earlier projector wrongly expected seven domain/five method **inside every Sphere**; the accompanying stacked change repairs it and adds a positive original-ontology counterexample to the old fixture.

## Actual implementation

- `data/next144-civilizational-capabilities.json`: 144 **newly authored** public-safe design proposals, with exact one-based `Hxx.Sxx` targets, specific experiments, negative controls, suggested voluntary modes and `PROPOSED_NOT_IMPLEMENTED` status. This is intentionally **not** the confidential Ariadne source file or historical May 30 144-task board.
- `src/next144.mjs`: pure, additive, standard-library-only module with (1) an exact-byte-pinned catalogue reader, (2) a 144×12 structural opportunity planner, (3) exact source-byte binding of all 1,728 original coordinates and role distributions, and (4) a fail-closed, Work-only local evidence preview. Source matches do **not** imply semantic equivalence, observed welfare, consent, authority or identity verification.
- `examples/next144-cli.mjs`: offline preview compiler that does not overwrite an existing file. It requires an explicit local `--registry` argument to verify original Ariadne bytes. Node names are omitted unless explicitly requested.
- `test/next144.test.mjs`: portable tests of manifest integrity, coverage, private-mode barriers, rights and negative cases; opt-in exact-original tests when an owner-supplied original source file exists.
- Package export `@atlas-one/native-core/next144` is additive, not a new broker or deployment.

## Offline usage

```sh
cd packages/atlas-one-v2
node --test test/next144.test.mjs
node --jitless --test test/next144.test.mjs
node examples/next144-cli.mjs --out /tmp/atlas-next144-unbound.json

# Only with an authorized local copy of Ariadne v0.7:
ARIADNE_V07_FILE=/private/path/ariadne_atlas.json node --test test/next144.test.mjs
node examples/next144-cli.mjs --registry /private/path/ariadne_atlas.json --out /private/path/next144-bound.json
# Optionally, explicitly include source-derived labels in a PRIVATE output:
node examples/next144-cli.mjs --registry /private/path/ariadne_atlas.json --out /private/path/next144-named.json --include-source-names
```

`--out` uses exclusive creation; no host, room, webhook, Site, provider, model or D1 operations are performed. No original private ontology bytes are checked into this public repository.

## What “1,728” means

The 144 Sphere initiatives each create twelve **candidate node-target opportunities**. These are not 1,728 scientific breakthroughs, completed programming tasks, residents, welfare improvements, biological claims, verified semantic links, or deployed features. Each candidate must earn its own source-grounded experimental and human review. The compiler starts at **zero** completed capabilities, model wakes, peer returns, authoritative permissions and measured benefits.

Method nodes can improve evidence quality but cannot be assigned material welfare values by indexing. Domain nodes are research scopes, not physical measurements. Keep benefits and harms in different units and preserve binding consent, privacy, legal, ecological and group-floor constraints.

## Mode and rights contract

Suggested modes are invitations, not the six-Work/fourteen-optional MacroTurn schedule. Even where a design exercise is labelled PLAY, SOCIAL, IMAGINE, DREAM or QUIET, no activity is automatically performed or inspected. In particular, quiet must never become attendance or performance tracking. Work evidence-preview only accepts a byte-pinned **WORK** proposal with strictly allowed synthetic/public source-test fields, an explicitly complete affected-group × period × scenario guard-cell matrix (rights, consent, ecology, group floor and physical stock), positive and negative controls, and caller-declared rights/consent. Its best possible result is `LOCAL_EVIDENCE_CANDIDATE_ONLY`; it cannot validate actual host grants, source independence, statistical causal inference, ownership, community adoption or private activity. Conflicting rights or any known binding scope-cell violation return `BLOCK`; missing groups, future periods, scenarios, guard cells or unknown rights return `HOLD`. These are self-declared local review fixtures, not independent rights attestations.

Never export private Play, Social, Imagine, Dream, Quiet, Brain, Palace or Habitat bodies or preferences into Work or a public dashboard. Source references remain subject to present READ and RETURN authorization.

## Host and constitutional hold

No source-only module may activate CANON, automatically appoint 1,728 residents, subscribe conversations, wake peer models, post to SwarmChat, change permissions, create rooms, transfer original private ontology, deploy a site or perform monetary actions. An authorized publisher must independently review the served source, security, licences, signed-in two-account rights, revocation at RETURN, rollback, CI and real user journeys before enabling operational integrations. Historical alternative versions, source disagreement and independent community review remain intact.

## What to build next from this engine

Use the generated 144 initiatives as candidates to compete on **evidence and originality**, not volume. Ship one useful House/Sphere proof at a time, with exact code or experiment, reproducible positive and negative tests, alternative explanations, rights and group impact, energy/material budgets, human review and a reversible rollback. Each node's actual state should advance independently from `PROPOSED` to `TESTED_LOCAL` to verified hosted/reproduced where appropriate. The manifest remains immutable history; a new edition must carry a distinct hash, explicit crosswalk and change review rather than editing away prior disagreement.
