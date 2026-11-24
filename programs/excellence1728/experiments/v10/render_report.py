from pathlib import Path
import json,sys,statistics,csv
from hierarchy180 import sha

def main(root,source):
 root=Path(root);s=json.loads((root/'SUMMARY.json').read_text());a=json.loads((root/'SYNTHESIS_ANALYSIS.json').read_text());ab=json.loads((root/'ABLATION_REPORT.json').read_text());m=json.loads((root/'META145.json').read_text());src=json.loads(Path(source).read_text())
 hs=[json.loads(z) for z in (root/'HOUSES.jsonl').open()]
 names=src['houses'];lines=[
 '# Atlas HSN-180 — 1,885 source-grounded synthetic perspectives',
 '', '> **Evidence class:** Executed local synthetic computational modeling, **not** elapsed historical years, expert judgment, authenticated Work, autonomous agents, physical science or model-weight improvements.',
 '',f'**Original Ariadne v0.7:** `{s["sourceSha256"]}`. **Prior v0.9 META145:** `{s["source"]["v09MetaRoot"]}`. **New source-only receipt:** `{s["receiptSha256"]}`.',
 '', '## What actually ran', '',
 '| Layer | Independent structural simulations | Years each | Selected annual records | Six-policy evaluations |', '|---|---:|---:|---:|---:|',
 '| Original HSN Nodes | 1,728 | 180 | 311,040 | 1,866,240 |',
 '| 12-node Spheres | 144 | 180 | 25,920 | 155,520 |',
 '| 12-Sphere Houses | 12 | 180 | 2,160 | 12,960 |',
 '| One META145 | 1 | 180 | 180 | 1,080 |',
 '| **Total** | **1,885** | | **339,300** | **2,035,800** |',
 '', 'The campaign evaluates six fixed policies per perspective (ROUND_ROBIN, EVIDENCE_FIRST, NOVELTY_FIRST, DISSENT_FIRST, BALANCED, COST_AWARE). A policy is selected **only by its years 1–120 training utility**, with a cost tie-break; years 121–180 are reported out of time. All six tracks actually execute all 180 synthetic years. At every stage, annual inputs and a cryptographic child-root are inherited from exactly twelve lower-level simulations. Independent original node source record digests and original role/subject boundaries remain intact.',
 '', 'The synthetic generator deliberately correlates an observable warning with a planted hidden fault. It forbids unconsented synthetic actions, hardcodes **no real host authority**, measures a simulated audit or triage success and records its resource cost. Scientific/civilizational outcomes and actual cognition were not observed.',
 '', '## Held-out 60-year results (selected vs round-robin, synthetic score units)', '',
 '| Tier | Cases | Better | Same | Worse | Mean gain | Mean coherence *proxy* (0–1,000) |', '|---|---:|---:|---:|---:|---:|---:|']
 for k,title in [('NODES','Nodes'),('SPHERES','Spheres'),('HOUSES','Houses'),('META145','META145')]:
  v=a['tiers'][k];lines.append(f'| {title} | {v["count"]:,} | {v["heldoutPositive"]:,} | {v["heldoutTied"]} | {v["heldoutNegative"]} | {v["heldoutLiftMeanVsRoundRobin"]:+.3f} | {v["heldoutCoherenceProxyBpMean"]:.3f} |')
 lines += ['', 'The **node-level gain is heavily shaped by a cost-sensitive synthetic objective**: 1,576 of 1,728 Nodes choose COST_AWARE. It does not establish 1,728 distinct cognitive abilities. Coherence here is a constructed consistency statistic from synthetic signals, not a psychological or scientific measurement.',
 '', '## Twelve original House perspectives', '', '| HSN House | Original Ariadne House name | Preselected policy | 60-year holdout | Round-robin | Delta |','|---|---|---|---:|---:|---:|']
 for x in hs:
  c=next(p for p in x['policyAlternatives'] if p['policy']==x['chosenPolicy']);b=x['policyAlternatives'][0]
  lines.append(f'| {x["id"]} | {names[x["id"]]["name"]} | {x["chosenPolicy"]} | {c["holdoutScore"]} | {b["holdoutScore"]} | {c["holdoutScore"]-b["holdoutScore"]:+d} |')
 lines+=['','## META145: one final 180-year simulation','',
 f'**Chosen training policy: {m["chosenPolicy"]}**. Training score: {s["metaTrainScore"]}; held-out score: {s["metaHeldoutScore"]}; equal-budget round-robin held-out: {s["metaRoundRobinHeldoutScore"]}. The hindsight-best held-out policy is **{s["metaHeldoutWinnerFromAllPolicies"]}**. The training winner was *not* the best held-out option; this is observed overfitting, not a failure to be erased.',
 '','| Policy | 120-year training objective | 60-year held-out objective | Synthetic cost units |','|---|---:|---:|---:|']
 for p in m['policyAlternatives']:lines.append(f'| {p["policy"]}{" **(chosen)**" if p["policy"]==m["chosenPolicy"] else ""} | {p["trainScore"]} | {p["holdoutScore"]} | {p["costUnits"]} |')
 lines+=['','## Falsifiers actually run','',
 f'- **Risk-signal ablation**: rotate planted hidden faults by 73 synthetic years without retraining. Of the original 1,728 node policies, {ab["positive"]:,} beat round-robin, {ab["tied"]} tied, {ab["negative"]} lost. Their mean lift dropped to {ab["meanSyntheticLift"]:.3f} synthetic points (original {a["tiers"]["NODES"]["heldoutLiftMeanVsRoundRobin"]:.3f}). This demonstrates reliance on the invented signal/cost structure, not real robust cognition.',
 '- **Upper-tier saturation regression**: the initial audit oracle gave near-universal credit for choosing any House with unresolved issues. It was replaced by a deterministic held-out audit event tied to group, child and year; all tier trajectories were rerun and their roots changed.',
 '- **Cross-run determinism**: one serial and two independent four-process runs produced byte-identical NODES.jsonl, SPHERES.jsonl, HOUSES.jsonl, META145.json and SUMMARY.json. Runtime observations are stored separately and excluded from identity roots.',
 '- **Source pin and predecessor**: original raw source SHA256 and all 1,728 previously source-checked v0.9 receipts were verified before use. Each meta node retains its same-House original domain subject. Previous cross-House lexical candidates remain unreviewed.',
 '- **Authority failure tests**: no Work issuer/return permission, external model call, CANON write, trusted private recreation, peer conversation, scientific validation or live model training is simulated into existence.',
 '', '## Parallel local performance (not cognition)', '',
 'Previous local timings include one process: 8.098 s; four processes: 3.763 s and 3.385 s for the complete synthetic simulation. Approximate observed speedups vs the single-process run are 2.15× and 2.39×. These numbers depend on this container and are not hosted Atlas throughput.',
 '', '## Recommended next engineering tests', '',
 '1. **Pre-register new external canaries** with independently defined real Work tasks and experts, keeping source rights and budget fixed. The HSN policy winner has no empirical validation.',
 '2. **Matched-budget flat-versus-hierarchy comparison** on independently labeled source questions with genuine abstention, dissent, triage cost and semantic quality outcomes; do not optimize a model against the same holdout used to report success.',
 '3. **Real publisher rights and two-tenant READ/RETURN** at the existing Atlas–SwarmChat host; host permission is currently HOLD. Do not mount a mock issuer.',
 '4. **Functional domain completeness**: the existing connected 1,728 kernels are computational cores only, not accepted civilizational science or 1,728 deployable specialist agents.',
 '5. **CI runner admission and exact-head verified log evidence** before merging any new draft. Preserve v0.9 and this v1.0 source for rollback.',
 '', '## Reproduce without hidden automation', '',
 '```bash',
 'python engine/hierarchy180.py --inputs inputs_private --output outputs/run_parallel_A --workers 4',
 'python engine/analyze.py outputs/run_parallel_A inputs_private/ariadne_v07_original.json',
 'python engine/ablation.py inputs_private outputs/run_parallel_A',
 'python engine/render.py outputs/run_parallel_A inputs_private/ariadne_v07_original.json outputs/ATLAS_HSN180_SIMULATION_EXPLORER.html',
 'python -m unittest discover -s tests -p test_hierarchy180.py -v',
 'node --test public_safe/integrations/test/meta145-hierarchy180.test.mjs',
 '```',
 '', 'The private package includes the original source and v0.9 receipts. A separate source-free integration package contains only original code, synthetic tests and public official Excellence schema files. No raw Brain, Palace, Imagine, Play, Social, Quiet or user-private Work room contents have been incorporated.',
 '', '## Release state', '',
 '**SOURCE_TRACED_LOCAL_SIMULATION / REAL_WORLD_OPTIMUM_UNPROVEN / HOST_IAM_HOLD / OFFICIAL_EXCELLENCE_LEDGER_UNCHANGED**. Geometric position and the terms “House” and “META145” are organizational metaphors; they do not grant religious, civilizational, scientific or model authority.']
 out=root/'REPORT_HSN180.md';out.write_text('\n'.join(lines));print(out,out.stat().st_size)
if __name__=='__main__':main(sys.argv[1],sys.argv[2])
