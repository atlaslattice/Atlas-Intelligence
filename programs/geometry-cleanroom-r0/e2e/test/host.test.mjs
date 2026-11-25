import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {request as localHttpRequest} from 'node:http';
import {createAtlasLocalHost,createMutableLocalAuthority,SELECTED_HEAD,FROZEN_BGE_SHA} from '../src/host.mjs';
import {ARIADNE_SHA256} from '../../src/geometry.mjs';
import {CUPWAKE_EDITION,SYMBIOSIS_EDITION} from '../../src/yijing-cymatic.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
let rid=1;const token='test-local-owner-token-43-characters-'+randomBytes(10).toString('hex');
const req=(over={})=>({query:'How are Atlas lattice sources protected?',k:8,requestId:'a-'+rid++,sourceSha256:ARIADNE_SHA256,
 sourceEdition:'ariadne-original-v0.7',yijingEdition:CUPWAKE_EDITION,scope:'WORK',...over});
const makeFrame=({query,k,requestId},options={})=>{
 const scores=Array.from({length:1728},(_,i)=>1-(i/1728)),embedding=Array.from({length:384},(_,i)=>i/1000);
 if(options.mutate)scores[options.mutate]=scores[options.mutate]-0.005;
 return {event:'FRAME',requestId,querySha256:hash(query),registrySha256:ARIADNE_SHA256,headStateSha256:options.badHead?'f'.repeat(64):SELECTED_HEAD,
 modelSha256:options.badModel?'a'.repeat(64):FROZEN_BGE_SHA,embedding,scores,topIds:Array.from({length:k},(_,i)=>`H01.S01.N${String(i+1).padStart(2,'0')}`),encoderInvocations:1,headInvocations:1,lexicalFallback:false,weightsUpdated:false};
};
async function fixture({afterFrame=()=>{},infer=makeFrame}={}){
 const authority=createMutableLocalAuthority();let called=0;
 const host=createAtlasLocalHost({infer:async r=>{called++;return infer(r);},token,policyAuthority:authority,afterFrame});
 const addr=await host.listen(),base=`http://127.0.0.1:${addr.port}/v1/neural-inspect`;
 const post=async(payload,opts={})=>new Promise((resolve,reject)=>{
  const data=typeof payload==='string'?payload:JSON.stringify(payload);
  const conn=localHttpRequest(base,{method:'POST',headers:{'Content-Type':'application/json',...(opts.auth===false?{}:{Authorization:'Bearer '+(opts.badAuth?'wrong':token)})}},resp=>{
   let body='';resp.setEncoding('utf8');resp.on('data',chunk=>body+=chunk);resp.on('end',()=>{
    try{resolve({status:resp.statusCode,body:JSON.parse(body)});}catch(e){reject(e)}
   });
  });conn.on('error',reject);conn.end(data);
 });
 return {host,post,authority,called:()=>called,stop:()=>host.close()};
}
test('actual HTTP loopback: ONE inference shared across four aliases, actual full-score digest',async t=>{
 const f=await fixture();t.after(f.stop);const q=req();const x=await f.post(q);
 assert.equal(x.status,200);assert.equal(x.body.status,'LOCAL_AUTHENTICATED_INSPECTION');assert.equal(x.body.top.length,8);
 assert.equal(x.body.top[0].hsn,'H01.S01.N01');assert.equal(x.body.singleNeuralExecution,true);assert.equal(x.body.consumerObjectIdentical,true);
 assert.equal(x.body.yijingEdition,CUPWAKE_EDITION);assert.equal(x.body.fieldUnits,'DIMENSIONLESS');assert.equal(x.body.glyphHz,null);
 assert.equal(x.body.releaseAuthorized,false);assert.equal(x.body.currentExternalRightsVerified,false);assert.equal(x.body.hostedPublic,false);
 assert.equal(f.called(),1);
});
test('token required at local HTTP boundary; unauthorized call never reaches inference',async t=>{
 const f=await fixture();t.after(f.stop);
 assert.equal((await f.post(req(),{auth:false})).status,401);
 assert.equal((await f.post(req(),{badAuth:true})).status,401);
 assert.equal(f.called(),0);
});
test('strict WORK and exact Ariadne edition and Yijing edition',async t=>{
 const f=await fixture();t.after(f.stop);
 for(const alteration of [{scope:'PALACE'},{sourceSha256:'f'.repeat(64)},{sourceEdition:'unknown'}, {yijingEdition:'unversioned'}, {k:49}]){
  assert.equal((await f.post(req(alteration))).status,400);
 }
 assert.equal(f.called(),0);
});
test('local auth phases READ INFERENCE_USE DISCLOSE RETURN and replay fences',async t=>{
 const f=await fixture();t.after(f.stop);
 f.authority.change({revoke:'DISCLOSE'});assert.equal((await f.post(req())).body.reason,'DISCLOSURE_HOLD');
 f.authority.change({revoke:'RETURN'});assert.equal((await f.post(req())).body.reason,'DISCLOSURE_HOLD');
});
test('late withdrawal holds a complete real score frame before final egress',async t=>{
 let f;f=await fixture({afterFrame:async()=>{f.authority.change({epoch:'revoked-epoch-2'});}});t.after(f.stop);
 const x=await f.post(req());assert.equal(x.status,409);assert.equal(x.body.reason,'RETURN_RIGHTS_REVOKED');assert.equal(f.called(),1);
});
test('model identity and full ranking checked before symbolic view',async t=>{
 const f=await fixture({infer:r=>makeFrame(r,{badHead:true})});t.after(f.stop);
 const x=await f.post(req());assert.equal(x.status,409);assert.equal(x.body.reason,'INVALID_OR_MISMATCHED_ISSUED_FRAME');
});
test('same top-k but changed hidden 1728-score vector changes full digest',async t=>{
 const f=await fixture({infer:r=>makeFrame(r,{mutate:r.requestId.endsWith('2')?1500:0})});t.after(f.stop);
 const x=await f.post(req({requestId:'x-1'}));const y=await f.post(req({requestId:'x-2'}));
 assert.equal(x.status,200);assert.equal(y.status,200);assert.deepEqual(x.body.top,y.body.top);
 assert.notEqual(x.body.scoreSha256,y.body.scoreSha256);
});
test('request IDs are one-shot; wrong content-type and oversized rejected',async t=>{
 const f=await fixture();t.after(f.stop);const q=req({requestId:'same1'});
 assert.equal((await f.post(q)).status,200);assert.equal((await f.post(q)).body.reason,'REQUEST_REPLAY');
 assert.equal((await f.post('{"__proto__":true}')).status,400);
 const big=req({query:'a'.repeat(9000)});assert.equal((await f.post(big)).status,413);
});
test('both peer Yijing editions attach without any model or head change',async t=>{
 const f=await fixture();t.after(f.stop);
 const a=await f.post(req({yijingEdition:CUPWAKE_EDITION}));const b=await f.post(req({yijingEdition:SYMBIOSIS_EDITION}));
 assert.equal(a.status,200);assert.equal(b.status,200);assert.deepEqual(a.body.top.map(x=>x.hsn),b.body.top.map(x=>x.hsn));
 assert.equal(a.body.scoreSha256,b.body.scoreSha256);assert.notEqual(a.body.yijingEdition,b.body.yijingEdition);
});

test('frozen BGE original weight hash is mandatory (not only selected head hash)',async t=>{
 const f=await fixture({infer:r=>makeFrame(r,{badModel:true})});t.after(f.stop);
 const v=await f.post(req());assert.equal(v.status,409);assert.equal(v.body.reason,'INVALID_OR_MISMATCHED_ISSUED_FRAME');
});
test('late READ right withdrawal also blocks already-scored result',async t=>{
 let f;f=await fixture({afterFrame:async()=>{f.authority.change({revoke:'READ'});}});t.after(f.stop);
 const v=await f.post(req());assert.equal(v.status,409);assert.equal(v.body.reason,'RETURN_RIGHTS_REVOKED');
});
