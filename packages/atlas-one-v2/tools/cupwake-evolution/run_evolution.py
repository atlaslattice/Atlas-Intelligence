#!/usr/bin/env python3
"""One finite, resumable build of the existing Cupwake circuit.

The existing automation may invoke this command. It does not start a scheduler,
call a model, publish a room message, or acquire host credentials. Owner-selected
source files stay outside the public source repository.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import time

from evolution.engine import EvolutionEngine, EvolutionError, PASS_NAMES, strict_json
from integrations.adapters import (DeliveryOutbox, IntegrationHold, LocalFileAdapter,
                                   LocalOwnerAuthorizer, SourceRegistry)


def wire(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2, allow_nan=False) + "\n"


def atomic_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp-" + str(os.getpid()))
    try:
        with tmp.open("x", encoding="utf-8") as out:
            out.write(wire(value)); out.flush(); os.fsync(out.fileno())
        os.replace(tmp, path)
        fd = os.open(path.parent, os.O_RDONLY)
        try: os.fsync(fd)
        finally: os.close(fd)
    finally:
        tmp.unlink(missing_ok=True)


@contextmanager
def build_lock(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a+") as lock:
        try:
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise IntegrationHold("EXISTING_BUILD_IN_PROGRESS") from None
        try: yield
        finally: fcntl.flock(lock.fileno(), fcntl.LOCK_UN)


def read_inputs(root):
    return {
        "registry": strict_json((root / "inputs/registry.json").read_bytes()),
        "lenses": strict_json((root / "design/lenses.json").read_bytes()),
        "original_source_bytes": (root / "inputs/ariadne_v07_atlas.json").read_bytes(),
        "catalog_bytes": (root / "peer-inputs/next144-civilizational-capabilities.json").read_bytes(),
    }


def verify_local_references(registry, engine, state):
    """Re-read every current-cycle reference; a historical receipt is insufficient."""
    adapter = LocalFileAdapter(state / "projections")
    authorizer = LocalOwnerAuthorizer(principal="owner-authorized-reference-readback")
    counts = {name: 0 for name in ["ATLAS", "ARIADNE", "SWARMCHAT", "IRON_EMPIRE"]}
    for slot in engine.outbox_slots():
        envelope = registry.projection(slot["nodeId"], slot["platform"], slot["runId"], slot["passId"], slot["route"])
        grant = authorizer(envelope, "RETURN", time.time())
        try:
            actual = adapter.readback(envelope, {}, grant)
        except (OSError, ValueError):
            raise IntegrationHold("CURRENT_LOCAL_REFERENCE_MISSING_OR_INVALID:" + envelope["requestId"]) from None
        if actual != envelope["payloadSha256"]:
            raise IntegrationHold("CURRENT_LOCAL_REFERENCE_DIGEST_MISMATCH:" + envelope["requestId"])
        counts[slot["platform"]] += 1
    if set(counts.values()) != {1728}:
        raise IntegrationHold("CURRENT_LOCAL_REFERENCE_CENSUS")
    return {"status": "CURRENT_FILES_READBACK_VERIFIED", "total": sum(counts.values()), "platforms": counts,
            "hostedApplicationProof": False}


def run_native_workburst(root, state, envelopes, *, run_id, latest_pass,
                         native_package=None):
    """Run the existing native executor against every current local projection.

    This deliberately does not reuse a historical execution receipt. Each build
    performs fresh local native checks and counts them separately from newly
    committed evolution passes and newly delivered local files.
    """
    code_root = Path(__file__).resolve().parent
    explicitly_requested = native_package is not None
    if native_package is None:
        detected = Path(__file__).resolve().parents[2]
        if not (detected / "src/work-burst.mjs").is_file():
            result = {"status": "NOT_REQUESTED_UNBOUND", "reason": "NATIVE_PACKAGE_NOT_AVAILABLE",
                      "executionScope": "SOURCE_ONLY_LOCAL_REFERENCES",
                      "newNativeBurstInvocations": 0, "reusedNativeBurstInvocations": 0,
                      "hostedUpdates": 0, "hostVerified": False}
            atomic_json(state / "native_workburst_receipt.json", result)
            return result
        native_package = detected
    native_package = Path(native_package).resolve()
    paths = {
        "bridge": code_root / "integrations/workburst-bridge.mjs",
        "registry": root / "inputs/ariadne_v07_atlas.json",
        "catalog": root / "peer-inputs/next144-civilizational-capabilities.json",
        "workBurst": native_package / "src/work-burst.mjs",
        "next144": code_root / "peer-inputs/next144.mjs",
        "modeIngress": code_root / "integrations/reused-mode-ingress.mjs",
    }
    if any(not path.is_file() for path in paths.values()):
        missing = sorted(key for key, path in paths.items() if not path.is_file())
        raise IntegrationHold("NATIVE_WORKBURST_DEPENDENCY_MISSING:" + ",".join(missing))
    counts = {name: 0 for name in ("ATLAS", "ARIADNE", "SWARMCHAT", "IRON_EMPIRE")}
    coordinates, requests, coordinate_platforms = set(), set(), set()
    if len(envelopes) != 6912:
        raise IntegrationHold("NATIVE_INPUT_COUNT")
    for envelope in envelopes:
        payload = envelope.get("payload", {})
        coordinate = payload.get("identity", {}).get("coordinate")
        platform = payload.get("platform")
        if (payload.get("runId") != run_id or payload.get("passId") != latest_pass or
                platform not in counts or not isinstance(coordinate, str) or
                envelope.get("requestId") in requests or (coordinate, platform) in coordinate_platforms):
            raise IntegrationHold("NATIVE_INPUT_BINDING")
        requests.add(envelope["requestId"])
        coordinates.add(coordinate)
        coordinate_platforms.add((coordinate, platform))
        counts[platform] += 1
    if len(coordinates) != 1728 or set(counts.values()) != {1728}:
        raise IntegrationHold("NATIVE_INPUT_CENSUS")
    input_path = state / "native_projection_inputs.json"
    atomic_json(input_path, envelopes)
    input_sha = hashlib.sha256(input_path.read_bytes()).hexdigest()
    module_digests = {key: hashlib.sha256(path.read_bytes()).hexdigest() for key, path in paths.items()}
    command = ["node", str(paths["bridge"]), str(input_path), str(paths["registry"]),
               str(paths["catalog"]), str(paths["workBurst"]), str(paths["next144"]), str(paths["modeIngress"])]
    try:
        process = subprocess.run(command, check=False, capture_output=True, timeout=120)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise IntegrationHold("NATIVE_WORKBURST_EXECUTION_UNAVAILABLE:" + type(error).__name__) from None
    if process.returncode != 0:
        # Native modules emit a compact reason, never source bodies, on failure.
        reason = process.stderr.decode("utf-8", errors="replace").strip()[:500]
        raise IntegrationHold("NATIVE_WORKBURST_HELD:" + reason)
    receipt = strict_json(process.stdout)
    if not isinstance(receipt, dict):
        raise IntegrationHold("NATIVE_RECEIPT_SHAPE")
    unchanged = (input_sha == hashlib.sha256(input_path.read_bytes()).hexdigest() and
                 module_digests == {key: hashlib.sha256(path.read_bytes()).hexdigest() for key, path in paths.items()})
    expected_pins = {key: module_digests[key] for key in ("registry", "catalog", "workBurst", "next144", "modeIngress")}
    expected_config = {"nativeBatchSize": 96, "maxParallel": 12, "operator": "LOCAL_SOURCE_PROJECTION"}
    scalar_checks = {
        "schema": "atlas.twelve-pass.native-work-burst/v1",
        "status": "LOCAL_SOURCE_PROJECTIONS_CHECKED", "inputSha256": input_sha,
        "runIds": [run_id], "passIds": [latest_pass], "modulePins": expected_pins,
        "projectionsChecked": 6912, "uniqueNodes": 1728, "platforms": counts,
        "nativeBurstInvocations": 72, "maxParallel": 12, "executionConfig": expected_config,
        "proposedSourceWorkInitiatives": 104, "protectedOptionalSourceInitiatives": 40,
        "distinctModelVisits": 0, "implementedNodeTickets": 0, "hostedUpdates": 0,
        "canonEffect": "NONE", "hostVerified": False,
        "originalR02IngressReused": True, "secondSchedulerCreated": False,
    }
    if set(receipt) != set(scalar_checks) | {"pages", "receiptDigest"}:
        raise IntegrationHold("NATIVE_RECEIPT_SHAPE")
    if not unchanged or any(type(receipt.get(key)) is not type(value) or receipt.get(key) != value
                            for key, value in scalar_checks.items()):
        raise IntegrationHold("NATIVE_RECEIPT_BINDING")
    pages = receipt.get("pages")
    if not isinstance(pages, list) or len(pages) != 72:
        raise IntegrationHold("NATIVE_RECEIPT_PAGE_COUNT")
    for index, page in enumerate(pages, 1):
        if (not isinstance(page, dict) or set(page) != {"index", "count", "receiptDigest", "waves"} or
                type(page["index"]) is not int or page["index"] != index or
                type(page["count"]) is not int or page["count"] != 96 or
                type(page["waves"]) is not int or not 1 <= page["waves"] <= 96 or
                type(page["receiptDigest"]) is not str or len(page["receiptDigest"]) != 64 or
                any(char not in "0123456789abcdef" for char in page["receiptDigest"])):
            raise IntegrationHold("NATIVE_RECEIPT_PAGE_BINDING")
    pages_bytes = json.dumps(pages, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    if receipt.get("receiptDigest") != hashlib.sha256(pages_bytes).hexdigest():
        raise IntegrationHold("NATIVE_RECEIPT_DIGEST")
    result = {**receipt, "wrapperStatus": "CURRENT_INPUT_AND_MODULE_BINDING_VERIFIED",
              "requestedExplicitly": explicitly_requested,
              "bridgeSha256": module_digests["bridge"],
              "pipelineSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              "nativePackage": str(native_package), "newNativeBurstInvocations": 72,
              "reusedNativeBurstInvocations": 0,
              "countMeaning": "FRESH_LOCAL_SOURCE_CHECKS_NOT_NEW_EVOLUTION_PASSES_DELIVERIES_OR_MODEL_TURNS"}
    atomic_json(state / "native_workburst_receipt.json", result)
    return result


def build(root, state, *, command="build", cycle_id=None, expected_head=None,
          invalidation_path=None, native_package=None):
    """Return an evidence manifest; local reference materialization is real."""
    inputs = read_inputs(root)
    started = time.time()
    with build_lock(state / "build.lock"):
        with EvolutionEngine(state / "evolution.sqlite", **inputs) as engine:
            if command == "begin-cycle":
                if not cycle_id or not expected_head:
                    raise IntegrationHold("CYCLE_ID_AND_EXPECTED_HEAD_REQUIRED")
                return engine.begin_cycle(cycle_id, expected_head=expected_head)
            if command == "invalidate":
                if not expected_head or not invalidation_path:
                    raise IntegrationHold("EVENT_FILE_AND_EXPECTED_HEAD_REQUIRED")
                event = strict_json(invalidation_path.read_bytes())
                if set(event) != {"eventId", "changes"}:
                    raise IntegrationHold("INVALIDATION_EVENT_SHAPE")
                return engine.invalidate(event["eventId"], event["changes"], expected_head=expected_head)
            if command == "status":
                return engine.summary()
            if command == "verify":
                result = {"engine": engine.verify(expected_head=expected_head)}
                if (state / "outbox.sqlite").exists():
                    registry = SourceRegistry(inputs["original_source_bytes"], inputs["catalog_bytes"])
                    result["outbox"] = DeliveryOutbox(state / "outbox.sqlite", registry).verify()
                    result["currentLocalReferences"] = verify_local_references(registry, engine, state)
                return result
            pass_log = []

            def progress(receipt):
                pass_log.append(receipt)
                print(json.dumps({"pass": receipt["passId"], "stage": receipt["name"],
                                  "predicateEvaluations": receipt["totalPredicateEvaluations"]}),
                      file=sys.stderr, flush=True)

            engine.run_all(cycle_id=cycle_id or "cupwake-turbo12-20261123", progress=progress)
            engine_check = engine.verify(expected_head=engine.head)
            summary = engine.summary()
            slots = list(engine.outbox_slots())
            registry = SourceRegistry(inputs["original_source_bytes"], inputs["catalog_bytes"])
            envelopes = [registry.projection(slot["nodeId"], slot["platform"], slot["runId"],
                                             slot["passId"], slot["route"]) for slot in slots]
            outbox = DeliveryOutbox(state / "outbox.sqlite", registry)
            added = outbox.enqueue_many(envelopes)
            result = outbox.drain(LocalFileAdapter(state / "projections"),
                                  LocalOwnerAuthorizer(principal="owner-authorized-circuit-build"),
                                  worker_id="cupwake-evolution-build")
            outbox_check = outbox.verify()
            delivery = outbox.summary()
            if delivery["states"] != {"LOCAL_DELIVERED": delivery["total"]} or delivery["total"] < 6912:
                raise IntegrationHold("LOCAL_DELIVERY_INCOMPLETE:" + json.dumps(delivery["states"], sort_keys=True))
            readback = verify_local_references(registry, engine, state)
            latest_pass = max(slot["passId"] for slot in slots)
            try:
                native_workburst = run_native_workburst(root, state, envelopes, run_id=summary["runId"],
                                                        latest_pass=latest_pass, native_package=native_package)
            except (IntegrationHold, EvolutionError, OSError, ValueError) as error:
                held = {"status": "BUILD_HELD", "reason": str(error),
                        "phase": "NATIVE_WORKBURST_INTEGRATION", "hostedUpdates": 0,
                        "hostVerified": False, "requestedExplicitly": native_package is not None}
                atomic_json(state / "native_workburst_receipt.json", held)
                atomic_json(state / "ONE_BUILD_MANIFEST.json", {
                    "schema": "cupwake.one-build/v1", "status": "BUILD_HELD",
                    "createdAt": datetime.now(timezone.utc).isoformat(),
                    "engine": summary, "engineVerification": engine_check,
                    "newPassesThisInvocation": len(pass_log), "newOutboxIntentsThisInvocation": added,
                    "localDeliveriesThisInvocation": result["processed"],
                    "currentLocalReferences": readback, "outboxVerification": outbox_check,
                    "nativeWorkBurst": held,
                    "production": {"hostNodeUpdatesVerified": 0, "semanticAcceptances": 0,
                                   "storyCanonChanges": 0, "modelInvocationsByEngine": 0},
                })
                raise
            node_index = []
            for node_id in sorted(registry._nodes):
                identity = registry.identity(node_id)
                node_index.append({**identity, "sourceName": registry._nodes[node_id]["name"],
                                   "sourceProposalSuggestedMode": registry._catalog[node_id[:7]]["suggestedMode"],
                                   "latestPass": latest_pass, "platforms": ["ATLAS", "ARIADNE", "SWARMCHAT", "IRON_EMPIRE"],
                                   "status": "LOCAL_REFERENCE_AVAILABLE", "implemented": False})
            index = {"schema": "cupwake.common-node-index/v1", "nodes": node_index,
                     "authorityEffect": "NONE", "containsOwnerSourceNames": True}
            atomic_json(state / "common_node_index.json", index)
            atomic_json(state / "last_drain.json", result)
            manifest = {
                "schema": "cupwake.one-build/v1", "status": "LOCAL_BUILD_AND_REFERENCE_INTEGRATION_COMPLETE",
                "createdAt": datetime.now(timezone.utc).isoformat(),
                "mantra": "1728 nodes · 144 spheres · 12 houses · 1 build",
                "engine": summary, "engineVerification": engine_check,
                "passNames": list(PASS_NAMES), "newPassesThisInvocation": len(pass_log),
                "newOutboxIntentsThisInvocation": added, "localDeliveriesThisInvocation": result["processed"],
                "delivery": delivery, "outboxVerification": outbox_check,
                "currentLocalReferences": readback,
                "nativeWorkBurst": native_workburst,
                "pipelineSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                "nodeIndexSha256": hashlib.sha256((state / "common_node_index.json").read_bytes()).hexdigest(),
                "systemStatus": {name: {"commonNodes": 1728,
                    "state": "LOCAL_REFERENCE_STORE_AVAILABLE",
                    "hostApplicationIntegration": "NOT_DEPLOYED",
                    "privateActivityImported": False}
                    for name in ["ATLAS", "ARIADNE", "SWARMCHAT", "IRON_EMPIRE"]},
                "production": {"hostNodeUpdatesVerified": 0, "semanticAcceptances": 0,
                               "storyCanonChanges": 0, "modelInvocationsByEngine": 0,
                               "brokerSummaryReceipt": "RECORDED_SEPARATELY_WHEN_OBSERVED"},
                "elapsedSeconds": round(time.time() - started, 3),
                "repeat": "Resume with build; begin a versioned new cycle explicitly after verified changes.",
            }
            atomic_json(state / "ONE_BUILD_MANIFEST.json", manifest)
            return manifest


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["build", "status", "verify", "invalidate", "begin-cycle"])
    parser.add_argument("--root", required=True, type=Path, help="Owner-local circuit inputs and design directory")
    parser.add_argument("--state", type=Path, help="Persistent state directory, defaults to ROOT/runtime")
    parser.add_argument("--cycle-id")
    parser.add_argument("--expected-head")
    parser.add_argument("--event-file", type=Path)
    parser.add_argument("--native-package", type=Path,
                        help="Existing Atlas ONE package containing src/work-burst.mjs; native failure holds the build")
    args = parser.parse_args(argv)
    try:
        print(wire(build(args.root.resolve(), (args.state or args.root / "runtime").resolve(),
                         command=args.command, cycle_id=args.cycle_id, expected_head=args.expected_head,
                         invalidation_path=args.event_file, native_package=args.native_package)), end="")
        return 0
    except (EvolutionError, IntegrationHold, ValueError, OSError, sqlite3.Error) as error:
        print(wire({"status": "BUILD_HELD", "reason": str(error), "hostChangesClaimed": 0}))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
