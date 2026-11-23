/** R07 Civilization Circuit → existing Atlas ONE Work Burst, source-only.
 * Reads exact owner-supplied R07 plan BYTES, never posts to SwarmChat or copies
 * private source text into task receipts. No host, identity, or rights grant.
 * NEXT1728 software tasks, R07 MAG slots and Ariadne HSN addresses stay distinct.
 */
import {createHash} from 'node:crypto';
import {TextDecoder} from 'node:util';
import {executeLocalWorkBurst} from './work-burst.mjs';
import {getNodeRule} from '../generated/generated-node-routes.mjs';
import {validateStructuralRule} from './node-symbiosis.mjs';

export const R07_BRIDGE_SCHEMA='atlas.one.r07-workburst-source-bridge/v1';
export const R07_EDITION='Ariadne v0.7';
export const R07_REGISTRY_SHA='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
const SHA=/^[a-f0-9]{64}$/;
const COORD=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const MODES=new Set(['WORK','PLAY','SOCIAL','IMAGINE','DREAM','QUIET']);
const EXPECTED_FIELDS=Object.freeze([
  'acceptanceCandidate','actualEvidenceRefs','ariadneUpdate','atlasUpdate','candidateBuild',
  'canonEffect','completedMacroturns','coordinate','hostValidated','house','houseName',
  'humanWelfareMeasured','initiative','macroturnOpportunity','nextFalsifier','nodeName',
  'registrySha256','researchQuestion','residentAssigned','rightsGate','semanticLinkAccepted',
  'softwareModuleCandidate','sourceDigest','sourceEdition','sourceExperiment',
  'sourceFalsifier','sourceInitiative','sourceReference','sourceRole','sphere','sphereName',
  'status','suggestedMode','swarmchatUpdate'
]);
const FIELD_SET=new Set(EXPECTED_FIELDS);
const CHECK_TEXT=Object.freeze([
 'acceptanceCandidate','ariadneUpdate','atlasUpdate','candidateBuild','houseName','initiative',
 'nextFalsifier','nodeName','researchQuestion','softwareModuleCandidate','sourceExperiment',
 'sourceFalsifier','sphereName','swarmchatUpdate'
]);
const sha256=value=>createHash('sha256').update(value).digest('hex');
const hold=()=>Object.freeze({schema:R07_BRIDGE_SCHEMA,status:'HOLD_SOURCE_INPUT',
  reason:'EXACT_R07_SOURCE_SHAPE_OR_DIGEST_REQUIRED',authorityEffect:'NONE',
  hostVerified:false,canPublish:false,completedMacroturns:0,modelTurns:0});
const okFields=rec=>rec!==null&&typeof rec==='object'&&!Array.isArray(rec)
   &&Object.keys(rec).length===EXPECTED_FIELDS.length
   &&Object.keys(rec).every(key=>FIELD_SET.has(key))
   &&Object.getPrototypeOf(rec)===Object.prototype;
const wellFormedUnicode=value=>{
  for(let i=0;i<value.length;i++){
    const x=value.charCodeAt(i);
    if(x>=0xd800&&x<=0xdbff){const y=value.charCodeAt(++i);
      if(!(y>=0xdc00&&y<=0xdfff))return false;}
    else if(x>=0xdc00&&x<=0xdfff)return false;
  }
  return true;
};
const string=(value,max=1500)=>typeof value==='string'&&value.length>0&&value.length<=max
  &&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
  &&wellFormedUnicode(value);
const expectedCoord=i=>`H${String(Math.floor(i/144)+1).padStart(2,'0')}.S${String(Math.floor(i%144/12)+1).padStart(2,'0')}.N${String(i%12+1).padStart(2,'0')}`;
const expectedInitiative=(h,s)=>`N144-${h}-${s}`;

/** Parse and validate source shape; it does NOT verify rights, original Ariadne
 * registry bytes, semantics, or user-supplied expected digest provenance.
 * All useful output is a closed, source-ID-only review projection.
 */
