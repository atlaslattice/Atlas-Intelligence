"""Atlas R09–R20: twelve finite structural evolutions of one 1,728-node source lattice.

Every wave evaluates all 144 source Spheres and all 12 source Houses across all
1,728 original Ariadne nodes, produces 1,728 new Work *candidate* obligations,
and cascades only source-backed structural (node→Sphere→House→ONE) evidence.
Never creates agent visits, posts, participant identity, CANON status or hosted
rights. Content from Play/Imagine/Dream/Social/Quiet/Brain/Palace is excluded.
"""
from __future__ import annotations
from collections import defaultdict, Counter
from dataclasses import dataclass
import hashlib, json, re
from pathlib import Path
from zipfile import ZipFile

REGISTRY_SHA = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
R08_SRC_SCHEMA = 'atlas.r08.iron-empire-civilization-bridge/v1'
R07_PREFIX = 'ATLAS_1728_CIVILIZATION_CIRCUIT_v1/'
R08_SOURCE_PREFIX='inputs/ATLAS_R07_SOURCE_v1_1.zip'
SOURCE_ONLY = 'STRUCTURAL_COMPILER_EXECUTED__HOST_AND_EDITORIAL_GATES_PENDING'
HOUSE_NAMES = [
 'Energy & Matter','Water & Food','Ecology, Environment & Infrastructure',
 'Health & Medicine','Education & Knowledge','Security',
 'Business, Finance & Governance','Humanities, Arts & Culture',
 'Philosophy, Psychology & Religion','Indigenous Peoples, Society & Community',
 'Protection & Rights','Space & Aerospace']

