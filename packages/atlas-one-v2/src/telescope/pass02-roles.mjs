/** 02 — protect Sphere-level 7/5 taxonomy (NOT N01–N07 vs N08–N12). */
export async function pass02(c){
 const hs=Array(12).fill(0), ss=new Map(), kinds={DOMAIN_SPECIALIZATION:0,EPISTEMIC_META:0};
 for(const r of c.source){
   const h=Number(r.coordinate.slice(1,3)),s=Number(r.coordinate.slice(5,7));
   const role=s<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META';
   if(r.sourceRole!==role)return{status:'HOLD'};
   hs[h-1]++;kinds[role]++;
   const k=r.coordinate.slice(0,7),x=ss.get(k)??[];x.push(role);ss.set(k,x);
 }
 if(hs.some(x=>x!==144)||ss.size!==144||[...ss.values()].some(x=>x.length!==12||new Set(x).size!==1)||kinds.DOMAIN_SPECIALIZATION!==1008||kinds.EPISTEMIC_META!==720)return{status:'HOLD'};
 return{status:'PASS_LOCAL',domain:kinds.DOMAIN_SPECIALIZATION,method:kinds.EPISTEMIC_META,homogeneousSpheres:ss.size};
}
