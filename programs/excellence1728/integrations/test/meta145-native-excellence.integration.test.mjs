import test, {before} from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request} from 'node:http';
import {gunzipSync} from 'node:zlib';
import {createExcellenceProgram,isVerifiedProgram,sha256Bytes} from '../excellence-program.mjs';
import {compressedPlan,publishedProgram} from '../excellence-plan-data.mjs';
import {ARIADNE_SHA,EXCELLENCE_PLAN_SHA,E145_SCHEMA,
 validateMeta145PlanningReceipt,createMeta145ReadOnlyPort,
 createMeta145ExcellenceBridge,createMeta145HttpHandler} from '../meta145-native-source-port.mjs';

const manifest={schema:E145_SCHEMA,source_sha256:ARIADNE_SHA,atlas_excellence_plan_sha256:EXCELLENCE_PLAN_SHA,
 node_count:1728,sphere_count:144,house_count:12,meta_coordinate:'E145',actual_work_macroturns:0,actual_resident_model_calls:0,
 host_permission_granted:false,canon_changed:false,broker_changed:false,strategy_option_evaluations:6912,
 swarmchat_client_tool_count:96,independently_hosted_components:0,
 meta_receipt_sha256:'a'.repeat(64),node_chain_head_sha256:'b'.repeat(64),house_root_sha256:'c'.repeat(64)};
const TASK='EX.W05.C03.P01';
const HSN='H05.S05.N03';
let official,raw;
before(async()=>{
 const zipped=Buffer.from(compressedPlan.gzip_base64,'base64');
 assert.equal(await sha256Bytes(zipped),compressedPlan.compressed_sha256);
 raw=gunzipSync(zipped);
 assert.equal(raw.length,compressedPlan.raw_bytes);
 assert.equal(await sha256Bytes(raw),publishedProgram.planSha256);
 official=await createExcellenceProgram(raw,publishedProgram.planSha256);
});

