/**
 * R34 Peer ABI sidecar for S02 #45 / Neural Workshop #400/#409.
 * Adapts an EXISTING score array to PR66's `atlas.neural.issued/v1` schema.
 * ZERO inference calls; the original host must supply and attest issuer/source.
 * This is not a credential, release token or final RETURN authorization.
 */
import {createHash} from 'node:crypto';
import {types as utilTypes} from 'node:util';
import {ARIADNE_SHA256} from '../../atlas-geometry-one-r38/src/addresses.mjs';
import {plainRecord,primitiveMetadata,snapshotIssuedScores} from './strict-issued-capture.mjs';
const HEX=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const hold=()=>Object.freeze({status:'HOLD',releaseAuthorized:false,authorityEffect:'NONE'});
const FIELDS=['issuer','modelSha256','querySha256','sourceId','sourceSha256','sourceEdition','registrySha256','scores'];
export function makeIssuedPageFromExistingFrame(input){
  try{
    const x=primitiveMetadata(plainRecord(input,FIELDS),{
      ids:['issuer','sourceId','sourceEdition'],
      hashes:['modelSha256','sourceSha256','querySha256','registrySha256']
    });
    if(x.registrySha256!==ARIADNE_SHA256)return hold();
    const captured=snapshotIssuedScores(x.scores);
    const snapshot=Array.from(captured.scores);
    const format=captured.format;
    const bytes=captured.beBytes;
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
