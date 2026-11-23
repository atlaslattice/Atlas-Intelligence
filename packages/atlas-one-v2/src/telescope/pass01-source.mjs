/** 01 — source-lock exact R07, no caller-supplied authority flags. */
export async function pass01(c){
 const s=c.inspected.summary;
 if(s.sourcePlanSha256!==c.sourceSha||s.totalPlanned!==1728||s.implementedR07Tasks!==0||s.hostVerified!==false||s.authorityEffect!=='NONE')return{status:'HOLD'};
 return{status:'PASS_LOCAL',sourcePlanPinned:true,planned:1728,actualImplemented:0};
}
