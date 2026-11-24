"""144 source perspectives, 12 House coverage receipts, one qualified build.

A local evidence aggregation is not an autonomous resident or a completed
Macroturn. It also cannot confer scientific truth or host authority.
"""
from __future__ import annotations

from .model import ProgramError, canonical_bytes, strict_loads, digest, validate_plan
from .ledger import EvidenceLedger, COMPLETE
from .runner import AcceptanceRunner, validate_measurement


def review_perspective(plan: dict, ledger: EvidenceLedger, sphere_id: str, task_ids: list[str]) -> dict:
    """Issue a local source/evidence review, explicitly distinct from a peer opinion."""
    checked = validate_plan(plan)
    if type(ledger) is not EvidenceLedger or ledger.plan_sha256 != checked["plan_sha256"]:
        raise ProgramError("Perspective requires this plan's genuine evidence ledger")
    if sphere_id not in plan["coverage"]["ariadne_sphere_ids"]:
        raise ProgramError("Unknown original Sphere coordinate")
    if type(task_ids) is not list or not task_ids or len(task_ids) != len(set(task_ids)) or len(task_ids) > 1728:
        raise ProgramError("Perspective requires a bounded explicit task set")
    snapshot = ledger.snapshot()
    if any(snapshot["states"].get(t) not in COMPLETE for t in task_ids):
        raise ProgramError("Perspective cannot accept unverified tasks")
    runner = ledger._runner
    if type(runner) is not AcceptanceRunner:
        raise ProgramError("Invalid evidence authority")
    payload = {"schema": "atlas.excellence.perspective-receipt.v1", "sphere_id": sphere_id,
               "plan_sha256": checked["plan_sha256"], "ariadne_source_sha256": plan["coverage"]["ariadne_source_sha256"],
               "task_ids": sorted(task_ids), "ledger_checkpoint_sha256": digest(ledger.export()),
               "review_kind": "LOCAL_EVIDENCE_AND_SOURCE_REVIEW", "semantic_crosswalk_accepted": False,
               "independent_reviewer_identity_verified": False, "host_authority_granted": False}
    return runner._seal(payload)


