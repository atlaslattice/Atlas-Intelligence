"""One-shot, bounded JSON port over exact reviewed Atlas numerical sources.

No request can choose code, modules, paths, an owner, provider or training budget.
The executor supplies fixed Python source roots. Kernel bytes are captured and
SHA-256 checked before compiling that same capture; package __init__ is bypassed.
This is source integrity checking, not process/runtime execution attestation.
"""
from __future__ import annotations

import dataclasses
import hashlib
import json
import math
from pathlib import Path
import re
import sys
import types

REQUEST_KEYS = frozenset({"operation", "parameters", "subjectResultSha256",
                          "catalogSha256", "featureId", "trainingRequested"})
MAX_REQUEST_BYTES = 65_536
MAX_OUTPUT_BYTES = 1_048_576
MAX_SOURCE_BYTES = 131_072
MAX_ARTIFACT_BYTES = 49_152
OPAQUE_ARTIFACT_PATHS = frozenset({("parameters", "policyJson"),
    ("parameters", "leftReportJson"), ("parameters", "rightReportJson")})
SHA = re.compile(r"^[0-9a-f]{64}$")
KERNEL_PINS = {
    "event_lattice": "bca7bc4db87147e20e8add3bf80618e1e3d41b894222362474d9be3c77f307df",
    "retrieval_audits": "b2dc0a4a39cf17c968c186613e9271e39f29bece0c258c28875ce8a1d18b8563",
    "selective_evaluation": "646d99c030d48a6d8c50e312eab34c3a99e2f4afb285e608b2c7ab11fc68c28e",
    "corpus_coverage": "b43e646e2d8ab7f75b817027011cf0bc692053aa6c7846bd1c34f77158f90cee",
}
FEATURE_BINDINGS = {
    "exact_leak": frozenset({"F049"}),
    "delta_encode": frozenset({"F061"}),
    "address_metadata": frozenset({"F088", "F089"}),
    "quantization_audit": frozenset({"F025", "F032"}),
    "selective_fit": frozenset({"F109"}),
    "selective_evaluate": frozenset({"F110"}),
    "selective_compare": frozenset({"F111"}),
    "corpus_coverage": frozenset({None}),
}


class NumericPortError(ValueError):
    pass


def _fail(code):
    raise NumericPortError(code)


def _closed(value, required, optional=()):
    if type(value) is not dict or not set(required) <= set(value) or set(value) - set(required) - set(optional):
        _fail("CLOSED_PARAMETER_SCHEMA_REQUIRED")


def _bounded_list(value, minimum, maximum):
    if type(value) is not list or not minimum <= len(value) <= maximum:
        _fail("PORT_SEQUENCE_BUDGET")


def _integer(value, minimum, maximum):
    if type(value) is not int or not minimum <= value <= maximum:
        _fail("PORT_INTEGER_BUDGET")


def _check_json_tree(value, *, opaque_artifacts=False):
    pending = [(value, 0, ())]
    count = 0
    while pending:
        item, depth, path = pending.pop()
        count += 1
        if depth > 32 or count > 20_000:
            _fail("JSON_STRUCTURE_BUDGET")
        if type(item) is dict:
            pending.extend((v, depth + 1, (*path, k)) for k, v in item.items())
        elif type(item) is list:
            pending.extend((v, depth + 1, (*path, i)) for i, v in enumerate(item))
        elif type(item) is float:
            if not math.isfinite(item):
                _fail("NONFINITE_JSON_NUMBER")
        elif type(item) is int:
            if abs(item) > 9_007_199_254_740_991:
                _fail("JSON_SAFE_INTEGER_REQUIRED")
        elif type(item) is str:
            try:
                item.encode("utf-8")
            except UnicodeError:
                _fail("INVALID_JSON_UNICODE")
            limit = MAX_ARTIFACT_BYTES if opaque_artifacts and path in OPAQUE_ARTIFACT_PATHS else 8192
            if len(item) > limit:
                _fail("JSON_STRING_BUDGET")
        elif item is not None and type(item) is not bool:
            _fail("JSON_VALUE_REQUIRED")


def _strict_json_loads(text, invalid_code):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                _fail("DUPLICATE_JSON_KEY")
            result[key] = value
        return result

    def constant(_):
        _fail("NONFINITE_JSON_NUMBER")

    try:
        return json.loads(text, object_pairs_hook=unique, parse_constant=constant)
    except NumericPortError:
        raise
    except (UnicodeError, ValueError, TypeError, RecursionError):
        _fail(invalid_code)


