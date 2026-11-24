"""Explicit host-selected acceptance checks, with bounded output and sealed receipts.

The HMAC authenticates a receipt within one host trust context. It is not owner
identity, scientific validation, a sandbox or permission to invoke arbitrary code.
"""
from __future__ import annotations

import ast
import copy
import hashlib
import hmac
import os
import selectors
import signal
import subprocess
import time
from pathlib import Path

from .model import ProgramError, HEX64, canonical_bytes, strict_loads, bytes_digest, digest, validate_plan

STAGES = frozenset({"IMPLEMENTED", "VERIFIED", "INTEGRATED"})
KINDS = frozenset({"file_exists", "json_parse", "python_parse", "text_contains", "command", "benchmark_command"})
OUTCOMES = frozenset({"CHECKS_PASSED", "CONTRACT_SATISFIED", "IMPLEMENTED_CHANGE", "VERIFIED_IMPLEMENTATION", "NO_CHANGE_REQUIRED", "REUSED_VERIFIED_IMPLEMENTATION", "VERIFIED_REUSE", "OPTIMIZATION_SUPPORTED", "BASELINE_RETAINED_NO_GAIN"})


def validate_measurement(row: dict) -> None:
    required = {"metric", "unit", "direction", "baseline", "candidate", "statistic", "workload_sha256", "environment_sha256", "repetitions", "scope"}
    if type(row) is not dict or set(row) != required:
        raise ProgramError("A measurement requires exact workload and environment qualifications")
    canonical_bytes(row)
    for key in ("metric", "unit", "statistic", "scope"):
        if type(row[key]) is not str or not row[key]:
            raise ProgramError("Invalid measurement dimension")
    if row["direction"] not in ("lower", "higher") or row["statistic"] not in ("median", "p95", "mean", "total", "count"):
        raise ProgramError("Unknown metric comparison semantics")
    for key in ("baseline", "candidate"):
        if type(row[key]) not in (int, float) or row[key] < 0:
            raise ProgramError("Invalid measurement value")
    for key in ("workload_sha256", "environment_sha256"):
        if type(row[key]) is not str or not HEX64.fullmatch(row[key]):
            raise ProgramError("Missing measurement identity")
    if type(row["repetitions"]) is not int or row["repetitions"] < 3:
        raise ProgramError("At least three paired measurements are required")


def _bounded_command(command, cwd: Path, timeout: float, max_output: int) -> tuple[int, bytes]:
    """Execute only policy bytes; no shell, inherited credentials or task command."""
    env = {"PATH": os.environ.get("PATH", "/usr/bin:/bin"), "LANG": "C.UTF-8", "PYTHONHASHSEED": "0", "PYTHONDONTWRITEBYTECODE": "1"}
    process = subprocess.Popen(command, cwd=cwd, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=env, start_new_session=True)
    selector = selectors.DefaultSelector()
    selector.register(process.stdout, selectors.EVENT_READ)
    output = bytearray()
    started = time.monotonic()
    try:
        while selector.get_map():
            remaining = timeout - (time.monotonic() - started)
            if remaining <= 0:
                raise ProgramError("Acceptance command timed out")
            for key, _ in selector.select(min(remaining, 0.1)):
                chunk = os.read(key.fileobj.fileno(), min(65536, max_output + 1 - len(output)))
                if not chunk:
                    selector.unregister(key.fileobj)
                    continue
                output.extend(chunk)
                if len(output) > max_output:
                    raise ProgramError("Acceptance output exceeded its bound")
        remaining = timeout - (time.monotonic() - started)
        return process.wait(timeout=max(0.001, remaining)), bytes(output)
    except BaseException:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait(timeout=5)
        raise
    finally:
        selector.close()
        process.stdout.close()


