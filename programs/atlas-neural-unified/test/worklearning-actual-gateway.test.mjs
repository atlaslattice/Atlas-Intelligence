/** Contract test against the actual 0.2.0 WorkLearning JS gateway source.
 * Set ATLAS_WORKLEARNING_SOURCE_ROOT to the exact extracted source package.
 * No owner corpus, model weights, network calls, hosted IAM or training.
 */
import test from 'node:test';import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';import {createHash} from 'node:crypto';
import {createOneBrainPort} from '../src/one-brain-port.mjs';
const src=process.env.ATLAS_WORKLEARNING_SOURCE_ROOT;
const skip=!src?'Exact 0.2.0 WorkLearning source not supplied':false;
const orig='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
const hash=s=>createHash('sha256').update(s).digest('hex');
const pins={workspaceId:'synthetic-single-brain-workroom',registrySha256:orig,configSha256:hash('config'),corpusSha256:hash('corpus'),checkpointSha256:hash('checkpoint')};
const source={id:'ariadne:v0.7',version:'v0.7',sha256:orig,uri:'atlas-source://ariadne/v0.7'};
const fixture=()=>({target:'nodes',method:'neural',primaryMethod:'neural',fallbackUsed:false,fallbackReason:null,semanticAcceptance:false,
  hits:[{hsn:'H05.S06.N12',name:'Research software engineering',score:.625,score_type:'neural',semantic_status:'CANDIDATE_UNREVIEWED'}],
  provenance:{...pins,sourceRefs:[source],itemRefs:[]}});
const candidate=()=>({schema:'atlas.one.shared-neural-fabric/v1',status:'PREPARED_NUMERIC_REVIEW_ONLY',registrySha256:orig,
  addressedNodes:1728,neuralDimension:384,nodeVectorAssetSha256:hash('synthetic vectors'),encoderRevision:'BGE384-SOURCE_TEST',
  hits:[{hsn:'H05.S06.N12',score:.8,semanticAccepted:false}],canTrain:false,canPublish:false,sourceBodiesReturned:false,sourceVerified:false});
let lib;
async function library(){if(!lib){lib=await import(pathToFileURL(resolve(src,'src/index.mjs')).href);}return lib;}
function gatewayOf(lib,rights){return lib.createWorkLearningGateway({owner:'synthetic-owner',workspaceId:pins.workspaceId,
 sourceManifest:[source],verifyPins:async()=>pins,authorize:()=>rights.returnAllowed,
 authorizeUse:()=>rights.useAllowed,hostOwnedFinalReturnSync:()=>rights.useAllowed&&rights.returnAllowed,
 backend:{execute:async()=>fixture()}})}
test('real gateway gives branded source result; one brain preserves it', {skip},async t=>{
 const lib=await library(), rights={useAllowed:true,returnAllowed:true},g=gatewayOf(lib,rights);t.after(()=>g.close());
 const output=await g.search({query:'fixture',target:'nodes',limit:1});const old=JSON.stringify(output);
 const port=createOneBrainPort({authorizedResultMetadata:lib.authorizedResultMetadata,revalidateAuthorizedResult:lib.revalidateAuthorizedResult});
 const prepared=await port.prepare(output,candidate());
 assert.equal(prepared.status,'PREPARED_NOT_RELEASED');assert.deepEqual(prepared.originalNodeIds,['H05.S06.N12']);
 assert.equal(JSON.stringify(output),old);assert.equal(prepared.canPublish,false);
 const fake=structuredClone(output);assert.equal((await port.prepare(fake,candidate())).status,'HOLD_NOT_GATEWAY_AUTHORIZED');
});
test('real gateway late USE revocation withholds single-brain preview',{skip},async t=>{
 const lib=await library(),rights={useAllowed:true,returnAllowed:true},g=gatewayOf(lib,rights);t.after(()=>g.close());
 const out=await g.search({query:'fixture',target:'nodes',limit:1}); rights.useAllowed=false;
 const port=createOneBrainPort({authorizedResultMetadata:lib.authorizedResultMetadata,revalidateAuthorizedResult:lib.revalidateAuthorizedResult});
 assert.equal((await port.prepare(out,candidate())).status,'HOLD_NOT_GATEWAY_AUTHORIZED');
});
