/** Atlas ONE v2 local read-only MCP router. NOT an installed remote ChatGPT tool. */
import {versionInfo,prepareResearch,Hold,isObject,requireValid} from './index.mjs';
import {prepareWorkEnvelope} from './engine.mjs';
const TOOL_DEFS=[
 {name:'atlas_one_status',description:'Source-only Atlas ONE v2 status; no hosted permission or publication',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'atlas_hsn_resolve',description:'Resolve a pinned Ariadne v0.7 coordinate from owner-local immutable original bytes',inputSchema:{type:'object',properties:{coordinate:{type:'string'}},required:['coordinate'],additionalProperties:false}},
 {name:'atlas_research_prepare',description:'Prepare an unadjudicated Work research candidate, without model/tool/network calls',inputSchema:{type:'object',properties:{research:{type:'object'}},required:['research'],additionalProperties:false}},
 {name:'atlas_work_envelope',description:'Prepare a Work-only source-reference envelope, never post or grant access',inputSchema:{type:'object',properties:{research:{type:'object'}},required:['research'],additionalProperties:false}}
];
const response=(id,result)=>({jsonrpc:'2.0',id,result});
const error=(id,code,message)=>({jsonrpc:'2.0',id,error:{code,message}});
export function createMcpRouter({registry=null}={}){
  return function handle(raw){
    if(!isObject(raw)||raw.jsonrpc!=='2.0'||typeof raw.method!=='string')return error(raw?.id??null,-32600,'Invalid request');
    const id=raw.id;
    if(raw.method==='notifications/initialized')return null;
    if(id===undefined)return error(null,-32600,'Missing request id');
    if(raw.method==='initialize')return response(id,{protocolVersion:'2025-11-25',serverInfo:{name:'atlas-one-v2',version:versionInfo().version},capabilities:{tools:{listChanged:false}}});
    if(raw.method==='ping')return response(id,{});
    if(raw.method==='tools/list')return response(id,{tools:TOOL_DEFS});
    if(raw.method==='tools/call'){
      const {name,arguments:args={}}=raw.params||{};
      if(!TOOL_DEFS.some(t=>t.name===name))return error(id,-32602,'Unknown read-only tool');
      if(!isObject(args))return error(id,-32602,'Invalid tool arguments');
      let value;try{
        if(name==='atlas_one_status')value=versionInfo();
        else {
          requireValid(registry,'PINNED_LOCAL_REGISTRY_NOT_INSTALLED');
          if(name==='atlas_hsn_resolve')value=registry.lookup(args.coordinate);
          else {const candidate=prepareResearch(args.research,registry);value=name==='atlas_work_envelope'?prepareWorkEnvelope(candidate):candidate;}
        }
      }catch(e){value={status:'HOLD',reason:e instanceof Hold?e.code:'UNVERIFIED_TOOL_FAILURE',authorityEffect:'NONE'};}
      return response(id,{content:[{type:'text',text:JSON.stringify(value)}],structuredContent:value,isError:value.status==='HOLD'});
    }
    return error(id,-32601,'Method not found');
  };
}
