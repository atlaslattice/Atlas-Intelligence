"""Atlas Foundry 1728: original Ariadne-source-gated engineering work-order compiler.

This is a local reference implementation, not a hosted source-rights issuer,
resident-turn simulator, or neural-model training/runtime.
Python 3.11+ standard library only. No network or external services.
"""
from __future__ import annotations
import copy
import hashlib
import json
import re
from collections import Counter
from dataclasses import dataclass
from typing import Any

ORIGINAL_SHA256 = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
EDITION = 'original-v0.7'
HSN_RE = re.compile(r'^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$')
SPHERE_RE = re.compile(r'^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])$')
SHA_RE = re.compile(r'^[0-9a-f]{64}$')
ROLE_DOMAIN = 'DOMAIN_SPECIALIZATION'
ROLE_METHOD = 'EPISTEMIC_META'
NODE_COUNT = 1728
SPHERE_COUNT = 144
HOUSE_COUNT = 12
PORTS = ('ARIADNE','NEURAL_HEAD','GEOMETREE','GRAPH_FABRIC','META145','GLYPH',
         'ATLASGPT','SWARMCHAT_WORK','WORK_LEARNING','EVIDENCE_MEMORY',
         'RESEARCH_LAB','GOVERNANCE')
PHASES = ('SOURCE_IDENTITY','STRUCTURAL_ROLE','PARENT_CHILD','SOURCE_RECORD',
          'GEOMETRIC_CROSSWALK','EVIDENCE_LINEAGE','NEURAL_ISSUANCE_SEAM',
          'WORK_GRAPH_ADAPTER','RIGHTS_AND_SUBJECT','ADVERSE_CLOSURE',
          'REPRODUCIBLE_TEST','REVERSIBLE_RELEASE')
SAFE_MODES = ('WORK',)

class SourceContractError(ValueError): pass


