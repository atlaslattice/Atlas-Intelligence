/** Atlas ONE v2 - evidence-first cascading LOCAL regression evolution.
 * This is a pure synthetic test generator and local Work Burst client.
 * It does NOT perform AI turns, broker posts, permissions, CANON, or private-mode work.
 * Each step adds one new unique negative+positive control and reruns EVERY prior control.
 */
import {createHash} from 'node:crypto';
import {executeLocalWorkBurst} from './work-burst.mjs';

export const CASCADE_SCHEMA='atlas.one.cascade-source-only/v1';
export const STAGE1=100, STAGE2=1000, TOTAL=STAGE1+STAGE2;
export const GENESIS=createHash('sha256').update('ATLAS_ONE_CASCADE_GENESIS_V1').digest('hex');
export const FAMILIES=Object.freeze([
  'TENANT','PRINCIPAL','ROOM','MODE','PURPOSE','EDITION','DIGEST','RIGHTS_READ',
  'RIGHTS_RETURN','CONSENT','NO_HARVEST','CANON','DEPLOY','RAW_BODY','REPLAY','EPOCH',
]);
const deny=()=>({status:'HOLD',reason:'SOURCE_SCOPE_NOT_ACCEPTED',authorityEffect:'NONE',
  canExecute:false,canPublish:false,workPosted:false,hostAttested:false});
const prepared=()=>({status:'PREPARED_LOCAL_ONLY',reason:'SYNTHETIC_SOURCE_SHAPE_ONLY',
  authorityEffect:'NONE',canExecute:false,canPublish:false,workPosted:false,hostAttested:false});
const hash=v=>createHash('sha256').update(v).digest('hex');
const canonical=x=>{
  if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';
  if(x!==null&&typeof x==='object')return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
  if(x===null||typeof x==='string'||typeof x==='boolean'||typeof x==='number'&&Number.isFinite(x))return JSON.stringify(x);
  throw new TypeError('NON_JSON_SCENARIO');
};
const COORD=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const HEX=/^[a-f0-9]{64}$/;
const keys=new Set(['tenant','principal','room','mode','purpose','coordinate','sourceEdition',
  'sourceDigest','rightsRead','rightsReturn','consent','noHarvest','canon','deployment',
  'rawBody','replayCount','epoch']);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)
  &&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const sourceHash=coordinate=>hash('synthetic-hsn-source-v1:'+coordinate);

function syntheticPositive(coordinate){
  return {tenant:'synthetic-atlas',principal:'selfdeclared-test-only',room:'synthetic-work-room',
    mode:'WORK',purpose:'REVIEW_ONLY',coordinate,sourceEdition:'synthetic-hsn-v1',
    sourceDigest:sourceHash(coordinate),rightsRead:'HOST_NOT_CHECKED',
    rightsReturn:'HOST_NOT_CHECKED',consent:'NO_RELEASE_GRANT',noHarvest:false,
    canon:false,deployment:false,rawBody:null,replayCount:0,epoch:0};
}
const fault={
 TENANT:x=>x.tenant='other-tenant',
 PRINCIPAL:x=>x.principal='forged-authority',
 ROOM:x=>x.room='other-room',
 MODE:x=>x.mode='PALACE',
 PURPOSE:x=>x.purpose='PUBLISH',
 EDITION:x=>x.sourceEdition='another-edition',
 DIGEST:x=>x.sourceDigest='f'.repeat(64),
 RIGHTS_READ:x=>x.rightsRead='REVOKED',
 RIGHTS_RETURN:x=>x.rightsReturn='REVOKED',
 CONSENT:x=>x.consent='CLAIMED_BY_CALLER',
 NO_HARVEST:x=>x.noHarvest=true,
 CANON:x=>x.canon=true,
 DEPLOY:x=>x.deployment=true,
 RAW_BODY:x=>x.rawBody='SYNTHETIC_DO_NOT_COPY',
 REPLAY:x=>x.replayCount=1,
 EPOCH:x=>x.epoch=1,
};
const guards={
 TENANT:x=>x.tenant==='synthetic-atlas',
 PRINCIPAL:x=>x.principal==='selfdeclared-test-only',
 ROOM:x=>x.room==='synthetic-work-room',
 MODE:x=>x.mode==='WORK',
 PURPOSE:x=>x.purpose==='REVIEW_ONLY',
 EDITION:x=>x.sourceEdition==='synthetic-hsn-v1',
 DIGEST:x=>typeof x.sourceDigest==='string'&&HEX.test(x.sourceDigest)
  &&x.sourceDigest===sourceHash(x.coordinate),
 RIGHTS_READ:x=>x.rightsRead==='HOST_NOT_CHECKED',
 RIGHTS_RETURN:x=>x.rightsReturn==='HOST_NOT_CHECKED',
 CONSENT:x=>x.consent==='NO_RELEASE_GRANT',
 NO_HARVEST:x=>x.noHarvest===false,
 CANON:x=>x.canon===false,
 DEPLOY:x=>x.deployment===false,
 RAW_BODY:x=>x.rawBody===null,
 REPLAY:x=>x.replayCount===0,
 EPOCH:x=>x.epoch===0,
};
function reviewInternal(candidate,mutant=null){
  if(!plain(candidate)||Object.keys(candidate).length!==keys.size
     ||Object.keys(candidate).some(k=>!keys.has(k))
     ||typeof candidate.coordinate!=='string'||!COORD.test(candidate.coordinate))return deny();
  for(const name of FAMILIES){
    if(name!==mutant && !guards[name](candidate))return deny();
  }
  return prepared(); // ALWAYS inert, never a release or hosted authorization.
}
export const reviewSyntheticCandidate=candidate=>{
  try{return reviewInternal(candidate);}catch{return deny();}
};
const invalid=(coordinate,family)=>{const x=syntheticPositive(coordinate);fault[family](x);return x;};