def parse_request(raw):
    if type(raw) is not bytes or not 1 <= len(raw) <= MAX_REQUEST_BYTES:
        _fail("REQUEST_BYTE_BUDGET")
    try:
        text = raw.decode("utf-8")
    except UnicodeError:
        _fail("INVALID_JSON_REQUEST")
    request = _strict_json_loads(text, "INVALID_JSON_REQUEST")
    _check_json_tree(request, opaque_artifacts=True)
    return request


def _artifact_from_json(text):
    # JavaScript JSON.parse/stringify changes integral floats (1.0 -> 1), which
    # changes the original Python artifact digest. Carry the sealed JSON as an
    # opaque string across languages and decode it only inside this port.
    if type(text) is not str:
        _fail("OPAQUE_ARTIFACT_JSON_STRING_REQUIRED")
    try:
        size = len(text.encode("utf-8"))
    except UnicodeError:
        _fail("INVALID_ARTIFACT_JSON")
    if not 1 <= size <= MAX_ARTIFACT_BYTES:
        _fail("ARTIFACT_BYTE_BUDGET")
    value = _strict_json_loads(text, "INVALID_ARTIFACT_JSON")
    _check_json_tree(value)
    if type(value) is not dict:
        _fail("ARTIFACT_OBJECT_REQUIRED")
    # Do not reseal, normalize numbers or bypass the original kernel checks.
    # The pinned kernel verifies the supplied artifact_sha256 before use.
    return value


def _artifact_output(artifact):
    text = json.dumps(artifact, sort_keys=True, separators=(",", ":"),
                      ensure_ascii=False, allow_nan=False)
    if len(text.encode("utf-8")) > MAX_ARTIFACT_BYTES:
        _fail("ARTIFACT_BYTE_BUDGET")
    return {"artifact": artifact, "artifactJson": text}


def _kernel_path(name):
    if name == "corpus_coverage":
        return Path(__file__).with_name("corpus_coverage.py")
    # Only the process's source search path is used. The JSON contract has no
    # path, module, shell, code or dependency-location override.
    for root in sys.path:
        if type(root) is not str or not root:
            continue
        candidate = Path(root) / "atlas_work_learning" / (name + ".py")
        if candidate.is_file() or candidate.is_symlink():
            return candidate
    _fail("PINNED_KERNEL_SOURCE_UNAVAILABLE")


def _load_verified(name):
    if name not in KERNEL_PINS:
        _fail("UNLISTED_KERNEL")
    path = _kernel_path(name)
    if path.is_symlink() or not path.is_file():
        _fail("KERNEL_REGULAR_FILE_REQUIRED")
    try:
        captured = path.read_bytes()
    except OSError:
        _fail("KERNEL_SOURCE_READ_FAILED")
    if len(captured) > MAX_SOURCE_BYTES or hashlib.sha256(captured).hexdigest() != KERNEL_PINS[name]:
        _fail("KERNEL_SOURCE_PIN_MISMATCH")
    # These exact four reviewed modules use only standard-library imports.
    # A fresh named module prevents cached old code from skipping the pin check.
    module_name = "atlas_oss144_pinned_" + name
    module = types.ModuleType(module_name)
    module.__file__ = str(path)
    module.__package__ = ""
    sys.modules[module_name] = module
    try:
        exec(compile(captured, str(path), "exec", dont_inherit=True), module.__dict__)
    except Exception:
        sys.modules.pop(module_name, None)
        _fail("PINNED_KERNEL_LOAD_FAILED")
    return module


