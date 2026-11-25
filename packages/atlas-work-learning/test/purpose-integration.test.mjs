import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createWorkLearningGateway,authorizedResultMetadata,dispatchResponsesFunctionCall,createMcpRouter} from '../src/index.mjs';
const sha = t=>createHash('sha256').update(t).digest('hex');
const REG='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
const pins={workspaceId:'purpose-review',registrySha256:REG,configSha256:'a'.repeat(64),corpusSha256:'b'.repeat(64),checkpointSha256:'c'.repeat(64)};
const R={id:'s-a',version:'v1',sha256:sha('source a'),uri:'urn:review:a'}, B={id:'s-b',version:'v1',sha256:sha('source b'),uri:'urn:review:b'};
const excerpt='Synthetic eligible A text.';
const item={id:'item-a',sourceId:R.id,textSha256:sha(excerpt)};
const ci={...item,sourceVersion:R.version,sourceSha256:R.sha256,sourceUri:R.uri,excerptSha256:sha(excerpt),excerptTruncated:false};
const arg={query:'synthetic query',limit:1,target:'corpus'};
const result=()=>({target:'corpus',method:'neural',primaryMethod:'neural',fallbackUsed:false,fallbackReason:null,
  semanticAcceptance:false,hits:[{id:item.id,title:'Synthetic A',score:.625,source_id:R.id,source_version:R.version,
  source_sha256:R.sha256,source_uri:R.uri,text_sha256:item.textSha256,excerpt,excerpt_sha256:sha(excerpt),excerpt_truncated:false}],
  provenance:{...pins,sourceRefs:[{...R}],itemRefs:[{...item}]}});
