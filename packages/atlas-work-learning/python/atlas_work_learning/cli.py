"""Owner-local lifecycle. Public MCP/Responses tools expose only read operations."""
from __future__ import annotations

import argparse
import copy
from pathlib import Path
import sys
import uuid

from .corpus import file_sha256, import_corpus, load_corpus, prepare_r08
from .registry import ARIADNE_SHA256, load_registry
from .workspace import (attach_corpus, check_pin, initialize_workspace, load_config, pinned_files,
    private_json, save_config, source_manifest, strict_json, utc_now, within, workspace_lock)


def _print(value, stream=None):
    import json
    print(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False), file=stream or sys.stdout)


def _ledger(config, root):
    from .episodes import EpisodeLedger
    return EpisodeLedger(within(root, config["ledger"]), owner=config["owner"])


def train_workspace(root, *, updates=180, seed=1728, feature_dim=256, embedding_dim=24,
                    batch_size=16, learning_rate=.003, validation_every=30, continue_previous=False):
    from .model import AddressedGraphEncoder, ModelConfig
    from .training import TrainingConfig, train_model
    root = Path(root).resolve()
    with workspace_lock(root):
        config, previous_config = load_config(root)
        registry = load_registry(check_pin(root, config["registry"]))
        if not config.get("corpus"):
            raise ValueError("CORPUS_REQUIRED_BEFORE_TRAINING")
        corpus = load_corpus(check_pin(root, config["corpus"]), config["corpus"]["sha256"])
        ledger = _ledger(config, root)
        try:
            ledger_receipt = ledger.verify_chain()
            revoked = set(ledger.status().get("revoked_source_ids", []))
            if any(row["source_id"] in revoked for item in corpus["items"] for row in [item, *item.get("aliases", [])]):
                raise ValueError("SOURCE_REVOKED_REINGEST_REQUIRED")
            corrections = ledger.training_pairs(corpus_items=corpus["items"], allow_synthetic=False)
        finally:
            ledger.close()
        run_id = utc_now().replace(":", "").replace("+0000", "Z") + "-" + uuid.uuid4().hex[:8]
        run_root = root / "runs" / run_id
        run_root.mkdir(parents=True, exist_ok=False, mode=0o700)
        training_config = TrainingConfig(updates=updates, seed=seed, batch_size=batch_size,
            learning_rate=learning_rate, validation_every=validation_every)
        base = dict(feature_dim=feature_dim, embedding_dim=embedding_dim, seed=seed)
        parent_models = {}
        if continue_previous:
            if not config.get("lastRun"):
                raise ValueError("PREVIOUS_MATCHED_RUN_REQUIRED")
            parent_run = strict_json(check_pin(root, config["lastRun"]).read_bytes())
            eligible_ids = {p["episode_id"] for p in corrections}
            if not set(parent_run.get("trainingEpisodeIds", [])) <= eligible_ids:
                raise ValueError("PARENT_TRAINING_EVIDENCE_WITHDRAWN_REPLAY_REQUIRED")
            for lane in ("graph", "flat"):
                pin = parent_run["lanes"][lane]["selected"]
                parent_models[lane] = AddressedGraphEncoder.load(check_pin(root, pin).parent, registry,
                    expected_corpus_sha256=config["corpus"]["sha256"], expected_manifest_sha256=pin["sha256"])
                if parent_models[lane].config != ModelConfig(**base, hierarchy=lane == "graph"):
                    raise ValueError("CONTINUATION_MODEL_CONFIG_MISMATCH")
        lanes = {}
        for lane in ("graph", "flat"):
            _print({"event": "training_started", "lane": lane, "updates": updates,
                    "eligible_correction_pairs": len(corrections)}, sys.stderr)
            options = dict(model_config=ModelConfig(**base, hierarchy=lane == "graph"),
                           training_config=training_config, correction_pairs=corrections,
                           progress_callback=lambda event, selected_lane=lane: _print({"lane": selected_lane, "progress": event}, sys.stderr))
            if continue_previous:
                options["initial_model"] = parent_models[lane]
            report = train_model(registry, corpus, run_root / lane, **options)
            selected = Path(report["selected_checkpoint"]["directory"]) / "manifest.json"
            final = Path(report["final_checkpoint"]["directory"]) / "manifest.json"
            report_path = Path(report["report_path"])
            initial = Path(report["initial_checkpoint"]["directory"]) / "manifest.json"
            lanes[lane] = {"selected": {"path": str(selected.relative_to(root)), "sha256": file_sha256(selected)},
                           "initial": {"path": str(initial.relative_to(root)), "sha256": file_sha256(initial)},
                           "final": {"path": str(final.relative_to(root)), "sha256": file_sha256(final)},
                           "trainingReport": {"path": str(report_path.relative_to(root)), "sha256": file_sha256(report_path)},
                           "selection": report["validation_selection"]}
        run = {"schema": "atlas.work-learning.matched-run/v1", "id": run_id, "createdAt": utc_now(),
               "workspaceId": config["workspaceId"], "registrySha256": config["registry"]["sha256"],
               "corpusSha256": config["corpus"]["sha256"], "parentConfigSha256": previous_config,
               "modelConfig": base, "trainingConfig": training_config.to_dict(), "lanes": lanes,
               "evidenceLedger": ledger_receipt, "eligibleCorrectionPairs": len(corrections),
               "correctionEpisodeIds": [p["id"] for p in corrections], "testUsedForTraining": False,
               "trainingEpisodeIds": sorted({p["episode_id"] for p in corrections}),
               "testUsedForSelection": False, "continuation": continue_previous,
               "servingDecision": "NEURAL_PRIMARY_LEXICAL_BACKUP_INDEPENDENT_SEMANTIC_EVALUATION_PENDING"}
        run_path = run_root / "run.json"
        run_sha = private_json(run_path, run, immutable=True)
        config["lastRun"] = {"path": str(run_path.relative_to(root)), "sha256": run_sha}
        config["model"] = {**lanes["graph"]["selected"], "trainingEpisodeIds": run["trainingEpisodeIds"]}
        config["evaluation"] = None
        config["previousConfigSha256"] = previous_config
        config["updatedAt"] = utc_now()
        config["retrieval"] = {"method": "neural", "fallback": "lexical", "basis": "NEURAL_PRIMARY_LEXICAL_BACKUP"}
        config_sha = save_config(root, config)
        return {"runId": run_id, "configSha256": config_sha, "run": run,
                "next": "evaluate the frozen selected checkpoints; source-family test data has not yet been scored in this run"}


