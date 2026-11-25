"""Read-only comparison of a workspace's already saved retrieval observations.

This adapter checks existing pins and reconstructs fragment bindings. It never
trains, encodes a query, scores a candidate, selects a checkpoint, or changes the
workspace. Current source rights and historical execution authenticity are not
established by a locally consistent receipt.
"""
from __future__ import annotations

from pathlib import Path

from .corpus import file_sha256, load_corpus
from .evaluation import build_corpus_pairs, validate_pair_splits
from .registry import load_registry
from .workspace import check_pin, load_config, strict_json, within


def compare_saved_workspace(root, *, baseline="flat", candidate="graph", split="test",
                            allow_lexical_control=False, expected_config_sha256=None):
    """Bind and compare saved observations; fail if any observed input drifts.

The caller remains responsible for authorization to this private local workspace.
The function has no public transport registration and no provider invocation.
"""
    from .comparison import bind_fragment_evaluation, canonical_digest, compare_evaluations
    from .model import AddressedGraphEncoder

    root = Path(root).resolve()
    allowed = {"graph", "flat", "graph_initial", "tfidf", "bm25"}
    if baseline not in allowed or candidate not in allowed or split not in {"test", "validation"}:
        raise ValueError("COMPARISON_UNKNOWN_LANE_OR_SPLIT")
    if baseline == candidate:
        raise ValueError("COMPARISON_DISTINCT_LANES_REQUIRED")
    if not allow_lexical_control and {baseline, candidate} & {"tfidf", "bm25"}:
        raise ValueError("COMPARISON_LEXICAL_DIAGNOSTIC_OPT_IN_REQUIRED")
    config, config_sha = load_config(root)
    if expected_config_sha256 is not None and config_sha != expected_config_sha256:
        raise ValueError("COMPARISON_CONFIG_PIN_MISMATCH")
    watched = {root / "config.json": config_sha}

    def read_pin(pin):
        path = check_pin(root, pin)
        raw = path.read_bytes()
        # The second check binds the bytes actually parsed, not just a prior stat.
        import hashlib
        if hashlib.sha256(raw).hexdigest() != pin["sha256"]:
            raise ValueError("COMPARISON_INPUT_CHANGED_DURING_READ")
        watched[path] = pin["sha256"]
        return strict_json(raw), path

    if not config.get("lastRun") or not config.get("evaluation") or not config.get("corpus"):
        raise ValueError("COMPARISON_SAVED_RUN_EVALUATION_AND_CORPUS_REQUIRED")
    run, run_path = read_pin(config["lastRun"])
    evaluation, evaluation_path = read_pin(config["evaluation"])
    if (run.get("schema") != "atlas.work-learning.matched-run/v1"
            or evaluation.get("schema") != "atlas.work-learning.evaluation-summary/v1"):
        raise ValueError("COMPARISON_UNSUPPORTED_SAVED_SCHEMA")
    if (evaluation.get("runSha256") != config["lastRun"]["sha256"]
            or evaluation.get("runId") != run.get("id")):
        raise ValueError("COMPARISON_RUN_BINDING_MISMATCH")
    for field, cfg_key in (("registrySha256", "registry"), ("corpusSha256", "corpus")):
        expected = config[cfg_key]["sha256"]
        if run.get(field) != expected or evaluation.get(field) != expected:
            raise ValueError("COMPARISON_SOURCE_BINDING_MISMATCH:" + field)
    details_pin = {"path": str((run_path.parent / "evaluation-details.json").relative_to(root)),
                   "sha256": evaluation["detailsSha256"]}
    details, details_path = read_pin(details_pin)
    if split not in details or any(lane not in details[split] for lane in (baseline, candidate)):
        raise ValueError("COMPARISON_SAVED_LANE_NOT_OBSERVED")
    registry_path = check_pin(root, config["registry"])
    corpus_path = check_pin(root, config["corpus"])
    watched[registry_path] = config["registry"]["sha256"]
    watched[corpus_path] = config["corpus"]["sha256"]
    registry = load_registry(registry_path)
    corpus = load_corpus(corpus_path, config["corpus"]["sha256"])
    fragment_build = build_corpus_pairs(corpus["items"], with_manifest=True)
    if canonical_digest(fragment_build["manifest"]) != canonical_digest(evaluation["fragmentPreprocessing"]):
        raise ValueError("COMPARISON_FRAGMENT_PROTOCOL_DRIFT")
    pairs = fragment_build["pairs"]
    validate_pair_splits(pairs)
    pair_map = {p["id"]: p for p in pairs if p["split"] == split}
    family_split_rows = [{k: p[k] for k in ("id", "family_id", "split", "source_id", "source_version",
                                           "source_sha256", "text_sha256")} for p in sorted(pairs, key=lambda p: p["id"])]
    family_split_sha = canonical_digest(family_split_rows)
    code_root = Path(__file__).resolve().parent
    code_pins = [{"path": p.name, "sha256": file_sha256(p)} for p in sorted(code_root.glob("*.py"))]
    for pin in code_pins:
        watched[code_root / pin["path"]] = pin["sha256"]
    code_sha = canonical_digest(code_pins)
    observations = {}
    envelopes = {}
    common_refs = [{"id": "workspace-config", "sha256": config_sha},
                   {"id": "saved-run", "sha256": config["lastRun"]["sha256"]},
                   {"id": "saved-evaluation-summary", "sha256": config["evaluation"]["sha256"]},
                   {"id": "saved-evaluation-details", "sha256": details_pin["sha256"]},
                   {"id": "canonical-corpus", "sha256": config["corpus"]["sha256"]},
                   {"id": "current-inspected-python-code", "sha256": code_sha}]
    for lane in (baseline, candidate):
        receipt = details[split][lane]
        provenance = {"receipt_sha256": canonical_digest(receipt),
                      "corpus_sha256": config["corpus"]["sha256"],
                      "code_sha256": code_sha,
                      "source_family_split_sha256": family_split_sha,
                      "evidence_refs": list(common_refs)}
        resources = {}
        lane_observation = {"kind": "SAVED_DIAGNOSTIC_REAGGREGATION", "new_optimizer_updates": 0,
                            "new_model_inference_calls": 0, "new_test_scoring_calls": 0,
                            "code_binding_scope": "CURRENT_INSPECTED_CODE_NOT_HISTORICAL_EXECUTION_ATTESTATION"}
        if lane in {"graph", "flat", "graph_initial"}:
            model_lane = "graph" if lane == "graph_initial" else lane
            pin_kind = "initial" if lane == "graph_initial" else "selected"
            model_pin = run["lanes"][model_lane][pin_kind]
            manifest, manifest_path = read_pin(model_pin)
            weights_path = within(root, str((manifest_path.parent / manifest["weights_file"]).relative_to(root)))
            watched[weights_path] = manifest["weights_sha256"]
            model = AddressedGraphEncoder.load(manifest_path.parent, registry,
                expected_corpus_sha256=corpus["sha256"], expected_manifest_sha256=model_pin["sha256"])
            descriptor = model.descriptor()
            if (receipt.get("checkpoint_sha256") != model_pin["sha256"]
                    or receipt.get("state_sha256") != descriptor["learned_state_sha256"]):
                raise ValueError("COMPARISON_SELECTED_CHECKPOINT_MISMATCH")
            provenance.update({"checkpoint_sha256": model_pin["sha256"],
                               "state_sha256": descriptor["learned_state_sha256"],
                               "model_config": manifest["config"],
                               "model_config_sha256": canonical_digest(manifest["config"])})
            provenance["evidence_refs"].append({"id": lane + "-checkpoint-manifest", "sha256": model_pin["sha256"]})
            provenance["evidence_refs"].append({"id": lane + "-weights", "sha256": manifest["weights_sha256"]})
            resources.update({"stored_parameter_count": descriptor["parameter_count"],
                              "active_trainable_parameter_count": descriptor["active_trainable_parameter_count"]})
            report_pin = run["lanes"][model_lane]["trainingReport"]
            training, _ = read_pin(report_pin)
            if (training["registry_sha256"] != config["registry"]["sha256"]
                    or training["corpus_sha256"] != config["corpus"]["sha256"]
                    or training[pin_kind + "_checkpoint"]["manifest_sha256"] != model_pin["sha256"]):
                raise ValueError("COMPARISON_TRAINING_CHECKPOINT_BINDING_MISMATCH")
            provenance["evidence_refs"].append({"id": lane + "-training-report", "sha256": report_pin["sha256"]})
            if lane == "graph_initial":
                resources["optimizer_updates"] = 0
                resources["training_pair_presentations"] = 0
            else:
                resources["optimizer_updates"] = training["actual_updates"]
                resources["training_pair_presentations"] = sum(row["batch_pairs"] for row in training["loss_history"])
            lane_observation.update({"checkpoint_kind": pin_kind,
                "selected_checkpoint_step": manifest["training_state"]["step"],
                "resource_observation_scope": "FULL_COMPLETED_TRAINING_RUN_NOT_COST_TO_SELECTED_STEP",
                "declared_training_config": training["training_config"],
                "training_elapsed_seconds_observed": training["run_seconds"],
                "training_elapsed_meaning": "RECORDED_TRAINING_LOOP_WALL_TIME_NOT_MATCHED_RETRIEVAL_LATENCY",
                "historical_training_report_sha256": report_pin["sha256"]})
        try:
            query_pairs = [pair_map[item_id] for item_id in receipt["query_ids"]]
            candidate_pairs = [pair_map[item_id] for item_id in receipt["candidate_ids"]]
        except KeyError as exc:
            raise ValueError("COMPARISON_UNKNOWN_SAVED_ITEM") from exc
        envelopes[lane] = bind_fragment_evaluation(receipt, query_pairs=query_pairs,
            candidate_pairs=candidate_pairs, expected_registry_sha256=config["registry"]["sha256"],
            provenance=provenance, resources=resources)
        observations[lane] = lane_observation
    result = compare_evaluations(envelopes[baseline], envelopes[candidate],
                                 allow_lexical_control=allow_lexical_control)
    for path, expected in watched.items():
        if file_sha256(path) != expected:
            raise ValueError("COMPARISON_INPUT_CHANGED_DURING_READ")
    return {"schema": "atlas.work-learning.saved-comparison/v1", "workspaceId": config["workspaceId"],
            "runId": run["id"], "split": split, "baseline": baseline, "candidate": candidate,
            "comparison": result, "bindings": envelopes, "observations": observations,
            "inputPins": common_refs, "inspectedCodePins": code_pins,
            "sourceFamilySplitSha256": family_split_sha,
            "newTrainingUpdates": 0, "newModelInferenceCalls": 0, "newTestScoringCalls": 0,
            "workspaceChanged": False, "servingPolicyChanged": False,
            "activeServingPolicy": config["retrieval"],
            "sourceEligibility": "HISTORICAL_SNAPSHOT_ONLY_CURRENT_REMOTE_RIGHTS_NOT_REAUTHENTICATED",
            "testExposure": "REAGGREGATED_ALREADY_CONSUMED_RESULTS_NOT_A_FRESH_TEST",
            "independentSemanticValidation": False, "hostedDeployment": False}
