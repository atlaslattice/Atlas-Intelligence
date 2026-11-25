#!/usr/bin/env python3
"""Pure-offline verifier for the native R03 100-pass result corpus.

This checks the local receipts, not hosted SwarmChat messages or a booted OS.
"""
import hashlib
import json
import pathlib
import re
import sys

FAMILIES = ["hsn-valid", "hsn-malformed", "quota-delegate", "quota-overdraft",
            "ipc-destination", "ipc-replay", "cascading-revoke", "page-reuse",
            "scheduler-exhaustion", "malformed-ipc"]


def verify_log(path):
    b = pathlib.Path(path).read_bytes()
    lines = b.decode("utf-8").strip().splitlines()
    assert len(lines) == 101, (path, len(lines))
    receipts = []
    for ix, line in enumerate(lines[:100]):
        family, case = FAMILIES[ix // 10], ix % 10 + 1
        assert line == f"PASS|{ix+1:03}|{family}|{case}", (path, ix, line)
        receipts.append({"pass": ix+1, "family": family, "case": case,
                         "source": "unchanged original Atlas Native R03 C", "status": "LOCAL_TEST"})
    assert lines[-1].startswith("SUMMARY|100|"), lines[-1]
    _, count, assertion_count, qualifier = lines[-1].split("|")
    assert count == "100" and qualifier == "LOCAL_C_SYNTHETIC_ONLY"
    assert int(assertion_count) > 10000
    return {"sha256": hashlib.sha256(b).hexdigest(), "assertions": int(assertion_count), "receipts": receipts}


def main(paths):
    assert len(paths) == 3
    results = [verify_log(p) for p in paths]
    assert results[0] == results[1] == results[2], "compiler modes have different outputs"
    out = {"schema": "atlas.native-r03.peer100.review-receipt/v1",
           "count": 100, "total_assertions_each_build": results[0]["assertions"],
           "toolchains": ["gcc-O2", "clang-O2", "gcc-asan-ubsan"],
           "output_sha256": results[0]["sha256"],
           "tests": results[0]["receipts"],
           "peer_room": "atlas-os-native-r03-20261125",
           "current_room_review_is_distinct_from_tests": True,
           "real_swarmchat_posts_derived_from_tests": 0,
           "hosted_boot_verified": False, "host_issuer_verified": False,
           "model_calls_added": 0, "macroturns_created": 0}
    target = pathlib.Path(__file__).parent.parent / "evidence" / "peer_100_result.json"
    target.write_text(json.dumps(out, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    print("PASS: 100 unique C passes, 3 byte-identical toolchain receipts,", results[0]["assertions"], "assertions each")
    print("sha256", results[0]["sha256"])


if __name__ == "__main__":
    main(sys.argv[1:])
