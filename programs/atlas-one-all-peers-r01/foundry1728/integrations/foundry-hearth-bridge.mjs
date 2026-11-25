/** Atlas Foundry1728 -> existing Hearth Ω7 one-frame, REVIEW-ONLY.
 * This never creates a gateway, model, queue, source permission, or semantic edge.
 * A passed local fixture may only create a structural WORK pointer. Actual
 * network publication still requires the existing host's independent rights,
 * complete negative evidence, and atomic byte-return boundary.
 */
import {createHash} from 'node:crypto';
import {types as utilTypes} from 'node:util';
export const SCHEMA='atlas.foundry1728.hearth-bridge/v1';
const HSN=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const SHA=/^[0-9a-f]{64}$/;
const ORIGINAL='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
const hold=reason=>Object.freeze({schema:SCHEMA,status:'HOLD_NO_WORK_VIEW',reason,
   sourceBodiesIncluded:false,releaseAuthorized:false,canTrain:false,hostRightsAttested:false,
   semanticAccepted:false,modelCallsAdded:0,authorityEffect:'NONE'});
function own(obj,fields){
 if(!obj||typeof obj!=='object'||Array.isArray(obj)||utilTypes.isProxy(obj)||Object.getPrototypeOf(obj)!==Object.prototype)throw Error('NON_DATA_OBJECT');
 const ds=Object.getOwnPropertyDescriptors(obj);const keys=Reflect.ownKeys(ds);
 if(fields&& (keys.length!==fields.length||keys.some(k=>typeof k!=='string'||!fields.includes(k))))throw Error('UNEXPECTED_FIELDS');
 const out={};for(const k of keys){let d=ds[k];if(typeof k!=='string'||!d.enumerable||!Object.hasOwn(d,'value')||['__proto__','constructor','prototype'].includes(k))throw Error('ACCESSOR_OR_UNSAFE_FIELD');out[k]=d.value;}
 return out;
}
const dig=x=>createHash('sha256').update('atlas.foundry1728.hearth-bridge/v1\0').update(JSON.stringify(x)).digest('hex');
/** input is the PREPARED result of the ACTUAL PR77 prepareHearthSnapshot function.
 * publicTask is the exact public-scaffold work order; source bytes are never accepted.
 */
export function composeHearthWorkRef(publicTask,hearthView,{mode='WORK',expectedSourceSha256=ORIGINAL}={}){
 try{
  if(mode!=='WORK')throw Error('PROTECTED_MODE');
  const node=own(publicTask,['hsn','parent','kind','taskId','status','workOrderSha256']);
  const view=own(hearthView);
  const match=HSN.exec(node.hsn);
  if(!match)throw Error('SOURCE_WORKORDER_INVALID');
  const rowNumber=(Number(match[1])-1)*144+(Number(match[2])-1)*12+Number(match[3]);
  if(node.parent!==node.hsn.slice(0,7)|| node.taskId!==`AF1728-${String(rowNumber).padStart(4,'0')}` || !SHA.test(node.workOrderSha256))throw Error('SOURCE_WORKORDER_INVALID');
  if(node.status!=='STRUCTURAL_TESTED_IN_OWNER_RUNTIME'||expectedSourceSha256!==ORIGINAL)throw Error('ORIGINAL_SOURCE_UNPINNED');
  const hs=Number(node.hsn.slice(5,7));
  const expectedKind=hs<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META';
  if(node.kind!==expectedKind)throw Error('ROLE_CHANGED');
  if(view.schema!=='atlas.indras-hearth.review/v1'||view.status!=='PREPARED_NOT_RELEASED'||view.ontologySha256!==ORIGINAL||view.originalCoordinate!==node.hsn)throw Error('HEARTH_NOT_SOURCE_MATCHED');
  if(view.role!==node.kind||view.sphere!==node.parent||view.house!==node.hsn.slice(0,3)||view.releaseAuthorized!==false||view.sourceBodiesIncluded!==false||view.modelCallsByHearth!==0)throw Error('HEARTH_CONTENT_OR_AUTHORITY_CHANGED');
  if(!SHA.test(view.frameDigest)||!SHA.test(view.fullScoreDigest)||view.originalNeuralRankChanged!==false)throw Error('FRAME_UNBOUND');
  if(node.kind==='EPISTEMIC_META'){
   if(typeof view.subjectHsn!=='string'||!HSN.test(view.subjectHsn)||view.subjectHsn.slice(0,3)!==node.hsn.slice(0,3)||Number(view.subjectHsn.slice(5,7))>7)throw Error('METHOD_SUBJECT_REQUIRED');
  }else if(view.subjectHsn!==null)throw Error('DOMAIN_SUBJECT_UNEXPECTED');
  const projection=Object.freeze({schema:SCHEMA,status:'LOCAL_STRUCTURAL_WORK_REF_ONLY',
    hsn:node.hsn,taskId:node.taskId,originalRole:node.kind,parent:node.parent,
    originalAriadneSha256:ORIGINAL,referenceWorkOrderSha256:node.workOrderSha256,
    sourceFrameFingerprint:dig([view.frameDigest,view.fullScoreDigest,view.selectionDigest,node.workOrderSha256]),
    methodSubjectHsn:view.subjectHsn,sourceBodiesIncluded:false,canTrain:false,
    semanticAccepted:false,releaseAuthorized:false,hostRightsAttested:false,
    originalNeuralRankChanged:false,modelCallsAdded:0,authorityEffect:'NONE'});
  return projection;
 }catch(e){return hold(e instanceof Error&&/^[A-Z0-9_]+$/.test(e.message)?e.message:'UNSAFE_INPUT')}
}
