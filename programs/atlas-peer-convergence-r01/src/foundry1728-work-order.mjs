/**
 * Atlas R17: additive, READ-ONLY, non-authorizing 1728-HSN source map / one-frame port.
 * The original PR67 Ariadne HSN remains the ONLY primary coordinate identity.
 * HSN node ordinal never redefines the original source node's meaning.
 * A Yijing/cymatic token, a port number or a peer message is NOT source permission.
 * No private Brain/Palace/Imagine/Dream/Play content or model weights are read.
 */
import {createHash} from 'node:crypto';
import {types as utilTypes} from 'node:util';
import {HSN, ARIADNE_SHA256, EDITION, decode, fromIndex} from '../../atlas-geometry-one-r38/src/addresses.mjs';
import {topK,reductions} from '../../atlas-geometry-one-r38/src/geometry.mjs';
import {projectTwelve,PORTS} from '../../atlas-geometry-one-r38/src/ports.mjs';

export const SCHEMA='atlas.foundry.1728-one-frame-review/v1';
export const NODE_COUNT=1728;
const HEX=/^[0-9a-f]{64}$/;
const KEYS=['scores','modelSha256','querySha256','sourceSha256','sourceEdition',
 'issuer','tenant','principal','rightsEpoch','requestId','scope','purpose','registrySha256',
 'expectedLocalScoreDigest'];
const HOLD=reason=>Object.freeze({schema:SCHEMA,status:'HOLD',reason,
  releaseAuthorized:false,hostRightsVerified:false,semanticAccepted:false,
  sourceBodiesIncluded:false,modelCallsAdded:0,trainingEligible:false});
