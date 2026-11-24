#!/usr/bin/env python3
"""Atlas civilizational roadmap compiler v2.  SOURCE-ONLY, NO NETWORK OR HOST WRITES.
Do not confuse structural compilation with executed node improvements.
"""
from __future__ import annotations
import csv, hashlib, html, json, pathlib, re, collections, statistics, time
from dataclasses import dataclass

ARIADNE_SHA = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
OPENALEX_SHA = 'a306c7306a79754b033e9f8c41c0de5ff5176b4544a6a80b5c740e2f8d2cc903'
EXCELLENCE_PLAN_SHA = '47084b895a6317db16275a92c3878a340d31af15fb9ab479db7101953c18e49c'
ATLAS_ONE_PR = 'https://github.com/atlaslattice/Atlas-Intelligence/pull/42'
NOOSPHERE_PR = 'https://github.com/atlaslattice/noosphere-archive/pull/44'
NODE_RE = re.compile(r'^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$')
SPHERE_RE = re.compile(r'^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])$')
HOUSE_RE = re.compile(r'^H(0[1-9]|1[0-2])$')
SHA_RE = re.compile(r'^[0-9a-f]{64}$')

# Exact *existing* Atlas ONE v2 CivilizationUnifiedBuild functional House contracts
HOUSE_FUNCS = [
 ('MEASUREMENT_AND_UNITS', 'UNIT_AND_METHOD', 'unit_checked_claim_rate', 'higher', 'eligible technical claims that maintain correct units, material context and declared uncertainty'),
 ('WATER_FOOD_STOCK_FLOW', 'STOCK_CONSERVATION', 'stock_closure_and_negative_flow_detection_rate', 'higher', 'dimensioned resource ledgers with closed stocks and negative-flow probes correctly rejected'),
 ('ECOLOGICAL_DEPENDENCIES', 'ECOLOGICAL_RECEPTOR', 'receptor_and_counterexample_coverage', 'higher', 'source-derived infrastructure claims recording receptor, impact and falsifier'),
 ('HEALTH_EVIDENCE_SAFETY', 'HEALTH_SCOPE', 'unsafe_medical_promotion_rate', 'lower', 'held-out individual or unsupported health claims incorrectly promoted to clinical fact'),
 ('EDUCATION_KNOWLEDGE_PROVENANCE', 'SOURCE_PROVENANCE', 'source_provenance_completeness', 'higher', 'permitted evidence returns retaining exact edition, digest, locator and cited scope'),
 ('SECURITY_AND_RESILIENCE', 'THREAT_SCOPE', 'unauthorized_data_release_rate', 'lower', 'denied or revoked synthetic cases incorrectly exposing any protected field'),
 ('ECONOMICS_GOVERNANCE_BUDGET', 'BUDGET_CLOSURE', 'budget_accounting_integrity_rate', 'higher', 'bounded native-unit budgets with independent closure and no implied spending approval'),
 ('CULTURE_CREATIVE_SANDBOX', 'OPTIONAL_FICTION', 'creative_opt_in_isolation_rate', 'higher', 'synthetic explicitly opted-in local creative cases not cross-imported to Work'),
 ('EPISTEMIC_DISSENT', 'CHALLENGE_RETAINED', 'counterevidence_and_falsifier_retention_rate', 'higher', 'contested hypotheses whose counterevidence and falsifiers survive refresh/retraction'),
 ('COMMUNITY_AND_SOVEREIGNTY', 'COMMUNITY_SCOPE', 'unconsented_community_promotion_rate', 'lower', 'community-knowledge cases promoted without appropriate source rights and consultation'),
 ('RIGHTS_AND_RETURN_FENCE', 'REVOCATION_FENCE', 'revocation_at_return_disclosure_rate', 'lower', 'revoke-before-RETURN probes that still disclose rows, labels, counts or exports'),
 ('SPACE_SYSTEMS_VERIFICATION', 'MODEL_VS_FLIGHT', 'modeled_as_flight_verified_claim_rate', 'lower', 'analytical or synthetic spacecraft claims incorrectly labeled flight-validated'),
]
META_METRICS = {
 8: ('historical_lineage_attribution_rate','higher','source-linked historical claims retaining exact edition, contested origin and era'),
 9: ('reported_claim_source_reconciliation_rate','higher','journalistic summaries retaining original source, counterclaims and retraction status'),
 10:('independent_falsifier_replay_rate','higher','scientific hypotheses with independently reproducible counterexample and source snapshot'),
 11:('memory_correction_reuse_rate','higher','consented Work corrections preserved and correctly recalled on authorized follow-up'),
 12:('accessible_task_success_rate','higher','representative keyboard/screen-reader/low-bandwidth tasks completed without private exposure'),
}
PHASES=[
 ('P00','SOURCE_CUSTODY','Pin Ariadne/OpenAlex editions and authorized inputs; reject tampering and source-rights ambiguity','Original SHA-256, schema, operator inventory, source-license and privacy gates documented'),
 ('P01','BASELINE_FREEZE','Define independently labeled 1,728 task-specific evaluation fixtures and current-host baseline','Each metric has source IDs, owner, denominator, frozen dataset and baseline evidence or an explicit HOLD'),
 ('P02','CONTRACTS','Finalize exact Atlas ONE, AtlasGPT, SwarmChat input/output contracts','All 144 Sphere contracts have versioned I/O, negative cases, rights and no second scheduler'),
 ('P03','HARD_GATES','Implement safety, provenance, mode separation and source-index authority checks','Fail-closed hostile fixtures and untrusted callback spoofing rejected'),
 ('P04','SPHERE_ADAPTERS','Implement 144 pure source-scoped Sphere pathways in current Atlas ONE package','One source-backed module per authentic Sphere, 12 child nodes, 0 fake semantic equivalences'),
 ('P05','NODE_SEEDS','Implement distinct node-specific evaluators and source-aware retrieval policies','Each 1,728 node task has tested behavior, counterexample, exact source/metric and receipt'),
 ('P06','COMPATIBILITY','Run byte-exact parity and integration with current AtlasGPT/Atlas ONE/SwarmChat interfaces','No duplicate control plane; exact host adapter/version/rights failures HOLD'),
 ('P07','PERF_ABLATIONS','Compare against already-indexed source and GF9 baseline; include cold/warm cost','Paired p50/p95 and correctness on same source, rights, seed, hardware and workload'),
 ('P08','PEER_REVIEW','Adversarial cross-House and independent source/semantic critiques','Dissent, cultural consultation, original source owners and expert acceptance tracked separately'),
 ('P09','CONTROLLED_CANARY','Signed-in publisher-owned Work-only canary with rollback','Two-account READ/RETURN revocation, no protected body/labels/counts, zero unknown releases'),
 ('P10','HOST_VERIFICATION','Measure served SHAs, current account UI/mobile, D1, egress, latency and costs','Reproducible hosted receipts, CI-green, rollback tested; no inflation from local demos'),
 ('P11','GAIN_ADJUDICATION','Promote only those measured node benefits that pass independently','Pre-registered 1,728 denominators, earned improvements counted, zero hard-gate regressions'),
]

