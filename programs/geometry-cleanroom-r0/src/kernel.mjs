import {types as utilTypes} from 'node:util';
import {fusedTensorSelect} from './fused.mjs';
import {ARIADNE_SHA256,NODE_COUNT,originalAddresses,decodeIndex,flatReference,sparseTopK,tensorMass,inspectCrosswalk} from './geometry.mjs';

/** Complete, isolated clean-sheet vertical slice. No provider, broker, DB or
 * lexical retrieval is shipped. The host injects ONE preexisting neural gateway.
 * This candidate ALWAYS returns PREPARED_NOT_HOSTED; nobody may infer authority.
 */
const PIN=/^[a-f0-9]{64}$/;
const ID=/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/;
const hold=(reason,prior=null)=>Object.freeze({status:'HOLD',reason,releaseAuthorized:false,trainingEligible:false,hostedExecutionVerified:false,authorityEffect:'NONE',attemptedNeuralCalls:prior});
const REQ_KEYS=['requestId','querySha256','sourceId','sourceSha256','sourceEdition','purpose','k','scope'];
const PAGE_KEYS=['schema','method','fallbackUsed','issuer','modelSha256','registrySha256','querySha256','sourceId','sourceSha256','sourceEdition','scores'];
function plainData(input,keys) {
  // Never read a caller-supplied property before checking its data descriptor.
  if(!input||typeof input!=='object'||utilTypes.isProxy(input)||Array.isArray(input)||Object.getPrototypeOf(input)!==Object.prototype)throw Error('NOT_PLAIN_DATA');
  const descriptors=Object.getOwnPropertyDescriptors(input);
  const actual=Reflect.ownKeys(descriptors);
  if(actual.length!==keys.length||actual.some(k=>typeof k!=='string'||!keys.includes(k)))throw Error('WRONG_FIELDS');
  const result=Object.create(null);
  for(const key of keys){const d=descriptors[key];if(!d||!Object.hasOwn(d,'value')||!d.enumerable)throw Error('GETTER_OR_MISSING');result[key]=d.value;}
  return result;
}
function safeScores(input) {
  if(utilTypes.isProxy(input)||!Array.isArray(input)||input.length!==NODE_COUNT)throw Error('WRONG_NEURAL_SHAPE');
  const descriptors=Object.getOwnPropertyDescriptors(input);
  if(Reflect.ownKeys(descriptors).length!==NODE_COUNT+1)throw Error('EXTRA_SCORE_PROPERTIES');
  const data=new Array(NODE_COUNT);
  for(let i=0;i<NODE_COUNT;i++) {
    const d=descriptors[String(i)];if(!d||!Object.hasOwn(d,'value'))throw Error('SPARSE_OR_ACCESSOR_SCORES');
    const v=d.value;if(typeof v!=='number'||!Number.isFinite(v))throw Error('NONFINITE_NEURAL_SCORE');data[i]=v;
  }
  return data;
}
const consent=(x,phase,request)=>x({phase,requestSha256:request.querySha256,sourceId:request.sourceId,sourceSha256:request.sourceSha256,sourceEdition:request.sourceEdition,scope:'WORK'});
function authResult(value) {return plainData(value,['decision','epoch']);}
const allowed=(value,epoch)=>{try{const v=authResult(value);return v.decision==='ALLOW'&&typeof v.epoch==='string'&&v.epoch===epoch;}catch{return false;}};