export function inspectR07Source(raw,expectedDigest){
 try{
   if(typeof expectedDigest!=='string'||!SHA.test(expectedDigest))return hold();
   if(!(Buffer.isBuffer(raw)||raw instanceof Uint8Array||typeof raw==='string'))return hold();
   const bytes=typeof raw==='string'?Buffer.from(raw,'utf8'):Buffer.from(raw);
   if(bytes.length<1000||bytes.length>8_000_000||sha256(bytes)!==expectedDigest)return hold();
   const parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
   if(!Array.isArray(parsed)||parsed.length!==1728)return hold();
   const records=[],work=[],allModes={WORK:0,PROTECTED:0};
   let registered=0,registeredWork=0,registeredProtected=0,roleDomain=0,roleMeta=0;
   let sphereRole=null, sphereKey='';
   const houses=new Map();const spheres=new Map();
   for(let i=0;i<1728;i++){
     const rec=parsed[i];if(!okFields(rec))return hold();
     const coordinate=expectedCoord(i),m=COORD.exec(coordinate);
     const [h,s]=[m[1],m[2]],sphere=`H${h}.S${s}`;
     const role=Number(s)<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META';
     if(rec.coordinate!==coordinate||rec.macroturnOpportunity!==i+1
       ||rec.house!==`H${h}`||rec.sphere!==sphere
       ||rec.sourceInitiative!==expectedInitiative(h,s)
       ||rec.sourceRole!==role
       ||rec.sourceEdition!==R07_EDITION||rec.registrySha256!==R07_REGISTRY_SHA
       ||typeof rec.sourceDigest!=='string'||!SHA.test(rec.sourceDigest)
       ||typeof rec.suggestedMode!=='string'||!MODES.has(rec.suggestedMode)
       ||rec.status!=='PLANNED_NOT_EXECUTED'||rec.completedMacroturns!==0
       ||!Array.isArray(rec.actualEvidenceRefs)||rec.actualEvidenceRefs.length!==0
       ||rec.residentAssigned!==false||rec.hostValidated!==false
       ||rec.semanticLinkAccepted!==false||rec.humanWelfareMeasured!==false
       ||rec.canonEffect!=='NONE'
       ||rec.rightsGate!=='CURRENT_READ_AND_RETURN_CONSENT_REQUIRED'
       ||rec.sourceReference!=='OWNER_PRIVATE_SOURCE_POINTER_NOT_PUBLISHED'
       ||CHECK_TEXT.some(key=>!string(rec[key])))return hold();
     if(sphereKey!==sphere){sphereKey=sphere;sphereRole=role;}
     if(sphereRole!==role)return hold();
     const priorHouse=houses.get(`H${h}`);if(priorHouse&&priorHouse!==rec.houseName)return hold();
     houses.set(`H${h}`,rec.houseName);
     const priorSphere=spheres.get(sphere);if(priorSphere&&priorSphere!==rec.sphereName)return hold();
     spheres.set(sphere,rec.sphereName);
     if(role==='DOMAIN_SPECIALIZATION')roleDomain++;else roleMeta++;
     const route=getNodeRule(coordinate);
     if(route!==null){
       if(!validateStructuralRule(route)||route.sourceEdition!=='synthetic-hsn-v1'
         ||route.authorityEffect!=='NONE'||route.hostAuthenticated!==false
         ||route.semanticMappingApproved!==false)return hold();
       registered++;
       if(rec.suggestedMode==='WORK')registeredWork++;else registeredProtected++;
     }
     const projection=Object.freeze({coordinate,macroturnOpportunity:i+1,
       house:`H${h}`,sphere,role,mode:rec.suggestedMode,
       sourceDigest:rec.sourceDigest,sourceInitiative:rec.sourceInitiative,
       syntheticRoutePresent:route!==null});
     records.push(projection);
     if(rec.suggestedMode==='WORK'){work.push(projection);allModes.WORK++;}
     else allModes.PROTECTED++;
   }
   if(houses.size!==12||spheres.size!==144||roleDomain!==1008||roleMeta!==720)return hold();
   const summary=Object.freeze({schema:R07_BRIDGE_SCHEMA,status:'LOCAL_SOURCE_SHAPE_VERIFIED_NOT_AUTHORIZED',
     sourcePlanSha256:expectedDigest,sourceEdition:R07_EDITION,registrySha256:R07_REGISTRY_SHA,
     totalPlanned:1728,workEligible:allModes.WORK,protectedModeOpportunities:allModes.PROTECTED,
     domainNodes:roleDomain,epistemicNodes:roleMeta,houses:houses.size,spheres:spheres.size,
     syntheticCodeRoutesRegistered:registered,syntheticRoutesOnWorkCandidates:registeredWork,
     syntheticRoutesOnProtectedCandidates:registeredProtected,
     sourceRouteEditionCompatible:0,implementedR07Tasks:0,actualMacroturns:0,
     modelTurns:0,hostVerified:false,canPublish:false,authorityEffect:'NONE',
     note:'R07 proposal digests and synthetic node-route digests are distinct namespaces.'});
   /** Work-page closure must not depend on spoofable receiver/this. */
   const workPage=(offset=0,size=96)=>{
       if(!Number.isSafeInteger(offset)||offset<0||offset>work.length
         ||!Number.isSafeInteger(size)||size<1||size>96)return hold();
       const items=work.slice(offset,offset+size);
       return Object.freeze({status:'PREPARED_WORK_ONLY',nextOffset:offset+items.length,
         totalWork:work.length,exhausted:offset+items.length===work.length,
         tasks:items.map(x=>Object.freeze({id:'r07'+x.coordinate.replaceAll('.','').toLowerCase(),
           operator:'LOCAL_R07_PIN',mode:'WORK',resourceKey:x.sphere,
           input:{coordinate:x.coordinate,opportunity:x.macroturnOpportunity,
             sourceDigest:x.sourceDigest,sourceEdition:R07_EDITION,
             sourcePlanSha256:expectedDigest,
             syntheticCodeRoutePresent:x.syntheticRoutePresent},
           evidenceRefs:['synthetic:r07-source-plan-pin'],noHarvest:false}))});
   };
   const previewWorkPage=async(offset=0,size=96)=>{
       const page=workPage(offset,size);
       if(page.status!=='PREPARED_WORK_ONLY')return hold();
       if(!page.tasks.length)return Object.freeze({status:'LOCAL_SOURCE_PINS_ONLY',
         count:0,receiptDigest:null,nextOffset:page.nextOffset,
         completedMacroturns:0,authorityEffect:'NONE',hostVerified:false});
       const index=new Map(work.map(x=>[x.coordinate,x]));
       const result=await executeLocalWorkBurst({tasks:page.tasks,maxParallel:8,
         operators:{LOCAL_R07_PIN:async x=>{
           const expected=index.get(x.coordinate);
           const passed=!!expected&&x.opportunity===expected.macroturnOpportunity
             &&x.sourceDigest===expected.sourceDigest
             &&x.sourceEdition===R07_EDITION
             &&x.sourcePlanSha256===expectedDigest
             &&x.syntheticCodeRoutePresent===expected.syntheticRoutePresent;
           return {status:passed?'PASS_LOCAL':'HOLD_LOCAL',resultTag:'SOURCE_PIN',checks:passed?1:0};
         }}});
       return Object.freeze({status:result.status==='LOCAL_COMPLETE'
         ?'LOCAL_SOURCE_PINS_ONLY':'HOLD_SOURCE_PIN_REVIEW',count:result.counts?.passed??0,
         receiptDigest:result.receiptDigest??null,nextOffset:page.nextOffset,
         completedMacroturns:0,hostVerified:false,canPublish:false,authorityEffect:'NONE',
         actualBrokerPosts:0,modelTurns:0});
   };

   /** A self-reported implementation receipt is never automatically verified.
    * Git HEAD, CI, independent review and rights remain separate host duties.
    * The full R07 source texts do not appear in the receipt.
    */
   const prepareImplementationReceipt=claim=>{
     try{
       if(claim===null||typeof claim!=='object'||Array.isArray(claim)
         ||Object.getPrototypeOf(claim)!==Object.prototype)return hold();
       const descriptors=Object.getOwnPropertyDescriptors(claim);
       const allowed=['coordinate','sourceDigest','planSha256','mode','repo','commitSha','testsPassed','claimedStage'];
       if(Object.keys(descriptors).length!==allowed.length
         ||Object.keys(descriptors).some(k=>!allowed.includes(k)||!Object.hasOwn(descriptors[k],'value')))return hold();
       const v=Object.fromEntries(Object.keys(descriptors).map(k=>[k,descriptors[k].value]));
       const source=work.find(row=>row.coordinate===v.coordinate);
       if(!source||v.sourceDigest!==source.sourceDigest||v.planSha256!==expectedDigest
         ||v.mode!=='WORK'||typeof v.repo!=='string'
         ||!/^atlaslattice\/[A-Za-z0-9._-]{2,100}$/.test(v.repo)
         ||typeof v.commitSha!=='string'||!/^([a-f0-9]{40})$/.test(v.commitSha)
         ||!Number.isSafeInteger(v.testsPassed)||v.testsPassed<0||v.testsPassed>10000
         ||!['LOCAL_TEST_CLAIM','DRAFT_COMMIT_CLAIM'].includes(v.claimedStage))return hold();
       const fingerprint=sha256(JSON.stringify({coordinate:source.coordinate,
         sourceDigest:source.sourceDigest,planSha256:expectedDigest,
         repo:v.repo,commitSha:v.commitSha,testsPassed:v.testsPassed,claimedStage:v.claimedStage}));
       return Object.freeze({schema:R07_BRIDGE_SCHEMA,status:'EVIDENCE_RECEIPT_CANDIDATE_NOT_VERIFIED',
         coordinate:source.coordinate,sourceDigest:source.sourceDigest,
         sourcePlanSha256:expectedDigest,claimedStage:v.claimedStage,
         proposedGitCommit:`https://github.com/${v.repo}/commit/${v.commitSha}`,
         sourceReportedTestsPassed:v.testsPassed,receiptFingerprint:fingerprint,
         originalR07Status:'PLANNED_NOT_EXECUTED',implemented:false,
         independentlyReviewed:false,hostVerified:false,rightsVerified:false,
         canPublish:false,authorityEffect:'NONE',actualWorkPosts:0});
     }catch{return hold();}
   };
   return Object.freeze({status:summary.status,summary,workPage,previewWorkPage,prepareImplementationReceipt});
 }catch{return hold();}
}

