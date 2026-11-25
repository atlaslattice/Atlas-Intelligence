"""Public-only miniature fixture: identical 12^3 shape, no original Ariadne data."""
from pathlib import Path
import json, sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from src.simulate import run, all_coordinates
from src.evidence import stable_digest

def make_registry():
    houses={f'H{h:02}':{'id':f'H{h:02}','name':f'SYNTHETIC HOUSE {h:02}'} for h in range(1,13)}
    spheres={f'H{h:02}.S{s:02}':{'id':f'H{h:02}.S{s:02}','name':f'SYNTHETIC SPHERE {h:02}:{s:02}'} for h in range(1,13) for s in range(1,13)}
    nodes={}
    for hsn,h,s,n in all_coordinates():
        nodes[hsn]={'id':hsn,'name':f'SYNTHETIC Node {h}:{s}:{n}','kind':'DOMAIN_SPECIALIZATION' if s<=7 else 'EPISTEMIC_META',
                    'parent':f'H{h:02}.S{s:02}', 'source_record_sha256':stable_digest(['SYNTHETIC_NODE',hsn])}
    return {'houses':houses,'spheres':spheres,'nodes':nodes}

if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--out',default='/tmp/atlas-neural-meta145-synthetic');a=p.parse_args()
    report=run(make_registry(),Path(a.out),dev_count=12,holdout_count=12)
    print(json.dumps({'status':'SYNTHETIC_PUBLIC_ONLY','strategyCount':report['strategyCount'],
          'sphereSelections':report['sphereSelections'],'houseRollups':report['houseRollups'],
          'final':report['selectedHeldout'],'noMicaWeights':True,'noOriginalRegistry':True},indent=2))
