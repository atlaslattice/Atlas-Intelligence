/** Atlas ONE single-brain *existing-gateway* port. No second authority, model or retriever.
 * This is a source-only, no-body PREPARE step. Real network egress MUST go
 * through the Work Learning's branded, current, host-owned final release.
 */
import {createHash} from 'node:crypto';
import {types as nodeTypes} from 'node:util';
const ORIGINAL='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
const HSN=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const SHA=/^[a-f0-9]{64}$/;
const digest=x=>createHash('sha256').update(x).digest('hex');
export const SCHEMA='atlas.one.single-brain-port/v1';
const HOLD=Object.freeze({schema:SCHEMA,status:'HOLD_NOT_GATEWAY_AUTHORIZED',canPublish:false,hostVerified:false,training:false});
function strict(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||nodeTypes.isProxy(value))return false;
 return Object.values(Object.getOwnPropertyDescriptors(value)).every(d=>Object.hasOwn(d,'value')&&d.enumerable);
}
/** The THREE functions MUST be the exact trusted WorkLearning gateway exports.
 * Caller-supplied mocks are only synthetic tests and confer no real host rights.
 */
export function createOneBrainPort({authorizedResultMetadata,revalidateAuthorizedResult}={}){
 if(typeof authorizedResultMetadata!=='function'||typeof revalidateAuthorizedResult!=='function')throw Error('EXISTING_GATEWAY_REQUIRED');
 return Object.freeze({async prepare(result, fabric){
  try{
   if(!strict(result)||!strict(fabric)||fabric.schema!=='atlas.one.shared-neural-fabric/v1'
      ||fabric.status!=='PREPARED_NUMERIC_REVIEW_ONLY'||fabric.registrySha256!==ORIGINAL
      ||fabric.addressedNodes!==1728||fabric.neuralDimension!==384||!SHA.test(fabric.nodeVectorAssetSha256??'')
      ||fabric.sourceBodiesReturned!==false||fabric.canPublish!==false||fabric.canTrain!==false
      ||!Array.isArray(fabric.hits)||fabric.hits.length<1||fabric.hits.length>20)return HOLD;
   const metadata=authorizedResultMetadata(result); // must be WeakMap-branded
   if(!strict(metadata)||!strict(result.provenance)||result.provenance.registrySha256!==ORIGINAL
      ||result.target!=='nodes'||!Array.isArray(result.hits)||result.hits.length>20)return HOLD;
   // Typed context is separate: never replace/rerank the authorized original.
   const ids=[];
   for(const h of fabric.hits){
    if(!strict(h)||!HSN.test(h.hsn??'')||typeof h.score!=='number'||!Number.isFinite(h.score)
       ||h.semanticAccepted!==false)return HOLD;
    ids.push(h.hsn);
   }
   if(new Set(ids).size!==ids.length)return HOLD;
   const before=digest(JSON.stringify(result));
   await revalidateAuthorizedResult(result); // current source/rights and pin check in trusted gateway
   if(before!==digest(JSON.stringify(result)))return HOLD;
   const sourceRefs=(result.provenance.sourceRefs??[]).map(x=>({id:x.id,version:x.version,sha256:x.sha256,uri:x.uri}));
   if(!sourceRefs.some(x=>x.id==='ariadne:v0.7'&&x.sha256===ORIGINAL))return HOLD;
   return Object.freeze({schema:SCHEMA,status:'PREPARED_NOT_RELEASED',
      originalAuthorizedResultDigest:before,
      registrySha256:ORIGINAL,nodeVectorAssetSha256:fabric.nodeVectorAssetSha256,
      encoderRevision:fabric.encoderRevision,
      neuralNodeIds:Object.freeze([...ids]),
      originalNodeIds:Object.freeze(result.hits.map(x=>x.hsn)),
      originalNeuralScoresUnchanged:true,
      fabricReadoutSourceVerified:fabric.sourceVerified===true,
      neuralOutputAuthority:'NONE',glyphAuthority:'NONE',meta145ExtraNeuron:false,
      canPublish:false,canTrain:false,hostVerified:false,sourceBodiesIncluded:false,
      nextGate:'TRUSTED_HOST_INFERENCE_USE_AND_DISCLOSURE_AT_EGRESS'});
  }catch{return HOLD;}
 }});
}
