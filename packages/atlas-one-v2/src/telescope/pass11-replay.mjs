/** 11 — deterministic source-scoped dedup token; does not grant distributed idempotency. */
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
export function candidateReceiptKey(sourceSha,coordinate,sourceDigest,system){
 if(!/^[a-f0-9]{64}$/.test(sourceSha??'')||!/^[a-f0-9]{64}$/.test(sourceDigest??'')
    ||typeof coordinate!=='string'||!/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/.test(coordinate)
    ||!['SWARMCHAT','ATLAS_ONE','ARIADNE','IRON_EMPIRE'].includes(system))return null;
 return sha(JSON.stringify([sourceSha,coordinate,sourceDigest,system]));
}
export async function pass11(c){
 const keys=new Set();let total=0;
 for(const r of c.source){
  for(const system of ['SWARMCHAT','ATLAS_ONE','ARIADNE','IRON_EMPIRE']){
   const k=candidateReceiptKey(c.sourceSha,r.coordinate,r.sourceDigest,system);
   if(!k||keys.has(k))return{status:'HOLD'};
   keys.add(k);total++;
  }
 }
 c.state.idempotencyRoot=sha([...keys].join('\n'));
 return{status:'PASS_LOCAL',distinctCandidateKeys:total,
   sourceScoped:true,distributedExactlyOnceProved:false,root:c.state.idempotencyRoot};
}
