"""Load the original Ariadne registry without creating a replacement ontology."""
from __future__ import annotations

import copy
import hashlib
import json
import re
from pathlib import Path
from typing import Any

ARIADNE_SHA256 = "07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6"
HSN_PATTERN = re.compile(r"^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$")
SHA_PATTERN = re.compile(r"^[a-f0-9]{64}$")


def validate_registry(data: dict[str, Any]) -> dict[str, Any]:
    """Validate all addresses and role axes, not merely aggregate counts.

    This structural validator is also useful for negative-control fixtures. Only
    ``load_registry`` establishes the binding to supplied original source bytes.
    """
    if not isinstance(data, dict):
        raise ValueError("REGISTRY_OBJECT_REQUIRED")
    for key, count in (("houses", 12), ("spheres", 144), ("nodes", 1728)):
        if not isinstance(data.get(key), dict) or len(data[key]) != count:
            raise ValueError(f"REGISTRY_CARDINALITY:{key}")
    house_ids, sphere_ids, node_ids = [], [], []
    for h in range(1, 13):
        hid = f"H{h:02d}"
        house_ids.append(hid)
        house = data["houses"].get(hid, {})
        children = [f"{hid}.S{s:02d}" for s in range(1, 13)]
        if house.get("id") != hid or house.get("parent") is not None or house.get("children") != children or not house.get("name"):
            raise ValueError(f"REGISTRY_HOUSE:{hid}")
        for s, sid in enumerate(children, 1):
            sphere_ids.append(sid)
            sphere = data["spheres"].get(sid, {})
            nodes = [f"{sid}.N{n:02d}" for n in range(1, 13)]
            if sphere.get("id") != sid or sphere.get("parent") != hid or sphere.get("children") != nodes or not sphere.get("name"):
                raise ValueError(f"REGISTRY_SPHERE:{sid}")
            expected_kind = "DOMAIN_SPECIALIZATION" if s <= 7 else "EPISTEMIC_META"
            for nid in nodes:
                node_ids.append(nid)
                node = data["nodes"].get(nid, {})
                if node.get("id") != nid or node.get("parent") != sid:
                    raise ValueError(f"REGISTRY_NODE_PARENT:{nid}")
                if node.get("kind") != expected_kind:
                    raise ValueError(f"REGISTRY_ROLE_AXIS:{nid}")
                for key in ("name", "definition", "includes", "excludes"):
                    if not isinstance(node.get(key), str) or not node[key].strip():
                        raise ValueError(f"REGISTRY_SEMANTICS:{nid}:{key}")
                if not SHA_PATTERN.fullmatch(node.get("source_record_sha256", "")):
                    raise ValueError(f"REGISTRY_RECORD_HASH:{nid}")
    # Explicit set equality catches a count-preserving replacement with an unknown ID.
    if set(data["houses"]) != set(house_ids) or set(data["spheres"]) != set(sphere_ids) or set(data["nodes"]) != set(node_ids):
        raise ValueError("REGISTRY_ADDRESS_SET")
    return {
        "house_ids": house_ids, "sphere_ids": sphere_ids, "node_ids": node_ids,
        "node_to_sphere": [i // 12 for i in range(1728)],
        "sphere_to_house": [i // 12 for i in range(144)],
        "counts": {"houses": 12, "spheres": 144, "nodes": 1728,
                   "domain_nodes": 1008, "method_nodes": 720},
    }


def load_registry(path: str | Path, expected_sha256: str = ARIADNE_SHA256) -> dict[str, Any]:
    """Read and pin the exact original registry. No coordinate is redefined."""
    if expected_sha256 != ARIADNE_SHA256:
        raise ValueError("UNSUPPORTED_REGISTRY_EDITION")
    raw = Path(path).read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != expected_sha256:
        raise ValueError("REGISTRY_SHA256_MISMATCH")
    data = json.loads(raw.decode("utf-8"))
    structure = validate_registry(data)
    return {
        "schema": "atlas.work-learning.registry/v1", "edition": "ariadne-v0.7",
        "sha256": digest, "registry_sha256": digest,
        "status": "ORIGINAL_SOURCE_BYTES_VERIFIED", **structure,
        "houses": [copy.deepcopy(data["houses"][i]) for i in structure["house_ids"]],
        "spheres": [copy.deepcopy(data["spheres"][i]) for i in structure["sphere_ids"]],
        "nodes": [copy.deepcopy(data["nodes"][i]) for i in structure["node_ids"]],
    }


def node_record(registry: dict[str, Any], hsn: str) -> dict[str, Any]:
    if not isinstance(hsn, str) or not HSN_PATTERN.fullmatch(hsn):
        raise ValueError("INVALID_HSN")
    h, s, n = int(hsn[1:3]), int(hsn[5:7]), int(hsn[9:11])
    value = registry["nodes"][(h - 1) * 144 + (s - 1) * 12 + n - 1]
    if value["id"] != hsn:
        raise ValueError("REGISTRY_NODE_ORDER_MISMATCH")
    return copy.deepcopy(value)