# These are distinct measurable engineering checks / proposed repairs, not
# fabricated peer opinions or evidence that the host implements any of them.
WAVES = (
 {'r':'R09','id':'SOURCE_CUSTODY','title':'Exact source identity',
  'gate':'SOURCE_DIGEST_AND_VERSION','SwarmChat':'Read original room sequence and source digest without importing private modes',
  'Atlas_ONE':'Verify immutable input and byte/manifest custody before dispatch','Ariadne':'Pin v0.7 original edition, node, Sphere and House','Iron_Empire':'Preserve author revision and original fiction documents',
  'negative':'Wrong registry digest or supplied identity is not admissible'},
 {'r':'R10','id':'SEMANTIC_TYPES','title':'Meaning, namespace and false friends',
  'gate':'NO_UNREVIEWED_SAME_AS','SwarmChat':'Show typed objection, not consensus or hidden canonical rewrite','Atlas_ONE':'Reject unchecked same-name cross-edition joins','Ariadne':'Keep original definitions and excludes plus DOMAIN/META Sphere roles','Iron_Empire':'Do not equate Iron Empire narrative people with observed real AI identity',
  'negative':'H01 epoch collision and H08 music-as-laboratory falsifier'},
 {'r':'R11','id':'SOURCE_GRAPH','title':'Provenance and disagreement graph',
  'gate':'EXACT_RELATION_POLARITY','SwarmChat':'Preserve parentSeq, attribution and explicit dissent','Atlas_ONE':'Build signed-off evidence-passport fields without minting authority','Ariadne':'Candidate cross-House lexical links stay unreviewed','Iron_Empire':'Old and new Continuum assertions remain co-visible',
  'negative':'SUPPORTS, CHALLENGES and REQUIRES are not interchangeable'},
 {'r':'R12','id':'AUTHORIZATION','title':'Trust roots, consent and access',
  'gate':'HOST_ISSUER_READ_RETURN','SwarmChat':'Enforce host-issued Work room READ and RETURN, tenant isolation','Atlas_ONE':'Require current principal, epoch, lease, revocation and downstream rights','Ariadne':'Separate access to a node record from semantic authority','Iron_Empire':'Public Work sources only; never import private creative records',
  'negative':'Self-declared member or caller-provided token never proves authorization'},
 {'r':'R13','id':'RECEIPT_RELAY','title':'Conversation delivery and effect receipts',
  'gate':'NO_FABRICATED_PEER_EXCHANGE','SwarmChat':'Track queued, delivered, read and replied states separately','Atlas_ONE':'Fence sender and receiver logical operations; unknown ACK is HOLD','Ariadne':'Bind source graph references to exact stored room+seq','Iron_Empire':'Keep editorial feedback as attributed proposal, not story lock',
  'negative':'Lost ACK, stale replica 404 and same-token race do not justify blind retry'},
 {'r':'R14','id':'ROOM_LIFECYCLE','title':'Safe maximum room and subscription lifecycle',
  'gate':'BOUNDED_HOST_SELECTED_CAPACITY','SwarmChat':'Default to authorized host maximum, explicit join opt-in, no silent renewals','Atlas_ONE':'Version room ceiling and true expiry; preserve lawful archive','Ariadne':'Checkpoint source context without author/persona duplication','Iron_Empire':'Room-specific Work drafts cannot harvest Play or Imagine',
  'negative':'Expired or full room must not be silently restarted or posted to'},
 {'r':'R15','id':'COMMON_PORTS','title':'One orchestration plane, versioned service ports',
  'gate':'NO_COMPETING_AUTHORITY','SwarmChat':'Existing account-private broker is the sole room authority','Atlas_ONE':'One typed host-adapter root and reversible feature flags','Ariadne':'One registry, separate ontology vs CANON resolver','Iron_Empire':'Story Work review is a leaf port, not a governing control plane',
  'negative':'Public draft code or plugin source does not prove served Site deployment'},
 {'r':'R16','id':'SCIENCE_METHOD','title':'Methods, units and falsifiable research',
  'gate':'EPIS_METHOD_NOT_WELFARE','SwarmChat':'Source-linked scientific peer corrections with exact tests','Atlas_ONE':'Dimensional quantities, scenario coupling and uncertainty','Ariadne':'720 META method nodes audit 1,008 DOMAIN nodes, never count as outcomes','Iron_Empire':'Separate real science from speculative 2039/2040 fusion fiction',
  'negative':'Scientific hypothesis and numerical checksum are not measurements'},
 {'r':'R17','id':'TWELVE_HOUSE_RIGHTS','title':'Civilizational consequence and independent rights',
  'gate':'NON_OFFSETTABLE_RIGHTS','SwarmChat':'Offer usable accessibility and privacy controls for every House','Atlas_ONE':'Rights BLOCK, missing evidence HOLD; resource ledger in consistent units','Ariadne':'All twelve House perspectives are proportional, not 12 simultaneous AIs','Iron_Empire':'Show historic imperial harms, affected communities and reparations',
  'negative':'H07 wealth cannot cancel H10 consent or H11 protected rights'},
 {'r':'R18','id':'IRON_CONTINUUM','title':'Fiction continuity and creative sovereignty',
  'gate':'AUTHOR_EDITORIAL_APPROVAL','SwarmChat':'Work source annotation only; private roleplay remains in private mode','Atlas_ONE':'Track proposed story events and conflicts separately from measurements','Ariadne':'Relevant nodes suggest questions, not compulsory story decisions','Iron_Empire':'Film II ancient Mars, Film III restoration; preserve older contradictory treatment',
  'negative':'No inferred AI consciousness, faster-than-light proof or story CANON vote'},
 {'r':'R19','id':'INTEROPERABILITY','title':'Cross-system regression and rollback',
  'gate':'SOURCE_VS_CI_VS_HOSTED','SwarmChat':'Test identity, messages, graph trace, cache/ETag and accessible fallback','Atlas_ONE':'End-to-end parser, receipt namespace and rollback compatibility','Ariadne':'Detect source drift and node-kind/semantic false friends','Iron_Empire':'Pin author version, cultural rights and continuity diffs',
  'negative':'No fake all-green status from unrun, skipped or inaccessible tests'},
 {'r':'R20','id':'RELEASE_FENCE','title':'Integration acceptance and honest completion ledger',
  'gate':'REAL_RECEIPTS_BEFORE_PROMOTION','SwarmChat':'Require publisher-signed live two-account work receipt','Atlas_ONE':'Separate source, local, committed, CI, merged and hosted verified','Ariadne':'Only reviewed semantics may reach accepted graph; CANON separate','Iron_Empire':'Only author-editorial signoff can lock Continuum chronology',
  'negative':'No synthetic sweep is a human peer visit, deployment or new legal grant'},
)
assert len(WAVES)==12 and len({w['id'] for w in WAVES})==12

