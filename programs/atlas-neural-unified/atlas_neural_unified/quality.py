"""Atlas ONE quality-first *offline review*, source-ID-only, no hosted authority.

This intentionally does not modify the retrieval model or decide production rollout.
The input is an independently constructed, bounded, frozen, JSON-native evaluation
packet; source provenance and human review need separate trusted attestation.
"""
from __future__ import annotations
from collections import defaultdict
from hashlib import sha256
import json
import math
import random
import re
from typing import Any

SCHEMA = 'atlas.one.quality-first-review/v1'
REGISTRY_SHA256 = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
_SHA = re.compile(r'^[0-9a-f]{64}$')
_HOUSE = re.compile(r'^H(0[1-9]|1[0-2])$')
_ID = re.compile(r'^[A-Za-z0-9_.:/@-]{3,100}$')
_ROW_KEYS = frozenset({'queryId','house','sourceFamily','sourceRevisionSha256',
                       'baselineRank','candidateRank','baselineLatencyMs','candidateLatencyMs',
                       'baselineCitationOk','candidateCitationOk',
                       'baselineAbstentionOk','candidateAbstentionOk'})
_TOP_KEYS = frozenset({'schema','kind','scope','registrySha256','baselineCodeSha256',
                       'candidateCodeSha256','protocolSha256','corpusSnapshotSha256',
                       'humanLabelManifestSha256','knownTrainingFamilies','maxP95Ms',
                       'minNdcgGain','bootstrapSeed','rows'})
_SCOPE = {'FULL_12_HOUSES': (12,24), 'SCOPED_CROSS_HOUSE': (3,6)}

class QualityReviewError(ValueError):
    pass


def _is_sha(value):
    return isinstance(value,str) and _SHA.fullmatch(value) is not None


def _metric_rank(value):
    # None = relevant item not found in the candidate universe, never a fabricated zero rank.
    return value is None or (type(value) is int and 1 <= value <= 100000)


def _score(rank):
    return 1.0 / math.log2(rank + 1) if rank is not None and rank <= 10 else 0.0


def _hit(rank):
    return 1.0 if rank is not None and rank <= 10 else 0.0


def _mrr(rank):
    return 1.0 / rank if rank is not None else 0.0


def _p95(series):
    sorted_series=sorted(series)
    return sorted_series[math.ceil(.95*len(sorted_series))-1]


def _reject(reason, *, packet_digest=None):
    return {'schema':SCHEMA,'status':'HOLD_QUALITY_REVIEW','reason':reason,
            'packetDigest':packet_digest,'canDeploy':False,'canTrain':False,
            'canRatify':False,'humanVerificationAttested':False,'modelUpdated':False}


def _canonical(data):
    # Validated JSON-native inputs only. No custom classes, NaNs or borrowed objects.
    encoded=json.dumps(data,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False)
    if len(encoded.encode()) > 240000:
        raise QualityReviewError('PACKET_TOO_LARGE')
    obj=json.loads(encoded)
    if type(obj) is not dict:
        raise QualityReviewError('PACKET_NOT_OBJECT')
    return obj,sha256(encoded.encode()).hexdigest()