def aggregate_meta145(plan: dict, ledger: EvidenceLedger | None = None, perspective_receipts: list[dict] | None = None) -> dict:
    checked = validate_plan(plan)
    perspectives = perspective_receipts or []
    if type(perspectives) is not list or len(perspectives) > 144:
        raise ProgramError("At most 144 perspective receipts may enter a build")
    if ledger is None:
        if perspectives:
            raise ProgramError("Perspective evidence requires a ledger")
        states = {t["id"]: "PLANNED" for t in plan["tasks"]}
        rows = {}
        export_hash = None
    else:
        if type(ledger) is not EvidenceLedger or ledger.plan_sha256 != checked["plan_sha256"]:
            raise ProgramError("Wrong integration ledger")
        states = ledger.snapshot()["states"]
        rows = ledger._records()
        export_hash = digest(ledger.export())
    accepted = {}
    for envelope in perspectives:
        record = ledger._runner._unseal(envelope)
        sphere = record.get("sphere_id")
        if record.get("schema") != "atlas.excellence.perspective-receipt.v1" or sphere not in plan["coverage"]["ariadne_sphere_ids"] or sphere in accepted:
            raise ProgramError("Missing, duplicate or unknown Sphere receipt")
        if record.get("plan_sha256") != checked["plan_sha256"] or record.get("ariadne_source_sha256") != plan["coverage"]["ariadne_source_sha256"]:
            raise ProgramError("Perspective source or plan changed")
        if record.get("ledger_checkpoint_sha256") != export_hash:
            raise ProgramError("Perspective ledger checkpoint is stale")
        if record.get("review_kind") != "LOCAL_EVIDENCE_AND_SOURCE_REVIEW" or record.get("semantic_crosswalk_accepted") is not False:
            raise ProgramError("Perspective evidence may not assert semantic identity")
        if type(record.get("task_ids")) is not list or not record["task_ids"] or any(states.get(t) not in COMPLETE for t in record["task_ids"]):
            raise ProgramError("Perspective references unverified work")
        accepted[sphere] = record
    eligible_ids = sorted({t for p in accepted.values() for t in p["task_ids"]})
    artifacts = {}
    conflicts = []
    measurements = []
    outcomes = {task_id: set() for task_id in eligible_ids}
    for task_id in eligible_ids:
        for stage, evidence in rows[task_id]["receipts"].items():
            record = ledger._runner.verify(evidence, task_id, stage)
            outcomes[task_id].update(check.get("outcome", "CHECKS_PASSED") for check in record["checks"])
            for path, sha in record["artifact_sha256"].items():
                if path in artifacts and artifacts[path]["sha256"] != sha:
                    conflicts.append({"artifact": path, "tasks": [artifacts[path]["task_id"], task_id]})
                artifacts[path] = {"sha256": sha, "task_id": task_id}
            for row in record.get("measurements", []):
                validate_measurement(row)
                measurements.append({"task_id": task_id, "stage": stage, **row})
    groups = {}
    for row in measurements:
        identity = {k: row[k] for k in ("metric", "unit", "direction", "statistic", "workload_sha256", "environment_sha256", "scope")}
        key = digest(identity)
        item = {**row, "delta": row["candidate"] - row["baseline"]}
        item["improved"] = row["candidate"] < row["baseline"] if row["direction"] == "lower" else row["candidate"] > row["baseline"]
        if row["baseline"] > 0 and row["candidate"] > 0:
            item["ratio"] = row["baseline"] / row["candidate"] if row["direction"] == "lower" else row["candidate"] / row["baseline"]
        else:
            item["ratio"] = None
        groups.setdefault(key, {"comparison_identity": identity, "observations": []})["observations"].append(item)
    sphere_rows = [{"sphere_id": s, "status": "LOCAL_EVIDENCE_REVIEWED" if s in accepted else "PENDING_SOURCE_REVIEW",
                    "reviewed_task_count": len(accepted[s]["task_ids"]) if s in accepted else 0} for s in sorted(plan["coverage"]["ariadne_sphere_ids"])]
    houses = [{"house_id": h, "sphere_total": 12, "reviewed_spheres": sum(s.startswith(h + ".") for s in accepted),
               "status": "LOCAL_COVERAGE_COMPLETE" if all(h + f".S{i:02}" in accepted for i in range(1, 13)) else "PARTIAL_OR_PENDING"} for h in sorted(plan["coverage"]["ariadne_house_ids"])]
    complete_tasks = sum(x in COMPLETE for x in states.values())
    reviewed_union = set(eligible_ids)
    unreviewed_ids = sorted(set(states) - reviewed_union)
    by_task = {task_id: [] for task_id in eligible_ids}
    for group in groups.values():
        for observation in group["observations"]:
            by_task[observation["task_id"]].append(observation)
    regressed = sorted(task_id for task_id, observations in by_task.items() if any(not row["improved"] and row["candidate"] != row["baseline"] for row in observations))
    unmeasured = sorted(task_id for task_id, observations in by_task.items() if not observations)
    conflicting_tasks = {task_id for item in conflicts for task_id in item["tasks"]}
    no_gain_outcomes = {"NO_CHANGE_REQUIRED", "BASELINE_RETAINED_NO_GAIN"}
    no_change = sorted(task_id for task_id in eligible_ids if outcomes[task_id] & no_gain_outcomes)
    gain_candidates = sorted(task_id for task_id, observations in by_task.items() if observations and any(row["improved"] for row in observations) and task_id not in regressed and task_id not in conflicting_tasks and task_id not in no_change)
    full = len(accepted) == 144 and complete_tasks == 1728 and not unreviewed_ids and not conflicts and not regressed
    body = {"schema": "atlas.excellence.meta145.v1", "program_id": plan["program_id"], "plan_sha256": checked["plan_sha256"],
            "status": "LOCAL_EVIDENCE_INTEGRATION_READY" if full else "PARTIAL_OR_PLANNED",
            "build_ordinal": 145, "perspectives": sphere_rows, "house_coverage": houses,
            "planned_steps": 1728, "verified_steps": complete_tasks, "integration_eligible_tasks": eligible_ids,
            "reviewed_task_union_count": len(reviewed_union), "unreviewed_task_ids": unreviewed_ids,
            "accepted_perspectives": len(accepted), "artifact_conflicts": conflicts,
            "measurement_groups": [groups[k] for k in sorted(groups)],
            "unmeasured_tasks": unmeasured, "regressed_tasks": regressed,
            "documented_no_gain_tasks": no_change,
            "compatible_gain_candidate_tasks": gain_candidates,
            "gain_candidate_scope": "Qualified local measurements only; no automatic approval of tradeoffs or end-to-end gain",
            "speedups_multiplied": False, "global_speedup_claimed": False,
            "semantic_crosswalk_accepted": False, "canon_mutated": False, "host_execution_authorized": False,
            "genuine_macroturns_completed": 0, "independent_residents_executed": 0,
            "nonwork_content_imported": False,
            "canon_reference": plan["canon_reference"], "ledger_checkpoint_sha256": export_hash}
    return {**body, "manifest_sha256": digest(body)}
