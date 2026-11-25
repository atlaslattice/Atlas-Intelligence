"""Finite deterministic CPU fitting with validation-only checkpoint selection.

This module never evaluates the test split. It trains the local addressed graph,
not an OpenAI model, and it neither fetches data nor sends provider requests.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path
import hashlib
import json
import math
import platform
import re
import time

import numpy as np

from .model import AddressedGraphEncoder, ModelConfig
from .evaluation import build_corpus_pairs, evaluate_retrieval, fixed_validation_panel, lexical_baseline, validate_pair_splits


TRAINING_SCHEMA = "atlas.work-learning.training-run/v1"


@dataclass(frozen=True)
class TrainingConfig:
    updates: int = 180
    batch_size: int = 16
    learning_rate: float = 0.003
    anchor_weight: float = 0.1
    anchor_batch_size: int = 16
    validation_every: int = 30
    validation_max_queries: int = 64
    gradient_clip: float = 5.0
    weight_decay: float = 0.0
    seed: int = 1728

    def __post_init__(self):
        integer_fields = ("updates", "batch_size", "anchor_batch_size", "validation_every", "validation_max_queries", "seed")
        if any(not isinstance(getattr(self, k), int) or isinstance(getattr(self, k), bool) for k in integer_fields):
            raise ValueError("TRAINING_CONFIG_INTEGER_REQUIRED")
        if not 1 <= self.updates <= 180 or not 2 <= self.batch_size <= 128 or not 2 <= self.anchor_batch_size <= 256:
            raise ValueError("TRAINING_BUDGET_OUT_OF_RANGE")
        if not 1 <= self.validation_every <= 180 or not 1 <= self.validation_max_queries <= 10000:
            raise ValueError("VALIDATION_BUDGET_OUT_OF_RANGE")
        ranges = ((self.learning_rate, 1e-7, 0.1), (self.anchor_weight, 0.0, 10.0),
                  (self.gradient_clip, 0.001, 1000.0), (self.weight_decay, 0.0, 0.1))
        if any(not isinstance(v, (int, float)) or isinstance(v, bool) or not math.isfinite(v) or not lo <= v <= hi for v, lo, hi in ranges):
            raise ValueError("TRAINING_CONFIG_FLOAT_OUT_OF_RANGE")
        if self.seed < 0:
            raise ValueError("TRAINING_SEED_OUT_OF_RANGE")

    def to_dict(self):
        return asdict(self)

    @classmethod
    def from_dict(cls, value):
        return cls(**value)


def _canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False)


def _sha(value):
    return hashlib.sha256(_canonical(value).encode()).hexdigest()


class TrainingViewCollisionError(ValueError):
    """An optional preflight hold; the attached audit is metadata, not labels."""
    def __init__(self, audit):
        super().__init__("TRAINING_VIEW_COLLISION_PREFLIGHT_HELD")
        self.audit = audit


def audit_training_views(model, training_pairs):
    """Inspect exact deterministic feature collisions without fitting a model.

    Only explicit train pairs are accepted. Equal features mean indistinguishable
    views to this feature pipeline, not shared ancestry or semantic equivalence.
    The report neither removes pairs nor creates positive/negative judgments.
    """
    if not isinstance(model, AddressedGraphEncoder):
        raise ValueError("PREFLIGHT_ADDRESSED_MODEL_REQUIRED")
    pairs = list(training_pairs)
    if len(pairs) < 2 or any(not isinstance(p, dict) or p.get("split") != "train" for p in pairs):
        raise ValueError("PREFLIGHT_TRAIN_ONLY_PAIRS_REQUIRED")
    for p in pairs:
        if not isinstance(p.get("id"), str) or not p["id"] or not isinstance(p.get("family_id"), str) or not p["family_id"]:
            raise ValueError("PREFLIGHT_PAIR_IDENTITY_REQUIRED")
        if any(not isinstance(p.get(k), str) or not p[k].strip() for k in ("input_text", "target_text")):
            raise ValueError("PREFLIGHT_NONEMPTY_TEXT_REQUIRED")
    pairs.sort(key=lambda p: p["id"])
    if len({p["id"] for p in pairs}) != len(pairs):
        raise ValueError("PREFLIGHT_DUPLICATE_PAIR_ID")
    rows = [{**{k: p.get(k) for k in ("id", "family_id", "source_id", "source_version", "source_uri", "source_sha256", "text_sha256", "kind", "split")},
             "complete_pair_record_sha256": _sha(p),
             "input_text_sha256": hashlib.sha256(p["input_text"].encode()).hexdigest(),
             "target_text_sha256": hashlib.sha256(p["target_text"].encode()).hexdigest()} for p in pairs]
    collisions, distinct, held = [], {}, set()
    ambiguous_directed_slots = 0
    feature_batch_size = 128
    for axis, key in (("input", "input_text"), ("target", "target_text")):
        buckets = defaultdict(list)
        for start in range(0, len(pairs), feature_batch_size):
            features = model.features([p[key] for p in pairs[start:start + feature_batch_size]])
            if np.any(np.sum(features * features, axis=1) == 0):
                raise ValueError("PREFLIGHT_NONEMPTY_FEATURES_REQUIRED")
            for offset, feature in enumerate(features):
                raw = np.asarray(feature, dtype="<f8").tobytes(order="C")
                buckets[hashlib.sha256(raw).digest()].append(start + offset)
        distinct[axis] = 0
        for candidate_positions in buckets.values():
            if len(candidate_positions) == 1:
                distinct[axis] += 1
                continue
            # Hashes choose candidate groups only. Recheck exact feature bytes
            # so a digest collision cannot merge distinguishable model views.
            exact_groups = defaultdict(list)
            for start in range(0, len(candidate_positions), feature_batch_size):
                positions = candidate_positions[start:start + feature_batch_size]
                features = model.features([pairs[i][key] for i in positions])
                for position, feature in zip(positions, features):
                    exact_groups[np.asarray(feature, dtype="<f8").tobytes(order="C")].append(position)
            distinct[axis] += len(exact_groups)
            for feature_bytes, positions in exact_groups.items():
                if len(positions) < 2:
                    continue
                members = [pairs[i] for i in positions]
                raw_count = len({p[key] for p in members})
                token_hashes, bag_hashes = set(), set()
                for p in members:
                    tokens = re.findall(r"\w+", p[key].casefold())
                    token_hashes.add(_sha(tokens))
                    bag_hashes.add(_sha(dict(Counter(tokens[:model.config.max_tokens]))))
                normalized_count, effective_bag_count = len(token_hashes), len(bag_hashes)
                reason = ("EXACT_TEXT_REUSE" if raw_count == 1 else
                          "NORMALIZED_TOKEN_REUSE" if normalized_count == 1 else
                          "BAG_OR_TRUNCATION_REUSE" if effective_bag_count == 1 else
                          "DISTINCT_TOKEN_BAGS_IDENTICAL_HASH_FEATURES")
                ids = [p["id"] for p in members]
                held.update(ids)
                slots = len(ids) * (len(ids) - 1)
                ambiguous_directed_slots += slots
                collisions.append({"axis": axis, "pair_ids": ids, "feature_sha256": hashlib.sha256(feature_bytes).hexdigest(),
                                   "distinct_raw_views": raw_count, "distinct_normalized_token_sequences": normalized_count,
                                   "distinct_effective_token_bags": effective_bag_count, "reason": reason,
                                   "declared_family_count": len({p["family_id"] for p in members}),
                                   "potential_directed_false_negative_slots": slots})
    feature_config = {"feature_dim": model.config.feature_dim, "max_tokens": model.config.max_tokens}
    body = {"schema": "atlas.work-learning.training-view-preflight/v1",
            "status": "HELD_AMBIGUOUS_TRAINING_VIEWS" if collisions else "PASS_VIEW_UNIQUENESS_ONLY",
            "registry_sha256": model.registry_sha256,
            "feature_config": feature_config, "feature_config_sha256": _sha(feature_config),
            "model_source_sha256": hashlib.sha256(Path(__file__).with_name("model.py").read_bytes()).hexdigest(),
            "preflight_source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            "training_pair_manifest_sha256": _sha(rows), "pair_count": len(pairs),
            "declared_family_count": len({p["family_id"] for p in pairs}),
            "distinct_feature_views": distinct, "collision_groups": collisions,
            "held_pair_ids": sorted(held), "unambiguous_pair_count": len(pairs) - len(held),
            "full_pool_directed_off_diagonal_slots": 2 * len(pairs) * (len(pairs) - 1),
            "potential_directed_false_negative_slots": ambiguous_directed_slots,
            "counts_describe_full_pool_not_executed_batches": True,
            "feature_call_row_limit": feature_batch_size, "collision_hash_buckets_exactly_rechecked": True,
            "definition_anchor_loss_audited": False, "same_family_collision_policy": "CONSERVATIVE_HOLD",
            "actual_training_updates": 0, "actual_negative_presentations": 0,
            "source_rights_verified_by_this_audit": False, "source_independence_verified": False,
            "semantic_judgments_created": 0, "pair_mutation_performed": False,
            "model_parameters_changed": False}
    return {**body, "audit_sha256": _sha(body)}


def require_unambiguous_training_views(model, training_pairs, *, expected_audit_sha256=None):
    audit = audit_training_views(model, training_pairs)
    if expected_audit_sha256 is not None and audit["audit_sha256"] != expected_audit_sha256:
        raise ValueError("TRAINING_VIEW_PREFLIGHT_PIN_MISMATCH")
    if audit["collision_groups"]:
        raise TrainingViewCollisionError(audit)
    return audit


def _validated_corrections(correction_pairs, items, *, allow_synthetic):
    result = []
    by_id = {i["id"]: i for i in items}
    held_families = {i["family_id"] for i in items if i["split"] != "train"}
    held_sources = {i["source_id"] for i in items if i["split"] != "train"}
    seen = set()
    for raw in correction_pairs or []:
        p = dict(raw)
        if (p.get("training_eligible") is not True or p.get("split") != "train" or p.get("kind") != "verified_correction"
                or p.get("objective", "text_correction") != "text_correction" or not p.get("episode_id")):
            raise ValueError("CORRECTION_EXPLICIT_ELIGIBILITY_REQUIRED")
        p.setdefault("id", "episode:" + p["episode_id"])
        if p["id"] in seen:
            raise ValueError("DUPLICATE_CORRECTION_ID")
        seen.add(p["id"])
        if p.get("family_id") in held_families or any(r.get("source_id") in held_sources for r in p.get("source_refs", [])):
            raise ValueError("CORRECTION_HELD_OUT_SOURCE")
        if p.get("is_synthetic"):
            if not allow_synthetic:
                raise ValueError("SYNTHETIC_CORRECTION_PRODUCTION_RUN_FORBIDDEN")
        else:
            ids = p.get("corpus_item_ids", [])
            if not ids or any(i not in by_id for i in ids) or not p.get("source_refs") or not p.get("verification_refs") or not p.get("ledger_event_sha256"):
                raise ValueError("CORRECTION_VERIFICATION_BINDING_REQUIRED")
            refs = [by_id[i] for i in ids]
            if any(i.get("scope") != "WORK" or i["split"] != "train" or i["family_id"] != p.get("family_id") for i in refs):
                raise ValueError("CORRECTION_CORPUS_BINDING_MISMATCH")
            known = {(i["source_id"], i.get("source_version"), i.get("source_sha256")) for i in refs}
            known.update((a["source_id"], a.get("source_version"), a.get("source_sha256")) for i in refs for a in i.get("aliases", []))
            if any((r.get("source_id"), r.get("source_version"), r.get("source_sha256")) not in known for r in p["source_refs"]):
                raise ValueError("CORRECTION_SOURCE_EDITION_MISMATCH")
        for field in ("input_text", "target_text"):
            if not isinstance(p.get(field), str) or not p[field].strip():
                raise ValueError("CORRECTION_NONEMPTY_TEXT_REQUIRED")
            provided_hash = p.get("input_sha256" if field == "input_text" else "target_sha256")
            if provided_hash and provided_hash != hashlib.sha256(p[field].encode()).hexdigest():
                raise ValueError("CORRECTION_TEXT_HASH_MISMATCH")
        result.append(p)
    return sorted(result, key=lambda p: p["id"])


def _batch(rng, by_family, families, batch_size, corrections, step):
    # At most one member of a source family per contrastive batch. A verified
    # correction, when available, is guaranteed to participate in each update.
    selected = []
    excluded = None
    if corrections:
        chosen = corrections[(step - 1) % len(corrections)]
        selected.append(chosen)
        excluded = chosen["family_id"]
    available = [f for f in families if f != excluded]
    count = min(batch_size - len(selected), len(available))
    for offset in rng.choice(len(available), size=count, replace=False):
        candidates = by_family[available[int(offset)]]
        selected.append(candidates[int(rng.integers(len(candidates)))])
    if len(selected) < 2:
        raise ValueError("TRAINING_REQUIRES_TWO_INDEPENDENT_FAMILIES")
    return selected


def train_model(registry, corpus, output_dir, *, model_config=None, training_config=None,
                correction_pairs=None, progress_callback=None, initial_model=None, _test_fixture=False,
                require_unambiguous_views=False):
    """Fit a finite run, select using only validation, retain every loss.

    ``corpus`` is the output of corpus.load_corpus. ``output_dir`` must be a new
    run directory. The caller evaluates the returned selected checkpoint on the
    held-out test exactly once, after comparing predeclared baselines.
    """
    config = training_config if isinstance(training_config, TrainingConfig) else TrainingConfig.from_dict(training_config or {})
    mconfig = model_config if isinstance(model_config, ModelConfig) else ModelConfig.from_dict(model_config or {})
    if not isinstance(corpus, dict) or not corpus.get("sha256") or not isinstance(corpus.get("items"), list):
        raise ValueError("PINNED_CORPUS_REQUIRED")
    items = corpus["items"]
    pair_build = build_corpus_pairs(items, with_manifest=True)
    pairs = pair_build["pairs"]
    corrections = _validated_corrections(correction_pairs, items, allow_synthetic=_test_fixture)
    split_counts = validate_pair_splits(pairs + corrections)
    training = [p for p in pairs if p["split"] == "train"] + corrections
    validation = [p for p in pairs if p["split"] == "validation"]
    if len(validation) < 2:
        raise ValueError("VALIDATION_REQUIRES_TWO_QUERIES")
    by_family = defaultdict(list)
    for p in training:
        by_family[p["family_id"]].append(p)
    families = sorted(by_family)
    if len(families) < 2:
        raise ValueError("TRAINING_REQUIRES_TWO_INDEPENDENT_FAMILIES")
    panel = fixed_validation_panel(validation, max_queries=config.validation_max_queries, seed=config.seed)
    model = AddressedGraphEncoder(registry, mconfig, _test_fixture=_test_fixture)
    if not isinstance(require_unambiguous_views, bool):
        raise ValueError("PREFLIGHT_FLAG_MUST_BE_BOOLEAN")
    view_preflight = require_unambiguous_training_views(model, training) if require_unambiguous_views else None
    parent_state_sha256 = None
    parent_checkpoint_sha256 = None
    if initial_model is not None:
        if not isinstance(initial_model, AddressedGraphEncoder) or initial_model.registry_sha256 != model.registry_sha256 or initial_model.address_digest != model.address_digest:
            raise ValueError("INITIAL_MODEL_REGISTRY_MISMATCH")
        if initial_model.config.to_dict() != mconfig.to_dict() or initial_model._test_fixture != bool(_test_fixture):
            raise ValueError("INITIAL_MODEL_CONFIG_MISMATCH")
        if initial_model.corpus_sha256 != corpus["sha256"]:
            raise ValueError("INITIAL_MODEL_CORPUS_PIN_MISMATCH")
        if any(not np.all(np.isfinite(p)) for p in initial_model.parameters.values()):
            raise ValueError("INITIAL_MODEL_PARAMETER_INVALID")
        parent_state_sha256 = initial_model.state_digest()
        parent_checkpoint_sha256 = initial_model.checkpoint_sha256
        model.parameters = {k: v.copy() for k, v in initial_model.parameters.items()}
    initial_parameters = {name: value.copy() for name, value in model.parameters.items()}
    initial_state_sha256 = model.state_digest()
    rng = np.random.default_rng(config.seed)
    anchor_order = rng.permutation(len(model.nodes))
    anchor_count = min(config.anchor_batch_size, len(model.nodes))
    if anchor_count < 2:
        raise ValueError("ANCHORS_REQUIRE_TWO_NODES")
    anchor_exposures = np.zeros(len(model.nodes), dtype=np.int64)
    first, second = model._zero_gradients(), model._zero_gradients()
    out = Path(output_dir)
    if out.exists() and any(out.iterdir()):
        raise ValueError("TRAINING_OUTPUT_MUST_BE_NEW_EMPTY_DIRECTORY")
    out.mkdir(parents=True, exist_ok=True, mode=0o700)
    out.chmod(0o700)
    protocol = {"model_config": mconfig.to_dict(), "training_config": config.to_dict(),
                "registry_sha256": model.registry_sha256, "corpus_sha256": corpus["sha256"],
                "training_pair_ids": [p["id"] for p in training], "validation_panel_ids": [p["id"] for p in panel],
                "validation_candidate_ids": [p["id"] for p in validation],
                "correction_receipts": [{k: p.get(k) for k in ("id", "episode_id", "ledger_event_sha256", "input_sha256", "target_sha256")} for p in corrections],
                "parent_state_sha256": parent_state_sha256, "parent_checkpoint_sha256": parent_checkpoint_sha256,
                "optimizer_state": "RESET_ADAM_MOMENTS_FOR_EXPLICIT_NEW_FINITE_RUN",
                "selection_rule": "MAX_VALIDATION_NDCG_AT_10_EARLIEST_EXACT_TIE", "test_used_for_training_or_selection": False}
    if view_preflight is not None:
        protocol["training_view_preflight"] = view_preflight
    protocol_sha256 = _sha(protocol)
    (out / "protocol.json").write_text(_canonical(protocol) + "\n", encoding="utf-8")
    (out / "protocol.json").chmod(0o600)
    checkpoints = {}

    def snapshot(step):
        if step not in checkpoints:
            saved = model.save(out / "checkpoints" / f"step-{step:06d}", corpus_sha256=corpus["sha256"],
                               training_state={"step": step, "protocol_sha256": protocol_sha256,
                                               "training_config": config.to_dict(), "test_used_for_selection": False})
            checkpoints[step] = {**saved, "step": step}
        return checkpoints[step]

    initial_eval = evaluate_retrieval(model, panel, validation)
    lexical = lexical_baseline(panel, validation)
    best_eval, best_step = initial_eval, 0
    selected = snapshot(0)
    validation_history = [{"step": 0, "metrics": initial_eval}]
    history = []
    correction_presentations = Counter()
    sampled = Counter()
    start = time.monotonic()
    if progress_callback:
        progress_callback({"event": "start", "updates": config.updates, "validation_ndcg_at_10": initial_eval["ndcg_at_k"]})
    for step in range(1, config.updates + 1):
        batch = _batch(rng, by_family, families, config.batch_size, corrections, step)
        ids = anchor_order[(np.arange(anchor_count) + (step - 1) * anchor_count) % len(anchor_order)]
        loss, grads, losses = model.loss_and_gradients([p["input_text"] for p in batch], [p["target_text"] for p in batch],
                                                      anchor_indices=ids, anchor_weight=config.anchor_weight)
        if not math.isfinite(loss) or any(not np.all(np.isfinite(g)) for g in grads.values()):
            raise ValueError("NONFINITE_TRAINING_STATE")
        norm = math.sqrt(sum(float(np.sum(g * g)) for g in grads.values()))
        scale = min(1.0, config.gradient_clip / max(norm, 1e-30))
        for name, parameter in model.parameters.items():
            # Flat control contains the same parameters but does not use gates.
            if not model.config.hierarchy and name in {"sphere_gates", "house_gates"}:
                continue
            gradient = grads[name] * scale
            first[name] *= 0.9
            first[name] += 0.1 * gradient
            second[name] *= 0.999
            second[name] += 0.001 * gradient * gradient
            mhat, vhat = first[name] / (1 - 0.9**step), second[name] / (1 - 0.999**step)
            if config.weight_decay:
                parameter *= 1 - config.learning_rate * config.weight_decay
            parameter -= config.learning_rate * mhat / (np.sqrt(vhat) + 1e-8)
        model.checkpoint_sha256 = None
        if config.anchor_weight:
            anchor_exposures[ids] += 1
        episode_ids = []
        for p in batch:
            sampled[p["id"]] += 1
            if p["kind"] == "verified_correction":
                correction_presentations[p["episode_id"]] += 1
                episode_ids.append(p["episode_id"])
        history.append({"step": step, "total_loss": loss, **losses, "gradient_l2": norm,
                        "gradient_clip_scale": scale, "batch_pairs": len(batch),
                        "batch_families": len({p["family_id"] for p in batch}),
                        "verified_correction_presentations": len(episode_ids), "episode_ids": episode_ids})
        if step % config.validation_every == 0 or step == config.updates:
            current = evaluate_retrieval(model, panel, validation)
            validation_history.append({"step": step, "metrics": current})
            if current["ndcg_at_k"] > best_eval["ndcg_at_k"]:
                best_eval, best_step = current, step
                selected = snapshot(step)
            if progress_callback:
                progress_callback({"event": "validation", "step": step, "total_loss": loss,
                                   "validation_ndcg_at_10": current["ndcg_at_k"], "selected_step": best_step})
    final_checkpoint = snapshot(config.updates)
    movement = {key: {"l2": float(np.linalg.norm(value - initial_parameters[key])),
                      "changed_scalars": int(np.count_nonzero(value != initial_parameters[key])), "scalars": value.size}
                for key, value in model.parameters.items()}
    node_updates = int(np.sum(np.any(model.parameters["nodes"] != initial_parameters["nodes"], axis=1)))
    real_corrections = [p for p in corrections if not p.get("is_synthetic")]
    report = {"schema": TRAINING_SCHEMA, "status": "COMPLETED_FINITE_LOCAL_TRAINING", "scope": "OWNER_PRIVATE_WORK",
              "test_fixture": bool(_test_fixture), "registry_sha256": model.registry_sha256,
              "corpus_sha256": corpus["sha256"], "protocol_sha256": protocol_sha256,
              "model_config": mconfig.to_dict(), "training_config": config.to_dict(),
              "model_descriptor": model.descriptor(), "actual_updates": config.updates,
              "initial_state_sha256": initial_state_sha256, "initial_checkpoint": checkpoints[0], "selected_checkpoint": selected,
              "parent_state_sha256": parent_state_sha256, "parent_checkpoint_sha256": parent_checkpoint_sha256,
              "optimizer_state": "RESET_ADAM_MOMENTS_FOR_EXPLICIT_NEW_FINITE_RUN",
              "final_checkpoint": final_checkpoint, "parameter_movement_at_final": movement,
              "node_rows_updated_at_final": node_updates, "definition_anchors_seen": int(np.count_nonzero(anchor_exposures)),
              "definition_anchor_presentations": int(np.sum(anchor_exposures)),
              "training_pairs_available": len(training), "unique_pairs_presented": len(sampled),
              "pair_counts_by_split": split_counts, "corpus_items": len(items),
              "omitted_fragment_items": len(items) - len(pairs), "training_families": len(families),
              "fragment_preprocessing": pair_build["manifest"],
              "correction_pairs_available": len(corrections), "real_correction_pairs": len(real_corrections),
              "synthetic_correction_pairs": len(corrections) - len(real_corrections),
              "correction_presentations": dict(correction_presentations),
              "validation_selection": {"metric": "ndcg_at_k", "k": 10, "maximize": True, "tie": "earliest",
                                       "selected_step": best_step, "selected_value": best_eval["ndcg_at_k"],
                                       "initial_value": initial_eval["ndcg_at_k"], "delta_vs_initial": best_eval["ndcg_at_k"] - initial_eval["ndcg_at_k"],
                                       "lexical_value": lexical["ndcg_at_k"], "delta_vs_lexical": best_eval["ndcg_at_k"] - lexical["ndcg_at_k"],
                                       "fixed_queries": len(panel), "full_validation_candidates": len(validation),
                                       "held_out_test_used": False},
              "validation_history": validation_history, "validation_lexical_baseline": lexical,
              "loss_history": history, "test_evaluation": "NOT_PERFORMED_BY_TRAINING",
              "run_seconds": time.monotonic() - start, "replay": {"python": platform.python_version(), "numpy": np.__version__,
                         "same_inputs_config_seed_and_numeric_environment_required": True, "cross_platform_bitwise_identity_claimed": False},
              "claims": {"local_model_parameters_trained": True, "openai_model_weights_changed": False,
                         "accepted_semantic_assignments_learned": False, "curated_corpus_is_whole_archive": False,
                         "task_is_self_supervised_diagnostic": True, "physical_geometry_equivalence": False}}
    report_path = out / "training-report.json"
    report["report_path"] = str(report_path.resolve())
    report_path.write_text(_canonical(report) + "\n", encoding="utf-8")
    report_path.chmod(0o600)
    if progress_callback:
        progress_callback({"event": "completed", "actual_updates": config.updates, "selected_step": best_step,
                           "node_rows_updated": node_updates, "report_path": str(report_path.resolve())})
    return report
