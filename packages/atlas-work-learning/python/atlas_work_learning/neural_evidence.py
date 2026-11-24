"""Atlas META145 neural-first *evidence* sidecar, no model training or host grants.

This module consumes rankings from an existing neural retriever; it does not create,
mutate, embed or impersonate the owner's MICA/BGE model. All local ACL callbacks
are fixtures, never authentication evidence. Source bodies never enter outputs.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Callable, Iterable, Mapping
from hashlib import sha256
import json, re

ARIADNE_SHA = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
# Public fixtures use a synthetic release. Real release pins are supplied only at
# an authenticated host / in an owner-private local configuration, not Git.
SYNTHETIC_RELEASE_SHA = sha256(b'SYNTHETIC_TEST_PRETRAINED_RELEASE').hexdigest()
SYNTHETIC_ENCODER_REVISION = 'SYNTHETIC_ENCODER_NOT_BGE'
HSN = re.compile(r'^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$')
HEX64 = re.compile(r'^[0-9a-f]{64}$')
ROUTES = frozenset(('NEURAL_DIRECT', 'GRAPH_EXPANSION', 'LEXICAL_BACKUP'))
RELATIONS = frozenset(('SUPPORTS', 'CONTRADICTS', 'UNRESOLVED', 'RELATED'))


def stable_digest(x) -> str:
    return sha256(json.dumps(x, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode('utf8')).hexdigest()

@dataclass(frozen=True)
class Policy:
    family_bonus: float = 0.0
    dissent_bonus: float = 0.0
    min_score: float = 0.40
    max_items: int = 3
    def __post_init__(self):
        if not (0 <= self.family_bonus <= 1 and 0 <= self.dissent_bonus <= 1 and
                0 <= self.min_score <= 1 and 1 <= self.max_items <= 12):
            raise ValueError('INVALID_POLICY')


def _claim_shape(c):
    if not isinstance(c, dict): return False
    if not HSN.fullmatch(str(c.get('hsn', ''))): return False
    if c.get('sourceRegistrySha') != ARIADNE_SHA: return False
    if c.get('route') not in ROUTES: return False
    if isinstance(c.get('score'), bool) or not isinstance(c.get('score'), (int, float)): return False
    import math
    if not math.isfinite(c['score']) or not 0 <= c['score'] <= 1: return False
    if not isinstance(c.get('sourceId'), str) or not c['sourceId']: return False
    if not isinstance(c.get('documentId'), str) or not c['documentId']: return False
    if not HEX64.fullmatch(str(c.get('sourceSha256', ''))): return False
    if not isinstance(c.get('revision'), str) or not c['revision']: return False
    if not isinstance(c.get('semanticDigest'), str) or not HEX64.fullmatch(c['semanticDigest']): return False
    if not isinstance(c.get('citation'), str) or not c['citation'].startswith('https://') or len(c['citation']) > 600: return False
    if c.get('mode') != 'WORK': return False
    # No source bodies or purported actor/authorization grants in the caller envelope.
    if {'body','text','passage','privateBody','authorized','hostApproved','canonApproved','residentId'} & c.keys():return False
    return True


def evaluate_neural_return(
    ranked: Iterable[dict],
    source_record: Callable[[str], Mapping | None],
    authorize: Callable[[Mapping, str], bool],
    *,
    hsn: str,
    policy: Policy = Policy(),
    expected_registry_sha: str = ARIADNE_SHA,
    expected_release_sha: str = SYNTHETIC_RELEASE_SHA,
    current_release_sha: str = SYNTHETIC_RELEASE_SHA,
    expected_encoder_revision: str = SYNTHETIC_ENCODER_REVISION,
    current_encoder_revision: str = SYNTHETIC_ENCODER_REVISION,
    now: int = 1000,
    subject_hsn: str | None = None,
) -> dict:
    """Review a bounded neural candidate list against independent current source facts.

    `authorize` is a **synthetic** or host-injected checker; returning True is NOT proof
    of host identity. Current authoritative checks must be repeated by the real
    publisher inside an atomic egress transaction. This function returns source
    references ONLY, never private excerpts or self-asserted authorization.
    """
    if expected_registry_sha != ARIADNE_SHA or not HEX64.fullmatch(str(expected_release_sha)) or current_release_sha != expected_release_sha or current_encoder_revision != expected_encoder_revision or not isinstance(expected_encoder_revision,str) or not expected_encoder_revision:
        return {'status':'HOLD_RELEASE_DRIFT','returned':[], 'denied':{},'hostVerified':False}
    if not HSN.fullmatch(hsn):
        return {'status':'HOLD_BAD_HSN','returned':[],'denied':{},'hostVerified':False}
    if int(hsn[5:7]) >= 8 and not (subject_hsn and HSN.fullmatch(subject_hsn) and subject_hsn[:3] == hsn[:3] and int(subject_hsn[5:7]) <= 7):
        return {'status':'HOLD_METHOD_REQUIRES_SUBJECT','returned':[], 'denied':{},'hostVerified':False}
    ranked = list(ranked)
    if len(ranked) > 256:
        return {'status':'HOLD_EXCESS_CANDIDATES','returned':[], 'denied':{},'hostVerified':False}
    prepared = []
    denied = {}
    for i, c in enumerate(ranked):
        reason = None
        if not _claim_shape(c): reason = 'INVALID_OR_UNTRUSTED_CANDIDATE'
        elif c['hsn'] != hsn: reason = 'WRONG_HSN'
        else:
            try: authoritative = source_record(c['sourceId'])
            except Exception: authoritative = None
            if not isinstance(authoritative, Mapping): reason = 'NO_TRUSTED_SOURCE_RECORD'
            elif any(c[k] != authoritative.get(k) for k in ('sourceId','documentId','revision','sourceSha256','semanticDigest','citation')):
                reason = 'SOURCE_IDENTITY_OR_REVISION_DRIFT'
            elif authoritative.get('workAllowed') is not True or authoritative.get('mode') != 'WORK':
                reason = 'NOT_WORK_ELIGIBLE'
            elif not isinstance(authoritative.get('familyRoot'),str) or not authoritative['familyRoot']:
                reason = 'NO_AUTHORITATIVE_FAMILY'
            elif authoritative.get('correctedBy') is not None or authoritative.get('active') is not True:
                reason = 'SUPERSEDED_OR_INACTIVE'
            elif not isinstance(authoritative.get('validFrom'),int) or not isinstance(authoritative.get('validUntil'),int) or not authoritative['validFrom'] <= now < authoritative['validUntil']:
                reason = 'OUTSIDE_VALID_INTERVAL'
            else:
                before_authorize = dict(authoritative)
                try: allowed = authorize(authoritative, 'READ') is True
                except Exception: allowed = False
                if not allowed: reason = 'READ_HOLD'
                else:
                    try: postread = source_record(c['sourceId'])
                    except Exception: postread = None
                    if not isinstance(postread,Mapping) or any(postread.get(k) != before_authorize.get(k) for k in ('sourceId','documentId','revision','sourceSha256','semanticDigest','citation','familyRoot','correctedBy','active','validFrom','validUntil','workAllowed','mode','rightsEpoch')):
                        reason='READ_SOURCE_OR_RIGHTS_DRIFT'
        if reason:
            denied[reason] = denied.get(reason,0)+1
            continue
        if c['score'] < policy.min_score:
            denied['BELOW_SCORE_THRESHOLD'] = denied.get('BELOW_SCORE_THRESHOLD',0)+1
            continue
        relation = authoritative.get('relation', 'UNRESOLVED')
        if relation not in RELATIONS: relation = 'UNRESOLVED'
        # Snapshot trusted scalar source facts; never hold a mutable alias across awaits/callbacks.
        prepared.append((dict(c), {k:before_authorize.get(k) for k in ('documentId','sourceId','revision','sourceSha256','semanticDigest','citation','familyRoot','relation','correctedBy','active','validFrom','validUntil','workAllowed','mode','rightsEpoch')}, relation, i))
    chosen=[]
    seen_family=set()
    seen_exact_source=set()
    while prepared and len(chosen) < policy.max_items:
        def rank(z):
            c,a,rel,i=z
            # Root novelty and dissent affect *review order*, not source truth.
            family=a['familyRoot']
            independent= family!='UNKNOWN' and family not in seen_family
            return (c['score'] + policy.family_bonus * int(independent) + policy.dissent_bonus * int(rel=='CONTRADICTS'),-i)
        win=max(prepared,key=rank)
        prepared.remove(win)
        c,a,rel,i=win
        exact_source_key=(c['sourceId'],c['documentId'],c['revision'])
        if exact_source_key in seen_exact_source:
            denied['DUPLICATE_EXACT_SOURCE']=denied.get('DUPLICATE_EXACT_SOURCE',0)+1
            continue
        # Current evidence + rights check AGAIN at RETURN; mock result is never host proof.
        try: fresh=source_record(c['sourceId'])
        except Exception: fresh=None
        if not isinstance(fresh,Mapping) or any(fresh.get(k) != a.get(k) for k in ('sourceId','documentId','revision','sourceSha256','semanticDigest','citation','familyRoot','correctedBy','active','validFrom','validUntil','workAllowed','mode','rightsEpoch')):
            denied['RETURN_SOURCE_OR_RIGHTS_DRIFT']=denied.get('RETURN_SOURCE_OR_RIGHTS_DRIFT',0)+1
            continue
        try: allowed=authorize(fresh,'RETURN') is True
        except Exception: allowed=False
        if not allowed:
            denied['RETURN_ACCESS_DENIED']=denied.get('RETURN_ACCESS_DENIED',0)+1
            continue
        # Detect source mutation performed inside an otherwise ALLOW callback.
        try: latest=source_record(c['sourceId'])
        except Exception: latest=None
        if not isinstance(latest,Mapping) or any(latest.get(k) != a.get(k) for k in ('sourceId','documentId','revision','sourceSha256','semanticDigest','citation','familyRoot','correctedBy','active','validFrom','validUntil','workAllowed','mode','rightsEpoch')):
            denied['RETURN_SOURCE_OR_RIGHTS_DRIFT']=denied.get('RETURN_SOURCE_OR_RIGHTS_DRIFT',0)+1
            continue
        seen_family.add(a['familyRoot'])
        seen_exact_source.add(exact_source_key)
        # No raw text/embedding/acl token, never promote a review proposal.
        chosen.append({'documentId':c['documentId'],'sourceId':c['sourceId'],'citation':c['citation'],'score':c['score'],
                       'route':c['route'],'sourceSha256':c['sourceSha256'], 'revision':c['revision'],
                       'familyRoot':a['familyRoot'],'relation':rel,'status':'UNREVIEWED', 'rankBeforeFilter':i+1,
                       'independentFamilyCountEligible':a['familyRoot']!='UNKNOWN'})
    roots={x['familyRoot'] for x in chosen if x['familyRoot']!='UNKNOWN'}
    return {
        'schema':'atlas.neural.evidence-return-preview/v0.1',
        'status':'LOCAL_SOURCE_REFERENCE_PREVIEW_NOT_HOST_AUTHORIZED' if chosen else 'ABSTAIN_NO_ELIGIBLE_EVIDENCE',
        'hsn':hsn, 'returned':chosen, 'denied':denied, 'directNeuralCount':sum(x['route']=='NEURAL_DIRECT' for x in chosen),
        'graphCount':sum(x['route']=='GRAPH_EXPANSION' for x in chosen),
        'lexicalBackupCount':sum(x['route']=='LEXICAL_BACKUP' for x in chosen),
        'independentRoots':len(roots), 'dissentRetained':any(x['relation']=='CONTRADICTS' for x in chosen),
        'hostVerified':False,'modelWeightsChanged':False,'acceptedSemanticEdges':0,
        'releaseSha256':expected_release_sha, 'sourceRegistrySha256':expected_registry_sha
    }


def eligible_training_pair(evidence: Mapping, trusted: Mapping, rights_for_training: bool) -> dict:
    """Narrow export gate; no corpus text, no positive label from model prediction."""
    if not isinstance(evidence,Mapping) or not isinstance(trusted,Mapping): return {'status':'HOLD'}
    if not rights_for_training or evidence.get('status')!='HUMAN_REVIEWED_ACCEPTED':return {'status':'HOLD'}
    if trusted.get('trainReuseAllowed') is not True or trusted.get('familyRoot') in (None,'UNKNOWN'):return {'status':'HOLD'}
    if evidence.get('sourceId')!=trusted.get('sourceId') or evidence.get('sourceSha256')!=trusted.get('sourceSha256'):return {'status':'HOLD'}
    if evidence.get('split') not in ('TRAIN','VALIDATION'):return {'status':'HOLD'}
    if trusted.get('mode')!='WORK' or trusted.get('active') is not True:return {'status':'HOLD'}
    return {'status':'PREPARED_SOURCE_REF_ONLY_NOT_TRAINED','sourceId':trusted['sourceId'],'familyRoot':trusted['familyRoot'],'split':evidence['split']}


def eligible_training_pair_strict(evidence: Mapping, trusted: Mapping, rights_for_training: bool,
                                  trusted_family_splits: Mapping[str, list[str]] | None) -> dict:
    """Source-reference-only family-split guard; caller must bind manifest from trusted admission.

    A supplied map is NOT itself evidence of authority or permission. A real exporter
    must acquire and pin this independently of the optimization candidate.
    """
    base = eligible_training_pair(evidence,trusted,rights_for_training)
    if base['status'] != 'PREPARED_SOURCE_REF_ONLY_NOT_TRAINED':return base
    if not isinstance(trusted_family_splits, Mapping):return {'status':'HOLD_FAMILY_SPLIT_UNVERIFIED'}
    splits=trusted_family_splits.get(trusted['familyRoot'])
    if not isinstance(splits,list) or not splits:return {'status':'HOLD_FAMILY_SPLIT_UNVERIFIED'}
    if set(splits) != {evidence['split']}:return {'status':'HOLD_FAMILY_SPLIT_COLLISION'}
    return base
