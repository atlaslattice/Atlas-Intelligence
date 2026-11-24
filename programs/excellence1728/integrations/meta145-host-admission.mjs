/** Atlas META145 source-only HTTP admission, for an EXISTING trusted host.
 *
 * No issuer, ACL, session store, broker, backend or host rights are implemented
 * here. Callbacks MUST be supplied by the existing publisher's actual validated
 * issuer and current Work-room permission service. This module refuses absent
 * callbacks, forged status, principal/tenant drift, permission revision drift,
 * private modes and all writes. A local success is not host attestation.
 */
import { createMeta145ExcellenceBridge } from './meta145-native-source-port.mjs';
import { createHash } from 'node:crypto';

const HSN = /^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const TASK = /^EX\.W(0[1-9]|1[0-2])\.C(0[1-9]|1[0-2])\.P(0[1-9]|1[0-2])$/;
const ROOM = /^[A-Za-z0-9_-]{3,80}$/;
const PRINCIPAL = /^[A-Za-z0-9_:.@-]{3,256}$/;
const MAX_URI = 512;
const DENIED = Object.freeze({schema:'atlas.meta145.http-result/v2',status:'HOLD',reason:'UNAUTHORIZED_OR_UNAVAILABLE',data:null});

function safeText(x){return typeof x==='string' && PRINCIPAL.test(x) && x!=='undefined' && x!=='null';}
function validIdentity(x){return x && x.verified===true && ['subject','tenant','issuer','session'].every(k=>safeText(x[k]));}
function validGrant(x,scope){
  return x && x.allowed===true && x.purpose==='ATLAS_META145_WORK_SOURCE_READ' &&
    x.scope==='ATLAS_META145_READ_ONLY' && safeText(x.permissionRevision) &&
    (scope.roomId ? x.roomId===scope.roomId : x.roomId===null);
}
function sameIdentity(a,b){return ['subject','tenant','issuer','session'].every(k=>a[k]===b[k]);}
function sameGrant(a,b){return ['purpose','scope','permissionRevision','roomId'].every(k=>a[k]===b[k]);}
function response(res,code,body){
  res.statusCode=code;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('Pragma','no-cache');
  res.setHeader('Expires','0');
  res.setHeader('Vary','Authorization, Cookie');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.end(JSON.stringify(body));
}
const deny=(res,code=403)=>response(res,code,DENIED);

function selection(req){
  const raw=req?.originalUrl ?? req?.url;
  if(req?.method!=='GET')return {error:405};
  if(typeof raw!=='string'||raw.length>MAX_URI||!raw.startsWith('/')||raw.startsWith('//')||raw.includes('#'))return {error:400};
  let url; try{url=new URL(raw,'http://localhost');}catch{return {error:400};}
  if(!['/api/atlas/meta145/status','/api/atlas/meta145/review'].includes(url.pathname))return {error:404};
  const keys=[...url.searchParams.keys()];
  if(url.pathname.endsWith('/status')){
    if(keys.length!==0)return {error:400};
    return {operation:'status',roomId:null,mode:'WORK'};
  }
  if(keys.length!==3||new Set(keys).size!==3||keys.some(k=>!['hsn','taskId','roomId'].includes(k)))return {error:400};
  const [hsn,taskId,roomId]=['hsn','taskId','roomId'].map(k=>url.searchParams.get(k));
  if(!HSN.test(hsn)||!TASK.test(taskId)||!ROOM.test(roomId))return {error:400};
  return {operation:'review',hsn,taskId,roomId,mode:'WORK'};
}

/** The host must inject independent authenticated issuer and current ACL callbacks.
 * Both functions are invoked again before result egress. Authorization revision
 * and issuer session may not drift, even when both phases individually allow.
 */
