"""Canonical, source-qualified plans. Engineering coordinates are their own namespace."""
from __future__ import annotations

import hashlib
import heapq
import json
import math
import re
from pathlib import Path
from typing import Any

SCHEMA = "atlas.excellence.plan.v1"
TASK_RE = re.compile(r"^EX\.W(0[1-9]|1[0-2])\.C(0[1-9]|1[0-2])\.P(0[1-9]|1[0-2])$")
HEX64 = re.compile(r"^[0-9a-f]{64}$")
STATES = frozenset({"PLANNED", "RUNNING", "IMPLEMENTED", "VERIFIED", "INTEGRATED", "BLOCKED", "INVALIDATED"})


class ProgramError(ValueError):
    """A deterministic program, source, evidence or scope constraint failed."""


def _json_value(value: Any, depth: int = 0) -> None:
    if depth > 64:
        raise ProgramError("JSON nesting exceeds 64")
    if value is None or type(value) in (str, bool, int):
        return
    if type(value) is float:
        if not math.isfinite(value):
            raise ProgramError("Nonfinite numbers are forbidden")
        return
    if type(value) is list:
        if len(value) > 100000:
            raise ProgramError("JSON array is unbounded")
        for item in value:
            _json_value(item, depth + 1)
        return
    if type(value) is dict and all(type(k) is str for k in value):
        for item in value.values():
            _json_value(item, depth + 1)
        return
    raise ProgramError("Only plain finite JSON values are accepted")


def canonical_bytes(value: Any) -> bytes:
    _json_value(value)
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8")


def digest(value: Any) -> str:
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def bytes_digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def strict_loads(value: str | bytes) -> Any:
    def pairs(items):
        result = {}
        for key, item in items:
            if key in result:
                raise ProgramError("Duplicate JSON key: " + key)
            result[key] = item
        return result
    def reject(value):
        raise ProgramError("Nonfinite number: " + value)
    try:
        result = json.loads(value, object_pairs_hook=pairs, parse_constant=reject)
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise ProgramError("Invalid JSON") from exc
    _json_value(result)
    return result


def load_json(path: str | Path) -> Any:
    path = Path(path)
    if path.stat().st_size > 64 * 1024 * 1024:
        raise ProgramError("JSON input exceeds 64 MiB")
    return strict_loads(path.read_bytes())


def _unique(items, key, expected=None):
    if type(items) is not list or (expected is not None and len(items) != expected):
        raise ProgramError(f"Expected {expected} {key} records")
    values = [x.get(key) if type(x) is dict else None for x in items]
    if any(type(v) is not str or not v for v in values) or len(values) != len(set(values)):
        raise ProgramError("Missing or duplicate " + key)
    return {x[key]: x for x in items}


def topological_order(tasks: list[dict]) -> list[str]:
    table = _unique(tasks, "id")
    degree = {k: 0 for k in table}
    children = {k: [] for k in table}
    for task in tasks:
        deps = task.get("depends_on")
        if type(deps) is not list or any(type(d) is not str for d in deps) or len(deps) != len(set(deps)):
            raise ProgramError("Invalid dependency list")
        for dep in deps:
            if dep not in table or dep == task["id"]:
                raise ProgramError("Missing or self dependency")
            degree[task["id"]] += 1
            children[dep].append(task["id"])
    ready = [k for k, v in degree.items() if v == 0]
    heapq.heapify(ready)
    result = []
    while ready:
        item = heapq.heappop(ready)
        result.append(item)
        for child in children[item]:
            degree[child] -= 1
            if degree[child] == 0:
                heapq.heappush(ready, child)
    if len(result) != len(table):
        raise ProgramError("Task dependency cycle")
    return result


