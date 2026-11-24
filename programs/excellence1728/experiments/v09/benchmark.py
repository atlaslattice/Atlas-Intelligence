"""Paired measured comparisons of exhaustive source scan vs compiled inverted postings, no semantic claims."""
import json,random,statistics,sys,time
from pathlib import Path
from vertical import Catalog,sha_file

def main(source,out):
    cat=Catalog(source)
    expected=[cat.best_cross(i,False) for i in range(1728)]
    candidate=[cat.best_cross(i,True) for i in range(1728)]
    if expected!=candidate:raise RuntimeError('CROSS_HOUSE_INDEX_NOT_SEMANTICALLY_EQUIVALENT')
    rng=random.Random(1728);index=[h*144+(s*12)+(n%12) for h in range(12) for s in range(12) for n in (0,7)];rng.shuffle(index)
    results=[]
    for j in range(9):
        order=('scan','index') if j%2==0 else ('index','scan');row={}
        for method in order:
            t=time.perf_counter_ns()
            values=[cat.best_cross(i,method=='index') for i in index]
            delta=time.perf_counter_ns()-t
            if values!=[expected[i] for i in index]:raise RuntimeError('OUTPUT_MISMATCH')
            row[method+'_ns']=delta
        row['order']=order;row['paired_ratio']=row['scan_ns']/row['index_ns'];results.append(row)
    print(json.dumps({'schema':'atlas.vertical.cross-house-index-benchmark/v09',
        'sourceSha256':sha_file(source),'inputCount':len(index),'full1728ExactParityChecked':True,'exactParity':True,'measure':'LIVE_LOCAL_WALL_TIME',
        'medianScanNs':round(statistics.median(x['scan_ns'] for x in results)),
        'medianIndexNs':round(statistics.median(x['index_ns'] for x in results)),
        'medianPairedSpeedup':round(statistics.median(x['paired_ratio'] for x in results),3),
        'trialCount':len(results),'trials':results,'caveats':['Compiled index warm; catalog build time excluded and must be measured separately','No model inference or production benchmark','Human semantic validity of cross links not measured']},indent=2),file=open(out,'w'))
if __name__=='__main__':main(Path(sys.argv[1]),Path(sys.argv[2]))
