#!/usr/bin/env python3
"""Check the six maintained contributor documents without crawling linked content.

No network, dependency installation, linked-body reads or YAML semantic checks.
Git supplies path metadata; --tree-manifest supports a source-pinned partial copy.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import posixpath
import re
import stat
import subprocess
import sys
from urllib.parse import unquote, urlsplit


DOCUMENTS = (
    "README.md", "CONTRIBUTING.md", "docs/README.md",
    ".github/pull_request_template.md",
    ".github/ISSUE_TEMPLATE/bug_report.yml",
    ".github/ISSUE_TEMPLATE/improvement.yml",
)
MAX_DOCUMENT_BYTES = 1024 * 1024
INLINE_LINK = re.compile(r"!?\[[^\]\n]*\]\(\s*(<[^>\n]+>|[^\s)]+)(?:\s+[^)\n]*)?\)")
REFERENCE = re.compile(r"^\s{0,3}\[[^\]\n]+\]:\s*(<[^>\n]+>|\S+)", re.MULTILINE)
NPM_SCRIPT = re.compile(r"\bnpm\s+run\s+([A-Za-z0-9][A-Za-z0-9:_-]*)")


def read_document(path: Path) -> str:
    """Read only an explicitly selected regular file, with a fixed size bound."""
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode):
        raise ValueError("must be a regular file, not a symbolic link")
    with path.open("rb") as stream:
        data = stream.read(MAX_DOCUMENT_BYTES + 1)
    if len(data) > MAX_DOCUMENT_BYTES:
        raise ValueError("exceeds the 1 MiB document limit")
    return data.decode("utf-8")


def safe_local_file(root: Path, relative: str) -> bool:
    """Inspect exact path metadata only; never follow symlinks or read its body."""
    current = root
    for part in relative.split("/"):
        current = current / part
        try:
            info = current.lstat()
        except FileNotFoundError:
            return False
        if stat.S_ISLNK(info.st_mode):
            return False
    return stat.S_ISREG(info.st_mode) or stat.S_ISDIR(info.st_mode)


def source_paths(root: Path, manifest: Path | None) -> set[str]:
    if manifest is None:
        result = subprocess.run(
            ["git", "-C", str(root), "ls-files", "-z"],
            capture_output=True, check=False, timeout=10,
        )
        if result.returncode:
            raise ValueError("Git path metadata unavailable; use --tree-manifest for a partial copy")
        entries = result.stdout.decode("utf-8").split("\0")
        deleted = subprocess.run(
            ["git", "-C", str(root), "ls-files", "--deleted", "-z"],
            capture_output=True, check=True, timeout=10,
        ).stdout.decode("utf-8").split("\0")
        deleted = set(deleted)
        entries = [entry for entry in entries if entry and entry not in deleted]
    else:
        with manifest.open(encoding="utf-8") as stream:
            document = json.load(stream)
        if isinstance(document, dict):
            if document.get("truncated"):
                raise ValueError("tree manifest is truncated")
            entries = document.get("tree")
        else:
            entries = document
        if not isinstance(entries, list):
            raise ValueError("tree manifest must be a path list or a Git tree object")
        entries = [entry.get("path") if isinstance(entry, dict) else entry for entry in entries]
    paths = set()
    for entry in entries:
        if not isinstance(entry, str) or not entry or entry.startswith("/") or "\x00" in entry:
            raise ValueError("tree metadata contains an invalid path")
        normal = posixpath.normpath(entry)
        if normal != entry or normal == ".." or normal.startswith("../"):
            raise ValueError("tree metadata contains a path outside the repository")
        paths.add(entry)
        parent = posixpath.dirname(entry)
        while parent:
            paths.add(parent)
            parent = posixpath.dirname(parent)
    return paths


def without_fences(text: str) -> str:
    lines = []
    fence = None
    for line in text.splitlines():
        marker = re.match(r"^\s{0,3}(`{3,}|~{3,})", line)
        if marker:
            token = marker.group(1)
            if fence is None:
                fence = token
            elif token[0] == fence[0] and len(token) >= len(fence):
                fence = None
            lines.append("")
        else:
            lines.append(line if fence is None else "")
    return "\n".join(lines)


def check(root: Path, *, tree_manifest: Path | None = None,
          package_json: Path | None = None) -> list[str]:
    paths = source_paths(root, tree_manifest)
    package_path = package_json or root / "package.json"
    package = json.loads(read_document(package_path))
    scripts = package.get("scripts", {})
    if not isinstance(scripts, dict):
        raise ValueError("package.json scripts must be an object")
    problems = []
    for name in DOCUMENTS:
        if not safe_local_file(root, name):
            problems.append(f"{name}: missing regular file or symbolic-link component")
            continue
        try:
            text = read_document(root / name)
        except (OSError, UnicodeError, ValueError) as error:
            problems.append(f"{name}: {error}")
            continue
        if not text.strip():
            problems.append(f"{name}: document is empty")
        for command in sorted(set(NPM_SCRIPT.findall(text))):
            if not isinstance(scripts.get(command), str) or not scripts[command].strip():
                problems.append(f"{name}: npm run {command} is not defined in package.json")
        visible = without_fences(text)
        for match in list(INLINE_LINK.finditer(visible)) + list(REFERENCE.finditer(visible)):
            target = match.group(1).strip("<>")
            try:
                parsed = urlsplit(target)
            except ValueError:
                problems.append(f"{name}: malformed link target {target!r}")
                continue
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            decoded = unquote(parsed.path)
            relative = posixpath.normpath(posixpath.join(posixpath.dirname(name), decoded))
            if relative.startswith("/") or relative == ".." or relative.startswith("../") or "\x00" in relative:
                problems.append(f"{name}: link leaves the repository: {target}")
            elif relative not in paths and not safe_local_file(root, relative):
                problems.append(f"{name}: broken relative link: {target}")
    return problems


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--tree-manifest", type=Path, help="Git tree JSON or a list of repository paths")
    parser.add_argument("--package-json", type=Path, help="Explicit package.json for a partial source copy")
    args = parser.parse_args(argv)
    try:
        problems = check(args.root, tree_manifest=args.tree_manifest, package_json=args.package_json)
    except (OSError, ValueError, UnicodeError, subprocess.SubprocessError) as error:
        print(f"Project docs check unavailable: {error}", file=sys.stderr)
        return 2
    for problem in problems:
        print(f"ERROR {problem}")
    if problems:
        print(f"Project docs: {len(problems)} problem(s) in {len(DOCUMENTS)} maintained files.")
        return 1
    print(f"Project docs: PASS ({len(DOCUMENTS)} maintained files, local paths and npm script names).")
    print("Remote URLs, link fragments and issue-form YAML semantics are not validated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
