from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from . import ProgramError, compile_plan, validate_plan, load_json, canonical_bytes, WorkBudget, ready_tasks, aggregate_meta145, read_task, query_tasks


def main(argv=None):
    parser = argparse.ArgumentParser(description="Atlas 1,728-step engineering program. No task text is executed.")
    sub = parser.add_subparsers(dest="command", required=True)
    build = sub.add_parser("compile", help="Compile authored catalogs and source coverage")
    for name in ("catalog", "phases", "sources", "coverage", "canon", "output"):
        build.add_argument("--" + name, required=True)
    validate = sub.add_parser("validate", help="Validate count, source pins, dependencies and scope")
    validate.add_argument("plan")
    validate.add_argument("--expected-sha256")
    ready = sub.add_parser("ready", help="Compute dependency and budget readiness, without executing")
    ready.add_argument("plan")
    ready.add_argument("--total-units", type=int, default=36)
    ready.add_argument("--used-work-units", type=int, default=0)
    ready.add_argument("--limit", type=int, default=12)
    meta = sub.add_parser("meta145", help="Produce a truthful unexecuted 144+12+145 coverage manifest")
    meta.add_argument("plan")
    meta.add_argument("--output")
    one = sub.add_parser("task", help="Read one exact engineering task")
    one.add_argument("plan")
    one.add_argument("task_id")
    search = sub.add_parser("search", help="Bounded deterministic all-token task search")
    search.add_argument("plan")
    search.add_argument("query", nargs="?", default="")
    search.add_argument("--workstream")
    search.add_argument("--phase")
    search.add_argument("--limit", type=int, default=20)
    search.add_argument("--offset", type=int, default=0)
    args = parser.parse_args(argv)
    try:
        if args.command == "compile":
            result = compile_plan(load_json(args.catalog), load_json(args.phases), load_json(args.sources), load_json(args.coverage), canon_reference=load_json(args.canon))
            Path(args.output).parent.mkdir(parents=True, exist_ok=True)
            Path(args.output).write_bytes(canonical_bytes(result))
            result = {k: v for k, v in validate_plan(result).items() if k != "topological_order"}
            result["output"] = str(Path(args.output).resolve())
        elif args.command == "validate":
            plan = load_json(args.plan)
            if Path(args.plan).read_bytes() != canonical_bytes(plan):
                raise ProgramError("Plan file must contain exact canonical JSON bytes without a trailing newline")
            result = {k: v for k, v in validate_plan(plan, expected_sha256=args.expected_sha256).items() if k != "topological_order"}
        elif args.command == "ready":
            result = ready_tasks(load_json(args.plan), budget=WorkBudget(args.total_units, args.used_work_units, args.limit))
        elif args.command == "task":
            result = read_task(load_json(args.plan), args.task_id)
        elif args.command == "search":
            result = query_tasks(load_json(args.plan), args.query, workstream_id=args.workstream, phase_id=args.phase, limit=args.limit, offset=args.offset)
        else:
            result = aggregate_meta145(load_json(args.plan))
            if args.output:
                Path(args.output).parent.mkdir(parents=True, exist_ok=True)
                Path(args.output).write_text(json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False) + "\n")
        print(json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False))
        return 0
    except (ProgramError, OSError, KeyError) as exc:
        print(json.dumps({"error": type(exc).__name__, "message": str(exc)}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