/** The exact batch cursor is Work-only; protected activities are NEVER listed. */
export async function previewEntireR07(raw,expectedDigest){
 const bridge=inspectR07Source(raw,expectedDigest);
 if(!bridge.summary)return hold();
 let cursor=0,checks=0;const pages=[];
 do{
   const result=await bridge.previewWorkPage(cursor,96);
   if(result.status!=='LOCAL_SOURCE_PINS_ONLY'||result.count<1)return hold();
   cursor=result.nextOffset;checks+=result.count;
   pages.push(Object.freeze({index:pages.length+1,count:result.count,
     receiptDigest:result.receiptDigest,nextOffset:cursor}));
 }while(cursor<bridge.summary.workEligible);
 const auditDigest=sha256(JSON.stringify(pages));
 return Object.freeze({schema:R07_BRIDGE_SCHEMA,status:'LOCAL_R07_SOURCE_PREFLIGHT_ONLY',
   planSha256:expectedDigest,houses:12,spheres:144,total:1728,
   workModeCandidates:bridge.summary.workEligible,
   protectedModeCandidates:bridge.summary.protectedModeOpportunities,
   syntheticCodeRoutes:bridge.summary.syntheticCodeRoutesRegistered,
   syntheticRouteWorkOverlap:bridge.summary.syntheticRoutesOnWorkCandidates,
   syntheticRouteProtectedOverlap:bridge.summary.syntheticRoutesOnProtectedCandidates,
   preflightChecks:checks,workBurstInvocations:pages.length,preflightReceiptDigest:auditDigest,
   pages,actualImplementedTasks:0,actualR07Macroturns:0,hostAuthenticated:false,
   sourceSemanticsReviewed:false,canPublish:false,canonEffect:'NONE',authorityEffect:'NONE',
   privateBodyCopies:0,workPosts:0,modelWakes:0});
}
