"""Read-only preview of matched, metric-specific improvement evidence.
No host-rights claims, CI claims, or promotion of scientific/civilizational benefit.
"""
import math,re
ALLOWED_DIRECTIONS={'higher','lower'}
COORD=re.compile(r'^METRIC\.H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$')

def _hold(reason):return {'status':'HOLD','reason':reason,'gainEarned':False,'reviewAccepted':False,'hostVerified':False}
def _tail_binomial(n,k):
    # P[X >= k], X~Bin(n,1/2): exact one-sided sign-test on discordant paired trials
    return sum(math.comb(n,i) for i in range(k,n+1)) / (2**n) if n else 1.0

def paired_preview(*,metric_id,direction,case_ids,baseline,candidate,baseline_source_sha,candidate_source_sha,
                   baseline_runtime_sha,candidate_runtime_sha,negative_cases,hard_gate_regressions=0,mode='WORK'):
    if mode!='WORK' or not COORD.fullmatch(metric_id or ''):return _hold('WORK_SCOPE_AND_METRIC_REQUIRED')
    if direction not in ALLOWED_DIRECTIONS:return _hold('DIRECTION_REQUIRED')
    if not isinstance(case_ids,list) or len(case_ids)<30 or any(not isinstance(x,str) or len(x)<3 for x in case_ids) or len(set(case_ids))!=len(case_ids):return _hold('INDEPENDENT_HELDOUT_CASE_IDS_REQUIRED')
    if not isinstance(baseline,list) or not isinstance(candidate,list) or not (len(baseline)==len(candidate)==len(case_ids)):return _hold('MATCHED_BASELINE_CANDIDATE_REQUIRED')
    if any(type(x) is not bool for x in baseline+candidate):return _hold('BOOLEAN_CASE_OUTCOMES_REQUIRED')
    if any(not isinstance(x,str) or not re.fullmatch(r'[a-f0-9]{40,64}',x) for x in [baseline_source_sha,candidate_source_sha,baseline_runtime_sha,candidate_runtime_sha]):return _hold('EXACT_SOURCE_AND_RUNTIME_SHA_REQUIRED')
    if baseline_source_sha!=candidate_source_sha:return _hold('SOURCE_EDITION_DRIFT')
    if not isinstance(negative_cases,int) or negative_cases<3:return _hold('NEGATIVE_CONTROL_INSUFFICIENT')
    if not isinstance(hard_gate_regressions,int) or hard_gate_regressions!=0:return _hold('NON_OFFSETTABLE_HARD_GATE_REGRESSION')
    b=sum(baseline);c=sum(candidate)
    benefit=(c-b) if direction=='higher' else (b-c)
    improvements=sum((x is False and y is True) if direction=='higher' else (x is True and y is False) for x,y in zip(baseline,candidate))
    regressions=sum((x is True and y is False) if direction=='higher' else (x is False and y is True) for x,y in zip(baseline,candidate))
    pval=_tail_binomial(improvements+regressions,improvements)
    rate_delta=benefit/len(case_ids)
    strong=rate_delta>=0.05 and pval<0.05 and improvements>regressions
    return {'schema':'atlas.roadmap.paired-improvement-preview/v1','status':('LOCAL_STATISTICAL_CANDIDATE_FOR_REVIEW' if strong else 'NO_GAIN_ESTABLISHED'),
       'metricId':metric_id,'direction':direction,'cases':len(case_ids),'discordantCases':improvements+regressions,
       'improvements':improvements,'regressions':regressions,'baselineEvents':b,'candidateEvents':c,
       'absoluteBenefitDelta':round(rate_delta,8),'oneSidedExactSignTestP':round(pval,10),
       'sourceDigest':baseline_source_sha,'baselineCode':baseline_runtime_sha,'candidateCode':candidate_runtime_sha,
       'gainEarned':False,'reviewAccepted':False,'hostVerified':False,'independentReviewRequired':True,
       'limitations':['synthetic or caller-supplied evidence is not proof of independent labeling',
                      'does not attest actual Work READ/RETURN permissions',
                      'observed change is not civilizational welfare or scientific truth']}
