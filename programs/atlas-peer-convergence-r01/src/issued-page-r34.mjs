/**
 * R34 Peer ABI sidecar for S02 #45 / Neural Workshop #400/#409.
 * Adapts an EXISTING score array to PR66's `atlas.neural.issued/v1` schema.
 * ZERO inference calls; the original host must supply and attest issuer/source.
 * This is not a credential, release token or final RETURN authorization.
 */
import {createHash} from 'node:crypto';
import {types as utilTypes} from 'node:util';
import {ARIADNE_SHA256} from '../../atlas-geometry-one-r38/src/addresses.mjs';
const HEX=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const hold=()=>Object.freeze({status:'HOLD',releaseAuthorized:false,authorityEffect:'NONE'});
const FIELDS=['issuer','modelSha256','querySha256','sourceId','sourceSha256','sourceEdition','registrySha256','scores'];
export function makeIssuedPageFromExistingFrame(input){
  try{
    if(!input||typeof input!=='object'||utilTypes.isProxy(input)||Array.isArray(input)||Object.getPrototypeOf(input)!==Object.prototype) return hold();
    const desc=Object.getOwnPropertyDescriptors(input);
    if(Reflect.ownKeys(desc).length!==FIELDS.length||FIELDS.some(k=>!desc[k]||!Object.hasOwn(desc[k],'value')))return hold();
    const x=Object.fromEntries(FIELDS.map(k=>[k,desc[k].value]));
    if(!ID.test(x.issuer)||!ID.test(x.sourceId)||!ID.test(x.sourceEdition)||
       !HEX.test(x.modelSha256)||!HEX.test(x.sourceSha256)||!HEX.test(x.querySha256)||
       x.registrySha256!==ARIADNE_SHA256)return hold();
    const t=x.scores;
    if(utilTypes.isProxy(t)||!(t instanceof Float32Array||t instanceof Float64Array)||t.length!==1728)return hold();
    // Clone immediately: caller can reuse/mutate the original activation.
    const snapshot=Array.from(t);
    if(snapshot.some(v=>!Number.isFinite(v)))return hold();
    const format=t instanceof Float32Array?'f32be':'f64be';
    const bytes=Buffer.allocUnsafe(t.length*(format==='f32be'?4:8));
    snapshot.forEach((v,i)=>format==='f32be'?bytes.writeFloatBE(v,4*i):bytes.writeDoubleBE(v,8*i));
    const header=['ATLAS-INDRA-ISSUED-SCORES/v1',format,x.issuer,x.modelSha256,x.registrySha256,
      x.querySha256,x.sourceId,x.sourceSha256,x.sourceEdition].join('|')+'\0';
    const localScoreBinding=createHash('sha256').update(Buffer.from(header)).update(bytes).digest('hex');
    const page=Object.freeze({schema:'atlas.neural.issued/v1',method:'neural',fallbackUsed:false,
      issuer:x.issuer,modelSha256:x.modelSha256,registrySha256:x.registrySha256,
      querySha256:x.querySha256,sourceId:x.sourceId,sourceSha256:x.sourceSha256,
      sourceEdition:x.sourceEdition,scores:Object.freeze(snapshot)});
    return Object.freeze({status:'SOURCE_ONLY_ISSUED_PAGE_PREPARED',page,localScoreBinding,
      scoreFormat:format,scoreCount:1728,addedInferenceCalls:0,
      issuerAuthenticated:false,returnAuthorized:false,fullFrameProvenanceVerified:false,
      releaseAuthorized:false,authorityEffect:'NONE'});
  }catch{return hold();}
}