def validate_plan(plan: dict, *, expected_sha256: str | None = None) -> dict:
    encoded = canonical_bytes(plan)
    if expected_sha256 is not None and (not HEX64.fullmatch(expected_sha256) or bytes_digest(encoded) != expected_sha256):
        raise ProgramError("Plan digest mismatch")
    if plan.get("schema") != SCHEMA or plan.get("engineering_namespace") != "EX1728":
        raise ProgramError("Unsupported plan or namespace")
    if type(plan.get("revision")) is not int or plan["revision"] < 1 or not plan.get("program_id"):
        raise ProgramError("Invalid program identity")
    if plan.get("status") != "PLANNED":
        raise ProgramError("A plan is not evidence of completed work")
    streams = _unique(plan.get("workstreams"), "id", 12)
    capabilities = _unique(plan.get("capabilities"), "id", 144)
    phases = _unique(plan.get("phases"), "id", 12)
    tasks = _unique(plan.get("tasks"), "id", 1728)
    expected_streams = {f"EX.W{w:02}" for w in range(1, 13)}
    expected_caps = {f"EX.W{w:02}.C{c:02}" for w in range(1, 13) for c in range(1, 13)}
    expected_phases = {f"P{p:02}" for p in range(1, 13)}
    if set(streams) != expected_streams or set(capabilities) != expected_caps or set(phases) != expected_phases:
        raise ProgramError("Engineering dimensions must be exact 12 by 12 by 12")
    pins = plan.get("source_pins")
    if type(pins) is not dict or not pins or any(type(k) is not str or type(v) is not str or not HEX64.fullmatch(v) for k, v in pins.items()):
        raise ProgramError("Source pins must be explicit SHA-256 values")
    for task in tasks.values():
        match = TASK_RE.fullmatch(task["id"])
        if not match:
            raise ProgramError("Invalid engineering task coordinate")
        w, c, p = map(int, match.groups())
        if task.get("engineering_coordinate") != {"workstream": w, "capability": c, "phase": p}:
            raise ProgramError("Engineering task coordinate mismatch")
        if task.get("workstream_id") != f"EX.W{w:02}" or task.get("capability_id") != f"EX.W{w:02}.C{c:02}" or task.get("phase_id") != f"P{p:02}":
            raise ProgramError("Engineering task identity mismatch")
        if task.get("status") != "PLANNED":
            raise ProgramError("Task plan status cannot assert completion")
        refs = task.get("source_refs")
        if type(refs) is not list or not refs or len(refs) != len(set(refs)) or any(x not in pins for x in refs):
            raise ProgramError("Task has an unbound source reference")
        for field in ("title", "objective", "action", "artifact"):
            if not isinstance(task.get(field), str) or not task[field].strip():
                raise ProgramError("Task is missing concrete " + field)
        for field in ("acceptance", "negative_cases", "metrics", "write_resources"):
            if type(task.get(field)) is not list:
                raise ProgramError("Task is missing " + field)
        if not task["acceptance"] or not task["negative_cases"]:
            raise ProgramError("Acceptance and negative cases are required")
        if any(type(x) is not str or not x for x in task["write_resources"]) or len(task["write_resources"]) != len(set(task["write_resources"])):
            raise ProgramError("Invalid write resource identity")
        checks = task.get("required_checks")
        if type(checks) is not dict or set(checks) != {"IMPLEMENTED", "VERIFIED", "INTEGRATED"}:
            raise ProgramError("Explicit stage checks are required")
        for names in checks.values():
            if type(names) is not list or not names or any(type(x) is not str or not x for x in names) or len(names) != len(set(names)):
                raise ProgramError("Invalid required check list")
        units = task.get("estimated_work_units", 1)
        if type(units) is not int or not 1 <= units <= 1000000:
            raise ProgramError("Invalid work budget estimate")
    order = topological_order(list(tasks.values()))
    coverage = plan.get("coverage", {})
    if coverage.get("semantic_crosswalk_status") != "SOURCE_REVIEW_REQUIRED" or coverage.get("ordinal_identity_implied") is not False:
        raise ProgramError("Engineering ordering cannot assert Ariadne identity")
    expected_coverage = {
        "ariadne_house_ids": {f"H{h:02}" for h in range(1, 13)},
        "ariadne_sphere_ids": {f"H{h:02}.S{s:02}" for h in range(1, 13) for s in range(1, 13)},
        "ariadne_node_ids": {f"H{h:02}.S{s:02}.N{n:02}" for h in range(1, 13) for s in range(1, 13) for n in range(1, 13)},
    }
    for field, expected in expected_coverage.items():
        values = coverage.get(field)
        if type(values) is not list or len(values) != len(expected) or set(values) != expected:
            raise ProgramError("Missing or duplicate source coverage: " + field)
    ariadne_sha = coverage.get("ariadne_source_sha256")
    if type(ariadne_sha) is not str or not HEX64.fullmatch(ariadne_sha) or ariadne_sha not in pins.values():
        raise ProgramError("Ariadne coverage must be bound to a source pin")
    macro = plan.get("macroturn_policy", {})
    if any(type(macro.get(k)) is not int for k in ("work_numerator", "work_denominator", "genuine_macroturns_completed")) or macro.get("work_numerator") != 1 or macro.get("work_denominator") != 3 or macro.get("genuine_macroturns_completed") != 0:
        raise ProgramError("Preserve one-third Work; plans do not complete Macroturns")
    return {"valid": True, "plan_sha256": bytes_digest(encoded), "tasks": len(tasks), "capabilities": len(capabilities), "workstreams": len(streams), "ariadne_spheres": 144, "ariadne_nodes": 1728, "topological_order": order, "completed_tasks": 0}


