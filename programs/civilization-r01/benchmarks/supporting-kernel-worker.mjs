// One isolated process measures one preregistered workload block.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import os from 'node:os';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function canonical(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
}
const median=values=>{const a=[...values].sort((a,b)=>a-b),mid=Math.floor(a.length/2);return a.length%2?a[mid]:(a[mid-1]+a[mid])/2;};
let input='';for await(const chunk of process.stdin){input+=chunk;assert(input.length<8192,'Oversized worker command');}
const command=JSON.parse(input),protocolPath=path.join(root,'benchmarks/SUPPORTING_KERNEL_PROTOCOL.json');
const protocolBytes=await fs.readFile(protocolPath);assert.equal(hash(protocolBytes),command.protocolSha256);
const protocol=JSON.parse(protocolBytes),block=protocol.blocks[command.blockIndex];
assert(block&&Number.isInteger(command.blockIndex)&&command.blockIndex>=0);
async function verifySources(){for(const file of protocol.sourceFiles)assert.equal(hash(await fs.readFile(path.join(root,file.path))),file.sha256,'Source changed: '+file.path);}
await verifySources();
const module=await import(pathToFileURL(path.join(root,'kernels',block.houseId+'.mjs')));
const loadBefore=os.loadavg();
const {dataset,requests}=module.fixture(block.fixtureSeed,block.size);
assert.equal(requests.length,protocol.requestsPerBlock);
const fixtureSha256=hash(canonical({dataset,requests}));
const coldStart=process.hrtime.bigint(),prepared=module.prepare(dataset),coldPrepareMs=Number(process.hrtime.bigint()-coldStart)/1e6;
const expected=requests.map(request=>module.referenceQuery(prepared,request));
const candidate=requests.map(request=>module.query(prepared,request));
assert.deepEqual(candidate,expected,'Output parity before timing');
for(const index of [0,Math.floor(requests.length/2),requests.length-1])assert.deepEqual(module.reference(dataset,requests[index]),expected[index],'Raw independent reference mismatch');

function runBatch(kind){
  const fn=kind==='A'?module.referenceQuery:module.query,answers=[];
  const start=process.hrtime.bigint();
  for(const request of requests)answers.push(fn(prepared,request));
  const elapsedMs=Number(process.hrtime.bigint()-start)/1e6;
  return {msPerRequest:elapsedMs/requests.length,answers};
}
for(let warm=0;warm<protocol.warmups;warm++)for(const method of block.order)assert.deepEqual(runBatch(method).answers,expected);
const repetitions=[];
for(let repetition=0;repetition<protocol.pairedRepetitions;repetition++){
  const pair={repetition,order:block.order};
  for(const method of block.order){const measured=runBatch(method);assert.deepEqual(measured.answers,expected,'Required outputs changed during timing');pair[method==='A'?'referenceMsPerRequest':'candidateMsPerRequest']=measured.msPerRequest;}
  repetitions.push(pair);
}
assert.deepEqual(requests.map(request=>module.referenceQuery(prepared,request)),expected,'Reference changed after timing');
assert.deepEqual(requests.map(request=>module.query(prepared,request)),expected,'Candidate changed after timing');
await verifySources();
process.stdout.write(JSON.stringify({schema:'atlas.r01.supporting-kernel-block.v1',blockId:block.blockId,houseId:block.houseId,sphereId:module.descriptor.sphereId,service:module.descriptor.service,fixtureSeed:block.fixtureSeed,size:block.size,order:block.order,requests:requests.length,protocolSha256:command.protocolSha256,fixtureSha256,sourceManifestSha256:protocol.sourceManifestSha256,environmentSha256:protocol.environmentSha256,fixtureKind:'DETERMINISTIC_SYNTHETIC_SOFTWARE_WORKLOAD',measurementKind:'OBSERVED_LOCAL_EXECUTION_ON_SYNTHETIC_FIXTURE',coldPrepareMs,repetitions,referenceMsPerRequest:median(repetitions.map(x=>x.referenceMsPerRequest)),candidateMsPerRequest:median(repetitions.map(x=>x.candidateMsPerRequest)),requiredOutputSha256:hash(canonical(expected)),exactOutputParity:true,rawReferenceRepresentativeCasesChecked:3,loadAverageBefore:loadBefore,loadAverageAfter:os.loadavg(),nodeProcessId:process.pid,completedAtUtc:new Date().toISOString(),hostAuthorizationGranted:false,productionGainClaimed:false,primary1728MetricCredit:false})+'\n');
