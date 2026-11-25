/**
 * Geometry ONE: exactly one externally supplied activation becomes a shared
 * immutable inspection frame. No duplicate model, retriever, broker or issuer.
 */
import { canonicalDigest, validateRequest, validateIssued, checkHostPhase,
  checkRequiredClosure, holdReceipt, Hold } from './contracts.mjs';
import { finiteScores, topK, reductions, route, exclusiveFourBands } from './geometry.mjs';
import { projectTwelve } from './ports.mjs';
import { ARIADNE_SHA256 } from './addresses.mjs';

function readonlyReceipt(request, issued, raw, candidate, edges, options, epoch) {
  const base = topK(raw,options.k), projected = topK(candidate,options.k);
  const frameDigest = canonicalDigest({
    requestId:request.requestId,modelSha256:request.modelSha256,
    sourceSha256:request.sourceSha256,querySha256:request.querySha256,
    scores:Array.from(raw)
  });
  const masses = reductions(raw);
  const views = projectTwelve({hits:base,masses,frameDigest,request},edges);
  return Object.freeze({
    schema:'atlas.geometry-one.root/v1',
    status:'INSPECTION_CANDIDATE_ONLY',
    version:'r38',
    topology:Object.freeze([12,12,12]),
    activationCount:1,
    neuralModel:'HOST_INJECTED_EXISTING_OR_EXPLICIT_SYNTHETIC_FIXTURE',
    sourcePins:Object.freeze({registrySha256:ARIADNE_SHA256,
      sourceSha256:request.sourceSha256,modelSha256:request.modelSha256}),
    sourceScope:'WORK',
    tenant:request.tenant,
    logicalTarget:request.logicalTarget,
    frameDigest,
    rightsEpoch:epoch,
    baseline:Object.freeze({hits:base,scoreMass:masses}),
    geometry:Object.freeze({
      profile:options.profile,alpha:options.alpha,seed:options.seed,
      rerankedHits:projected,
      rankChanged:base.some((hit,i)=>hit.hsn!==projected[i].hsn),
      candidateOnly:options.alpha!==0,
      outcome:'NOT_EVALUATED_FOR_SEMANTIC_OR_HUMAN_QUALITY'
    }),
    fourBand:exclusiveFourBands(raw,base[0].index,[0,0,0,0]),
    projections:views,
    lineage:Object.freeze({issuerClaim:issued.issuer,
      sourceId:request.sourceId,sourceEdition:request.sourceEdition,
      signedIssuerVerified:false,hostedCommitVerified:false}),
    canDeploy:false,canTrain:false,canDisclose:false,
    releaseAuthorized:false,authorityEffect:'NONE',
    protectedSourceBodiesIncluded:false,
    convergence:'ONE_FRAME_WITH_TYPED_PORTS_NOT_HOSTED_NEURAL_CONVERGENCE'
  });
}
export function createGeometryOne({gateway,rights,requiredClosure,candidates=[]}={}) {
  if (typeof gateway!=='function' || typeof rights!=='function' ||
      typeof requiredClosure!=='function' || !Array.isArray(candidates)) {
    throw new Hold('EXISTING_HOST_DEPENDENCIES_UNBOUND');
  }
  const candidateSnapshot = candidates.slice();
  let attempts=0,issuedCount=0,prepared=0,held=0;
  async function inspect(untrustedRequest, options={}) {
    ++attempts;
    let request;
    try {
      request=validateRequest(untrustedRequest);
      const config={
        profile:options.profile??'CUBOCTAHEDRAL',
        alpha:options.alpha??0,
        seed:options.seed??145,
        k:options.k??10
      };
      // Local numeric computation may be inspected without running an
      // external authority or committing any persistent effect.
      const epoch=await checkHostPhase(rights,'READ',request);
      let issued;
      try {
        ++issuedCount;
        issued=validateIssued(await gateway(Object.freeze({
          requestId:request.requestId,querySha256:request.querySha256,
          sourceId:request.sourceId,sourceSha256:request.sourceSha256,
          sourceEdition:request.sourceEdition,modelSha256:request.modelSha256,
          registrySha256:request.registrySha256
        })),request);
      } catch {throw new Hold('GATEWAY_ISSUANCE_INVALID');}
      const raw=finiteScores(issued.scores);
      const candidate=route(raw,config);
      await checkHostPhase(rights,'INFERENCE_USE',request,epoch);
      if (request.purpose==='CITATION') {
        await checkHostPhase(rights,'DISCLOSURE_RETURN',request,epoch);
      }
      await checkRequiredClosure(requiredClosure,request,issued);
      await checkHostPhase(rights,'RETURN',request,epoch);
      const output=readonlyReceipt(request,issued,raw,candidate,candidateSnapshot,config,epoch);
      prepared++;
      return output;
    } catch (error) {
      ++held;
      // Does not release partial numeric results or protected metadata.
      return holdReceipt(error);
    }
  }
  return Object.freeze({
    id:'ATLAS_GEOMETRY_ONE_R38',
    inspect,
    descriptor:()=>Object.freeze({schema:'atlas.geometry-one.descriptor/v1',
      ontologySha256:ARIADNE_SHA256,policy:'EXISTING_HOST_ONLY',
      externalModelBound:false,hostedIntegration:false,
      localMethods:['12x12x12','cubo','matched-shuffle','four-band','12-ports'],
      attempts,issuedCount,prepared,held})
  });
}
