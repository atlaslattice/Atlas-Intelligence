from pathlib import Path
import json,hashlib,re,collections
R=Path(__file__).resolve().parents[1]
raw=(R/'catalog/apps_catalog.json').read_bytes(); d=json.loads(raw)
assert len(d['apps'])==37
assert len({a['id'] for a in d['apps']})==37
assert all(a['source_revision'] is None or re.fullmatch('[0-9a-f]{40}',a['source_revision']) for a in d['apps'])
assert sum(a['source_revision'] is not None for a in d['apps'])==36
assert sum(a['family']=='ArtCraft' for a in d['apps'])==18
assert all(a['package_sha256'] is None and not a['package_signature_verified'] for a in d['apps'])
assert all(a['release_status']=='NOT_INSTALLED' and not a['app_origin_federation_verified'] for a in d['apps'])
assert d['installedApps']==0 and not d['ratified'] and not d['defaultTelemetry'] and not d['automaticVpn']
assert hashlib.sha256(raw).hexdigest()==(R/'receipts/catalog_sha256.txt').read_text().split()[0]
for mode in ('gcc','clang','sanitize'):
 rows=[json.loads(x) for x in (R/f'receipts/100-{mode}.jsonl').read_text().splitlines()]
 assert len(rows)==100 and [x['case'] for x in rows]==list(range(100))
 assert all(x['effects']==0 and x['app'] in {a['id'] for a in d['apps']} for x in rows)
 assert all(x['action']==x['case']%7 for x in rows)
 assert [x['app'] for x in rows]==[d['apps'][(i*7)%37]['id'] for i in range(100)]
 if mode=='gcc':base=rows
 else:assert rows==base
assert len({(x['case'],x['app'],x['action']) for x in base})==100

# Independently authored Python oracle for each native C planning result.
by_id={a['id']:a for a in d['apps']}
for row in base:
 i=row['case'];a=by_id[row['app']];action=i%7
 exp_epoch=77;now_epoch=78 if i%17==1 else 77
 return_current=(i%19)!=2
 user_present=True;user_confirmed=(i%13)!=3
 experimental_opt_in=(i%11)!=4
 license_review=(i%31)==8
 private=(i%37)==9
 extension_grant=(i%41)!=10
 provider_supported=(i%23)!=6
 status=None
 if action==0:status=1
 elif private:status=12
 elif now_epoch!=exp_epoch or not return_current:status=8
 elif not a['source_revision']:status=3
 elif a['license_review']!='SOURCE_METADATA_ONLY' and not license_review:status=4
 elif a['maturity']=='experimental' and not experimental_opt_in:status=5
 elif not user_present or not user_confirmed:status=2
 elif action==1:status=10
 elif action==6:status=10
 elif action==2:
  if a['account']=='none':status=11
  elif not provider_supported:status=9
  else:status=10
 elif action==3:
  if a['kind']!='vpn_client':status=13
  else:status=10
 elif action==4:
  if a['kind']!='browser_extension' and a['id']!='firefox':status=13
  elif not extension_grant:status=2
  else:status=10
 elif action==5:status=10
 else:raise AssertionError(action)
 assert row['status']==status,(i,a['id'],row['status'],status)
 assert row['epoch']==now_epoch,(i,row['epoch'],now_epoch)

print('ATLAS_CATALOG_AUDIT_PASS apps=37 pinned=36 ArtCraft=18 localCases=100 modes=3 actualInstallations=0')