def _metrics(result):
    fields = ("method", "queries", "candidates", "k", "hit_at_1", "hit_at_k", "mrr_at_k", "ndcg_at_k", "median_rank",
              "query_set_sha256", "candidate_set_sha256", "family_count", "zero_overlap_queries", "state_sha256", "checkpoint_sha256")
    return {k: result[k] for k in fields if k in result}


def _bm25_evaluation(pairs):
    from .evaluation import _protocol, retrieval_metrics
    from .service import LexicalIndex
    import numpy as np
    queries, candidates, targets, receipt = _protocol(pairs, None, 10)
    index = LexicalIndex([{"text": p["target_text"]} for p in candidates])
    scores = np.asarray([index.scores(p["input_text"]) for p in queries])
    return {**receipt, **retrieval_metrics(scores, targets, k=10), "method": "BM25",
            "fit_scope": "CANDIDATE_TEXT_ONLY", "zero_overlap_queries": int(np.sum(np.max(scores, axis=1) <= 0))}


def evaluate_workspace(root):
    from .model import AddressedGraphEncoder, ModelConfig
    from .evaluation import build_corpus_pairs, evaluate_retrieval, lexical_baseline, validate_pair_splits
    root = Path(root).resolve()
    with workspace_lock(root):
        config, config_sha = load_config(root)
        if config.get("evaluation"):
            return strict_json(check_pin(root, config["evaluation"]).read_bytes())
        if not config.get("lastRun"):
            raise ValueError("TRAINED_RUN_REQUIRED")
        run = strict_json(check_pin(root, config["lastRun"]).read_bytes())
        registry = load_registry(check_pin(root, config["registry"]))
        corpus = load_corpus(check_pin(root, config["corpus"]), config["corpus"]["sha256"])
        if run["registrySha256"] != registry["sha256"] or run["corpusSha256"] != corpus["sha256"]:
            raise ValueError("RUN_DATA_PINS_CHANGED")
        fragments = build_corpus_pairs(corpus["items"], with_manifest=True)
        pairs = fragments["pairs"]
        pair_counts = validate_pair_splits(pairs)
        validation = [p for p in pairs if p["split"] == "validation"]
        test = [p for p in pairs if p["split"] == "test"]
        if not test or not validation:
            raise ValueError("NONEMPTY_HELD_OUT_PARTITIONS_REQUIRED")
        results = {"test": {}, "validation": {}}
        initial_pin = run["lanes"]["graph"]["initial"]
        graph_initial = AddressedGraphEncoder.load(check_pin(root, initial_pin).parent, registry,
            expected_corpus_sha256=corpus["sha256"], expected_manifest_sha256=initial_pin["sha256"])
        results["test"]["graph_initial"] = evaluate_retrieval(graph_initial, test)
        for lane in ("graph", "flat"):
            pin = run["lanes"][lane]["selected"]
            model = AddressedGraphEncoder.load(check_pin(root, pin).parent, registry,
                expected_corpus_sha256=corpus["sha256"], expected_manifest_sha256=pin["sha256"])
            results["test"][lane] = evaluate_retrieval(model, test)
            results["validation"][lane] = evaluate_retrieval(model, validation)
        for split, split_pairs in (("test", test), ("validation", validation)):
            results[split]["tfidf"] = lexical_baseline(split_pairs)
            results[split]["bm25"] = _bm25_evaluation(split_pairs)
        run_root = check_pin(root, config["lastRun"]).parent
        details_sha = private_json(run_root / "evaluation-details.json", results, immutable=True)
        existing = [p for p in (root / "runs").glob("*/evaluation.json") if p.parent != run_root]
        test_metrics = {k: _metrics(v) for k, v in results["test"].items()}
        graph_score = test_metrics["graph"]["ndcg_at_k"]
        flat_score = test_metrics["flat"]["ndcg_at_k"]
        lexical_score = max(test_metrics["bm25"]["ndcg_at_k"], test_metrics["tfidf"]["ndcg_at_k"])
        report = {"schema": "atlas.work-learning.evaluation-summary/v1", "runId": run["id"], "createdAt": utc_now(),
                  "registrySha256": registry["sha256"], "corpusSha256": corpus["sha256"],
                  "runSha256": config["lastRun"]["sha256"], "detailsSha256": details_sha,
                  "task": "DISJOINT_FRAGMENT_EXACT_ITEM_RETRIEVAL", "judgmentKind": "SELF_SUPERVISED_DIAGNOSTIC",
                  "independentSemanticValidation": False, "acceptedHsnLabels": 0,
                  "pairCounts": pair_counts, "coverage": corpus["manifest"]["coverage"],
                  "fragmentPreprocessing": fragments["manifest"],
                  "checkpointSelection": {lane: run["lanes"][lane]["selection"] for lane in ("graph", "flat")},
                  "test": test_metrics, "validation": {k: _metrics(v) for k, v in results["validation"].items()},
                  "comparison": {"graphMinusFlatNdcg": graph_score - flat_score,
                                 "graphMinusBestLexicalNdcg": graph_score - lexical_score,
                                 "graphMinusInitialNdcg": graph_score - test_metrics["graph_initial"]["ndcg_at_k"],
                                 "independentLearningSpeedBenefitEstablished": False},
                  "testUsedForCheckpointSelection": False, "priorPackageEvaluations": len(existing),
                  "repeatedTestPanelCaution": bool(existing), "servingMethod": config["retrieval"]["method"],
                  "servingReason": "Neural is the primary path by owner direction; lexical is a backup. Diagnostic scores remain evidence for neural improvement, not an automatic architecture switch.",
                  "limitations": ["Only the verified R05/R08 Work subset is admitted.",
                    "Known source identities, versions, exact duplicates and declared families are grouped; all paraphrase relationships are not established.",
                    "All retrieval judgments are source-derived fragment pairs, not independent human relevance labels.",
                    "Address representations and hierarchy gates are learned parameters, not a claim of physical hypercube equivalence or general intelligence."]}
        report_path = run_root / "evaluation.json"
        report_sha = private_json(report_path, report, immutable=True)
        config["evaluation"] = {"path": str(report_path.relative_to(root)), "sha256": report_sha}
        config["previousConfigSha256"] = config_sha
        config["updatedAt"] = utc_now()
        save_config(root, config)
        return report


