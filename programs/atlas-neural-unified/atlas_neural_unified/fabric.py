"""One real 384 -> 1728 -> 144 -> 12 neural computation, source-indexed.

This is a native, opt-in Geometree *candidate* over existing frozen BGE
embeddings. It does not instantiate a second pretrained encoder, retriever,
rights issuer, Canon interpreter or new permanent network service. Its public
result is source-free candidate metadata; the existing trusted gateway remains
responsible for inference-use, disclosure, revocation and physical egress.

Default alpha=0 and gates=0 gives bitwise-preserved baseline node scores.
The 12/144 trainable grouping parameters are not pretrained, and no ontology
alignment or cross-domain generalization is implied by their shape.
"""
from __future__ import annotations
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
import json
import io
import math
import re
from typing import Sequence
import numpy as np

SCHEMA = 'atlas.one.shared-neural-fabric/v1'
REGISTRY_SHA256 = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
EDITION = 'ariadne-reader/v0.7'
HSN = re.compile(r'^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$')
VECTOR_DIM = 384
NODE_COUNT = 1728
SPHERE_COUNT = 144
HOUSE_COUNT = 12
MAX_BATCH = 128

class NeuralFabricError(ValueError): pass

def all_coordinates():
    return tuple(f'H{h:02d}.S{s:02d}.N{n:02d}' for h in range(1,13) for s in range(1,13) for n in range(1,13))

IDS = all_coordinates()
INDEX = {x:i for i,x in enumerate(IDS)}
HOUSE = np.repeat(np.arange(12),144)
SPHERE = np.repeat(np.arange(144),12)

# The 12 actual vertices of a cuboctahedron. Exact geometric neighbors have
# squared Euclidean distance 2. Internal coordinate topology is a hypothesis.
_VERTICES = tuple((a,b,c) for a in (-1,0,1) for b in (-1,0,1) for c in (-1,0,1)
                  if (a==0)+(b==0)+(c==0)==1)
_NEIGHBORS = tuple(tuple(j for j,q in enumerate(_VERTICES)
                         if sum((u-v)**2 for u,v in zip(p,q))==2) for p in _VERTICES)
if len(_VERTICES)!=12 or any(len(x)!=4 for x in _NEIGHBORS): raise AssertionError('CUBO_GRAPH')

def _shape(positions):
    return tuple(positions)

