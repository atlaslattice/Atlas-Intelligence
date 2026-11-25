"""Only synthetic source-family metrics; no encoder or provider invocation."""
import json, pathlib, sys
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from atlas_neural_unified.quality import review_quality_first,synthetic_quality_cohort
for label, packet in [('better_quality_slower',synthetic_quality_cohort()),('better_quality_faster',synthetic_quality_cohort(slower=False)),('no_quality_gain',synthetic_quality_cohort(improvement=False))]:
    result=review_quality_first(packet)
    print(json.dumps({'fixture':label,'status':result['status'],'ndcg_gain':result.get('ndcgGain'),'candidateSlowerP95':result.get('candidateSlowerP95'),'canDeploy':result['canDeploy']},sort_keys=True))