test('preserve exact Ariadne and official Excellence program source digest',()=>{
 assert.equal(publishedProgram.planSha256,EXCELLENCE_PLAN_SHA);
 assert.equal(ARIADNE_SHA,'07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6');
 assert.equal(isVerifiedProgram(official),true);
 assert.equal(official.descriptor().status,'PLANNED_PROGRAM_SOURCE_VERIFIED');
});
test('source shape is source-only and has all 1,728 positions',()=>{
 const r=validateMeta145PlanningReceipt(manifest);
 assert.deepEqual([r.geometry.nodes,r.geometry.spheres,r.geometry.houses],[1728,144,12]);
 assert.equal(r.hosted_verified,false);
});
test('source mismatch rejected, including alternate plan',()=>{
 assert.throws(()=>validateMeta145PlanningReceipt({...manifest,source_sha256:'0'.repeat(64)}),/EDITION_OR_PROGRAM_MISMATCH/);
 assert.throws(()=>validateMeta145PlanningReceipt({...manifest,atlas_excellence_plan_sha256:'0'.repeat(64)}),/EDITION_OR_PROGRAM_MISMATCH/);
});
test('forged host authority, CANON and resident calls rejected',()=>{
 for(const k of ['actual_work_macroturns','actual_resident_model_calls','host_permission_granted','canon_changed','broker_changed']){
  const x={...manifest,[k]:k.startsWith('actual')?1:true};
  assert.throws(()=>validateMeta145PlanningReceipt(x),/FORGED_HOST_PROGRESS/);
 }
});
test('no automatic Work action and no cross-mode import',()=>{
 const p=createMeta145ReadOnlyPort(manifest);
 assert.equal(p.prepareWorkCandidate('H01.S01.N01').sent,false);
 for(const mode of ['PLAY','IMAGINE','DREAM','BRAIN','PALACE','SOCIAL','QUIET','HABITAT']){
  assert.throws(()=>p.prepareWorkCandidate(HSN,mode),/PRIVATE_OR_UNAUTHORIZED_MODE/);
 }
 assert.equal(p.preflight().host_write,false);
});
test('H00 E145 root and malformed namespaces rejected',()=>{
 const p=createMeta145ReadOnlyPort(manifest);
 for(const bad of ['H00.S00.N00','H13.S01.N01','H01.S00.N01','H01.S13.N01','H01.S01.N13','H01.S01.N00','../../etc/passwd','EX.W05.C03.P01','KG8Q:hash']){
  assert.throws(()=>p.prepareWorkCandidate(bad),/INVALID_SOURCE_COORDINATE/);
 }
});
test('exact original HSN 1,728 address shapes are recognized without model or writes',()=>{
 const p=createMeta145ReadOnlyPort(manifest); const seen=new Set();
 for(let h=1;h<=12;h++)for(let s=1;s<=12;s++)for(let n=1;n<=12;n++){
  const x=`H${String(h).padStart(2,'0')}.S${String(s).padStart(2,'0')}.N${String(n).padStart(2,'0')}`;
  const a=p.prepareWorkCandidate(x);assert.equal(a.sent,false);seen.add(a.hsn);
 }
 assert.equal(seen.size,1728);
});
test('status response cannot be poisoned by mutating nested geometry',()=>{
 const p=createMeta145ReadOnlyPort(manifest);
 const original=p.status();original.geometry.nodes=9999; original.status='HOSTED_VERIFIED';
 assert.equal(p.status().geometry.nodes,1728);
 assert.equal(p.status().hosted_verified,false);
});
test('actual native bridge rejects fake authority objects',()=>{
 assert.throws(()=>createMeta145ExcellenceBridge({descriptor:()=>official.descriptor()},manifest),/VERIFIED_EXCELLENCE_PROGRAM_REQUIRED/);
});
test('official exact-source program and META145 bridge expose correct status without completion',()=>{
 const p=createMeta145ExcellenceBridge(official,manifest);
 const d=p.status();assert.equal(d.planSha256,EXCELLENCE_PLAN_SHA);
 assert.equal(d.status,'EXACT_SOURCE_LOCAL_READ_ONLY');assert.equal(d.installedOnSite,false);
 assert.equal(d.completedStepsFromLedger,'NOT_QUERIED');
 assert.equal(d.hostAuthenticated,false);
});
test('joint review pairs two independent coordinate namespaces and authentic task data',()=>{
 const p=createMeta145ExcellenceBridge(official,manifest);
 const actual=official.task(TASK);
 const r=p.prepareJointReview({hsn:HSN,taskId:TASK,roomId:'atlas-review-local'});
 assert.equal(r.status,'PREPARED_NOT_POSTED');
 assert.equal(r.engineering.taskId,actual.id);
 assert.equal(r.engineering.title,actual.title);
 assert.equal(r.engineering.capabilityId,'EX.W05.C03');
 assert.equal(r.hsn.coordinate,HSN);
 assert.equal(r.relationship,'PROPOSED_CROSSWALK_FOR_REVIEW_NOT_SAME_AS');
 assert.equal(r.executionAuthorized,false);assert.equal(r.workPosted,false);
 assert.equal(r.hostAuthenticated,false);assert.equal(r.rightsAtReturnIndependentlyVerified,false);
});
test('unexpected room, task or model-selected HSN fails closed',()=>{
 const p=createMeta145ExcellenceBridge(official,manifest);
 const good={hsn:HSN,taskId:TASK,roomId:'atlas-review-local'};
 assert.throws(()=>p.prepareJointReview({...good,mode:'PLAY'}),/PRIVATE_OR_UNAUTHORIZED_MODE/);
 assert.throws(()=>p.prepareJointReview({...good,taskId:'EX.W99.C03.P01'}),/ENGINEERING_TASK_ID_INVALID/);
 assert.throws(()=>p.prepareJointReview({...good,roomId:'../../escape'}),/WORK_ROOM_ID_INVALID/);
 assert.throws(()=>p.prepareJointReview({...good,hsn:'E145'}),/INVALID_SOURCE_COORDINATE/);
});
test('verified but changed plan digest cannot be substituted for canonical program',async()=>{
 const changed=JSON.parse(raw.toString('utf8'));
 changed.tasks[0].title+=' (mutated fixture)';
 const bytes=Buffer.from(JSON.stringify(changed));
 const alternate=await createExcellenceProgram(bytes,await sha256Bytes(bytes));
 assert.equal(isVerifiedProgram(alternate),true);
 assert.throws(()=>createMeta145ExcellenceBridge(alternate,manifest),/EXCELLENCE_PROGRAM_SOURCE_OR_STATUS_INVALID/);
});

// Use built-in node:http (not global fetch/undici) to support --jitless Node smoke.
async function localFetch(url,{method='GET'}={}) {
 return new Promise((resolve,reject)=>{
  const req=request(url,{method},res=>{
   const chunks=[];res.on('data',c=>chunks.push(c));res.once('end',()=>{
    const body=Buffer.concat(chunks).toString('utf8');
    resolve({status:res.statusCode,headers:{get:key=>res.headers[key.toLowerCase()]},
      text:async()=>body,json:async()=>JSON.parse(body)});
   });
  });
  req.once('error',reject);req.end();
 });
}