const make=(t,{beforeUse=()=>true,afterUse=()=>true,disclose=()=>true,final=()=>true,resultFactory=result,
  purposePolicy='STRICT_SOURCE_ONLY',includeUse=true,includeFinal=true}={})=>{
  const events=[];let backendCalls=0,finished=false;
  const opts={owner:'review-owner',workspaceId:pins.workspaceId,sourceManifest:{sources:[R,B],items:[ci]},verifyPins:async()=>({...pins}),
    authorize:async c=>{events.push({kind:'disclosure',action:c.action,id:c.ref?.id??''});return disclose(c,finished)},
    backend:{execute:async()=>{backendCalls++;finished=true;return resultFactory()},close:async()=>{}}, purposePolicy,
    ...(includeUse?{authorizeInferenceUse:async c=>{events.push({kind:'inference',phase:c.phase,id:c.ref.id});return (c.phase==='BEFORE_COMPUTE'?beforeUse:afterUse)(c,finished)}}:{}),
    ...(includeFinal?{hostOwnedFinalReturnSync:c=>{events.push({kind:'final',id:''});return final(c,finished)}}:{})};
  const gateway=createWorkLearningGateway(opts);t.after(()=>gateway.close());return {gateway,events,calls:()=>backendCalls};
};
test('purpose-bound stable case returns exact provenance and identity',async t=>{
 const q=make(t);const x=await q.gateway.search(arg);assert.deepEqual(x,result());
 assert.equal(authorizedResultMetadata(x).purposePolicy,'STRICT_SOURCE_ONLY');
 assert.deepEqual(q.events.filter(x=>x.kind==='inference').map(x=>x.phase+':'+x.id),[
 'BEFORE_COMPUTE:s-a','BEFORE_COMPUTE:s-b','AFTER_COMPUTE:s-a','AFTER_COMPUTE:s-b']);
 assert.deepEqual(q.events.filter(x=>x.kind==='disclosure'&&x.action==='RETURN'&&x.id).map(x=>x.id),['s-a','item-a']);
 assert.equal(q.calls(),1);
});
test('missing current inference-use authority holds before model call',async t=>{
 const q=make(t,{beforeUse:c=>c.ref.id!==B.id});await assert.rejects(q.gateway.search(arg),e=>e.code==='INFERENCE_USE_DENIED');assert.equal(q.calls(),0);
});
test('off-result USE permission revoked after model work, RETURN still ALLOW: HOLD',async t=>{
 const q=make(t,{afterUse:c=>c.ref.id!==B.id});await assert.rejects(q.gateway.search(arg),e=>e.code==='INFERENCE_USE_DENIED');assert.equal(q.calls(),1);
 assert.equal(q.events.filter(e=>e.kind==='disclosure'&&e.action==='RETURN').length,0);
});
test('allowed inference, denied off-result quotation: output passes without disclosing off-result ref',async t=>{
 const q=make(t,{disclose:c=>!(c.action==='RETURN'&&c.kind==='SOURCE'&&c.ref?.id===B.id)});const x=await q.gateway.search(arg);assert.equal(x.hits.length,1);
 assert.ok(!x.provenance.sourceRefs.some(s=>s.id===B.id));assert.ok(!q.events.some(e=>e.kind==='disclosure'&&e.action==='RETURN'&&e.id===B.id));
});
test('returned source disclosure denied with inference allowed: HOLD',async t=>{
 const q=make(t,{disclose:c=>!(c.action==='RETURN'&&c.kind==='SOURCE'&&c.ref?.id===R.id)});await assert.rejects(q.gateway.search(arg),e=>e.code==='ACCESS_DENIED');
});
test('source is in returned provenance even when not a hit, disclosure denial must HOLD',async t=>{
 const q=make(t,{resultFactory:()=>{const x=result();x.provenance.sourceRefs.push(B);return x;},disclose:c=>!(c.action==='RETURN'&&c.kind==='SOURCE'&&c.ref?.id===B.id)});
 await assert.rejects(q.gateway.search(arg),e=>e.code==='ACCESS_DENIED');
});
test('unknown inference-use purpose does not inherit READ permission',async t=>{
 const q=make(t,{afterUse:c=>c.ref.id===B.id?undefined:true});await assert.rejects(q.gateway.search(arg),e=>e.code==='INFERENCE_USE_DENIED');
});
test('missing explicit host purpose contract cannot create strict gateway',t=>{
 assert.throws(()=>make(t,{includeUse:false}),e=>e.code==='PURPOSE_BINDING_REQUIRED');
 assert.throws(()=>make(t,{includeFinal:false}),e=>e.code==='PURPOSE_BINDING_REQUIRED');
});
test('synchronous final release refusal holds entire page including Responses and MCP',async t=>{
 const q=make(t,{final:()=>false});await assert.rejects(q.gateway.search(arg),e=>e.code==='FINAL_RELEASE_DENIED');
 const response=await dispatchResponsesFunctionCall(q.gateway,{type:'function_call',call_id:'final-refused',name:'atlas_work_learning_search',arguments:JSON.stringify(arg)});
 assert.equal(JSON.parse(response.output).error.code,'FINAL_RELEASE_DENIED');assert.ok(!response.output.includes(excerpt));
 const router=createMcpRouter({gateway:q.gateway});await router({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'test',version:'1'}}});
 await router({jsonrpc:'2.0',method:'notifications/initialized'});
 const reply=await router({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'atlas_work_learning_search',arguments:arg}});
 assert.equal(reply.result.isError,true);assert.equal(reply.result.structuredContent.error.code,'FINAL_RELEASE_DENIED');
 assert.ok(!JSON.stringify(reply).includes(excerpt));
});
test('thenable fake synchronous release is held, no implicit await allowed',async t=>{
 const q=make(t,{final:()=>Promise.resolve(true)});await assert.rejects(q.gateway.search(arg),e=>e.code==='FINAL_RELEASE_DENIED');
});
test('legacy default preserves prior explicit behavior but cannot be called purpose-bound',async t=>{
 const q=make(t,{purposePolicy:'LEGACY',includeUse:false,includeFinal:false});const x=await q.gateway.search(arg);
 assert.equal(authorizedResultMetadata(x).purposePolicy,'LEGACY');
 assert.ok(q.events.some(e=>e.kind==='disclosure'&&e.action==='RETURN'&&e.id===B.id));
});
