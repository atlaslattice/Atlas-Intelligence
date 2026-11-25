/** Loopback-only owner-local Atlas REAL inference acceptance host.
 * This is NOT a remote deployment, source-provider entitlement issuer, or release grant.
 * All authority lives in the host-injected, mutable local policy; a digest alone grants nothing.
 */
import {createServer} from 'node:http';
import {createHash,timingSafeEqual} from 'node:crypto';
import {types as utilTypes} from 'node:util';
import {fusedTensorSelect} from '../../src/fused.mjs';
import {flatReference,ARIADNE_SHA256,originalAddresses} from '../../src/geometry.mjs';
import {encodeYijing,glyphCoefficients,EDITIONS} from '../../src/yijing-cymatic.mjs';

export const SELECTED_HEAD='736fdd341778468d32d89ca3cb60b71d415f678dae7b2efdcec978a08b7432d8';
export const FROZEN_BGE_SHA='828e1496d7fabb79cfa4dcd84fa38625c0d3d21da474a00f08db0f559940cf35';
export const LOCAL_SCHEMA='atlas.local.real-e2e/v1';
const SHA=/^[a-f0-9]{64}$/;
const ID=/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,99}$/;
function deny(reason,http=409){return {http,body:{schema:LOCAL_SCHEMA,status:'HOLD',reason,releaseAuthorized:false,remoteSourceRightsVerified:false,hostedPublic:false,trainingPerformed:false}};}
function sha(text){return createHash('sha256').update(text).digest('hex')}
function verifiedJson(raw){
 if(raw.includes('"__proto__"')||raw.includes('"constructor"')||raw.includes('"prototype"'))throw Error('PROHIBITED_KEY');
 const x=JSON.parse(raw);if(!x||Array.isArray(x)||Object.getPrototypeOf(x)!==Object.prototype)throw Error('INVALID_REQUEST');
 const keys=['query','k','requestId','sourceSha256','sourceEdition','yijingEdition','scope'];
 if(Object.keys(x).sort().join('|')!==keys.sort().join('|'))throw Error('EXACT_FIELDS_REQUIRED');
 if(typeof x.query!=='string'||!x.query.trim()||x.query.length>1024||!Number.isInteger(x.k)||x.k<1||x.k>48||
 !ID.test(x.requestId)||x.sourceSha256!==ARIADNE_SHA256||x.sourceEdition!=='ariadne-original-v0.7'||
 !EDITIONS.includes(x.yijingEdition)||x.scope!=='WORK')throw Error('INVALID_REQUEST_VALUES');
 return x;
}
function sameToken(got,want){if(typeof got!=='string'||typeof want!=='string')return false;
 const a=createHash('sha256').update(got).digest(),b=createHash('sha256').update(want).digest();return timingSafeEqual(a,b);}
