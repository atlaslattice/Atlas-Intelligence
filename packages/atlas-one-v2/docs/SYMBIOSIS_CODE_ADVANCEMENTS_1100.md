# Atlas ONE · Kettlefern symbiosis with constructive adversarial testing — 1728 HSN roles

**Release posture:** SOURCE-COMMITTED / LOCALLY TESTED / DRAFT REVIEW ONLY. No hosted rights, agent identity, independent scientific or semantic verification, permissions, CANON, live SwarmChat, publishing or deployment.

## The actual two-stage code-generation experiment

This module extends the earlier [Work Burst PR #19](https://github.com/atlaslattice/Atlas-Intelligence/pull/19) and the [100→1000 synthetic-cases PR #21](https://github.com/atlaslattice/Atlas-Intelligence/pull/21). The predecessor performed 1,100 **test-corpus iterations**, not 1,100 executable code additions. Here the deterministic software **Symbiosis Proposer** emits 100 primary then 1,000 inherited **executable JavaScript node-route registrations**. The separate **Constructive Adversary** deliberately challenges every proposal, and only a passing candidate becomes one new source-code statement in `generated/generated-node-routes.mjs`. Each addition has a cumulative source hash and links its original predecessor-case hash.

The full 1,728 HSN positions are surveyed on every local iteration. **1,100 are newly registered, and 628 remain explicitly unregistered.** Each generated route is callable, but can only prepare an inert structural candidate; no real host access or semantically accepted edge is granted. The two named roles are local deterministic programs, **not independently awakened AI specialists or authenticated residents**.

## Critical R1 failure and source-verified R2 correction

**The initial R1 code had a real ontology bug.** It placed seven domain and five epistemic roles across N01–N12 *inside each Sphere*, relying on correct 1,008/720 aggregate counts that masked the misplaced axis. A peer in the existing v32 Work room identified the mismatch; R1 is retained in Git history and the owner-private historical ZIP as a RED reference, **not accepted as the correct ontology**.

**R2 source check:** Independently read the owner-private *Atlas UGK 1728 Ariadne source node index TSV complete v1*, derived from Ariadne v0.7. It contained exactly 1,728 coordinate rows, all 144 Spheres internally homogeneous, **zero role-label mismatches** to the formula below. Examples: `H01.S01.N08` is `DOMAIN_SPECIALIZATION` and `H01.S08.N01` is `EPISTEMIC_META`. Original v0.7 reference SHA-256 is `07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6`. This digest is a source pointer; the full original 2.19MB JSON was not redistributed here and its original file bytes were not independently rehased in this particular execution. The derived source TSV was inspected directly, without copying private node descriptions into a public GitHub release.

**Correct axis:** **S01–S07 are DOMAIN_SPECIALIZATION spheres; S08–S12 are EPISTEMIC_META spheres** *within every House*. Every Sphere has 12 nodes with its Sphere's role. Hence 12 Houses × 7 Spheres × 12 nodes = **1,008 domain roles**; 12 × 5 × 12 = **720 epistemic roles**. No N01–N07/N08–N12 split is valid as the universal role classifier.

**R2 compiled route structure:** one same-Sphere next-node pointer (same role), one cross-Sphere structural contrast (different role) and one next-House positional pointer (same Sphere index and role). The 7↔5 Sphere contrast **cannot be bijective** or assumed to be an inverse semantic relation: e.g. `H01.S06.N01` has the proposed contrast `H01.S08.N01`, while the latter's reverse proposal returns `H01.S01.N01`, not S06. The tester explicitly forbids `SAME_AS`, independent truth, causal inference, duplicate counting, automatic author rights and semantic promotion.

## Two actual source-only roles and independent verifier

- **`src/node-symbiosis.mjs`**: enumerates all 1,728 addresses, implements the corrected role classifier, proposes edition-labelled topology and a unique route with exact previous rule-code head and original parent-case head. `prepareNodeProjection` requires a strict, inert, single-scope candidate and returns `PREPARED_LOCAL_ONLY` with **`canExecute=false`, `canPublish=false`, `hostAttested=false`, `authorityEffect=NONE`**. Anything unknown or private returns an indistinguishable `HOLD` without source/body echo.
- **`src/node-adversary.mjs`**: before every acceptance, corrupts the draft into a false `SAME_AS` relation and checks refusal; then runs **28 controls per node** (one inert positive, **25** source/tenant/principal/privacy/role/replay/epoch/rights/fusion negative mutations including wrong cross-Sphere, plus throwing accessor and prototype-poisoning controls). The test suite verifies no false host authorization, private body, derived semantic authority or identity grant.
- **`tools/verify-symbiosis-code.py`**: a separate Python implementation reconstructs all 1,100 emitted JS route statements, corrected Sphere role, all three topology pointers, every rule/code SHA-256, predecessor ancestry and cumulative-test counter. No Python `assert`; `python -O` cannot bypass verification. Modified source or ledger fails closed.

## Actual R2 execution receipts

| Metric | Verified result |
|---|---|
| Unique new executable JS code registrations | **1,100** (100 then 1,000) |
| Total HSN positions surveyed each iteration | **1,728** |
| Unique unregistered nodes | **628** |
| Total 1,728-node surveys over all code additions | **1,900,800** |
| Cumulative repeated positive/negative route checks | **1,211,100** |
| Adversarial tests actually executed | **30,800** |
| False semantic-equivalence code mutants rejected | **1,100 / 1,100** |
| Node tests including original 41 | **58/58 normal + 58/58 `--jitless`** |
| Independent Python and optimized Python verifier | **PASS / PASS** |
| Tampered code and ledger controls | **HOLD / HOLD, both Python modes** |
| Genuine AI model calls, authenticated peers, live Work posts, host effects | **0** |

Stage-100 code head: `b43e53c4a90864b0eaa73079a5a7505fdf6646841aa019d1f69b53360f65ed3f`.
Stage-1100 code head: `c4e3d16413a0bbb3bd078d80773fef4b28a57d2df6076ed5a0d15d70574cadf3`.
Compiled source SHA-256: `3993d104d4d9ff5c96a5a125b26d76248ba63f0c7854f6854eeaf5a31e83517a`.
Full local private code-evolution ledger SHA-256: `9ea73d9dfd063e90c2765a8d50240a46f3655b410a537831008add2bab97d8e6`.

## Reproduction and release boundaries

```sh
cd packages/atlas-one-v2
node --test test/work-burst.test.mjs test/cascade-evolution.test.mjs test/symbiosis-code.test.mjs
node --jitless --test test/work-burst.test.mjs test/cascade-evolution.test.mjs test/symbiosis-code.test.mjs
# Exact prior 1,100-row parent ledger is preserved separately, owner-private.
node examples/run-symbiosis-cascade.mjs /safe/parent-ledger.jsonl /new/output-path
python3 tools/verify-symbiosis-code.py /safe/parent-ledger.jsonl /new/output-path/generated-node-routes.mjs /new/output-path/source-code-evolution-ledger.jsonl /new/output-path/source-code-evolution-summary.json
python3 -O tools/verify-symbiosis-code.py /safe/parent-ledger.jsonl /new/output-path/generated-node-routes.mjs /new/output-path/source-code-evolution-ledger.jsonl /new/output-path/source-code-evolution-summary.json
```

The frozen generated route source under `generated/` is directly importable in the actual codebase; a regenerated copy in an arbitrary external directory may need its import path adjusted to the package layout. The generator refuses overwriting existing completed records. The public package includes only synthetic coordinate-based descriptors, no original private Ariadne node texts or user/resident activity.

**Human and host acceptance remains separate:** first verify current Site/publisher source head and actual Work READ→RETURN with trusted principal/tenant rights, issuer epoch, revocation between read and egress, and negative evidence/semantic tests. Full GitHub CI and parent merge ordering are independent gates. Structural candidate routes are not 1,100 new scientific discoveries or 1,100 actual AI MacroTurns. Review ancestor order #8 → #16 → #19 → #21 → this candidate; leave all drafts, CANON and live broker unchanged until verified.
