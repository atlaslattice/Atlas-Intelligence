from pathlib import Path
import json,hashlib,tempfile,sys,copy
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from reconcile_catalogue import reconcile
p=Path(__file__).resolve().parents[1]
a=json.load(open(p/'catalog/apps_catalog.json'))
peer={'scope':'SOURCE_LINKS_AND_PRODUCT_EVALUATION_ONLY','status':'PREPARED_CATALOG_NOT_INSTALLED',
      'records':[{'id':'libreoffice','upstream':'https://github.com/LibreOffice/core'},{'id':'krita','upstream':'https://invent.kde.org/graphics/krita'},{'id':'nextcloud','upstream':'https://github.com/nextcloud/server'}]}
raw=lambda x:json.dumps(x,sort_keys=True,separators=(',',':')).encode()
b=reconcile(a,peer,raw(a),raw(peer))
by={x['r04Id']:x for x in b['links']}
assert len(by)==37 and b['peerCandidateCount']==3
assert by['libreoffice']['status']=='REVIEW_EXACT_ID_AND_SOURCE_URL'
assert by['krita']['status']=='HOLD_SAME_ID_DIFFERENT_SOURCE_URL'
assert by['nextcloud-server']['status']=='REVIEW_SAME_SOURCE_URL_DIFFERENT_ID'
assert all(not x['adopted'] for x in b['links'])
assert b['acceptedAliases']==0 and not b['sharedAuthority']
try:
 bad=copy.deepcopy(peer);bad['records'].append(bad['records'][0]);reconcile(a,bad,raw(a),raw(bad));raise AssertionError('duplicate accepted')
except ValueError:pass
try:
 bad=copy.deepcopy(peer);bad['status']='DEPLOYED';reconcile(a,bad,raw(a),raw(bad));raise AssertionError('promoted peer accepted')
except ValueError:pass
try:
 bad=copy.deepcopy(peer);bad['records'][0]['upstream']='http://evil.invalid';reconcile(a,bad,raw(a),raw(bad));raise AssertionError('url accepted')
except ValueError:pass
print('ATLAS_PEER_CATALOGUE_CROSSWALK_PASS 37 source candidates,3 synthetic peers,3 adverse cases,0 adoptions')
