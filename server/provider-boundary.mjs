/** The server proxy has no installed provider adapter. Never fabricate output or usage. */
import {snapshot} from '../programs/civilization-r01/runtime/json.mjs';

export const PROVIDERS=Object.freeze(['gemini','anthropic','openai','xai']);
const error=(status,code,message,provider)=>({status,body:{error:code,message,
  ...(provider?{provider}:{}),modelInvoked:false,outputGenerated:false}});

export function prepareGenerationResponse(input){
  let body;
  try{body=snapshot(input,{maxBytes:65536,maxDepth:8,maxItems:1024});}
  catch{return error(400,'invalid_request','A bounded JSON request is required.');}
  if(!body||typeof body!=='object'||Array.isArray(body)||
    Object.keys(body).some(key=>!['provider','prompt','max_tokens'].includes(key)))
    return error(400,'invalid_request','Only provider, prompt and max_tokens are accepted.');
  const {provider='gemini',prompt,max_tokens=4000}=body;
  if(typeof provider!=='string'||!PROVIDERS.includes(provider))
    return error(400,'unsupported_provider','Select a supported provider.');
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>60000)
    return error(400,'invalid_prompt','A nonempty prompt of at most 60,000 characters is required.',provider);
  if(!Number.isSafeInteger(max_tokens)||max_tokens<1||max_tokens>16000)
    return error(400,'invalid_token_limit','max_tokens must be an integer from 1 to 16000.',provider);
  return {status:503,body:{error:'provider_unavailable',provider,
      message:'The server provider adapter is not configured. No model call was made.',
      reason:'PROVIDER_ADAPTER_NOT_CONFIGURED',modelInvoked:false,outputGenerated:false}};
}

export function providerStatus(environment={}){
  const keys={gemini:'GEMINI_API_KEY',anthropic:'ANTHROPIC_API_KEY',openai:'OPENAI_API_KEY',xai:'XAI_API_KEY'};
  return {schema:'atlas.server-provider-status/v1',serverProxy:'UNCONFIGURED',
    providers:Object.fromEntries(PROVIDERS.map(provider=>[provider,{
      credentialPresent:Boolean(environment[keys[provider]]),adapterConfigured:false,ready:false
    }])),modelCallsByStatusRead:0};
}
