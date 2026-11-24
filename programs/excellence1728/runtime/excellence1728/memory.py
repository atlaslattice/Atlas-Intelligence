"""Dependency-qualified result reuse with authorization checked at each use."""
from __future__ import annotations

import hashlib
import hmac

from .model import ProgramError, HEX64, canonical_bytes, strict_loads, digest


def validate_context(context):
    required = {"input_sha256", "implementation_sha256", "source_pins", "policy_sha256", "scope"}
    if type(context) is not dict or set(context) != required:
        raise ProgramError("Memory context requires inputs, implementation, sources, policy and scope")
    canonical_bytes(context)
    for field in ("input_sha256", "implementation_sha256", "policy_sha256"):
        if type(context[field]) is not str or not HEX64.fullmatch(context[field]):
            raise ProgramError("Invalid memory dependency pin")
    pins = context["source_pins"]
    if type(pins) is not dict or not pins or any(type(k) is not str or not k or type(v) is not str or not HEX64.fullmatch(v) for k, v in pins.items()):
        raise ProgramError("Invalid memory source pins")
    if type(context["scope"]) is not str or not context["scope"]:
        raise ProgramError("Explicit memory scope is required")


class FunctionalMemory:
    """The cache stores results, never permission decisions or return rights."""
    __slots__ = ("_key", "_entries", "_current_permission", "_current_context", "_max_entries")

    def __init__(self, *, receipt_key: bytes, current_permission, current_context, max_entries=4096):
        if type(receipt_key) is not bytes or len(receipt_key) < 32 or not callable(current_permission) or not callable(current_context):
            raise ProgramError("Memory needs a host key and current permission/dependency callbacks")
        if type(max_entries) is not int or not 1 <= max_entries <= 100000:
            raise ProgramError("Invalid memory capacity")
        self._key, self._entries = receipt_key, {}
        self._current_permission, self._current_context = current_permission, current_context
        self._max_entries = max_entries

    def _check_current(self, context, operation):
        requested = strict_loads(canonical_bytes(context))
        if self._current_permission(requested, operation) is not True:
            raise ProgramError("Current memory permission denied")
        actual = self._current_context(strict_loads(canonical_bytes(context)))
        validate_context(actual)
        if canonical_bytes(actual) != canonical_bytes(context):
            raise ProgramError("Memory dependencies are stale")

    def put(self, context: dict, value):
        validate_context(context)
        context = strict_loads(canonical_bytes(context))
        self._check_current(context, "write_start")
        key = digest(context)
        raw = canonical_bytes({"schema": "atlas.excellence.memory.v1", "context": context, "value": value})
        if len(raw) > 8 * 1024 * 1024:
            raise ProgramError("Memory entry exceeds 8 MiB")
        tag = hmac.new(self._key, raw, hashlib.sha256).hexdigest()
        self._check_current(context, "write_return")
        if key not in self._entries and len(self._entries) >= self._max_entries:
            del self._entries[next(iter(self._entries))]
        self._entries[key] = (raw, tag)
        return {"key": key, "stored": True, "permissions_cached": False}

    def get(self, context: dict):
        validate_context(context)
        context = strict_loads(canonical_bytes(context))
        self._check_current(context, "read_start")
        key = digest(context)
        entry = self._entries.get(key)
        if entry is None:
            self._check_current(context, "miss_return")
            return {"hit": False, "key": key, "permissions_cached": False}
        if type(entry) is not tuple or len(entry) != 2 or type(entry[0]) is not bytes or type(entry[1]) is not str:
            raise ProgramError("Corrupt memory envelope")
        raw, tag = entry
        if not hmac.compare_digest(hmac.new(self._key, raw, hashlib.sha256).hexdigest(), tag):
            raise ProgramError("Memory payload authentication failed")
        record = strict_loads(raw)
        if record.get("schema") != "atlas.excellence.memory.v1" or record.get("context") != context:
            raise ProgramError("Memory identity changed")
        self._check_current(context, "read_return")
        return {"hit": True, "key": key, "value": record["value"], "permissions_cached": False}

    def invalidate_source(self, source_id: str):
        removed = []
        for key, (raw, tag) in list(self._entries.items()):
            if not hmac.compare_digest(hmac.new(self._key, raw, hashlib.sha256).hexdigest(), tag):
                raise ProgramError("Memory payload authentication failed")
            if source_id in strict_loads(raw)["context"]["source_pins"]:
                removed.append(key)
                del self._entries[key]
        return {"invalidated": removed, "count": len(removed)}
