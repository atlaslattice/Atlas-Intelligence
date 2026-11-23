/** 06 — structural links only; no inferred semantic SAME_AS or REQUIRES. */
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
const coord=(h,s,n)=>`H${String(h).padStart(2,'0')}.S${String(s).padStart(2,'0')}.N${String(n).padStart(2,'0')}`;
export async function pass06(c){
 const links=[];
 for(const r of c.source){
  const h=Number(r.coordinate.slice(1,3)),s=Number(r.coordinate.slice(5,7)),n=Number(r.coordinate.slice(9,11));
  const same=coord(h,s,n%12+1),other=coord(h%12+1,s,n);
  if(same===r.coordinate||other===r.coordinate||same.slice(0,7)!==r.coordinate.slice(0,7)||other.slice(0,3)===r.coordinate.slice(0,3))return{status:'HOLD'};
  links.push([r.coordinate,same,'SAME_SPHERE_STRUCTURE'],[r.coordinate,other,'CROSS_HOUSE_REVIEW_CANDIDATE']);
 }
 c.state.graphDigest=sha(JSON.stringify(links));
 return{status:'PASS_LOCAL',candidateLinkCount:links.length,
   relationTypes:['SAME_SPHERE_STRUCTURE','CROSS_HOUSE_REVIEW_CANDIDATE'],
   semanticLinksApproved:0,graphDigest:c.state.graphDigest};
}