def _ports(profile:str, seed:int, house_peers:bool):
    if profile not in ('GEOMETREE','SHUFFLED_MATCHED') or type(seed) is not int or not 0<=seed<2**32:
        raise NeuralFabricError('UNKNOWN_PROFILE_OR_SEED')
    # Independent axis permutations preserve degree/operation budgets. Shuffling
    # changes *internal* routing only; externally authored HSN ids never move.
    perms=[]
    for axis in ('node','sphere','house'):
        if profile=='GEOMETREE': perm=tuple(range(12))
        else: perm=tuple(sorted(range(12),key=lambda i:sha256(f'ATLAS-HSN:{seed}:{axis}:{i}'.encode()).digest()))
        inv={perm[i]:i for i in range(12)}
        perms.append(tuple(tuple(perm[j] for j in _NEIGHBORS[inv[i]]) for i in range(12)))
    axes=[(2,perms[0]),(1,perms[1])]
    if house_peers:axes.append((0,perms[2]))
    positions=[(i//144,(i//12)%12,i%12) for i in range(NODE_COUNT)]
    out=np.empty((4*len(axes),NODE_COUNT),dtype=np.int32)
    for k,(axis,neighbours) in enumerate(axes):
        for i,p in enumerate(positions):
            for j,dest in enumerate(neighbours[p[axis]]):
                h,s,n=p
                if axis==0:h=dest
                elif axis==1:s=dest
                else:n=dest
                out[4*k+j,i]=144*h+12*s+n
    out.setflags(write=False)
    return out

def validate_source_registry(raw:bytes) -> dict:
    """Verify actual original bytes, not a caller-supplied digest or a sibling alias."""
    if not isinstance(raw,bytes) or not 0<len(raw)<=8_388_608 or sha256(raw).hexdigest()!=REGISTRY_SHA256:
        raise NeuralFabricError('ARIADNE_SOURCE_BYTES_MISMATCH')
    try: source=json.loads(raw)
    except Exception as e: raise NeuralFabricError('ARIADNE_JSON') from e
    nodes=source.get('nodes')
    if not isinstance(nodes,dict) or len(nodes)!=NODE_COUNT or set(nodes)!=set(IDS):
        raise NeuralFabricError('ARIADNE_NODE_IDENTITY')
    for hsn in IDS:
        x=nodes[hsn]
        _,s,_=HSN.fullmatch(hsn).groups()
        expect='DOMAIN_SPECIALIZATION' if int(s)<=7 else 'EPISTEMIC_META'
        if not isinstance(x,dict) or x.get('id')!=hsn or x.get('kind')!=expect or x.get('parent')!=hsn[:7]:
            raise NeuralFabricError('ARIADNE_HSN_ROLE_OR_PARENT')
    return {'registrySha256':REGISTRY_SHA256,'edition':EDITION,'nodes':NODE_COUNT,'spheres':SPHERE_COUNT,
            'houses':HOUSE_COUNT,'domainNodes':1008,'methodNodes':720,'recordHashMode':'SOURCE_BYTES_VERIFIED'}

def _finite_array(value,shape, name):
    try:a=np.asarray(value,dtype=np.float32)
    except Exception as e:raise NeuralFabricError(name+'_INVALID') from e
    if a.shape!=shape or not np.isfinite(a).all():raise NeuralFabricError(name+'_INVALID')
    return a.copy()

def _safe_softmax(x):
    z=x.astype(np.float64)-np.max(x)
    ex=np.exp(z)
    return ex/ex.sum()

@dataclass(frozen=True)
class FabricSources:
    originalRegistrySha256: str
    vectorAssetSha256: str
    encoderRevision: str
    vectorAssetKind: str
    sourceVerified: bool

class AtlasOneNeuralFabric:
    """One shared matrix-based neural substrate with reversible feature gates.

    Real semantic projection: N(1728 x 384) @ q(384), then native 12-fold
    topology message passing and 156 optional trainable House/Sphere biases.
    Data input is numerical and source-bound; external services are typed ports,
    not extra neurons or implicit training data.
    """
    def __init__(self, node_vectors, *, vector_asset_sha256:str, encoder_revision:str,
                 source_registry_bytes:bytes|None=None, vector_asset_bytes:bytes|None=None, profile='GEOMETREE', seed=145,
                 house_peers=True, alpha=0.0, require_normalized=True):
        if type(alpha) not in (int,float) or not math.isfinite(alpha) or not 0<=alpha<=1:
            raise NeuralFabricError('MIX_ALPHA')
        if not isinstance(vector_asset_sha256,str) or not re.fullmatch(r'[0-9a-f]{64}',vector_asset_sha256):
            raise NeuralFabricError('VECTOR_ASSET_PIN')
        if not isinstance(encoder_revision,str) or not 8<=len(encoder_revision)<=200:
            raise NeuralFabricError('ENCODER_REVISION')
        self.nodes=_finite_array(node_vectors,(NODE_COUNT,VECTOR_DIM),'NODE_VECTORS')
        if require_normalized and not np.allclose(np.linalg.norm(self.nodes,axis=1),1,atol=5e-4):
            raise NeuralFabricError('NODE_VECTORS_NOT_UNIT')
        self.nodes.setflags(write=False)
        self.registry_verified=False
        self.vector_asset_verified=False
        if source_registry_bytes is not None:
            validate_source_registry(source_registry_bytes)
            self.registry_verified=True
        if vector_asset_bytes is not None:
            if not isinstance(vector_asset_bytes,bytes) or sha256(vector_asset_bytes).hexdigest()!=vector_asset_sha256:
                raise NeuralFabricError('NODE_VECTOR_SOURCE_ASSET_DIGEST')
            try:
                with np.load(io.BytesIO(vector_asset_bytes),allow_pickle=False) as artifact:
                    if 'nodes' not in artifact.files or artifact['nodes'].shape!=(NODE_COUNT,VECTOR_DIM) or not np.array_equal(artifact['nodes'],self.nodes):
                        raise NeuralFabricError('NODE_VECTOR_SOURCE_ASSET_MISMATCH')
            except NeuralFabricError:raise
            except Exception as e:raise NeuralFabricError('NODE_VECTOR_SOURCE_ASSET_INVALID') from e
            self.vector_asset_verified=True
        self.sources=FabricSources(REGISTRY_SHA256,vector_asset_sha256,encoder_revision,
                                   'PINNED_PRECOMPUTED_384D_NODE_EMBEDDINGS',self.registry_verified and self.vector_asset_verified)
        self.profile,self.seed,self.alpha,self.house_peers=profile,seed,float(alpha),house_peers
        self.ports=_ports(profile,seed,house_peers)
        self.house_gates=np.zeros(HOUSE_COUNT,dtype=np.float64)
        self.sphere_gates=np.zeros(SPHERE_COUNT,dtype=np.float64)
        self.learning_steps=0

    def baseline(self, query):
        q=_finite_array(query,(VECTOR_DIM,),'QUERY_VECTOR')
        if not np.isclose(np.linalg.norm(q),1,atol=5e-4):raise NeuralFabricError('QUERY_NOT_UNIT')
        return self.nodes@q

    def routed_scores(self, query, *, use_gates=False, alpha=None):
        raw=self.baseline(query)
        mix=self.alpha if alpha is None else alpha
        if type(mix) not in (int,float) or not math.isfinite(mix) or not 0<=mix<=1:raise NeuralFabricError('MIX_ALPHA')
        if mix==0: mixed=raw.copy()  # byte identical to standalone BGE cosine projection
        else:
            # Accumulate in float64 for finite safety; topology is fixed under seed.
            with np.errstate(over='raise',invalid='raise'):
                others=np.zeros(NODE_COUNT,dtype=np.float64)
                for port in self.ports: others+=raw[port]
                mixed=((1-mix)*raw.astype(np.float64)+mix*others/len(self.ports))
        if use_gates:
            mixed=mixed+self.house_gates[HOUSE]+self.sphere_gates[SPHERE]
        if not np.isfinite(mixed).all():raise NeuralFabricError('NONFINITE_ROUTING')
        return mixed

    def forward(self, query, *, top_k=10, use_gates=False, alpha=None):
        if type(top_k) is not int or not 1<=top_k<=20:raise NeuralFabricError('TOP_K')
        values=self.routed_scores(query,use_gates=use_gates,alpha=alpha)
        # Deterministic exact ordering; HSN ids are immutable tie keys.
        order=sorted(range(NODE_COUNT), key=lambda i:(-float(values[i]),IDS[i]))[:top_k]
        means=np.mean(values.reshape(12,144),axis=1)
        mass=np.mean(np.abs(values.reshape(12,144)),axis=1)
        winners=[{'hsn':IDS[i], 'score':float(values[i]),'house':f'H{i//144+1:02}',
                  'sphere':f'H{i//144+1:02}.S{(i//12)%12+1:02}',
                  'role':'DOMAIN_SPECIALIZATION' if (i//12)%12<7 else 'EPISTEMIC_META',
                  'semanticAccepted':False} for i in order]
        return {'schema':SCHEMA,'status':'PREPARED_NUMERIC_REVIEW_ONLY','sourceVerified':self.sources.sourceVerified,'registryVerified':self.registry_verified,
                'registrySha256':REGISTRY_SHA256,'nodeVectorAssetSha256':self.sources.vectorAssetSha256,
                'encoderRevision':self.sources.encoderRevision,
                'neuralDimension':VECTOR_DIM,'addressedNodes':NODE_COUNT,'routingProfile':self.profile,
                'routingAlpha':self.alpha if alpha is None else float(alpha),'gatesApplied':bool(use_gates),
                'gateTrainingSteps':self.learning_steps,'hits':winners,
                'meta145':{'type':'READ_ONLY_HOUSE_SUMMARY','id':'E145','extraLatentUnits':0,
                           'houseMeans':[float(a) for a in means],'houseMass':[float(x) for x in mass]},
                'canTrain':False,'canDiscloseSource':False,'canPublish':False,
                'hostedBindingVerified':False,'sourceBodiesReturned':False,
                'warning':'Neural ranking only; source USE/RETURN, item rights and hosted final egress belong to trusted existing gateway.'}

    def train_synthetic_gates(self, queries, targets:Sequence[str], *, steps=30, learning_rate=0.15,
                              fixture_kind=None, alpha=0):
        """Actually optimize 156 local gate scalars on explicitly synthetic data.

        Does not touch BGE encoder, neural vectors, existing graph checkpoints or
        TRAIN episodes; never use real/restricted data through this method.
        """
        if fixture_kind!='SYNTHETIC_TEST_ONLY':raise NeuralFabricError('TRAIN_SOURCE_NOT_ELIGIBLE')
        q=np.asarray(queries,dtype=np.float32)
        if q.ndim!=2 or q.shape[1]!=VECTOR_DIM or not 1<=len(q)<=64 or not np.isfinite(q).all():
            raise NeuralFabricError('TRAIN_MATRIX')
        if len(targets)!=len(q) or not all(t in INDEX for t in targets):
            raise NeuralFabricError('TRAIN_TARGETS')
        if not np.allclose(np.linalg.norm(q,axis=1),1,atol=5e-4):raise NeuralFabricError('TRAIN_NORMALIZATION')
        if type(steps) is not int or not 1<=steps<=100 or type(learning_rate) not in (float,int) or not 0<learning_rate<=1:
            raise NeuralFabricError('TRAIN_BUDGET')
        starts=[];ends=[]
        for _ in range(steps):
            gh=np.zeros(12);gs=np.zeros(144);loss=0.0
            for row,target in zip(q,targets):
                scores=self.routed_scores(row,use_gates=True,alpha=alpha).astype(np.float64)
                p=_safe_softmax(scores)
                idx=INDEX[target];loss-=math.log(max(p[idx],1e-300))
                p[idx]-=1.0
                gh+=p.reshape(12,144).sum(axis=1)
                gs+=p.reshape(144,12).sum(axis=1)
            loss/=len(q)
            (starts if not starts else ends).append(loss)
            self.house_gates-=learning_rate*gh/len(q)
            self.sphere_gates-=learning_rate*gs/len(q)
            self.learning_steps+=1
        final=0.0
        for row,target in zip(q,targets):
            p=_safe_softmax(self.routed_scores(row,use_gates=True,alpha=alpha))
            final-=math.log(max(p[INDEX[target]],1e-300))
        final/=len(q)
        if not np.isfinite(self.house_gates).all() or not np.isfinite(self.sphere_gates).all():raise NeuralFabricError('NONFINITE_GATES')
        return {'status':'SYNTHETIC_LOCAL_GATES_UPDATED','steps':steps,'trainableParameters':156,
                'initialLoss':float(starts[0]),'finalLoss':float(final),'encoderWeightsChanged':False,
                'sourceNodeVectorsChanged':False,'trainingEvidenceAccepted':False,'deploymentAuthorized':False,
                'qualityGeneralizationMeasured':False}

    def state_digest(self):
        return sha256(self.house_gates.astype('<f8',copy=False).tobytes()+
                      self.sphere_gates.astype('<f8',copy=False).tobytes()).hexdigest()

    def descriptor(self):
        return {'schema':SCHEMA,'sourceRegistry':REGISTRY_SHA256,'sourceVerified':self.sources.sourceVerified,'registryVerified':self.registry_verified,
                'encoderRevision':self.sources.encoderRevision,'nodeVectorAssetSha256':self.sources.vectorAssetSha256,
                'nodeCount':1728,'houseCount':12,'sphereCount':144,'semanticDim':384,
                'trainableGateParameters':156,'stepsSynthetic':self.learning_steps,
                'gateStateDigest':self.state_digest(),'profile':self.profile,'alpha':self.alpha,
                'topologyDigest':sha256(self.ports.astype('<i4',copy=False).tobytes()).hexdigest(),
                'edgeTerms':int(self.ports.size),'meta145ExtraUnits':0,'neuralAuthority':'NONE',
                'onePretrainedEncoder':True,'neuralTrainingPerformed':False if self.learning_steps==0 else 'SYNTHETIC_GATES_ONLY',
                'hosted':False}
