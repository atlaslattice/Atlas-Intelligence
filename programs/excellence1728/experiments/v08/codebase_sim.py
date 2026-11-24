"""Atlas Horizon v0.8: 1,728 executable codebase *policy compositions*.
All runs are deterministic, source-only, synthetic workload evaluations on the exact
1,728 Ariadne v0.7 coordinates. Synthetic years are computational generations,
not historical time. Only held-out future workload is used for ranking final policies.
This is not the compilation/benchmark of 1,728 independently authored repositories.
"""
from __future__ import annotations
import concurrent.futures, collections, hashlib, json, multiprocessing, os, statistics, time
from pathlib import Path
SOURCE='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
INDEX=tuple((family,block) for family in ('SCAN','SPHERE','DIRECT') for block in (1,4,12,48))
CACHE=tuple((kind,capacity) for kind in ('FIFO','LRU','REVISION_BOUND') for capacity in (16,32,96,256))
PREFETCH=tuple((kind,width) for kind in ('NONE','NEIGHBOR','HOUSE') for width in (1,4,12,48))
TRAIN_YEARS=1296;HOLDOUT_YEARS=432;YEARS=TRAIN_YEARS+HOLDOUT_YEARS
COORDS=None;PIN64=None;SPHERE_ROWS=None;HOUSE_ROWS=None
N=1728