function readonlyFrame(frame,r){
 if(!frame||typeof frame!=='object'||utilTypes.isProxy(frame)||Object.getPrototypeOf(frame)!==Object.prototype||frame.event!=='FRAME'||
 frame.requestId!==r.requestId||frame.querySha256!==sha(r.query)||frame.registrySha256!==ARIADNE_SHA256||
 frame.headStateSha256!==SELECTED_HEAD||frame.modelSha256!==FROZEN_BGE_SHA||frame.encoderInvocations!==1||frame.headInvocations!==1||
 frame.lexicalFallback!==false||frame.weightsUpdated!==false||!Array.isArray(frame.embedding)||frame.embedding.length!==384||
 frame.embedding.some(v=>typeof v!=='number'||!Number.isFinite(v))||!Array.isArray(frame.scores)||frame.scores.length!==1728||
 frame.scores.some(v=>typeof v!=='number'||!Number.isFinite(v)))throw Error('FOREIGN_OR_UNSAFE_FRAME');
 const exact=flatReference(frame.scores,r.k),fused=fusedTensorSelect(frame.scores,r.k);
 if(!Array.isArray(frame.topIds)||exact.some((v,i)=>frame.topIds[i]!==v.hsn)||
 exact.some((v,i)=>fused.selection.hits[i].hsn!==v.hsn||fused.selection.hits[i].score!==v.score))throw Error('RANK_PARITY_FAILURE');
 const s=Buffer.alloc(frame.scores.length*8),e=Buffer.alloc(frame.embedding.length*8);
 frame.scores.forEach((v,i)=>s.writeDoubleLE(v,i*8));frame.embedding.forEach((v,i)=>e.writeDoubleLE(v,i*8));
 const scoreSha=sha(s),embeddingSha=sha(e);
 const hits=Object.freeze(exact.map((h,i)=>{
   const y=encodeYijing(h.hsn,r.yijingEdition);return Object.freeze({rank:i+1,hsn:h.hsn,score:h.score,originalIndex:h.index,
    hexagramCode:y.hexagramCode,ternaryContext:y.contextCode,coefficients:glyphCoefficients({edition:r.yijingEdition,hexagramCode:y.hexagramCode,contextCode:y.contextCode})});
 }));
 const product=Object.freeze({scoreSha256:scoreSha,embeddingSha256:embeddingSha,headSha256:SELECTED_HEAD,
  querySha256:frame.querySha256,sourceSha256:ARIADNE_SHA256,selectedEdition:r.yijingEdition,
  hits,houseMass:fused.mass.houseMass,sphereMass:fused.mass.sphereMass,modelInvocations:1,rankPreserved:true});
 const consumers=Object.freeze({atlasOne:product,atlasIntelligence:product,atlasgpt:product,swarmchat:product});
 if(!Object.values(consumers).every(v=>v===product))throw Error('CONSUMER_IDENTITY');
 return {product,consumers};
}
export function createMutableLocalAuthority(){
 let state={epoch:'owner-local-epoch-1',sourceSha256:ARIADNE_SHA256,mode:'WORK',grants:new Set(['READ','INFERENCE_USE','DISCLOSE','RETURN'])};
 return Object.freeze({snapshot(){return {epoch:state.epoch,sourceSha256:state.sourceSha256,mode:state.mode};},
 allowed(phase,expected){return state.epoch===expected.epoch&&state.sourceSha256===expected.sourceSha256&&state.mode==='WORK'&&state.grants.has(phase);},
 change({revoke,epoch,sourceSha256,mode}={}){const grants=new Set(state.grants);if(revoke)grants.delete(revoke);
 state={epoch:epoch??state.epoch,sourceSha256:sourceSha256??state.sourceSha256,mode:mode??state.mode,grants};}});
}
/** Caller supplies a single trusted real-inference function and a distinct policy. */
export function createAtlasLocalHost({infer,token,policyAuthority,afterFrame=()=>{}}){
 if(typeof infer!=='function'||typeof token!=='string'||token.length<32||!policyAuthority||
 typeof policyAuthority.snapshot!=='function'||typeof policyAuthority.allowed!=='function')throw Error('HOST_BINDING_REQUIRED');
 const seen=new Set();const stats={authenticatedRequests:0,modelQueries:0,holds:0};
 async function handle(r){
   const initial=policyAuthority.snapshot();const p=ph=>policyAuthority.allowed(ph,initial);
   if(initial.mode!=='WORK'||initial.sourceSha256!==ARIADNE_SHA256||!p('READ')||!p('INFERENCE_USE'))return deny('READ_OR_INFERENCE_USE_HOLD');
   if(!p('DISCLOSE'))return deny('DISCLOSURE_HOLD');
   if(seen.has(r.requestId))return deny('REQUEST_REPLAY');seen.add(r.requestId);
   let frame;
   try{stats.modelQueries++;frame=await infer({query:r.query,k:r.k,requestId:r.requestId});}catch{return deny('MODEL_WORKER_FAILED',503);}
   let joined;
   try{joined=readonlyFrame(frame,r);}catch{return deny('INVALID_OR_MISMATCHED_ISSUED_FRAME');}
   try{await afterFrame({request:r,frame,policyAuthority});}catch{return deny('AFTER_FRAME_ABORT');}
   // These decisions are read from the server's own mutable authority, not from the JSON caller.
   // No await between final RETURN check and response serialization; not a remote atomic egress proof.
   if(!p('READ')||!p('INFERENCE_USE')||!p('DISCLOSE')||!p('RETURN'))return deny('RETURN_RIGHTS_REVOKED');
   const top=joined.product.hits;
   return {http:200,body:{schema:LOCAL_SCHEMA,status:'LOCAL_AUTHENTICATED_INSPECTION',requestId:r.requestId,
      querySha256:sha(r.query),ontologySha256:ARIADNE_SHA256,headStateSha256:SELECTED_HEAD,
      issuerScope:'PRIVATE_LOCAL_PROCESS_ONLY',scoreSha256:joined.product.scoreSha256,
      embeddingSha256:joined.product.embeddingSha256,
      singleNeuralExecution:true,consumerObjectIdentical:true,candidateCount:top.length,top,
      yijingEdition:r.yijingEdition,fieldUnits:'DIMENSIONLESS',glyphHz:null,
      localPolicy:'ALLOW_AT_READ_USE_DISCLOSE_RETURN',rightsEpoch:initial.epoch,
      currentExternalRightsVerified:false,adverseSetIndependentlyComplete:false,
      releaseAuthorized:false,hostedPublic:false,trainingPerformed:false,qualityImprovementProven:false}};
 }
 const server=createServer(async(req,res)=>{
   const send=(http,body)=>{stats.holds+=body.status==='HOLD'?1:0;res.writeHead(http,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
   if(req.method!=='POST'||req.url!=='/v1/neural-inspect')return send(...Object.values(deny('UNKNOWN_ROUTE',404)));
   if(!sameToken(req.headers.authorization?.replace(/^Bearer /,''),token))return send(...Object.values(deny('UNAUTHENTICATED',401)));
   if(!String(req.headers['content-type']||'').startsWith('application/json'))return send(...Object.values(deny('BAD_CONTENT_TYPE',415)));
   let body='';try{for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192)throw Error('TOO_LARGE');}}catch{return send(...Object.values(deny('REQUEST_TOO_LARGE',413)));}
   let parsed;try{parsed=verifiedJson(body);}catch{return send(...Object.values(deny('INVALID_REQUEST',400)));}
   stats.authenticatedRequests++;
   const reply=await handle(parsed);
   return send(reply.http,reply.body);
 });
 return Object.freeze({server,stats:()=>({...stats}),listen:()=>new Promise((res,rej)=>{server.once('error',rej);server.listen(0,'127.0.0.1',()=>{server.removeListener('error',rej);res(server.address());});}),close:()=>new Promise(r=>server.close(r))});
}