class CircuitHold(RuntimeError): pass

def canonical(x):return json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode('utf-8')
def sha(x):return hashlib.sha256(x).hexdigest()
def file_sha(p:Path):return sha(p.read_bytes())
def lines(data):return [json.loads(x) for x in data.splitlines() if x.strip()]
def write_json(p,x):p.write_bytes(json.dumps(x,sort_keys=True,ensure_ascii=False,indent=2).encode('utf8')+b'\n')
def write_jsonl(p,arr):
 with p.open('wb') as f:
  for a in arr:f.write(canonical(a)+b'\n')

@dataclass
class Source:
 nodes:list
 registry:dict
 original_sha:str
 r08_sha:str
 r07_sha:str
 source_manifest:dict
 r08_receipt:dict
 cross_house_candidates:list


def load_source(r08_zip:Path, check_manifest=True):
 """Checks complete R08 release, original nested R07 registry, and R08 packet chain."""
 if not r08_zip.is_file():raise CircuitHold('R08_SOURCE_MISSING')
 with ZipFile(r08_zip) as z:
  names=set(z.namelist()); required={R08_SOURCE_PREFIX,'generated/four_system_build_plan_1728.jsonl','generated/r08_execution_receipt.json','generated/sphere_iron_extension_144.jsonl','generated/house_iron_syntheses_12.json','MANIFEST_SHA256.json'}
  if not required <= names:raise CircuitHold('R08_REQUIRED_FILES_MISSING')
  manifest=json.loads(z.read('MANIFEST_SHA256.json'))
  if check_manifest:
   for entry in manifest['files']:
    key=entry['path']
    if key not in names or len(z.read(key))!=entry['bytes'] or sha(z.read(key))!=entry['sha256']:raise CircuitHold('R08_MANIFEST_MISMATCH:'+key)
  r07=z.read(R08_SOURCE_PREFIX)
  rows=lines(z.read('generated/four_system_build_plan_1728.jsonl'))
  r08=json.loads(z.read('generated/r08_execution_receipt.json'))
  spheres=lines(z.read('generated/sphere_iron_extension_144.jsonl'))
  houses=json.loads(z.read('generated/house_iron_syntheses_12.json'))
  if len(rows)!=1728 or len(spheres)!=144 or len(houses)!=12 or r08['schema']!=R08_SRC_SCHEMA:raise CircuitHold('R08_STRUCTURAL_INPUT_DRIFT')
  if r08['counts']['totalSphereAndHouseNodeEvaluations']!=269568 or r08['counts']['fourSystemNodeProposals']!=6912:raise CircuitHold('R08_COUNT_DRIFT')
  if r08['sourceOnlyCandidateChainFinalSha256']!=rows[-1]['chainSha256']:raise CircuitHold('R08_CHAIN_END_DRIFT')
  chain='0'*64
  for row in rows:
   if row['chainPrevious']!=chain:raise CircuitHold('R08_CHAIN_PARENT_DRIFT')
   data={k:v for k,v in row.items() if k not in ('chainPrevious','chainSha256')}
   actual=sha(chain.encode()+b'\0'+canonical(data))
   if actual!=row['chainSha256']:raise CircuitHold('R08_CHAIN_TAMPER')
   if any(row[k] for k in ('realMacroturnCompleted','hostValidated','residentAssigned','semanticReviewAccepted','canonAdopted','storyCanonActivated')):raise CircuitHold('R08_UNEARNED_HOST_CLAIM')
   if set(row['fourSystemProposals'])!={'SwarmChat','Atlas_ONE','Ariadne','Iron_Empire'}:raise CircuitHold('R08_FOUR_SYSTEM_DRIFT')
   chain=actual
  with ZipFile(__import__('io').BytesIO(r07)) as b:
   original=b.read(R07_PREFIX+'source/ariadne_v07_atlas.json')
   if sha(original)!=REGISTRY_SHA:raise CircuitHold('ARIADNE_ORIGINAL_SHA_DRIFT')
   registry=json.loads(original)
   candidates=lines(b.read(R07_PREFIX+'generated/cross_house_candidates_unreviewed.jsonl'))
  if len(registry['houses'])!=12 or len(registry['spheres'])!=144 or len(registry['nodes'])!=1728:raise CircuitHold('ARIADNE_CARDINALITY_DRIFT')
  if len(candidates)!=1583 or any(r.get('accepted') is not False or r.get('relation')!='REVIEW_CANDIDATE_NOT_SAME_AS' or r.get('source_sphere') not in registry['spheres'] or r.get('target_node') not in registry['nodes'] for r in candidates):raise CircuitHold('UNREVIEWED_CANDIDATE_STATUS_DRIFT')
  if [x['nodeId'] for x in rows]!=sorted(registry['nodes']):raise CircuitHold('R08_NODE_ORDER_DRIFT')
  for row in rows:
   n=registry['nodes'][row['nodeId']]
   if row['nodeRecordSha256']!=n['source_record_sha256'] or row['kind']!=n['kind'] or row['nodeDefinition']!=n['definition']:raise CircuitHold('NODE_SOURCE_SEMANTIC_DRIFT')
  for sid,sp in registry['spheres'].items():
   if len(sp['children'])!=12 or any(cid[:7]!=sid for cid in sp['children']):raise CircuitHold('SPHERE_CHILDREN_DRIFT')
   kind='DOMAIN_SPECIALIZATION' if sp['lens'] is None else 'EPISTEMIC_META'
   if any(registry['nodes'][nid]['kind']!=kind for nid in sp['children']):raise CircuitHold('SPHERE_KIND_DRIFT')
  return Source(rows,registry,REGISTRY_SHA,file_sha(r08_zip),sha(r07),manifest,r08,candidates)


