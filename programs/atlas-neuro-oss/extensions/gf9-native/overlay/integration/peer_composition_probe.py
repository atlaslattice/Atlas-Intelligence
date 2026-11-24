"""One synthetic composition check of source-pinned peer planning and int8 audit.

The peer modules are reviewed input, not copied here. This script imports only
the pinned hard-negative planner (standard library) and the pinned local audit.
It does not import batching/events, train, invoke a model or grant source access.
"""
from __future__ import annotations

import argparse
import datetime
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import sys

PEER_PINS = {
    "batching.py": "f36b097e793422f4ecbf06ebfa3b313fa24eee68c8f97745cae7ffe2c96798cf",
    "hard_negatives.py": "50d688e25b46631f9edde824420f3e428949ef11eb3504620d04dee726bac66f",
    "events.py": "a6068e5f8efe9f4e228ccf7d860f876435fd4ede944b6a6e4523b887ca8622d0",
}
AUDIT_PIN = "b2dc0a4a39cf17c968c186613e9271e39f29bece0c258c28875ce8a1d18b8563"
PIN_FIELDS = ("item_id", "source_id", "source_revision", "source_sha256", "text_sha256")


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()


def file_sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def fixture():
    def entry(identifier, *, split="train", family=None, aliases=None, source=None):
        source = source or "synthetic-source:" + identifier
        return {"item_id": identifier, "source_id": source, "source_revision": "synthetic-v1",
                "source_sha256": hashlib.sha256(source.encode()).hexdigest(),
                "text_sha256": hashlib.sha256(("synthetic-text:" + identifier).encode()).hexdigest(),
                "family_id": family or "synthetic-family:" + identifier, "aliases": aliases or [],
                "source_aliases": [], "split": split, "purpose": "Work",
                "training_eligible": split == "train", "revoked": False}

    query = entry("query")
    positive = entry("positive")
    first, second = entry("a-near"), entry("b-near")
    held = entry("test-only", split="test")
    bridge = entry("bridge", aliases=["test-only"])
    alias = entry("transitive-alias", aliases=["bridge"])
    anchor = entry("positive-family", family=positive["family_id"])
    margin = entry("above-margin")
    duplicate = entry("duplicate-source", source=first["source_id"])
    entries = [query, positive, first, second, held, bridge, alias, anchor, margin, duplicate]
    pin = lambda row: {field: row[field] for field in PIN_FIELDS}
    scores = {"a-near": .001 / math.sqrt(1 + .001 ** 2),
              "b-near": .002 / math.sqrt(1 + .002 ** 2), "test-only": .7,
              "transitive-alias": .6, "positive-family": .65,
              "above-margin": .88, "duplicate-source": .0009}
    candidates = [{**pin(row), "score": scores[row["item_id"]]}
                  for row in [first, second, held, alias, anchor, margin, duplicate]]
    request = {
        "query": pin(query), "positives": [{**pin(positive), "score": .9}], "candidates": candidates,
        "manifest": {"manifest_id": "SYNTHETIC_CALLER_ASSERTION_NO_REAL_RIGHTS",
                     "dataset_revision": "composition-fixture-v1", "entries": entries},
        "score_context": {"kind": "neural_similarity", "model_id": "SYNTHETIC_NO_MODEL",
                          "model_revision": "fixed-numeric-fixture-v1", "scoring_run_id": "synthetic-composition-v1",
                          "higher_is_better": True},
        "options": {"num_negatives": 2, "min_score": None, "max_score": None, "absolute_margin": .1,
                    "relative_margin": None, "range_min": 0, "range_max": None, "sampling": "top", "seed": 1728},
    }
    vector_bank = {
        tuple(first[k] for k in PIN_FIELDS): [1.0, .001] + [0.0] * 382,
        tuple(second[k] for k in PIN_FIELDS): [1.0, .002] + [0.0] * 382,
    }
    return request, vector_bank


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--peer-root", type=Path, required=True)
    parser.add_argument("--audit-module", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    paths = {str(args.peer_root / name): expected for name, expected in PEER_PINS.items()}
    paths[str(args.audit_module)] = AUDIT_PIN
    observed = {path: file_sha(Path(path)) for path in paths}
    if observed != paths:
        raise RuntimeError("SOURCE_PIN_MISMATCH: no imported code or probe run")
    peer = load("peer_hard_negatives_frozen", args.peer_root / "hard_negatives.py")
    audit = load("atlas_quantization_audit_frozen", args.audit_module)
    request, vector_bank = fixture()
    input_before = digest(request)
    plan = peer.plan_hard_negatives(request)
    selected_ids = [row["item_id"] for row in plan["selected"]]
    selected_vectors = [{"id": row["item_id"], "vector": vector_bank[tuple(row[k] for k in PIN_FIELDS)]}
                        for row in plan["selected"]]
    result = audit.audit_symmetric_int8(selected_vectors,
        [{"id": "independent-numeric-query", "vector": [0.0, 1.0] + [0.0] * 382}],
        top_k=1, near_tie_tolerance=.002, expected_dimension=384)
    rejections = {row["item_id"]: row["reason"] for row in plan["rejections"]}
    checks = {
        "selected_exact_manual_oracle": selected_ids == ["b-near", "a-near"],
        "test_candidate_excluded": rejections.get("test-only") == "non_training_split",
        "transitive_test_alias_excluded": rejections.get("transitive-alias", "").startswith("quarantined_"),
        "positive_family_excluded": rejections.get("positive-family") == "anchor_family",
        "above_margin_excluded": rejections.get("above-margin") == "absolute_margin",
        "duplicate_source_excluded": rejections.get("duplicate-source", "").startswith("duplicate_negative_"),
        "only_selected_exact_pins_joined": len(selected_vectors) == 2 and len(vector_bank) == 2,
        "input_unchanged": input_before == digest(request),
        "planner_does_not_claim_rights": plan["source_rights_verified"] is False and plan["authority_effect"] == "NONE",
        "original_numeric_top1_preserved_in_report": result["queries"][0]["original_top_ids"] == ["b-near"],
        "quantization_loss_remains_visible": result["queries"][0]["quantized_top_ids"] == ["a-near"] and result["ranking"]["top1_agreement_count"] == 0,
        "near_tie_flip_recorded": result["ranking"]["near_tie_flip_count"] == 1,
    }
    after = {path: file_sha(Path(path)) for path in paths}
    checks["source_pins_stable"] = after == observed
    receipt = {
        "schema": "atlas.oss-peer-composition-review/v1", "created_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "status": "PASS_WITH_OBSERVED_QUANTIZATION_RANK_LOSS" if all(checks.values()) else "HOLD",
        "attribution": {"peer_source": "independent Atlas synthesis contributor; code hashes retained", "peer_modules_modified": False,
                        "executed_peer_module": "hard_negatives.py", "other_reviewed_modules_not_executed": ["batching.py", "events.py"]},
        "source_pins_before": observed, "source_pins_after": after, "probe_source_sha256": file_sha(Path(__file__)),
        "dependency_review": {"hard_negatives.py": "standard library only; no provider, model, filesystem or optimizer calls in inspected planner",
                              "batching.py": "standard library; metadata-only planner, not executed here",
                              "events.py": "standard library plus NumPy; numeric propagation, not executed here"},
        "composition_runs": 1, "planner_calls": 1, "quantization_audit_calls": 1,
        "checks": checks, "checks_passed": sum(checks.values()), "checks_total": len(checks),
        "synthetic_fixture_request": request, "planner_result": plan, "quantization_result": result,
        "interpretation": "A reviewed train-only proposal can compose with the audit through exact source pins, while a real near-tie rank loss remains visible. This does not authorize training or compressed serving.",
        "limitations": ["Eligibility fields are synthetic caller assertions, not authenticated source grants.",
                        "The required neural_similarity score-context label is a schema fixture; numeric scores are synthetic and no neural model ran.",
                        "One bounded probe does not establish all planner behavior, semantic negative truth, production latency or host integration."],
        "effects": {"model_calls": 0, "training_updates": 0, "weights_changed": False, "source_mutations": 0,
                    "host_code_enabled": False, "background_jobs_created": 0},
        "next_falsifier": "With separately eligible real scored candidates, attempt transitive source-alias and revision leakage under authoritative revocation, then test whether compression changes human-reviewed negative difficulty ordering.",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x") as handle:
        json.dump(receipt, handle, indent=2, allow_nan=False)
        handle.write("\n")
    print(json.dumps({"status": receipt["status"], "checks_passed": receipt["checks_passed"],
                      "checks_total": receipt["checks_total"], "selected_ids": selected_ids,
                      "rejections": rejections, "receipt": str(args.output), "receipt_sha256": file_sha(args.output)}, indent=2))
    return 0 if all(checks.values()) else 1


if __name__ == "__main__":
    raise SystemExit(main())