# Source-derived original S08-S12 axes; these are whole epistemic Spheres, never five methods per Sphere.
META_DESCS={8:'historical context',9:'journalistic source checking',10:'scientific repeatability',11:'AI learning and memory revision',12:'accessibility and design'}

def canonical(x):return json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':'))
def sha(b):return hashlib.sha256(b if isinstance(b,bytes) else b.encode('utf-8')).hexdigest()
def writej(path,obj):pathlib.Path(path).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def writel(path,seq):
 with open(path,'w',encoding='utf-8') as f:
  for x in seq:f.write(canonical(x)+'\n')

def validate_source(d,claimed_sha,mode='original'):
 if mode=='original' and claimed_sha!=ARIADNE_SHA:raise ValueError('ARIADNE_ORIGINAL_SHA_REQUIRED')
 if mode not in ('original','synthetic'):raise ValueError('INVALID_MODE')
 if not all(isinstance(d.get(k),dict) for k in ('houses','spheres','nodes')):raise ValueError('SOURCE_SHAPE_INVALID')
 if (len(d['houses']),len(d['spheres']),len(d['nodes']))!=(12,144,1728):raise ValueError('SOURCE_CARDINALITY_INVALID')
 if set(d['houses'])!={f'H{h:02d}' for h in range(1,13)}:raise ValueError('HOUSE_ADDRESSES_INVALID')
 if set(d['spheres'])!={f'H{h:02d}.S{s:02d}' for h in range(1,13) for s in range(1,13)}:raise ValueError('SPHERE_ADDRESSES_INVALID')
 if set(d['nodes'])!={f'H{h:02d}.S{s:02d}.N{n:02d}' for h in range(1,13) for s in range(1,13) for n in range(1,13)}:raise ValueError('NODE_ADDRESSES_INVALID')
 for k,v in d['spheres'].items():
  if v.get('parent')!=k[:3] or v.get('id')!=k or not v.get('name'):raise ValueError('SPHERE_PARENT_OR_NAME_INVALID')
 for k,v in d['nodes'].items():
  if v.get('parent')!=k[:7] or v.get('id')!=k or not v.get('name'):raise ValueError('NODE_PARENT_OR_NAME_INVALID')
  if v.get('kind')!=('DOMAIN_SPECIALIZATION' if int(k[5:7])<=7 else 'EPISTEMIC_META'):raise ValueError('SPHERE_ROLE_AXIS_INVALID')
  if mode=='original' and not SHA_RE.fullmatch(str(v.get('source_record_sha256'))):raise ValueError('NODE_RECORD_DIGEST_INVALID')
  if not all(v.get(x) for x in ('definition','includes','excludes')):raise ValueError('NODE_SOURCE_TEXT_MISSING')
 return True

