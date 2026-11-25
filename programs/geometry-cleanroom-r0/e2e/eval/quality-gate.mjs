/** Research gate: source-family disjointness, actual third-party judgment, no self-ratification.
 * Trust NEVER comes from caller-supplied flags. The host must supply an independent
 * source/purpose/reviewer authority; this pure function cannot authenticate a person.
 */
import {createHash} from 'node:crypto';
const HASH=/^[0-9a-f]{64}$/;
const hold=(reason)=>Object.freeze({schema:'atlas.quality.independent-hold/v1',status:'HOLD',reason,
 independentHumanQualityVerified:false,trainedQualityGainVerified:false,releaseAuthorized:false});
const score=(grades,rank,k)=>{
 const dcg=rank.slice(0,k).reduce((s,id,i)=>s+(2**(grades.get(id)??0)-1)/Math.log2(i+2),0);
 const ideal=[...grades.values()].sort((a,b)=>b-a).slice(0,k).reduce((s,g,i)=>s+(2**g-1)/Math.log2(i+2),0);
 return ideal?dcg/ideal:0;
};
export function evaluateHeldout({panel,independentAuthority}={}) {
 try {
  if(!panel||typeof panel!=='object'||Array.isArray(panel)||!Array.isArray(panel.queries)||panel.queries.length<12)return hold('AT_LEAST_12_NEW_QUERIES_REQUIRED');
  if(!independentAuthority||typeof independentAuthority.verifyResearchScope!=='function'||
    typeof independentAuthority.verifyReviewers!=='function'||typeof independentAuthority.verifyFamilies!=='function')return hold('EXTERNAL_INDEPENDENT_AUTHORITY_REQUIRED');
  const ids=new Set(),families=new Set(),rows=[];
  for(const q of panel.queries){
   if(!q||typeof q.id!=='string'||ids.has(q.id)||!HASH.test(q.querySha256)||typeof q.familyId!=='string'||
     !Array.isArray(q.baseline)||!Array.isArray(q.candidate)||!Array.isArray(q.grades)||
     q.grades.length<2||q.grades.some(g=>typeof g.reviewId!=='string'||typeof g.reviewerId!=='string'||typeof g.sourceRef!=='string'||
       !Array.isArray(g.judgments)))return hold('MALFORMED_OR_INSUFFICIENT_REVIEWS');
   ids.add(q.id);families.add(q.familyId);
   const reviewerIds=new Set(q.grades.map(g=>g.reviewerId));if(reviewerIds.size<2)return hold('TWO_INDEPENDENT_REVIEWERS_REQUIRED');
   if(!(independentAuthority.verifyResearchScope(q)===true&&independentAuthority.verifyReviewers(q.grades,q)===true))return hold('UNVERIFIED_RESEARCH_RIGHTS_OR_REVIEWERS');
   if(new Set(q.baseline).size!==q.baseline.length||new Set(q.candidate).size!==q.candidate.length||
      q.baseline.length===0||q.candidate.length===0)return hold('UNSAFE_RANK_IDENTITIES');
   const byId=new Map();for(const g of q.grades)for(const x of g.judgments){
     if(!x||typeof x.hsn!=='string'||typeof x.grade!=='number'||!Number.isInteger(x.grade)||x.grade<0||x.grade>3)return hold('UNSAFE_GRADE');
     const v=byId.get(x.hsn)??[];v.push(x.grade);byId.set(x.hsn,v);
   }
   if([...new Set([...q.baseline,...q.candidate])].some(x=>(byId.get(x)?.length??0)<2))return hold('UNJUDGED_CANDIDATE');
   const med=new Map([...byId].map(([k,v])=>[k,v.slice().sort((a,b)=>a-b)[Math.floor(v.length/2)]]));
   rows.push({id:q.id,family:q.familyId,baseline:score(med,q.baseline,10),candidate:score(med,q.candidate,10)});
  }
  if(families.size<6)return hold('SIX_INDEPENDENT_SOURCE_FAMILIES_REQUIRED');
  if(independentAuthority.verifyFamilies([...families],panel) !==true)return hold('FAMILY_TIME_HOLDOUT_NOT_ATTESTED');
  const baseline=rows.reduce((a,r)=>a+r.baseline,0)/rows.length,candidate=rows.reduce((a,r)=>a+r.candidate,0)/rows.length;
  return Object.freeze({schema:'atlas.quality.review-math/v1',status:'REVIEW_MATH_COMPUTED_UNPROMOTED',
    baselineNdcg10:baseline,candidateNdcg10:candidate,delta:candidate-baseline,
    queryCount:rows.length,familyCount:families.size,
    humanIndependenceEstablishedByThisCode:false,
    independentlyCertifiedQualityGain:false,releaseAuthorized:false,trainingAuthorized:false});
 }catch{return hold('UNTRUSTED_REVIEW_INPUT');}
}
