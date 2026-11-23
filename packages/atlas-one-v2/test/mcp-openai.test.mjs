import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {AriadneRegistry,prepareResearch,Hold} from '../src/index.mjs';
import {createMcpRouter} from '../src/mcp.mjs';import {runOpenAIReview} from '../src/openai.mjs';
const src=process.env.ATLAS_ARIADNE_ORIGINAL_FILE;const registry=src?new AriadneRegistry(readFileSync(src)):null;
const cases=JSON.parse(readFileSync(new URL('../examples/four-source-candidates.json',import.meta.url),'utf8'));
const call=(handler,id,method,params)=>handler({jsonrpc:'2.0',id,method,params});
test('MCP initialization and tool discovery work with no source',()=>{const h=createMcpRouter();assert.equal(call(h,1,'initialize').result.serverInfo.name,'atlas-one-v2');assert.equal(call(h,2,'tools/list').result.tools.length,4);});
test('MCP protected query without source is HOLD',()=>{const x=call(createMcpRouter(),3,'tools/call',{name:'atlas_hsn_resolve',arguments:{coordinate:'H01.S01.N01'}});assert.equal(x.result.structuredContent.status,'HOLD');assert.equal(x.result.isError,true);});
test('MCP unknown method returns error',()=>assert.equal(call(createMcpRouter(),1,'hack').error.code,-32601));
test('MCP invalid envelope returns error',()=>assert.equal(createMcpRouter()({id:1,method:'ping'}).error.code,-32600));
test('MCP unknown tool returns error',()=>assert.equal(call(createMcpRouter(),1,'tools/call',{name:'change_canon'}).error.code,-32602));
test('MCP notifications are not calls',()=>assert.equal(createMcpRouter()({jsonrpc:'2.0',method:'notifications/initialized'}),null));
test('MCP returns version manifest without source',()=>assert.equal(call(createMcpRouter(),1,'tools/call',{name:'atlas_one_status'}).result.structuredContent.canon,'UNCHANGED'));
test('MCP exact registry resolves source hashes', {skip:!registry},()=>{const r=call(createMcpRouter({registry}),1,'tools/call',{name:'atlas_hsn_resolve',arguments:{coordinate:'H01.S05.N09'}});assert.equal(r.result.structuredContent.name,'Nuclear instrumentation');});
test('MCP research prepare never publishes', {skip:!registry},()=>{const r=call(createMcpRouter({registry}),1,'tools/call',{name:'atlas_research_prepare',arguments:{research:cases[0]}});assert.equal(r.result.structuredContent.canPublish,false);assert.equal(r.result.structuredContent.experiment,'NOT_EXECUTED');});
test('MCP work envelope never posts', {skip:!registry},()=>{const r=call(createMcpRouter({registry}),1,'tools/call',{name:'atlas_work_envelope',arguments:{research:cases[0]}});assert.equal(r.result.structuredContent.posted,false);});
test('model defaults OFF',async()=>assert.equal((await runOpenAIReview()).modelCalls,0));
test('model enabled without case is refused',async()=>await assert.rejects(()=>runOpenAIReview({enableModel:true,apiKeyPresent:true}),e=>e.code==='MODEL_PACKET_NOT_SOURCE_SCOPED'));
test('model enabled without API authority is refused',{skip:!registry},async()=>await assert.rejects(()=>runOpenAIReview({packet:prepareResearch(cases[0],registry),enableModel:true}),e=>e.code==='EXPLICIT_API_ENV_REQUIRED'));
test('model call bounded, tracing off; no SDK/network in test',{skip:!registry},async()=>{
 const events=[];class Agent{constructor(opts){events.push(opts)}}
 const sdk={Agent,run:async(agent,input,opts)=>{events.push({input,opts});return {finalOutput:'Suggested negative-control experiment, not validated.'}}};
 const result=await runOpenAIReview({packet:prepareResearch(cases[0],registry),enableModel:true,apiKeyPresent:true,sdk,maxTurns:3});
 assert.equal(result.status,'MODEL_REVIEW_UNVERIFIED');assert.equal(result.expertValidated,false);assert.equal(events[1].opts.tracingDisabled,true);assert.equal(events[1].opts.maxTurns,3);
});
test('model rejects runaway turns',{skip:!registry},async()=>await assert.rejects(()=>runOpenAIReview({packet:prepareResearch(cases[0],registry),enableModel:true,apiKeyPresent:true,maxTurns:999,sdk:{Agent:class{},run:async()=>({})}}),e=>e.code==='MODEL_TURN_BUDGET_INVALID'));
