/**
 * Atlas collaboration rules v3 — bounded, reproducible, source-only amendment review.
 * Additive to v2. No broker, IAM, scheduler, release authority or constitutional effect.
 * Inputs must be JSON-native data; Proxy objects are outside this local boundary.
 */
import {createHash} from 'node:crypto';
import {prepareCollaborativeWorkReview, readOnlyOntologyCoordinates} from '../../src/work-review-contract.mjs';

export const SCHEMA='atlas.collaboration.amendment-review/v3';
export const REQUIRED_FAMILIES=Object.freeze([
 'SOURCE_INTEGRITY','INFERENCE_USE','DISCLOSURE_RETURN','REVOCATION',
 'NONWORK_PRIVACY','HSN_IDENTITY','METHOD_SUBJECT','DISSENT',
 'TEST_REPRODUCIBILITY','ROLLBACK','AUTHORITY','RESOURCE_BUDGET'
]);
const SHA=/^[a-f0-9]{64}$/;
const CASE_ID=/^[a-z][a-z0-9_.-]{2,63}$/;
const HOLD=(reason)=>Object.freeze({schema:SCHEMA,status:'HOLD_REVIEW_ONLY',reason,hostVerified:false,
 canPost:false,canDeploy:false,canRatify:false,confirmedMacroturns:0,trainingPerformed:false});
const digest=x=>createHash('sha256').update(x).digest('hex');
const finite=(x)=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1e8;
const str=(s,max=500)=>typeof s==='string'&&s.length>0&&s.length<=max&&!/[\u0000-\u001f\u007f]/.test(s)&&!/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(s);
const plain=(o)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype;
const shape=(o,names)=>plain(o)&&Reflect.ownKeys(o).length===names.length&&names.every(n=>Object.hasOwn(o,n))&&Object.keys(o).every(k=>names.includes(k))&&
  Object.values(Object.getOwnPropertyDescriptors(o)).every(d=>Object.hasOwn(d,'value')&&d.enumerable);
const canonical=(x,depth=0)=>{
 if(depth>14)throw Error('DEPTH');
 if(x===null||typeof x==='boolean'||typeof x==='number'&&Number.isFinite(x)||typeof x==='string'){
   if(typeof x==='string'&&!str(x,2048))throw Error('STRING');return JSON.stringify(x);
 }
 if(Array.isArray(x)){
   if(Object.getPrototypeOf(x)!==Array.prototype||Object.keys(x).length!==x.length||x.length>2000)throw Error('ARRAY');
   const ds=Object.getOwnPropertyDescriptors(x);
   if(Object.values(ds).some(d=>!Object.hasOwn(d,'value')))throw Error('ACCESSOR');
   return '['+x.map(y=>canonical(y,depth+1)).join(',')+']';
 }
 if(!plain(x))throw Error('OBJECT');
 const ds=Object.getOwnPropertyDescriptors(x);
 if(Reflect.ownKeys(x).some(k=>typeof k!=='string')||Object.values(ds).some(d=>!Object.hasOwn(d,'value')||!d.enumerable))throw Error('ACCESSOR');
 return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(ds[k].value,depth+1)).join(',')+'}';
};
function checkedUrl(value){
 try{if(!str(value,500))return false;
  const u=new URL(value);
  if(u.protocol!=='https:'||u.username||u.password||!u.hostname||u.hash||u.port&&u.port!=='443')return false;
  if(/(?:password|token|secret|auth|api_key|access_key|signature|sig|code)/i.test([...u.searchParams.keys()].join(' ')))return false;
  return true;
 }catch{return false;}
}
const pct=(arr,q)=>{const a=[...arr].sort((x,y)=>x-y);return a[Math.ceil(q*a.length)-1];};

/**
 * REVIEW ONLY: all test verdicts and benchmark measurements are supplied by the
 * caller. It verifies coherence; it cannot prove that tests were actually run.
 */