class AcceptanceRunner:
    """A fixed policy selected by its independently supplied exact digest.

    There is no method that accepts a caller-written pass/fail result. Source
    scans alone cannot register all implementation steps as completed. An empty
    check registry is a valid planning host and blocks all execution transitions.
    """
    __slots__ = ("_plan_bytes", "_plan_sha", "_policy_bytes", "_policy_sha", "_key", "_permission")

    def __init__(self, plan: dict, policy: dict, *, expected_policy_sha256: str, receipt_key: bytes, current_permission=None):
        validate_plan(plan)
        if type(receipt_key) is not bytes or len(receipt_key) < 32:
            raise ProgramError("Host receipt key must contain at least 32 bytes")
        if type(policy) is not dict or digest(policy) != expected_policy_sha256:
            raise ProgramError("Explicit runner policy pin mismatch")
        self._plan_bytes = canonical_bytes(plan)
        self._plan_sha = bytes_digest(self._plan_bytes)
        self._policy_bytes = canonical_bytes(policy)
        self._policy_sha = expected_policy_sha256
        self._key = bytes(receipt_key)
        self._permission = current_permission
        self._policy()

    @property
    def plan_sha256(self):
        return self._plan_sha

    @property
    def policy_sha256(self):
        return self._policy_sha

    def _policy(self):
        if bytes_digest(self._policy_bytes) != self._policy_sha:
            raise ProgramError("Runner policy bytes changed")
        policy = strict_loads(self._policy_bytes)
        if policy.get("schema") != "atlas.excellence.runner-policy.v1" or policy.get("plan_sha256") != self._plan_sha:
            raise ProgramError("Runner policy is not scoped to this plan")
        roots = policy.get("allowed_roots")
        if type(roots) is not list or not roots or any(type(x) is not str or not Path(x).is_absolute() for x in roots):
            raise ProgramError("Explicit absolute source roots are required")
        paths = policy.get("source_paths")
        if type(paths) is not dict:
            raise ProgramError("Source path bindings are required")
        checks = policy.get("checks")
        if type(checks) is not list or len(checks) > 20000:
            raise ProgramError("Invalid runner check registry")
        seen = set()
        tasks = {t["id"]: t for t in strict_loads(self._plan_bytes)["tasks"]}
        for check in checks:
            if type(check) is not dict or not isinstance(check.get("id"), str) or check["id"] in seen:
                raise ProgramError("Invalid or duplicate runner check")
            seen.add(check["id"])
            if check.get("kind") not in KINDS or check.get("stage") not in STAGES or check.get("task_id") not in tasks:
                raise ProgramError("Runner check has an invalid scope")
            if check["id"] not in tasks[check["task_id"]]["required_checks"][check["stage"]]:
                raise ProgramError("Runner check is not requested by its scoped task")
            if check.get("outcome", "CHECKS_PASSED") not in OUTCOMES:
                raise ProgramError("Unknown check outcome")
            if check.get("outcome") in {"NO_CHANGE_REQUIRED", "REUSED_VERIFIED_IMPLEMENTATION", "VERIFIED_REUSE", "BASELINE_RETAINED_NO_GAIN"} and (not isinstance(check.get("outcome_reason"), str) or not check["outcome_reason"].strip()):
                raise ProgramError("Reuse or no-change evidence needs a reason")
            artifact_paths = check.get("artifacts", [])
            if type(artifact_paths) is not list or any(type(x) is not str or not Path(x).is_absolute() for x in artifact_paths) or len(artifact_paths) != len(set(artifact_paths)):
                raise ProgramError("Artifact paths must be explicit unique absolute paths")
            if check["kind"] in ("command", "benchmark_command"):
                command = check.get("command")
                if type(command) is not list or not command or len(command) > 64 or any(type(x) is not str or not x for x in command) or not Path(command[0]).is_absolute():
                    raise ProgramError("Commands must be an exact host-selected argv with absolute executable")
                timeout = check.get("timeout_seconds", 10)
                output = check.get("max_output_bytes", 262144)
                if type(timeout) not in (int, float) or not 0 < timeout <= 60 or type(output) is not int or not 1 <= output <= 1048576:
                    raise ProgramError("Command bounds are missing or excessive")
                executables = policy.get("allowed_executables", {})
                if type(executables) is not dict or command[0] not in executables or type(executables[command[0]]) is not str or not HEX64.fullmatch(executables[command[0]]):
                    raise ProgramError("Command executable bytes require an explicit policy pin")
                artifact_pins = check.get("artifact_pins")
                if not artifact_paths or type(artifact_pins) is not dict or set(artifact_pins) != set(artifact_paths) or any(type(x) is not str or not HEX64.fullmatch(x) for x in artifact_pins.values()):
                    raise ProgramError("Commands require pinned implementation and test artifacts")
                cwd = self._path(check.get("cwd"), policy)
                declared = {self._path(raw, policy) for raw in artifact_paths}
                for arg in command[1:]:
                    if len(arg) < 256 and not arg.startswith("-"):
                        candidate = (cwd / arg).resolve()
                        if candidate.is_file() and candidate not in declared:
                            raise ProgramError("Command file argument is missing from artifact pins")
        return policy

    def _executable_digest(self, raw: str, policy: dict) -> str:
        expected = policy.get("allowed_executables", {}).get(raw)
        path = Path(raw).resolve()
        if type(expected) is not str or not path.is_file() or path.stat().st_size > 128 * 1024 * 1024:
            raise ProgramError("Command executable is not explicitly pinned")
        actual = bytes_digest(path.read_bytes())
        if actual != expected:
            raise ProgramError("Command executable bytes changed")
        return actual

    def _path(self, raw: str, policy: dict) -> Path:
        if type(raw) is not str or not Path(raw).is_absolute():
            raise ProgramError("Only host-bound absolute paths are accepted")
        path = Path(raw).resolve()
        if not any(path.is_relative_to(Path(root).resolve()) for root in policy["allowed_roots"]):
            raise ProgramError("Path is outside the host-selected source roots")
        return path

    def _hash_path(self, raw: str, policy: dict) -> str:
        path = self._path(raw, policy)
        if not path.is_file() or path.stat().st_size > 128 * 1024 * 1024:
            raise ProgramError("Missing or excessive source artifact: " + str(path))
        return bytes_digest(path.read_bytes())

    def source_snapshot(self, task_id: str) -> dict:
        policy = self._policy()
        plan = strict_loads(self._plan_bytes)
        task = next((t for t in plan["tasks"] if t["id"] == task_id), None)
        if task is None:
            raise ProgramError("Unknown task")
        actual = {}
        for ref in task["source_refs"]:
            raw = policy["source_paths"].get(ref)
            if raw is None:
                raise ProgramError("Host has not bound source path: " + ref)
            actual[ref] = self._hash_path(raw, policy)
            if actual[ref] != plan["source_pins"][ref]:
                raise ProgramError("Source digest changed: " + ref)
        return actual

    def _authorize(self, context):
        if self._permission is not None and self._permission(copy.deepcopy(context)) is not True:
            raise ProgramError("Current host permission denied")

    def _seal(self, payload: dict) -> dict:
        envelope = {"payload": strict_loads(canonical_bytes(payload)), "hmac_sha256": hmac.new(self._key, canonical_bytes(payload), hashlib.sha256).hexdigest()}
        return envelope

    def _unseal(self, envelope: dict) -> dict:
        if type(envelope) is not dict or set(envelope) != {"payload", "hmac_sha256"} or type(envelope["hmac_sha256"]) is not str:
            raise ProgramError("Malformed evidence envelope")
        raw = canonical_bytes(envelope["payload"])
        expected = hmac.new(self._key, raw, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, envelope["hmac_sha256"]):
            raise ProgramError("Receipt authentication failed")
        return strict_loads(raw)

    def run(self, task_id: str, stage: str) -> dict:
        if stage not in STAGES:
            raise ProgramError("Unknown evidence stage")
        policy = self._policy()
        plan = strict_loads(self._plan_bytes)
        task = next((t for t in plan["tasks"] if t["id"] == task_id), None)
        if task is None:
            raise ProgramError("Unknown task")
        context = {"program_id": plan["program_id"], "task_id": task_id, "stage": stage, "plan_sha256": self._plan_sha}
        self._authorize(context)
        before = self.source_snapshot(task_id)
        registry = {c["id"]: c for c in policy["checks"]}
        wanted = task["required_checks"][stage]
        if any(x not in registry for x in wanted) or len(wanted) > 32:
            raise ProgramError("Acceptance checks are not registered by the host")
        watched = set()
        executables_before = {}
        for check_id in wanted:
            spec = registry[check_id]
            watched.update(spec.get("artifacts", []))
            if spec["kind"] not in ("command", "benchmark_command"):
                watched.add(spec["path"])
            else:
                executables_before[spec["command"][0]] = self._executable_digest(spec["command"][0], policy)
                for raw, expected in spec["artifact_pins"].items():
                    if self._hash_path(raw, policy) != expected:
                        raise ProgramError("Command implementation or test artifact differs from the selected policy")
        artifacts_before = {str(self._path(raw, policy)): self._hash_path(raw, policy) for raw in sorted(watched)}
        results, artifacts, measurements = [], {}, []
        for check_id in wanted:
            spec = registry[check_id]
            if spec["task_id"] != task_id or spec["stage"] != stage:
                raise ProgramError("Runner scope mismatch")
            kind = spec["kind"]
            start = time.monotonic_ns()
            result = {"id": check_id, "kind": kind, "passed": False}
            if kind in ("command", "benchmark_command"):
                cwd = self._path(spec["cwd"], policy)
                code, output = _bounded_command(spec["command"], cwd, spec.get("timeout_seconds", 10), spec.get("max_output_bytes", 262144))
                result.update(returncode=code, output_sha256=bytes_digest(output), passed=code == 0)
                if kind == "benchmark_command" and code == 0:
                    report = strict_loads(output)
                    rows = report.get("measurements") if type(report) is dict else None
                    if type(rows) is not list or len(rows) > 64:
                        raise ProgramError("Invalid benchmark output")
                    for row in rows:
                        validate_measurement(row)
                        measurements.append(row)
            else:
                path = self._path(spec["path"], policy)
                contents = path.read_bytes() if path.is_file() and path.stat().st_size <= 128 * 1024 * 1024 else None
                result["output_sha256"] = bytes_digest(contents or b"")
                try:
                    if contents is None:
                        raise ProgramError("Acceptance file missing")
                    if kind == "json_parse":
                        strict_loads(contents)
                    elif kind == "python_parse":
                        ast.parse(contents)
                    elif kind == "text_contains":
                        terms = spec.get("terms")
                        if type(terms) is not list or not terms or any(type(x) is not str or not x for x in terms):
                            raise ProgramError("Empty text acceptance contract")
                        decoded = contents.decode("utf-8")
                        if not all(term in decoded for term in terms):
                            raise ProgramError("Text acceptance assertion failed")
                    result["passed"] = True
                    artifacts[str(path)] = bytes_digest(contents)
                except (ProgramError, SyntaxError, UnicodeError, ValueError) as exc:
                    result["error"] = type(exc).__name__
            for raw in spec.get("artifacts", []):
                path = self._path(raw, policy)
                artifacts[str(path)] = self._hash_path(str(path), policy)
            result["duration_ns"] = time.monotonic_ns() - start
            result["outcome"] = spec.get("outcome", "CHECKS_PASSED")
            result["outcome_reason"] = spec.get("outcome_reason")
            results.append(result)
        after = self.source_snapshot(task_id)
        if before != after:
            raise ProgramError("Sources changed during acceptance")
        artifacts_after = {str(self._path(raw, policy)): self._hash_path(raw, policy) for raw in sorted(watched)}
        if artifacts_before != artifacts_after:
            raise ProgramError("Acceptance artifacts changed while checks were running")
        executables_after = {raw: self._executable_digest(raw, policy) for raw in executables_before}
        if executables_before != executables_after:
            raise ProgramError("Command executable changed while checks were running")
        self._authorize(context)
        payload = {"schema": "atlas.excellence.check-receipt.v1", "task_id": task_id, "stage": stage,
            "plan_sha256": self._plan_sha, "policy_sha256": self._policy_sha,
            "source_snapshot": after, "artifact_sha256": artifacts, "executable_sha256": executables_after, "checks": results,
            "measurements": measurements, "passed": all(x["passed"] is True for x in results),
            "host_authorization": "CURRENT_CALLBACK_CHECKED" if self._permission else "LOCAL_OFFLINE_POLICY_ONLY",
            "scientific_validation": False}
        return self._seal(payload)

    def verify(self, envelope: dict, task_id: str, stage: str) -> dict:
        policy = self._policy()
        record = self._unseal(envelope)
        if record.get("schema") != "atlas.excellence.check-receipt.v1" or record.get("task_id") != task_id or record.get("stage") != stage or record.get("plan_sha256") != self._plan_sha or record.get("policy_sha256") != self._policy_sha:
            raise ProgramError("Receipt belongs to another task, stage, plan or policy")
        task = next(t for t in strict_loads(self._plan_bytes)["tasks"] if t["id"] == task_id)
        checks = record.get("checks")
        if record.get("passed") is not True or type(checks) is not list or [x.get("id") for x in checks] != task["required_checks"][stage] or any(x.get("passed") is not True for x in checks):
            raise ProgramError("Acceptance evidence did not pass every required check")
        registry = {x["id"]: x for x in policy["checks"]}
        if any(x["id"] not in registry or registry[x["id"]]["kind"] != x.get("kind") for x in checks):
            raise ProgramError("Receipt contains an unregistered check")
        if record.get("source_snapshot") != self.source_snapshot(task_id):
            raise ProgramError("Receipt source snapshot is stale")
        if type(record.get("artifact_sha256")) is not dict:
            raise ProgramError("Receipt artifact identities are missing")
        for path, expected in record["artifact_sha256"].items():
            if self._hash_path(path, policy) != expected:
                raise ProgramError("Receipt artifact changed: " + path)
        executables = record.get("executable_sha256")
        expected_executables = {registry[x["id"]]["command"][0] for x in checks if registry[x["id"]]["kind"] in ("command", "benchmark_command")}
        if type(executables) is not dict or set(executables) != expected_executables:
            raise ProgramError("Receipt command executable identity is missing")
        for path, expected in executables.items():
            if self._executable_digest(path, policy) != expected:
                raise ProgramError("Receipt command executable changed")
        for row in record.get("measurements", []):
            validate_measurement(row)
        self._authorize({"task_id": task_id, "stage": stage, "plan_sha256": self._plan_sha, "operation": "evidence_return"})
        return record
