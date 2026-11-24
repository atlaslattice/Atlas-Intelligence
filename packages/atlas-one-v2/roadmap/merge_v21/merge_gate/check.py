#!/usr/bin/env python3
"""Source-only merge compatibility checker. Never merges, posts, grants rights or counts gains.

Requires explicit existing original-source artifacts. Remote branch and CI facts are
operator-observed snapshots, not signed or automatically verified by this script.
"""
from __future__ import annotations
import argparse,hashlib,json,pathlib,collections

HOLD='HOLD_REQUIRES_REVIEW'
PASS='PASS_LOCAL_SOURCE_CONTRACT'
ARIADNE='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
OPENALEX='a306c7306a79754b033e9f8c41c0de5ff5176b4544a6a80b5c740e2f8d2cc903'
EXCELLENCE='47084b895a6317db16275a92c3878a340d31af15fb9ab479db7101953c18e49c'
CAPABILITIES=['MEASUREMENT_AND_UNITS','WATER_FOOD_STOCK_FLOW','ECOLOGICAL_DEPENDENCIES','HEALTH_EVIDENCE_SAFETY','EDUCATION_KNOWLEDGE_PROVENANCE','SECURITY_AND_RESILIENCE','ECONOMICS_GOVERNANCE_BUDGET','CULTURE_CREATIVE_SANDBOX','EPISTEMIC_DISSENT','COMMUNITY_AND_SOVEREIGNTY','RIGHTS_AND_RETURN_FENCE','SPACE_SYSTEMS_VERIFICATION']

def read_jsonl(path):
    records=[json.loads(line) for line in pathlib.Path(path).read_text(encoding='utf8').splitlines() if line.strip()]
    return records

def read_json(path):return json.loads(pathlib.Path(path).read_text(encoding='utf8'))
def sha_bytes(path):return hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()
def require(cond,code):
    if not cond:raise ValueError(code)

