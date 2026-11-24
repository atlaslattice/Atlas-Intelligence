// This controller freezes its complete local protocol before starting timings.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function canonical(value){if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';}
let randomState=0x5a172814;function random(n){randomState^=randomState<<13;randomState^=randomState>>>17;randomState^=randomState<<5;return (randomState>>>0)%n;}
const protocolPath=path.join(root,'benchmarks/SUPPORTING_KERNEL_PROTOCOL.json');
const rawPath=path.join(root,'outputs/SUPPORTING_KERNEL_RAW.jsonl');
const sourcePaths=['index.mjs','kernels/a-common.mjs','kernels/b-support.mjs',...Array.from({length:12},(_,i)=>'kernels/H'+String(i+1).padStart(2,'0')+'.mjs'),'benchmarks/supporting-kernel-worker.mjs','benchmarks/run-supporting-kernels.mjs','benchmarks/analyze-supporting-kernels.py'];
const sourceFiles=[];for(const relative of sourcePaths){const bytes=await fs.readFile(path.join(root,relative));sourceFiles.push({path:relative,sha256:hash(bytes),bytes:bytes.length});}
const sourceManifestSha256=hash(canonical(sourceFiles));
const environment={node:process.version,v8:process.versions.v8,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model||'UNKNOWN',logicalCpus:os.cpus().length,totalMemoryBytes:os.totalmem(),timer:'process.hrtime.bigint',processIsolation:'FRESH_NODE_PROCESS_PER_WORKLOAD_BLOCK',timedBlocksConcurrent:1};
const blocks=[];
for(let h=1;h<=12;h++){
  const houseId='H'+String(h).padStart(2,'0'),local=[];
  for(const size of [64,128,256,512])for(let j=0;j<10;j++)local.push({houseId,size,fixtureSeed:1728000+h*10000+size*10+j,order:j<5?'AB':'BA'});
  for(let i=local.length-1;i>0;i--){const j=random(i+1);[local[i],local[j]]=[local[j],local[i]];}
  local.forEach((block,i)=>blocks.push({...block,blockId:houseId+'.B'+String(i+1).padStart(2,'0')}));
}
const protocol={schema:'atlas.r01.supporting-kernel-preregistration.v1',revision:1,createdAtUtc:new Date().toISOString(),registrationScope:'LOCAL_FILE_FROZEN_BEFORE_TIMING_NOT_AN_EXTERNAL_REGISTRY',sourceFiles,sourceManifestSha256,environment,environmentSha256:hash(canonical(environment)),hypothesisFamily:'TWELVE_SUPPORTING_SOFTWARE_KERNELS',houseCount:12,blocksPerHouse:40,sizeStrata:[64,128,256,512],blocksPerStratum:10,requestsPerBlock:16,warmups:2,pairedRepetitions:7,primaryQuantity:'MEDIAN_WITHIN_BLOCK_BATCH_LATENCY_PER_REQUEST_MS',baseline:'referenceQuery on the same genuine validated immutable prepared snapshot',candidate:'query on that prepared snapshot',coldCost:'Full prepare(dataset) separately timed before warmup; includes validation and index construction',qualityPolicy:'Exact required outputs before, during and after timing; three raw reference checks per block; any failure invalidates that kernel assessment',minimumRelativeGain:0.03,familyAlpha:0.05,multipleTesting:'Holm across all twelve registered kernels; secondary 1728-family sensitivity grants no node-metric credit',inferenceAssumptions:'Fresh processes and distinct seeds separate blocks; valid sign interpretation still needs an appropriate fair-sign null and representative independent workloads. Synthetic fixture coverage is finite and not a production distribution.',regressionPolicy:'Retain negative median paired effects as descriptive regressions; no post-outcome tuning or selective case removal.',amortizationPolicy:'Approximate query count to recover the entire cold preparation cost from the median warm saving, only if that saving is positive; no end-to-end or multiplied gain.',workerTimeoutMs:60000,blocks};
const protocolBytes=Buffer.from(canonical(protocol)),protocolSha256=hash(protocolBytes);
await fs.writeFile(protocolPath,protocolBytes,{flag:'wx'});
const raw=await fs.open(rawPath,'wx');
await raw.write(JSON.stringify({recordType:'preregistration',protocolSha256,sourceManifestSha256,environmentSha256:protocol.environmentSha256,createdAtUtc:protocol.createdAtUtc})+'\n');
await raw.sync();
console.log(JSON.stringify({stage:'PREREGISTERED',protocolSha256,blocks:blocks.length,sourceManifestSha256}));
function runWorker(index){return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[path.join(root,'benchmarks/supporting-kernel-worker.mjs')],{cwd:root,stdio:['pipe','pipe','pipe']});let stdout='',stderr='';
  const timeout=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('Timed block exceeded preregistered 60-second process limit'));},protocol.workerTimeoutMs);
  child.stdout.on('data',part=>{stdout+=part;if(stdout.length>2e6)child.kill('SIGKILL');});child.stderr.on('data',part=>{stderr+=part;});
  child.on('error',error=>{clearTimeout(timeout);reject(error);});
  child.on('close',code=>{clearTimeout(timeout);if(code!==0)return reject(new Error('Worker '+index+' failed: '+stderr.slice(0,4000)));try{resolve(JSON.parse(stdout));}catch(error){reject(error);}});
  child.stdin.end(JSON.stringify({protocolSha256,blockIndex:index}));
});}
let completed=0;
try{
  for(let i=0;i<blocks.length;i++){
    const record=await runWorker(i);assert.equal(record.blockId,blocks[i].blockId);await raw.write(JSON.stringify(record)+'\n');completed++;
    if(completed%40===0){await raw.sync();console.log(JSON.stringify({stage:'HOUSE_COMPLETED',houseId:record.houseId,blocks:40,totalCompleted:completed,quality:'EXACT_PARITY_PASSED'}));}
  }
  await raw.sync();await raw.close();
  for(const item of sourceFiles)assert.equal(hash(await fs.readFile(path.join(root,item.path))),item.sha256,'Source changed during benchmark');
  console.log(JSON.stringify({stage:'TIMINGS_COMPLETE',completed,protocolSha256,rawSha256:hash(await fs.readFile(rawPath))}));
}catch(error){await raw.write(JSON.stringify({recordType:'ABORT',completed,error:String(error),atUtc:new Date().toISOString()})+'\n');await raw.sync();await raw.close();console.error(error);process.exitCode=2;}
