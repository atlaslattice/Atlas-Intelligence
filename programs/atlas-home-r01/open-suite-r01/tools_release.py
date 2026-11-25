"""Reproducible source-only release. Excludes binaries, screenshots, caches and secrets."""
from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parent
out=Path('/mnt/data/ATLAS_OS_OPEN_SUITE_R02_20261125.zip')
paths=[]
for rel in ['README.md','Makefile','tools_seed.py','tools_build_ui.py','tools_review_matrix.py','tools_release.py','tools_peer_reconcile.py']:
 paths.append(rel)
for folder in ['src','data','docs','tests','web']:
 for p in sorted((root/folder).rglob('*')):
  if p.is_file() and '__pycache__' not in str(p) and p.suffix not in ('.pyc','.o'):
   paths.append(p.relative_to(root).as_posix())
paths=sorted(set(paths));manifest={p:{'sha256':hashlib.sha256((root/p).read_bytes()).hexdigest(),'bytes':(root/p).stat().st_size}for p in paths}
record={'schema':'atlas.os.open-suite.release-manifest/v1','source_only':True,'predecessor_elf_sha256':'06e68681508a86dd4cde4f438f0ce02040bac7d9a68989bfef850fc8fd8fef29','source_count':len(paths),'files':manifest,'curated_app_count':44,'artcraft_previews':17,'staged_peer_app_count':19,'reconciled_unique_source_candidates':63,'proposed_review_cells':144,'hosted':False,'booted':False,'installed_apps':0,'accounts_created':0,'vpn_active':False,'third_party_bytes_vendored':0}
(root/'evidence/SOURCE_MANIFEST.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in paths+['evidence/SOURCE_MANIFEST.json']:
  info=zipfile.ZipInfo('atlas_os_open_suite_r02/'+p, date_time=(2026,11,25,0,0,0)); info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=(0o644<<16)
  z.writestr(info,(root/p).read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
print(json.dumps({'zip':str(out),'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'manifest_pins':len(paths),'members':len(paths)+1,'bytes':out.stat().st_size}))
