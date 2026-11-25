# Quality-first Atlas neural collaboration — source-only, opt-in decision review

**Status:** local proposal, not a serving-mode change. This module is a **supplement** to the existing MICA/Omega evaluation lanes. It never updates BGE weights, the original 1,728 identity map, the Work Learning index, a SwarmChat room, host permissions, or CANON.

## Architectural choice

1. Keep exact source/rights/revision and no-training-on-test gates **non-negotiable**.
2. Optimize **validated cross-domain quality first**: source-family-clustered nDCG@10, paired Hit@10/MRR, answer/citation and correct-abstention controls, and the per-House results. No source-family leakage into the evaluation cohort.
3. Evaluate **cold/warm p50/p95, throughput, memory, and optional real energy** separately against a frozen baseline. Slower is permitted when quality gain withstands independent checks and the real service still fits a declared hard resource ceiling.
4. Choose the cheaper/faster candidate where quality is not credibly better. Do not activate geometry for appearance, nor claim a neural performance breakthrough from a self-definition canary.
5. Carry source-linked counterexamples and dissent into the existing single Workboard and the selected core composer; no new scheduler, retriever, permission issuer, resident wake, or hosted deployment.

The implementation `atlas_neural_unified/quality.py` accepts **synthetic or explicitly source-declared** JSON-native score records, each containing a family, original House, source revision hash, exact candidate/baseline rank, paired latency, citation and correct-abstention flags. It does not accept text, model weights, raw private corpus or unscoped vectors. It requires all twelve Houses plus two distinct declared evaluation source families per House for a `FULL_12_HOUSES` claim, rejects overlap with known training families, bootstraps clustered House/family effects, rejects citation or abstention regression, and discloses all House-level losses. **It does not verify label truth, outside authorization or independent human review.** Its output never authorizes training or deployment, even if declared human-labeled.

The original installed Atlas Work Learning 0.2.0 selected geometric residual **alpha=0** on validation and preserved the original BGE ranker. The 144 source-definition canaries in the unified PR62 are identity checks, *not* evidence of held-out semantic generalization. Current narrow local timings found ~0.069ms baseline vs ~0.146ms routed, with no change in their top-1 identities. An authentic new held-out source-family/time-disjoint human-reviewed benchmark is required before enabling routing. The current corpus remains partial, with no automatic protected-mode import.

## Actual local evaluation gates

- Positive: a candidate improves a fully synthetic 12-House/24-family cohort while slowing paired p95. Verdict `REVIEW_QUALITY_GAIN_WITH_LATENCY_COST`, **not deployment**.
- Positive: the same synthetic gain without p95 cost. Verdict `REVIEW_QUALITY_GAIN_WITHOUT_P95_COST`, still review-only.
- Negative: candidate loses a previously correct citation/abstention; split-family leak; missing House coverage; subgroup quality loss; missing quality gain; excessive latency hard cap; malformed rank/score/data; altered source pin or mixed family. Each is a distinct hold/reject with no deployment privilege.
- All per-row metrics are **caller supplied** and can be manipulated before collection; the offline result is only coherence evidence. Real adoption requires a trusted frozen eval manifest, human-reviewed source-family-disjoint labels, actual allowed-source rights at time of use, independent replay on the exact selected MICA/Omega release, and release review in the existing host.

To run:

```bash
python -m unittest discover -s test -p 'test_quality.py' -v
python -c "from atlas_neural_unified.quality import review_quality_first,synthetic_quality_cohort; print(review_quality_first(synthetic_quality_cohort())['status'])"
```

## Collaboration handoff

**A:** Pinned MICA frozen BGE + existing Omega Work Learning + optional neural Geometree.

**B:** One native, source-bound quality-first *decision-review contract*, with a clustered family bootstrap and an explicit tolerance for latency costs when quality genuinely improves.

**C:** A falsifiable next selection experiment shared in **one** Atlas ONE/SwarmChat Workboard item with original source revisions, the exact BGE/true/shuffled/flat code pins, a source-disjoint evaluation protocol, quality and safety effects, p95 costs, losing House cases, author attribution, and rollback. No unearned adoption.

The next disproof test is a new human-reviewed cross-House cohort on which true Geometree routing **does not** improve source-family-clustered quality relative to flat and shuffled controls. If true, preserve the baseline (`alpha=0`) and keep the proposed geometry as an optional research lane. The same holds if authority, source rights or index consistency fail.
