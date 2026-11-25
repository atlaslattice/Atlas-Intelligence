"""Private model transport for the public-source Atlas local acceptance harness.

Requires external authorized R06 source and immutable owner 0.3 workspace via host env.
Never packages weights, text corpus or private source data in the acceptance ZIP.
"""
from __future__ import annotations
import json,hashlib,sys,argparse
import numpy as np
from atlas_real.inference import RealAtlas, REGISTRY_PIN, HEAD_STATE_PIN


def digest_bytes(v):return hashlib.sha256(v).hexdigest()

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--workspace',required=True)
    a=p.parse_args()
    engine=RealAtlas(a.workspace)
    ready={'event':'READY','schema':'atlas.local.real-worker/v1','registrySha256':REGISTRY_PIN,
           'headStateSha256':HEAD_STATE_PIN,'modelSha256':engine.model_sha256,
           'workerSource':'PINNED_R06_PRIVATE_EXTERNAL','networkCalls':0}
    print(json.dumps(ready,separators=(',',':')),flush=True)
    for line in sys.stdin:
        try:
            request=json.loads(line)
            if type(request) is not dict or set(request)!={'query','requestId','k'}:raise ValueError('BAD_FIELDS')
            q=request['query'];k=request['k'];rid=request['requestId']
            if type(q) is not str or not q.strip() or len(q)>1024 or type(k) is not int or k<1 or k>48 or type(rid) is not str or len(rid)>100:raise ValueError('BAD_VALUES')
            base=engine.encode(q,kind='query')
            if base.shape!=(1,384):raise ValueError('EMBEDDING_SHAPE')
            selected=engine.head.encode(base)
            vector=selected[0].astype(np.float64)
            scores=(engine.nodes.astype(np.float64)@vector)
            if scores.shape!=(1728,) or not np.all(np.isfinite(scores)):raise ValueError('BAD_SCORES')
            if not np.all(np.isfinite(vector)):raise ValueError('BAD_VECTOR')
            order=sorted(range(1728),key=lambda i:(-float(scores[i]),i))[:k]
            result={'event':'FRAME','requestId':rid,'querySha256':digest_bytes(q.encode('utf8')),
                    'registrySha256':REGISTRY_PIN,'headStateSha256':HEAD_STATE_PIN,'modelSha256':engine.model_sha256,
                    'embedding':vector.tolist(),'scores':scores.tolist(),
                    'topIds':[f'H{i//144+1:02d}.S{(i//12)%12+1:02d}.N{i%12+1:02d}' for i in order],
                    'encoderInvocations':1,'headInvocations':1,'lexicalFallback':False,'weightsUpdated':False}
            print(json.dumps(result,separators=(',',':'),allow_nan=False),flush=True)
        except Exception as e:
            print(json.dumps({'event':'HOLD','reason':type(e).__name__+':'+str(e)[:80]},separators=(',',':')),flush=True)

if __name__=='__main__':main()
