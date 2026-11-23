/** OpenAI Agents SDK is the only planned model runtime. No automatic calls. */
import {requireValid,isObject,Hold} from './index.mjs';
/** Caller must explicitly request network/model use and supply runtime authority;
 * the SDK's default tracing is disabled to avoid leaking research context.
 * The output remains a fallible model suggestion, not scientific validation.
 */
export async function runOpenAIReview({packet,enableModel=false,sdk=null,model=null,maxTurns=4,apiKeyPresent=false}={}){
  if(enableModel!==true)return {status:'MODEL_NOT_INVOKED',modelCalls:0,authorityEffect:'NONE'};
  requireValid(isObject(packet)&&packet.schema==='atlas.one.research/v2'&&packet.review==='CANDIDATE_NOT_ADJUDICATED'&&packet.hostRights==='UNVERIFIED','MODEL_PACKET_NOT_SOURCE_SCOPED');
  requireValid(apiKeyPresent===true,'EXPLICIT_API_ENV_REQUIRED');
  requireValid(Number.isInteger(maxTurns)&&maxTurns>=1&&maxTurns<=8,'MODEL_TURN_BUDGET_INVALID');
  const bridge=sdk||await import('@openai/agents');
  requireValid(typeof bridge.Agent==='function'&&typeof bridge.run==='function','AGENTS_SDK_UNAVAILABLE');
  const agent=new bridge.Agent({name:'AtlasGPT Independent Method Challenger',
    ...(typeof model==='string'&&model.length>0?{model}:{}),
    instructions:'Critically evaluate the supplied published sources and cross-domain hypothesis. Identify alternative explanations, retraction or correction risks, false friends, missing controls and a falsifiable next experiment. NEVER claim source access, tools, real reviewers, host permissions or CANON authority. This is a candidate review only.'});
  const minimal={caseId:packet.caseId,relation:packet.relation,hypothesis:packet.hypothesis,falsifier:packet.falsifier,testPlan:packet.testPlan,
    sources:packet.papers.map(p=>({id:p.id,url:p.url,status:p.status})),hsn:packet.nodes.map(n=>({coordinate:n.coordinate,name:n.name}))};
  const result=await bridge.run(agent,JSON.stringify(minimal),{maxTurns,tracingDisabled:true});
  return {status:'MODEL_REVIEW_UNVERIFIED',modelCalls:'ONE_RUN_BOUNDED',output:typeof result.finalOutput==='string'?result.finalOutput.slice(0,10000):null,
    expertValidated:false,experimentPerformed:false,hostAuthenticated:false,canonEffect:'NONE'};
}
