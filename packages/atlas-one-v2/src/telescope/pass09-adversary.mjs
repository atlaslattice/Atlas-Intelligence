/** 09 — structural adversary: wrong-mode, forged host, semantic alias and stale pin. */
export function adversarialAdmission(fixture){
 const hold={status:'HOLD',canPublish:false,hostAuthenticated:false,authorityEffect:'NONE'};
 try{
  if(!fixture||Object.getPrototypeOf(fixture)!==Object.prototype)return hold;
  const allowed=['coordinate','hostClaim','mode','relation','sourceDigest','sourceEdition'];
  const props=Object.getOwnPropertyDescriptors(fixture);
  if(Object.keys(props).length!==allowed.length||Object.keys(props).some(k=>!allowed.includes(k)||!('value' in props[k])))return hold;
  const f=Object.fromEntries(allowed.map(k=>[k,props[k].value]));
  if(typeof f.coordinate!=='string'||!/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/.test(f.coordinate)||f.mode!=='WORK'||f.hostClaim!==false||f.relation!=='SOURCE_REVIEW_CANDIDATE'||f.sourceEdition!=='Ariadne v0.7'||typeof f.sourceDigest!=='string'||! /^[a-f0-9]{64}$/.test(f.sourceDigest))return hold;
  return{status:'SOURCE_SHAPE_CANDIDATE',canPublish:false,hostAuthenticated:false,authorityEffect:'NONE'};
 }catch{return hold;}
}
export async function pass09(c){
 let tested=0,attacksHeld=0;
 for(const row of c.source){
   const basis={coordinate:row.coordinate,hostClaim:false,mode:row.suggestedMode,
     relation:'SOURCE_REVIEW_CANDIDATE',sourceDigest:row.sourceDigest,sourceEdition:row.sourceEdition};
   const positive=adversarialAdmission(basis);
   if((row.suggestedMode==='WORK')!==(positive.status==='SOURCE_SHAPE_CANDIDATE'))return{status:'HOLD'};
   for(const bad of [{...basis,mode:'PALACE'},{...basis,relation:'SAME_AS'},
     {...basis,hostClaim:true},{...basis,sourceEdition:'synthetic-hsn-v1'}]){
     if(adversarialAdmission(bad).status!=='HOLD')return{status:'HOLD'};
     attacksHeld++;
   }
   tested++;
 }
 c.state.adversarial={tested,attacksHeld,authorityEffect:'NONE'};
 return{status:'PASS_LOCAL',reviewed:tested,attacksRejected:attacksHeld,
   sourceRolesNotFused:true,hostGrants:0};
}
