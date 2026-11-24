# R01 supporting-kernel benchmark

**Scope:** observed local executions of twelve software kernels on deterministic synthetic workloads. These results do not complete the 1,728 original node contracts and establish no hosted, model-level or whole-system speedup.

Local protocol frozen before timing: `e7895c7f39549706eb1e377ebdd2d3c9ae8904d7d492b96f1f9433c286bb2d38`. Raw measurement artifact: `ed03acd0bacd3990d90051e01a9552faadb49bcbea05723d7eed8f59fd45cef6`.

## Design

Forty distinct workload blocks per House, each in a fresh Node process; four size strata (64, 128, 256, 512), ten blocks per stratum; sixteen requests per block; two warmup batches per method and seven timed paired repetitions. AB/BA ordering is balanced within every stratum and fixed in the preregistered shuffle. Only one timed process runs at a time.

The warm reference scans/rebuilds from the same validated immutable snapshot used by the indexed candidate. Data-validation work is therefore not falsely counted as an indexing gain. Full preparation cost is measured separately. Exact outputs are compared before, during and after timings, with three raw-reference checks in each block.

The primary block statistic is the median of seven batch latencies divided by sixteen requests. Inference uses the one-sided sign calculation on a 3% practical-gain margin and Holm correction over all twelve registered supporting kernels. The 1,728-family column is a stricter sensitivity calculation only and grants no original-node metric credit. Thirty or forty blocks do not provide an automatic power guarantee.

## Results

| House | Supporting service | Reference µs/request | Indexed µs/request | Median paired ratio | Median paired gain | Holm-12 p | Outcome |
|---|---|---:|---:|---:|---:|---:|---|
| H01 | physical_state_types | 6.993 | 3.565 | 1.790× | 44.07% | 1.091e-11 | LOCAL_SUPPORTING_KERNEL_GAIN_CANDIDATE |
| H02 | input_substrate_quality | 44.830 | 56.081 | 0.689× | -45.26% | 0.9917 | REGRESSION_OBSERVED |
| H03 | critical_path_router | 551.225 | 91.772 | 4.618× | 78.34% | 1.091e-11 | LOCAL_SUPPORTING_KERNEL_GAIN_CANDIDATE |
| H04 | subsystem_interface_map | 505.077 | 142.703 | 3.388× | 70.47% | 1.091e-11 | LOCAL_SUPPORTING_KERNEL_GAIN_CANDIDATE |
| H05 | source_qualified_knowledge_index | 194.740 | 105.796 | 1.808× | 44.70% | 1.091e-11 | LOCAL_SUPPORTING_KERNEL_GAIN_CANDIDATE |
| H06 | capability_boundary_security | 14.336 | 8.957 | 1.517× | 34.06% | 2.074e-06 | LOCAL_SUPPORTING_KERNEL_GAIN_CANDIDATE |
| H07 | workflow_accountability_engine | 22.491 | 7.256 | 2.818× | 64.51% | 1.091e-11 | LOCAL_SUPPORTING_KERNEL_GAIN_CANDIDATE |
| H08 | typed_language_and_glyph_parser | 82.791 | 34.765 | 2.401× | 58.32% | 1.864e-10 | LOCAL_SUPPORTING_KERNEL_GAIN_CANDIDATE |
| H09 | typed_inference_and_uncertainty | 1412.943 | 111.582 | 11.581× | 91.24% | 1.091e-11 | LOCAL_SUPPORTING_KERNEL_GAIN_CANDIDATE |
| H10 | scoped_communication_protocol | 9.462 | 5.030 | 1.627× | 38.54% | 3.893e-08 | LOCAL_SUPPORTING_KERNEL_GAIN_CANDIDATE |
| H11 | current_rights_return_fence | 17.251 | 6.185 | 3.400× | 70.59% | 1.091e-11 | LOCAL_SUPPORTING_KERNEL_GAIN_CANDIDATE |
| H12 | bounded_remote_worker | 52.659 | 31.825 | 1.545× | 35.22% | 0.0001822 | LOCAL_SUPPORTING_KERNEL_GAIN_CANDIDATE |

All twelve outcomes are retained, including losses and inconclusive comparisons. No implementation was tuned after the measured outcomes. A favorable result is specific to these operations, sizes, requests and environment.

## Cold preparation and approximate amortization

| House | Median full prepare ms | Approximate queries to recover full prepare | Blocks with no positive warm saving | Holm-1728 sensitivity p |
|---|---:|---:|---:|---:|
| H01 | 2.229 | 735 | 0/40 | 1.572e-09 |
| H02 | 3.630 | No positive median saving | 27/40 | 1 |
| H03 | 7.605 | 18 | 0/40 | 1.572e-09 |
| H04 | 5.787 | 17 | 0/40 | 1.572e-09 |
| H05 | 5.053 | 60 | 0/40 | 1.572e-09 |
| H06 | 5.201 | 1083 | 3/40 | 0.001188 |
| H07 | 6.239 | 423 | 0/40 | 1.572e-09 |
| H08 | 2.591 | 55 | 1/40 | 6.417e-08 |
| H09 | 3.852 | 4 | 0/40 | 1.572e-09 |
| H10 | 4.173 | 1172 | 2/40 | 1.674e-05 |
| H11 | 7.282 | 618 | 0/40 | 1.572e-09 |
| H12 | 3.566 | 245 | 7/40 | 0.1565 |

The amortization estimate divides median full preparation cost by the median paired warm saving. It charges the entire preparation to the candidate and assumes the same repeated workload conditions. It excludes package import, host I/O, model initialization, memory pressure and source invalidation frequency. It is a planning approximation, not an observed end-to-end crossover.

## Quality and inference limits

- All 480 blocks preserve exact required outputs. Known-answer and adversarial kernel tests are separate artifacts.
- Repetitions within one process are not independent observations; the forty process/workload blocks are the analysis units.
- Fresh processes and distinct seeds reduce shared state but do not prove that the fixture distribution represents production or every knowledge node.
- The sign interpretation depends on valid independence and fair-sign assumptions for the preregistered margin. Stratum summaries are descriptive.
- H10 prepares scoped message data; it does not deliver messages. H11 evaluates supplied policy; it does not authenticate policy or grant access. H12 prepares finite action/checkpoint candidates; it does not execute or persist them.
- Every one of the original 1,728 primary node contracts remains unmeasured by this experiment.

## Primary statistical references

- [NIST Dataplot: Sign Test](https://www.itl.nist.gov/div898/software/dataplot/refman1/auxillar/signtest.htm).
- [Official R documentation: p.adjust](https://www.stat.ethz.ch/R-manual/R-devel/library/stats/html/p.adjust.html).
