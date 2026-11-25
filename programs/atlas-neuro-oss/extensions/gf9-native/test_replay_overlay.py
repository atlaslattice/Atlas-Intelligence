"""Independent release-helper controls using only temporary synthetic files."""
from contextlib import redirect_stdout
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch


class ReplayTests(unittest.TestCase):
    def fixture(self):
        tmp = tempfile.TemporaryDirectory(); self.addCleanup(tmp.cleanup)
        root = Path(tmp.name); base = root / 'base'; base.mkdir()
        bundle = root / 'bundle'; (bundle / 'overlay').mkdir(parents=True)
        trusted = b'verified baseline bytes\n'; added = b'original additive bytes\n'
        (base / 'base.txt').write_bytes(trusted); (bundle / 'overlay/new.txt').write_bytes(added)
        sha = lambda x: hashlib.sha256(x).hexdigest()
        (bundle / 'BASELINE_FILES.json').write_text(json.dumps({'sourceCommit': 'a' * 40,
            'files': [{'path': 'base.txt', 'acceptedSha256': [sha(trusted)]}]}))
        (bundle / 'OVERLAY_MANIFEST.json').write_text(json.dumps({'sourceCommit': 'a' * 40,
            'files': [{'path': 'new.txt', 'sha256': sha(added)}], 'appendOnlyMutations': []}))
        helper = bundle / 'replay_overlay.py'
        shutil.copyfile(Path(__file__).with_name('replay_overlay.py'), helper)
        spec = importlib.util.spec_from_file_location('temporary_replay_helper', helper)
        module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        output = root / 'new-candidate'
        return module, base, output, trusted

    def run_main(self, module, base, output):
        with patch.object(sys, 'argv', ['replay_overlay.py', '--baseline', str(base), '--output', str(output)]):
            with redirect_stdout(io.StringIO()):
                return module.main()

    def test_concurrent_source_change_cannot_replace_verified_bytes(self):
        module, base, output, trusted = self.fixture()
        original_read = Path.read_bytes; changed = []
        def read_then_change(path):
            captured = original_read(path)
            if path == base / 'base.txt' and not changed:
                changed.append(True)
                path.write_bytes(b'concurrent changed source\n')
            return captured
        with patch.object(Path, 'read_bytes', read_then_change):
            self.assertEqual(self.run_main(module, base, output), 0)
        self.assertTrue(changed)
        self.assertEqual((output / 'base.txt').read_bytes(), trusted)
        self.assertEqual((base / 'base.txt').read_bytes(), b'concurrent changed source\n')

    def test_wrong_baseline_holds_before_creating_output(self):
        module, base, output, _ = self.fixture()
        (base / 'base.txt').write_text('wrong edition')
        with self.assertRaisesRegex(ValueError, 'BASELINE_PIN_MISMATCH'):
            self.run_main(module, base, output)
        self.assertFalse(output.exists())

    def test_addition_collision_holds_without_replacing_existing_source(self):
        module, base, output, _ = self.fixture()
        (base / 'new.txt').write_text('pre-existing independent module')
        with self.assertRaisesRegex(ValueError, 'ADDITION_PIN_OR_COLLISION'):
            self.run_main(module, base, output)
        self.assertEqual((base / 'new.txt').read_text(), 'pre-existing independent module')
        self.assertFalse(output.exists())


if __name__ == '__main__':
    unittest.main()
