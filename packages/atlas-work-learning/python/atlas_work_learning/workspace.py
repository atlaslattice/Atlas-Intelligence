"""Versioned private workspace configuration and immutable source bindings.

Files may be relocated together. Configuration contains relative paths, while
the owner-local process selects the root. A remote tool cannot select either.
"""
from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
import copy
import fcntl
import hashlib
import json
import os
import re
import shutil
import tempfile
import uuid

from .corpus import canonical_bytes, file_sha256, load_corpus, text_sha256
from .registry import ARIADNE_SHA256, load_registry

CONFIG_SCHEMA = "atlas.work-learning.workspace/v1"
SHA_RE = re.compile(r"^[a-f0-9]{64}$")


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _reject_constant(value):
    raise ValueError("JSON_NONFINITE_VALUE")


def _unique_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("JSON_DUPLICATE_KEY")
        result[key] = value
    return result


def strict_json(raw):
    return json.loads(raw, parse_constant=_reject_constant, object_pairs_hook=_unique_keys)


def private_json(path, value, *, immutable=False):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    raw = canonical_bytes(value) + b"\n"
    if immutable and path.exists():
        if path.read_bytes() != raw:
            raise ValueError("IMMUTABLE_OUTPUT_EXISTS")
        return file_sha256(path)
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".pending-", delete=False) as handle:
        pending = Path(handle.name)
        os.chmod(pending, 0o600)
        handle.write(raw)
        handle.flush()
        os.fsync(handle.fileno())
    try:
        os.replace(pending, path)
    finally:
        pending.unlink(missing_ok=True)
    return hashlib.sha256(raw).hexdigest()


def within(root, relative):
    if not isinstance(relative, str) or not relative or Path(relative).is_absolute():
        raise ValueError("WORKSPACE_RELATIVE_PATH_REQUIRED")
    result = (Path(root).resolve() / relative).resolve()
    if not result.is_relative_to(Path(root).resolve()):
        raise ValueError("WORKSPACE_PATH_ESCAPE")
    return result


def check_pin(root, entry):
    if not isinstance(entry, dict) or not SHA_RE.fullmatch(entry.get("sha256", "")):
        raise ValueError("INVALID_FILE_PIN")
    path = within(root, entry.get("path"))
    if not path.is_file() or file_sha256(path) != entry["sha256"]:
        raise ValueError("WORKSPACE_FILE_PIN_MISMATCH")
    return path


@contextmanager
def workspace_lock(root):
    root = Path(root)
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (root / ".write.lock").open("a+") as handle:
        os.chmod(handle.name, 0o600)
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise ValueError("WORKSPACE_WRITE_IN_PROGRESS") from exc
        try:
            yield
        finally:
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


def save_config(root, config):
    root = Path(root).resolve()
    config = copy.deepcopy(config)
    raw = canonical_bytes(config) + b"\n"
    digest = hashlib.sha256(raw).hexdigest()
    private_json(root / "config-history" / (digest + ".json"), config, immutable=True)
    private_json(root / "config.json", config)
    return digest


def load_config(root, expected_config_sha256=None):
    root = Path(root).resolve()
    path = root / "config.json"
    raw = path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if expected_config_sha256 is not None and (not SHA_RE.fullmatch(expected_config_sha256) or digest != expected_config_sha256):
        raise ValueError("WORKSPACE_CONFIG_PIN_MISMATCH")
    config = strict_json(raw)
    if config.get("schema") != CONFIG_SCHEMA or config.get("scope") != "WORK":
        raise ValueError("WORKSPACE_SCHEMA_OR_SCOPE_INVALID")
    for key in ("workspaceId", "owner"):
        maximum = 200 if key == "owner" else 256
        if not isinstance(config.get(key), str) or not config[key].strip() or len(config[key]) > maximum:
            raise ValueError("WORKSPACE_IDENTITY_REQUIRED")
    within(root, config.get("ledger"))
    if config.get("retrieval", {}).get("method") not in {"lexical", "neural", "hybrid"}:
        raise ValueError("WORKSPACE_RETRIEVAL_INVALID")
    if config.get("retrieval", {}).get("fallback", "lexical") not in {"lexical", "none"}:
        raise ValueError("WORKSPACE_FALLBACK_INVALID")
    if config.get("registry", {}).get("sha256") != ARIADNE_SHA256:
        raise ValueError("WORKSPACE_ORIGINAL_ARIADNE_REQUIRED")
    return config, digest


def _copy_input(source, root, category, *, suffix=None, expected_sha256=None):
    source = Path(source)
    digest = file_sha256(source)
    if expected_sha256 is not None and digest != expected_sha256:
        raise ValueError("INPUT_CHANGED_AFTER_VALIDATION")
    relative = f"inputs/{category}-{digest}{suffix or source.suffix}"
    target = within(root, relative)
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if target.exists():
        if file_sha256(target) != digest:
            raise ValueError("IMMUTABLE_INPUT_PIN_MISMATCH")
    else:
        with source.open("rb") as src, target.open("xb") as dst:
            os.chmod(target, 0o600)
            shutil.copyfileobj(src, dst)
        if file_sha256(target) != digest:
            raise ValueError("INPUT_CHANGED_DURING_COPY")
    return {"path": relative, "sha256": digest}