export function createMeta145HostBoundHandler(program,manifest,{authenticate,authorize}={}){
  if(typeof authenticate!=='function'||typeof authorize!=='function')throw new TypeError('TRUSTED_HOST_ISSUER_AND_ACL_REQUIRED');
  const bridge=createMeta145ExcellenceBridge(program,manifest);
  return async function meta145HostBound(req,res,liveGate=()=>true){
    const choice=selection(req);
    if(choice.error){if(choice.error===405)res.setHeader('Allow','GET');return deny(res,choice.error);}
    const scope=Object.freeze({purpose:'ATLAS_META145_WORK_SOURCE_READ',...choice});
    let firstIdentity,firstGrant;
    try{
      firstIdentity=await authenticate({phase:'READ',req,scope});
      if(!validIdentity(firstIdentity))return deny(res);
      firstGrant=await authorize({phase:'READ',identity:firstIdentity,req,scope});
      if(!validGrant(firstGrant,scope))return deny(res);
    }catch{return deny(res);}
    let result;
    try{
      result=choice.operation==='status'?bridge.status():bridge.prepareJointReview(choice);
    }catch{return deny(res,400);}
    try{
      const lastIdentity=await authenticate({phase:'RETURN',req,scope});
      if(!validIdentity(lastIdentity)||!sameIdentity(firstIdentity,lastIdentity))return deny(res);
      const lastGrant=await authorize({phase:'RETURN',identity:lastIdentity,req,scope});
      if(!validGrant(lastGrant,scope)||!sameGrant(firstGrant,lastGrant))return deny(res);
      if(liveGate()!==true)return deny(res);
    }catch{return deny(res);}
    // Authority effects remain NONE even when a controlled local host callback passes.
    return response(res,200,{schema:'atlas.meta145.http-result/v2',
      status:'HOST_CALLBACK_REPORTED_SOURCE_ONLY_NOT_ATTESTED',data:result,
      authenticatedPublisherIndependentlyVerified:false,
      rightsAtReturnIndependentlyVerified:false,workPosted:false,executionAuthorized:false});
  };
}

function sourceManifestFromTrustedPin(manifestBytes,expectedManifestSha256){
  if(typeof expectedManifestSha256!=='string'||!/^[a-f0-9]{64}$/.test(expectedManifestSha256))
    throw new TypeError('OWNER_SELECTED_SOURCE_PIN_REQUIRED');
  if(typeof manifestBytes!=='string'&&!(manifestBytes instanceof Uint8Array))
    throw new TypeError('EXACT_MANIFEST_BYTES_REQUIRED');
  const bytes=Buffer.from(manifestBytes);
  if(bytes.length<100||bytes.length>1024*1024)throw new TypeError('MANIFEST_SIZE_INVALID');
  if(createHash('sha256').update(bytes).digest('hex')!==expectedManifestSha256)
    throw new TypeError('TRUSTED_MANIFEST_DIGEST_MISMATCH');
  let text,parsed;
  try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);parsed=JSON.parse(text);}
  catch{throw new TypeError('MANIFEST_PARSE_FAILED');}
  return parsed;
}

/** Existing Express host option. No app, host, server, secret, or endpoint is created
 * if the explicit feature gate is absent. Use app.use before a catch-all route.
 */
export async function mountMeta145HostBound(app,{enabled=false,isEnabled,loadProgram,manifestBytes,expectedManifestSha256,authenticate,authorize}={}){
  if(enabled!==true)return Object.freeze({mounted:false,status:'OFF_BY_DEFAULT'});
  if(typeof app?.use!=='function'||typeof loadProgram!=='function'||typeof authenticate!=='function'||typeof authorize!=='function'){
    throw new TypeError('REAL_EXISTING_HOST_AND_ISSUER_REQUIRED');
  }
  // The pin MUST come from trusted operator config, never from a client request.
  const manifest=sourceManifestFromTrustedPin(manifestBytes,expectedManifestSha256);
  const program=await loadProgram();
  const handler=createMeta145HostBoundHandler(program,manifest,{authenticate,authorize});
  const liveGate=typeof isEnabled==='function'?isEnabled:()=>true;
  // Operator-controlled rollback gate is checked at initial request and egress.
  app.use('/api/atlas/meta145',async(req,res)=>{
    try{if(liveGate()!==true)return deny(res);}catch{return deny(res);}
    return handler(req,res,liveGate);
  });
  return Object.freeze({mounted:true,status:'HOST_MOUNTED_NEEDS_ISSUER_AND_CANARY_ATTESTATION'});
}
