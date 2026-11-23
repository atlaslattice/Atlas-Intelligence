"""Local CLI. Every command is finite and operates only on supplied files."""
import argparse
import json
from pathlib import Path
import sqlite3
import sys

from .circuit import (
    CircuitError, _load, append_visit, build_circuit, create_ledger,
    next_batch, verify_ledger,
)


def main(argv=None):
    parser = argparse.ArgumentParser(description="Compile/review a source-pinned Ariadne circuit offline.")
    commands = parser.add_subparsers(dest="command", required=True)
    compile_command = commands.add_parser("compile")
    compile_command.add_argument("--registry", required=True)
    compile_command.add_argument("--lenses", required=True)
    compile_command.add_argument("--original-source", required=True)
    compile_command.add_argument("--source-sha256", required=True)
    compile_command.add_argument("--edition", required=True)
    compile_command.add_argument("--tickets")
    compile_command.add_argument("--out", required=True)
    for command in ("init-ledger", "verify-ledger", "next-batch", "append-visit"):
        sub = commands.add_parser(command)
        sub.add_argument("--plan", required=True)
        sub.add_argument("--ledger", required=True)
        if command != "init-ledger":
            sub.add_argument("--expected-head", required=command == "append-visit")
        if command == "next-batch":
            sub.add_argument("--limit", type=int, default=12)
        if command == "append-visit":
            sub.add_argument("--report", required=True)
    inspect = commands.add_parser("inspect")
    inspect.add_argument("--db", required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "compile":
            result = build_circuit(_load(args.registry), _load(args.lenses), args.out,
                expected_source_sha256=args.source_sha256, expected_edition=args.edition,
                original_source_bytes=Path(args.original_source).read_bytes(),
                ticket_overrides=_load(args.tickets) if args.tickets else None)
        elif args.command == "init-ledger":
            result = create_ledger(args.plan, args.ledger)
        elif args.command == "verify-ledger":
            ledger = verify_ledger(args.ledger, args.plan, expected_head=args.expected_head)
            result = {"status": "LOCAL_LEDGER_INTEGRITY_PASS", "head": ledger["head"], "summary": ledger["summary"]}
        elif args.command == "next-batch":
            result = next_batch(args.plan, args.ledger, limit=args.limit, expected_head=args.expected_head)
        elif args.command == "append-visit":
            result = append_visit(args.ledger, args.plan, _load(args.report), expected_head=args.expected_head)
        else:
            uri = Path(args.db).resolve().as_uri() + "?mode=ro"
            with sqlite3.connect(uri, uri=True) as db:
                result = {"manifest": json.loads(db.execute("SELECT value FROM metadata WHERE key='manifest'").fetchone()[0]),
                          "candidateCounts": dict(db.execute("SELECT kind,count(*) FROM review_candidates GROUP BY kind")),
                          "ticketCount": db.execute("SELECT count(*) FROM tickets").fetchone()[0],
                          "semanticStatuses": [row[0] for row in db.execute("SELECT DISTINCT semantic_status FROM review_candidates")]}
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except CircuitError as error:
        print(json.dumps({"status": "HOLD", "reason": error.code}))
        return 2
    except (OSError, sqlite3.Error, ValueError, TypeError):
        print(json.dumps({"status": "HOLD", "reason": "LOCAL_FILE_OR_DATABASE_ERROR"}))
        return 2


if __name__ == "__main__":
    sys.exit(main())
