import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request} from 'node:http';
import {gunzipSync} from 'node:zlib';
import {createHmac,timingSafeEqual,createHash} from 'node:crypto';
import {createExcellenceProgram,sha256Bytes} from '../excellence-program.mjs';
import {compressedPlan,publishedProgram} from '../excellence-plan-data.mjs';
import {ARIADNE_SHA,EXCELLENCE_PLAN_SHA,E145_SCHEMA} from '../meta145-native-source-port.mjs';
import {createMeta145HostBoundHandler,mountMeta145HostBound} from '../meta145-host-admission.mjs';

const source={schema:E145_SCHEMA,source_sha256:ARIADNE_SHA,atlas_excellence_plan_sha256:EXCELLENCE_PLAN_SHA,
  node_count:1728,sphere_count:144,house_count:12,meta_coordinate:'E145',actual_work_macroturns:0,
  actual_resident_model_calls:0,host_permission_granted:false,canon_changed:false,broker_changed:false,
  strategy_option_evaluations:6912,swarmchat_client_tool_count:96,independently_hosted_components:0,
  meta_receipt_sha256:'a'.repeat(64),node_chain_head_sha256:'b'.repeat(64),house_root_sha256:'c'.repeat(64)};
const manifestBytes=Buffer.from(JSON.stringify(source));
const expectedManifestSha256=createHash('sha256').update(manifestBytes).digest('hex');
const mountSource={manifestBytes,expectedManifestSha256};
const hsn='H05.S05.N03',taskId='EX.W05.C03.P01',roomId='work-bounded-room';
const REVIEW='/api/atlas/meta145/review?'+new URLSearchParams({hsn,taskId,roomId});
const STATUS='/api/atlas/meta145/status';
const secret='fixture-hmac-secret-not-for-host';
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const sign=claims=>{const a=b64({alg:'HS256',typ:'JWT'}),b=b64(claims),raw=`${a}.${b}`;
  const sig=createHmac('sha256',secret).update(raw).digest('base64url');return `${raw}.${sig}`;};
const claims={sub:'owner-operator',tenant:'owner-scope',iss:'fixture-issuer',aud:'atlas-fixture',sid:'session-1',exp:1899999999};
function verifiedFixtureIssuer({req}){
  const t=req.headers.authorization;
  if(!/^Bearer [a-zA-Z0-9_.-]+$/.test(t||''))return null;
  const parts=t.slice(7).split('.');if(parts.length!==3)return null;
  const expected=createHmac('sha256',secret).update(parts.slice(0,2).join('.')).digest();
  const supplied=Buffer.from(parts[2],'base64url');
  if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied))return null;
  let head,c;try{head=JSON.parse(Buffer.from(parts[0],'base64url'));c=JSON.parse(Buffer.from(parts[1],'base64url'));}catch{return null;}
  if(head.alg!=='HS256'||c.aud!=='atlas-fixture'||c.iss!=='fixture-issuer'||c.exp<=Math.floor(Date.now()/1000))return null;
  return {verified:true,subject:c.sub,tenant:c.tenant,issuer:c.iss,session:c.sid};
}
function rights({scope}){return {allowed:true,purpose:scope.purpose,scope:'ATLAS_META145_READ_ONLY',permissionRevision:'revision-7',roomId:scope.roomId};}
let program;
before(async()=>{
  const zipped=Buffer.from(compressedPlan.gzip_base64,'base64');
  assert.equal(await sha256Bytes(zipped),compressedPlan.compressed_sha256);
  const raw=gunzipSync(zipped);assert.equal(raw.length,4898133);
  assert.equal(await sha256Bytes(raw),EXCELLENCE_PLAN_SHA);
  program=await createExcellenceProgram(raw,publishedProgram.planSha256);
});
function local(url,{method='GET',token=sign(claims),headers={}}={}){
  return new Promise((resolve,reject)=>{
    const req=request(url,{method,headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,...headers}},res=>{
      const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{
        const raw=Buffer.concat(chunks).toString('utf8');resolve({status:res.statusCode,headers:res.headers,raw,json:JSON.parse(raw)});
      });
    });req.once('error',reject);req.end();
  });
}
async function serve(opts,doWork){
  const handler=createMeta145HostBoundHandler(program,source,{authenticate:verifiedFixtureIssuer,authorize:rights,...opts});
  const server=createServer((req,res)=>handler(req,res));
  await new Promise((yes,no)=>server.once('error',no).listen(0,'127.0.0.1',yes));
  try{await doWork('http://127.0.0.1:'+server.address().port);}finally{await new Promise((yes,no)=>server.close(err=>err?no(err):yes()));}
}