def review_quality_first(packet:dict[str,Any]) -> dict[str,Any]:
    """Compare matched quality/latency on original House- and family-pinned inputs.

    Numeric outputs are provisional. The routine never authenticates a label,
    trainer, rights issuer, budget, human reviewer or host release.
    """
    try:
        p,pin=_canonical(packet)
        if set(p)!=_TOP_KEYS or p['schema']!='atlas.one.quality-first-input/v1':
            return _reject('PACKET_CONTRACT',packet_digest=pin)
        if p['kind'] not in ('SYNTHETIC_TEST_ONLY','SOURCE_DECLARED_HUMAN_REVIEW'):
            return _reject('EVALUATION_KIND',packet_digest=pin)
        if p['scope'] not in _SCOPE:
            return _reject('UNKNOWN_SCOPE',packet_digest=pin)
        for field in ('registrySha256','baselineCodeSha256','candidateCodeSha256','protocolSha256',
                      'corpusSnapshotSha256','humanLabelManifestSha256'):
            if not _is_sha(p[field]):return _reject('SOURCE_DIGEST_INVALID',packet_digest=pin)
        if p['registrySha256']!=REGISTRY_SHA256:
            return _reject('REGISTRY_EDITION_MISMATCH',packet_digest=pin)
        if p['baselineCodeSha256']==p['candidateCodeSha256']:
            return _reject('NO_CODE_CHANGE',packet_digest=pin)
        if type(p['maxP95Ms']) not in (int,float) or not math.isfinite(p['maxP95Ms']) or not 1<=p['maxP95Ms']<=600000:
            return _reject('HARD_LATENCY_CAP_INVALID',packet_digest=pin)
        if type(p['minNdcgGain']) not in (int,float) or not math.isfinite(p['minNdcgGain']) or not 0<=p['minNdcgGain']<=0.25:
            return _reject('PRIMARY_GAIN_FLOOR_INVALID',packet_digest=pin)
        if type(p['bootstrapSeed']) is not int or not 0<=p['bootstrapSeed']<=2**32-1:
            return _reject('BOOTSTRAP_SEED_INVALID',packet_digest=pin)
        trains=p['knownTrainingFamilies']
        if not isinstance(trains,list) or len(trains)>4096 or len(set(trains))!=len(trains) or any(type(f) is not str or not _ID.fullmatch(f) for f in trains):
            return _reject('TRAINING_FAMILY_INVENTORY',packet_digest=pin)
        rows=p['rows']
        if not isinstance(rows,list) or not 6<=len(rows)<=240:
            return _reject('COHORT_SIZE',packet_digest=pin)
        seen=set();families=defaultdict(list);house_families=defaultdict(set);query_to_family={}
        baseline_time=[];candidate_time=[];citation_before=[];citation_after=[]
        abstention_before=[];abstention_after=[];b_hits=[];c_hits=[];b_mrr=[];c_mrr=[];b_ndcg=[];c_ndcg=[]
        trained=set(trains)
        for row in rows:
            if type(row) is not dict or set(row)!=_ROW_KEYS:
                return _reject('ROW_SHAPE',packet_digest=pin)
            q,house,family=row['queryId'],row['house'],row['sourceFamily']
            if any(type(k) is not str or not _ID.fullmatch(k) for k in (q,family)) or q in seen:
                return _reject('DUPLICATE_OR_INVALID_QUERY_ID',packet_digest=pin)
            seen.add(q)
            if type(house) is not str or not _HOUSE.fullmatch(house) or not _is_sha(row['sourceRevisionSha256']):
                return _reject('HOUSE_OR_SOURCE_REVISION',packet_digest=pin)
            if family in trained:
                return _reject('TRAIN_EVAL_FAMILY_LEAKAGE',packet_digest=pin)
            if family in query_to_family and query_to_family[family]!=house:
                return _reject('CROSS_HOUSE_CORRELATED_FAMILY',packet_digest=pin)
            query_to_family[family]=house
            for k in ('baselineRank','candidateRank'):
                if not _metric_rank(row[k]):return _reject('RANK_INVALID',packet_digest=pin)
            for k in ('baselineLatencyMs','candidateLatencyMs'):
                v=row[k]
                if type(v) not in (int,float) or not math.isfinite(v) or not 0<v<=600000:
                    return _reject('TIMING_INVALID',packet_digest=pin)
            for k in ('baselineCitationOk','candidateCitationOk','baselineAbstentionOk','candidateAbstentionOk'):
                if type(row[k]) is not bool:return _reject('QUALITY_FLAG_INVALID',packet_digest=pin)
            families[(house,family)].append((q,_score(row['candidateRank'])-_score(row['baselineRank'])))
            house_families[house].add(family)
            baseline_time.append(row['baselineLatencyMs']);candidate_time.append(row['candidateLatencyMs'])
            b_ndcg.append(_score(row['baselineRank']));c_ndcg.append(_score(row['candidateRank']))
            b_hits.append(_hit(row['baselineRank']));c_hits.append(_hit(row['candidateRank']))
            b_mrr.append(_mrr(row['baselineRank']));c_mrr.append(_mrr(row['candidateRank']))
            citation_before.append(row['baselineCitationOk']);citation_after.append(row['candidateCitationOk'])
            abstention_before.append(row['baselineAbstentionOk']);abstention_after.append(row['candidateAbstentionOk'])
        houses_required,families_required=_SCOPE[p['scope']]
        if len(house_families)<houses_required or len(families)<families_required:
            return _reject('INSUFFICIENT_INDEPENDENT_COVERAGE',packet_digest=pin)
        if p['scope']=='FULL_12_HOUSES' and any(len(house_families[f'H{h:02d}'])<2 for h in range(1,13)):
            return _reject('HOUSE_FAMILY_COVERAGE',packet_digest=pin)
        # Resample House clusters and nested family clusters, not individual queries.
        grouped=defaultdict(list)
        for (house,family),values in sorted(families.items()):
            grouped[house].append(sum(delta for _,delta in sorted(values))/len(values))
        house_means={h:sum(x)/len(x) for h,x in grouped.items()}
        observed=sum(house_means.values())/len(house_means)
        rng=random.Random(p['bootstrapSeed']);houses=sorted(grouped)
        boot=[]
        for _ in range(1000):
            sample_houses=[houses[rng.randrange(len(houses))] for k in houses]
            sampled=[]
            for h in sample_houses:
                vals=grouped[h]
                sampled.append(sum(vals[rng.randrange(len(vals))] for _ in vals)/len(vals))
            boot.append(sum(sampled)/len(sampled))
        boot.sort();lower,upper=boot[24],boot[974]
        p95b,p95c=_p95(baseline_time),_p95(candidate_time)
        def _p50(series):return sorted(series)[math.ceil(.5*len(series))-1]
        p50b,p50c=_p50(baseline_time),_p50(candidate_time)
        def avg(xs):return sum(xs)/len(xs)
        citation_losses=sum(a and not b for a,b in zip(citation_before,citation_after))
        abstention_losses=sum(a and not b for a,b in zip(abstention_before,abstention_after))
        per_house={h:round(m,6) for h,m in sorted(house_means.items())}
        hard_loss=citation_losses>0 or abstention_losses>0 or not all(citation_after) or not all(abstention_after)
        latency_over_cap=p95c>p['maxP95Ms']
        low_quality=lower<=p['minNdcgGain']
        big_house_drop=any(x < -0.05 for x in house_means.values())
        hit_drop=avg(c_hits)+.02 < avg(b_hits)
        # A quality gain *may* cost latency. A cap is a genuine bounded resource constraint.
        if hard_loss:
            verdict='REJECT_QUALITY_SAFETY_REGRESSION'
        elif latency_over_cap:
            verdict='HOLD_RESOURCE_CAP'
        elif big_house_drop or hit_drop:
            verdict='HOLD_SUBGROUP_QUALITY_REGRESSION'
        elif low_quality:
            verdict='HOLD_INSUFFICIENT_QUALITY_GAIN'
        elif p95c>p95b:
            verdict='REVIEW_QUALITY_GAIN_WITH_LATENCY_COST'
        else:
            verdict='REVIEW_QUALITY_GAIN_WITHOUT_P95_COST'
        result={
          'schema':SCHEMA,'status':verdict,'packetDigest':pin,'sourceRegistrySha256':REGISTRY_SHA256,
          'scope':p['scope'],'evaluationKind':p['kind'],'houses':len(house_families),
          'declaredIndependentFamilies':len(families),'queries':len(rows),'trainEvalOverlap':0,
          'primaryMetric':'HOUSE_CLUSTERED_SOURCE_FAMILY_NDCG_AT_10',
          'ndcgGain':round(observed,6),'clusterBootstrap95':[round(lower,6),round(upper,6)],
          'houseEffects':per_house,'hit10Baseline':round(avg(b_hits),6),'hit10Candidate':round(avg(c_hits),6),
          'mrrBaseline':round(avg(b_mrr),6),'mrrCandidate':round(avg(c_mrr),6),
          'citationRegressions':citation_losses,'abstentionRegressions':abstention_losses,
          'baselineP50Ms':round(p50b,6),'candidateP50Ms':round(p50c,6),
          'baselineP95Ms':round(p95b,6),'candidateP95Ms':round(p95c,6),
          'candidateSlowerP95':p95c>p95b,'maxP95Ms':p['maxP95Ms'],
          'incumbentRetained':True,'canTrain':False,'canDeploy':False,'canRatify':False,
          'independentHumanAttestationVerified':False,'hostedSourceRightsVerified':False,
          'candidatePromoted':False,'modelWeightsChanged':False,
          'warning':'Caller supplied test labels and timings. No human, source-rights or hosting attestation; never deploy on this local report.'}
        # Integrity of detached report. Does not assert true data or authorization.
        result['reviewDigest']=sha256(json.dumps(result,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()
        return result
    except (ValueError,TypeError,AttributeError,KeyError,OverflowError,RecursionError) as e:
        return _reject('UNTRUSTED_OR_MALFORMED_INPUT')


def synthetic_quality_cohort(*, improvement=True, regression=None, slower=True):
    """Only source-free synthetic metrics. Not human data or model execution."""
    salt={'baseline':'a'*64,'candidate':'b'*64,'protocol':'c'*64,'corpus':'d'*64,'label':'e'*64,'source':'f'*64}
    rows=[]
    for h in range(1,13):
        for f in range(2):
            rank=2 if improvement else 13
            if regression==(h,f):rank=13
            rows.append({'queryId':f'SYNQ_{h:02}_{f}', 'house':f'H{h:02}',
             'sourceFamily':f'SYNF_{h:02}_{f}', 'sourceRevisionSha256':salt['source'],
             'baselineRank':11, 'candidateRank':rank, 'baselineLatencyMs':25+h+f,
             'candidateLatencyMs':45+h+f if slower else 20+h+f,
             'baselineCitationOk':True,'candidateCitationOk':True,
             'baselineAbstentionOk':True,'candidateAbstentionOk':True})
    return {'schema':'atlas.one.quality-first-input/v1','kind':'SYNTHETIC_TEST_ONLY',
      'scope':'FULL_12_HOUSES','registrySha256':REGISTRY_SHA256,
      'baselineCodeSha256':salt['baseline'],'candidateCodeSha256':salt['candidate'],
      'protocolSha256':salt['protocol'],'corpusSnapshotSha256':salt['corpus'],
      'humanLabelManifestSha256':salt['label'],'knownTrainingFamilies':[],
      'maxP95Ms':500.0,'minNdcgGain':.01,'bootstrapSeed':145,'rows':rows}
