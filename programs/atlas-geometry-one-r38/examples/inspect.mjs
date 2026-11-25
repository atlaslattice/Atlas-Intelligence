/**
 * One synthetic activation for design inspection, NEVER a production BGE or
 * authenticated data source. Does not call providers, SwarmChat or GitHub.
 */
import { createHash } from 'node:crypto';
import { createGeometryOne } from '../src/fabric.mjs';
import { PROPOSED_50, protocolSummary } from '../src/protocol50.mjs';
import { ARIADNE_SHA256, HSN } from '../src/addresses.mjs';

const hash=s=>createHash('sha256').update(s).digest('hex');
const request={
  requestId:'synthetic_inspection_r38',tenant:'synthetic_owner',
  logicalTarget:'work:geometry-one',contractVersion:'r38',
  querySha256:hash('toy-query'),sourceId:'work:synthetic_geometry',
  sourceSha256:hash('toy-source'),sourceEdition:'synthetic-v1',
  modelSha256:hash('toy-head'),registrySha256:ARIADNE_SHA256,
  scope:'WORK',purpose:'INFERENCE',subject:'Synthetic layout study'
};
let syntheticFrames=0;
const gateway=async q=>{
  ++syntheticFrames;
  return {
    schema:'atlas.geometry-one.issued/v1',
    ...q,method:'NEURAL_ONLY',fallbackUsed:false,issuer:'synthetic_fixture',
    scores:Array.from({length:1728},(_,i)=>Math.sin(i/17)+Math.cos(i/31)/3)
  };
};
const rights=async()=>({allow:true,epoch:'synthetic_epoch_r38'});
const requiredClosure=async()=>({
  status:'PINNED_COMPLETE_FOR_REVIEW',releaseAuthorized:false,authorityEffect:'NONE'
});
const geometry=createGeometryOne({gateway,rights,requiredClosure});
const result=await geometry.inspect(request,{k:12,alpha:0.18,profile:'CUBOCTAHEDRAL'});
console.log(JSON.stringify({
  purpose:'INSPECTION_ONLY_SYNTHETIC',
  resultStatus:result.status,
  exactOriginalNodeCount:HSN.length,
  scoreIssuerCalls:syntheticFrames,
  selectedTopHSNs:result.baseline?.hits.slice(0,3).map(x=>x.hsn),
  geometricRankChanged:result.geometry?.rankChanged??null,
  activatedPorts:Object.keys(result.projections||{}),
  externalHostPorts:Object.entries(result.projections||{})
    .filter(([,x])=>x.status==='HOST_PORT_NOT_BOUND').map(([k])=>k),
  proposedVoluntaryCollaborationSlots:PROPOSED_50.length,
  collaboration:protocolSummary([]),
  releaseAuthorized:false,canTrain:false,
  source:'NO_ORIGINAL_REGISTRY_BODIES_OR_REAL_WEIGHTS_LOADED'
},null,2));