// Actual verified, complete plan and isolated localhost transport; no external issuer.
test('actual source plan has exact expected digest and no ledger completion',()=>{
  assert.equal(program.descriptor().planSha256,EXCELLENCE_PLAN_SHA);
  assert.equal(program.descriptor().implementedSteps,0);
  assert.equal(program.descriptor().verifiedSteps,0);
});
test('requires host issuer AND permission service, never permissive by default',()=>{
  for(const x of [{},{authorize:rights},{authenticate:verifiedFixtureIssuer}])
    assert.throws(()=>createMeta145HostBoundHandler(program,source,x),/TRUSTED_HOST_ISSUER_AND_ACL_REQUIRED/);
});
test('authentic fixture token can read local source-only status with two rechecks',async()=>{
  const events=[];
  await serve({authenticate:async x=>{events.push('id:'+x.phase);return verifiedFixtureIssuer(x);},
    authorize:async x=>{events.push('acl:'+x.phase);return rights(x);}},async base=>{
    const r=await local(base+STATUS);
    assert.equal(r.status,200);assert.equal(r.json.data.shapeReceipt.geometry.nodes,1728);
    assert.equal(r.json.data.completedStepsFromLedger,'NOT_QUERIED');
    assert.equal(r.json.authenticatedPublisherIndependentlyVerified,false);
    assert.equal(r.json.rightsAtReturnIndependentlyVerified,false);
    assert.equal(r.json.workPosted,false);
    assert.equal(r.headers['cache-control'],'private, no-store, max-age=0');
    assert.equal(r.headers['x-content-type-options'],'nosniff');
  });assert.deepEqual(events,['id:READ','acl:READ','id:RETURN','acl:RETURN']);
});
test('real task and HSN remain separate namespaces and unreviewed',async()=>{
  await serve({},async base=>{
    const r=await local(base+REVIEW);assert.equal(r.status,200);
    assert.equal(r.json.data.hsn.coordinate,hsn);assert.equal(r.json.data.engineering.taskId,taskId);
    assert.equal(r.json.data.relationship,'PROPOSED_CROSSWALK_FOR_REVIEW_NOT_SAME_AS');
    assert.equal(r.json.data.executionAuthorized,false);assert.equal(r.json.data.workPosted,false);
    assert.equal(r.json.data.sourceBodiesIncluded,false);
  });
});
test('unsigned, malformed and forgery tokens cannot impersonate owner',async()=>{
  await serve({},async base=>{
    const wrong=[null,'anything','e30.e30.sig','.'+sign(claims)];
    for(const token of wrong){const r=await local(base+STATUS,{token,headers:{'x-user-id':'owner-operator'}});assert.equal(r.status,403);assert.equal(r.json.data,null);}
  });
});
test('caller from different tenant receives no information',async()=>{
  await serve({authorize:async x=>x.identity.tenant==='owner-scope'?rights(x):{allowed:false}},async base=>{
    const token=sign({...claims,tenant:'other-tenant'});
    const a=await local(base+STATUS,{token});const b=await local(base+REVIEW,{token});
    assert.equal(a.status,403);assert.equal(b.status,403);assert.equal(a.raw,b.raw);
  });
});
test('principal drift READ→RETURN fails even when ACL individually allows',async()=>{
  await serve({authenticate:async x=>({...verifiedFixtureIssuer(x),subject:x.phase==='READ'?'operator-A':'operator-B'})},async base=>{
    const r=await local(base+REVIEW);assert.equal(r.status,403);assert.equal(r.json.data,null);
  });
});
test('tenant drift READ→RETURN fails closed',async()=>{
  await serve({authenticate:async x=>({...verifiedFixtureIssuer(x),tenant:x.phase==='READ'?'one-tenant':'two-tenant'})},async base=>{
    assert.equal((await local(base+REVIEW)).status,403);
  });
});
test('session drift fails closed',async()=>{
  await serve({authenticate:async x=>({...verifiedFixtureIssuer(x),session:x.phase==='READ'?'session-A':'session-B'})},async base=>{
    assert.equal((await local(base+STATUS)).status,403);
  });
});
test('issuer drift fails closed',async()=>{
  await serve({authenticate:async x=>({...verifiedFixtureIssuer(x),issuer:x.phase==='READ'?'issuer-A':'issuer-B'})},async base=>{
    assert.equal((await local(base+STATUS)).status,403);
  });
});
test('permission revision change prevents stale source egress',async()=>{
  await serve({authorize:async x=>({...rights(x),permissionRevision:x.phase==='READ'?'7':'8'})},async base=>{
    const r=await local(base+REVIEW);assert.equal(r.status,403);assert.equal(r.json.data,null);
  });
});
test('permission revoked after READ prevents source egress',async()=>{
  await serve({authorize:async x=>({...rights(x),allowed:x.phase==='READ'})},async base=>{
    assert.equal((await local(base+STATUS)).status,403);
  });
});
test('cross-room grant mismatches exact requested room ID at READ and RETURN',async()=>{
  await serve({authorize:async x=>({...rights(x),roomId:'a-different-room'})},async base=>{
    assert.equal((await local(base+REVIEW)).status,403);
  });
});
test('host permission purpose and capability cannot be silently upgraded',async()=>{
  for(const field of ['purpose','scope']){
    await serve({authorize:async x=>({...rights(x),[field]:'DIFFERENT_PURPOSE'})},async base=>{
      assert.equal((await local(base+REVIEW)).status,403);
    });
  }
});
test('anonymous and unknown-room account receive identical HOLD body',async()=>{
  await serve({authorize:async x=>x.scope.roomId==='other-room'?rights(x):{allowed:false}},async base=>{
    const denied=await local(base+REVIEW),anonymous=await local(base+REVIEW,{token:null});
    assert.equal(denied.status,403);assert.equal(anonymous.status,403);assert.equal(denied.raw,anonymous.raw);
  });
});
test('authorization callback crash or issuer crash returns constant denial',async()=>{
  for(const stage of ['auth','acl']){
    await serve({[stage==='auth'?'authenticate':'authorize']:async()=>{throw Error('private system failure secret');}},async base=>{
      const r=await local(base+STATUS);assert.equal(r.status,403);assert.equal(r.json.data,null);
      assert.ok(!r.raw.includes('private system failure secret'));
    });
  }
});
test('unknown path, duplicate query, bad coordinates, non-GET and injected mode denied',async()=>{
  await serve({},async base=>{
    for(const [path,status] of [['/api/atlas/meta145/unknown',404],
      [STATUS+'?x=1',400],[REVIEW+'&hsn=H01.S01.N01',400],
      [REVIEW.replace(hsn,'H00.S00.N00'),400],
      [REVIEW+'&mode=PLAY',400],['//evil.test/api/atlas/meta145/status',400],
      [REVIEW.replace(roomId,'../../etc'),400]]){
      assert.equal((await local(base+path)).status,status,path);
    }
    assert.equal((await local(base+STATUS,{method:'POST'})).status,405);
  });
});
test('verified but altered plan cannot substitute official publisher plan',async()=>{
  const p=JSON.parse(gunzipSync(Buffer.from(compressedPlan.gzip_base64,'base64')));
  p.tasks[0].title+=' changed';const bytes=Buffer.from(JSON.stringify(p));
  const changed=await createExcellenceProgram(bytes,await sha256Bytes(bytes));
  assert.throws(()=>createMeta145HostBoundHandler(changed,source,{authenticate:verifiedFixtureIssuer,authorize:rights}),/EXCELLENCE_PROGRAM_SOURCE_OR_STATUS_INVALID/);
});
test('Express host stays unmodified if feature flag not explicitly enabled',async()=>{
  let added=0;const app={use:()=>{added++;}};
  const x=await mountMeta145HostBound(app,{});assert.equal(x.mounted,false);assert.equal(added,0);
});
test('missing verified issuer or host ACL aborts enabled mount',async()=>{
  let added=0;const app={use:()=>{added++;}};
  await assert.rejects(mountMeta145HostBound(app,{enabled:true,loadProgram:async()=>program,...mountSource}),/REAL_EXISTING_HOST_AND_ISSUER_REQUIRED/);
  assert.equal(added,0);
});
test('enabled explicit mount registers exactly one existing-host route',async()=>{
  let count=0,path,fn;const app={use:(a,b)=>{path=a;fn=b;count++;}};
  const result=await mountMeta145HostBound(app,{enabled:true,loadProgram:async()=>program,...mountSource,
    authenticate:verifiedFixtureIssuer,authorize:rights});
  assert.equal(result.mounted,true);assert.equal(count,1);assert.equal(path,'/api/atlas/meta145');assert.equal(typeof fn,'function');
});
test('live rollback toggle denies source after READ without remount or host mutation',async()=>{
  let active=true, calls=0,route;
  const app={use:(_,f)=>{route=f;}};
  await mountMeta145HostBound(app,{enabled:true,isEnabled:()=>active,loadProgram:async()=>program,...mountSource,
    authenticate:verifiedFixtureIssuer,authorize:async x=>{calls++;if(x.phase==='RETURN')active=false;return rights(x);}});
  const server=createServer((req,res)=>route(req,res));
  await new Promise((yes,no)=>server.once('error',no).listen(0,'127.0.0.1',yes));
  try{
    const base='http://127.0.0.1:'+server.address().port;
    const a=await local(base+STATUS);assert.equal(a.status,403);assert.equal(a.json.data,null);
    const b=await local(base+STATUS);assert.equal(b.status,403);assert.equal(b.json.data,null);assert.equal(calls,2);
  }finally{await new Promise((yes,no)=>server.close(e=>e?no(e):yes()));}
});
test('untrusted owner-supplied boolean is not accepted as verified issuer identity',async()=>{
  await serve({authenticate:async()=>({allowed:true,subject:'owner-operator'})},async base=>{
    const r=await local(base+STATUS);assert.equal(r.status,403);
  });
});

test('enabled host refuses wrong or unpinned exact manifest bytes',async()=>{
  let added=0;const app={use:()=>{added++;}};
  await assert.rejects(mountMeta145HostBound(app,{enabled:true,loadProgram:async()=>program,
    manifestBytes,expectedManifestSha256:'0'.repeat(64),authenticate:verifiedFixtureIssuer,authorize:rights}),/TRUSTED_MANIFEST_DIGEST_MISMATCH/);
  await assert.rejects(mountMeta145HostBound(app,{enabled:true,loadProgram:async()=>program,
    manifestBytes,authenticate:verifiedFixtureIssuer,authorize:rights}),/OWNER_SELECTED_SOURCE_PIN_REQUIRED/);
  const changed=Buffer.from(JSON.stringify({...source,canon_changed:true}));
  await assert.rejects(mountMeta145HostBound(app,{enabled:true,loadProgram:async()=>program,
    manifestBytes:changed,expectedManifestSha256,authenticate:verifiedFixtureIssuer,authorize:rights}),/TRUSTED_MANIFEST_DIGEST_MISMATCH/);
  assert.equal(added,0);
});
