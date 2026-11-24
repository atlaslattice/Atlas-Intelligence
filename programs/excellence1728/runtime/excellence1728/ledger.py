"""Append-only engineering evidence, dependency invalidation and bounded planning."""
from __future__ import annotations

from dataclasses import dataclass
from .model import ProgramError, canonical_bytes, strict_loads, digest, validate_plan, STATES
from .runner import AcceptanceRunner, STAGES

COMPLETE = frozenset({"VERIFIED", "INTEGRATED"})
NEXT = {"PLANNED": {"RUNNING", "BLOCKED"}, "RUNNING": {"IMPLEMENTED", "BLOCKED"},
        "IMPLEMENTED": {"VERIFIED", "BLOCKED"}, "VERIFIED": {"INTEGRATED", "BLOCKED"},
        "INTEGRATED": set(), "BLOCKED": {"RUNNING"}, "INVALIDATED": {"RUNNING", "BLOCKED"}}


@dataclass(frozen=True)
class WorkBudget:
    total_units: int
    used_work_units: int = 0
    max_ready: int = 12

    def __post_init__(self):
        if type(self.total_units) is not int or not 0 <= self.total_units <= 3000000:
            raise ProgramError("Invalid total Macroturn budget")
        if type(self.used_work_units) is not int or not 0 <= self.used_work_units <= self.total_units // 3:
            raise ProgramError("Work exceeds its one-third allocation")
        if type(self.max_ready) is not int or not 0 <= self.max_ready <= 1728:
            raise ProgramError("Invalid ready-task limit")

    @property
    def remaining_work_units(self):
        return self.total_units // 3 - self.used_work_units


class EvidenceLedger:
    """States derive from authenticated events, never from a mutable status table."""
    __slots__ = ("_plan_bytes", "_plan_sha", "_runner", "_events")

    def __init__(self, plan: dict, runner: AcceptanceRunner):
        check = validate_plan(plan)
        if type(runner) is not AcceptanceRunner or runner.plan_sha256 != check["plan_sha256"]:
            raise ProgramError("A genuine runner bound to this exact plan is required")
        self._plan_bytes = canonical_bytes(plan)
        self._plan_sha = check["plan_sha256"]
        self._runner = runner
        self._events = []

    @property
    def plan_sha256(self):
        return self._plan_sha

    def _records(self):
        result = {t["id"]: {"state": "PLANNED", "receipts": {}, "reason": None} for t in strict_loads(self._plan_bytes)["tasks"]}
        previous = "0" * 64
        for index, raw in enumerate(self._events, 1):
            envelope = strict_loads(raw)
            event = self._runner._unseal(envelope)
            if event.get("schema") != "atlas.excellence.ledger-event.v1" or event.get("seq") != index or event.get("previous_sha256") != previous or event.get("plan_sha256") != self._plan_sha:
                raise ProgramError("Ledger continuity or plan binding failed")
            if event.get("task_id") not in result or event.get("state") not in STATES:
                raise ProgramError("Ledger event target invalid")
            item = result[event["task_id"]]
            item["state"] = event["state"]
            item["reason"] = event.get("reason")
            if event["state"] in {"RUNNING", "INVALIDATED"}:
                item["receipts"] = {}
            if event.get("receipt") is not None:
                item["receipts"][event["state"]] = event["receipt"]
            previous = digest(envelope)
        return result

    def _append(self, task_id, state, *, receipt=None, reason=None):
        previous = digest(strict_loads(self._events[-1])) if self._events else "0" * 64
        event = {"schema": "atlas.excellence.ledger-event.v1", "seq": len(self._events) + 1,
                 "plan_sha256": self._plan_sha, "previous_sha256": previous,
                 "task_id": task_id, "state": state, "receipt": receipt, "reason": reason}
        self._events.append(canonical_bytes(self._runner._seal(event)))

    def refresh(self) -> list[str]:
        """Reject stale source or artifact evidence and invalidate its descendants."""
        records = self._records()
        invalid = set()
        for task_id, row in records.items():
            if row["state"] in {"RUNNING", "IMPLEMENTED", "VERIFIED", "INTEGRATED"}:
                try:
                    self._runner.source_snapshot(task_id)
                    for stage, receipt in row["receipts"].items():
                        self._runner.verify(receipt, task_id, stage)
                except ProgramError:
                    invalid.add(task_id)
        return self._invalidate(invalid, "Source, artifact, permission or receipt changed") if invalid else []

    def _invalidate(self, targets: set[str], reason: str) -> list[str]:
        tasks = strict_loads(self._plan_bytes)["tasks"]
        children = {t["id"]: [] for t in tasks}
        for task in tasks:
            for dep in task["depends_on"]:
                children[dep].append(task["id"])
        seen, queue = set(targets), list(targets)
        while queue:
            for child in children[queue.pop()]:
                if child not in seen:
                    seen.add(child)
                    queue.append(child)
        rows = self._records()
        for task_id in sorted(seen):
            if rows[task_id]["state"] != "INVALIDATED":
                self._append(task_id, "INVALIDATED", reason=reason)
        return sorted(seen)

    def notify_source_change(self, source_id: str, observed_sha256: str) -> list[str]:
        plan = strict_loads(self._plan_bytes)
        if source_id not in plan["source_pins"]:
            raise ProgramError("Unknown source")
        if observed_sha256 == plan["source_pins"][source_id]:
            return []
        targets = {t["id"] for t in plan["tasks"] if source_id in t["source_refs"]}
        return self._invalidate(targets, "Source digest changed: " + source_id)

    def transition(self, task_id: str, state: str, *, receipt=None, reason=None) -> dict:
        if type(self._runner) is not AcceptanceRunner:
            raise ProgramError("Runner substitution is forbidden")
        self.refresh()
        plan = strict_loads(self._plan_bytes)
        task = next((t for t in plan["tasks"] if t["id"] == task_id), None)
        if task is None or state not in STATES:
            raise ProgramError("Unknown task or state")
        records = self._records()
        current = records[task_id]["state"]
        if state not in NEXT[current]:
            raise ProgramError("Illegal evidence transition: " + current + " to " + state)
        if state == "BLOCKED":
            if type(reason) is not str or not reason.strip() or receipt is not None:
                raise ProgramError("A block requires a reason and no completion receipt")
        else:
            if any(records[dep]["state"] not in COMPLETE for dep in task["depends_on"]):
                raise ProgramError("Unverified task dependency")
            self._runner.source_snapshot(task_id)
            self._runner._authorize({"task_id": task_id, "state": state, "operation": "ledger_transition"})
            if state in STAGES:
                self._runner.verify(receipt, task_id, state)
            elif receipt is not None:
                raise ProgramError("Start events cannot carry completion evidence")
        self._append(task_id, state, receipt=receipt, reason=reason)
        return {"task_id": task_id, "state": state, "seq": len(self._events)}

    def snapshot(self, *, refresh=True) -> dict:
        if refresh:
            self.refresh()
        rows = self._records()
        counts = {state: sum(row["state"] == state for row in rows.values()) for state in sorted(STATES)}
        return {"schema": "atlas.excellence.ledger-snapshot.v1", "plan_sha256": self._plan_sha,
                "states": {k: v["state"] for k, v in rows.items()}, "counts": counts,
                "verified_tasks": counts["VERIFIED"] + counts["INTEGRATED"],
                "genuine_macroturns_completed": 0, "last_event_sha256": digest(strict_loads(self._events[-1])) if self._events else None,
                "events": len(self._events)}

    def export(self) -> dict:
        self.refresh()
        body = {"schema": "atlas.excellence.ledger.v1", "plan_sha256": self._plan_sha,
                "events": [strict_loads(x) for x in self._events]}
        return {**body, "export_sha256": digest(body)}

    @classmethod
    def restore(cls, plan, runner, data, *, expected_export_sha256):
        if type(data) is not dict:
            raise ProgramError("Invalid ledger export")
        body = {k: v for k, v in data.items() if k != "export_sha256"}
        if data.get("export_sha256") != expected_export_sha256 or digest(body) != expected_export_sha256:
            raise ProgramError("Ledger checkpoint mismatch")
        ledger = cls(plan, runner)
        if data.get("schema") != "atlas.excellence.ledger.v1" or data.get("plan_sha256") != ledger.plan_sha256 or type(data.get("events")) is not list or len(data["events"]) > 100000:
            raise ProgramError("Ledger scope mismatch")
        ledger._events = [canonical_bytes(x) for x in data["events"]]
        ledger._records()
        ledger.refresh()
        return ledger


