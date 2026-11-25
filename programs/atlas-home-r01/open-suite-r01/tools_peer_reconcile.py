"""Reconcile source-only peer catalog IDs; no code, packages or accounts transferred."""
from pathlib import Path
from zipfile import ZipFile
import hashlib,json,sys
R=Path(__file__).resolve().parent
REFERENCE_SHA='2bb1c2183ec55cb3e311a6dba4cae4c64e14d355096330e0109370c73fd6bebb'
REFERENCE_LIB='libfile_fa2bd4cda6908191b77272eab0640078'
def reconcile(peer_zip, strict_digest=True):
 peer_zip=Path(peer_zip);data=peer_zip.read_bytes();digest=hashlib.sha256(data).hexdigest()
 if strict_digest and digest!=REFERENCE_SHA:raise ValueError('PEER_SOURCE_HASH_MISMATCH')
 with ZipFile(peer_zip) as z:
  peer=json.loads(z.read('CATALOG.json'))
 ours=json.loads((R/'data/catalog.json').read_text())
 assert ours['schema']=='atlas.os.open-suite.catalog/v1'
 source={x['id']:x for x in ours['items']}
 if len(source)!=len(ours['items']):raise ValueError('LOCAL_DUPLICATE')
 rows=[];seen=set()
 for app in peer['applications']:
  pid=app.get('id');name=app.get('name');source_links=app.get('sources')
  if not isinstance(pid,str) or pid in seen or not pid or not isinstance(name,str) or not isinstance(source_links,list):raise ValueError('PEER_UNTRUSTED_ID_OR_SCHEMA')
  seen.add(pid)
  if pid in source:
   target=pid;disposition='EXACT_ID_ALREADY_PRESENT'
  elif f'artcraft-{pid}' in source and source[f'artcraft-{pid}']['name']==name:
   target=f'artcraft-{pid}';disposition='ARTCRAFT_ALIAS_NO_DUPLICATE_INSTALL'
  else:target=None;disposition='STAGED_PEER_ONLY_NOT_CURATED'
  rows.append(dict(peer_id=pid,atlas_id=target,name=name,disposition=disposition,source_links=[u for u in source_links if isinstance(u,str) and u.startswith('https://')][:3],preview_only=(target is not None and source[target]['slot']=='PREVIEW_ONLY'),can_install=False,license_approved=False,source_pinned=False,host_auth=False,semantic_map=None))
 counts={kind:sum(r['disposition']==kind for r in rows)for kind in {'EXACT_ID_ALREADY_PRESENT','ARTCRAFT_ALIAS_NO_DUPLICATE_INSTALL','STAGED_PEER_ONLY_NOT_CURATED'}}
 assert sorted(counts.values())==[17,19,19],counts
 unique=len(source)+counts['STAGED_PEER_ONLY_NOT_CURATED']
 return {'schema':'atlas.os.open-suite.peer-crosswalk/v1','status':'LOCAL_SOURCE_METADATA_RECONCILED_NOT_INSTALLED','base_catalog_apps':len(source),'peer_catalog_apps':len(rows),'semantic_unique_projects':unique,'counts':counts,'peer_provenance':{'reference_libfile':REFERENCE_LIB,'zip_sha256':digest,'foundry_source_seq':159,'peer_readback_verified':True},'records':rows,'authority_effect':'NONE','release_promotion':False,'source_code_transferred':False,'identities_or_private_modes_transferred':False}
if __name__=='__main__':
 peer=sys.argv[1] if len(sys.argv)>1 else None
 if peer is None: raise SystemExit('Supply exact owner-authorized Open Desktop 55 ZIP as argument')
 out=reconcile(peer)
 (R/'data/peer_desktop55_crosswalk.json').write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
 print('peer crosswalk',out['counts'],'unique',out['semantic_unique_projects'])