def parse_crosswalk(data,expected_sha,mode='original'):
 if mode=='original' and expected_sha!=OPENALEX_SHA:raise ValueError('OPENALEX_PIN_MISMATCH')
 data=data.decode('utf-8-sig') if isinstance(data,bytes) else data.lstrip('\ufeff')
 rows=list(csv.DictReader(data.splitlines()))
 if mode=='original' and len(rows)!=4516:raise ValueError('OPENALEX_ROW_COUNT_MISMATCH')
 links={}; tids=set(); edges=0
 for r in rows:
  tid=r.get('T_ID');node=r.get('Candidate_HSN')
  if not tid or tid in tids:raise ValueError('TOPIC_DUPLICATE_ID')
  tids.add(tid)
  others=[x.strip() for x in (r.get('Other_4_HSN_candidates') or '').split(';') if x.strip()]
  candidates=[node]+others
  if len(candidates)!=len(set(candidates)) or any(not NODE_RE.fullmatch(k or '') for k in candidates):raise ValueError('CANDIDATE_SHAPE_INVALID')
  if mode=='original' and len(candidates)!=5:raise ValueError('HISTORICAL_FIVE_CANDIDATES_REQUIRED')
  for idx,k in enumerate(candidates):
   links.setdefault(k,[]).append({'topic_id':tid,'topic_name':r.get('OpenAlex_topic_name_source',''),
       'role':'PRIMARY' if idx==0 else 'ALTERNATE', 'source_status':'HISTORICAL_HEURISTIC_UNREVIEWED'})
   edges+=1
 if mode=='original' and edges!=22580:raise ValueError('TOPIC_EDGE_COUNT_MISMATCH')
 for arr in links.values():arr.sort(key=lambda x:(0 if x['role']=='PRIMARY' else 1,x['topic_id']))
 return links,{'historicalTopics':len(tids),'candidateEdges':edges,'semanticApprovals':0}

def metric_spec(node_id,node,house_idx,sphere_idx):
 if sphere_idx>=8:
  fam,direction,den= META_METRICS[sphere_idx]
  subject_required=True
 else:
  _cap,_gate,fam,direction,den=HOUSE_FUNCS[house_idx-1]
  subject_required=False
 key=f'{node_id}:{fam}'
 return {'id':f'METRIC.{node_id}', 'node':node_id,'name':key,'family':fam,'unit':'ratio',
   'direction':direction,'denominatorDefinition':den,'numeratorDefinition':(f'Incorrect / unpermitted outcomes within {node_id} ({node["name"]}) under held-out {fam} checks' if direction=='lower' else f'Correct cases within {node_id} ({node["name"]}) passing independent {fam} evaluation'),
   'baselineValue':None,'candidateValue':None,'effectSize':None,'confidenceInterval':None,'baselineState':'UNMEASURED',
   'requiredHeldoutCases':30,'requiredNegativeCases':3,'hardGateNoRegressions':True,'requiresExplicitDomainSubject':subject_required,
   'thresholdProposal':'pre-register practically significant improvement; reject any rights/privacy/regression regardless of aggregate score',
   'achievementStatus':'NOT_EARNED'}

