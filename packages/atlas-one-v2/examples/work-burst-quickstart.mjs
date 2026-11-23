/** Work Burst synthetic demo: twelve actual LOCAL operations in one invocation.
 * Demonstrates parallel waves, not remote agent turns or room activity.
 */
import {executeLocalWorkBurst} from '../src/work-burst.mjs';
const tasks=Array.from({length:12},(_,i)=>({
  id:'task'+String(i+1).padStart(2,'0'),operator:'LOCAL_CHECK',
  mode:'WORK',resourceKey:'lane-'+String(i%4),
  input:{sample:i+1},evidenceRefs:['synthetic:local-example']
}));
const out=await executeLocalWorkBurst({tasks,maxParallel:4,
  operators:{LOCAL_CHECK:async ({sample})=>({
    status:'PASS_LOCAL',resultTag:'CHECKED',checks:sample%3+1})}});
if(out.status!=='LOCAL_COMPLETE'||out.counts.passed!==12)throw Error('example failed');
console.log(JSON.stringify({schema:out.schema,status:out.status,counts:out.counts,
  waves:out.waves,receiptDigest:out.receiptDigest,hostedVerified:out.hostedVerified,
  peerMessagesPosted:out.peerMessagesPosted},null,2));
