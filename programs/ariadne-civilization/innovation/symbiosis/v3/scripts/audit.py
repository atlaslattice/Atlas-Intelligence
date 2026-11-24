#!/usr/bin/env python3
"""Independent exact cardinality/receipt/aggregation audit; no host rights or scientific proof."""
import collections,hashlib,json,pathlib,struct,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
DIR=ROOT/'reports/full'
S=struct.Struct('<HH3H3HBBH')
assert S.size==20
NODES=1728; REPEATS=1728;TOTAL=NODES*REPEATS
REGISTRY='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def assemble():
    src=json.loads((ROOT/'private-source/preflight.json').read_text())
    if sha(ROOT/'private-source/source-seeds.txt')!=src['simulatorInputSha256']:raise ValueError('SEED_INDEX_TAMPERED')
    house_receipts=[];all_nodes=[];global_wins=[0]*4;global_valid=[0]*3;global_score=[0.]*3;global_minstock=[1.]*3
    no_viable=0;stress=0;unbound=0;metabetter=flatbetter=ties=0
    for h in range(1,13):
        bn=DIR/f'H{h:02d}.bin';jp=DIR/f'H{h:02d}.json'
        raw=bn.read_bytes(); report=json.loads(jp.read_text());
        if len(raw)!=144*REPEATS*S.size or report['sourceNodes']!=144 or report['repeatsPerNode']!=REPEATS:raise ValueError('SHARD_SIZE')
        if report['house']!=f'H{h:02d}' or report['fictionalYearsPerScenario']!=1728 or report['epochsPerScenario']!=36:raise ValueError('HORIZON_TAMPERED')
        wins=[0]*4;feasible=[0]*3;dissentBound=stressCount=0
        for i,values in enumerate(struct.iter_unpack(S.format,raw)):
            node,repeat,*rest=values
            scores=rest[:3];stock=rest[3:6];winner,flags,marker=rest[6:]
            if node!=(h-1)*144+i//REPEATS or repeat!=i%REPEATS or marker!=0xA145 or winner not in range(4):raise ValueError(f'RECORD_ORDER_OR_MAGIC:{h}:{i}')
            isvalid=[bool(flags & (1<<j)) for j in range(3)]
            if winner<3 and (not isvalid[winner] or scores[winner]<max(scores[j] for j in range(3) if isvalid[j])):raise ValueError('WINNER_NOT_MAXIMAL')
            if winner==3 and any(isvalid):raise ValueError('INVENTED_NO_VIABLE')
            wins[winner]+=1
            for j in range(3):feasible[j]+=isvalid[j]
            dissentBound+=not bool(flags&8);stressCount+=bool(flags&16)
        agg=report['aggregate']
        if wins!=agg['wins'] or feasible!=agg['feasible'] or stressCount!=agg['stressScenarios'] or agg['noViable']!=wins[3]:raise ValueError('SUMMARY_MISMATCH')
        expected_nodes=list(range((h-1)*144,h*144));observed_nodes=[n['ordinal'] for n in report['nodes']]
        if observed_nodes!=expected_nodes or len(report['nodes'])!=144:raise ValueError('SOURCE_NODE_INDEX_WRONG')
        house_receipts.append({'house':report['house'],'syntheticTrajectories':agg['cases'],'binarySha256':sha(bn),'summarySha256':sha(jp),'wins':wins,'noViable':wins[3], 'sourceNodeCount':144})
        all_nodes.extend(report['nodes'])
        no_viable+=agg['noViable'];stress+=stressCount;unbound+=agg['syntheticUnboundSubject'];metabetter+=agg['metaBetterThanFlat'];flatbetter+=agg['flatBetterThanMeta'];ties+=agg['flatMetaWithinTolerance']
        for j in range(3):global_valid[j]+=feasible[j];global_score[j]+=agg['sumFeasibleScores'][j];global_minstock[j]=min(global_minstock[j],agg['minimumSyntheticStocks'][j])
        for j in range(4):global_wins[j]+=wins[j]
    if len(all_nodes)!=NODES or sum(global_wins)!=TOTAL or sum(h['syntheticTrajectories'] for h in house_receipts)!=TOTAL:raise ValueError('GLOBAL_CARDINALITY')
    houses=collections.defaultdict(list);spheres=collections.defaultdict(list)
    for n in all_nodes:
        house=f'H{n["ordinal"]//144+1:02d}';sphere=house+f'.S{(n["ordinal"]%144)//12+1:02d}'
        houses[house].append(n);spheres[sphere].append(n)
    if len(houses)!=12 or len(spheres)!=144 or any(len(s)!=12 for s in spheres.values()):raise ValueError('SOURCE_HIERARCHY')
    # Proposed 144 build orders: respond to synthetic held conditions, not certified problems.
    queue=[]
    for sphere,nodes in sorted(spheres.items()):
        cases=sum(n['aggregate']['cases'] for n in nodes)
        held=sum(n['aggregate']['noViable'] for n in nodes)
        flatWins=sum(n['aggregate']['wins'][0] for n in nodes)
        metaWins=sum(n['aggregate']['wins'][2] for n in nodes)
        q={'taskId':'AR3.'+sphere,'sphere':sphere,'house':sphere[:3], 'sourceNodeOrdinals':[n['ordinal'] for n in nodes],
           'fictionalScenarios':cases,'fictionalNoViable':held,'syntheticNoViableRate':round(held/cases,6),
           'flatWins':flatWins,'metaWins':metaWins,'observedProblem':'SYNTHETIC_CONSTRAINT_FAILURE_NOT_REAL_EVIDENCE',
           'proposedCodeDelta':'Add a replayable constraint-failure counterexample fixture to existing Sphere review port',
           'proposedTest':'If all equal-budget policies violate a nonoffsettable resource or source gate, return NO_VIABLE_PRIME and preserve baseline comparison',
           'requiredIndependentInputs':['original registry bytes current hash','current hosted rights','current source and scientific reviewer','branch CI and rollback'],
           'acceptance':'TESTED_LOCAL_CANDIDATE_ONLY','status':'PLANNED_NOT_EXECUTED_IN_HOST'}
        queue.append(q)
    # Not an already authorized 144-module integration; META145 only prepares advisory selection.
    priority=sorted(queue,key=lambda a:(-a['syntheticNoViableRate'],a['sphere']))[:12]
    receipt={'schema':'atlas.meta145.long-horizon-review/v1','sourceRegistrySha256':REGISTRY,
      'derivedCsvSha256':src['derivedCsvSha256'],'parentMeshLedgerSha256':src['priorMeshLedgerSha256'],
      'status':'COMPLETE_SYNTHETIC_SOURCE_REVIEW_HOST_AND_SCIENCE_HELD',
      'simulatedTrajectories':TOTAL,'fictionalYearsPerTrajectory':1728,'fictionalYearExposures':TOTAL*1728,
      'modeled48YearEpochs':TOTAL*36,'modeledPolicyEpochUpdates':TOTAL*36*3,
      'policies':['FLAT_EQUAL_BUDGET','SPHERE_EQUAL_BUDGET','META145_EQUAL_BUDGET'],
      'allPoliciesSpendSameInvestigationUnitsPerEpoch':True,
      'sourceNodes':1728,'spheres':144,'houses':12,'nodeKinds':{'DOMAIN_SPECIALIZATION':1008,'EPISTEMIC_META':720},
      'winnerCounts':dict(zip(['FLAT','SPHERE','META145','NO_VIABLE_PRIME'],global_wins)),
      'feasibleByArm':dict(zip(['FLAT','SPHERE','META145'],global_valid)),
      'sumSyntheticFeasibleScores':dict(zip(['FLAT','SPHERE','META145'],global_score)),
      'minimumModeledResourceStocks':dict(zip(['FLAT','SPHERE','META145'],global_minstock)),
      'meta145BetterThanFlat':metabetter,'flatBetterThanMeta145':flatbetter,'sameWithinTolerance':ties,
      'allPolicyUnviable':no_viable,'stressScenarios':stress,'methodLensSyntheticSubjectMissing':unbound,
      'intent':'discover testable code improvements, NOT global optimum/forecast/civilization intelligence',
      'initialSimulationConditionalOnPrevious420SyntheticOutputs':True,
      'shardProofs':house_receipts,
      'selectedAdvisoryBuildOrders':[{'taskId':q['taskId'],'status':q['status']} for q in priority],
      'independentScientificAcceptance':0,'hostDeployed':False,'realMacroturns':0,'actualResidentAgents':0,
      'privateModeContentImported':False,'paidProviderCalls':0,'canonPromotion':False,'authorityEffect':'NONE'}
    (DIR/'META145_REVIEW_RECEIPT.json').write_text(json.dumps(receipt,indent=2,sort_keys=True)+'\n')
    (DIR/'SPHERE_BUILD_ORDERS_144.json').write_text(json.dumps(queue,indent=2,sort_keys=True)+'\n')
    (DIR/'HOUSE_ADVISORY_12.json').write_text(json.dumps({h:{'nodeCount':len(nodes),'syntheticTrajectories':sum(n['aggregate']['cases'] for n in nodes),'noViable':sum(n['aggregate']['noViable'] for n in nodes),'execution':'FUTURE_REVIEW_ONLY'} for h,nodes in sorted(houses.items())},indent=2)+'\n')
    print(json.dumps({k:receipt[k] for k in ['simulatedTrajectories','fictionalYearExposures','modeledPolicyEpochUpdates','winnerCounts','meta145BetterThanFlat','flatBetterThanMeta145','allPolicyUnviable','methodLensSyntheticSubjectMissing']},indent=2))
    return receipt
if __name__=='__main__': assemble()
