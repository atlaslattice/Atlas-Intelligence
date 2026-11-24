/** Repeated source-record lookup benchmark, no model, network, host or telemetry. */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
const dir=process.argv[2];if(!dir)throw Error('Usage: node tools/benchmark.mjs /local/output');
const nodes=JSON.parse(readFileSync(join(dir,'nodes_1728.json'),'utf8'));
const manifest=JSON.parse(readFileSync(join(dir,'meta145_unified_build.json'),'utf8'));
const check=JSON.parse(readFileSync(join(dir,'build_receipt.json'),'utf8'));
if(nodes.length!==1728||manifest.sourceNodes!==1728||manifest.meta145InputDigest!==check.predecessorMeta145Digest)throw Error('SOURCE_CENSUS_OR_BUILD_MISMATCH');
const byId=new Map(nodes.map(n=>[n.coordinate,n]));
if(byId.size!==1728)throw Error('DUPLICATE_NODE');
const labels=nodes.map(n=>n.coordinate);
const order=Array.from({length:1728},(_,i)=>(i*617)%1728); // gcd(617,1728)==1; all ids exactly once
if(new Set(order).size!==1728)throw Error('BAD_PERMUTATION');
const expected=order.map(i=>nodes[i].sourceNodeSha256).join('');
const search=(optimized)=>{
 let s='';for(const i of order){const id=labels[i];const row=optimized?byId.get(id):nodes.find(n=>n.coordinate===id);s+=row.sourceNodeSha256;}
 if(s!==expected)throw Error('RETRIEVAL_PARITY_FAILURE');return s;
};
for(let i=0;i<3;i++){search(false);search(true)}
const times={linear:[],indexed:[]};
for(let i=0;i<25;i++)for(const method of (i%2===0?['linear','indexed']:['indexed','linear'])){const before=performance.now();search(method==='indexed');times[method].push(performance.now()-before)}
const median=a=>a.toSorted((x,y)=>x-y)[Math.floor(a.length/2)];
const b=median(times.linear),c=median(times.indexed),ratio=b/c;
const initStart=performance.now();const coldMap=new Map(nodes.map(x=>[x.coordinate,x]));const coldMapInit=performance.now()-initStart;
const oneStart=performance.now();const oneLinear=nodes.find(x=>x.coordinate===labels.at(-1));const oneMs=performance.now()-oneStart;
const oneIxStart=performance.now();const oneIndexed=coldMap.get(labels.at(-1));const indexedOneMs=performance.now()-oneIxStart;
if(oneLinear.sourceNodeSha256!==oneIndexed.sourceNodeSha256)throw Error('COLD_PARITY_FAILURE');
const sha=b=>createHash('sha256').update(b).digest('hex');
const out={schema:'atlas.one.civilization.local-lookup-benchmark/v1',sourceAriadneSha256:check.sourceAriadneSHA256,
 sourceMeta145Digest:manifest.meta145InputDigest,scope:'1728 exact source coordinate lookups ×25 paired runs, one Node process',
 benchmarkedMethods:['ARRAY_FIND','MAP_GET'],baselineMedianMs:Math.round(b*1000)/1000,optimizedMedianMs:Math.round(c*1000)/1000,
 medianSpeedup:Math.round(ratio*100)/100,completeOutputParity:true,sourceDigestOfReturnedResults:sha(expected),
 coldMapBuildMs:Math.round(coldMapInit*1000)/1000,singleLastRecordArrayFindMs:Math.round(oneMs*1000)/1000,
 singleLastRecordMapGetMs:Math.round(indexedOneMs*1000)/1000,medianRuns:25,
 rawRunsMs:{linear:times.linear.map(x=>+x.toFixed(4)),indexed:times.indexed.map(x=>+x.toFixed(4))},
 syntheticOrModelTrained:false,hostLatencyTested:false,independentResidentsTested:false,
 interpretation:'CPU retrieval microbenchmark only; index construction may not pay off for a single query; do not multiply separate gains'};
writeFileSync(join(dir,'lookup_benchmark.json'),JSON.stringify(out,null,2)+'\n');
// A hash chain is a local integrity check, NOT a trusted host rollback witness.
const evidenceFile=join(dir,'functional_policy_memory.jsonl');
let log=[];if(existsSync(evidenceFile))log=readFileSync(evidenceFile,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
let prev='0'.repeat(64);
for(const e of log){if(e.previousSha256!==prev)throw Error('MEMORY_PREDECESSOR_TAMPER');const content={...e};delete content.eventSha256;
 if(sha(JSON.stringify(content))!==e.eventSha256)throw Error('MEMORY_EVENT_TAMPER');prev=e.eventSha256;
}
const eventId=`civilization-lookup-1728-${manifest.meta145InputDigest.slice(0,18)}`;
if(!log.some(x=>x.eventId===eventId)){
 const event={schema:'atlas.one.functional-memory-local/v1',eventId,ordinal:log.length+1,previousSha256:prev,
 sourceAriadneSha256:check.sourceAriadneSHA256,sourceMeta145Digest:manifest.meta145InputDigest,
 sourceBuildDigest:manifest.metaBuildSha256,mode:'WORK',kind:'MEASURED_LOCAL_LOOKUP_POLICY',
 outputParity:true,lookupCount:1728,selectedPolicy:ratio>1.05?'MAP_INDEX':'ARRAY_SCAN',
 localEvidenceStatus:'MEASURED_REPLAYABLE_NOT_MODEL_TRAINING',benchmarkFileSha256:sha(readFileSync(join(dir,'lookup_benchmark.json'))),
 privateModeIngested:false,hostPermissionGranted:false,externalModelCalls:0};
 event.eventSha256=sha(JSON.stringify(event));log.push(event);
 writeFileSync(evidenceFile,log.map(x=>JSON.stringify(x)).join('\n')+'\n');
}
console.log(JSON.stringify({baselineMedianMs:out.baselineMedianMs,optimizedMedianMs:out.optimizedMedianMs,medianSpeedup:out.medianSpeedup,coldIndexBuildMs:out.coldMapBuildMs,evidenceEvents:log.length,parity:out.completeOutputParity}));