def export_server_config(root, output, *, module_root=None, python_executable=None):
    config, digest = load_config(root)
    corpus = load_corpus(check_pin(root, config["corpus"]), config["corpus"]["sha256"]) if config.get("corpus") else None
    identity = {"workspaceId": config["workspaceId"], "registrySha256": config["registry"]["sha256"], "configSha256": digest,
                "corpusSha256": config["corpus"]["sha256"] if config.get("corpus") else None,
                "checkpointSha256": config["model"]["sha256"] if config.get("model") else None}
    runtime_root = Path(module_root).resolve() if module_root else Path(__file__).resolve().parents[1]
    code_files = sorted((runtime_root / "atlas_work_learning").glob("*.py"))
    code_files += sorted((runtime_root.parent / "src").glob("*.mjs"))
    if not code_files:
        raise ValueError("RUNTIME_CODE_FILES_REQUIRED")
    runtime_pins = [{"path": str(path), "sha256": file_sha256(path)} for path in code_files]
    data = {"schema": "atlas.work-learning.local-mcp-config/v1", "owner": config["owner"], "workspaceId": config["workspaceId"],
            "workspace": str(Path(root).resolve()), "moduleRoot": str(runtime_root),
            "pythonExecutable": python_executable or sys.executable, "expectedConfigSha256": digest,
            "sourceManifest": source_manifest(config, corpus), "pins": {"identity": identity, "files": pinned_files(root, config) + runtime_pins},
            "allowOperations": ["status", "search", "node", "episodes", "evaluation"]}
    sha = private_json(output, data)
    return {"serverConfigSha256": sha, "workspaceId": config["workspaceId"], "owner": config["owner"],
            "scope": "LOCAL_READ_ONLY", "hostedDeployment": False}