const coordinates=Object.freeze(Array.from({length:1728},(_,i)=>
  `H${String(Math.floor(i/144)+1).padStart(2,'0')}.S${String(Math.floor(i%144/12)+1).padStart(2,'0')}.N${String(i%12+1).padStart(2,'0')}`));
function pickNext(seen,previousHead){
  const houseCount=Array(13).fill(0),sphereCount=Array.from({length:13},()=>Array(13).fill(0));
  const nodeCount=Array.from({length:13},()=>Array(13).fill(0));
  for(const coordinate of seen){const h=+coordinate.slice(1,3),s=+coordinate.slice(5,7),n=+coordinate.slice(9,11);
    houseCount[h]++;sphereCount[h][s]++;nodeCount[h][n]++;}
  let best=null,score=null;
  const tieSeed=parseInt(previousHead.slice(0,8),16)>>>0;
  for(let i=0;i<coordinates.length;i++){
    const c=coordinates[i];if(seen.has(c))continue;
    const h=Math.floor(i/144)+1,s=Math.floor((i%144)/12)+1,n=i%12+1;
    const metric=[houseCount[h],sphereCount[h][s],nodeCount[h][n],(Math.imul(i+1,2654435761)^tieSeed)>>>0];
    if(score===null||metric.some((v,j)=>v!==score[j]&&metric.slice(0,j).every((x,k)=>x===score[k])&&v<score[j])){
      best=c;score=metric;
    }
  }
  if(best===null)throw new Error('COORDINATE_EXHAUSTION');
  return best;
}
const caseHash=(coordinate,family)=>hash(canonical({coordinate,family,sourceDigest:sourceHash(coordinate)}));
export function verifyCumulative(specs){
  try{
  if(!Array.isArray(specs))return {ok:false,checks:0};
  let checks=0;
  for(const s of specs){
    if(!s||typeof s.coordinate!=='string'||!COORD.test(s.coordinate)||!FAMILIES.includes(s.family))return {ok:false,checks};
    if(reviewSyntheticCandidate(syntheticPositive(s.coordinate)).status!=='PREPARED_LOCAL_ONLY')return {ok:false,checks};
    checks++;
    if(reviewSyntheticCandidate(invalid(s.coordinate,s.family)).status!=='HOLD')return {ok:false,checks};
    checks++;
  }
  return {ok:true,checks};
  }catch{return {ok:false,checks:0};}
}
export function verifyLedger(ledger){
  try{
  if(!Array.isArray(ledger)||ledger.length>TOTAL)return {ok:false,reason:'LEDGER_BOUNDS'};
  const ids=new Set();let previousHead=GENESIS;
  const expectedKeys=new Set(['seq','phase','coordinate','family','previousHead','caseHash',
    'cumulativeControls','burstDigest','status','authorityEffect','hostVerified',
    'brokerPosts','modelTurns','head']);
  for(let i=0;i<ledger.length;i++){
    const e=ledger[i];
    if(!plain(e)||Object.keys(e).length!==expectedKeys.size
      ||Object.keys(e).some(k=>!expectedKeys.has(k))
      ||e.seq!==i+1||e.previousHead!==previousHead
      ||typeof e.coordinate!=='string'||!COORD.test(e.coordinate)
      ||ids.has(e.coordinate)||e.coordinate!==pickNext(ids,previousHead)
      ||e.family!==FAMILIES[i%FAMILIES.length]
      ||e.caseHash!==caseHash(e.coordinate,e.family)
      ||e.phase!==(i<STAGE1?'PRIMARY_100':'DESCENDANT_1000')
      ||e.status!=='PASS_LOCAL'||e.authorityEffect!=='NONE'
      ||e.hostVerified!==false||e.brokerPosts!==0||e.modelTurns!==0
      ||e.cumulativeControls!==2*(i+1)
      ||typeof e.burstDigest!=='string'||!HEX.test(e.burstDigest))return {ok:false,reason:'LEDGER_ENTRY_INVALID',at:i};
    const {head,...body}=e;
    if(head!==hash(canonical(body)))return {ok:false,reason:'LEDGER_HASH_MISMATCH',at:i};
    previousHead=head;ids.add(e.coordinate);
  }
  return {ok:true,count:ledger.length,head:previousHead,distinctCoordinates:ids.size};
  }catch{return {ok:false,reason:'LEDGER_SOURCE_INVALID'};}
}
export function mutationCoverage(specs){
  const result={};
  for(const name of FAMILIES){
    const s=specs.find(x=>x.family===name);
    result[name]=Boolean(s && reviewInternal(invalid(s.coordinate,name),name).status==='PREPARED_LOCAL_ONLY');
  }
  return {killed:Object.values(result).filter(Boolean).length,total:FAMILIES.length,byGuard:result};
}

