"""Offline Atlas ONE demo: actual Atlas v0.2 + supplied public Noosphere adapter."""
import importlib.util,json,sys,argparse,hashlib,re
from pathlib import Path
from .coordinates import HSN
from .docket import load_docket
from .circuit import unified_review

def load_noosphere(path,expected_git_blob):
    # Import of Python executes code. Caller must name the audited immutable blob.
    if type(expected_git_blob) is not str or re.fullmatch(r'[0-9a-f]{40}',expected_git_blob) is None:
        raise RuntimeError('noosphere_git_blob_required')
    if expected_git_blob != '70dc375cb7d6ed931b40c3b2b82642d5312cdcb3':
        raise RuntimeError('noosphere_blob_not_on_audited_allowlist')
    data=path.read_bytes()
    actual=hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest()
    if actual!=expected_git_blob:
        raise RuntimeError('noosphere_git_blob_mismatch')
    spec=importlib.util.spec_from_file_location('pinned_noosphere_public',path)
    if spec is None or spec.loader is None:raise RuntimeError('invalid_public_module')
    m=importlib.util.module_from_spec(spec);sys.modules[spec.name]=m;spec.loader.exec_module(m)
    return m

def main(argv=None):
    cli=argparse.ArgumentParser()
    cli.add_argument('--noosphere',type=Path,required=True)
    cli.add_argument('--docket',type=Path,required=True)
    cli.add_argument('--noosphere-git-blob',required=True)
    cli.add_argument('--output',type=Path,required=True)
    args=cli.parse_args(argv)
    from atlas_one_circuit import run_circuit,verify_receipt
    import atlas_one_circuit as circuit
    from atlas_fabric import load_json_strict
    root=Path(__file__).resolve().parents[2]
    fabric=load_json_strict(root/'interop/atlas_project_manifest.v0.1.json')
    packet=load_json_strict(root/'interop/atlas_collision_h01.work.v0.2.json')
    docket=load_docket(json.loads(args.docket.read_text('utf-8-sig')))
    x=unified_review(fabric,packet,atlas_circuit=circuit,
                     noosphere=load_noosphere(args.noosphere,args.noosphere_git_blob),backlog=docket,
                     host_snapshot={'revision':'SOURCE_ONLY_NO_LIVE_ATTESTATION'},
                     ci_run={'conclusion':'failure','steps':[]})
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(x,sort_keys=True,indent=2)+'\n')
    print(json.dumps({'status':'LOCAL_SOURCE_ONLY_PASSED','backlog':x['backlog']['observed_total'],
                      'events':x['atlas_events'],'bridge':x['noosphere_ingest_state'],
                      'host':x['host']['status'],'receipt_sha256':x['local_receipt_sha256']}))
    return 0

if __name__=='__main__':raise SystemExit(main())
