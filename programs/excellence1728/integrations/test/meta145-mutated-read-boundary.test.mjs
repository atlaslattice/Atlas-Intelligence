/** Adversarial authentic-source tests for mutable callback object aliasing.
 * All identity/grant objects are synthetic fixtures, not real publisher claims.
 */
import test, {before} from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request} from 'node:http';
import {gunzipSync} from 'node:zlib';
import {createExcellenceProgram,sha256Bytes} from '../excellence-program.mjs';
import {compressedPlan,publishedProgram} from '../excellence-plan-data.mjs';
import {ARIADNE_SHA,EXCELLENCE_PLAN_SHA,E145_SCHEMA} from '../meta145-native-source-port.mjs';
import {createMeta145HostBoundHandler} from '../meta145-host-admission.mjs';

const manifest={schema:E145_SCHEMA,source_sha256:ARIADNE_SHA,atlas_excellence_plan_sha256:EXCELLENCE_PLAN_SHA,
  node_count:1728,sphere_count:144,house_count:12,meta_coordinate:'E145',actual_work_macroturns:0,
  actual_resident_model_calls:0,host_permission_granted:false,canon_changed:false,broker_changed:false,
  strategy_option_evaluations:6912,swarmchat_client_tool_count:96,independently_hosted_components:0,
  meta_receipt_sha256:'a'.repeat(64),node_chain_head_sha256:'b'.repeat(64),house_root_sha256:'c'.repeat(64)};
const STATUS='/api/atlas/meta145/status';
const REVIEW='/api/atlas/meta145/review?hsn=H05.S05.N03&taskId=EX.W05.C03.P01&roomId=work-scope';
const identity=()=>({verified:true,subject:'operator-A',tenant:'tenant-A',issuer:'fixture-authority',session:'fixture-session'});
const grant=()=>({allowed:true,purpose:'ATLAS_META145_WORK_SOURCE_READ',scope:'ATLAS_META145_READ_ONLY',permissionRevision:'revision-A',roomId:null});
const allow=scope=>({...grant(),roomId:scope.roomId});
let program;
before(async()=>{
  const compressed=Buffer.from(compressedPlan.gzip_base64,'base64');
  assert.equal(await sha256Bytes(compressed),compressedPlan.compressed_sha256);
  const bytes=gunzipSync(compressed);
  assert.equal(bytes.length,compressedPlan.raw_bytes);
  assert.equal(await sha256Bytes(bytes),EXCELLENCE_PLAN_SHA);
  program=await createExcellenceProgram(bytes,publishedProgram.planSha256);
});
function perform(base,path){return new Promise((resolve,reject)=>{
  const req=request(base+path,{method:'GET'},res=>{
    const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const raw=Buffer.concat(chunks).toString('utf8');resolve({status:res.statusCode,raw,json:JSON.parse(raw)});});
  });req.on('error',reject);req.end();
});}
async function serve({authenticate,authorize},f){
  const handler=createMeta145HostBoundHandler(program,manifest,{authenticate,authorize});
  const server=createServer(handler);
  await new Promise((yes,no)=>server.once('error',no).listen(0,'127.0.0.1',yes));
  try{return await f('http://127.0.0.1:'+server.address().port);}finally{await new Promise((yes,no)=>server.close(e=>e?no(e):yes()));}
}
for(const field of ['subject','tenant','issuer','session']){
  test('mutated same-object identity at RETURN is denied: '+field,async()=>{
    const shared=identity(),original=shared[field];
    await serve({authenticate:async({phase})=>{if(phase==='RETURN')shared[field]='changed-identity';return shared;},authorize:({scope})=>allow(scope)},async base=>{
      const result=await perform(base,STATUS);
      assert.equal(result.status,403);assert.equal(result.json.data,null);
    });
    assert.notEqual(shared[field],original);
  });
}
test('mutated same-object grant revision at RETURN is denied',async()=>{
  const shared=grant();
  await serve({authenticate:()=>identity(),authorize:({phase})=>{if(phase==='RETURN')shared.permissionRevision='revision-B';return shared;}},async base=>{
    const result=await perform(base,STATUS);assert.equal(result.status,403);assert.equal(result.json.data,null);
  });
});
test('mutated same-object room grant at RETURN is denied',async()=>{
  const shared={...grant(),roomId:'work-scope'};
  await serve({authenticate:()=>identity(),authorize:({phase})=>{if(phase==='RETURN')shared.roomId='another-room';return shared;}},async base=>{
    const result=await perform(base,REVIEW);assert.equal(result.status,403);assert.equal(result.json.data,null);
  });
});
test('inherited verified flag from prototype is not issuer attestation',async()=>{
  const inherited=Object.create({verified:true});Object.assign(inherited,identity());delete inherited.verified;
  await serve({authenticate:()=>inherited,authorize:({scope})=>allow(scope)},async base=>{
    const result=await perform(base,STATUS);assert.equal(result.status,403);
  });
});
test('inherited allowed flag from prototype is not a current grant',async()=>{
  const inherited=Object.create({allowed:true});Object.assign(inherited,grant());delete inherited.allowed;
  await serve({authenticate:()=>identity(),authorize:()=>inherited},async base=>{
    const result=await perform(base,STATUS);assert.equal(result.status,403);
  });
});
test('accessor-based identity cannot synthesize changing subject',async()=>{
  const x=identity();let subject=x.subject;
  Object.defineProperty(x,'subject',{enumerable:true,configurable:true,get:()=>subject});
  await serve({authenticate:({phase})=>{if(phase==='RETURN')subject='another-subject';return x;},authorize:({scope})=>allow(scope)},async base=>{
    const result=await perform(base,STATUS);assert.equal(result.status,403);
  });
});
test('accessor-based permission revision cannot synthesize changing grant',async()=>{
  const x=grant();let revision='revision-A';
  Object.defineProperty(x,'permissionRevision',{enumerable:true,configurable:true,get:()=>revision});
  await serve({authenticate:()=>identity(),authorize:({phase})=>{if(phase==='RETURN')revision='revision-B';return x;}},async base=>{
    const result=await perform(base,STATUS);assert.equal(result.status,403);
  });
});
test('stable frozen own-data identity and ACL remains allowed in local fixture',async()=>{
  await serve({authenticate:()=>Object.freeze(identity()),authorize:({scope})=>Object.freeze(allow(scope))},async base=>{
    const r=await perform(base,REVIEW);assert.equal(r.status,200);assert.equal(r.json.data.executionAuthorized,false);
    assert.equal(r.json.authenticatedPublisherIndependentlyVerified,false);
  });
});
test('prototype-free own-data identity and ACL remains allowed',async()=>{
  await serve({authenticate:()=>Object.assign(Object.create(null),identity()),authorize:({scope})=>Object.assign(Object.create(null),allow(scope))},async base=>{
    const r=await perform(base,STATUS);assert.equal(r.status,200);
  });
});