def canonical_bytes(data: Any) -> bytes:
    return json.dumps(data,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode('utf-8')


def sha(data: bytes) -> str: return hashlib.sha256(data).hexdigest()


def digest(data: Any,domain: str) -> str:
    return sha(domain.encode('utf-8')+b'\x00'+canonical_bytes(data))


def address(h:int,s:int,n:int)->str:
    if any(type(x) is not int or x<1 or x>12 for x in (h,s,n)):
        raise SourceContractError('HSN_AXIS_INVALID')
    return f'H{h:02d}.S{s:02d}.N{n:02d}'


def ordinal(h:int,s:int,n:int)->int:
    address(h,s,n)
    return (h-1)*144+(s-1)*12+n-1


def from_ordinal(idx:int):
    if type(idx) is not int or not (0<=idx<1728): raise SourceContractError('ORDINAL_INVALID')
    return idx//144+1,(idx//12)%12+1,idx%12+1


def parse_address(text:str):
    match=HSN_RE.fullmatch(text) if type(text) is str else None
    if not match: raise SourceContractError('NONCANONICAL_HSN')
    return tuple(map(int, match.groups()))


def scope_role(s:int):
    if type(s) is not int or s<1 or s>12: raise SourceContractError('SPHERE_AXIS_INVALID')
    return ROLE_DOMAIN if s<=7 else ROLE_METHOD


def single_hsn_scope(hsn:str):
    h,s,n=parse_address(hsn)
    return {'hsn':hsn,'parent':f'H{h:02d}.S{s:02d}', 'house':f'H{h:02d}',
            'kind':scope_role(s),'ordinal':ordinal(h,s,n)}


def scope_allows(subject_hsn:str | None, method_hsn:str) -> bool:
    mh,ms,_ = parse_address(method_hsn)
    if ms<=7: return False
    if not subject_hsn: return False
    sh,ss,_=parse_address(subject_hsn)
    return sh==mh and ss<=7


def _axis_encode(x:int, edition:str):
    if type(x) is not int or x not in range(12): raise SourceContractError('SYMBOLIC_AXIS_INVALID')
    if edition=='cupwake-x4/v1':
        t=x//4; q=x%4; b=q%2; c=q//2
    elif edition=='symbiosis-x3/v0.3':
        t=x%3; q=x//3; b=q%2; c=q//2
    else: raise SourceContractError('SYMBOLIC_EDITION_REQUIRED')
    return t,b,c


def encode_symbol(hsn:str,edition:str):
    h,s,n=parse_address(hsn)
    z=[_axis_encode(v-1,edition) for v in (h,s,n)]
    lower=z[0][1]+2*z[1][1]+4*z[2][1]
    upper=z[0][2]+2*z[1][2]+4*z[2][2]
    context=z[0][0]+3*z[1][0]+9*z[2][0]
    return {'edition':edition,'symbol':lower+8*upper,'context':context,'hsn':hsn}


def decode_symbol(symbol:dict):
    if not isinstance(symbol,dict) or set(symbol)!=set(('edition','symbol','context','hsn')):
        raise SourceContractError('SYMBOLIC_FIELDS_INVALID')
    sym=symbol['symbol'];context=symbol['context'];edition=symbol['edition'];asserted=symbol['hsn']
    if type(sym)is not int or not 0<=sym<64 or type(context)is not int or not 0<=context<27:
        raise SourceContractError('SYMBOLIC_VALUE_INVALID')
    vals=[]
    for axis in range(3):
        t=(context//(3**axis))%3
        b=(sym//(2**axis))%2
        c=(sym//(2**(axis+3)))%2
        if edition=='cupwake-x4/v1': v=4*t+b+2*c
        elif edition=='symbiosis-x3/v0.3':v=3*(b+2*c)+t
        else: raise SourceContractError('SYMBOLIC_EDITION_REQUIRED')
        vals.append(v+1)
    expected=address(*vals)
    if expected!=asserted: raise SourceContractError('SYMBOLIC_FALSE_FRIEND')
    return expected


def validate_original(raw:bytes,*,check_sha=True)->dict:
    if type(raw)is not bytes or not raw: raise SourceContractError('ORIGINAL_BYTES_REQUIRED')
    if check_sha and sha(raw)!=ORIGINAL_SHA256: raise SourceContractError('ORIGINAL_SHA_MISMATCH')
    try: source=json.loads(raw)
    except (UnicodeDecodeError,json.JSONDecodeError) as e:raise SourceContractError('INVALID_SOURCE_JSON') from e
    if not isinstance(source,dict) or not all(isinstance(source.get(k),dict) for k in ('houses','spheres','nodes')):
        raise SourceContractError('SOURCE_SCHEMA')
    houses,spheres,nodes=source['houses'],source['spheres'],source['nodes']
    if (len(houses),len(spheres),len(nodes))!=(12,144,1728):raise SourceContractError('SOURCE_COUNTS')
    if set(houses)!={f'H{i:02d}' for i in range(1,13)}:raise SourceContractError('HOUSE_SET')
    if set(spheres)!={f'H{h:02d}.S{s:02d}' for h in range(1,13) for s in range(1,13)}:raise SourceContractError('SPHERE_SET')
    if set(nodes)!={address(*from_ordinal(i)) for i in range(1728)}:raise SourceContractError('NODE_SET')
    for h in range(1,13):
        house=f'H{h:02d}';x=houses[house]
        if (x.get('id'),x.get('parent'),x.get('level'))!=(house,None,'House') or not isinstance(x.get('name'),str) or not x['name']:
            raise SourceContractError('HOUSE_RECORD_INVALID')
        expected=[f'{house}.S{s:02d}' for s in range(1,13)]
        if x.get('children')!=expected: raise SourceContractError('HOUSE_CHILDREN_CHANGED')
        for s in range(1,13):
            sphere=f'{house}.S{s:02d}';y=spheres[sphere]
            if (y.get('id'),y.get('parent'),y.get('level'))!=(sphere,house,'Sphere') or not isinstance(y.get('name'),str) or not y['name']:
                raise SourceContractError('SPHERE_RECORD_INVALID')
            children=[f'{sphere}.N{n:02d}' for n in range(1,13)]
            if y.get('children')!=children:raise SourceContractError('SPHERE_CHILDREN_CHANGED')
            for n in range(1,13):
                hsn=f'{sphere}.N{n:02d}';z=nodes[hsn];expected_role=scope_role(s)
                if (z.get('id'),z.get('parent'),z.get('level'),z.get('kind'))!=(hsn,sphere,'Node',expected_role):
                    raise SourceContractError('NODE_ID_PARENT_ROLE_CHANGED')
                if not isinstance(z.get('name'),str) or not z['name'] or not SHA_RE.fullmatch(str(z.get('source_record_sha256'))):
                    raise SourceContractError('NODE_NAME_OR_RECORD_SHA')
                if expected_role==ROLE_METHOD and (not isinstance(z.get('lens'),str) or not z['lens'].startswith('M')):
                    raise SourceContractError('METHOD_LENS_MISSING')
    return source


def verify_owner_catalog(source:dict,catalog:dict):
    if catalog.get('originalSourceSha256')!=ORIGINAL_SHA256:raise SourceContractError('OWNER_CATALOG_SOURCE_MISMATCH')
    labels=catalog.get('nodes',{})
    if set(labels)!=set(source['nodes']):raise SourceContractError('OWNER_CATALOG_NODE_SET')
    for hsn, original in source['nodes'].items():
        recorded=labels[hsn]
        if (recorded.get('label'),recorded.get('parent'),recorded.get('kind'),recorded.get('sourceRecordSha256')) != (
            original['name'],original['parent'],original['kind'],original['source_record_sha256']):
            raise SourceContractError('OWNER_CATALOG_NODE_DRIFT')
    return True


def build_work_order(original:dict,index:int,*,private:bool):
    h,s,n=from_ordinal(index);hsn=address(h,s,n);source=original['nodes'][hsn]
    house=f'H{h:02d}';sphere=f'{house}.S{s:02d}'
    method=s>=8
    result={
        'taskId':f'AF1728-{index+1:04d}',
        'canonical':hsn,
        'ordinal':index,
        'houseId':house,
        'sphereId':sphere,
        'role':source['kind'],
        'workflowNamespace':'atlas.foundry.workorder/v1',
        'originalOntologyEdition':EDITION,
        'originalOntologySha256':ORIGINAL_SHA256,
        'sourceRecordSha256':source['source_record_sha256'] if private else None,
        'sourcePinStatus':'EXACT_RAW_SHA_VERIFIED',
        'engineeringObjective':('Stage verified DOMAIN node evidence/adapter without semantic promotion' if not method
                                else 'Stage METHOD contract; require explicit same-House DOMAIN subject before inference'),
        'methodSubjectHsn':None,
        'methodSubjectStatus':'REQUIRES_EXPLICIT_SOURCE_REVIEW' if method else 'NOT_APPLICABLE',
        'phaseNames':list(PHASES),
        'integrationTargets':list(PORTS),
        'inputs': ['original-Ariadne-v0.7-source', 'source-specific-proof', 'current-WORK-rights',
                   'same-issuance-384D+1728-score-frame', 'independent-five-family-closure'],
        'outputs': ['source-pinned-typed-node-receipt', 'review-only-graph-candidate',
                    'read-only-home-navigation', 'zero-promotion-verification'],
        'rollback':'Detach this node adapter and source candidates; preserve canonical source, prior receipts, and original runtime',
        'approvalEffect':'NONE',
        'neuralModelCalls':0,
        'collaboratorTurns':0,
        'implementationStatus':'REVIEW_AND_HOST_INTEGRATION_PENDING',
        'semanticApproval':'NOT_REVIEWED',
        'requiredRealAcceptance':['independent-source-licence-and-use','explicit-method-subject-if-applicable',
             'host-branded-issuer','complete-adverse-evidence', 'atomic-final-return', 'fresh-heldout-quality'],
    }
    if private:result.update({'nodeName':source['name'],'sphereName':original['spheres'][sphere]['name'],
                               'houseName':original['houses'][house]['name'],
                               'sourceScopeStatus':source.get('scope_status'),
                               'sourceDefinition':source.get('definition')})
    result['workOrderSha256']=digest(result,'atlas.foundry.workorder/v1')
    return result


def assemble_merkle(leaf_digests:list[str]):
    if not leaf_digests:raise SourceContractError('NO_LEAVES')
    layer=[bytes.fromhex(x) for x in leaf_digests]
    levels=0
    while len(layer)>1:
        if len(layer)%2: layer.append(layer[-1])
        layer=[hashlib.sha256(b'atlas.merkle.v1\x00'+layer[i]+layer[i+1]).digest() for i in range(0,len(layer),2)]
        levels+=1
    return layer[0].hex(),levels


def compile_program(original:dict,*,private:bool=False):
    items=[build_work_order(original,i,private=private) for i in range(1728)]
    workroot,height=assemble_merkle([x['workOrderSha256'] for x in items])
    return {'schema':'atlas.foundry.workorders-1728/v1','edition':EDITION,
            'originalOntologySha256':ORIGINAL_SHA256,'privateOwnerLabels':private,
            'taskCount':1728,'sphereCount':144,'houseCount':12,
            'sourceMeaningsChanged':False,'plannedRealIntegrationCompletions':0,
            'workOrderMerkleRoot':workroot,'merkleHeight':height,
            'orders':items}


def verify_node_work_order(original:dict, task:dict):
    idx=task['ordinal'];h,s,n=from_ordinal(idx);hsn=address(h,s,n);node=original['nodes'][hsn]
    checks={}
    checks['canonical-id']=task['canonical']==hsn
    checks['house-and-sphere']=task['houseId']==f'H{h:02d}' and task['sphereId']==f'H{h:02d}.S{s:02d}'
    checks['parent-and-id']=node['parent']==task['sphereId'] and node['id']==hsn
    checks['role-and-lens']=node['kind']==scope_role(s) and task['role']==scope_role(s) and (s<=7 or str(node['lens']).startswith('M'))
    checks['source-record']=task.get('sourceRecordSha256') in (None,node['source_record_sha256'])
    checks['identity-reversible']=from_ordinal(ordinal(h,s,n))==(h,s,n)
    checks['symbolic-x4-reversible']=decode_symbol(encode_symbol(hsn,'cupwake-x4/v1'))==hsn
    checks['symbolic-x3-reversible']=decode_symbol(encode_symbol(hsn,'symbiosis-x3/v0.3'))==hsn
    checks['method-fail-closed']=not scope_allows(None,hsn) if s>=8 else task['methodSubjectStatus']=='NOT_APPLICABLE'
    checks['no-external-work-credit']=task['collaboratorTurns']==0 and task['neuralModelCalls']==0
    checks['unpromoted-approval']=task['semanticApproval']=='NOT_REVIEWED' and task['approvalEffect']=='NONE'
    checks['namespace-separation']=task['workflowNamespace']!='ariadne-reader/v0.7' and task['phaseNames']==list(PHASES)
    if not all(checks.values()):
        raise SourceContractError('TASK_CHECK_FAILED:'+hsn+':'+','.join(k for k,v in checks.items() if not v))
    return checks


def run_1728(original:dict,program:dict):
    if program.get('taskCount')!=1728 or len(program.get('orders',[]))!=1728:raise SourceContractError('PLAN_MISSING_NODES')
    if program.get('originalOntologySha256')!=ORIGINAL_SHA256:raise SourceContractError('PLAN_SOURCE_DRIFT')
    evidence=[]
    for idx,task in enumerate(program['orders']):
        if task['ordinal']!=idx or task['taskId']!=f'AF1728-{idx+1:04d}':raise SourceContractError('TASK_ID_ORDER_DRIFT')
        expected=build_work_order(original,idx,private=program['privateOwnerLabels'])
        if expected!=task:raise SourceContractError('WORKORDER_TAMPERED')
        checks=verify_node_work_order(original,task)
        evidence.append({'taskId':task['taskId'],'hsn':task['canonical'],
                         'structuralStatus':'LOCAL_STRUCTURAL_CHECK_COMPLETE','checksPassed':len(checks),
                         'implementationStatus':task['implementationStatus'],
                         'workOrderSha256':task['workOrderSha256'],
                         'evidenceSha256':digest([task['workOrderSha256'],list(checks)],'atlas.foundry.node-check/v1')})
    root,height=assemble_merkle([x['workOrderSha256'] for x in program['orders']])
    if root!=program['workOrderMerkleRoot']:raise SourceContractError('WORKORDER_ROOT_DRIFT')
    if len(set(x['hsn'] for x in evidence))!=1728:raise SourceContractError('DUPLICATE_HSN')
    for h in range(1,13):
        for s in range(1,13):
            key=f'H{h:02d}.S{s:02d}'
            if sum(x['hsn'].startswith(key+'.') for x in evidence)!=12:raise SourceContractError('SPHERE_COVERAGE_DRIFT')
    pairs=[(encode_symbol(x['hsn'],'cupwake-x4/v1'),encode_symbol(x['hsn'],'symbiosis-x3/v0.3')) for x in evidence]
    false_friends=sum((a['symbol'],a['context'])!=(b['symbol'],b['context']) for a,b in pairs)
    counts=dict(Counter(x['role'] for x in program['orders']))
    summary={'schema':'atlas.foundry.execution.v1','status':'LOCAL_STRUCTURAL_VERIFICATION_COMPLETE',
             'sourceSha256':ORIGINAL_SHA256,'nodeWorkOrdersPrepared':1728,
             'individualWorkOrdersStructurallyChecked':len(evidence),
             'uniqueNodeChecksRun':len(evidence)*12,'sphereRollupsChecked':144,'houseRollupsChecked':12,
             'domainNodes':counts[ROLE_DOMAIN],'methodNodes':counts[ROLE_METHOD],
             'symbolicEditionsCompared':['cupwake-x4/v1','symbiosis-x3/v0.3'],
             'symbolicPairsDiffering':false_friends,
             'workOrderMerkleRoot':root,'evidenceRootSha256':digest([r['evidenceSha256'] for r in evidence],'atlas.foundry.test-receipts/v1'),
             'realHostedIntegrationCompletions':0,'realCollaboratorTurnsCounted':0,
             'neuralWeightUpdates':0,'semanticAdoptions':0,'productionSourceRightsGranted':False,
             'hostedAcceptanceVerified':False,'rollbacksApplied':0,'offlineOnly':True}
    return summary,evidence


def verify_nonpromotion(results:dict):
    if results.get('realHostedIntegrationCompletions') or results.get('realCollaboratorTurnsCounted'):
        raise SourceContractError('INFLATED_ACTION_COMPLETION')
    if results.get('semanticAdoptions') or results.get('neuralWeightUpdates'):
        raise SourceContractError('INFLATED_SEMANTIC_STATUS')
    return True

# A cuboctahedron gives 12 display vertices with 4 incident edges each.
# The three axes below describe **storage/display topology only**; graph edges
# never imply semantic equivalence, trust, or a scientific relationship.
CUBO_VERTICES = tuple((a,b,c) for a in (-1,0,1) for b in (-1,0,1) for c in (-1,0,1)
                      if (a==0)+(b==0)+(c==0)==1)
CUBO_PORTS = tuple(tuple(j for j,y in enumerate(CUBO_VERTICES)
                         if sum((u-v)**2 for u,v in zip(x,y))==2)
                   for x in CUBO_VERTICES)
assert len(CUBO_VERTICES)==12 and all(len(x)==4 for x in CUBO_PORTS)


def geometric_neighbors(hsn:str):
    h,s,n=parse_address(hsn)
    axes=(h-1,s-1,n-1)
    output=[]
    for axis in range(3):
        for neighbor in CUBO_PORTS[axes[axis]]:
            target=list(axes);target[axis]=neighbor
            output.append(address(*(x+1 for x in target)))
    if len(set(output))!=12 or hsn in output: raise SourceContractError('TOPOLOGY_DUPLICATE_OR_SELF')
    return tuple(output)


def topology_summary():
    edges={hsn:set(geometric_neighbors(hsn)) for hsn in (address(*from_ordinal(i)) for i in range(1728))}
    for a,targets in edges.items():
        if len(targets)!=12:raise SourceContractError('TOPOLOGY_DEGREE_DRIFT')
        if not all(a in edges[b] for b in targets):raise SourceContractError('TOPOLOGY_NONRECIPROCAL')
    return {'schema':'atlas.foundry.geometry-reference/v1','nodeCount':1728,
            'degreePerNode':12,'directedStructuralEdges':sum(len(x) for x in edges.values()),
            'undirectedStructuralEdges':sum(len(x) for x in edges.values())//2,
            'semanticEdgeAcceptances':0,'neuralWeightUpdates':0,
            'role':'STORAGE_AND_DISPLAY_TOPOLOGY_ONLY'}


def merkle_proof(digests:list[str],index:int):
    if type(index)is not int or index<0 or index>=len(digests):raise SourceContractError('MERKLE_INDEX')
    layer=[bytes.fromhex(x) for x in digests];proof=[];pos=index
    while len(layer)>1:
        if len(layer)%2:layer.append(layer[-1])
        sibling=pos^1
        proof.append({'siblingSha256':layer[sibling].hex(),'side':'L' if sibling<pos else 'R'})
        layer=[hashlib.sha256(b'atlas.merkle.v1\x00'+layer[i]+layer[i+1]).digest() for i in range(0,len(layer),2)]
        pos//=2
    return proof


def verify_merkle_proof(leaf_sha:str,proof:list[dict],root:str):
    cur=bytes.fromhex(leaf_sha)
    for x in proof:
        sibling=bytes.fromhex(x['siblingSha256'])
        if x['side']=='L':left,right=sibling,cur
        elif x['side']=='R':left,right=cur,sibling
        else:raise SourceContractError('MERKLE_SIDE_INVALID')
        cur=hashlib.sha256(b'atlas.merkle.v1\x00'+left+right).digest()
    return cur.hex()==root


def local_view_contract(issued:dict,*,mode='WORK',required_set_independent=False,host_rights_verified=False):
    # No synthetic caller flags may turn this code into a live authorization issuer.
    if mode not in SAFE_MODES:
        return {'status':'HOLD_PRIVATE_MODE','releaseAuthorized':False,'coordinatesReturned':False}
    if type(issued) is not dict or issued.get('status') not in ('PREPARED_PEER_INSPECTION_ONLY','PREPARED_NOT_RELEASED'):
        return {'status':'HOLD_NOT_BRANDED_ISSUANCE','releaseAuthorized':False,'coordinatesReturned':False}
    if not (required_set_independent and host_rights_verified):
        return {'status':'HOLD_HOST_SOURCE_OR_CLOSURE','releaseAuthorized':False,'coordinatesReturned':False}
    return {'status':'LOCAL_TYPED_VIEW_PREPARED_NOT_RELEASED','releaseAuthorized':False,'coordinatesReturned':False,
            'finalHostReturnStillRequired':True}
