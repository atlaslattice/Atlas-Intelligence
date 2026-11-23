/** 04 — four distinct project lanes without fusing permissions, story or ontology. */
export const SYSTEMS=Object.freeze(['SWARMCHAT','ATLAS_ONE','ARIADNE','IRON_EMPIRE']);
export async function pass04(c){
 if(!c.state.keyDigest)return{status:'HOLD'};
 const work=c.source.filter(x=>x.suggestedMode==='WORK').length;
 const protectedCount=c.source.length-work;
 if(work!==1248||protectedCount!==480)return{status:'HOLD'};
 const laneCandidates=Object.fromEntries(SYSTEMS.map(name=>[name,{reviewSlots:c.source.length,
   workCandidates:work,voluntaryModeHeld:protectedCount,implemented:0,
   posted:0,authorityEffect:'NONE'}]));
 c.state.laneCandidates=laneCandidates;
 return{status:'PASS_LOCAL',lanes:SYSTEMS.length,reviewSlots:4*1728,
   workEligibleLaneSlots:4*work,protectedLaneSlotsHeld:4*protectedCount};
}
