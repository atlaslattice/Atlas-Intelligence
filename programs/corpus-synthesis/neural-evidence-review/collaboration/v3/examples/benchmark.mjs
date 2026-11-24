import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {prepareCollaborativeWorkReview as v2} from '../../src/work-review-contract.mjs';
import {compareRuleRevision as v3} from '../src/rule-revision-gate.mjs';
const data=JSON.parse(readFileSync(new URL('../fixtures/sample-review.json',import.meta.url),'utf8'));
const funcs=[['v2-metadata-preparation',()=>v2(data.reviewInput)],['v3-amendment-audit',()=>v3(data)]];
for(const [,fn] of funcs)for(let j=0;j<80;j++)fn();
const pairs=[]; const callsPerSeries=300;
for(let i=0;i<9;i++){
 const out={};
 const order=i%2?[1,0]:[0,1];
 for(const ix of order){const [key,fn]=funcs[ix];const start=performance.now();for(let k=0;k<callsPerSeries;k++){const value=fn();if(!value.status)throw Error('EMPTY');}out[key]=(performance.now()-start)*1000/callsPerSeries;}
 pairs.push(out);
}
const stats=a=>{const sorted=[...a].sort((x,y)=>x-y);return {p50_us:sorted[Math.floor(sorted.length/2)],p95_us:sorted[Math.ceil(sorted.length*.95)-1],min_us:sorted[0],max_us:sorted.at(-1)};};
const results={environment:{node:process.version,platform:process.platform,callsPerSeries,pairs:pairs.length,localOnly:true},v2:stats(pairs.map(x=>x[funcs[0][0]])),v3:stats(pairs.map(x=>x[funcs[1][0]])),note:'Different functions and scope: v3 does more review work; these are local microcosts, not serving latency or inference speedup.'};
process.stdout.write(JSON.stringify(results,null,2)+'\n');