async function withHttp(authorize,run){
 const server=createServer(createMeta145HttpHandler(official,manifest,{authorize}));
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const url=`http://127.0.0.1:${server.address().port}`;
 try{await run(url);}finally{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
}
test('anonymous, wrong-account and missing callbacks see indistinguishable HOLD',async()=>{
 await withHttp(undefined,async base=>{
  const r=await localFetch(base+'/api/atlas/meta145/status'); const txt=await r.text();
  assert.equal(r.status,403);assert.equal(JSON.parse(txt).data,null);assert.ok(!txt.includes('H05.S05.N03'));
 });
 await withHttp(async()=>({allowed:false}),async base=>{
  const a=await localFetch(base+'/api/atlas/meta145/status');
  const b=await localFetch(base+'/api/atlas/meta145/review?hsn=H05.S05.N03&taskId=EX.W05.C03.P01&roomId=alpha-room');
  assert.equal(a.status,403);assert.equal(b.status,403);assert.equal(await a.text(),await b.text());
 });
});
test('local HTTP runs an actual exact-plan read-only endpoint under mocked host consent',async()=>{
 let checks=[];
 await withHttp(async({phase})=>{checks.push(phase);return {allowed:true};},async base=>{
  const r=await localFetch(base+'/api/atlas/meta145/status');const d=await r.json();
  assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');
  assert.equal(d.data.shapeReceipt.geometry.nodes,1728);
  assert.equal(d.status,'HOST_CALLBACK_REPORTED_SOURCE_ONLY_NOT_ATTESTED');
  assert.equal(d.rightsAtReturnIndependentlyVerified,false);
  const q=new URLSearchParams({hsn:HSN,taskId:TASK,roomId:'alpha-room'});
  const s=await localFetch(base+'/api/atlas/meta145/review?'+q);const data=await s.json();
  assert.equal(s.status,200);assert.equal(data.data.engineering.taskId,TASK);
  assert.equal(data.data.hsn.coordinate,HSN);
  assert.equal(data.data.workPosted,false);assert.equal(data.data.executionAuthorized,false);
 });
 assert.deepEqual(checks,['READ','RETURN','READ','RETURN']);
});
test('host rights revoked between READ and RETURN denies all egress',async()=>{
 let read=0,ret=0;
 await withHttp(async({phase})=>{if(phase==='READ'){read++;return {allowed:true}}ret++;return {allowed:false};},async base=>{
  const r=await localFetch(base+'/api/atlas/meta145/status');
  const raw=await r.text();assert.equal(r.status,403);
  assert.equal(JSON.parse(raw).data,null);
  assert.ok(!raw.includes('1728'));
 });
 assert.deepEqual([read,ret],[1,1]);
});
test('unknown routes, invalid HSN and mutation attempts are denied',async()=>{
 await withHttp(async()=>({allowed:true}),async base=>{
  assert.equal((await localFetch(base+'/api/atlas/meta145/nope')).status,404);
  assert.equal((await localFetch(base+'/api/atlas/meta145/review?hsn=E145&taskId=EX.W05.C03.P01&roomId=alpha-room')).status,400);
  assert.equal((await localFetch(base+'/api/atlas/meta145/status?x=unknown')).status,400);
  assert.equal((await localFetch(base+'/api/atlas/meta145/status',{method:'POST'})).status,405);
  assert.equal((await localFetch(base+'/api/atlas/meta145/review?hsn=H05.S05.N03&hsn=H01.S01.N01&taskId=EX.W05.C03.P01&roomId=alpha-room')).status,400);
 });
});
test('explicit Work-only local handoff leaves immutable authoritative plan intact',()=>{
 const p=createMeta145ExcellenceBridge(official,manifest);
 const r=p.prepareJointReview({hsn:'H01.S01.N01',taskId:'EX.W01.C01.P01',roomId:'work-room-one'});
 r.engineering.dependsOn.push('FORGED');
 const next=p.prepareJointReview({hsn:'H01.S01.N01',taskId:'EX.W01.C01.P01',roomId:'work-room-one'});
 assert.ok(!next.engineering.dependsOn.includes('FORGED'));
 assert.equal(official.descriptor().verifiedSteps,0);
});

test('READ/RETURN callback exceptions fail closed with no protected source',async()=>{
 for(const failurePhase of ['READ','RETURN']){
  await withHttp(async({phase})=>{if(phase===failurePhase)throw Error('revoked');return {allowed:true};},async base=>{
   const r=await localFetch(base+'/api/atlas/meta145/status');const x=await r.json();
   assert.equal(r.status,403);assert.equal(x.data,null);assert.equal(x.reason,'UNAUTHORIZED_OR_UNAVAILABLE');
  });
 }
});
test('handler cannot be tricked by absolute-form HTTP request-target',async()=>{
 const handler=createMeta145HttpHandler(official,manifest,{authorize:async()=>({allowed:true})});
 const res={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},end(s){this.body=s;}};
 await handler({method:'GET',url:'http://some-other-host/api/atlas/meta145/status'},res);
 assert.equal(res.statusCode,400);assert.equal(JSON.parse(res.body).data,null);
});
