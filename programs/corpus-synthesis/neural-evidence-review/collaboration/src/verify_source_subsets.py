"""Read-only integrity audit for exact owner-authorized MICA/Omega source subsets.

Never extracts payloads or exports source bodies. SHA matches establish byte integrity
only: no owner authority, corpus readiness, live host binding, release or consent.
"""
from __future__ import annotations
import hashlib
import json
import stat
import zipfile
from pathlib import PurePosixPath, Path
from typing import Any

EXPECTED = {
  'MICA': {'manifest':'SOURCE_MANIFEST.json', 'files_key':'files', 'count':29},
  'OMEGA': {'manifest':'READY_SOURCE_MANIFEST.json', 'files_key':'sourceFiles', 'count':60},
}

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def verify_source_zip(path: str|Path, role: str, *, expected_zip_sha256: str|None=None) -> dict[str,Any]:
    hold={'role': role, 'status':'HOLD_SOURCE_INTEGRITY', 'canDeploy':False,'verifiedHost':False}
    try:
        if role not in EXPECTED: return hold
        conf=EXPECTED[role]
        source=Path(path)
        if not source.is_file() or source.stat().st_size>25_000_000: return hold
        blob=source.read_bytes()
        zip_sha=sha(blob)
        if expected_zip_sha256 is not None and expected_zip_sha256!=zip_sha: return hold
        with zipfile.ZipFile(source) as z:
            files=z.infolist()
            if len(files)>100 or len(files)<conf['count']+1: return hold
            listed=[x.filename for x in files]
            if len(set(listed))!=len(listed) or conf['manifest'] not in listed: return hold
            for item in files:
                pp=PurePosixPath(item.filename)
                if pp.is_absolute() or '..' in pp.parts or '\\' in item.filename or item.is_dir(): return hold
                if stat.S_IFMT(item.external_attr >> 16) == stat.S_IFLNK: return hold
                if item.file_size>5_000_000: return hold
            manifest_bytes=z.read(conf['manifest'])
            if len(manifest_bytes)>200_000: return hold
            m=json.loads(manifest_bytes)
            if role=='MICA':
                entries=m.get('files')
                if not isinstance(entries,dict): return hold
                pairs=entries.items()
            else:
                entries=m.get('sourceFiles')
                if not isinstance(entries,list): return hold
                pairs=[(f['path'],f['sha256']) for f in entries]
            pairs=list(pairs)
            if len(pairs)!=conf['count'] or len(set(k for k,v in pairs))!=len(pairs): return hold
            ancillary={'README.md'} if role=='MICA' and 'README.md' in listed else set()
            if set(listed)-{conf['manifest']}-ancillary!=set(k for k,v in pairs): return hold
            for filename, digest in pairs:
                if not isinstance(filename,str) or not isinstance(digest,str) or len(digest)!=64: return hold
                if sha(z.read(filename))!=digest: return hold
            return {'role':role,'status':'EXACT_SUBSET_BYTES_VERIFIED','filesVerified':len(pairs),
               'manifestSha256':sha(manifest_bytes),'archiveSha256':zip_sha,'ancillaryUnpinned':sorted(ancillary),
               'canDeploy':False,'verifiedHost':False,'actualMacroturns':0,
               'missingOriginalWeightsOrHostBindings':True}
    except (OSError,ValueError,KeyError,zipfile.BadZipFile,zipfile.LargeZipFile,UnicodeDecodeError,TypeError,AssertionError):
        return hold

if __name__=='__main__':
    import sys
    if len(sys.argv) not in (3,4): raise SystemExit('usage: python verify_source_subsets.py MICA|OMEGA file.zip [expected_sha256]')
    print(json.dumps(verify_source_zip(sys.argv[2],sys.argv[1],expected_zip_sha256=sys.argv[3] if len(sys.argv)==4 else None),sort_keys=True))
