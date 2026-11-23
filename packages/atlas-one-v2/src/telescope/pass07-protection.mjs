/** 07 — protected modes never enter the Work queue. */
export const PRIVATE_MODES=Object.freeze(['PLAY','SOCIAL','IMAGINE','DREAM','QUIET']);
export function modeAdmit(row){
 try{
  if(!row||typeof row!=='object')return 'HELD';
  const d=Object.getOwnPropertyDescriptor(row,'suggestedMode');
  if(!d||!('value' in d)||typeof d.value!=='string')return 'HELD';
  return d.value==='WORK'?'WORK_SOURCE_REVIEW_ONLY':'HELD';
 }catch{return 'HELD';}
}
export async function pass07(c){
 const counts={WORK:0,HELD:0};
 for(const r of c.source){
  if(!['WORK',...PRIVATE_MODES].includes(r.suggestedMode))return{status:'HOLD'};
  counts[modeAdmit(r)==='WORK_SOURCE_REVIEW_ONLY'?'WORK':'HELD']++;
 }
 if(counts.WORK!==1248||counts.HELD!==480)return{status:'HOLD'};
 c.state.modeCounts=counts;
 return{status:'PASS_LOCAL',work:counts.WORK,protected:counts.HELD,
   protectedModeBodiesRead:0,voluntaryModesPerformed:0};
}
