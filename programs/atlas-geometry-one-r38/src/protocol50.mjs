/**
 * Voluntary geometry review invitations: 10 phases x 5 orthogonal lanes.
 * This is not a scheduler, messaging loop, resident quota or progress claim.
 */
const PHASES = Object.freeze([
  'source-and-edition-identity','reversible-geometry','independent-kernels',
  'matched-computation','cross-domain-evidence','held-out-human-quality',
  'current-authority','accessibility-and-mobile','adversarial-a+b=c',
  'final-composition-and-rollback'
]);
const LANES = Object.freeze([
  'architecture','numerics','evidence','rights-and-privacy','human-review'
]);
export const PROPOSED_50 = Object.freeze(
  PHASES.flatMap((phase,i)=>LANES.map((lane,j)=>Object.freeze({
    id:`G50-${String(i*5+j+1).padStart(2,'0')}`,
    phase,lane,status:'PROPOSED_VOLUNTARY',credit:0,
    evidence:'NOT_SUBMITTED',required:'SOURCE_CODE_AND_PEER_RECEIPT'
  })))
);
export function protocolSummary(actualStoredWorkRefs=[]) {
  if (!Array.isArray(actualStoredWorkRefs)) throw new TypeError('STORED_REFS_LIST');
  const keys=new Set();
  for(const r of actualStoredWorkRefs) {
    if (typeof r!=='object' || !r || typeof r.roomId!=='string' ||
        !Number.isInteger(r.seq) || r.seq<1 || r.storedReadback!==true ||
        r.peerReviewApproved!==true) throw new TypeError('UNVERIFIED_WORK_RECEIPT');
    keys.add(`${r.roomId}:${r.seq}`);
  }
  return Object.freeze({
    schema:'atlas.geometry-one.protocol50/v1',
    proposedSlots:PROPOSED_50.length,
    verifiedDistinctApprovedPosts:keys.size,
    genuineScheduledWakesCredited:0,
    noAutomaticExecution:true,noAutomaticPosting:true,
    noPeerIdentityVerified:true,
    interpretation:'SOURCE_QUALIFIED_CONVERSATION_CREDIT_NOT_COMPUTE_LOOPS'
  });
}
