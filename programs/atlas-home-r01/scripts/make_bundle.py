from pathlib import Path
import hashlib, json, zipfile
root=Path(__file__).resolve().parents[1]
source=[]
for p in root.rglob('*'):
 if not p.is_file():continue
 r=p.relative_to(root).as_posix()
 if r=='SOURCE_MANIFEST.json' or r.startswith('evidence/'):continue
 source.append((r,p.read_bytes()))
source.sort()
manifest={'schema':'atlas.home.source-manifest/v1','status':'LOCAL_TESTED_SOURCE_ONLY','ontology':{'sourceEdition':'ariadne-reader/v0.7','sourceSha256':'07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6','coordinateShape':[12,12,12],'nodeCount':1728,'domainNodeCount':1008,'methodNodeCount':720},'gitParent':{'repository':'atlaslattice/Atlas-Intelligence','pullRequest':75,'headBranch':'review/atlas-one-geometree-all-peers-r01-20261124','headSha':'e2b6e0912d00037539391fe179d97095a953d90f'},'peerPullRequest':74,'localPassNormal':107,'localPassJitless':107,'browserInteractionCases':22,'hostDeploymentVerified':False,'pins':[{'path':n,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()} for n,b in source]}
(root/'SOURCE_MANIFEST.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
source.append(('SOURCE_MANIFEST.json',(root/'SOURCE_MANIFEST.json').read_bytes()));source.sort()
out=Path('/mnt/data/ATLAS_HOME_ONE_GEOMETREE_R01_20261124.zip')
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for n,buf in source:
  zi=zipfile.ZipInfo('atlas_home_r01/'+n,date_time=(2026,11,24,0,0,0))
  zi.compress_type=zipfile.ZIP_DEFLATED
  zi.external_attr=0o644<<16
  z.writestr(zi,buf)
print(json.dumps({'path':str(out),'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'bytes':out.stat().st_size,'entries':len(source),'manifestPins':len(manifest['pins'])}))