def canonical(o):return json.dumps(o,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode()
def sha(o):return hashlib.sha256(canonical(o)).hexdigest()
def read_source(path):
    p=Path(path);raw=p.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE:raise ValueError('EXACT_ARIADNE_SOURCE_MISMATCH')
    x=json.loads(raw)
    if set(x)!={'houses','spheres','nodes','catalog'} or len(x['nodes'])!=N or len(x['spheres'])!=144 or len(x['houses'])!=12:raise ValueError('SOURCE_COVERAGE_INVALID')
    coords=[f'H{h:02d}.S{s:02d}.N{n:02d}' for h in range(1,13) for s in range(1,13) for n in range(1,13)]
    for i,key in enumerate(coords):
        z=x['nodes'].get(key)
        if not z or z['id']!=key or z['parent']!=key[:7] or z['kind']!=('DOMAIN_SPECIALIZATION' if int(key[5:7])<=7 else 'EPISTEMIC_META'):raise ValueError('SOURCE_ID_OR_ROLE_MISMATCH')
        if len(z['source_record_sha256'])!=64:raise ValueError('BAD_SOURCE_RECORD_SHA')
    return tuple(coords),tuple(int(x['nodes'][k]['source_record_sha256'][:16],16) for k in coords)

def init_workers(coords,pins):
    global COORDS,PIN64,SPHERE_ROWS,HOUSE_ROWS
    COORDS=tuple(range(N));PIN64=tuple(pins)
    SPHERE_ROWS=tuple(tuple(range(i*12,(i+1)*12)) for i in range(144))
    HOUSE_ROWS=tuple(tuple(range(i*144,(i+1)*144)) for i in range(12))

def versioned_value(idx,rev,epoch):
    return (PIN64[idx]^((rev+1)*0x9e3779b97f4a7c15)^((epoch+1)*0xc2b2ae3d27d4eb4f))&((1<<64)-1)

def config(genes):
    i,c,p=genes
    return {'index':{'algorithm':INDEX[i][0],'block':INDEX[i][1]},'memo':{'algorithm':CACHE[c][0],'capacity':CACHE[c][1]},'scheduler':{'algorithm':PREFETCH[p][0],'width':PREFETCH[p][1]}}

def events_for_year(y):
    # Every time step advances one different, source-addressed node; 337 is
    # relatively prime to 1728, so each node changes exactly once per campaign.
    mutated=y*337%N
    hot=(y*13+17)%48
    cold=(y*643+19)%N
    return mutated,(hot,cold,mutated)

class Program:
    __slots__=('genes','rev','cache','epoch','lookups','hits','misses','prefetch_ops','estimated_units','code_errors','max_cache','scan_units','rights_violations')
    def __init__(self,genes):
        self.genes=tuple(genes);self.rev=[0]*N;self.cache=collections.OrderedDict();self.epoch=None
        self.lookups=0;self.hits=0;self.misses=0;self.prefetch_ops=0;self.estimated_units=0.;self.code_errors=0;self.max_cache=0;self.scan_units=0;self.rights_violations=0
    def _lookup(self,idx):
        algorithm,block=INDEX[self.genes[0]]
        if algorithm=='SCAN':
            found=COORDS.index(idx) # real C-level linear lookup of one original-source address
            cost=1.6*(found+1)/block+2.0*block
        elif algorithm=='SPHERE':
            found=SPHERE_ROWS[idx//12].index(idx)
            cost=4.8+1.6*(found+1)/block+2.6*block
        else:
            found=idx # direct ordinal lookup, validated by source coordinate
            cost=6.0+0.32*block
        if found<0:self.code_errors+=1
        self.scan_units+=int(cost);return cost
    def _cache_put(self,key,value):
        kind,cap=CACHE[self.genes[1]]
        if key in self.cache:
            if kind!='FIFO':self.cache.move_to_end(key)
            self.cache[key]=value
        else:
            self.cache[key]=value
        while len(self.cache)>cap:self.cache.popitem(last=False)
        self.max_cache=max(self.max_cache,len(self.cache))
    def _request(self,idx,epoch,is_prefetch=False):
        self.lookups+=0 if is_prefetch else 1
        key=(idx,self.rev[idx],epoch)
        value=versioned_value(idx,self.rev[idx],epoch)
        if key in self.cache:
            if not is_prefetch:self.hits+=1;self.estimated_units+=1.5
            if CACHE[self.genes[1]][0]!='FIFO':self.cache.move_to_end(key)
            got=self.cache[key]
        else:
            if not is_prefetch:self.misses+=1
            else:self.prefetch_ops+=1
            cost=self._lookup(idx)
            self.estimated_units+=cost+(3.0 if is_prefetch else 5.0)
            got=value;self._cache_put(key,got)
        if got!=value:self.code_errors+=1
        return got
    def year(self,y,mutated,queries):
        epoch=y//96
        if epoch!=self.epoch:
            # Defense in depth: no cached permissions carried across scope epochs.
            self.cache.clear();self.epoch=epoch
        self.rev[mutated]+=1
        # Remove stale versions of the changed node; cache key ALSO includes version.
        for k in [k for k in self.cache if k[0]==mutated]:del self.cache[k]
        mode,width=PREFETCH[self.genes[2]]
        if mode!='NONE' and y%width==0:
            base=queries[0]
            pool=SPHERE_ROWS[base//12] if mode=='NEIGHBOR' else HOUSE_ROWS[base//144]
            start=pool.index(base)
            for j in range(1,min(4,width)+1):
                other=pool[(start+j)%len(pool)]
                self._request(other,epoch,is_prefetch=True)
        for idx in queries:self._request(idx,epoch)
    def stats(self):
        algorithm=INDEX[self.genes[0]][0]
        setup={'SCAN':0,'SPHERE':900,'DIRECT':4500}[algorithm]
        memo_penalty=CACHE[self.genes[1]][1]*0.45
        return {'queries':self.lookups,'hits':self.hits,'misses':self.misses,'prefetched':self.prefetch_ops,
           'incorrect_results':self.code_errors,'rights_violations':self.rights_violations,'max_cache_entries':self.max_cache,
           'lookup_work_units':round(self.estimated_units,3),'score_units':round(self.estimated_units+setup+memo_penalty,3),
           'estimated_index_setup_units':setup,'estimated_memory_penalty_units':round(memo_penalty,3),
           'warning':'COST_MODEL_ESTIMATE_NOT_HARDWARE_BENCHMARK'}

def replay_window(genes,from_year,to_year):
    v=Program(genes)
    for y in range(from_year,to_year):
        mutate,query=events_for_year(y);v.year(y,mutate,query)
    return v.stats()

def neighbors(gene):
    g=tuple(gene);out=[g]
    for axis in range(3):
        for step in (-1,1):
            z=list(g);z[axis]=max(0,min(11,z[axis]+step));out.append(tuple(z))
    return list(dict.fromkeys(out))

def simulate_one(idx):
    assert COORDS is not None and PIN64 is not None
    initial=(idx//144,idx//12%12,idx%12)
    gene=initial;history=[]
    # Actual year-specific mutation of one HSN node each year. Code evolves every
    # 144 years through training only; a separate last 432-year holdout is untouched.
    p=Program(gene)
    for y in range(TRAIN_YEARS):
        mutated,queries=events_for_year(y)
        p.year(y,mutated,queries)
        if (y+1)%144==0:
            begin=y+1-144
            scored=[(replay_window(z,begin,y+1)['score_units'],z) for z in neighbors(gene)]
            best=min(scored,key=lambda pair:(pair[0],pair[1]))
            old_cost=[n for n,z in scored if z==gene][0]
            new_gene=best[1] if best[0] <= old_cost*.99 else gene
            history.append({'year':y+1,'from':list(gene),'to':list(new_gene),
               'measured_window_cost_old':old_cost,'measured_window_cost_selected':best[0],
               'changed':new_gene!=gene,'evolution_rule':'PAST_144_YEAR_SOURCE_ONLY_COST_REPLAY_WITH_ONE_PERCENT_MARGIN'})
            if new_gene!=gene:
                gene=new_gene;p.genes=gene;p.cache.clear();p.estimated_units+=800 # rebuilding/invalidating local policy state has cost
    train=p.stats()
    hold=Program(gene)
    for y in range(TRAIN_YEARS,YEARS):
        mutated,queries=events_for_year(y);hold.year(y,mutated,queries)
    holdout=hold.stats()
    status='VALID_SYNTHETIC_CONFIGURATION' if train['incorrect_results']==0 and holdout['incorrect_results']==0 and holdout['rights_violations']==0 else 'REJECTED_INCORRECT_OUTPUT'
    return {'candidate_id':f'CODE-H{idx//144+1:02d}.S{idx//12%12+1:02d}.N{idx%12+1:02d}',
       'initial':config(initial),'final':config(gene),'genes_start':list(initial),'genes_final':list(gene),
       'train':train,'holdout':holdout,'epochs':history,'evaluated_years':YEARS,
       'yearly_node_mutations':YEARS,'source_coordinates_total':N,'correct_result_gates_passed':status=='VALID_SYNTHETIC_CONFIGURATION',
       'status':status,'hosted_benchmark':False,'model_calls':0,'peer_turns':0,'complete_distinct_code_repositories_built':0}

def run_simulation(source_file,outdir,workers=8):
    coords,pins=read_source(source_file)
    workers=max(1,min(int(workers),32))
    begin=time.monotonic()
    # fork/spawn workers initialize ONLY public-to-process digests and integer IDs;
    # original private labels and definitions remain in local owner process.
    with concurrent.futures.ProcessPoolExecutor(max_workers=workers,initializer=init_workers,initargs=(coords,pins)) as pool:
        results=list(pool.map(simulate_one,range(N),chunksize=8))
    duration=time.monotonic()-begin
    if len(results)!=1728 or len({r['candidate_id'] for r in results})!=N:raise ValueError('CANDIDATE_COVERAGE_ERROR')
    if any(r['status']!='VALID_SYNTHETIC_CONFIGURATION' or len(r['epochs'])!=9 or r['evaluated_years']!=1728 for r in results):raise ValueError('SIMULATION_INCOMPLETE')
    for i,r in enumerate(results):
        r['source_record_prefix_64bit']=f'{pins[i]:016x}' # digest PREFIX ONLY; original full record stays private
        r['house']=r['candidate_id'][5:8]
        r['sphere']=r['candidate_id'][5:12]
    ranked=sorted(results,key=lambda r:(r['holdout']['score_units'],r['holdout']['max_cache_entries'],r['candidate_id']))
    winner=ranked[0]
    houses=[];spheres=[]
    for h in range(12):
        group=results[h*144:(h+1)*144]
        for s in range(12):
            part=group[s*12:(s+1)*12]
            spheres.append({'id':f'H{h+1:02d}.S{s+1:02d}','candidateCount':12,
                'best_candidate':min(part,key=lambda x:(x['holdout']['score_units'],x['candidate_id']))['candidate_id'],
                'holdout_score_median':statistics.median(x['holdout']['score_units'] for x in part),
                'mutations':sum(sum(e['changed'] for e in x['epochs']) for x in part)})
        houses.append({'id':f'H{h+1:02d}','candidateCount':144,
            'best_candidate':min(group,key=lambda x:(x['holdout']['score_units'],x['candidate_id']))['candidate_id'],
            'holdout_score_median':statistics.median(x['holdout']['score_units'] for x in group),
            'mutations':sum(sum(e['changed'] for e in x['epochs']) for x in group)})
    base=results[0]
    summary={'schema':'atlas.meta145.parallel-codebase-simulation/v08','source_sha256':SOURCE,
        'candidate_count':N,'synthetic_years_per_candidate':YEARS,'explicit_candidate_year_steps':N*YEARS,
        'real_parallel_process_workers_requested':workers,
        'candidate_policy_axes':{'index':12,'memo':12,'scheduler':12},
        'actual_separate_git_repositories_created':0,'candidate_description':'1728 DISTINCT EXECUTABLE COMPOSITIONS OF ONE NATIVE KERNEL; NOT 1728 AUTHORED REPOSITORIES',
        'train_years_per_candidate':TRAIN_YEARS,'heldout_years_per_candidate':HOLDOUT_YEARS,
        'evolution_decision_events':sum(len(r['epochs']) for r in results),
        'implemented_gene_mutations':sum(sum(e['changed'] for e in r['epochs']) for r in results),
        'source_node_count':1728,'sphere_count':144,'house_count':12,
        'all_candidates_correct_on_synthetic_fixtures':True,'winning_candidate_id':winner['candidate_id'],
        'winning_genes_final':winner['genes_final'],'winning_config_final':winner['final'],
        'winning_holdout_score_units':winner['holdout']['score_units'],
        'baseline_candidate_id':base['candidate_id'],'baseline_holdout_score_units':base['holdout']['score_units'],
        'holdout_score_ratio_baseline_over_winner':round(base['holdout']['score_units']/winner['holdout']['score_units'],6),
        'selection_basis':'MINIMUM ESTIMATED SOURCE-ONLY COST ON FINAL 432-YEAR HOLDOUT; NOT HARDWARE GLOBAL OPTIMUM',
        'note':'ALL 1728 CANDIDATES RANKED ON THE SAME HOLDOUT. Selecting a winner on it makes reported champion score selection-biased.',
        'model_calls':0,'authenticated_peer_turns':0,'knowledge_gains_proven':0,'host_deployed':False,'canon_changed':False,
        'status':'EXECUTED_SOURCE_BOUND_SYNTHETIC_PARALLEL_SIMULATION_NOT_DEPLOYED'}
    summary['candidates_sha256']=sha(results)
    summary['spheres_sha256']=sha(spheres)
    summary['houses_sha256']=sha(houses)
    summary['sha256']=sha(summary)
    out=Path(outdir);out.mkdir(exist_ok=True,parents=True)
    for file,vals in [('CANDIDATES.jsonl',results),('SPHERES.jsonl',spheres),('HOUSES.jsonl',houses)]:
        with (out/file).open('w') as f:
            for r in vals:f.write(json.dumps(r,sort_keys=True,separators=(',',':'))+'\n')
    (out/'META145_SYNTHESIS.json').write_text(json.dumps(summary,indent=2,sort_keys=True))
    (out/'RUNTIME_OBSERVATION.json').write_text(json.dumps({'duration_seconds_measured':round(duration,3),'worker_processes':workers,'scope':'LOCAL_WALL_CLOCK_NOT_DETERMINISTIC_RECEIPT'},indent=2))
    (out/'TOP_24_CANDIDATES.json').write_text(json.dumps([{'id':r['candidate_id'],'score':r['holdout']['score_units'],'final':r['final'],'mutations':sum(e['changed'] for e in r['epochs'])} for r in ranked[:24]],indent=2))
    return summary

if __name__=='__main__':
    import argparse
    a=argparse.ArgumentParser();a.add_argument('--source',required=True);a.add_argument('--out',required=True);a.add_argument('--workers',type=int,default=8);args=a.parse_args()
    print(json.dumps(run_simulation(args.source,args.out,args.workers),indent=2))
