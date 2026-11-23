// Constructor-only synthetic review receipts over the owner's exact registry.
// This does not evaluate any Sphere/node pair, create a matrix, or approve a link.
// Field shapes follow tools/civilization_circuit.py at the pinned PR source.
import {digest,HSN_SHA256,sha256} from '../src/index.mjs';

export function constructorFixture(originalAriadneBytes) {
  if(sha256(originalAriadneBytes)!==HSN_SHA256)throw new Error('EXACT_OWNER_SOURCE_REQUIRED');
  const original=JSON.parse(Buffer.from(originalAriadneBytes).toString('utf8'));
  const seal=record=>({...record,fixtureOnly:true,receiptSHA256:digest({...record,fixtureOnly:true})});
  const manifest={schema:'atlas.civilization.circuit/v1',originalSourceSHA256:HSN_SHA256,
    pairEvaluations:248832,homeStructural:1728,externalPerspectiveEvaluations:247104,
    nodePassRecords:1728,sphereReviewRecords:144,houseFollowups:12,houseSphereFollowups:1728,
    houseSphereReferencedPositionsNotFresh:2985984,totalLogicalPositionsIncludingReusedHouseReferences:3234816,
    domain:1008,epistemicMeta:720,genuineResidentMacroturns:0,peerReviewsVerified:0,
    semanticallyAcceptedCrossLinks:0,siteDeployments:0,
    fixtureOnly:true,actualPairEvaluationsExecutedByFixture:0,
    countFields:'DECLARED_CONSTRUCTOR_SHAPE_ONLY_NOT_EXECUTED_ANALYSIS'};
  const entries=Object.entries(original.nodes).sort(([a],[b])=>a.localeCompare(b));
  const nodeRecords=entries.map(([nodeId,n],i)=>seal({
    schema:'atlas.one.node-circuit/v1',slot:i+1,nodeId,houseId:nodeId.slice(0,3),sphereId:nodeId.slice(0,7),
    nodeName:n.name,nodeKind:n.kind,role:n.kind==='DOMAIN_SPECIALIZATION'?'DOMAIN_RESEARCH_LOCATOR':'EPISTEMIC_METHOD_AUDIT',
    sourceNodeSHA256:n.source_record_sha256,sourceRegistrySHA256:HSN_SHA256,sourceEdition:'Ariadne v0.7',
    sourceDefinition:n.definition,sourceIncludes:n.includes,sourceExcludes:n.excludes,
    spherePerspectiveEvaluations:144,
    candidatePerspectives:[{sphereId:'H02.S01',status:'UNREVIEWED',overlapTokens:['synthetic-fixture-only']}],
    falsifier:'Synthetic constructor fixture: no comparison or semantic review was performed.',
    reviewState:'UNREVIEWED',workPosted:false,canonEffect:'NONE'
  }));
  const domain=entries.find(([,n])=>n.kind==='DOMAIN_SPECIALIZATION');
  const sphereReviews=Object.entries(original.spheres).sort(([a],[b])=>a.localeCompare(b)).map(([sphereId,s])=>{
    const home=entries.filter(([id])=>id.startsWith(sphereId+'.'));
    const role=home[0][1].kind;
    return seal({schema:'atlas.one.sphere-perspective/v1',sphereId,houseId:sphereId.slice(0,3),
      houseName:original.houses[sphereId.slice(0,3)].name,sphereName:s.name,
      sourceEdition:'Ariadne v0.7',sourceSHA256:HSN_SHA256,
      homeNodes:home.map(([id,n])=>({id,name:n.name,kind:n.kind,sourceNodeSHA256:n.source_record_sha256})),
      roleCounts:{[role]:12},evaluatedNodes:1728,homeStructural:12,externalEvaluated:1716,
      shortlist:[{node:domain[0],nodeName:domain[1].name,nodeKind:domain[1].kind,
        sourceNodeSHA256:domain[1].source_record_sha256,
        relation:'CO_STUDY_CANDIDATE_NOT_EQUIVALENCE',semanticReview:'UNADJUDICATED',fixtureOnly:true}],
      reviewQuestion:'Synthetic constructor fixture question; not a completed review.',
      falsifiers:['Synthetic receipt boundary only'],residentReviewCount:0,hostedVerified:false,canonEffect:'NONE'});
  });
  const houseFollowups=Object.entries(original.houses).sort(([a],[b])=>a.localeCompare(b)).map(([houseId,h])=>seal({
    schema:'atlas.one.house-followup/v1',houseId,houseName:h.name,sourceSHA256:HSN_SHA256,
    sphereReviews:12,nodePasses:144,sphereIds:sphereReviews.filter(s=>s.houseId===houseId).map(s=>s.sphereId),
    contrastingHouseQuestions:[{counterpartHouse:'H02',counterpartNode:'H02.S01.N01',fixtureOnly:true}],
    followupQuestion:'Synthetic House fixture; no review occurred.',
    rightsConcern:'Synthetic non-offsettable boundary fixture; no rights are granted.',
    physicalStockConcern:'Synthetic source integrity fixture; no empirical claim.',
    residentReviewCount:0,actualMacroturnsCompleted:0,governance:'NO_AUTOMATIC_CANON_OR_RESIDENT_ASSIGNMENT'
  }));
  const houseSphereFollowups=sphereReviews.flatMap(s=>houseFollowups.map(h=>{
    const sphereRole=s.roleCounts.DOMAIN_SPECIALIZATION===12?'DOMAIN_SUBJECT':'EPISTEMIC_METHOD';
    return seal({schema:'atlas.one.house-sphere-followup/v1',followupId:`${s.sphereId}::${h.houseId}`,
      sphereUnderReview:s.sphereId,housePerspective:h.houseId,sphereName:s.sphereName,housePerspectiveName:h.houseName,
      sourceSHA256:HSN_SHA256,sourceEdition:'Ariadne v0.7',sphereReviewSHA256:s.receiptSHA256,
      houseReviewSHA256:h.receiptSHA256,sphereRole,homeNodeCount:12,
      existingSphereEvidenceEvaluationsReferenced:1728,referenceReusedNotFreshComputation:true,
      semanticGate:sphereRole==='EPISTEMIC_METHOD'?'EPISTEMIC_METHOD_ONLY_NOT_SAME_AS':'DOMAIN_CANDIDATE_NOT_SAME_AS',
      question:'Synthetic paired-followup fixture; no specialist review occurred.',
      counterexample:'A later mutation must not rewrite a validated receipt.',
      rightsGate:'CURRENT_HOST_READ_AND_RETURN_AND_AFFECTED_PARTY_CONSENT_REQUIRED',
      humanReviewCount:0,residentAuthenticated:false,actualMacroturnCompleted:false,
      workPostPerformed:false,modelCallPerformed:false,canonEffect:'NONE',creativeEffect:'NONE'});
  }));
  return {originalAriadneBytes,manifest,nodeRecords,sphereReviews,houseFollowups,houseSphereFollowups};
}
