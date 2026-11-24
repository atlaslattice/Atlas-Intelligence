"""Focused offline regressions for contributor-document checking."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[1] / "scripts" / "check_project_docs.py"
SPEC = importlib.util.spec_from_file_location("project_docs", SOURCE)
docs = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(docs)


class ProjectDocsTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        for name in docs.DOCUMENTS:
            target = self.root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text("# Contributor guide\n", encoding="utf-8")
        (self.root / "package.json").write_text(json.dumps({"scripts": {"build": "echo fixture"}}))
        self.manifest = self.root / "tree.json"
        self.manifest.write_text(json.dumps([{"path": "programs/example/README.md"}]))

    def result(self):
        return docs.check(self.root, tree_manifest=self.manifest)

    def test_valid_links_and_commands_without_reading_linked_bodies(self):
        (self.root / "README.md").write_text(
            "# Guide\n[Program](programs/example/README.md)\n"
            "[New guide](CONTRIBUTING.md#review)\n[Website](https://example.invalid/)\n"
            "[reference]: programs/example/README.md\n`npm run build`\n"
            "```md\n[Example only](missing-example.md)\n```\n")
        original = docs.read_document
        opened = []
        def observed(path):
            opened.append(path.relative_to(self.root).as_posix())
            return original(path)
        with patch.object(docs, "read_document", side_effect=observed):
            self.assertEqual(self.result(), [])
        self.assertEqual(set(opened), set(docs.DOCUMENTS) | {"package.json"})

    def test_broken_link_and_escaping_path_are_actionable(self):
        (self.root / "README.md").write_text("[Missing](missing.md)\n[Escape](../outside.md)\n")
        errors = self.result()
        self.assertTrue(any("broken relative link: missing.md" in error for error in errors))
        self.assertTrue(any("link leaves the repository" in error for error in errors))

    def test_undefined_npm_script_and_empty_file_fail(self):
        (self.root / "README.md").write_text("Run `npm run imaginary`.\n")
        (self.root / "CONTRIBUTING.md").write_text(" \n")
        errors = self.result()
        self.assertTrue(any("npm run imaginary is not defined" in error for error in errors))
        self.assertTrue(any("CONTRIBUTING.md: document is empty" == error for error in errors))

    def test_malformed_utf8_and_missing_file_fail(self):
        (self.root / "README.md").write_bytes(b"\xff")
        (self.root / "docs/README.md").unlink()
        errors = self.result()
        self.assertTrue(any(error.startswith("README.md:") and "decode" in error for error in errors))
        self.assertTrue(any(error.startswith("docs/README.md: missing") for error in errors))

    def test_symlinked_document_is_not_opened(self):
        (self.root / "README.md").unlink()
        (self.root / "README.md").symlink_to(self.root / "package.json")
        errors = self.result()
        self.assertTrue(any(error.startswith("README.md: missing") for error in errors))

    def test_truncated_tree_does_not_certify_links(self):
        self.manifest.write_text(json.dumps({"truncated": True, "tree": []}))
        with self.assertRaisesRegex(ValueError, "truncated"):
            self.result()

    def test_git_index_metadata_handles_staged_and_deleted_targets(self):
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        target = self.root / "tracked.md"
        target.write_text("Linked body must not be read.\n")
        (self.root / "README.md").write_text("[Target](tracked.md)\n")
        subprocess.run(["git", "-C", str(self.root), "add", "tracked.md"], check=True)
        self.assertEqual(docs.check(self.root), [])
        target.unlink()
        self.assertTrue(any("broken relative link: tracked.md" in error for error in docs.check(self.root)))


if __name__ == "__main__":
    unittest.main()
