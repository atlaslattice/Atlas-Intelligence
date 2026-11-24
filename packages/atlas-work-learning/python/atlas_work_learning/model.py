"""Trainable, source-addressed HSN graph encoder using only NumPy.

The 1,728 rows are knowledge addresses, not spatial wavefield coordinates.  The
learned computation is a shared text projection, addressed node vectors, gated
Sphere/House messages, and query-conditioned attention.  Scores are similarities,
not calibrated confidence or accepted semantic assignments.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
import copy
import hashlib
import json
import re
from typing import Any, Sequence

import numpy as np


SCHEMA = "atlas.work-learning.addressed-graph/v1"
ARIADNE_SHA256 = "07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6"
_TOKEN = re.compile(r"\w+", re.UNICODE)


@dataclass(frozen=True)
class ModelConfig:
    feature_dim: int = 256
    embedding_dim: int = 24
    seed: int = 1728
    hierarchy: bool = True
    attention_temperature: float = 0.7
    contrastive_temperature: float = 0.2
    residual_scale: float = 0.35
    max_tokens: int = 256

    def __post_init__(self):
        if any(not isinstance(getattr(self, key), int) or isinstance(getattr(self, key), bool)
               for key in ("feature_dim", "embedding_dim", "seed", "max_tokens")):
            raise ValueError("MODEL_CONFIG_INTEGER_REQUIRED")
        if not 4 <= self.feature_dim <= 4096 or not 2 <= self.embedding_dim <= 128:
            raise ValueError("MODEL_DIMENSIONS_OUT_OF_RANGE")
        if not 1 <= self.max_tokens <= 4096:
            raise ValueError("MODEL_TOKEN_LIMIT_OUT_OF_RANGE")
        if not 0.01 <= self.attention_temperature <= 10 or not 0.01 <= self.contrastive_temperature <= 10:
            raise ValueError("MODEL_TEMPERATURE_OUT_OF_RANGE")
        if not 0 <= self.residual_scale <= 2:
            raise ValueError("MODEL_RESIDUAL_OUT_OF_RANGE")
        if self.seed < 0 or not isinstance(self.hierarchy, bool):
            raise ValueError("MODEL_CONFIG_TYPE")
        for key in ("attention_temperature", "contrastive_temperature", "residual_scale"):
            if not isinstance(getattr(self, key), (int, float)) or isinstance(getattr(self, key), bool) or not np.isfinite(getattr(self, key)):
                raise ValueError("MODEL_CONFIG_FINITE_NUMBER_REQUIRED")

    def to_dict(self):
        return asdict(self)

    @classmethod
    def from_dict(cls, value):
        return cls(**value)


def _canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)


def _sha_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _normalize(x):
    length = np.sqrt(np.sum(x * x, axis=1, keepdims=True) + 1e-12)
    return x / length, length


def _normalization_backward(g, y, length):
    return (g - y * np.sum(g * y, axis=1, keepdims=True)) / length


def _softmax(x):
    z = x - np.max(x, axis=1, keepdims=True)
    ez = np.exp(z)
    return ez / np.sum(ez, axis=1, keepdims=True)


def _sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -40, 40)))


def contrastive_loss(a, b, temperature):
    """Symmetric in-batch pair loss and exact gradients for normalized vectors."""
    if a.shape != b.shape or len(a) < 2:
        raise ValueError("CONTRASTIVE_BATCH_REQUIRES_TWO_MATCHED_ROWS")
    logits = a @ b.T / temperature
    p, q = _softmax(logits), _softmax(logits.T)
    n = len(a)
    loss = -0.5 * float(np.mean(np.log(np.diag(p) + 1e-300) + np.log(np.diag(q) + 1e-300)))
    eye = np.eye(n)
    d = ((p - eye) + (q - eye).T) / (2 * n)
    return loss, d @ b / temperature, d.T @ a / temperature


class AddressedGraphEncoder:
    """Actual trainable HSN representations, with an immutable address order."""

    def __init__(self, registry: dict, config: ModelConfig | dict | None = None, *, _test_fixture=False):
        self.config = config if isinstance(config, ModelConfig) else ModelConfig.from_dict(config or {})
        self.registry_sha256 = registry.get("sha256", registry.get("registry_sha256"))
        self.edition = registry.get("edition", "v0.7")
        self.nodes = copy.deepcopy(list(registry["nodes"]))
        self.node_ids = list(registry.get("node_ids") or [n.get("id", n.get("coordinate")) for n in self.nodes])
        self.node_to_sphere = np.asarray(registry["node_to_sphere"], dtype=np.int64)
        self.sphere_to_house = np.asarray(registry["sphere_to_house"], dtype=np.int64)
        if (not _test_fixture) and (self.registry_sha256 != ARIADNE_SHA256 or len(self.nodes) != 1728 or len(self.sphere_to_house) != 144):
            raise ValueError("ORIGINAL_ARIADNE_REGISTRY_REQUIRED")
        self._test_fixture = bool(_test_fixture)
        if len(self.node_ids) != len(self.nodes) or len(set(self.node_ids)) != len(self.nodes) or any(not isinstance(x, str) for x in self.node_ids):
            raise ValueError("INVALID_OR_DUPLICATE_NODE_IDS")
        if any(n.get("id", n.get("coordinate")) != self.node_ids[i] for i, n in enumerate(self.nodes)):
            raise ValueError("NODE_RECORD_ADDRESS_MISMATCH")
        if self.node_to_sphere.shape != (len(self.nodes),) or len(self.sphere_to_house) < 1:
            raise ValueError("INVALID_HIERARCHY_SHAPE")
        if np.any(self.node_to_sphere < 0) or np.any(self.node_to_sphere >= len(self.sphere_to_house)) or np.any(self.sphere_to_house < 0):
            raise ValueError("INVALID_HIERARCHY_MEMBERSHIP")
        self.node_to_house = self.sphere_to_house[self.node_to_sphere]
        self.sphere_count = len(self.sphere_to_house)
        self.house_count = int(np.max(self.sphere_to_house)) + 1
        self._sphere_counts = np.bincount(self.node_to_sphere, minlength=self.sphere_count).astype(float)
        self._house_counts = np.bincount(self.node_to_house, minlength=self.house_count).astype(float)
        if np.any(self._sphere_counts == 0) or np.any(self._house_counts == 0):
            raise ValueError("EMPTY_HIERARCHY_GROUP")
        if not _test_fixture:
            expected = [f"H{h:02d}.S{s:02d}.N{n:02d}" for h in range(1, 13) for s in range(1, 13) for n in range(1, 13)]
            if self.node_ids != expected or not np.array_equal(self.node_to_sphere, np.arange(1728) // 12) or not np.array_equal(self.sphere_to_house, np.arange(144) // 12):
                raise ValueError("ORIGINAL_COORDINATE_ORDER_CHANGED")
        self.address_digest = hashlib.sha256(_canonical({"ids": self.node_ids, "node_to_sphere": self.node_to_sphere.tolist(), "sphere_to_house": self.sphere_to_house.tolist()}).encode()).hexdigest()
        self._positions = {name: i for i, name in enumerate(self.node_ids)}
        self.anchor_texts = [self._node_text(n) for n in self.nodes]
        self.anchor_features = self.features(self.anchor_texts)
        rng = np.random.default_rng(self.config.seed)
        w = rng.normal(0, 1.0 / np.sqrt(self.config.feature_dim), (self.config.feature_dim, self.config.embedding_dim))
        # Original definitions seed each address; subsequent parameter updates are
        # explicitly learned state and do not replace the source definitions.
        e = np.tanh(self.anchor_features @ w) + rng.normal(0, 0.015, (len(self.nodes), self.config.embedding_dim))
        self.parameters = {"projection": w, "bias": np.zeros(self.config.embedding_dim), "nodes": e,
                           "sphere_gates": np.full(self.sphere_count, -1.4), "house_gates": np.full(self.house_count, -1.4)}
        self.checkpoint_sha256 = None
        self.corpus_sha256 = None

    @staticmethod
    def _node_text(node):
        chunks = []
        for key in ("name", "definition", "includes"):
            value = node.get(key, "")
            if isinstance(value, list):
                chunks.extend(str(v) for v in value)
            elif value:
                chunks.append(str(value))
        return " ".join(chunks)

    def features(self, texts: Sequence[str]):
        out = np.zeros((len(texts), self.config.feature_dim), dtype=np.float64)
        for row, text in enumerate(texts):
            if not isinstance(text, str):
                raise ValueError("TEXT_MUST_BE_STRING")
            for token in _TOKEN.findall(text.casefold())[:self.config.max_tokens]:
                digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8, person=b"atlaswl1").digest()
                bucket = int.from_bytes(digest, "little") % self.config.feature_dim
                out[row, bucket] += 1.0
        out = np.log1p(out)
        out, _ = _normalize(out)
        return out

    def _node_vectors(self):
        e = self.parameters["nodes"]
        sm = np.zeros((self.sphere_count, e.shape[1]))
        hm = np.zeros((self.house_count, e.shape[1]))
        np.add.at(sm, self.node_to_sphere, e)
        np.add.at(hm, self.node_to_house, e)
        sm /= self._sphere_counts[:, None]
        hm /= self._house_counts[:, None]
        sg, hg = _sigmoid(self.parameters["sphere_gates"]), _sigmoid(self.parameters["house_gates"])
        messages = e.copy()
        if self.config.hierarchy:
            messages += sg[self.node_to_sphere, None] * sm[self.node_to_sphere]
            messages += hg[self.node_to_house, None] * hm[self.node_to_house]
        k, norm = _normalize(messages)
        return k, (k, norm, sm, hm, sg, hg)

    def _forward(self, x):
        k, node_cache = self._node_vectors()
        u = np.tanh(x @ self.parameters["projection"] + self.parameters["bias"])
        a = _softmax(u @ k.T / self.config.attention_temperature)
        v = np.tanh(u + self.config.residual_scale * (a @ k))
        y, norm = _normalize(v)
        return y, (x, u, a, k, v, y, norm, node_cache)

    def _zero_gradients(self):
        return {name: np.zeros_like(value) for name, value in self.parameters.items()}

    def _backward_nodes(self, gradient, cache):
        k, norm, sm, hm, sg, hg = cache
        g = self._zero_gradients()
        dm = _normalization_backward(gradient, k, norm)
        g["nodes"] += dm
        if self.config.hierarchy:
            sums = np.zeros_like(sm)
            np.add.at(sums, self.node_to_sphere, dm)
            g["sphere_gates"] = np.sum(sums * sm, axis=1) * sg * (1 - sg)
            g["nodes"] += (sums * sg[:, None] / self._sphere_counts[:, None])[self.node_to_sphere]
            sums = np.zeros_like(hm)
            np.add.at(sums, self.node_to_house, dm)
            g["house_gates"] = np.sum(sums * hm, axis=1) * hg * (1 - hg)
            g["nodes"] += (sums * hg[:, None] / self._house_counts[:, None])[self.node_to_house]
        return g

    def _backward(self, dy, cache):
        x, u, a, k, v, y, norm, node_cache = cache
        dt = _normalization_backward(dy, y, norm) * (1 - v * v)
        du = dt.copy()
        dr = self.config.residual_scale * dt
        da = dr @ k.T
        dk = a.T @ dr
        dl = a * (da - np.sum(da * a, axis=1, keepdims=True))
        du += dl @ k / self.config.attention_temperature
        dk += dl.T @ u / self.config.attention_temperature
        g = self._backward_nodes(dk, node_cache)
        dp = du * (1 - u * u)
        g["projection"] = x.T @ dp
        g["bias"] = np.sum(dp, axis=0)
        return g

    @staticmethod
    def _add_grads(target, extra, factor=1.0):
        for key in target:
            target[key] += factor * extra[key]

    def loss_and_gradients(self, inputs, targets, *, anchor_indices=None, anchor_weight=0.1):
        xa, xb = self.features(inputs), self.features(targets)
        if np.any(np.sum(xa * xa, axis=1) == 0) or np.any(np.sum(xb * xb, axis=1) == 0):
            raise ValueError("EMPTY_TRAINING_TEXT")
        a, ca = self._forward(xa)
        b, cb = self._forward(xb)
        pair_loss, ga, gb = contrastive_loss(a, b, self.config.contrastive_temperature)
        grads = self._backward(ga, ca)
        self._add_grads(grads, self._backward(gb, cb))
        anchor_loss = 0.0
        if anchor_indices is not None and anchor_weight > 0:
            ids = np.asarray(anchor_indices, dtype=np.int64)
            if len(ids) < 2 or len(np.unique(ids)) != len(ids) or np.any(ids < 0) or np.any(ids >= len(self.nodes)):
                raise ValueError("INVALID_ANCHOR_INDICES")
            ya, c = self._forward(self.anchor_features[ids])
            k, nc = self._node_vectors()
            anchor_loss, gy, gk = contrastive_loss(ya, k[ids], self.config.contrastive_temperature)
            self._add_grads(grads, self._backward(gy, c), anchor_weight)
            full = np.zeros_like(k)
            full[ids] = gk
            self._add_grads(grads, self._backward_nodes(full, nc), anchor_weight)
        return pair_loss + anchor_weight * anchor_loss, grads, {"pair_loss": pair_loss, "anchor_loss": anchor_loss}

    def encode(self, texts, *, batch_size=64):
        if not isinstance(batch_size, int) or not 1 <= batch_size <= 512:
            raise ValueError("INVALID_ENCODING_BATCH")
        parts = []
        for start in range(0, len(texts), batch_size):
            x = self.features(texts[start:start + batch_size])
            y, _ = self._forward(x)
            # A bias or graph prior cannot invent a result for an empty query.
            y[np.sum(x * x, axis=1) == 0] = 0
            parts.append(y)
        return np.concatenate(parts) if parts else np.zeros((0, self.config.embedding_dim))

    def search_nodes(self, query: str, limit=10):
        if not isinstance(query, str) or not isinstance(limit, int) or isinstance(limit, bool) or not 1 <= limit <= 20:
            raise ValueError("INVALID_NODE_SEARCH")
        z = self.encode([query])[0]
        if not np.any(z):
            return []
        k, _ = self._node_vectors()
        scores = k @ z
        order = np.argsort(-scores, kind="stable")[:limit]
        return [{"hsn": self.node_ids[i], "name": self.nodes[i].get("name"), "kind": self.nodes[i].get("kind"),
                 "score": float(scores[i]), "score_type": "learned_cosine", "semantic_status": "CANDIDATE_UNREVIEWED",
                 "registry_sha256": self.registry_sha256, "checkpoint_sha256": self.checkpoint_sha256} for i in order]

    def node(self, hsn):
        if hsn not in self._positions:
            raise ValueError("UNKNOWN_HSN_ADDRESS")
        i = self._positions[hsn]
        k, _ = self._node_vectors()
        return {"hsn": hsn, "source": dict(self.nodes[i]), "representation": k[i].tolist(),
                "learned_state_sha256": self.state_digest(), "registry_sha256": self.registry_sha256,
                "representation_status": "LEARNED_STATE_NOT_SOURCE_DEFINITION", "semantic_acceptance": False}

    def state_digest(self):
        h = hashlib.sha256()
        for key in sorted(self.parameters):
            value = np.asarray(self.parameters[key], dtype="<f8")
            h.update(key.encode()); h.update(_canonical(list(value.shape)).encode()); h.update(value.tobytes(order="C"))
        return h.hexdigest()

    def descriptor(self):
        return {"schema": SCHEMA, "registry_sha256": self.registry_sha256, "address_digest": self.address_digest,
                "nodes": len(self.nodes), "spheres": self.sphere_count, "houses": self.house_count,
                "config": self.config.to_dict(), "parameter_count": sum(x.size for x in self.parameters.values()),
                "active_trainable_parameter_count": sum(x.size for name, x in self.parameters.items()
                                                        if self.config.hierarchy or name not in {"sphere_gates", "house_gates"}),
                "learned_state_sha256": self.state_digest(), "checkpoint_sha256": self.checkpoint_sha256,
                "hierarchy_message_weights_learned": self.config.hierarchy, "source_definitions_modified": False,
                "semantic_acceptance": False, "physical_geometry_equivalence": False}

    def save(self, directory, *, corpus_sha256, training_state=None):
        out = Path(directory)
        out.mkdir(parents=True, exist_ok=True)
        weights = out / "weights.npz"
        np.savez_compressed(weights, **self.parameters)
        manifest = {"schema": SCHEMA, "registry_sha256": self.registry_sha256, "edition": self.edition,
                    "address_digest": self.address_digest, "node_ids": self.node_ids, "config": self.config.to_dict(),
                    "corpus_sha256": corpus_sha256, "weights_file": "weights.npz", "weights_sha256": _sha_file(weights),
                    "state_sha256": self.state_digest(), "test_fixture": self._test_fixture,
                    "training_state": training_state or {}, "semantic_acceptance": False}
        path = out / "manifest.json"
        path.write_text(_canonical(manifest) + "\n", encoding="utf-8")
        self.checkpoint_sha256 = _sha_file(path)
        self.corpus_sha256 = corpus_sha256
        return {"directory": str(out.resolve()), "manifest_sha256": self.checkpoint_sha256, "state_sha256": self.state_digest()}

    @classmethod
    def load(cls, directory, registry, *, expected_corpus_sha256=None, expected_manifest_sha256=None, _test_fixture=False):
        root = Path(directory)
        path = root / "manifest.json"
        manifest_hash = _sha_file(path)
        if expected_manifest_sha256 is not None and manifest_hash != expected_manifest_sha256:
            raise ValueError("CHECKPOINT_MANIFEST_PIN_MISMATCH")
        meta = json.loads(path.read_text(encoding="utf-8"))
        if meta.get("schema") != SCHEMA or meta.get("weights_file") != "weights.npz" or meta.get("semantic_acceptance") is not False:
            raise ValueError("CHECKPOINT_SCHEMA_MISMATCH")
        if meta.get("registry_sha256") != registry.get("sha256", registry.get("registry_sha256")):
            raise ValueError("CHECKPOINT_REGISTRY_PIN_MISMATCH")
        if expected_corpus_sha256 is not None and meta.get("corpus_sha256") != expected_corpus_sha256:
            raise ValueError("CHECKPOINT_CORPUS_PIN_MISMATCH")
        if bool(meta.get("test_fixture")) != bool(_test_fixture):
            raise ValueError("CHECKPOINT_FIXTURE_SCOPE_MISMATCH")
        model = cls(registry, ModelConfig.from_dict(meta["config"]), _test_fixture=_test_fixture)
        if meta.get("address_digest") != model.address_digest or meta.get("node_ids") != model.node_ids:
            raise ValueError("CHECKPOINT_ADDRESS_PIN_MISMATCH")
        weights = root / "weights.npz"
        if _sha_file(weights) != meta.get("weights_sha256"):
            raise ValueError("CHECKPOINT_WEIGHTS_PIN_MISMATCH")
        with np.load(weights, allow_pickle=False) as data:
            if set(data.files) != set(model.parameters):
                raise ValueError("CHECKPOINT_PARAMETER_SET_MISMATCH")
            for key in model.parameters:
                arr = np.asarray(data[key], dtype=np.float64)
                if arr.shape != model.parameters[key].shape or not np.all(np.isfinite(arr)):
                    raise ValueError("CHECKPOINT_PARAMETER_INVALID")
                model.parameters[key] = arr.copy()
        if model.state_digest() != meta.get("state_sha256"):
            raise ValueError("CHECKPOINT_STATE_PIN_MISMATCH")
        model.checkpoint_sha256 = manifest_hash
        model.corpus_sha256 = meta.get("corpus_sha256")
        return model


def search_corpus(model, query, items, *, limit=10, vectors=None):
    if not isinstance(query, str) or not isinstance(limit, int) or not 1 <= limit <= 20:
        raise ValueError("INVALID_CORPUS_SEARCH")
    q = model.encode([query])[0]
    if not np.any(q):
        return []
    matrix = model.encode([x["text"] for x in items]) if vectors is None else np.asarray(vectors)
    if matrix.shape != (len(items), model.config.embedding_dim) or not np.all(np.isfinite(matrix)):
        raise ValueError("CORPUS_VECTOR_SHAPE_MISMATCH")
    scores = matrix @ q
    valid = np.linalg.norm(matrix, axis=1) > 0
    order = np.argsort(-np.where(valid, scores, -np.inf), kind="stable")[:limit]
    fields = ("id", "source_id", "source_version", "source_uri", "source_sha256", "text_sha256", "title", "family_id", "scope", "author_kind", "evidence_status", "hsn_candidates")
    return [{**{k: items[i].get(k) for k in fields}, "score": float(scores[i]), "score_type": "learned_cosine",
             "checkpoint_sha256": model.checkpoint_sha256, "semantic_status": "RETRIEVAL_NOT_ACCEPTANCE"}
            for i in order if valid[i]]
