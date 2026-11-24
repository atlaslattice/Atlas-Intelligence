"""Independent standard-library verifier of the generated candidate build.
Source/payload validation is separate from the JS engine and does NOT attest host rights.
"""
from __future__ import annotations
import argparse, hashlib, json, re, sys
from pathlib import Path

SOURCE='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
COORD=re.compile(r'^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$')
SHA=re.compile(r'^[0-9a-f]{64}$')
def sha(data:bytes)->str:return hashlib.sha256(data).hexdigest()
def check(ok,reason):
 if not ok:raise ValueError(reason)
def load(path):return json.loads(Path(path).read_text('utf8'))
def jd(row):return sha(json.dumps(row,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False).encode('utf8'))

def verify(registry_path,out_path):
 root=Path(out_path);raw=Path(registry_path).read_bytes();check(sha(raw)==SOURCE,'WRONG_ARIADNE_SOURCE');source=json.loads(raw)
 check(len(source['nodes'])==1728 and len(source['spheres'])==144 and len(source['houses'])==12,'REGISTRY_COUNTS')
 manifest=load(root/'build_receipt.json');stored_release_digest=manifest.pop('releaseDigest');check(sha(json.dumps(manifest,ensure_ascii=False,separators=(',',':')).encode('utf8'))==stored_release_digest,'BUILD_MANIFEST_TAMPER');check(manifest['sourceAriadneSHA256']==SOURCE,'BAD_SOURCE_PIN')
 for name,digest in manifest['outputs'].items():
  check(sha((root/name).read_bytes())==digest,'OUTPUT_CHANGED_'+name)
 nodes=load(root/'nodes_1728.json');sp=load(root/'sphere_execution_144.json');modules=load(root/'functional_modules_12.json');build=load(root/'meta145_unified_build.json')
 check(len(nodes)==1728 and len(sp)==144 and len(modules)==12,'OUTPUT_COUNTS')
 hcnt={f'H{i:02d}':0 for i in range(1,13)};scnt={f'H{i:02d}.S{j:02d}':0 for i in range(1,13) for j in range(1,13)}
 for n,node in enumerate(nodes):
  c=f'H{n//144+1:02d}.S{(n%144)//12+1:02d}.N{n%12+1:02d}'
  check(node['coordinate']==c,'NODE_ORDER_'+str(n))
  orig=source['nodes'][c];check(node['name']==orig['name'] and node['definition']==orig['definition'] and node['includes']==orig['includes'] and node['excludes']==orig['excludes'],'ORIGINAL_TEXT_MISMATCH_'+c)
  check(node['kind']==orig['kind'] and node['sourceNodeSha256']==orig['source_record_sha256'],'NODE_DIGEST_MISMATCH_'+c)
  check(node['sourceEdition']=='Ariadne v0.7' and node['registrySha256']==SOURCE,'NODE_EDITION_CHANGED')
  check(not node['semanticAcceptance'] and node['authorityEffect']=='NONE','NODE_FALSE_PROMOTION')
  check(node['gf7Visual']==f'GF7.B{c[1:3]}.M{c[5:7]}.C{c[9:11]}' and node['glyphQ'].startswith('KG8Q:'+SOURCE[:12]),'GLYPH_POSITION_CHANGED')
  hcnt[c[:3]]+=1;scnt[c[:7]]+=1
 check(set(hcnt.values())=={144} and set(scnt.values())=={12},'NODE_COVERAGE')
 prev='0'*64;source_perspectives=set()
 for i,row in enumerate(sp):
  c=f'H{i//12+1:02d}.S{i%12+1:02d}';check(row['sphere']==c and row['ordinal']==i+1,'SPHERE_ORDER')
  orig=source['spheres'][c];check(row['name']==orig['name'] and row['homeNodes']==orig['children'],'SPHERE_NODE_MAPPING')
  check(row['homeNodeRecordSha256']==[source['nodes'][n]['source_record_sha256'] for n in orig['children']],'SPHERE_SOURCE_RECORDS')
  role='DOMAIN_SPECIALIZATION' if i%12<7 else 'EPISTEMIC_META';check(row['kind']==role,'DOMAIN_METHOD_AXIS')
  check(row['execution']['fixtureVerified'] and not row['execution']['realWorldClaimsVerified'] and row['execution']['hostEffects']==0,'FALSE_SPHERE_EXECUTION')
  check(row['gateStatus']=='LOCAL_SCHEMA_REVIEW_ONLY' and row['reviewStatus']=='MODULE_EXECUTED_LOCALLY_REVIEW_REQUIRED','SPHERE_EVIDENCE_STATUS')
  check(row['previousSha256']==prev,'SPHERE_RECEIPT_CHAIN');rec=dict(row);digest=rec.pop('receiptSha256');check(jd(rec)==digest,'SPHERE_RECORD_TAMPER');prev=digest
  source_perspectives.add(row['sourcePerspectiveSha256'])
 check(len(source_perspectives)==144,'SPHERE_DUPLICATE_PROFILE')
 for i,m in enumerate(modules):
  h=f'H{i+1:02d}';check(m['house']==h and m['moduleId']==f'F{i+1:02d}' and m['name']==source['houses'][h]['name'],'HOUSE_MODULE_IDENTITY')
  check(m['sphereCount']==12 and m['nodeCount']==144 and m['localFunctionalFixturePasses']==12,'MODULE_SPAN')
  check(m['status'].endswith('REVIEW_REQUIRED') and not m['hostDeployed'] and not m['fictionCanonChanged'],'MODULE_AUTHORITY')
  rec=dict(m);digest=rec.pop('moduleReceiptSha256');check(jd(rec)==digest,'MODULE_RECEIPT_TAMPER')
  check(rec['sourceReceiptHeads']==[r['receiptSha256'] for r in sp[i*12:(i+1)*12]],'MODULE_CASCADE_CHANGED')
 check(build['sphereChainHead']==prev and build['sourceNodes']==1728 and build['sphereExecutions']==144 and build['functionalModules']==12,'META_CHAIN')
 v=dict(build);d=v.pop('metaBuildSha256');check(jd(v)==d,'META_BUILD_TAMPER')
 check(build['actualResidentMacroturns']==0 and build['actualHostEffects']==0 and not build['siteDeployed'] and not build['modelWeightTraining'],'FALSE_HOST_OR_RESIDENT_CLAIM')
 check(build['meta145InputDigest']==manifest['predecessorMeta145Digest'],'INTEGRATION_EDITION_CONFLICT')
 check(build['sourceScoringPairsPreexistingVerified']==248832 and build['previousMeta145CandidateEdges']==1363,'PREVIOUS_WORK_CHANGED')
 return {'status':'PASS_INDEPENDENT_LOCAL_VERIFICATION','exactOriginalSourceSha256':SOURCE,'sourceNodes':len(nodes),'sphereExecutions':len(sp),'modules':len(modules),'moduleFunctionFixturePasses':144,'preexistingSourcePairEvaluations':248832,'recallChainHead':prev,'buildDigest':d,'deployed':False,'residentAuthenticated':False,'semanticApprovals':0}

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('source');parser.add_argument('out');a=parser.parse_args()
 try:print(json.dumps(verify(a.source,a.out),indent=2))
 except Exception as e:print(f'HOLD_INDEPENDENT_VALIDATION: {e}',file=sys.stderr);sys.exit(2)