def compile_plan(catalog: dict, phases_document: dict, source_inventory: dict, coverage: dict, *, canon_reference: dict, program_id: str = "ATLAS-EXCELLENCE-1728-20261123") -> dict:
    """Compile authored engineering actions; preserve original source coverage separately."""
    capabilities = sorted(catalog["capabilities"], key=lambda x: x["id"])
    phases = sorted(phases_document["phases"], key=lambda x: x["id"])
    source_records = _unique(source_inventory["sources"], "id")
    source_pins = {key: value["sha256"] for key, value in sorted(source_records.items())}
    tasks = []
    for capability in capabilities:
        cap_id = capability["id"]
        w = int(cap_id.split(".")[1][1:])
        c = int(cap_id.split(".")[2][1:])
        refs = sorted({x["source_id"] for x in capability["existing_targets"]})
        for phase in phases:
            p = int(phase["id"][1:])
            task_id = cap_id + "." + phase["id"]
            substitutions = {"task_id": task_id, "capability_id": cap_id, "workstream_id": capability["workstream_id"], "phase_id": phase["id"], "title": capability["title"]}
            def render(value):
                for key, replacement in substitutions.items():
                    value = value.replace("{" + key + "}", replacement)
                return value
            artifact = render(phase["artifact"])
            if cap_id not in artifact and task_id not in artifact:
                artifact = "evidence/" + cap_id + "/" + phase["id"] + ".json"
            dependencies = [cap_id + "." + x for x in phase["depends_on"]]
            if p == 4:
                dependencies += [x + ".P12" for x in capability.get("dependencies", [])]
            acceptance = [render(phase["acceptance_template"])]
            tasks.append({
                "id": task_id, "workstream_id": capability["workstream_id"], "capability_id": cap_id,
                "phase_id": phase["id"], "engineering_coordinate": {"workstream": w, "capability": c, "phase": p},
                "title": capability["title"] + " — " + phase.get("title", phase.get("name", phase["id"])),
                "objective": capability["objective"], "action": render(phase["action"]) + " Scope: " + capability["objective"],
                "artifact": artifact, "artifact_description": render(phase["artifact"]), "input_contract": capability["input_contract"], "output_contract": capability["output_contract"],
                "acceptance": acceptance, "capability_acceptance": capability["acceptance"],
                "negative_cases": capability["negative_cases"], "metrics": capability["metrics"],
                "completion_outcomes": phase.get("completion_outcomes", ["IMPLEMENTED_CHANGE", "NO_CHANGE_REQUIRED", "REUSED_VERIFIED_IMPLEMENTATION"]),
                "benefit_claim_requires_measurement": True,
                "depends_on": sorted(set(dependencies)), "source_refs": refs,
                "existing_targets": capability["existing_targets"], "proposed_targets": capability["proposed_targets"],
                "write_resources": sorted(set(capability.get("write_resources", []))) if phase.get("mutates_sources", False) else [],
                "required_checks": {"IMPLEMENTED": [task_id + ":implementation"], "VERIFIED": [task_id + ":verification"], "INTEGRATED": [task_id + ":integration"]},
                "estimated_work_units": int(phase.get("estimated_work_units", 1)),
                "status": "PLANNED",
            })
    plan = {
        "schema": SCHEMA, "program_id": program_id, "revision": 1, "status": "PLANNED", "engineering_namespace": "EX1728",
        "source_pins": source_pins, "workstreams": sorted(catalog["workstreams"], key=lambda x: x["id"]),
        "capabilities": capabilities, "phases": phases, "tasks": tasks, "coverage": coverage,
        "canon_reference": canon_reference,
        "macroturn_policy": {"work_numerator": 1, "work_denominator": 3, "allocation_basis": "scheduler_budget_units", "genuine_macroturns_completed": 0, "private_creative_content_imported": False},
        "integrity": {"algorithm": "sha256", "catalog_sha256": digest(catalog), "phases_sha256": digest(phases_document), "source_inventory_sha256": digest(source_inventory)},
    }
    validate_plan(plan)
    return strict_loads(canonical_bytes(plan))


def read_task(plan: dict, task_id: str, *, expected_sha256=None) -> dict:
    validate_plan(plan, expected_sha256=expected_sha256)
    for task in plan["tasks"]:
        if task["id"] == task_id:
            return strict_loads(canonical_bytes(task))
    raise ProgramError("Unknown engineering task")


def query_tasks(plan: dict, text: str = "", *, workstream_id=None, phase_id=None, limit=20, offset=0) -> dict:
    check = validate_plan(plan)
    if type(text) is not str or len(text) > 1000 or type(limit) is not int or not 1 <= limit <= 100 or type(offset) is not int or not 0 <= offset <= 1728:
        raise ProgramError("Invalid bounded query")
    if workstream_id is not None and workstream_id not in {x["id"] for x in plan["workstreams"]}:
        raise ProgramError("Unknown engineering workstream")
    if phase_id is not None and phase_id not in {x["id"] for x in plan["phases"]}:
        raise ProgramError("Unknown engineering phase")
    tokens = [t for t in re.split(r"\W+", text.casefold()) if t]
    matched = []
    for task in plan["tasks"]:
        if workstream_id is not None and task["workstream_id"] != workstream_id or phase_id is not None and task["phase_id"] != phase_id:
            continue
        searchable = " ".join([task["id"], task["title"], task["objective"], task["action"], task["artifact"], *task["source_refs"]]).casefold()
        if all(token in searchable for token in tokens):
            matched.append(task)
    return {"schema": "atlas.excellence.query.v1", "plan_sha256": check["plan_sha256"], "query": text, "total": len(matched), "offset": offset,
            "tasks": strict_loads(canonical_bytes(matched[offset:offset + limit])), "next_offset": offset + limit if offset + limit < len(matched) else None,
            "search_kind": "DETERMINISTIC_ALL_TOKEN_FILTER", "semantic_crosswalk_inferred": False}