def compare(roadmap,unified,source,topics):
    roadmap=pathlib.Path(roadmap);unified=pathlib.Path(unified)
    rroot=read_json(roadmap/'ROADMAP_ROOT.json');uroot=read_json(unified/'single_build_summary.json')
    require(sha_bytes(source)==ARIADNE,'SOURCE_BYTES_CHANGED');require(sha_bytes(topics)==OPENALEX,'TOPIC_BYTES_CHANGED')
    require(rroot['sourceSHA256']==uroot['source_sha256']==ARIADNE,'SOURCE_ROOT_MISMATCH')
    require(rroot['crosswalkSHA256']==uroot['historical_topic_sha256']==OPENALEX,'TOPIC_ROOT_MISMATCH')
    require(rroot['existingProgramPlanSHA256']==EXCELLENCE and rroot['existingProgramEquivalence']=='NONE_UNTIL_SEMANTIC_REVIEW','TASK_NAMESPACE_COLLISION')
    houses=read_json(roadmap/'HOUSE_MODULES_12.json');rpaths=read_jsonl(roadmap/'SPHERE_PATHWAYS_144.jsonl');rnodes=read_jsonl(roadmap/'NODE_SEEDS_1728.jsonl');rmet=read_jsonl(roadmap/'METRICS_1728.jsonl')
    uhouses=read_json(unified/'house_modules_12.json');upaths=read_jsonl(unified/'sphere_pathways_144.jsonl');unodes=read_jsonl(unified/'node_upgrades_1728.jsonl');umet=read_jsonl(unified/'node_metrics_1728.jsonl')
    require(tuple(map(len,[houses,rpaths,rnodes,rmet,uhouses,upaths,unodes,umet]))==(12,144,1728,1728,12,144,1728,1728),'CARDINALITY_COLLISION')
    require([x['existingAtlasOneCapability'] for x in houses]==CAPABILITIES,'NATIVE_HOUSE_CONTRACT_DRIFT')
    require(all(h['id']==f'H{i:02d}' for i,h in enumerate(houses,1)),'HOUSE_ORDER_DRIFT')
    sr={x['id']:x for x in rpaths};su={x['sphere']:x for x in upaths};nr={x['coordinate']:x for x in rnodes};nu={x['coordinate']:x for x in unodes};mr={x['node']:x for x in rmet};mu={x['coordinate']:x for x in umet}
    require(len(sr)==len(su)==144 and set(sr)==set(su),'SPHERE_SET_DRIFT')
    require(len(nr)==len(nu)==1728 and set(nr)==set(nu)==set(mr)==set(mu),'NODE_SET_DRIFT')
    require(all(sr[k]['role']==su[k]['role'] and len(sr[k]['nodeIds'])==12 and sr[k]['nodeIds']==su[k]['node_coordinates'] for k in sr),'SPHERE_ROLE_OR_CHILD_DRIFT')
    require(all(nr[k]['nodeName']==nu[k]['source_node_name'] and nr[k]['sourceRecordSHA256']==nu[k]['source_node_record_sha256'] and nr[k]['role']==nu[k]['source_role'] and nr[k]['house']==nu[k]['house'] and nr[k]['sphere']==nu[k]['sphere'] for k in nr),'SOURCE_NODE_IDENTITY_DRIFT')
    require(all(mr[k]['id']==f'METRIC.{k}' and mu[k]['metric_id']==f'EXACT_LOOKUP_COMPARISONS:{k}' for k in nr),'METRIC_NAMESPACE_COLLISION')
    require(all(mr[k]['baselineValue'] is None and mr[k]['candidateValue'] is None and mr[k]['achievementStatus']=='NOT_EARNED' for k in nr),'FALSE_GAIN_CLAIM')
    require(all(nr[k]['gainStatus']=='NOT_EARNED' and nr[k]['hostAction']=='NONE' and nr[k]['canonEffect']=='NONE' and nr[k]['protectedModeImported'] is False for k in nr),'UNAUTHORIZED_EFFECT_CLAIM')
    require(all(sr[k]['adapterStatus']=='NOT_IMPLEMENTED' and sr[k]['privateCreativeBodyExportAllowed'] is False for k in sr),'FALSE_ADAPTER_IMPLEMENTATION')
    require(all(sr[k]['nativeFunctionInvocation']=='OPTIONAL_LOCAL_IMAGINE_OPT_IN_ONLY;NO_WORK_AUTO_INVOKE' and sr[k]['rightsMode']=='WORK_METADATA_ONLY_NO_CREATIVE_BODY' for k in sr if k.startswith('H08.')),'H08_MODE_CONFLICT')
    require(all(sr[k]['rightsMode']=='WORK_SOURCE_METADATA_ONLY' for k in sr if not k.startswith('H08.')),'WORK_SCOPE_DRIFT')
    require(all(h['nativeInvocationMode']==('IMAGINE_LOCAL_OPT_IN_ONLY' if h['id']=='H08' else 'WORK') for h in houses),'HOUSE_NATIVE_MODE_DRIFT')
    require(uroot['rights_at_host_return_verified'] is False and uroot['host_deployed'] is False and uroot['genuinely_measured_civilizational_gains']==0,'GF9_HOST_GAIN_OVERCLAIM')
    require(uroot['unreviewed_topic_candidate_edges']==22580 and rroot['verifiedNodeGains']==0,'LINK_APPROVAL_OR_GAIN_OVERCLAIM')
    node_crosswalk=[]
    for k in sorted(nr):
        node_crosswalk.append({'coordinate':k,'house':nr[k]['house'],'sphere':nr[k]['sphere'],'originalRecordSHA256':nr[k]['sourceRecordSHA256'],
          'roadmapSpecSHA256':nr[k]['specSHA256'],'gf9NodeSHA256':nu[k]['digest_sha256'],
          'roadmapMetricId':mr[k]['id'],'gf9AlgorithmMetricId':mu[k]['metric_id'],
          'status':'SOURCE_COMPATIBLE_NOT_BEHAVIORALLY_INTEGRATED','earnedGain':False,'creativeBodyExported':False})
    summary={'schema':'atlas.merge-readiness/one-codebase-v2.1','sourceVerified':True,'roadmapSha256':rroot['roadmapSHA256'],
      'unifiedBuildSha256':uroot['build_digest_sha256'],'nodesMatched':len(nr),'spheresMatched':len(sr),'housesMatched':len(houses),
      'metricNamespacesSeparated':1728,'sourceBasedAdapterContracts':144,'adaptersActuallyImplementedInAtlasOne':0,
      'workOnlySphereMetadataPaths':132,'separateOptionalCreativeH08SpherePaths':12,'historicalUnreviewedTopicEdges':22580,
      'nodeBehaviorImprovementsIndependentlyValidated':0,'hostPermissionsVerified':False,'productionMergeReady':False,
      'checks':[{'gate':'SOURCE_AND_IDENTITY','state':PASS},{'gate':'HOUSE_CONTRACTS','state':PASS},
       {'gate':'SOURCE_SCOPE_H08','state':PASS},{'gate':'METRIC_NAMESPACE_NON_COLLISION','state':PASS},
       {'gate':'SOURCE_ONLY_LOCAL_TESTS','state':PASS},{'gate':'REAL_144_SPHERE_ADAPTERS','state':HOLD},
       {'gate':'INDEPENDENT_HOST_READ_RETURN','state':HOLD},{'gate':'PAIRED_CURRENT_HOST_BASELINE','state':HOLD},
       {'gate':'GITHUB_CI_AND_PROVIDER_CONFLICTS','state':HOLD},{'gate':'LIVE_7_PORTS_DEPLOYMENT','state':HOLD}]}
    return summary,node_crosswalk

def main():
    p=argparse.ArgumentParser();p.add_argument('--roadmap',required=True);p.add_argument('--unified',required=True);p.add_argument('--source',required=True);p.add_argument('--topics',required=True);p.add_argument('--out',required=True);a=p.parse_args()
    s,n=compare(a.roadmap,a.unified,a.source,a.topics);out=pathlib.Path(a.out);out.mkdir(parents=True,exist_ok=True)
    (out/'MERGE_READINESS.json').write_text(json.dumps(s,indent=2)+'\n')
    with (out/'NODE_MERGE_CROSSWALK_1728.jsonl').open('w') as f:
        for x in n:f.write(json.dumps(x,sort_keys=True,separators=(',',':'))+'\n')
    print(json.dumps(s,indent=2))

if __name__=='__main__':main()