def initialize_workspace(root, registry_path, *, corpus_path=None, owner="owner-local", workspace_id=None,
                         registry_uri="atlas-source://ariadne/v0.7", expected_registry_sha256=ARIADNE_SHA256,
                         expected_corpus_sha256=None):
    root = Path(root).resolve()
    with workspace_lock(root):
        if (root / "config.json").exists():
            raise ValueError("WORKSPACE_ALREADY_INITIALIZED")
        if not isinstance(owner, str) or not owner.strip() or len(owner) > 200:
            raise ValueError("WORKSPACE_OWNER_REQUIRED")
        load_registry(registry_path, expected_registry_sha256)
        corpus = load_corpus(corpus_path, expected_corpus_sha256) if corpus_path else None
        registry = _copy_input(registry_path, root, "ariadne", suffix=".json", expected_sha256=expected_registry_sha256)
        registry.update({"id": "ariadne:v0.7", "version": "v0.7", "uri": registry_uri})
        config = {"schema": CONFIG_SCHEMA, "workspaceId": workspace_id or "atlas-work-" + uuid.uuid4().hex,
                  "owner": owner, "scope": "WORK", "createdAt": utc_now(), "registry": registry,
                  "corpus": _copy_input(corpus_path, root, "corpus", suffix=".json", expected_sha256=corpus["sha256"]) if corpus else None,
                  "ledger": "evidence/episodes.sqlite", "model": None, "evaluation": None,
                  "retrieval": {"method": "neural", "fallback": "lexical", "basis": "NEURAL_PRIMARY_LEXICAL_BACKUP"},
                  "authorization": {"identity_kind": "OWNER_LOCAL_TRUSTED_PROCESS", "remote_identity_verified": False}}
        from .episodes import EpisodeLedger
        ledger = EpisodeLedger(within(root, config["ledger"]), owner=owner)
        ledger.close()
        digest = save_config(root, config)
        return {"workspaceId": config["workspaceId"], "configSha256": digest, "registrySha256": registry["sha256"],
                "corpusSha256": config["corpus"]["sha256"] if corpus else None, "scope": "WORK"}


def attach_corpus(root, path, *, expected_sha256=None):
    with workspace_lock(root):
        config, previous = load_config(root)
        corpus = load_corpus(path, expected_sha256)
        config["corpus"] = _copy_input(path, root, "corpus", suffix=".json", expected_sha256=corpus["sha256"])
        config["model"] = None
        config["evaluation"] = None
        config["retrieval"] = {"method": "neural", "fallback": "lexical", "basis": "NEURAL_PRIMARY_NEW_CORPUS_REQUIRES_TRAINING"}
        config["previousConfigSha256"] = previous
        config["updatedAt"] = utc_now()
        digest = save_config(root, config)
        return {"configSha256": digest, "corpusSha256": config["corpus"]["sha256"], "counts": corpus["manifest"]["counts"]}


def source_manifest(config, corpus=None):
    """Export source and canonical-item bindings for the host-owned read gate.

    The server exporter loads the corpus through its exact configured file pin.
    Item bindings must therefore come from that corpus, never from a backend
    response. Aliases remain source dependencies; they do not grant permission
    to relabel a canonical result as another edition or source.
    """
    r = config["registry"]
    sources = {(r["id"], r["version"], r["sha256"], r["uri"]):
               {"id": r["id"], "version": r["version"], "sha256": r["sha256"], "uri": r["uri"]}}
    items = {}
    for item in (corpus or {}).get("items", []):
        item_key = (item["id"], item["source_id"])
        if item_key in items:
            raise ValueError("ITEM_MANIFEST_DUPLICATE")
        text = item["text"]
        if not isinstance(text, str) or text_sha256(text) != item["text_sha256"]:
            raise ValueError("ITEM_MANIFEST_TEXT_MISMATCH")
        # This is the exact existing service prefix: Unicode code points,
        # with no normalization, rather than JavaScript UTF-16 code units.
        excerpt = text[:1600]
        items[item_key] = {
            "id": item["id"], "sourceId": item["source_id"],
            "sourceVersion": item["source_version"],
            "sourceSha256": item["source_sha256"], "sourceUri": item["source_uri"],
            "textSha256": item["text_sha256"], "excerptSha256": text_sha256(excerpt),
            "excerptTruncated": len(excerpt) < len(text),
        }
        for row in [item, *item.get("aliases", [])]:
            key = (row["source_id"], row["source_version"], row["source_sha256"], row["source_uri"])
            sources[key] = dict(zip(("id", "version", "sha256", "uri"), key))
    return {"sources": [sources[key] for key in sorted(sources)],
            "items": [items[key] for key in sorted(items)]}


def pinned_files(root, config):
    result = [{"path": str(Path(root).resolve() / "config.json"), "sha256": file_sha256(Path(root) / "config.json")}]
    for key in ("registry", "corpus", "evaluation"):
        entry = config.get(key)
        if entry:
            result.append({"path": str(check_pin(root, entry)), "sha256": entry["sha256"]})
    if config.get("model"):
        entry = config["model"]
        manifest = check_pin(root, entry)
        result.append({"path": str(manifest), "sha256": entry["sha256"]})
        meta = strict_json(manifest.read_bytes())
        weights = within(root, str((manifest.parent / "weights.npz").relative_to(Path(root).resolve())))
        if meta.get("weights_file") != weights.name or file_sha256(weights) != meta.get("weights_sha256"):
            raise ValueError("CHECKPOINT_WEIGHTS_PIN_MISMATCH")
        result.append({"path": str(weights), "sha256": meta["weights_sha256"]})
    return result