def parser():
    p = argparse.ArgumentParser(prog="atlas-work-learning", description="Private source-addressed work learning and reproducible read tools")
    p.add_argument("--version", action="version", version="atlas-work-learning 0.1.0")
    sub = p.add_subparsers(dest="command", required=True)
    init = sub.add_parser("init", help="Initialize a private workspace from exact original Ariadne bytes and optional canonical corpus")
    init.add_argument("--workspace", required=True); init.add_argument("--registry", required=True)
    init.add_argument("--registry-sha256", default=ARIADNE_SHA256); init.add_argument("--registry-uri", default="atlas-source://ariadne/v0.7")
    init.add_argument("--corpus"); init.add_argument("--corpus-sha256"); init.add_argument("--owner", default="owner-local"); init.add_argument("--workspace-id")
    ingest = sub.add_parser("ingest", help="Validate Work records, deduplicate, preserve lineage, and attach a new corpus revision")
    ingest.add_argument("--workspace", required=True); ingest.add_argument("--input", required=True); ingest.add_argument("--input-sha256")
    ingest.add_argument("--canonical", action="store_true"); ingest.add_argument("--seed", type=int, default=1728)
    prepare = sub.add_parser("prepare-r08", help="Replay the already selected private R08 Work snapshot and exact source citations")
    prepare.add_argument("--review", required=True); prepare.add_argument("--input-root", required=True); prepare.add_argument("--output", required=True)
    prepare.add_argument("--seed", type=int, default=1728)
    record = sub.add_parser("record", help="Append an owner-local productive-work evidence episode")
    record.add_argument("--workspace", required=True); record.add_argument("--input", required=True)
    change = sub.add_parser("episode-status", help="Append a hold, revocation or acceptance event without rewriting history")
    change.add_argument("--workspace", required=True); change.add_argument("--id", required=True); change.add_argument("--status", required=True); change.add_argument("--reason", required=True)
    revoke = sub.add_parser("revoke-source", help="Prevent future retrieval and training for a source and preserve its audit trail")
    revoke.add_argument("--workspace", required=True); revoke.add_argument("--source-id", required=True); revoke.add_argument("--reason", required=True)
    train = sub.add_parser("train", help="Run a bounded matched graph/flat training experiment, selecting only on validation")
    train.add_argument("--workspace", required=True); train.add_argument("--updates", type=int, default=180); train.add_argument("--seed", type=int, default=1728)
    train.add_argument("--feature-dim", type=int, default=256); train.add_argument("--embedding-dim", type=int, default=24)
    train.add_argument("--batch-size", type=int, default=16); train.add_argument("--learning-rate", type=float, default=.003)
    train.add_argument("--validation-every", type=int, default=30); train.add_argument("--evaluate", action="store_true")
    train.add_argument("--continue-previous", action="store_true", help="Continue both selected prior models with explicit optimizer reset")
    for name in ("evaluate", "status", "verify", "evaluation"):
        child = sub.add_parser(name); child.add_argument("--workspace", required=True)
    compare = sub.add_parser("compare", help="Compare already saved observations without training, inference or test rescoring")
    compare.add_argument("--workspace", required=True)
    compare.add_argument("--baseline", choices=("flat", "graph", "graph_initial", "tfidf", "bm25"), default="flat")
    compare.add_argument("--candidate", choices=("flat", "graph", "graph_initial", "tfidf", "bm25"), default="graph")
    compare.add_argument("--split", choices=("test", "validation"), default="test")
    compare.add_argument("--allow-lexical-control", action="store_true")
    compare.add_argument("--expected-config-sha256")
    compare.add_argument("--output", help="Optional new immutable JSON artifact; the workspace is never changed")
    search = sub.add_parser("search"); search.add_argument("--workspace", required=True); search.add_argument("query")
    search.add_argument("--target", choices=("corpus", "nodes"), default="corpus"); search.add_argument("--limit", type=int, default=10)
    node = sub.add_parser("node"); node.add_argument("--workspace", required=True); node.add_argument("hsn")
    episodes = sub.add_parser("episodes"); episodes.add_argument("--workspace", required=True); episodes.add_argument("--limit", type=int, default=20); episodes.add_argument("--offset", type=int, default=0)
    configure = sub.add_parser("retrieval", help="Owner-local selection of lexical, neural, or reciprocal-rank hybrid serving")
    configure.add_argument("--workspace", required=True); configure.add_argument("--method", required=True, choices=("lexical", "neural", "hybrid"))
    serve = sub.add_parser("serve", help="Serve bounded read-only NDJSON; owner and paths come only from startup configuration")
    serve.add_argument("--workspace", required=True); serve.add_argument("--expected-config-sha256", required=True)
    server = sub.add_parser("export-server", help="Export pinned local MCP server configuration; regenerate after a workspace revision")
    server.add_argument("--workspace", required=True); server.add_argument("--output", required=True); server.add_argument("--module-root"); server.add_argument("--python-executable")
    return p


