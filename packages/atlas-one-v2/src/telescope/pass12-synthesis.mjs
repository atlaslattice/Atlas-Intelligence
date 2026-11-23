/** 12 — one build: consensus-free 1728/144/12 rollup, all authority fields HELD. */
export async function pass12(c){
 if(c.state.sourceKeyCount!==1728||c.state.modeCounts?.WORK!==1248||c.state.modeCounts?.HELD!==480
  ||c.state.workPreflight?.checks!==1248||c.state.adversarial?.tested!==1728
  ||!c.state.graphDigest||!c.state.idempotencyRoot
  ||c.state.ironStatus!=='PUBLIC_EDITORIAL_REVIEW_ONLY'
  ||c.state.brokerStatus!=='PREPARED_NOT_POSTED_HOST_BINDING_REQUIRED')return{status:'HOLD'};
 const body={nodeProposals:1728,spherePerspectives:144,housePerspectives:12,
   workCandidates:1248,voluntaryModeHeld:480,
   systemReviewSlots:6912,realImprovementsEstablished:0,realHostEffects:0};
 c.state.final=body;
 return{status:'PASS_LOCAL',...body,oneBuild:true,
   hostVerified:false,semanticEdgesApproved:0,ironEmpireCanonChanged:false};
}
