/** Atlas META145 HSN evidence/Work portfolio — local, review-only.
 * V08 exact-coordinate ordinal indexing: no global sort or 144 full-array scans.
 * Complements existing PR45 and PR49 without replacing either authoritative host.
 * DETACHED typed normalization, exact node/output/dependency/epoch binding, no execution.
 * A matching SHA receipt is not an issuer signature or independent review.
 */
import {createHash} from 'node:crypto';
export const PORTFOLIO_SCHEMA='atlas.meta145.evidence-portfolio/v07';
const ADDRESS=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const SHA=/^[a-f0-9]{64}$/;
const RIGHTS=/^[a-zA-Z0-9:_.-]{3,160}$/;
const STATES=Object.freeze(['PASS','FAIL','HOLD','UNREVIEWED','N_A']);
const NAREASONS=Object.freeze(['NO_METHOD_SUBJECT','NONAPPLICABLE_BY_SOURCE','RIGHTS_PROTECTED']);
const DENY=Object.freeze({schema:PORTFOLIO_SCHEMA,status:'HOLD',reason:'SOURCE_OR_RIGHTS_PROOF_UNAVAILABLE',data:null,hostAuthenticated:false,workPosted:false});
const dig=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function owned(obj,fields){
  // Own primitive/data-property snapshot; no inherited values or getter evaluation.
  try{
    if(obj===null||typeof obj!=='object'||Array.isArray(obj))return null;
    const proto=Object.getPrototypeOf(obj);if(proto!==Object.prototype&&proto!==null)return null;
    const descriptors=Object.getOwnPropertyDescriptors(obj);
    if(Reflect.ownKeys(obj).some(k=>typeof k!=='string'||!fields.includes(k)||!Object.hasOwn(descriptors[k],'value')))return null;
    const dst=Object.create(null);for(const field of fields)dst[field]=Object.hasOwn(descriptors,field)?descriptors[field].value:undefined;
    return Object.freeze(dst);
  }catch{return null;}
}
const isDigest=v=>typeof v==='string'&&SHA.test(v);
const isRights=v=>typeof v==='string'&&RIGHTS.test(v);
const nodeFields=['hsn','recordSha256','role'];
const reviewFields=['hsn','status','sourceSha256','outputSha256','recordSha256','dependencySha256','rightsEpoch','ticketSha256','evidenceSha256','naReason'];
const scopeFields=['sourceSha256','outputSha256','dependencySha256','rightsEpoch','originMode','reportedHostAuthenticated'];
const roleFor=hsn=>parseInt(hsn.slice(5,7),10)<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META';
export function computeReviewTicket({hsn,sourceSha256,outputSha256,recordSha256,dependencySha256,rightsEpoch}={}){
  if(typeof hsn!=='string'||!ADDRESS.test(hsn)||![sourceSha256,outputSha256,recordSha256,dependencySha256].every(isDigest)||!isRights(rightsEpoch))throw new TypeError('TICKET_INPUT_INVALID');
  return dig(['ATLAS_REVIEW_V07',hsn,sourceSha256,recordSha256,outputSha256,dependencySha256,rightsEpoch]);
}
export function compileEvidencePortfolio(expectedNodes,reviews,scope){
  const s=owned(scope,scopeFields);
  if(!s||s.originMode!=='WORK'||s.reportedHostAuthenticated!==false||![s.sourceSha256,s.outputSha256,s.dependencySha256].every(isDigest)||!isRights(s.rightsEpoch))return DENY;
  if(!Array.isArray(expectedNodes)||!Array.isArray(reviews)||expectedNodes.length!==1728||reviews.length!==1728)return DENY;
  if(Object.getPrototypeOf(expectedNodes)!==Array.prototype||Object.getPrototypeOf(reviews)!==Array.prototype)return DENY;
  const nodes=new Map();
  for(let i=0;i<1728;i++){
    if(!Object.hasOwn(expectedNodes,i)||!Object.hasOwn(reviews,i))return DENY;
    const n=owned(expectedNodes[i],nodeFields);
    if(!n||typeof n.hsn!=='string'||!ADDRESS.test(n.hsn)||!isDigest(n.recordSha256)||n.role!==roleFor(n.hsn)||nodes.has(n.hsn))return DENY;
    nodes.set(n.hsn,n);
  }
  if(Reflect.ownKeys(expectedNodes).some(k=>k!=='length'&&(!/^(0|[1-9]\d*)$/.test(String(k))||Number(k)>=1728))||
     Reflect.ownKeys(reviews).some(k=>k!=='length'&&(!/^(0|[1-9]\d*)$/.test(String(k))||Number(k)>=1728)))return DENY;
  const rows=new Array(1728),seen=new Set(),ticketSet=new Set();
  for(let i=0;i<1728;i++){
    const r=owned(reviews[i],reviewFields);
    if(!r||typeof r.hsn!=='string'||!nodes.has(r.hsn)||seen.has(r.hsn)||!STATES.includes(r.status))return DENY;
    const n=nodes.get(r.hsn);
    if(r.sourceSha256!==s.sourceSha256||r.outputSha256!==s.outputSha256||r.recordSha256!==n.recordSha256||
        r.dependencySha256!==s.dependencySha256||r.rightsEpoch!==s.rightsEpoch)return DENY;
    const ticket=computeReviewTicket(r);
    if(r.ticketSha256!==ticket||ticketSet.has(ticket))return DENY;
    if(['PASS','FAIL'].includes(r.status)&&!isDigest(r.evidenceSha256))return DENY;
    if(!['PASS','FAIL'].includes(r.status)&&r.evidenceSha256!==null)return DENY;
    if(r.status==='N_A'?!NAREASONS.includes(r.naReason):r.naReason!==null)return DENY;
    seen.add(r.hsn);ticketSet.add(ticket);
    // Canonical zero-padded HSN coordinate maps to a unique validated slot.
    // Do not depend on untrusted input ordering or run an O(144*N) filter.
    const h=Number(r.hsn.slice(1,3)),sp=Number(r.hsn.slice(5,7)),nn=Number(r.hsn.slice(9,11));
    const ordinal=(h-1)*144+(sp-1)*12+(nn-1);
    rows[ordinal]=Object.freeze({hsn:r.hsn,house:r.hsn.slice(0,3),sphere:r.hsn.slice(0,7),role:n.role,
      status:r.status,recordSha256:n.recordSha256,ticketSha256:ticket,
      evidenceSha256:r.evidenceSha256,naReason:r.naReason});
  }
  const sorted=rows; // Fully covered by 1,728 unique validated HSN identities.
  const groups=[];const totals=Object.fromEntries(STATES.map(state=>[state,0]));
  for(let h=1;h<=12;h++)for(let sp=1;sp<=12;sp++){
    const id=`H${String(h).padStart(2,'0')}.S${String(sp).padStart(2,'0')}`;
    const part=sorted.slice((h-1)*144+(sp-1)*12,(h-1)*144+sp*12);
    if(part.length!==12)return DENY;
    const counts=Object.fromEntries(STATES.map(state=>[state,part.filter(x=>x.status===state).length]));
    for(const st of STATES)totals[st]+=counts[st];
    groups.push({sphere:id,house:id.slice(0,3),role:roleFor(id+'.N01'),counts,
      result:counts.FAIL>0?'FAIL':(counts.HOLD+counts.UNREVIEWED>0)?'HOLD':counts.N_A>0?'REVIEWED_WITH_N_A':'REPORTED_PASS_NOT_ATTESTED'});
  }
  const houses=Array.from({length:12},(_,i)=>{
    const house=`H${String(i+1).padStart(2,'0')}`,sub=groups.slice(i*12,(i+1)*12);
    const counts=Object.fromEntries(STATES.map(st=>[st,sub.reduce((n,x)=>n+x.counts[st],0)]));
    return {house,counts,result:counts.FAIL>0?'FAIL':counts.HOLD+counts.UNREVIEWED>0?'HOLD':counts.N_A>0?'REVIEWED_WITH_N_A':'REPORTED_PASS_NOT_ATTESTED'};
  });
  const result=totals.FAIL>0?'FAIL':totals.HOLD+totals.UNREVIEWED>0?'HOLD':totals.N_A>0?'REVIEWED_WITH_N_A':'REPORTED_PASS_NOT_ATTESTED';
  const sourceRoot=dig(sorted.map(x=>[x.hsn,x.recordSha256,x.ticketSha256,x.status,x.evidenceSha256,x.naReason]));
  const summary={schema:PORTFOLIO_SCHEMA,status:'SOURCE_ONLY_REPORT_NOT_HOST_ATTESTATION',result,
    originalAriadneSha256:s.sourceSha256,outputSha256:s.outputSha256,dependenciesSha256:s.dependencySha256,
    rightsRevision:s.rightsEpoch,nodes:1728,spheres:144,houses:12,counts:totals,sourceRoot,
    sphereSummaries:groups,houseSummaries:houses,
    independentlyAuthenticatedReviewers:0,actualResidentTurns:0,scienceAccepted:0,
    authorityEffect:'NONE',hostAuthenticated:false,workPosted:false,
    nextGate:'TRUSTED_PUBLISHER_READ_RETURN_CURRENT_RIGHTS_AND_INDEPENDENT_EVIDENCE'};
  const receipt=dig(summary);
  return Object.freeze({schema:PORTFOLIO_SCHEMA,status:'SOURCE_ONLY_REVIEW_ENVELOPE',
    receiptSha256:receipt,summary,sourceRows:sorted});
}
