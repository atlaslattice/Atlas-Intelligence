# Executable engineering program core

This Python standard-library package compiles and validates the authored 1,728-step engineering program. It provides dependency and resource scheduling, an evidence ledger, qualified result reuse and a META145 integration manifest. The delivered program contains **1,728 planned steps and zero completed production steps**. The synthetic test suite exercises the machinery without changing those counts.

## Run from the project directory

```bash
PYTHONPATH=runtime python3 -m excellence1728 validate outputs/ATLAS_EXCELLENCE_1728_PLAN.json
PYTHONPATH=runtime python3 -m excellence1728 task outputs/ATLAS_EXCELLENCE_1728_PLAN.json EX.W01.C01.P01
PYTHONPATH=runtime python3 -m excellence1728 search outputs/ATLAS_EXCELLENCE_1728_PLAN.json memory --limit 8
PYTHONPATH=runtime python3 -m excellence1728 ready outputs/ATLAS_EXCELLENCE_1728_PLAN.json --total-units 36 --limit 12
PYTHONPATH=runtime python3 -m excellence1728 meta145 outputs/ATLAS_EXCELLENCE_1728_PLAN.json
python3 -m unittest discover -s tests -p test_engine.py -v
```

Plans are stored as exact canonical UTF-8 JSON, sorted by key, without whitespace or a trailing newline. The plan file's SHA-256 is therefore also `validate_plan(plan)["plan_sha256"]`. Command-line validation rejects a noncanonical representation. The original Ariadne source is independently identified by its exact source digest. Its coordinates describe source coverage; engineering coordinates do not become Ariadne identities through matching index positions.

## Public Python interface

```python
from excellence1728 import (
    load_json, validate_plan, read_task, query_tasks,
    WorkBudget, ready_tasks, aggregate_meta145,
)

plan = load_json("outputs/ATLAS_EXCELLENCE_1728_PLAN.json")
validation = validate_plan(plan, expected_sha256="47084b895a6317db16275a92c3878a340d31af15fb9ab479db7101953c18e49c")
task = read_task(plan, "EX.W01.C01.P01")
results = query_tasks(plan, "memory", limit=8)
batch = ready_tasks(plan, budget=WorkBudget(total_units=36, max_ready=12))
meta = aggregate_meta145(plan)
```

`ready_tasks` reports dependency and budget readiness. It also serializes conflicting source writes by their explicit resource identities. It does not grant host execution. The one-third Work allocation applies to the scheduler's declared budget units; the remaining units are not counted as resident Play, Imagine, Quiet or Social activity. A planned batch completes no genuine Macroturn.

`compile_plan(catalog, phases, source_inventory, coverage, canon_reference=...)` consumes the catalog's 144 capabilities and 12 engineering phases. It renders 1,728 distinct artifact paths, expands the phase DAG and attaches prerequisite-capability completion to implementation phase P04. Phase-specific acceptance is separate from the final capability contract. Baseline reuse and `NO_CHANGE_REQUIRED` can satisfy a step when the host's acceptance evidence establishes the condition; neither implies a new performance gain.

## Evidence transitions

The ledger implements `PLANNED → RUNNING → IMPLEMENTED → VERIFIED → INTEGRATED`, with explicit `BLOCKED` and `INVALIDATED` states. Dependencies must be verified before the next step starts. A mutable plan status, caller-written success string, unauthenticated receipt or duck-typed runner cannot establish completion.

The host constructs an `AcceptanceRunner` using:

- The exact plan.
- A plain JSON policy with schema `atlas.excellence.runner-policy.v1`, the exact `plan_sha256`, allowed source roots, source-ID-to-path bindings and registered task/stage/check definitions.
- An independently selected policy digest.
- A host-held receipt key containing at least 32 bytes.
- An optional current permission callback for a real host integration. Without it, receipts explicitly identify an offline local-policy context.

Checks may inspect file existence, JSON syntax, Python syntax and declared text assertions. An explicit host-selected command uses a fixed argv, no shell, a restricted environment, a maximum 60-second timeout and at most 1 MiB of output. Command policies must pin the executable bytes and declare nonempty implementation/test artifact paths with exact hashes. Existing file arguments must appear in those pins. Sources, artifacts and executables are checked before and after execution and whenever old evidence is reused. Task text supplies no executable command.

Command execution is **not an operating-system sandbox**. The host must review its selected command and include all output-affecting code and data dependencies. The HMAC detects external receipt tampering within that host trust context. It does not authenticate the project owner and does not protect against malicious code already executing inside the trusted Python process, reading its key, rewriting its methods or invoking its internal signing methods. The explicit policy and process boundary supply that authority.

An empty check registry is the truthful default for a delivered engineering plan. It permits inspection and planning while preventing fabricated implementation receipts. The local tests use synthetic registered policies; those registrations do not register production acceptance for any real task.

`EvidenceLedger` retains signed, hash-linked events. Restoring a ledger requires the exact externally retained export digest and the same receipt authority. That digest is a caller-supplied checkpoint, not an independent host rollback witness. A source or implementation change invalidates affected work and downstream dependencies. Historical evidence remains in the event sequence.

## META145 integration

`review_perspective(plan, ledger, sphere_id, task_ids)` issues a **local source/evidence coverage receipt** for verified task IDs. It does not claim that an independent resident, professional expert or scientific reviewer completed a review. Each receipt binds the exact original Sphere, plan and ledger checkpoint.

`aggregate_meta145` produces all 144 source perspective slots, 12 original House coverage summaries and the 145th integration manifest. Full local integration readiness requires 144 distinct valid perspective receipts, 1,728 verified tasks, a reviewed-task union covering all 1,728 tasks, no conflicting artifacts and no unapproved measurement regression. Having every Sphere repeatedly review the same task is insufficient.

Every measurement identifies its metric, unit, direction, statistic, paired baseline/candidate values, workload digest, environment digest, scope and at least three repetitions. Incompatible measurement contexts remain separate groups. Unmeasured work, regressions, documented no-gain outcomes and qualified gain candidates are separate outputs. No-change outcomes are excluded from gain candidates. Speedup ratios are never multiplied, and no global speedup, semantic identity, canon amendment, hosted permission or completed resident Macroturn is inferred.

## Functional memory

`FunctionalMemory` keys reusable results by exact input, implementation, source, policy and scope identities. It authenticates stored payloads, bounds storage and returns copies. Host-provided current-dependency and current-permission callbacks are checked at the start and immediately before returning a cached value. Permissions are never cached. A changed source, implementation or current permission causes a refusal or invalidation instead of a stale successful answer.