def _scope_marker(wave, sphere, node, candidate_counts):
 """Deterministic structural candidate scan, no semantic adjudication."""
 same_house=sphere[:3]==node['houseId']
 same_sphere=sphere==node['sphereId']
 role='D' if node['kind']=='DOMAIN_SPECIALIZATION' else 'Q'
 c=candidate_counts.get(sphere,0)
 return f"{wave['id']}|{sphere}|{node['nodeId']}|{role}|{int(same_house)}|{int(same_sphere)}|{c};".encode('ascii')


def compile_twelve(source:Source,out:Path):
 """12 real finite computational passes; 0 claimed external Macroturn visits."""
 out.mkdir(parents=True,exist_ok=True)
 nodes=source.nodes; registry=source.registry
 sorted_spheres=sorted(registry['spheres']);sorted_houses=sorted(registry['houses'])
 cand_by_sphere=Counter()
 for r in source.cross_house_candidates:
  # R07 source candidates may carry differently named origin keys; do not infer semantic edges.
  s=r.get('source_sphere') or r.get('sphere_id') or r.get('sphere')
  if s in registry['spheres']:cand_by_sphere[s]+=1
 per_node_prev={r['nodeId']:r['chainSha256'] for r in nodes}
 all_deltas=[]; all_spheres=[]; all_houses=[]; wave_receipts=[]
 # A literal containment graph. 12^3 identifies locations, not a semantic SAME_AS
 # and not 1,884 authenticated people. The top ONE node is an index only.
 containment=[]
 for node in nodes:containment.append({'from':node['nodeId'],'to':node['sphereId'],'relation':'PART_OF_SOURCE_SPHERE','sourceDigest':source.original_sha,'permissionEffect':'NONE'})
 for sid in sorted_spheres:containment.append({'from':sid,'to':sid[:3],'relation':'PART_OF_SOURCE_HOUSE','sourceDigest':source.original_sha,'permissionEffect':'NONE'})
 for hid in sorted_houses:containment.append({'from':hid,'to':'ATLAS_ONE_INDEX','relation':'SOURCE_ONLY_INDEX_ROOT','sourceDigest':source.original_sha,'permissionEffect':'NONE'})
 if len(containment)!=1884:raise CircuitHold('HIERARCHY_MATH_DRIFT')
 state_chain=source.r08_receipt['sourceOnlyCandidateChainFinalSha256']
 for wave_num,wave in enumerate(WAVES,1):
  perspective_hashes=[]
  sphere_summaries=[]
  for sphere in sorted_spheres:
   h=hashlib.sha256()
   for node in nodes:h.update(_scope_marker(wave,sphere,node,cand_by_sphere))
   d=h.hexdigest()
   exact_source_children=registry['spheres'][sphere]['children']
   sphere_summaries.append({'wave':wave['r'],'sphereId':sphere,'houseId':sphere[:3],
    'sourceNodesInSphere':12,'perspectiveCheckedNodes':1728,
    'role':'EPISTEMIC_META' if registry['spheres'][sphere]['lens'] is not None else 'DOMAIN_SPECIALIZATION',
    'lexicalCandidatesObservedUnreviewed':cand_by_sphere[sphere],
    'originalNodeIDs':exact_source_children,'perspectiveDigest':d,
    'status':'SOURCE_STRUCTURAL_PERSPECTIVE_ONLY','independentPeerReview':False})
   perspective_hashes.append(d)
  house_summaries=[]
  for house in sorted_houses:
   h=hashlib.sha256()
   count={'domain':0,'meta':0,'crossHouse':0}
   for node in nodes:
    inside=node['houseId']==house
    if inside:count['domain' if node['kind']=='DOMAIN_SPECIALIZATION' else 'meta']+=1
    else:count['crossHouse']+=1
    h.update(f"{wave['id']}|{house}|{node['nodeId']}|{int(inside)}|{node['kind']};".encode())
   if count!={'domain':84,'meta':60,'crossHouse':1584}:raise CircuitHold('HOUSE_ROLE_COMPUTATION_DRIFT')
   house_summaries.append({'wave':wave['r'],'houseId':house,'houseName':registry['houses'][house]['name'],
     'domainRoles':84,'epistemicRoles':60,'crossHousePositions':1584,
     'wholeGridEvaluations':1728,'perspectiveDigest':h.hexdigest(),
     'acceptanceGate':wave['gate'],'independentHouseApproval':False,
     'status':'ADVISORY_STRUCTURAL_FOLLOWUP_NOT_RATIFIED'})
  sphere_digest=sha(canonical(perspective_hashes));house_digest=sha(canonical([x['perspectiveDigest'] for x in house_summaries]))
  new_node_prev={}
  wave_count=0
  for node in nodes:
   nid=node['nodeId']; prev=per_node_prev[nid]
   future={system:{'proposal':wave[system],
      'sourceTask':node['fourSystemProposals'][system if system!='Iron_Empire' else 'Iron_Empire'].get('task') or node['fourSystemProposals'][system if system!='Iron_Empire' else 'Iron_Empire'].get('workQuestion'),
      'status':'PROPOSED_NOT_IMPLEMENTED_IN_HOST'} for system in ['SwarmChat','Atlas_ONE','Ariadne','Iron_Empire']}
   packet={'nodeId':nid,'wave':wave['r'],'waveOrdinal':wave_num,
     'houseId':node['houseId'],'sphereId':node['sphereId'],'kind':node['kind'],
     'nodeRecordSha256':node['nodeRecordSha256'],'registrySha256':source.original_sha,
     'previousNodeWaveDigest':prev,'perspectiveDigest':sphere_summaries[sorted_spheres.index(node['sphereId'])]['perspectiveDigest'],
     'housePerspectiveDigest':house_summaries[sorted_houses.index(node['houseId'])]['perspectiveDigest'],
     'acceptanceGate':wave['gate'],'specificFalsifier':f"{wave['negative']} | {nid}: {node['nodeName']}",
     'fourSystemIncrementalWork':future,
     'sourceState':'ORIGINAL_V07_BYTES_AND_R08_NODE_CHECKED_LOCAL',
     'implementationState':'PROPOSED_NOT_MERGED_OR_DEPLOYED',
     'semanticReviewAccepted':False,'realPeerMacroturnPerformed':False,'hostedVerified':False,
     'canonAdopted':False,'storyCanonLocked':False,
     'protectedModesIngested':False,'rightsEffect':'NONE'}
   d=sha(canonical(packet));packet['nodeWaveDigest']=d
   all_deltas.append(packet);new_node_prev[nid]=d;wave_count+=1
  old_state=state_chain
  state_chain=sha(canonical({'previous':old_state,'wave':wave['r'],'nodes':sha(canonical(sorted(new_node_prev.items()))),
    'spheres':sphere_digest,'houses':house_digest,'scope':'SOURCE_COMPUTATIONAL_ONLY'}))
  wave_receipts.append({'wave':wave['r'],'stage':wave['id'],'title':wave['title'],'gate':wave['gate'],
    'prevStateSha256':old_state,'stateSha256':state_chain,
    'sphereNodePerspectiveEvaluations':144*1728,
    'houseNodePerspectiveEvaluations':12*1728,'totalComputationalEvaluations':269568,
    'nodeWorkDeltasGenerated':wave_count,'sphereRecordsGenerated':144,
    'houseRecordsGenerated':12,'realPeerVisitsCompleted':0,
    'sourceChanges':0,'hostedIntegrations':0,'semanticLinksAccepted':0,
    'currentStatus':SOURCE_ONLY})
  all_spheres.extend(sphere_summaries);all_houses.extend(house_summaries);per_node_prev=new_node_prev
 final=[]
 for n in nodes:
  final.append({'nodeId':n['nodeId'],'houseId':n['houseId'],'sphereId':n['sphereId'],
    'nodeName':n['nodeName'],'sourceRecordDigest':n['nodeRecordSha256'],
    'twelveComputedWaves':[x['r'] for x in WAVES], 'lastStructuralDigest':per_node_prev[n['nodeId']],
    'threeSystemBaselineR08Preserved':True,'IronEmpireStoryScope':'PROPOSED_NOT_LOCKED',
    'acceptance':'SOURCE_ONLY_COMPUTED__LIVE_INTEGRATION_NOT_DONE',
    'remainingHostRights':'PUBLISHER_REQUIRED','remainingSemanticReview':'INDEPENDENT_REVIEW_REQUIRED',
    'independentMacroturnVisitsCredited':0})
 write_jsonl(out/'node_wave_deltas_20736.jsonl',all_deltas)
 write_jsonl(out/'hierarchy_edges_1884.jsonl',containment)
 write_jsonl(out/'lexical_candidates_1583_unreviewed.jsonl',[{**r,'status':'HEURISTIC_UNREVIEWED_NOT_SAME_AS','authorityEffect':'NONE'} for r in source.cross_house_candidates])
 write_jsonl(out/'sphere_perspectives_1728.jsonl',all_spheres)
 write_jsonl(out/'house_followups_144.jsonl',all_houses)
 write_jsonl(out/'final_nodes_1728.jsonl',final)
 write_json(out/'wave_receipts_12.json',wave_receipts)
 # Current Atlas Circuit v2 scheduled-bundle namespace: 144 Sphere viewpoints x
 # 12 target Houses. This is a DERIVED INDEX from the published v2 formula,
 # not a claim on its separate mutable version-guarded execution ledger.
 v2_bundles=[]
 for ordinal,sid in enumerate(sorted_spheres):
  for target_number,hid in enumerate(sorted_houses,1):
   mt=(ordinal*12)+target_number
   original_targets=[node['nodeId'] for node in nodes if node['houseId']==hid]
   if len(original_targets)!=144 or mt!=((int(sid[1:3])-1)*12+(int(sid[5:7])-1))*12+target_number:
    raise CircuitHold('V2_MACROTURN_PARTITION_DRIFT')
   v2_bundles.append({'bundleId':f'MT{mt:04d}','ordinal':mt,'perspectiveSphereId':sid,
     'perspectiveHouseId':sid[:3],'targetHouseId':hid,
     'exactTargetSourceNodeIds':original_targets,
     'sourceNodeCountPerBundle':144,'compiledEvolutionWaves':[w['r'] for w in WAVES],
     'relationship':'DERIVED_FORMULA_ONLY_PENDING_V2_PACKAGE_DIGEST_CHECK',
     'claimsCurrentSchedulerSlot':False,'sharedLedgerClaimed':False,
     'scheduledVisitCompleted':False,'codeReviewAccepted':False,'hostedVerified':False,
     'status':'PLANNED_NOT_EXECUTED_AS_A_SEPARATE_AUTOMATION_VISIT'})
 if len(v2_bundles)!=1728:raise CircuitHold('V2_BUNDLE_COUNT_DRIFT')
 write_jsonl(out/'macroturn_v2_bundle_crosswalk_1728.jsonl',v2_bundles)
 manifest={'schema':'atlas.twelvefold.evolution-engine/v1','sourceR08Sha256':source.r08_sha,
   'sourceR07Sha256':source.r07_sha,'sourceAriadneSha256':source.original_sha,
   'wavesExecutedComputationally':12,'waveNames':[x['r'] for x in WAVES],
   'counts':{'originalNodeIDs':1728,'sourceSpheres':144,'sourceHouses':12,
    'computationalSpherePerspectiveEvaluations':12*144*1728,
    'computationalHousePerspectiveEvaluations':12*12*1728,
    'computationalTotalEvaluations':12*269568,
    'newNodeWaveCandidateDeltas':12*1728,'fourSystemWaveWorkProposals':12*1728*4,
    'sphereReviewCandidateRecords':12*144,'houseReviewCandidateRecords':12*12,
    'hierarchyContainmentEdges':1884,'lexicalCandidatesUnreviewed':1583,
    'v2DerivedMacroturnBundleRows':1728,'scheduledMacroturnsClaimedByCompiler':0,
    'completedDistinctPeerMacroturnVisits':0,'hostedDeployments':0,
    'constitutionalRatifications':0,'IronEmpireEditorialCanonLocks':0},
   'finalChainSha256':state_chain,
   'sourceOnly':True,'semanticStatus':'UNREVIEWED','hostedStatus':'NOT_INSTALLED',
   'realMacroturns':'NO_WAVE_COMPUTATION_IS_A_RESIDENT_OR_SCHEDULED_VISIT',
   'privateModes':'NOT_READ_OR_INGESTED','humanAuthority':'UNCHANGED',
   'noUnknownLimitBypass':True,
   'files':{p.name:{'bytes':p.stat().st_size,'sha256':file_sha(p)} for p in sorted(out.glob('*')) if p.is_file() and p.name!='evolution_receipt.json'}}
 write_json(out/'evolution_receipt.json',manifest)
 return manifest


