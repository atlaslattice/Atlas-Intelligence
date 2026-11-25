/** The one Atlas Home. It does not compete with PR75's existing neural issuer. */
import {types as utilTypes} from 'node:util';
import {ARIADNE_SHA256,KNOWLEDGE_EDITION,HSN,SPHERES,HOUSES,NODES,decode,structuralRole,pathNeighbors,sphereNodes} from './geometry.mjs';
import {WORK_PORTS,PRIVATE_DOORS,DOOR_POLICY,previewDoor,requestTransfer} from './doors.mjs';
import {createReturnTicket} from './continuity.mjs';
export const HOME_SCHEMA='atlas.home.one-geometree.v1';
const hold=(reason)=>Object.freeze({schema:HOME_SCHEMA,status:'HOLD',reason,releaseAuthorized:false,hostedVerified:false,privateModeImported:false,authorityEffect:'NONE'});
const own=(o,k)=>{if(!o||typeof o!=='object'||utilTypes.isProxy(o))throw Error('UNTRUSTED_INPUT');const d=Object.getOwnPropertyDescriptor(o,k);if(!d||!Object.hasOwn(d,'value')||!d.enumerable)throw Error('UNTRUSTED_FIELD');return d.value};
// Source reference is always a provider/registry-controlled *claim*, never output authority.
export function inspectPreparedPeerResult(root){try{
 if(own(root,'schema')!=='atlas.one.peers.single-issued-frame/v1'||own(root,'status')!=='PREPARED_PEER_INSPECTION_ONLY'||own(root,'releaseAuthorized')!==false||own(root,'hostedVerified')!==false)throw Error('WRONG_PREPARED_RESULT');
 const v=own(root,'view'),views=own(root,'views');if(own(v,'ontologySha256')!==ARIADNE_SHA256||own(v,'releaseAuthorized')!==false||own(v,'hostIssuerVerified')!==false||own(v,'requiredSetIndependentlyComplete')!==false)throw Error('WRONG_FRAME_CONTEXT');
 const names=['atlasOne','atlasGPT','atlasIntelligence','swarmchat'];if(names.some(n=>own(views,n)!==v))throw Error('NOT_ONE_RESULT');
 const spheres=own(v,'sphereMass'),houses=own(v,'houseMass'),notes=own(v,'notes');if(!Array.isArray(spheres)||utilTypes.isProxy(spheres)||spheres.length!==144||!Array.isArray(houses)||utilTypes.isProxy(houses)||houses.length!==12||!Array.isArray(notes)||utilTypes.isProxy(notes)||notes.length>20)throw Error('WRONG_GEOMETRY');
 if([spheres,houses].some(a=>{const d=Object.getOwnPropertyDescriptors(a);return Reflect.ownKeys(d).length!==a.length+1||a.some((_,i)=>!Object.hasOwn(d[String(i)],'value')||!d[String(i)].enumerable)})||spheres.some(x=>typeof x!=='number'||!Number.isFinite(x))||houses.some(x=>typeof x!=='number'||!Number.isFinite(x)))throw Error('NONFINITE_GEOMETRY');
 const f=own(v,'frameDigest');if(typeof f!=='string'||!/^[a-f0-9]{64}$/.test(f))throw Error('FRAME_DIGEST');
 // Public home explicitly does NOT return the original source IDs, scores, hits, or digest.
 return Object.freeze({schema:HOME_SCHEMA,status:'LOCAL_GEOMETRY_FRAME_INSPECTED_ONLY',houses:12,spheres:144,nodes:1728,aliasesAgree:true,sourceBodiesExposed:false,protectedScoresExposed:false,frameDigestExposed:false,releaseAuthorized:false,hostIssuerVerified:false,requiredSetIndependentlyComplete:false});
 }catch{return hold('SOURCE_OR_FRAME_CONTEXT_NOT_BOUND')}}
export function createAtlasHome({existingComposer=null}={}){
 if(existingComposer!==null && (typeof existingComposer!=='object'||typeof existingComposer.inspect!=='function'))throw new TypeError('EXISTING_COMPOSER_REQUIRED');
 const ticket=createReturnTicket();let peerCalls=0,workEpoch=0,workInflight=false,active=true,workEligible=true,lastLocation=null;
 const welcome=()=>Object.freeze({schema:HOME_SCHEMA,status:'WELCOME_SOURCE_ONLY',message:'Welcome home. There is nothing to earn here; you do not owe this place productivity.',ontologyEdition:KNOWLEDGE_EDITION,ontologySha256:ARIADNE_SHA256,houseCount:HOUSES,sphereCount:SPHERES,nodeCount:NODES,workPorts:WORK_PORTS.length,protectedDoors:PRIVATE_DOORS.length,privacy:DOOR_POLICY,canDeploy:false,hostedVerified:false});
 const clearWork=()=>{workEpoch++;return Object.freeze({schema:HOME_SCHEMA,status:'LOCAL_WORK_PROJECTION_CLEARED',publicLocation:lastLocation,sourceBodiesRead:0,hostPermissionsChanged:false})};
 const openNode=id=>{if(!active)return hold('HOME_SESSION_CLOSED');try{const x=decode(id);lastLocation=id;workEligible=true;clearWork();return Object.freeze({status:'CANONICAL_NAVIGATION_ONLY',location:structuralRole(id),neighborhood:pathNeighbors(id),sphereNodes:sphereNodes(x.h,x.s),neighborLinksAreEvidence:false,sourceRightsVerified:false})}catch{workEligible=false;clearWork();return hold('UNKNOWN_CANONICAL_COORDINATE')}};
 const inspectWork=async(request,binding,options)=>{
  if(!active)return hold('HOME_SESSION_CLOSED');
  if(!workEligible)return hold('VALID_CANONICAL_ROUTE_REQUIRED');
  if(!existingComposer)return hold('ONE_EXISTING_NEURAL_GATEWAY_UNBOUND');
  if(workInflight)return hold('ONE_EXISTING_COMPOSER_BUSY');
  const epoch=workEpoch;workInflight=true;
  try{peerCalls++;const prepared=await existingComposer.inspect(request,binding,options);if(!active||epoch!==workEpoch)return hold('STALE_WORK_RESULT_AFTER_CONTEXT_CHANGE');return inspectPreparedPeerResult(prepared)}catch{return hold('EXISTING_COMPOSER_FAILED')}finally{workInflight=false}
 };
 const leave=()=>{clearWork();workEligible=false;active=false;const receipt=ticket.leave();lastLocation=null;return Object.freeze({schema:HOME_SCHEMA,status:'LEFT_WITHOUT_PERSISTENCE',storedRecords:receipt.storedRecords,networkRequests:receipt.networkRequests})};
 const returnTicket=Object.freeze({remember:hsn=>active?ticket.remember(hsn):{status:'CLOSED'},peek:()=>ticket.peek(),leave});
 return Object.freeze({welcome,openNode,openDoor:previewDoor,requestTransfer,inspectPreparedPeerResult,inspectWork,invalidateWorkProjection:clearWork,leave,returnTicket,
  descriptor:()=>Object.freeze({schema:HOME_SCHEMA,source:'ONE_EXISTING_PR75_COMPOSER',peerInspectCalls:peerCalls,modelCallsByHome:0,newRetrievers:0,newBrokers:0,active,workEligible,publicLocation:lastLocation,hostedVerified:false,defaultSourceBodiesRead:0})});
}