export function compareRuleRevision(input){
 try{
  const top=['reviewInput','observedAt','baselineCodeSha256','candidateCodeSha256','cases','benchmark','dissent','revisionId'];
  if(!shape(input,top))return HOLD('INPUT_SHAPE');
  const bytes=canonical(input);
  if(Buffer.byteLength(bytes,'utf8')>256_000)return HOLD('INPUT_TOO_LARGE');
  const previous=prepareCollaborativeWorkReview(input.reviewInput);
  if(previous.status!=='PREPARED_NOT_POSTED')return HOLD('V2_REVIEW_NOT_PREPARED');
  if(!str(input.revisionId,90)||!CASE_ID.test(input.revisionId))return HOLD('REVISION_ID');
  if(!SHA.test(input.baselineCodeSha256)||!SHA.test(input.candidateCodeSha256))return HOLD('CODE_PIN');
  if(input.baselineCodeSha256===input.candidateCodeSha256)return HOLD('NO_SOURCE_DELTA');
  const t=Date.parse(input.observedAt),expiry=Date.parse(input.reviewInput.room.expiresAt);
  if(!str(input.observedAt,45)||!Number.isFinite(t)||!Number.isFinite(expiry)||t>=expiry)return HOLD('ROOM_EXPIRED_AT_OBSERVATION');
  if(!checkedUrl(input.reviewInput.source.sourceUrl))return HOLD('SOURCE_URL_UNSAFE');
  if(!Array.isArray(input.cases)||input.cases.length<24||input.cases.length>120)return HOLD('CASE_COUNT');
  const allowed=new Set(REQUIRED_FAMILIES), seen=new Set();
  const coverage=new Map(REQUIRED_FAMILIES.map(k=>[k,{positive:0,negative:0}]));
  let improvements=0,regressions=0,failures=0,holds=0;
  for(const c of input.cases){
   if(!shape(c,['id','family','role','sourceCaseSha256','baseline','candidate','receiptSha256']))return HOLD('CASE_SHAPE');
   if(!CASE_ID.test(c.id)||seen.has(c.id)||!allowed.has(c.family)||!['POSITIVE','NEGATIVE'].includes(c.role)
     ||!SHA.test(c.sourceCaseSha256)||!SHA.test(c.receiptSha256)
     ||!['PASS','FAIL','HOLD'].includes(c.baseline)||!['PASS','FAIL','HOLD'].includes(c.candidate))return HOLD('CASE_INVALID');
   seen.add(c.id);coverage.get(c.family)[c.role.toLowerCase()]++;
   if(c.baseline==='PASS'&&c.candidate!=='PASS')regressions++;
   if(c.baseline==='FAIL'&&c.candidate==='PASS')improvements++;
   if(c.candidate==='FAIL')failures++;
   if(c.candidate==='HOLD')holds++;
  }
  if([...coverage.values()].some(x=>x.positive<1||x.negative<1))return HOLD('INCOMPLETE_GUARD_COVERAGE');
  if(!Array.isArray(input.dissent)||input.dissent.length<1||input.dissent.length>20)return HOLD('DISSENT_REQUIRED');
  const dissent=new Set();let open=0;
  for(const d of input.dissent){
   if(!shape(d,['id','status','sourceUrl','sourceSha256','summary'])||!CASE_ID.test(d.id)||dissent.has(d.id)
     ||!['OPEN','RESOLVED_BY_ORIGINAL_OBJECTOR','WITHDRAWN_BY_ORIGINAL_OBJECTOR'].includes(d.status)
     ||!checkedUrl(d.sourceUrl)||!SHA.test(d.sourceSha256)||!str(d.summary,500))return HOLD('DISSENT_SHAPE');
   dissent.add(d.id);if(d.status==='OPEN')open++;
  }
  const b=input.benchmark;
  if(!shape(b,['mode','environmentSha256','workloadSha256','maxP95RegressionRatio','pairs']))return HOLD('BENCH_SHAPE');
  if(!['SYNTHETIC_TEST_ONLY','LOCAL_EXECUTED_MEASUREMENT'].includes(b.mode)
    ||!SHA.test(b.environmentSha256)||!SHA.test(b.workloadSha256)
    ||!finite(b.maxP95RegressionRatio)||b.maxP95RegressionRatio<1||b.maxP95RegressionRatio>2
    ||!Array.isArray(b.pairs)||b.pairs.length<7||b.pairs.length>100)return HOLD('BENCH_BOUNDS');
  const bp=[],cp=[];let outputDrift=0;
  for(const p of b.pairs){
   if(!shape(p,['scenarioSha256','baselineMs','candidateMs','baselineOutputSha256','candidateOutputSha256'])
     ||!SHA.test(p.scenarioSha256)||!SHA.test(p.baselineOutputSha256)||!SHA.test(p.candidateOutputSha256)
     ||!finite(p.baselineMs)||!finite(p.candidateMs))return HOLD('BENCH_SAMPLE');
   bp.push(p.baselineMs);cp.push(p.candidateMs);
   if(p.baselineOutputSha256!==p.candidateOutputSha256)outputDrift++;
  }
  const p50Before=pct(bp,.5),p50After=pct(cp,.5),p95Before=pct(bp,.95),p95After=pct(cp,.95);
  const breach=p95After>p95Before*b.maxP95RegressionRatio;
  // The caller's reported measurements are NOT independently attested.
  const out={schema:SCHEMA,revisionId:input.revisionId,sourceReviewDigest:previous.reviewDigest,
   sourceEdition:input.reviewInput.source.sourceEdition,sourceCodePins:{baseline:input.baselineCodeSha256,candidate:input.candidateCodeSha256},
   totals:{cases:input.cases.length,guardFamilies:coverage.size,improvements,regressions,failedCandidateCases:failures,heldCandidateCases:holds,openDissent:open},
   benchmark:{mode:b.mode,samples:bp.length,baselineP50Ms:p50Before,candidateP50Ms:p50After,baselineP95Ms:p95Before,candidateP95Ms:p95After,
    p95RegressionBreach:breach,pairedOutputDrift:outputDrift,measuredSpeedupVerified:false},
   reviewState:'PREPARED_NOT_ADOPTED',humanRatified:false,hostVerified:false,canPost:false,
   canDeploy:false,canRatify:false,completedMacroturns:0,trainingPerformed:false,sourceBodiesIncluded:false,
   warning:'Caller-supplied test and benchmark receipts need independent review; no host authority.'};
  const status=regressions||failures||outputDrift?'REJECT_LOCAL_REGRESSION':
   holds||breach?'HOLD_UNRESOLVED_CONTROLS':!improvements?'HOLD_NO_NEW_IMPROVEMENT':'LOCAL_REVIEW_CANDIDATE_ONLY';
  return Object.freeze({...out,status,evidenceDigest:digest(canonical(out))});
 }catch{return HOLD('INVALID_OR_UNTRUSTED_INPUT');}
}

export function structuralReviewMatrix(){
 const ids=readOnlyOntologyCoordinates();
 return Object.freeze({nodes:ids.length,spheres:144,houses:12,domainNodes:ids.filter(id=>Number(id.slice(5,7))<=7).length,
  epistemicMethodNodes:ids.filter(id=>Number(id.slice(5,7))>=8).length,
  sourceSemanticsVerified:false,macroturnsPerformed:0});
}
