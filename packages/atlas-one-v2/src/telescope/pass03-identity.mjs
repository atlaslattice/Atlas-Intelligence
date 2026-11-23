/** 03 — exact compound identity: label equality or positional equality != source identity. */
import {createHash} from 'node:crypto';
const sha=v=>createHash('sha256').update(v).digest('hex');
export async function pass03(c){
 const keys=new Set(),digests=new Set(),parts=[];
 for(const r of c.source){
   if(!/^[a-f0-9]{64}$/.test(r.sourceDigest||''))return{status:'HOLD'};
   const key=sha(JSON.stringify(['ariadne','v0.7',r.coordinate,r.sourceRole,r.sourceDigest]));
   if(keys.has(key))return{status:'HOLD'};
   keys.add(key);parts.push(key);digests.add(r.sourceDigest);
 }
 c.state.keyDigest=sha(parts.join('\n'));c.state.sourceKeyCount=keys.size;
 return{status:'PASS_LOCAL',identities:keys.size,uniqueSourceDigests:digests.size,identityRoot:c.state.keyDigest};
}