function own(x,fields){
 if(!x||typeof x!=='object'||utilTypes.isProxy(x)||Array.isArray(x)||Object.getPrototypeOf(x)!==Object.prototype)throw Error('UNTRUSTED_INPUT');
 const ds=Object.getOwnPropertyDescriptors(x),actual=Reflect.ownKeys(ds);
 if(actual.length!==fields.length||actual.some(k=>typeof k!=='string'||!fields.includes(k)))throw Error('EXACT_FIELDS_REQUIRED');
 const o=Object.create(null);
 for(const f of fields){const d=ds[f];if(!d||!d.enumerable||!Object.hasOwn(d,'value'))throw Error('GETTER_OR_MISSING');o[f]=d.value;}
 return o;
}
function dense(x){
 if(!Array.isArray(x)||utilTypes.isProxy(x)||x.length!==NODE_COUNT)throw Error('FRAME_SHAPE');
 const d=Object.getOwnPropertyDescriptors(x);
 if(Reflect.ownKeys(d).length!==NODE_COUNT+1)throw Error('SPARSE_OR_EXTRA');
 const o=new Array(NODE_COUNT);
 for(let i=0;i<NODE_COUNT;i++){
  const p=d[String(i)];if(!p||!p.enumerable||!Object.hasOwn(p,'value')||typeof p.value!=='number'||!Number.isFinite(p.value))throw Error('NONFINITE_OR_ACCESSOR');
  o[i]=p.value;
 }
 return o;
}
function digestNumbers(s){
 const b=Buffer.alloc(8*NODE_COUNT);
 s.forEach((n,i)=>b.writeDoubleLE(n,8*i));
 return createHash('sha256').update(Buffer.from('ATLAS-FOUNDRY-R17-F64LE/v1\0')).update(b).digest('hex');
}
export function scoreFrameWitness(scores){
 try{return digestNumbers(dense(scores));}catch{return null;}
}
export function inspectFoundryFrame(input){
 try{
  const p=own(input,KEYS);
  const strings=['modelSha256','querySha256','sourceSha256','sourceEdition','issuer','tenant','principal','rightsEpoch','requestId','scope','purpose','registrySha256','expectedLocalScoreDigest'];
  if(strings.some(k=>typeof p[k]!=='string'||p[k].length<1||p[k].length>256))throw Error('INVALID_SCOPE_PRIMITIVES');
  if(![p.modelSha256,p.querySha256,p.sourceSha256,p.registrySha256,p.expectedLocalScoreDigest].every(x=>HEX.test(x)))throw Error('INVALID_HASH_FIELDS');
  if(p.registrySha256!==ARIADNE_SHA256||p.scope!=='WORK'||p.purpose!=='INSPECTION')throw Error('SOURCE_OR_MODE_SCOPE');
  if(p.sourceEdition===EDITION)throw Error('EVIDENCE_EDITION_NOT_ONTOLOGY');
  const scores=dense(p.scores);const digest=digestNumbers(scores);
  if(p.expectedLocalScoreDigest!==digest)throw Error('COMPLETE_FRAME_BYTES_DRIFT');
  const hits=topK(scores,10);const masses=reductions(scores);
  // EXACT PR67 peer module: 12 Work/engineering ports sharing one caller-supplied frame.
  const request={registrySha256:ARIADNE_SHA256,modelSha256:p.modelSha256};
  const views=projectTwelve({hits,masses,frameDigest:digest,request},[]);
  if(Object.keys(views).length!==12||Object.keys(views).some(k=>!PORTS.includes(k)))throw Error('PEER_PORT_SHAPE');
  const top=Object.freeze(hits.map(x=>Object.freeze({hsn:x.hsn,index:x.index})));
  const flatHouse=Object.freeze(masses.house.slice()),flatSphere=Object.freeze(masses.sphere.slice());
  return Object.freeze({schema:SCHEMA,status:'LOCAL_INSPECTION_ONLY',
    originalRegistrySha256:ARIADNE_SHA256,originalEdition:EDITION,
    scoreCount:1728,canonicalCoordinates:1728,sourceEdition:p.sourceEdition,
    sourceSha256:p.sourceSha256,modelSha256:p.modelSha256,
    scopeDigest:createHash('sha256').update(JSON.stringify([p.tenant,p.principal,p.rightsEpoch,p.requestId,p.sourceSha256,p.modelSha256,digest])).digest('hex'),
    localScoreDigest:digest,top,houseMass:flatHouse,sphereMass:flatSphere,
    twelvePorts:Object.freeze(PORTS.map(k=>Object.freeze({port:k,status:views[k].status}))),
    oneSharedSuppliedFrame:true,sourceBodiesIncluded:false,peerRightsVerified:false,
    hostRightsVerified:false,requiredSetIndependentlyComplete:false,
    releaseAuthorized:false,modelCallsAdded:0,modelUpdated:false,semanticAccepted:false,
    sourceIdentityVerified:false, // not original source raw bytes: host must attest
    authorityEffect:'NONE'});
 }catch(e){return HOLD(e instanceof Error&&/^[A-Z0-9_]+$/.test(e.message)?e.message:'UNTRUSTED_INPUT');}
}
export function roleFromHSN(hsn){
 try{
  const x=decode(hsn);
  return Object.freeze({hsn,role:x.s<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META',
    parentSphere:`H${String(x.h).padStart(2,'0')}.S${String(x.s).padStart(2,'0')}`,
    ontologyVerified:false,semanticAccepted:false});
 }catch{return Object.freeze({status:'HOLD_UNKNOWN_HSN',semanticAccepted:false});}
}
export function atlasX3Display(hsn){
 try{
  const {h,s,n}=decode(hsn),a=[h-1,s-1,n-1],parts=a.map(x=>({t:x%3,b:Math.floor(x/3)%2,c:Math.floor(x/6)%2}));
  return Object.freeze({namespace:'ATLAS_YIJING_SYMBOLIC',edition:'atlas-yijing-x3/v1',contextTopology:'CYCLIC_C3_CUBED_V1',
   pattern:parts.reduce((v,q,i)=>v+(q.b<<i)+(q.c<<(i+3)),0),context:9*parts[0].t+3*parts[1].t+parts[2].t,
   originalHsn:hsn,semanticAccepted:false});
 }catch{return Object.freeze({status:'HOLD_UNKNOWN_HSN'});}
}
