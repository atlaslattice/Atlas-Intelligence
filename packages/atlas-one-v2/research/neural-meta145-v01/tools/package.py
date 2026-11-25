"""Reproducible public/private archive builder with independent member-hash checks."""
from __future__ import annotations
import json, hashlib, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PUBLIC=[
 'README.md','docs/INTEGRATION_CONTRACT_PUBLIC.md','docs/STRATEGY_PROTOCOL.md','docs/ARCHITECTURE.mmd',
 'src/__init__.py','src/evidence.py','src/simulate.py','src/audit.py','src/viewer.py',
 'js/pretrained-evidence-sidecar.mjs','js/pretrained-evidence-sidecar.test.mjs',
 'tests/test_evidence.py','tests/browser_smoke.py','examples/synthetic_demo.py','tools/package.py',
 'output/test_python_normal.txt','output/test_python_optimized.txt','output/test_node.txt','output/synthetic_demo_receipt.json',
]
PRIVATE=PUBLIC+[
 'private/ariadne-v07-exact.json','private/MICA_PREDECESSOR_RECEIPT.json','private/MICA_INTEGRATION_PRIVATE.md',
 'output/meta145.json','output/houses_12.json','output/sphere_144.json','output/strategies_1728.jsonl',
 'output/INDEPENDENT_AUDIT.json','output/audit_stdout.json','output/simulation_stdout.json',
 'output/NEURAL_META145_STRATEGY_OBSERVATORY.html','output/NEURAL_META145_DESKTOP.png','output/NEURAL_META145_MOBILE.png',
 'output/BROWSER_RECEIPT.json','output/browser_stdout.json',
]

def create(path,files,visibility):
    filehash={k:hashlib.sha256((ROOT/k).read_bytes()).hexdigest() for k in files}
    manifest={'schema':'atlas.neural.meta145.package/v1','classification':visibility,
              'fileCount':len(files),'files':filehash,'sourcePrivateDataInPublic':False if visibility=='PUBLIC_SOURCE_ONLY' else None,
              'BGEModelWeightsIncluded':False,'onceConsumedMicaSilverPanelIncluded':False,
              'runStatus':'LOCAL_SIMULATED_NOT_HOSTED','trainedNewModel':False}
    with zipfile.ZipFile(path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=7) as z:
        for n in sorted(files):z.write(ROOT/n,arcname=n)
        z.writestr('PACKAGE_MANIFEST.json',json.dumps(manifest,indent=2,sort_keys=True))
    # Independently open archive and verify every exact member (hashes, duplicates, paths).
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None
        assert len(z.namelist())==len(set(z.namelist()))
        stored=json.loads(z.read('PACKAGE_MANIFEST.json'))
        for name,expected in stored['files'].items():
            assert '..' not in name and not name.startswith('/')
            assert hashlib.sha256(z.read(name)).hexdigest()==expected
    return {'path':str(path),'visibility':visibility,'fileCount':len(files),
            'zipSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'memberHashesVerified':True,
            'zipBytes':path.stat().st_size}

if __name__=='__main__':
    out=ROOT/'output';out.mkdir(exist_ok=True)
    o=[create(ROOT.parent/'ATLAS_NEURAL_META145_EVIDENCE_PUBLIC_SOURCE.zip',PUBLIC,'PUBLIC_SOURCE_ONLY'),
       create(ROOT.parent/'ATLAS_NEURAL_META145_EVIDENCE_COMPLETE_PRIVATE.zip',PRIVATE,'OWNER_PRIVATE')]
    (out/'PACKAGE_RECEIPT.json').write_text(json.dumps(o,indent=2))
    print(json.dumps(o,indent=2))
