"""Typed cross-domain discovery proposals, kept outside neural-label authority."""
from __future__ import annotations
from hashlib import sha256
import json,re
from .fabric import IDS,HSN,REGISTRY_SHA256

SHA=re.compile(r'^[a-f0-9]{64}$')
TYPES=('CONTRADICTS','SUPPORTS','ANALOGY_CANDIDATE','SEMANTIC_CANDIDATE','PART_OF','SUPERSEDES','METHOD_APPLIES_TO','ENCODING_COLLISION_ONLY')

class GraphEvidenceError(ValueError):pass

class TypedEdgeReview:
    def __init__(self): self._edges={}
    def propose(self,*,src,dst,relation,source_id,source_digest,source_version,scope='WORK',evidence_kind='UNREVIEWED'):
        if not HSN.fullmatch(src or '') or not HSN.fullmatch(dst or '') or relation not in TYPES:
            raise GraphEvidenceError('TYPED_EDGE_INVALID')
        if src==dst and relation in ('SUPERSEDES','CONTRADICTS'):
            raise GraphEvidenceError('SELF_EDGE_UNSUPPORTED')
        if scope!='WORK' or evidence_kind!='UNREVIEWED':raise GraphEvidenceError('WRONG_SCOPE_OR_TRUTH_PROMOTION')
        if not isinstance(source_id,str) or not source_id.startswith('work:') or not SHA.fullmatch(source_digest or ''):
            raise GraphEvidenceError('SOURCE_BINDING_INVALID')
        if not isinstance(source_version,str) or not 1<=len(source_version)<=100:raise GraphEvidenceError('SOURCE_VERSION_INVALID')
        key=(src,dst,relation,source_id,source_digest,source_version)
        self._edges[key]={'src':src,'dst':dst,'relation':relation,'sourceId':source_id,
                          'sourceDigest':source_digest,'sourceVersion':source_version,
                          'semanticStatus':'UNREVIEWED','canTrain':False,'canRatify':False,
                          'sourceRole':'ORIGIN_EVIDENCE_REFERENCE','registrySha256':REGISTRY_SHA256}
        return {'status':'REVIEW_CANDIDATE_PREPARED','edgeCount':len(self._edges),'authorityEffect':'NONE'}
    def cross_house_proposals(self,hsn,*,limit=20):
        if not HSN.fullmatch(hsn or '') or type(limit) is not int or not 1<=limit<=20:raise GraphEvidenceError('QUERY_BOUNDS')
        edges=[x.copy() for x in self._edges.values() if x['src']==hsn and x['dst'][:3]!=hsn[:3]]
        edges.sort(key=lambda x:(x['relation'],x['dst'],x['sourceId'],x['sourceVersion']))
        return {'status':'REVIEW_ONLY_UNVERIFIED_RELATIONSHIPS','edges':edges[:limit],
                'reported':len(edges),'neuralScoresChanged':False,'positiveTrainingLabels':0,
                'rightsGranted':False,'semanticAccepted':False,'canPublish':False}
