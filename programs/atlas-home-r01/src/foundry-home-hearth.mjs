/**
 * Atlas Foundry R01 — source-only composition of the EXISTING Home PR78 and
 * Hearth PR77. No second model, issuer, retriever, transport or memory store.
 * HSN remains the sole canonical node identity; geometry is structural.
 */
import {types as utilTypes} from 'node:util';
import {ARIADNE_SHA256} from './geometry.mjs';

export const FOUNDRY_SCHEMA='atlas.foundry.home-hearth.review/v1';
const hold=reason=>Object.freeze({schema:FOUNDRY_SCHEMA,status:'HOLD',reason,
  releaseAuthorized:false,hostedVerified:false,sourceBodiesIncluded:false,
  modelCallsByFoundry:0,privateModeImported:false,authorityEffect:'NONE'});
function own(raw,key){
  if(!raw || typeof raw!=='object' || utilTypes.isProxy(raw) || Array.isArray(raw))throw Error('UNTRUSTED_INPUT');
  const d=Object.getOwnPropertyDescriptor(raw,key);
  if(!d || !Object.hasOwn(d,'value') || !d.enumerable)throw Error('NON_DATA_FIELD');
  return d.value;
}
/** One public navigation result + one EXISTING peer review result. **/
export function inspectHomeHearth({home,hsn,hearthReview}={}){
  try {
    if(!home || typeof home.openNode!=='function')throw Error('HOME_UNBOUND');
    const navigation=home.openNode(hsn);
    if(own(navigation,'status')!=='CANONICAL_NAVIGATION_ONLY')throw Error('INVALID_PUBLIC_LOCATION');
    // Hearth result MUST already have passed its own source/role/rights *mock*
    // review. This join cannot independently attest those source permissions.
    if(own(hearthReview,'schema')!=='atlas.indras-hearth.review/v1'||
       own(hearthReview,'status')!=='PREPARED_NOT_RELEASED'||
       own(hearthReview,'ontologySha256')!==ARIADNE_SHA256||
       own(hearthReview,'releaseAuthorized')!==false||
       own(hearthReview,'hostAuthenticated')!==false||
       own(hearthReview,'sourceBodiesIncluded')!==false||
       own(hearthReview,'modelCallsByHearth')!==0)throw Error('PEER_REVIEW_NOT_BOUND');
    const loc=own(navigation,'location');
    for(const [key,a,b] of [
      ['HSN',own(loc,'hsn'),own(hearthReview,'originalCoordinate')],
      ['HOUSE',own(loc,'house'),own(hearthReview,'house')],
      ['SPHERE',own(loc,'sphere'),own(hearthReview,'sphere')],
      ['ROLE',own(loc,'kind'),own(hearthReview,'role')]
    ])if(a!==b)throw Error('ORIGINAL_'+key+'_DRIFT');
    const publicHsn=own(loc,'hsn');
    return Object.freeze({schema:FOUNDRY_SCHEMA,status:'LOCAL_STRUCTURAL_INTEROP_ONLY',
      hsn:publicHsn,house:own(loc,'house'),sphere:own(loc,'sphere'),
      role:own(loc,'kind'),registrySha256:ARIADNE_SHA256,
      sourcePlacement:'PROPOSED_NOT_SEMANTICALLY_ADMITTED',
      sameExistingNeuralHead:'NOT_HOST_VERIFIED',
      hostRightsAtEgress:'UNVERIFIED',
      releaseAuthorized:false,hostedVerified:false,sourceBodiesIncluded:false,
      modelCallsByFoundry:0,privateModeImported:false,authorityEffect:'NONE'});
  }catch(error){return hold(error instanceof Error && /^([A-Z_]+)$/.test(error.message)?error.message:'INVALID_BOUNDARY')}
}
