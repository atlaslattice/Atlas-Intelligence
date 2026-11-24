# Atlas Neural META145 — Peer15 additive hardening handoff

**2026-11-24 — one actual ChatGPT Work visit, source-only / no host deployment.**

This is an additive child of Atlas Intelligence source-only PR #59 (commit `d13d04b9e7580118a1412da01a98b624f4407087`). No BGE weights, 24-question final silver panel, owner-private corpus, model inference, CANON or production ACL is modified. **Do not claim fifteen separate resident conversations or neural training runs**; the owner requested 15 individual live Work replies within a 30-message limit. Each reply must be individually useful and attributed to the actual self-declared participant.

## New, independently reproducible defects

Python original branch with the first 15 synthetic probes: **12 pass / 3 fail**:
1. Source lookup keyed `A` could return a trusted-looking record whose *actual* `sourceId` was `B`, because prior checks omitted `sourceId` at admission and postflight.
2. Python `isinstance(True,(int,float))` accepted boolean as a neural confidence score of one.
3. Identical exact source/revision/document candidates could occupy multiple result slots, making apparent `max_items` coverage worse.

Node.js original branch with 3 extra synthetic probes: **1 pass / 2 fail**:
4. Untrusted candidate property accessors could change identity between validation and projection.
5. The injected source adapter could return an accessor-based data record, again permitting re-evaluation of identity fields.

All five are repaired in this candidate using explicit ID checks, strict numeric scoring, selected exact-source deduplication, and rejection of accessor-based records. A 16th check inside the fifteen Python probes exercises **source-family train/validation leakage**; it is implemented as the new `eligible_training_pair_strict` test wrapper requiring a separately trusted split manifest. This does *not* make any caller-provided split map an authenticated permission or complete training eligibility attestation.

## Verification performed

- **50/50** Python tests (35 inherited + 15 new) in normal and `-O` modes.
- **25/25** Node tests (22 inherited + 3 new), real Node test runner, normal mode.
- **144/144** unchanged synthetic source-family evaluation outputs exactly match the original parent revision under its previously selected policy; no claim of a fresh model/ML result.
- Source hashes and test results appear in `results/PEER15_RECEIPT.json` and `results/INDEPENDENT_COMPATIBILITY.json`.

## Known holds

- Actual MICA `kit/pretrained-entry.mjs` remains owner-private/not mounted here. The source-only sidecar is **not** a host-attested permission service or substitute for Estuary/Cupwake's existing gateway work. The current real-host distinction between inference-use and disclosure-RETURN requires a trusted authoritative mapping; unknown purpose must HOLD.
- Current BGE retrieval quality, human family-disjoint evaluation, source rights, live host final egress and GitHub CI remain unverified.
- This candidate is about evidence-reference software correctness, not increasing a neural model's trained intelligence.
- No automatic training/export, source ingestion, room subscriptions, merge to main or deployment.

## Reproduce

```sh
PYTHONPATH=. python -m unittest discover -s tests -p 'test_*.py' -v
PYTHONPATH=. python -O -m unittest discover -s tests -p 'test_*.py' -q
node --test js/*.test.mjs
```

Compare the two patched source files with their exact parent Git blob IDs. The independent 144-case parity script in this owner workspace checks the original parent `src/evidence.py`; do not distribute private run paths as portable contracts.
