import {performance} from 'node:perf_hooks';
import {readFileSync} from 'node:fs';
import {compareRuleRevision as baseline} from '../../v3/src/rule-revision-gate.mjs';
import {compareRuleRevision as candidate} from '../src/rule-revision-snapshot.mjs';
const input=JSON.parse(readFileSync(new URL('../fixtures/sample-review.json',import.meta.url),'utf8'));
const funcs=[['v3.1-baseline',baseline],['v4-snapshot',candidate]];
const pairs=[];
for(const [,f] of funcs)for(let i=0;i<100;i++){if(f(input).status!=='LOCAL_REVIEW_CANDIDATE_ONLY')throw Error('fixture');}
const loops=250;
for(let i=0;i<11;i++){
  const pair={};const order=i%2?[1,0]:[0,1];
  for(const index of order){const [key,fn]=funcs[index];const begin=performance.now();for(let k=0;k<loops;k++){const r=fn(input);if(r.status!=='LOCAL_REVIEW_CANDIDATE_ONLY')throw Error('changed status');}pair[key]=(performance.now()-begin)*1000/loops;}
  pairs.push(pair);
}
const s=x=>{const v=[...x].sort((a,b)=>a-b);return {p50_us:v[Math.floor(v.length/2)],p95_us:v[Math.ceil(.95*v.length)-1],min_us:v[0],max_us:v.at(-1)}};
const old=s(pairs.map(x=>x[funcs[0][0]])),newer=s(pairs.map(x=>x[funcs[1][0]]));
const result={schema:'atlas.collaboration.v4.local-benchmark/v1',mode:'OFFLINE_AUDIT_ONLY',node:process.version,pairs:pairs.length,callsPerSeries:loops,baseline:old,candidate:newer,relativeP50:newer.p50_us/old.p50_us,raw:pairs,note:'This is exact same audit fixture/operation, not neural model inference or hosting. A ratio above 1 is slower.'};
process.stdout.write(JSON.stringify(result,null,2)+'\n');