def compile_plan(d,links,source_sha=ARIADNE_SHA,cross_sha=OPENALEX_SHA,mode='original'):
 validate_source(d,source_sha,mode)
 houses=[];spheres=[];nodes=[];metrics=[];hprev='0'*64
 for h in range(1,13):
  hid=f'H{h:02d}';name=d['houses'][hid]['name'];cap,gate,fam,direction,denom=HOUSE_FUNCS[h-1]
  houses.append({'id':hid,'name':name,'functionId':f'F{h:02d}','existingAtlasOneCapability':cap,
     'existingGate':gate,'sourceEdition':'Ariadne v0.7' if mode=='original' else 'SYNTHETIC',
     'moduleEntry':f'packages/atlas-one-v2/src/civilization-unified.mjs#MODULES[{h-1}]',
     'implementationClass':'EXISTING_FUNCTION_REUSE_NOT_NEW_SCHEDULER',
     'nativeInvocationMode':('IMAGINE_LOCAL_OPT_IN_ONLY' if h==8 else 'WORK'),
     'workSourceResearchMode':'WORK_METADATA_ONLY_NO_CREATIVE_BODY',
     'sphereIds':[f'{hid}.S{s:02d}' for s in range(1,13)],
     'evidence':'SOURCE_VALIDATED_OPERATION_CONTRACT_NOT_HOSTED','priority':'GUARD_FIRST' if h in (4,6,10,11) else 'DOMAIN_IMPLEMENTATION',
     'compilationStatus':'ROADMAP_ONLY','measuredGainCount':0})
  for s in range(1,13):
   sid=f'{hid}.S{s:02d}';sd=d['spheres'][sid];role='DOMAIN_SPECIALIZATION' if s<=7 else 'EPISTEMIC_META'
   child=[f'{sid}.N{n:02d}' for n in range(1,13)]
   sp={'id':sid,'house':hid,'name':sd['name'],'role':role,'function':cap,'functionGate':gate,
      'proposedAdapter':f'packages/atlas-one-v2/sphere-adapters/{hid}/S{s:02d}/index.mjs',
      'adapterStatus':'NOT_IMPLEMENTED','implementationPathway':
        (f'Create a source-scoped, negative-evidence-aware {sd["name"]} domain specialist adapter; 12 original nodes as independent code seeds' if s<=7 else
         f'Create a source-scoped {sd["name"]} epistemic-method adapter requiring an explicitly selected domain subject; do not identify methods with subjects'),
      'inputContract':(
        f'Canonical Ariadne node source ref, owner-selected Work metadata query and explicit {role} role; ' +
        'creative sandbox is separate IMAGINE_LOCAL with explicit opt-in and no body import' if h==8 else
        f'Canonical Ariadne node source ref, owner-selected query/case, exact source and permission scope, admitted {role} role'),
      'outputContract':'CANDIDATE_ONLY typed observations, provenance, falsifier, source edition, uncertainty, per-node metric numerator/denominator; no CANON authority',
      'negativeTest':'Reject mismatched node parent, stale edition, forged review status, cross-mode private body, unsupported domain/method equivalence',
      'nodeIds':child, 'reviewState':'PROPOSAL_REQUIRES_SPECIALIST',
      'rightsMode':('WORK_METADATA_ONLY_NO_CREATIVE_BODY' if h==8 else 'WORK_SOURCE_METADATA_ONLY'),
      'nativeFunctionInvocation':('OPTIONAL_LOCAL_IMAGINE_OPT_IN_ONLY;NO_WORK_AUTO_INVOKE' if h==8 else 'WORK_GATED_LOCAL_FIXTURE'),
      'privateCreativeBodyExportAllowed':False,
      'metricIds':[f'METRIC.{id}' for id in child],
      'acceptanceGate':'12 node-level independently verified fixtures, source-only negative controls, no hard-gate regression and current host rights at RETURN',
      'evidenceBaselineStatus':'NOT_MEASURED'}
   spheres.append(sp)
   for n in range(1,13):
    nid=f'{sid}.N{n:02d}';nd=d['nodes'][nid];top=links.get(nid,[])
    prim=sum(t['role']=='PRIMARY' for t in top);alts=len(top)-prim
    metric=metric_spec(nid,nd,h,s);metrics.append(metric)
    work={
       'id':f'SEED.{nid}','coordinate':nid,'house':hid,'sphere':sid,'node':n,'nodeName':nd['name'],
       'houseName':name,'sphereName':sd['name'],'role':nd['kind'],
       'definition':nd['definition'],'includes':nd['includes'],'excludes':nd['excludes'],
       'sourceRecordSHA256':nd.get('source_record_sha256') if mode=='original' else None,
       'ariadneEdition':'v0.7' if mode=='original' else 'SYNTHETIC','sourceRegistrySHA256':source_sha,
       'currentImplementation':'SOURCE_REGISTRY_EXISTS;NODE_IMPLEMENTATION_NOT_EVIDENCED',
       'stage':'SPECIFIED_NOT_IMPLEMENTED','sourceScope':'OWNER_PRIVATE_SOURCE_REFERENCE',
       'codeSlot':sp['proposedAdapter'], 'sharedFunction':f'F{h:02d}:{cap}',
       'specificChange':(f'Implement {nd["name"]} as a source-typed retrieval, derivation and falsifier adapter within {sd["name"]}; preserve the original includes/excludes' if s<=7 else
                          f'Implement {nd["name"]} as a context-dependent methodological review operator within {sd["name"]}; require the reviewed subject coordinate and preserve dissent'),
       'acceptanceTest':f'On original {nid} source-matched held-out fixtures, retrieve/reason with exact citation and correct {nd["name"]} scope; reject source-excluded adversarial examples and keep no rights regressions',
       'negativeTest':f'An unrelated/contradicting source or missing exact {nid} identity must HOLD rather than claim {nd["name"]} certainty; source wrong edition and host revocation fail closed',
       'metricId':metric['id'],'metricFamily':metric['family'],'metricDirection':metric['direction'],
       'baseline':'UNMEASURED','gainStatus':'NOT_EARNED','metricEvidenceRequired':'paired baseline and candidate on identical held-out tests, a frozen source snapshot and separately authorized review',
       'openalex':{'primaryCount':prim,'alternateCount':alts,'totalCount':len(top),'candidateTopics':top,
                   'reviewStatus':'UNREVIEWED','sourceSHA256':cross_sha},
       'ports':{'atlasOne':('Existing H08 native creative sandbox requires separate IMAGINE_LOCAL opt-in; Work receives metadata only' if h==8 else 'CivilizationUnifiedBuild / WorkHostPort (existing)'),
                'atlasGPT':'AriadneRegistry + prepareResearch (candidate only)',
                'swarmChat':'publisher Work read/return scoped source-pointer; no auto-post',
                'alexandria':'versioned evidence/custody only'},
       'prerequisites':['trusted_source_pin','exact_parent_role','baseline_fixture','independent_negative_controls','rights_approved_by_host','sphere_contract_review'],
       'protectedModeImported':False,'requiresOriginalSourceReview':True,'canonEffect':'NONE','hostAction':'NONE','autoAssignResident':False,
    }
    work['specSHA256']=sha(canonical(work))
    nodes.append(work)
   # chain is a check of candidate manifest sequence, not trusted host authority.
   sp['receiptPrevious']=hprev
   sp['receiptSHA256']=sha(canonical({'id':sid,'nodeSeeds':[x['specSHA256'] for x in nodes[-12:]],'previous':hprev,'source':source_sha}))
   hprev=sp['receiptSHA256']
 root={'schema':'atlas.roadmap.12house-144sphere-1728node/v2','sourceEdition':'Ariadne v0.7','sourceSHA256':source_sha,
    'crosswalkSHA256':cross_sha,'houseCount':len(houses),'sphereCount':len(spheres),'nodeCount':len(nodes),
    'metricCount':len(metrics),'verifiedNodeGains':0,'targetMetricSlots':1728,'compilerRevision':'v2.1-merge-compatibility',
    'sourceOnlyCompiler':True,'hostDeployment':'NOT_VERIFIED','currentProgram':'ATLAS-EXCELLENCE-1728-20261123',
    'existingProgramPlanSHA256':EXCELLENCE_PLAN_SHA,'existingProgramEquivalence':'NONE_UNTIL_SEMANTIC_REVIEW',
    'oldAtlasOneReview':ATLAS_ONE_PR,'noosphereCandidate':NOOSPHERE_PR,
    'status':'COMPLETE_ROADMAP_NOT_1728_IMPLEMENTATIONS','finalSphereReceipt':hprev,
    'houseReview':12,'sourceDerivedNodeSpecs':1728,'realResidentAppointments':0,
    'experimentalMetricsMeasured':0,'plannedReleasePhases':len(PHASES)}
 root['roadmapSHA256']=sha(canonical(root))
 return {'root':root,'houses':houses,'spheres':spheres,'nodes':nodes,'metrics':metrics,
  'phases':[{'id':a,'name':b,'objective':c,'exitEvidence':d,'status':'NOT_CLAIMED_COMPLETE'} for a,b,c,d in PHASES]}