def _invoke(operation, p):
    if operation == "exact_leak":
        _closed(p, ("value", "drive", "tau", "dt"))
        return _load_verified("event_lattice").exact_leak(**p)
    if operation == "delta_encode":
        _closed(p, ("samples", "quantum"), ("initial",))
        _bounded_list(p["samples"], 0, 2048)
        return _load_verified("event_lattice").encode_delta(**p, max_samples=2048, max_events=2048)
    if operation == "address_metadata":
        _closed(p, ("hsn",))
        return _load_verified("event_lattice").address_metadata(**p)
    if operation == "quantization_audit":
        _closed(p, ("corpus", "queries"), ("top_k", "near_tie_tolerance", "expected_dimension"))
        _bounded_list(p["corpus"], 1, 128)
        _bounded_list(p["queries"], 1, 16)
        for row in [*p["corpus"], *p["queries"]]:
            _closed(row, ("id", "vector"))
            _bounded_list(row["vector"], 1, 512)
        if "top_k" in p:
            _integer(p["top_k"], 1, 32)
        return _load_verified("retrieval_audits").audit_symmetric_int8(**p)
    if operation == "selective_fit":
        _closed(p, ("validation_rows", "provenance"),
                ("risk_target", "confidence_level", "min_selected_families", "candidate_thresholds"))
        _bounded_list(p["validation_rows"], 1, 128)
        if p.get("candidate_thresholds") is not None:
            _bounded_list(p["candidate_thresholds"], 1, 32)
        return _artifact_output(_load_verified("selective_evaluation").fit_selective_policy(**p))
    if operation == "selective_evaluate":
        _closed(p, ("policyJson", "test_rows", "provenance"))
        _bounded_list(p["test_rows"], 1, 128)
        policy = _artifact_from_json(p["policyJson"])
        return _artifact_output(_load_verified("selective_evaluation").evaluate_selective_policy(
            policy, p["test_rows"], provenance=p["provenance"]))
    if operation == "selective_compare":
        _closed(p, ("leftReportJson", "rightReportJson"), ("samples", "seed", "confidence_level"))
        _integer(p.get("samples", 1000), 100, 1000)
        if "seed" in p:
            _integer(p["seed"], 0, 2**32 - 1)
        left = _artifact_from_json(p["leftReportJson"])
        right = _artifact_from_json(p["rightReportJson"])
        options = {key: p[key] for key in ("samples", "seed", "confidence_level") if key in p}
        return _load_verified("selective_evaluation").paired_family_selective_bootstrap(left, right, **options)
    if operation == "corpus_coverage":
        _closed(p, ("records", "inventory", "expected_snapshot", "expected_inventory_sha256"),
                ("expected_records_sha256", "grants", "requested_scope"))
        if p["records"] is not None:
            _bounded_list(p["records"], 0, 128)
        if "grants" in p:
            _bounded_list(p["grants"], 0, 256)
        return _load_verified("corpus_coverage").audit_corpus_manifest(**p)
    _fail("UNKNOWN_OPERATION")


def dispatch_request(request):
    """Dispatch a parsed request; the one-shot byte entry also applies size caps."""
    _check_json_tree(request, opaque_artifacts=True)
    if type(request) is not dict or set(request) != REQUEST_KEYS:
        _fail("EXACT_REQUEST_FIELDS_REQUIRED")
    if type(request["trainingRequested"]) is not bool or request["trainingRequested"] is not False:
        _fail("TRAINING_FORBIDDEN")
    operation = request["operation"]
    if type(operation) is not str or operation not in FEATURE_BINDINGS:
        _fail("UNKNOWN_OPERATION")
    for key in ("subjectResultSha256", "catalogSha256"):
        if type(request[key]) is not str or not SHA.fullmatch(request[key]):
            _fail("REQUEST_DIGEST_REQUIRED")
    feature = request["featureId"]
    if feature is not None and type(feature) is not str:
        _fail("EXACT_FEATURE_OPERATION_BINDING_REQUIRED")
    if feature not in FEATURE_BINDINGS[operation]:
        _fail("EXACT_FEATURE_OPERATION_BINDING_REQUIRED")
    try:
        value = _invoke(operation, request["parameters"])
    except NumericPortError:
        raise
    except (ValueError, TypeError, OverflowError, KeyError, RecursionError):
        _fail("KERNEL_REJECTED_PARAMETERS")
    if dataclasses.is_dataclass(value):
        value = dataclasses.asdict(value)
    result = {"schema": "atlas.oss144.numeric-output/v1", "operation": operation,
        "subjectResultSha256": request["subjectResultSha256"],
        "catalogSha256": request["catalogSha256"], "featureId": feature,
        "value": value, "optimizerUpdates": 0, "modelCalls": 0,
        "executingRuntimeAttested": False, "featureWholeImplemented": False}
    try:
        json.dumps(result, ensure_ascii=False, allow_nan=False)
    except (ValueError, TypeError, OverflowError, RecursionError):
        _fail("NONJSON_KERNEL_OUTPUT")
    return result


def dispatch_bytes(raw):
    result = dispatch_request(parse_request(raw))
    try:
        encoded = json.dumps(result, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8")
    except (UnicodeError, ValueError, TypeError, OverflowError, RecursionError):
        _fail("NONJSON_KERNEL_OUTPUT")
    if len(encoded) > MAX_OUTPUT_BYTES:
        _fail("OUTPUT_BYTE_BUDGET")
    return encoded + b"\n"


def main():
    try:
        if len(sys.argv) != 1:
            _fail("NO_COMMAND_ARGUMENTS_ALLOWED")
        raw = sys.stdin.buffer.read(MAX_REQUEST_BYTES + 1)
        output = dispatch_bytes(raw)
    except NumericPortError as exc:
        # Error codes are fixed program strings, never source data or a traceback.
        sys.stderr.write(json.dumps({"schema": "atlas.oss144.numeric-error/v1",
            "error": str(exc), "optimizerUpdates": 0, "modelCalls": 0,
            "executingRuntimeAttested": False}, separators=(",", ":")) + "\n")
        return 2
    sys.stdout.buffer.write(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
