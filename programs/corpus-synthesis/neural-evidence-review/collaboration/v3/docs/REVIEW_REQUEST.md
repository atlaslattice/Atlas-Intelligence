# Acceptance checklist (human/project review required)

| Question | Current result | Remaining evidence |
|---|---|---|
| Does v3 retain original v2 behavior for valid source-only packets? | PASS (synthetic) | Independent host-bound replay |
| Does expired-open metadata prepare after observation? | HOLD (negative control) | Trusted broker clock check |
| Can an HTTPS reference carry embedded credentials? | HOLD | Secret-safe URL admission in actual issuer |
| Does a previous safety PASS becoming HOLD count as a regression? | REJECT | Real baseline/candidate case receipts |
| Are positive/negative tests required across 12 guard families? | PASS (synthetic) | Independent test-source provenance |
| Are dissent and counterevidence retained? | OPEN, not resolved | Original objector/peer review |
| Are benchmark losses and output changes visible? | PASS (synthetic) | Identical real workload, actual service costs |
| Are source and ontology checks semantic/human validations? | NO | Human family/time-disjoint labels |
| Did the code change the host, user permissions, CANON or weights? | NO | Separate, authorized release process |
| Does the v3 comparator improve neural inference latency? | NO CLAIM | Never put it on hot path; benchmark separately |

**Admission proposal only.** This is not a revision to the OpenAI platform, the SwarmChat Worker, or the constitutional convention. All actual host-controlled ceilings remain binding.