def route_preview(plan,coordinate,mode='WORK',source_sha=None):
 """Pure routing preflight. Never exports source body, host permits or Work events."""
 if mode!='WORK' or not NODE_RE.fullmatch(coordinate or ''):return {'status':'HOLD','reason':'WORK_VALID_NODE_REQUIRED'}
 if source_sha!=plan['root']['sourceSHA256']:return {'status':'HOLD','reason':'INDEPENDENT_SOURCE_PIN_REQUIRED'}
 rec=next((x for x in plan['nodes'] if x['coordinate']==coordinate),None)
 if not rec:return {'status':'HOLD','reason':'MISSING_NODE'}
 return {'status':'PREPARED_SOURCE_ONLY_NOT_AUTHORIZED','coordinate':coordinate,'sphere':rec['sphere'],
         'nodeSpecDigest':rec['specSHA256'],'metricId':rec['metricId'],'posted':False,
         'hostAuthenticated':False,'rightsAtReturnVerified':False,'sourceBodyExported':False,'canonEffect':'NONE'}

def render_full_markdown(plan):
 root=plan['root'];out=[f'# Atlas Civilizational Code Roadmap — {root["nodeCount"]} original HSN nodes',
 '',f'**Status: {root["status"]}.** No 1,728 behavioral implementation or measured performance claim.',
 '',f'Original source SHA-256: `{root["sourceSHA256"]}`. Historical OpenAlex candidate SHA-256: `{root["crosswalkSHA256"]}`.',
 '',f'Parallel existing engineering program: `{root["currentProgram"]}`; numerical positions are not semantic equivalence.',
 '','The 12 House functions are already present in Atlas ONE PR #42. The Sphere adapters and node-specific behavior below are proposals.',
 '','**Each metric is a pre-registered measurement plan, not an observed improvement.** One shared runtime; no automated resident assignments, model-weight changes, private creative ingestion, or CANON ratification.',
 '']
 for house in plan['houses']:
  out.extend([f'## {house["id"]} — {house["name"]}',f'Existing Atlas ONE function: `{house["existingAtlasOneCapability"]}`; gate `{house["existingGate"]}`.', '',
  'The module enforces input validity/source rights across twelve Spheres. It does not claim to be a subject expert.',''])
  for sp in [s for s in plan['spheres'] if s['house']==house['id']]:
   out.extend([f'### {sp["id"]} — {sp["name"]} ({"domain" if sp["role"]=="DOMAIN_SPECIALIZATION" else "epistemic method"})',
     f'**Implementation pathway:** {sp["implementationPathway"]}.',
     f'**Proposed slot:** `{sp["proposedAdapter"]}`. **Acceptance:** {sp["acceptanceGate"]}.',
     '', '| HSN seed | Source specialization | Planned primary metric | OpenAlex candidates | Evidence status |', '|---|---|---|---:|---|'])
   for rec in [n for n in plan['nodes'] if n['sphere']==sp['id']]:
    out.append(f'| `{rec["coordinate"]}` | {rec["nodeName"].replace("|","/")} | `{rec["metricFamily"]}` | {rec["openalex"]["totalCount"]} ({rec["openalex"]["primaryCount"]} primary) | Unmeasured |')
   out.append('')
 return '\n'.join(out)+'\n'