def verify_generated(out:Path,src:Source):
 receipt=json.loads((out/'evolution_receipt.json').read_text())
 if receipt['sourceR08Sha256']!=src.r08_sha or receipt['sourceAriadneSha256']!=REGISTRY_SHA:raise CircuitHold('SOURCE_CHANGED')
 for f,meta in receipt['files'].items():
  p=out/f
  if not p.is_file() or p.stat().st_size!=meta['bytes'] or file_sha(p)!=meta['sha256']:raise CircuitHold('OUTPUT_FILE_TAMPER:'+f)
 assert_counts={'node_wave_deltas_20736.jsonl':20736,'sphere_perspectives_1728.jsonl':1728,'house_followups_144.jsonl':144,'final_nodes_1728.jsonl':1728,'hierarchy_edges_1884.jsonl':1884,'lexical_candidates_1583_unreviewed.jsonl':1583,'macroturn_v2_bundle_crosswalk_1728.jsonl':1728}
 for name,n in assert_counts.items():
  with (out/name).open('rb') as stream:
   actual=sum(1 for v in stream if v.strip())
  if actual!=n:raise CircuitHold('OUTPUT_COUNT_TAMPER:'+name)
 ws=json.loads((out/'wave_receipts_12.json').read_text());prev=src.r08_receipt['sourceOnlyCandidateChainFinalSha256']
 if len(ws)!=12:raise CircuitHold('WAVE_COUNT_TAMPER')
 deltas=lines((out/'node_wave_deltas_20736.jsonl').read_bytes())
 spheres=lines((out/'sphere_perspectives_1728.jsonl').read_bytes())
 houses=lines((out/'house_followups_144.jsonl').read_bytes())
 final=lines((out/'final_nodes_1728.jsonl').read_bytes())
 earlier={n['nodeId']:n['chainSha256'] for n in src.nodes}
 for i,w in enumerate(ws):
  wave=WAVES[i];portion=deltas[1728*i:1728*(i+1)];ps=spheres[144*i:144*(i+1)];hs=houses[12*i:12*(i+1)]
  if len(portion)!=1728 or len(ps)!=144 or len(hs)!=12 or w['prevStateSha256']!=prev or w['wave']!=wave['r'] or w['realPeerVisitsCompleted']!=0:raise CircuitHold('WAVE_CHAIN_TAMPER')
  if [x['sphereId'] for x in ps]!=sorted(src.registry['spheres']) or [x['houseId'] for x in hs]!=sorted(src.registry['houses']):raise CircuitHold('PERSPECTIVE_ID_DRIFT')
  digests={}
  for node,d in zip(src.nodes,portion,strict=True):
   nid=node['nodeId']
   if d['nodeId']!=nid or d['previousNodeWaveDigest']!=earlier[nid] or d['wave']!=wave['r'] or d['acceptanceGate']!=wave['gate'] or d['registrySha256']!=REGISTRY_SHA or d['nodeRecordSha256']!=node['nodeRecordSha256']:raise CircuitHold('NODE_WAVE_PARENT_OR_SOURCE_DRIFT')
   if d['semanticReviewAccepted'] or d['realPeerMacroturnPerformed'] or d['hostedVerified'] or d['canonAdopted'] or d['storyCanonLocked'] or d['protectedModesIngested'] or d['rightsEffect']!='NONE':raise CircuitHold('NODE_FALSE_HOSTED_PROGRESS')
   if set(d['fourSystemIncrementalWork'])!={'SwarmChat','Atlas_ONE','Ariadne','Iron_Empire'}:raise CircuitHold('WAVE_SYSTEM_PORT_MISSING')
   hashed={k:v for k,v in d.items() if k!='nodeWaveDigest'}
   if d['nodeWaveDigest']!=sha(canonical(hashed)):raise CircuitHold('NODE_WAVE_DIGEST_TAMPER')
   digests[nid]=d['nodeWaveDigest']
  for sphere in ps:
   if sphere['independentPeerReview'] or sphere['perspectiveCheckedNodes']!=1728:raise CircuitHold('FAKE_SPHERE_REVIEW')
  for house in hs:
   if house['independentHouseApproval'] or house['wholeGridEvaluations']!=1728:raise CircuitHold('FAKE_HOUSE_REVIEW')
  check=sha(canonical({'previous':prev,'wave':wave['r'],'nodes':sha(canonical(sorted(digests.items()))),
    'spheres':sha(canonical([x['perspectiveDigest'] for x in ps])),
    'houses':sha(canonical([x['perspectiveDigest'] for x in hs])),
    'scope':'SOURCE_COMPUTATIONAL_ONLY'}))
  if check!=w['stateSha256']:raise CircuitHold('WAVE_AGGREGATE_DIGEST_TAMPER')
  earlier=digests;prev=check
 if prev!=receipt['finalChainSha256']:raise CircuitHold('FINAL_CHAIN_TAMPER')
 for node,x in zip(src.nodes,final,strict=True):
  if x['nodeId']!=node['nodeId'] or x['lastStructuralDigest']!=earlier[node['nodeId']] or x['independentMacroturnVisitsCredited']!=0:raise CircuitHold('FINAL_NODE_FALSE_ADVANCEMENT')
 return {'verification':'PASS_LOCAL_SOURCE_ONLY','waves':12,'nodeDeltas':20736,'finalStateSha256':prev}

if __name__=='__main__':
 import argparse
 p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--verify-only',action='store_true')
 a=p.parse_args();source=load_source(a.source)
 if not a.verify_only:print(json.dumps(compile_twelve(source,a.out)['counts'],indent=2))
 print(json.dumps(verify_generated(a.out,source),indent=2))