def main(argv=None):
    args = parser().parse_args(argv)
    try:
        if args.command == "init":
            result = initialize_workspace(args.workspace, args.registry, corpus_path=args.corpus, owner=args.owner,
                workspace_id=args.workspace_id, registry_uri=args.registry_uri, expected_registry_sha256=args.registry_sha256,
                expected_corpus_sha256=args.corpus_sha256)
        elif args.command == "prepare-r08":
            result = prepare_r08(args.review, args.input_root, args.output, seed=args.seed)
        elif args.command == "ingest":
            if args.canonical:
                result = attach_corpus(args.workspace, args.input, expected_sha256=args.input_sha256)
            else:
                manifest = import_corpus(args.input, Path(args.workspace) / "admissions", expected_sha256=args.input_sha256, seed=args.seed)
                result = attach_corpus(args.workspace, manifest["corpus_path"], expected_sha256=manifest["corpus_sha256"])
        elif args.command in {"record", "episode-status", "revoke-source"}:
            with workspace_lock(args.workspace):
                config, _ = load_config(args.workspace)
                ledger = _ledger(config, args.workspace)
                try:
                    if args.command == "record":
                        result = ledger.append_episode(strict_json(Path(args.input).read_bytes()))
                    elif args.command == "episode-status":
                        result = ledger.set_status(args.id, args.status, args.reason, actor_id=config["owner"])
                    else:
                        result = ledger.revoke_source(args.source_id, args.reason, actor_id=config["owner"])
                finally:
                    ledger.close()
        elif args.command == "train":
            result = train_workspace(args.workspace, updates=args.updates, seed=args.seed, feature_dim=args.feature_dim,
                embedding_dim=args.embedding_dim, batch_size=args.batch_size, learning_rate=args.learning_rate,
                validation_every=args.validation_every, continue_previous=args.continue_previous)
            if args.evaluate:
                result["evaluation"] = evaluate_workspace(args.workspace)
        elif args.command == "evaluate":
            result = evaluate_workspace(args.workspace)
        elif args.command == "compare":
            from .comparison_io import compare_saved_workspace
            result = compare_saved_workspace(args.workspace, baseline=args.baseline, candidate=args.candidate,
                split=args.split, allow_lexical_control=args.allow_lexical_control,
                expected_config_sha256=args.expected_config_sha256)
            if args.output:
                output_sha = private_json(args.output, result, immutable=True)
                result = {"comparisonStatus": result["comparison"].get("status"),
                          "output": str(Path(args.output).resolve()), "sha256": output_sha,
                          "newTrainingUpdates": 0, "newModelInferenceCalls": 0,
                          "newTestScoringCalls": 0, "workspaceChanged": False}
        elif args.command == "export-server":
            result = export_server_config(args.workspace, args.output, module_root=args.module_root, python_executable=args.python_executable)
        elif args.command == "retrieval":
            with workspace_lock(args.workspace):
                config, before = load_config(args.workspace)
                if args.method != "lexical" and not config.get("model"):
                    raise ValueError("TRAINED_MODEL_REQUIRED")
                config["retrieval"] = {"method": args.method, "fallback": "lexical", "basis": "EXPLICIT_OWNER_LOCAL_SELECTION"}
                config["previousConfigSha256"] = before; config["updatedAt"] = utc_now()
                result = {"method": args.method, "configSha256": save_config(args.workspace, config)}
        elif args.command == "serve":
            from .service import serve
            serve(args.workspace, args.expected_config_sha256)
            return 0
        else:
            from .service import WorkLearningService
            config, digest = load_config(args.workspace)
            service = WorkLearningService(args.workspace, expected_config_sha256=digest)
            if args.command == "verify":
                result = {"valid": True, "files": len(pinned_files(args.workspace, config)), "ledger": service.check_integrity(), "provenance": service.provenance()}
            else:
                payload = {k: getattr(args, k) for k in ("query", "limit", "target", "offset", "hsn") if hasattr(args, k)}
                result = service.execute(args.command, payload)
        _print(result)
        return 0
    except Exception as exc:
        # Owner-local errors are useful without printing corpus bodies or secrets.
        _print({"ok": False, "error": {"type": type(exc).__name__, "message": str(exc)[:500]}}, sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
