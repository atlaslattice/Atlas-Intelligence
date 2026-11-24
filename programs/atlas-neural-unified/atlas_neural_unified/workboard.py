"""One append-only *reference* index for Workboard/Atlas/SWARM, not host storage.

Only sanitized, source-digest-bound Work references are accepted. No bodies,
embeddings, user text, non-Work modes, private Palace/Imagine content or
model training observations are imported. This module never authenticates a
principal, posts to SwarmChat, grants consent or revokes a host permission.
"""
from __future__ import annotations
from dataclasses import dataclass
from hashlib import sha256
import json
import re

COORD = re.compile(r'^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$')
SHA = re.compile(r'^[0-9a-f]{64}$')
R_SCHEMA='atlas.one.prepared-workboard-reference/v1'

class WorkboardError(ValueError): pass

def _canon(x):return json.dumps(x,sort_keys=True,ensure_ascii=True,separators=(',',':'),allow_nan=False)

def prepare_component_record(*,source_id,source_revision,source_digest,hsn,card_id,component_id,
                             source_kind='WORK',source_text=None,source_mode='WORK',scope='WORK'):
    if source_text is not None or source_mode!='WORK' or scope!='WORK' or source_kind!='WORK':
        raise WorkboardError('SOURCE_NOT_ELIGIBLE_FOR_WORK_REFERENCE')
    for field,value in [('source_id',source_id),('source_revision',source_revision),('card_id',card_id),('component_id',component_id)]:
        if not isinstance(value,str) or not re.fullmatch(r'[A-Za-z0-9_./:@-]{2,200}',value):
            raise WorkboardError('INVALID_'+field.upper())
    if not SHA.fullmatch(source_digest):raise WorkboardError('SOURCE_DIGEST')
    if not COORD.fullmatch(hsn):raise WorkboardError('HSN_IDENTITY')
    return {'schema':R_SCHEMA,'cardId':card_id,'hsn':hsn,'componentId':component_id,'sourceId':source_id,
            'sourceRevision':source_revision,'sourceDigest':source_digest,'scope':'WORK',
            'semanticAccepted':False,'authorityEffect':'NONE','canTrain':False,
            'sourceBodiesIncluded':False,'status':'PREPARED_REFERENCE_ONLY'}

@dataclass(frozen=True)
class WorkboardIndexReceipt:
    action:str
    revision:str
    entries:int
    sourceId:str
    status:str='LOCAL_REFERENCE_INDEX_ONLY'

class PreparedWorkboardIndex:
    def __init__(self, trusted_bindings=None):
        # Optional exact authorizing inventory: cardId->{hsn,sourceId,sourceDigest}.
        # Without an independently supplied inventory entries are local proposals
        # only; no source-authentication or host rights are inferred.
        if trusted_bindings is not None and not isinstance(trusted_bindings,dict):
            raise WorkboardError('TRUSTED_INVENTORY_SHAPE')
        self._trusted_bindings=trusted_bindings.copy() if trusted_bindings is not None else None
        self._entries={}
        self._revoked=set()
        self._history=[]
    def _revision(self):
        snap={'entries':sorted(self._entries.values(),key=lambda x:x['cardId']),
              'revoked':sorted(self._revoked)}
        return sha256(_canon(snap).encode('utf8')).hexdigest()
    @property
    def index_revision(self):return self._revision()
    def put(self,record):
        if not isinstance(record,dict) or set(record)!={'schema','cardId','hsn','componentId','sourceId','sourceRevision','sourceDigest','scope','semanticAccepted','authorityEffect','canTrain','sourceBodiesIncluded','status'}:
            raise WorkboardError('REFERENCE_SCHEMA')
        expected=prepare_component_record(source_id=record['sourceId'],source_revision=record['sourceRevision'],
                source_digest=record['sourceDigest'],hsn=record['hsn'],card_id=record['cardId'],component_id=record['componentId'])
        if record!=expected:raise WorkboardError('SOURCE_REFERENCE_MUTATION')
        if self._trusted_bindings is not None:
            source=self._trusted_bindings.get(record['cardId'])
            if not isinstance(source,dict) or source!={
                'hsn':record['hsn'],'sourceId':record['sourceId'],'sourceDigest':record['sourceDigest']}:
                raise WorkboardError('TRUSTED_SOURCE_REFERENCE_MISMATCH')
        if record['sourceId'] in self._revoked:raise WorkboardError('SOURCE_REVOKED')
        old=self._entries.get(record['cardId'])
        if old is not None and old!=record:raise WorkboardError('IMMUTABLE_CARD_ID_CONFLICT')
        if old is None:self._entries[record['cardId']]=record.copy()
        status='NO_CHANGE' if old is not None else 'PREPARED_NEW'
        receipt=WorkboardIndexReceipt(status,self._revision(),len(self._entries),record['sourceId'])
        self._history.append(receipt)
        return receipt
    def withdraw(self,source_id):
        if not isinstance(source_id,str) or not source_id:raise WorkboardError('SOURCE_ID')
        changed=source_id not in self._revoked
        self._revoked.add(source_id)
        rcpt=WorkboardIndexReceipt('PREPARED_WITHDRAWAL' if changed else 'NO_CHANGE',self._revision(),len(self._entries),source_id)
        self._history.append(rcpt)
        return rcpt
    def lookup(self,hsn,*, purpose_check=None, disclosure_check=None, consumer='AtlasONE'):
        # The callbacks MUST come from a trusted host for any eventual release.
        # Passing local lambdas here is only a synthetic proof, never an IAM test.
        if not COORD.fullmatch(hsn) or consumer not in {'AtlasONE','AtlasGPT','SwarmChatWork','Ariadne'}:
            raise WorkboardError('INVALID_SEARCH_OR_CONSUMER')
        if not callable(purpose_check) or not callable(disclosure_check):
            return {'status':'HOLD_CURRENT_HOST_AUTHORITY_REQUIRED','references':[],'indexRevision':self._revision(),'hostVerified':False}
        hits=[]
        for x in sorted(self._entries.values(),key=lambda x:x['cardId']):
            if x['hsn']!=hsn or x['sourceId'] in self._revoked:continue
            request={'sourceId':x['sourceId'],'sourceRevision':x['sourceRevision'],'sourceDigest':x['sourceDigest'],
                     'purpose':'INFERENCE_USE','consumer':consumer,'hsn':hsn}
            try:
                use=purpose_check(request)
                see=disclosure_check(dict(request,purpose='DISCLOSURE_RETURN'))
            except Exception:use=see=False
            if use is True and see is True:
                hits.append({k:x[k] for k in ('cardId','hsn','componentId','sourceId','sourceRevision','sourceDigest')})
        return {'status':'SYNTHETIC_PREPARED_REFERENCES_ONLY' if hits else 'HOLD_NO_ELIGIBLE_REFERENCES',
                'references':hits,'indexRevision':self._revision(),'hostVerified':False,'canTrain':False,'canPublish':False}
