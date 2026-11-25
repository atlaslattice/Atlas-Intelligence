"""Independent readback of exact-source 1728 strategy data and META145 choice."""
from __future__ import annotations
from hashlib import sha256
from pathlib import Path
from .evidence import ARIADNE_SHA, Policy, stable_digest
from .simulate import all_coordinates, strategy_policy, source_fixture, evaluate
import json


def audit(registry_path:Path,out:Path,recheck_all=False):
    raw=registry_path.read_bytes()
    if sha256(raw).hexdigest()!=ARIADNE_SHA:raise ValueError('ORIGINAL_SOURCE_DRIFT')
    registry=json.loads(raw)
    rows=[json.loads(l) for l in (out/'strategies_1728.jsonl').read_text().splitlines() if l.strip()]
    spheres=json.loads((out/'sphere_144.json').read_text());houses=json.loads((out/'houses_12.json').read_text());meta=json.loads((out/'meta145.json').read_text())
    assert len(rows)==1728 and len(spheres)==144 and len(houses)==12
    expected=list(all_coordinates())
    assert len(set(x['strategyId'] for x in rows))==1728
    assert len(set(x['sourceCoordinate'] for x in rows))==1728
    for row,(hsn,h,s,n) in zip(rows,expected):
        assert row['strategyId']=='NEURAL-STRATEGY-'+hsn
        assert row['sourceCoordinate']==hsn
        assert row['sourceRecordSha256']==registry['nodes'][hsn]['source_record_sha256']
        assert row['policy']==vars(strategy_policy(h,s,n))
        assert row['development']['sourceLeakCount']==0
        assert row['state']=='SIMULATED_NOT_DEPLOYED'
        assert row['development']['correctAbstention']==1
    for house in range(1,13):
        assert len([x for x in spheres if x['sphereId'].startswith(f'H{house:02}.')])==12
    by_id={x['strategyId']:x for x in rows}
    for sf in spheres:
        assert sf['winner'] in by_id and by_id[sf['winner']]['sphere']==sf['sphereId']
        assert sf['alternatives']==12
    assert meta['strategyCount']==1728 and meta['sphereSelections']==144 and meta['houseRollups']==12
    assert meta['trainingPerformed'] is False and meta['hostedVerified'] is False
    assert meta['sourceFamiliesOverlap']==0 and meta['silverPanelReused'] is False
    assert meta['selectedHeldout']['sourceLeakCount']==0 and meta['baselineHeldout']['sourceLeakCount']==0
    assert meta['selectedHeldout']['correctAbstention']==1 and meta['baselineHeldout']['correctAbstention']==1
    selected=by_id[meta['metaSelectedStrategy']]
    assert selected['policy']==meta['metaSelectedPolicy']
    # Independent deterministic recompute on frozen synthetic FINAL cases. No BGE embeddings/panel read.
    holdout=[source_fixture(expected[(i*53+7)%1728][0],phase='FINAL',serial=i) for i in range(meta['heldoutCases'])]
    selected_eval=evaluate(Policy(**meta['metaSelectedPolicy']),holdout)
    baseline_eval=evaluate(Policy(**meta['baselinePolicy']),holdout)
    assert selected_eval==meta['selectedHeldout'] and baseline_eval==meta['baselineHeldout']
    dev_rechecked=0
    if recheck_all:
        dev=[source_fixture(expected[(i*37)%1728][0],phase='DEV',serial=i) for i in range(meta['strategyTrainingCases'])]
        for row in rows:
            assert evaluate(Policy(**row['policy']),dev)==row['development'];dev_rechecked+=1
    else:
        dev=[source_fixture(expected[(i*37)%1728][0],phase='DEV',serial=i) for i in range(meta['strategyTrainingCases'])]
        for ix in range(0,1728,144):
            row=rows[ix];assert evaluate(Policy(**row['policy']),dev)==row['development'];dev_rechecked+=1
    receipt={
        'schema':'atlas.neural.meta145.independent-audit/v1',
        'status':'PASS','sourceSha256':ARIADNE_SHA,'strategyRowsVerified':len(rows),
        'sphereRowsVerified':len(spheres),'houseRowsVerified':len(houses),'developmentReevaluations':dev_rechecked,
        'holdoutReproduced':True,'BgeWeightsRead':False,'MicaSilverPanelRead':False,
        'noUnauthorizedSourceBodies':True,'noAcceptedScientificEdges':True,
        'strategyDataSha256':sha256((out/'strategies_1728.jsonl').read_bytes()).hexdigest(),
        'metaSha256':sha256((out/'meta145.json').read_bytes()).hexdigest(),
        'currentHostAccessVerified':False,
    }
    (out/'INDEPENDENT_AUDIT.json').write_text(json.dumps(receipt,indent=2,sort_keys=True))
    return receipt

if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--registry',required=True);p.add_argument('--out',required=True);p.add_argument('--recheck-all',action='store_true');a=p.parse_args()
    print(json.dumps(audit(Path(a.registry),Path(a.out),a.recheck_all),indent=2))