export function createGeometryKernel({gateway,policy,reviewClosure,crosswalks=[],roleRecords=[],sourcePin=ARIADNE_SHA256}) {
  if(!gateway||typeof gateway.request!=='function'||typeof policy!=='function'||typeof reviewClosure!=='function')throw Error('UNBOUND_HOST_DEPENDENCIES');
  if(sourcePin!==ARIADNE_SHA256)throw Error('SOURCE_PIN_MISMATCH');
  if(utilTypes.isProxy(crosswalks)||!Array.isArray(crosswalks)||crosswalks.length>4096)throw Error('INVALID_CROSSWALKS');
  const typedCrosswalks=Object.freeze(crosswalks.map(inspectCrosswalk));
  // Host-supplied role claims remain data, NOT authenticated expert judgments.
  // Missing original-registry entries retain UNVERIFIED instead of guessing a
  // DOMAIN_SPECIALIZATION/EPISTEMIC_METHOD classification from coordinates.
  if(utilTypes.isProxy(roleRecords)||!Array.isArray(roleRecords)||roleRecords.length>NODE_COUNT)throw Error('BAD_ROLE_RECORD_SET');
  const declaredRoles=new Map();
  const originalSet=new Set(originalAddresses);
  for(const row of roleRecords){
    const x=plainData(row,['hsn','kind','sourceRecordSha256','registrySha256']);
    if(!['DOMAIN_SPECIALIZATION','EPISTEMIC_METHOD'].includes(x.kind)||!PIN.test(x.sourceRecordSha256)||x.registrySha256!==sourcePin||!originalSet.has(x.hsn)||declaredRoles.has(x.hsn))throw Error('INVALID_ROLE_RECORD');
    declaredRoles.set(x.hsn,Object.freeze({kind:x.kind,sourceRecordSha256:x.sourceRecordSha256,verification:'HOST_CLAIM_NOT_ATTESTED'}));
  }

  const stats={calls:0,completed:0,held:0};
  async function run(untrustedRequest) {
    let invoked=0;
    function deny(reason) {stats.held++;return hold(reason,invoked);}
    let request;
    try{request=plainData(untrustedRequest,REQ_KEYS);}catch{return deny('BAD_REQUEST_SHAPE');}
    if(!ID.test(request.requestId)||!PIN.test(request.querySha256)||!ID.test(request.sourceId)||!PIN.test(request.sourceSha256)||!ID.test(request.sourceEdition)||request.scope!=='WORK'||!['INFERENCE','CITATION'].includes(request.purpose)||!Number.isInteger(request.k)||request.k<1||request.k>NODE_COUNT)return deny('BAD_REQUEST_VALUES');
    let snapshot;
    try{snapshot=authResult(await consent(policy,'READ',request));}catch{return deny('READ_AUTHORITY_EXCEPTION');}
    if(snapshot.decision!=='ALLOW'||typeof snapshot.epoch!=='string'||snapshot.epoch.length===0)return deny('READ_NOT_AUTHORIZED');
    let page;
    try{stats.calls++;invoked++;page=plainData(await gateway.request({querySha256:request.querySha256,k:request.k,registrySha256:sourcePin}),PAGE_KEYS);}catch{return deny('NEURAL_GATEWAY_FAILED');}
    if(page.schema!=='atlas.neural.issued/v1'||page.method!=='neural'||page.fallbackUsed!==false||!ID.test(page.issuer)||!PIN.test(page.modelSha256)||page.registrySha256!==sourcePin||page.querySha256!==request.querySha256)return deny('FOREIGN_OR_FALLBACK_RESULT');
    if(page.sourceId!==request.sourceId||page.sourceSha256!==request.sourceSha256||page.sourceEdition!==request.sourceEdition)return deny('SOURCE_MISMATCH');
    let scores;
    try{scores=safeScores(page.scores);}catch(error){return deny(error.message==='WRONG_NEURAL_SHAPE'?'WRONG_NEURAL_SHAPE':'UNSAFE_NEURAL_SCORES');}
    let sparse,mass;
    try{const joined=fusedTensorSelect(scores,request.k);sparse=joined.selection;mass=joined.mass;}catch{return deny('UNSAFE_NEURAL_SCORES');}
    // Preserve original rankings and scores exactly; native geometry is a second
    // view, never a different ranking, unless separately evaluated and promoted.
    let use,ret;
    try{use=await consent(policy,'USE',request);}catch{return deny('USE_AUTHORITY_EXCEPTION');}
    if(!allowed(use,snapshot.epoch))return deny('USE_DENIED_OR_DRIFTED');
    if(request.purpose==='CITATION'){
      let disclosed;
      try{disclosed=await consent(policy,'DISCLOSE',request);}catch{return deny('DISCLOSURE_EXCEPTION');}
      if(!allowed(disclosed,snapshot.epoch))return deny('DISCLOSURE_DENIED_OR_DRIFTED');
    }
    let closure;
    try{closure=await reviewClosure({requestSha256:request.querySha256,sourceSha256:request.sourceSha256,sourceEdition:request.sourceEdition,modelSha256:page.modelSha256,registrySha256:sourcePin,issuer:page.issuer});}catch{return deny('CLOSURE_EXCEPTION');}
    try{closure=plainData(closure,['status','releaseAuthorized','authorityEffect']);}catch{return deny('CLOSURE_NOT_PINNED');}
    if(closure.status!=='MATCHED_PINNED_METADATA'||closure.releaseAuthorized!==false||closure.authorityEffect!=='NONE')return deny('CLOSURE_NOT_PINNED');
    try{ret=await consent(policy,'RETURN',request);}catch{return deny('RETURN_AUTHORITY_EXCEPTION');}
    if(!allowed(ret,snapshot.epoch))return deny('RETURN_DENIED_OR_DRIFTED');
    const candidates=Object.freeze(sparse.hits.map(v=>Object.freeze({hsn:v.hsn,index:v.index,score:v.score,house:decodeIndex(v.index).h,sphere:decodeIndex(v.index).s,sourceId:request.sourceId,sourceSha256:request.sourceSha256,sourceEdition:request.sourceEdition,knowledgeKind:declaredRoles.get(v.hsn)?.kind??'UNVERIFIED',knowledgeKindAuthority:'HOST_CLAIM_NOT_ATTESTED'})));
    const sourceView=Object.freeze({requestSha256:request.querySha256,registrySha256:sourcePin,modelSha256:page.modelSha256,issuer:page.issuer,rightsEpoch:snapshot.epoch,sourceId:request.sourceId,sourceSha256:request.sourceSha256,sourceEdition:request.sourceEdition});
    const used=new Set(candidates.map(v=>v.hsn));
    const edges=Object.freeze(typedCrosswalks.filter(e=>used.has(e.hsn)));
    const product=Object.freeze({schema:'atlas.geometry.cleanroom.result/v1',status:'PREPARED_NOT_HOSTED',rankingMethod:'NEURAL_EXACT',fallbackUsed:false,candidates,source:sourceView,
      lattice:Object.freeze({shape:Object.freeze([12,12,12]),houses:mass.houseMass,spheres:mass.sphereMass,positions:NODE_COUNT,normalizerLog:mass.normalizerLog}),
      views:Object.freeze({graph:Object.freeze({typedCrosswalks:edges,authorityEffect:'NONE'}),glyph:Object.freeze({coordinates:Object.freeze(candidates.map(c=>c.hsn)),reversible:true}),meta145:Object.freeze({control:'SYNTHESIS_PREVIEW_ONLY',houseRouting:mass.houseMass}),e145:Object.freeze({execution:'NOT_AUTHORIZED',effects:0}),council:Object.freeze({status:'NOT_EXECUTED',positions:0}),memory:Object.freeze({kind:'EPHEMERAL_METADATA_ONLY',source:sourceView})}),
      selectionOps:sparse.comparisons,modelInvocations:1,releaseAuthorized:false,trainingEligible:false,sourceRightsAttested:false,participantIdentityVerified:false,hostedExecutionVerified:false,observedQualityGain:false,authorityEffect:'NONE'});
    stats.completed++;
    return Object.freeze({status:'PREPARED_NOT_HOSTED',result:product,consumers:Object.freeze({atlasOne:product,atlasIntelligence:product,atlasgpt:product,swarmchat:product}),neuralCalls:invoked});
  }
  return Object.freeze({schema:'atlas.geometry.cleanroom.kernel/v1',run,sourcePin,sourceNames:Object.freeze(originalAddresses.slice(0,12)),crosswalkCount:typedCrosswalks.length,roleDeclarationCount:declaredRoles.size,stats:()=>Object.freeze({...stats}),baseline:flatReference});
}