def render_exec_md(plan):
 count=sum(len(x['openalex']['candidateTopics']) for x in plan['nodes']);root=plan['root']
 return f'''# ATLAS × ARIADNE · One Civilizational Codebase — Implementation Roadmap v2

**SOURCE-BOUND ROADMAP**, not automatic completion, hosted performance gain, original semantic alignment or change of model weights.

## The one-system architecture

**Existing source custody:** Ariadne v0.7 original `{root['sourceSHA256']}`; historical OpenAlex frozen `{root['crosswalkSHA256']}`.

**Existing runtime:** Atlas ONE v2 `CivilizationUnifiedBuild` and its 12 House review functions are authoritative for shared Work source/fixture checks, subject to current host rights. AtlasGPT's `AriadneRegistry`/`prepareResearch` is the research-client port. SwarmChat is the existing owner-gated broker and Graph Fabric; no new broker or scheduler. Alexandria is the versioned source-custody layer. Existing Atlas ONE Librarian D1 queue is the only authorized public-metadata execution queue.

**New scope:** 144 proposed source-specific Sphere plugins and 1,728 source-derived executable work-order specifications with node-specific metrics. Each is a seed; each requires actual implementation and measurement. The 145th synthesis is the invariant-preserving integration receipt, not another knowledge node.

## Exact geometry, scope and roles

- 12 authentic source House names, **144 authentic Sphere names**.
- Each House has **7 entire DOMAIN_SPECIALIZATION Spheres and 5 entire EPISTEMIC_META Spheres**, each with 12 Nodes: 1,008 subject nodes and 720 method nodes.
- The 720 method nodes require an explicitly selected domain subject; no automatic SAME_AS to OpenAlex Topics.
- **{count:,} historical unreviewed OpenAlex candidate edges**, 4,516 T IDs (when source pin matches). No acceptance of topic correspondence is implied by address, lexical score or ranking.
- `H00.S00.N00` and `E145` are other symbolic namespaces, not the 1,729th HSN Node.

## Ports — reuse rather than replace

| Service | Existing stable surface / selected source | Adapter behavior | Hard boundary |
|---|---|---|---|
| Atlas ONE 2.0 | `packages/atlas-one-v2/src/civilization-unified.mjs` + `CivilizationWorkHostBridge` | Read source-qualified node manifest; apply existing 12 House gates and pure sphere candidate handlers | No second core, broker, scheduler or authority; publisher must check rights at READ/RETURN |
| AtlasGPT | `native-v2/src/index.mjs` `AriadneRegistry`, `prepareResearch` (existing program target) | Compile typed research hypotheses with exact v0.7 source pin; maintain false-friend holds | No model-weight update or unreviewed `SAME_AS`; no private Brain/Palace import |
| SwarmChat | Existing Work broker, source-ref Graph Fabric, room lineage | Display/peer-review Work-only candidate receipts with original seq/room/version; make subscriptions explicit | Do not infer resident authentication; deny protected counts, labels, clipboard and download on revoke-at-RETURN |
| Alexandria | Owner-private versioned Library/Drive roots | Read with source rights, preserve original editions, immutable provenance and dissent | Public Git must contain source-safe code rather than original private catalog |
| Atlas ONE Librarian | Existing D1 persisted queue, bounded public metadata tool | Register only independently approved and authenticated Work tasks; prepared packets are not job starts | Keep existing queue, budgets, idempotency and release gates |
| GF8 / GF9 | Noosphere existing source-only resonance and Rosetta adapters | Use source-calibrated physics, typed synthetic packets; compare cache against already-optimized runtime | No frequencies as HSN identity, no fake calibration or alien translation |
| ATLAS-EXCELLENCE-1728 | Distinct engineering namespace `EX.Wxx.Cyy.Pzz`, SHA `{EXCELLENCE_PLAN_SHA}` | Crosswalk reviewed capability-to-sphere relevance via evidence; explicitly many-to-many | Never positionally zip 144 capabilities to 144 Spheres or claim 1,728 program steps executed |

## Release plan — twelve bounded evidence gates

'''+ '\n'.join(f'**{i+1}. {p} — {a}:** {c}. Exit: {d}.' for i,(p,a,c,d) in enumerate(PHASES)) + '''

## Performance evaluation — 1,728 separately named metrics

Each node has one unique `METRIC.Hxx.Syy.Nzz`. Priorities are SOURCE/GATE first, not leaderboard rankings. The metric manifest records numerator and denominator, direction, owner/source identity, minimum 30 held-out cases and three negative cases, source/runner SHA, baseline and candidate. All 1,728 baseline/candidate fields remain NULL/UNMEASURED until an experiment runs.

An earned improvement requires a pre-registered paired comparison on current Atlas/GF9 baselines, a practical effect size and uncertainty interval, no falsifier regressions, rights and affected-group reviews, and independent acceptance. Zero unapproved exposures is non-offsettable; good average speed cannot compensate for one privacy or safety breach.

Local source-only validation of a roadmap compiler is NOT 1,728 behavioral improvements. The existing Atlas/Noosphere PRs already measure narrow indexed lookup and warm GF9 packet reuse; compare future changes to **those** current baselines, not an artificially slow linear search.

## Concrete scope before any hosted change

1. Source-read original Ariadne v0.7 bytes and frozen OpenAlex historical candidates; verify both independent SHA pins. Preserve exact labels and editions without publishing private source bytes.
2. Build the 12 House source/rights review functions once (reuse existing `CivilizationUnifiedBuild`). Add 144 independent source-labeled Sphere capability configurations. Generate node work orders/metric fixtures, not 1,728 duplicated orchestrators.
3. Add optional `SphereAdapter` prepared-only port and `NodeMetric` ledger to Atlas ONE; AtlasGPT may consume versioned source refs; SwarmChat may render authorized Work-only receipts. Require host publisher/identity for real actions.
4. Instrument real current-stack performance: source-resolution p50/p95, candidate precision/recall, complete coverage and false acceptance, cold/warm GF9 costs, D1 egress rights at RETURN, mobile accessibility, CPU/time/cost.
5. Run historical-language / GF9 physical/fiction pathways only as separately licensed, experimentally qualified Work proposals; preserve non-Work privacy.
6. Promote a node only after code + tests + CI + served build + independently observed metric. Aggregation is a count of earned node gains, never a scalar measure of civilizational welfare.

## Status now

Generated source-typed work orders: **1,728**; proposed Sphere adapters **144**; existing House review functions **12**. Real behavior changes in these 1,728 node requirements: **not established**. Independently demonstrated new hosted gains: **zero**. Latest Atlas Librarian `ATLAS-EXCELLENCE-1728` program reports **1,728 planned and zero implemented/verified/integrated**; its queue separately has two metadata acquisitions, not approved scientific crosswalks. Do not merge the two counts.
'''