def ready_tasks(plan: dict, ledger: EvidenceLedger | None = None, *, budget: WorkBudget, limit: int | None = None) -> dict:
    check = validate_plan(plan)
    if type(budget) is not WorkBudget:
        raise ProgramError("A validated work budget is required")
    if limit is not None and (type(limit) is not int or not 0 <= limit <= 1728):
        raise ProgramError("Invalid task limit")
    if ledger is not None:
        if type(ledger) is not EvidenceLedger or ledger.plan_sha256 != check["plan_sha256"]:
            raise ProgramError("Ledger scope mismatch")
        states = ledger.snapshot()["states"]
    else:
        states = {t["id"]: "PLANNED" for t in plan["tasks"]}
    locked = {r for t in plan["tasks"] if states[t["id"]] == "RUNNING" for r in t["write_resources"]}
    selected, held, cost = [], [], 0
    maximum = min(budget.max_ready, limit if limit is not None else budget.max_ready)
    for task in sorted(plan["tasks"], key=lambda x: x["id"]):
        if states[task["id"]] not in {"PLANNED", "BLOCKED", "INVALIDATED"} or any(states[x] not in COMPLETE for x in task["depends_on"]):
            continue
        units = task.get("estimated_work_units", 1)
        if set(task["write_resources"]) & locked:
            held.append({"task_id": task["id"], "reason": "WRITE_RESOURCE_CONFLICT"})
        elif len(selected) >= maximum or cost + units > budget.remaining_work_units:
            held.append({"task_id": task["id"], "reason": "WORK_BUDGET_OR_BATCH_LIMIT"})
        else:
            selected.append(task["id"])
            cost += units
            locked.update(task["write_resources"])
    return {"schema": "atlas.excellence.ready-batch.v1", "plan_sha256": check["plan_sha256"],
            "task_ids": selected, "estimated_work_units": cost, "work_units_available": budget.remaining_work_units,
            "held": held, "readiness": "DEPENDENCY_AND_BUDGET_ONLY", "host_execution_authorized": False,
            "current_source_and_permission_preflight_required": True, "genuine_macroturns_completed": 0}
