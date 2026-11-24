/** Public corpus port. Sources, trusted identity and host authorization are supplied by the caller. */
import {CorpusEngine, CORPUS_ENGINE_VERSION, FEATURE_REGISTRY} from './runtime/index.mjs';
export {CorpusEngine, CORPUS_ENGINE_VERSION, FEATURE_REGISTRY, sha256, chunkOffsets} from './runtime/index.mjs';

export const CORPUS_SYNTHESIS_SCHEMA='atlas.corpus-synthesis.port/v1';
const fail=code=>{throw Object.assign(new Error(code),{code});};
const held=()=>({schema:CORPUS_SYNTHESIS_SCHEMA,status:'AUTHORIZATION_HOLD',reason:'CURRENT_CALLER_AUTHORIZATION_REQUIRED',
  results:[],contextText:null,citations:[],evidence:[],valid:false,reasons:['CURRENT_CALLER_AUTHORIZATION_REQUIRED'],
  modelInvoked:false,modelTrainingPerformed:false,canonAdmitted:false,hostAuthenticated:false});

/**
 * Synchronous, opt-in read boundary over the actual local engine. The host must
 * authenticate its user and bind documents to that owner before constructing the
 * engine. A callback result is not independent proof of session authentication.
 * Closing this port does not destroy or take ownership of the caller's engine.
 */
export function createCorpusSynthesisAdapter({engine,authorize}={}){
  if(!(engine instanceof CorpusEngine))fail('CORPUS_ENGINE_INSTANCE_REQUIRED');
  if(typeof authorize!=='function')fail('CORPUS_AUTHORIZATION_CALLBACK_REQUIRED');
  let closed=false;
  const authorized=()=>{try{return authorize()===true;}catch{return false;}};
  const methods=['status','search','prepareContext','verifyCitation','synthesize','compare'];
  const bound=Object.fromEntries(methods.map(name=>[name,CorpusEngine.prototype[name].bind(engine)]));
  const invoke=(method,args)=>{
    if(closed)fail('CORPUS_ADAPTER_CLOSED');
    if(!authorized())return held();
    const result=bound[method](...args);
    if(closed||!authorized())return held();
    return result;
  };
  const adapter={
    descriptor(){return {schema:CORPUS_SYNTHESIS_SCHEMA,runtime:CORPUS_ENGINE_VERSION,featureCount:FEATURE_REGISTRY.length,
      status:closed?'CLOSED':'CALLER_SUPPLIED_LOCAL_ENGINE',ownsRuntimeLifecycle:false,hostAuthenticated:false,
      sourceLoading:'EXPLICIT_CALLER_INPUT',providerCalls:0,automaticRoomPosts:false};},
    close(){closed=true;}
  };
  for(const name of methods)adapter[name]=(...args)=>invoke(name,args);
  return Object.freeze(adapter);
}
