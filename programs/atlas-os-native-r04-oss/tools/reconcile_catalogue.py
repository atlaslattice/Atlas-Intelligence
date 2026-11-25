#!/usr/bin/env python3
"""Source-qualified non-promoting comparison of Atlas R04 metadata against an authorized peer catalog.

Do not use name normalisation to claim SAME_AS; identity and distribution clearance stay with the existing registry.
"""
from __future__ import annotations
import argparse,hashlib,json,pathlib,re,sys

def checked_index(rows,kind):
    if not isinstance(rows,list):raise ValueError(kind+':NOT_A_LIST')
    out={}
    for x in rows:
        if not isinstance(x,dict) or not isinstance(x.get('id'),str) or not re.fullmatch('[a-z0-9][a-z0-9._-]{1,79}',x['id']) or x['id'] in out:
            raise ValueError(kind+':DUPLICATE_OR_INVALID_APP_ID')
        url=x.get('upstream')
        if not isinstance(url,str) or not url.startswith('https://') or len(url)>240:raise ValueError(kind+':MISSING_OR_UNSAFE_UPSTREAM')
        out[x['id']]=x
    return out

def reconcile(ours,peer,ours_bytes:bytes,peer_bytes:bytes):
    if ours.get('schema')!='atlas.os.oss.catalog/v1' or ours.get('status')!='CANDIDATE_INVENTORY_NOT_INSTALLED' or ours.get('installedApps')!=0:raise ValueError('R04_SOURCE_STATUS_INVALID')
    if peer.get('scope')!='SOURCE_LINKS_AND_PRODUCT_EVALUATION_ONLY' or peer.get('status')!='PREPARED_CATALOG_NOT_INSTALLED':raise ValueError('PEER_SOURCE_STATUS_INVALID')
    src=checked_index(ours.get('apps'),'ATLAS_R04');dst=checked_index(peer.get('records'),'PEER_COMMONS')
    matched=[];by_url={}
    for key,b in dst.items():by_url.setdefault(b['upstream'],[]).append(key)
    for id,a in sorted(src.items()):
        b=dst.get(id)
        if b is None:
            aliases=by_url.get(a['upstream'],[])
            status='REVIEW_SAME_SOURCE_URL_DIFFERENT_ID' if aliases else 'UNMATCHED_R04_CANDIDATE'
            matched.append({'r04Id':id,'peerId':None,'peerCandidateIds':aliases,'status':status,'adopted':False,'sourceRevision':a.get('source_revision')})
        else:
            status='REVIEW_EXACT_ID_AND_SOURCE_URL' if b.get('upstream')==a['upstream'] else 'HOLD_SAME_ID_DIFFERENT_SOURCE_URL'
            matched.append({'r04Id':id,'peerId':id,'peerCandidateIds':[id],'status':status,'adopted':False,'sourceRevision':a.get('source_revision')})
    return {'schema':'atlas.os.oss.peer-crosswalk/v1','state':'SOURCE_REVIEW_ONLY','sourceDigestR04':hashlib.sha256(ours_bytes).hexdigest(),
            'sourceDigestPeer':hashlib.sha256(peer_bytes).hexdigest(),'r04CandidateCount':len(src),'peerCandidateCount':len(dst),
            'links':matched,'unmatchedPeerIds':sorted(set(dst)-{x['peerId'] for x in matched if x['peerId']}),
            'acceptedAliases':0,'verifiedInstallations':0,'sharedAuthority':False,'peerSourceModified':False}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('r04');ap.add_argument('peer');ap.add_argument('output');args=ap.parse_args()
    a=pathlib.Path(args.r04).read_bytes();b=pathlib.Path(args.peer).read_bytes()
    res=reconcile(json.loads(a),json.loads(b),a,b)
    pathlib.Path(args.output).write_text(json.dumps(res,sort_keys=True,indent=2)+'\n')
    counts={k:sum(x['status']==k for x in res['links']) for k in sorted(set(x['status'] for x in res['links']))}
    print('CROSSWALK_SOURCE_ONLY',counts,'unmatchedPeer',len(res['unmatchedPeerIds']))
if __name__=='__main__':main()