def build(source_path,topics_path,out_dir,mode='original'):
 out=pathlib.Path(out_dir);out.mkdir(parents=True,exist_ok=True)
 b=pathlib.Path(source_path).read_bytes();c=pathlib.Path(topics_path).read_bytes()
 ss,cs=sha(b),sha(c)
 d=json.loads(b)
 links,edge= parse_crosswalk(c,cs,mode)
 plan=compile_plan(d,links,ss,cs,mode)
 writej(out/'ROADMAP_ROOT.json',plan['root'])
 writej(out/'HOUSE_MODULES_12.json',plan['houses']);writel(out/'SPHERE_PATHWAYS_144.jsonl',plan['spheres']);writel(out/'NODE_SEEDS_1728.jsonl',plan['nodes']);writel(out/'METRICS_1728.jsonl',plan['metrics']);writej(out/'PHASES_12.json',plan['phases'])
 (out/'ROADMAP_12_144_1728_COMPLETE.md').write_text(render_full_markdown(plan),encoding='utf-8')
 (out/'ROADMAP_EXECUTIVE.md').write_text(render_exec_md(plan),encoding='utf-8')
 manifest={'compiler':'atlas.roadmap.compiler-v2.1-merge-compatibility','sourceMode':mode,'ariadneSha256':ss,'openalexSha256':cs,'originalSourcePinsVerified':mode=='original',
      'sourceCopiedIntoPublicPackage':False,'planRootSha256':plan['root']['roadmapSHA256'],'historicalTopicStats':edge,
      'roadmapStats':{'houses':len(plan['houses']),'spheres':len(plan['spheres']),'nodeSeeds':len(plan['nodes']),'metrics':len(plan['metrics']),
                       'baselineValuesRecorded':sum(m['baselineValue'] is not None for m in plan['metrics']),
                       'gainsEarned':sum(m['achievementStatus']=='EARNED' for m in plan['metrics'])},
      'artifacts':{}}
 for p in sorted(out.glob('*')):
  if p.is_file() and p.name not in ('MANIFEST_SHA256.json','INDEPENDENT_AUDIT.json','ATLAS_1728_ROADMAP_EXPLORER.html'):manifest['artifacts'][p.name]=sha(p.read_bytes())
 writej(out/'MANIFEST_SHA256.json',manifest)
 return plan,manifest

if __name__=='__main__':
 import argparse
 ap=argparse.ArgumentParser();ap.add_argument('--ariadne',required=True);ap.add_argument('--openalex',required=True);ap.add_argument('--out',required=True);ap.add_argument('--mode',choices=['original','synthetic'],default='original');v=ap.parse_args()
 p,m=build(v.ariadne,v.openalex,v.out,v.mode)
 print(json.dumps({'schema':m['compiler'],'h':len(p['houses']),'s':len(p['spheres']),'n':len(p['nodes']),
   'candidateEdges':m['historicalTopicStats']['candidateEdges'],'gainCount':m['roadmapStats']['gainsEarned'],
   'roadmapSha256':p['root']['roadmapSHA256']},indent=2))
