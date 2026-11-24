import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareGenerationResponse,providerStatus,PROVIDERS} from '../server/provider-boundary.mjs';

test('every supported server provider honestly remains unavailable without fabricated content or usage',()=>{
  for(const provider of PROVIDERS){
    const result=prepareGenerationResponse({provider,prompt:'A source-bound test request.',max_tokens:42});
    assert.equal(result.status,503);assert.equal(result.body.error,'provider_unavailable');
    assert.equal(result.body.reason,'PROVIDER_ADAPTER_NOT_CONFIGURED');assert.equal(result.body.provider,provider);
    assert.equal(result.body.modelInvoked,false);assert.equal(result.body.outputGenerated,false);
    for(const key of ['text','tokens_used','usage','finish_reason'])assert.equal(Object.hasOwn(result.body,key),false);
    assert.doesNotMatch(JSON.stringify(result),/VERIFIED/);
  }
  assert.equal(prepareGenerationResponse({prompt:'Hello'}).body.provider,'gemini');
});

test('malformed prompts, provider names, fields and token limits fail before any provider action',()=>{
  for(const value of [null,[],true,'request',{}, {prompt:''},{prompt:12},{prompt:'x',provider:'unknown'},
    {prompt:'x',provider:null},{prompt:'x',max_tokens:0},{prompt:'x',max_tokens:16001},
    {prompt:'x',max_tokens:2.2},{prompt:'x',max_tokens:'20'},{prompt:'x',max_tokens:NaN},
    {prompt:'x',verified:true},{prompt:'x'.repeat(60001)}]){
    const result=prepareGenerationResponse(value);assert.equal(result.status,400);
    assert.equal(result.body.modelInvoked,false);assert.equal(result.body.outputGenerated,false);
  }
});

test('accessors and cyclic requests are rejected without invoking caller code',()=>{
  let count=0;const body={get prompt(){count++;return 'x';}};
  assert.equal(prepareGenerationResponse(body).status,400);assert.equal(count,0);
  const cycle={prompt:'x'};cycle.self=cycle;assert.equal(prepareGenerationResponse(cycle).status,400);
});

test('credential presence is separate from configured adapter readiness and secrets never appear in status',()=>{
  const secret='SYNTHETIC_CREDENTIAL_NOT_A_REAL_SECRET';
  const status=providerStatus({GEMINI_API_KEY:secret,OPENAI_API_KEY:secret});
  assert.equal(status.providers.gemini.credentialPresent,true);
  assert.equal(status.providers.openai.credentialPresent,true);
  assert.equal(status.providers.xai.credentialPresent,false);
  assert.ok(Object.values(status.providers).every(p=>p.ready===false&&p.adapterConfigured===false));
  assert.equal(JSON.stringify(status).includes(secret),false);
});

test('server route delegates to the honest boundary; existing frontend send/error handling stays separate',()=>{
  const server=readFileSync(new URL('../server.ts',import.meta.url),'utf8');
  assert.match(server,/prepareGenerationResponse\(req\.body\)/);
  assert.doesNotMatch(server,/tokens_used:\s*10|\[✓ VERIFIED\] Response/);
  const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
  assert.match(app,/generateContentStream/);assert.match(app,/SYSTEM ERROR:/);
  assert.match(app,/Output format checks/);
});
