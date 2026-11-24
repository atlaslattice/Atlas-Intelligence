#!/usr/bin/env python3
"""Reconstruct an additive candidate in a NEW directory from an authorized base.

No download, install, network call, model execution or owner configuration write.
The supplied baseline is read-only. Missing or changed source remains a HOLD.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(name):
    value = PurePosixPath(name)
    if value.is_absolute() or not value.parts or any(x in ('..', '.') for x in value.parts):
        raise ValueError('NONCANONICAL_PAYLOAD_PATH')
    return Path(*value.parts)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    bundle = Path(__file__).resolve().parent
    baseline, output = args.baseline.resolve(), args.output.resolve()
    if output.exists() or output == baseline or output.is_relative_to(baseline):
        raise ValueError('NEW_OUTPUT_OUTSIDE_BASELINE_REQUIRED')
    source = json.loads((bundle / 'BASELINE_FILES.json').read_text())
    overlay = json.loads((bundle / 'OVERLAY_MANIFEST.json').read_text())
    if source['sourceCommit'] != overlay['sourceCommit']:
        raise ValueError('SOURCE_COMMIT_MISMATCH')
    checked_base, checked_overlay = [], []
    for entry in source['files']:
        path = baseline / relative(entry['path'])
        if path.is_symlink() or not path.is_file():
            raise ValueError('BASELINE_PIN_MISMATCH: ' + entry['path'])
        captured = path.read_bytes()
        if hashlib.sha256(captured).hexdigest() not in entry['acceptedSha256']:
            raise ValueError('BASELINE_PIN_MISMATCH: ' + entry['path'])
        checked_base.append((entry['path'], captured))
    for entry in overlay['files']:
        rel = relative(entry['path'])
        path = bundle / 'overlay' / rel
        if path.is_symlink() or not path.is_file() or (baseline / rel).exists():
            raise ValueError('ADDITION_PIN_OR_COLLISION: ' + entry['path'])
        captured = path.read_bytes()
        if hashlib.sha256(captured).hexdigest() != entry['sha256']:
            raise ValueError('ADDITION_PIN_OR_COLLISION: ' + entry['path'])
        checked_overlay.append((entry['path'], captured))
    captured_base = dict(checked_base)
    for mutation in overlay['appendOnlyMutations']:
        name = str(relative(mutation['path']))
        original = captured_base.get(name)
        if original is None or hashlib.sha256(original).hexdigest() != mutation['predecessorSha256']:
            raise ValueError('APPEND_PREDECESSOR_MISMATCH')
        composed = original + mutation['appendUtf8'].encode('utf-8')
        if hashlib.sha256(composed).hexdigest() != mutation['candidateSha256']:
            raise ValueError('APPEND_CANDIDATE_MISMATCH')

    # No caller baseline byte is changed. Explicit copies exclude unrelated
    # corpus, model, private configuration and untracked files by construction.
    output.mkdir(parents=True, exist_ok=False)
    for name, captured in checked_base + checked_overlay:
        destination = output / relative(name)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(captured)
        if digest(destination) != hashlib.sha256(captured).hexdigest():
            raise ValueError('RECONSTRUCTED_FILE_MISMATCH: ' + name)
    for mutation in overlay['appendOnlyMutations']:
        path = output / relative(mutation['path'])
        with path.open('ab') as stream:
            stream.write(mutation['appendUtf8'].encode('utf-8'))
        if digest(path) != mutation['candidateSha256']:
            raise ValueError('COMPOSED_SOURCE_MISMATCH')
    print(json.dumps({'status': 'SOURCE_CANDIDATE_RECONSTRUCTED', 'baselineFiles': len(checked_base),
        'addedFiles': len(checked_overlay), 'appendOnlyMutations': len(overlay['appendOnlyMutations']),
        'output': str(output), 'modelsExecuted': 0, 'hostActivated': False, 'baselineModified': False}))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
