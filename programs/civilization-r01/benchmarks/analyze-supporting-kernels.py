"""Analyze the frozen twelve-kernel experiment without crediting node metrics."""
from __future__ import annotations
import hashlib
import json
import math
import statistics
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def canonical(v):return json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode()
def digest(raw):return hashlib.sha256(raw).hexdigest()
def median(v):return statistics.median(v)
def sign_p(margins):
    positive=sum(v>0 for v in margins);n=sum(v!=0 for v in margins)
    return sum(math.comb(n,k) for k in range(positive,n+1))/(2**n) if n else 1.0
def holm(values,family):
    result={};largest=0.0
    for i,(key,p) in enumerate(sorted(values.items(),key=lambda x:(x[1],x[0]))):
        largest=max(largest,min(1.0,p*(family-i)));result[key]=largest
    return result
def median_interval(values,alpha):
    values=sorted(values);n=len(values);k=0
    for candidate in range(1,n//2+1):
        if 2*sum(math.comb(n,j) for j in range(candidate))/(2**n)<=alpha:k=candidate
        else:break
    return {'lower':values[k-1] if k else None,'upper':values[n-k] if k else None,'unbounded':not bool(k),'coverage_at_least':1-alpha,'unit':'ms_per_request'}
def main():
    protocol_raw=(ROOT/'benchmarks/SUPPORTING_KERNEL_PROTOCOL.json').read_bytes();protocol=json.loads(protocol_raw);pin=digest(protocol_raw)
    raw=(ROOT/'outputs/SUPPORTING_KERNEL_RAW.jsonl').read_bytes();records=[json.loads(line) for line in raw.splitlines()]
    if records[0].get('protocolSha256')!=pin or any(r.get('recordType')=='ABORT' for r in records):raise ValueError('Missing preregistration or aborted experiment')
    blocks=records[1:]
    if len(blocks)!=480:raise ValueError('Incomplete preregistered blocks')
    planned={b['blockId']:b for b in protocol['blocks']}
    if len({b['blockId'] for b in blocks})!=480:raise ValueError('Duplicated blocks')
    for item in protocol['sourceFiles']:
        if digest((ROOT/item['path']).read_bytes())!=item['sha256']:raise ValueError('Source changed after registration: '+item['path'])
    for row in blocks:
        p=planned[row['blockId']]
        if any(row[k]!=p[k] for k in ['houseId','size','fixtureSeed','order']):raise ValueError('Block differs from preregistered design')
        if not row['exactOutputParity'] or row['protocolSha256']!=pin or row['sourceManifestSha256']!=protocol['sourceManifestSha256'] or row['environmentSha256']!=protocol['environmentSha256']:raise ValueError('Block evidence binding failed')
        for field in ['referenceMsPerRequest','candidateMsPerRequest','coldPrepareMs']:
            if type(row[field]) not in [int,float] or not math.isfinite(row[field]) or row[field]<=0:raise ValueError('Invalid timing')
        if len(row['repetitions'])!=7 or row['requests']!=16:raise ValueError('Repetition count changed')
    rows=[];pvalues={}
    for h in range(1,13):
        house=f'H{h:02}';data=[r for r in blocks if r['houseId']==house]
        if len(data)!=40 or sum(r['order']=='AB' for r in data)!=20:raise ValueError('Unbalanced or incomplete House')
        if len({r['fixtureSha256'] for r in data})!=40:raise ValueError('Workloads are not distinct')
        b=[r['referenceMsPerRequest'] for r in data];c=[r['candidateMsPerRequest'] for r in data]
        deltas=[x-y for x,y in zip(b,c)];margins=[x-y-.03*abs(x) for x,y in zip(b,c)];cold=median([r['coldPrepareMs'] for r in data]);gain=median(deltas)
        pvalues[house]=sign_p(margins)
        strata=[]
        for size in protocol['sizeStrata']:
            part=[r for r in data if r['size']==size]
            if len(part)!=10 or sum(r['order']=='AB' for r in part)!=5:raise ValueError('Unbalanced stratum')
            strata.append({'size':size,'blocks':10,'referenceMedianMsPerRequest':median([r['referenceMsPerRequest'] for r in part]),'candidateMedianMsPerRequest':median([r['candidateMsPerRequest'] for r in part]),'medianPairedDeltaMsPerRequest':median([r['referenceMsPerRequest']-r['candidateMsPerRequest'] for r in part]),'descriptiveOnly':True})
        rows.append({'houseId':house,'sphereId':data[0]['sphereId'],'service':data[0]['service'],'blocks':40,'sourceManifestSha256':protocol['sourceManifestSha256'],'environmentSha256':protocol['environmentSha256'],'qualityPassed':True,'referenceMedianMsPerRequest':median(b),'candidateMedianMsPerRequest':median(c),'medianPairedDeltaMsPerRequest':gain,'medianPairedRelativeGain':median([(x-y)/x for x,y in zip(b,c)]),'medianPairedRatio':median([x/y for x,y in zip(b,c)]),'medianPracticalMarginMsPerRequest':median(margins),'rawOneSidedSignP':pvalues[house],'medianDeltaIndividualInterval':median_interval(deltas,.05),'medianDeltaFamilywiseInterval':median_interval(deltas,.05/12),'coldPrepareMedianMs':cold,'approxQueriesToAmortizeEntirePrepare':math.ceil(cold/gain) if gain>0 else None,'blocksWithNonpositiveSaving':sum(x<=0 for x in deltas),'strata':strata,'productionGainClaimed':False,'primary1728MetricCredit':False})
    corrected=holm(pvalues,12);sensitivity=holm(pvalues,1728)
    for row in rows:
        h=row['houseId'];row['holm12AdjustedP']=corrected[h];row['holm1728SensitivityP']=sensitivity[h]
        if row['medianPairedDeltaMsPerRequest']<0:outcome='REGRESSION_OBSERVED'
        elif row['medianPracticalMarginMsPerRequest']<=0:outcome='NO_PRACTICAL_GAIN_OBSERVED'
        elif corrected[h]>.05:outcome='INCONCLUSIVE'
        else:outcome='LOCAL_SUPPORTING_KERNEL_GAIN_CANDIDATE'
        row['outcome']=outcome;row['sensitivityOnlyNoNodeCredit']=True
    counts={key:sum(r['outcome']==key for r in rows) for key in sorted({r['outcome'] for r in rows})}
    report={'schema':'atlas.r01.supporting-kernel-assessment.v1','status':'LOCAL_TIMINGS_COMPLETE','protocolSha256':pin,'rawArtifactSha256':digest(raw),'sourceManifestSha256':protocol['sourceManifestSha256'],'environment':protocol['environment'],'counts':counts,'registeredKernelHypotheses':12,'independentWorkloadProcesses':480,'timedPairedRepetitions':3360,'timedQueriesPerMethod':53760,'allExactOutputParity':True,'metrics':rows,'primary1728MetricContractsMeasured':0,'productionGainsVerified':0,'wholeSystemGainClaimed':False,'speedupsMultiplied':False,'interpretation':'Observed local executions on frozen synthetic software workloads. Fair warm comparison shares a validated immutable snapshot. Process isolation and distinct workload seeds do not establish production representativeness. Sign inference requires the stated fair-sign and independence assumptions. Twelve supporting-kernel hypotheses are separate from the original 1728 node contracts.','coldCostScope':'Full validation and index preparation; package import and model initialization are not timed as cold preparation.','regressionInference':'Regression flags describe observed median loss, not separately multiplicity-corrected regression discoveries.','preregistrationScope':protocol['registrationScope'],'sources':['https://www.itl.nist.gov/div898/software/dataplot/refman1/auxillar/signtest.htm','https://www.stat.ethz.ch/R-manual/R-devel/library/stats/html/p.adjust.html']}
    out=ROOT/'outputs/SUPPORTING_KERNEL_ASSESSMENT.json';out.write_bytes(canonical(report))
    lines=['# R01 supporting-kernel benchmark','', '**Scope:** observed local executions of twelve software kernels on deterministic synthetic workloads. These results do not complete the 1,728 original node contracts and establish no hosted, model-level or whole-system speedup.','',f'Local protocol frozen before timing: `{pin}`. Raw measurement artifact: `{digest(raw)}`.','', '## Design','', 'Forty distinct workload blocks per House, each in a fresh Node process; four size strata (64, 128, 256, 512), ten blocks per stratum; sixteen requests per block; two warmup batches per method and seven timed paired repetitions. AB/BA ordering is balanced within every stratum and fixed in the preregistered shuffle. Only one timed process runs at a time.','', 'The warm reference scans/rebuilds from the same validated immutable snapshot used by the indexed candidate. Data-validation work is therefore not falsely counted as an indexing gain. Full preparation cost is measured separately. Exact outputs are compared before, during and after timings, with three raw-reference checks in each block.','', 'The primary block statistic is the median of seven batch latencies divided by sixteen requests. Inference uses the one-sided sign calculation on a 3% practical-gain margin and Holm correction over all twelve registered supporting kernels. The 1,728-family column is a stricter sensitivity calculation only and grants no original-node metric credit. Thirty or forty blocks do not provide an automatic power guarantee.','', '## Results','', '| House | Supporting service | Reference µs/request | Indexed µs/request | Median paired ratio | Median paired gain | Holm-12 p | Outcome |','|---|---|---:|---:|---:|---:|---:|---|']
    for r in rows:lines.append(f"| {r['houseId']} | {r['service']} | {1000*r['referenceMedianMsPerRequest']:.3f} | {1000*r['candidateMedianMsPerRequest']:.3f} | {r['medianPairedRatio']:.3f}× | {100*r['medianPairedRelativeGain']:.2f}% | {r['holm12AdjustedP']:.4g} | {r['outcome']} |")
    lines+=['','All twelve outcomes are retained, including losses and inconclusive comparisons. No implementation was tuned after the measured outcomes. A favorable result is specific to these operations, sizes, requests and environment.','', '## Cold preparation and approximate amortization','', '| House | Median full prepare ms | Approximate queries to recover full prepare | Blocks with no positive warm saving | Holm-1728 sensitivity p |','|---|---:|---:|---:|---:|']
    for r in rows:lines.append(f"| {r['houseId']} | {r['coldPrepareMedianMs']:.3f} | {r['approxQueriesToAmortizeEntirePrepare'] if r['approxQueriesToAmortizeEntirePrepare'] is not None else 'No positive median saving'} | {r['blocksWithNonpositiveSaving']}/40 | {r['holm1728SensitivityP']:.4g} |")
    lines+=['','The amortization estimate divides median full preparation cost by the median paired warm saving. It charges the entire preparation to the candidate and assumes the same repeated workload conditions. It excludes package import, host I/O, model initialization, memory pressure and source invalidation frequency. It is a planning approximation, not an observed end-to-end crossover.','', '## Quality and inference limits','', '- All 480 blocks preserve exact required outputs. Known-answer and adversarial kernel tests are separate artifacts.', '- Repetitions within one process are not independent observations; the forty process/workload blocks are the analysis units.', '- Fresh processes and distinct seeds reduce shared state but do not prove that the fixture distribution represents production or every knowledge node.', '- The sign interpretation depends on valid independence and fair-sign assumptions for the preregistered margin. Stratum summaries are descriptive.', '- H10 prepares scoped message data; it does not deliver messages. H11 evaluates supplied policy; it does not authenticate policy or grant access. H12 prepares finite action/checkpoint candidates; it does not execute or persist them.', '- Every one of the original 1,728 primary node contracts remains unmeasured by this experiment.', '', '## Primary statistical references','', '- [NIST Dataplot: Sign Test](https://www.itl.nist.gov/div898/software/dataplot/refman1/auxillar/signtest.htm).','- [Official R documentation: p.adjust](https://www.stat.ethz.ch/R-manual/R-devel/library/stats/html/p.adjust.html).','']
    md=ROOT/'outputs/SUPPORTING_KERNEL_BENCHMARK.md';md.write_text('\n'.join(lines))
    receipt={'schema':'atlas.r01.supporting-kernel-benchmark-receipt.v1','status':'PASS_LOCAL_EXPERIMENT_COMPLETE','protocolSha256':pin,'blocks':480,'exactOutputParity':True,'counts':counts,'sourceManifestSha256':protocol['sourceManifestSha256'],'files':[{ 'path':str(p.relative_to(ROOT)),'sha256':digest(p.read_bytes()),'bytes':p.stat().st_size} for p in [ROOT/'benchmarks/SUPPORTING_KERNEL_PROTOCOL.json',ROOT/'outputs/SUPPORTING_KERNEL_RAW.jsonl',out,md]],'primary1728MetricCredit':0,'productionGainsVerified':0}
    (ROOT/'outputs/SUPPORTING_KERNEL_BENCHMARK_RECEIPT.json').write_bytes(canonical(receipt));print(json.dumps({'status':receipt['status'],'counts':counts,'kernel_results':[{k:r[k] for k in ['houseId','outcome','medianPairedRatio','holm12AdjustedP']} for r in rows],'raw_sha256':digest(raw)},indent=2))
if __name__=='__main__':main()
