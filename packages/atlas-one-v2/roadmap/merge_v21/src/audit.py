"""Independent offline audit of generated roadmap manifests and SHA linked 144 Spheres."""
import json, pathlib, importlib.util, sys, collections, hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('atlas_compiler',ROOT/'src/compiler.py')
c=importlib.util.module_from_spec(spec);sys.modules[spec.name]=c;spec.loader.exec_module(c)

def audit(folder):
 f=pathlib.Path(folder);root=json.loads((f/'ROADMAP_ROOT.json').read_text());h=json.loads((f/'HOUSE_MODULES_12.json').read_text())
 s=[json.loads(x) for x in (f/'SPHERE_PATHWAYS_144.jsonl').read_text().splitlines()]
 n=[json.loads(x) for x in (f/'NODE_SEEDS_1728.jsonl').read_text().splitlines()]
 m=[json.loads(x) for x in (f/'METRICS_1728.jsonl').read_text().splitlines()]
 manifest=json.loads((f/'MANIFEST_SHA256.json').read_text())
 errors=[]
 def check(ok,msg):
  if not ok:errors.append(msg)
 check((len(h),len(s),len(n),len(m))==(12,144,1728,1728),'WRONG_CARDINALITY')
 check(len(set(x['coordinate'] for x in n))==1728,'DUPLICATE_HSN')
 check(len(set(x['metricId'] for x in n))==1728,'DUPLICATE_NODE_METRIC')
 check(root.get('verifiedNodeGains')==0 and root.get('experimentalMetricsMeasured')==0,'FALSE_GAINS')
 check(root['sourceSHA256']==manifest['ariadneSha256'],'SOURCE_PIN_MISMATCH')
 check(root['crosswalkSHA256']==manifest['openalexSha256'],'CROSSWALK_PIN_MISMATCH')
 check(root['roadmapSHA256']==c.sha(c.canonical({k:v for k,v in root.items() if k!='roadmapSHA256'})),'ROOT_DIGEST_INVALID')
 for node in n:
  check(node['specSHA256']==c.sha(c.canonical({k:v for k,v in node.items() if k!='specSHA256'})),f'NODE_TAMPER_{node["coordinate"]}')
  check(node['baseline']=='UNMEASURED' and node['gainStatus']=='NOT_EARNED',f'FALSE_NODE_GAIN_{node["coordinate"]}')
  check(node['protectedModeImported'] is False and node['hostAction']=='NONE',f'FALSE_RIGHTS_{node["coordinate"]}')
  check(node['openalex']['primaryCount']+node['openalex']['alternateCount']==node['openalex']['totalCount'],f'TOPIC_DENOMINATOR_{node["coordinate"]}')
  check(node['openalex']['reviewStatus']=='UNREVIEWED',f'FALSE_TOPIC_APPROVAL_{node["coordinate"]}')
 previous='0'*64
 for idx,sp in enumerate(s):
  check(sp['receiptPrevious']==previous,f'PREVIOUS_SPHERE_LINK_{idx}')
  seeds=[x['specSHA256'] for x in n[12*idx:12*(idx+1)]]
  expected=c.sha(c.canonical({'id':sp['id'],'nodeSeeds':seeds,'previous':previous,'source':root['sourceSHA256']}))
  check(sp['receiptSHA256']==expected,f'SPHERE_RECEIPT_{sp["id"]}')
  previous=sp['receiptSHA256']
 check(root['finalSphereReceipt']==previous,'FINAL_SPHERE_RECEIPT')
 for name,digest in manifest['artifacts'].items():
  check((f/name).exists() and c.sha((f/name).read_bytes())==digest,f'ARTIFACT_HASH_{name}')
 for met in m:
  check(met['baselineValue'] is None and met['candidateValue'] is None and met['achievementStatus']=='NOT_EARNED',f'FAKE_METRIC_{met["id"]}')
 covered_domain=sum(x['openalex']['totalCount']>0 for x in n if x['role']=='DOMAIN_SPECIALIZATION')
 alt_only=sum(x['openalex']['primaryCount']==0 and x['openalex']['alternateCount']>0 for x in n if x['role']=='DOMAIN_SPECIALIZATION')
 total=sum(x['openalex']['totalCount'] for x in n)
 check(total==22580 if manifest['sourceMode']=='original' else total==manifest['historicalTopicStats']['candidateEdges'],'TOPIC_EDGE_TOTAL')
 return {'schema':'atlas.roadmap.independent-audit/v2','status':'PASS' if not errors else 'FAIL','errors':errors[:25],
     'actualCounts':{'houses':len(h),'spheres':len(s),'nodes':len(n),'metrics':len(m),'topicCandidateEdges':total,
                     'domainNodesWithTopics':covered_domain,'domainNodesWithoutTopics':1008-covered_domain,
                     'domainNodesAlternateOnly':alt_only,'earnedMetrics':sum(x['achievementStatus']=='EARNED' for x in m)},
     'rootDigest':root['roadmapSHA256'],'finalSphereReceipt':previous,'noHostClaim':True}
if __name__=='__main__':
 import argparse
 ap=argparse.ArgumentParser();ap.add_argument('--root',required=True);args=ap.parse_args();r=audit(args.root);print(json.dumps(r,indent=2));
 if r['status']!='PASS':raise SystemExit(1)