/** Resumable 100+1000 local structural evolution. Work Burst runs once per case.
 * Previous corpus is replayed at every step; no local PASS grants runtime authority.
 * Pre-existing ledger is verified before use; source rights must be proven elsewhere.
 */
export async function evolve({previous=[],steps=STAGE1}={}){
  if(!Array.isArray(previous)||!Number.isSafeInteger(steps)||steps<1
     ||previous.length+steps>TOTAL)return {status:'HOLD',reason:'CASCADE_BOUNDS',ledger:[]};
  const pre=verifyLedger(previous);
  if(!pre.ok)return {status:'HOLD',reason:'BAD_CHECKPOINT',ledger:[]};
  const ledger=[...previous];const seen=new Set(previous.map(x=>x.coordinate));
  const specs=previous.map(x=>({coordinate:x.coordinate,family:x.family}));
  let head=pre.head;
  for(let n=0;n<steps;n++){
    const seq=ledger.length+1,coordinate=pickNext(seen,head);
    const family=FAMILIES[(seq-1)%FAMILIES.length];
    specs.push({coordinate,family});
    const replay=verifyCumulative(specs);
    if(!replay.ok)return {status:'HOLD',reason:'CUMULATIVE_TEST_FAILED',ledger};
    const burst=await executeLocalWorkBurst({maxParallel:1,tasks:[{
      id:'evolution'+String(seq).padStart(4,'0'),operator:'LOCAL_CASCADE_TEST',mode:'WORK',
      resourceKey:'atlas-cascade-ledger',input:{coordinate,family,seq,previousHead:head,
        controls:replay.checks,caseHash:caseHash(coordinate,family)},
      evidenceRefs:['synthetic:atlas-one-cascade/v1']
    }],operators:{LOCAL_CASCADE_TEST:async ()=>({status:'PASS_LOCAL',resultTag:'CASCADE_VERIFIED',checks:replay.checks})}});
    if(burst.status!=='LOCAL_COMPLETE'||burst.counts.passed!==1||!HEX.test(burst.receiptDigest??''))
      return {status:'HOLD',reason:'BURST_VERIFICATION_FAILED',ledger};
    const body={seq,phase:seq<=STAGE1?'PRIMARY_100':'DESCENDANT_1000',coordinate,family,
      previousHead:head,caseHash:caseHash(coordinate,family),cumulativeControls:replay.checks,
      burstDigest:burst.receiptDigest,status:'PASS_LOCAL',authorityEffect:'NONE',
      hostVerified:false,brokerPosts:0,modelTurns:0};
    head=hash(canonical(body));
    ledger.push({...body,head});seen.add(coordinate);
  }
  const report=verifyLedger(ledger),mutants=mutationCoverage(specs);
  if(!report.ok || mutants.killed!==mutants.total)return {status:'HOLD',reason:'LEDGER_OR_MUTATION_FAILED',ledger};
  const houseCoverage=Object.fromEntries(Array.from({length:12},(_,i)=>{
    const h=`H${String(i+1).padStart(2,'0')}`;
    return [h,specs.filter(s=>s.coordinate.startsWith(h+'.')).length];
  }));
  return {schema:CASCADE_SCHEMA,status:'TESTED_LOCAL_SYNTHETIC_ONLY',
    firstHundredHead:ledger[99]?.head??null,head,stepsPerformed:steps,totalLocalSteps:ledger.length,
    cumulativeControlExecutions:ledger.length*(ledger.length+1),
    mutationCoverage:mutants,houseCoverage,ledger,
    hostedVerified:false,canPublish:false,actualPeerPosts:0,modelTurnsPerformed:0,
    voluntaryPrivateSlotsPerformed:0,canonEffect:'NONE'};
}
