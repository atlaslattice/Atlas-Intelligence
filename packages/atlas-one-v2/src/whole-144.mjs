/**
 * Atlas ONE v2 / SwarmChat: WHOLE 144 x12 structural Work improvement program.
 * One proposal per H/S planning address; twelve non-claimed H/S/N review slots each.
 * NOT 144 installed features, 1,728 gains, verified source semantics, or a host scheduler.
 * Rights and source editions live in the already-existing Atlas ONE v2 core/host.
 */
import {createHash} from 'node:crypto';
import {HOUSE_NAMES,ARIADNE_V07_SHA256} from './civilizational-contract.mjs';
import {WHOLE_144_CANDIDATES} from './whole-144-catalog.mjs';

export const WHOLE_144_SCHEMA='atlas.one.whole-144-candidate-program/v1';
const SHA=/^[0-9a-f]{64}$/;
const HSN=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const HS=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])$/;
const ID=/^W144-H(0[1-9]|1[0-2])-S(0[1-9]|1[0-2])$/;
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const fail=(reason)=>Object.freeze({schema:WHOLE_144_SCHEMA,status:'HOLD',reason,hostAuthenticated:false,rightsVerified:false,canonEffect:'NONE',canPublish:false,verifiedGains:0});
const house=i=>'H'+String(i).padStart(2,'0');
const sphere=(h,s)=>`${house(h)}.S${String(s).padStart(2,'0')}`;
const node=(h,s,n)=>`${sphere(h,s)}.N${String(n).padStart(2,'0')}`;
const sha=x=>createHash('sha256').update(x).digest('hex');
const digest=x=>sha(JSON.stringify(x));
const noExtra=(obj,keys)=>Object.keys(obj).every(k=>keys.includes(k));
const validRef=v=>typeof v==='string'&&v.length>=5&&v.length<=300&& !/[\u0000-\u001f]/.test(v);

/** No new canonical sphere definitions are invented here. H/S is a positional
 * *proposal* until the original private registry maps it semantically.
 */
export function buildWhole144Program(options={}){
  if(!plain(options)||!noExtra(options,['sourceEdition','sourceDigest']))return fail('INPUT_SHAPE_INVALID');
  const {sourceEdition='v0.7',sourceDigest=ARIADNE_V07_SHA256}=options;
  if(sourceEdition!=='v0.7'||sourceDigest!==ARIADNE_V07_SHA256)return fail('SOURCE_EDITION_OR_DIGEST_MISMATCH');
  if(HOUSE_NAMES.length!==12||WHOLE_144_CANDIDATES.length!==144)return fail('CATALOG_CARDINALITY_INVALID');
  const tasks=[],allNodes=new Set(),titles=new Set();
  for(let i=0;i<144;i++){
    const raw=WHOLE_144_CANDIDATES[i],h=Math.floor(i/12)+1,s=i%12+1;
    if(!plain(raw)||!noExtra(raw,['id','house','sphere','houseName','title','acceptance','touchpoints','status'])
      ||raw.id!==`W144-H${String(h).padStart(2,'0')}-S${String(s).padStart(2,'0')}`
      ||raw.house!==house(h)||raw.sphere!==sphere(h,s)||raw.houseName!==HOUSE_NAMES[h-1]
      ||typeof raw.title!=='string'||raw.title.length<14||titles.has(raw.title)
      ||typeof raw.acceptance!=='string'||raw.acceptance.length<20
      ||raw.status!=='PROPOSED_NOT_IMPLEMENTED'
      ||JSON.stringify(raw.touchpoints)!==JSON.stringify(['Atlas ONE','SwarmChat']))return fail('CATALOG_SOURCE_OR_UNIQUENESS_INVALID');
    titles.add(raw.title);
    const nodeSlots=Array.from({length:12},(_,n)=>node(h,s,n+1));
    nodeSlots.forEach(n=>allNodes.add(n));
    tasks.push(Object.freeze({id:raw.id,proposedPosition:raw.sphere,house:raw.house,
      houseName:raw.houseName,title:raw.title,acceptance:raw.acceptance,
      touchpoints:Object.freeze([...raw.touchpoints]),nodeSlots:Object.freeze(nodeSlots),
      sourceSemanticMatch:'UNMAPPED',implementation:'NOT_STARTED',
      nodeEvidence:'NOT_RECEIVED',authorityEffect:'NONE'}));
  }
  if(titles.size!==144||allNodes.size!==1728)return fail('CANDIDATE_SLOT_COLLISION');
  const values={schema:WHOLE_144_SCHEMA,status:'STRUCTURAL_CANDIDATE_ONLY',
    sourceEdition,sourceDigest,sourceOriginalBytesVerified:false,
    sphereSemanticsVerified:false,mode:'WORK',privateModesImported:0,
    candidateCount:144,nodeReviewSlotCount:1728,
    verifiedImplementedFeatures:0,verifiedNodeGains:0,actualResidentAssignments:0,
    humanWelfareImpact:'NOT_MEASURED',hostedVerified:false,canPublish:false,
    canonEffect:'NONE',authorityEffect:'NONE',
    tasks:Object.freeze(tasks)};
  return Object.freeze({...values,programDigest:digest(values)});
}

/** Regenerate from frozen catalogue; do not believe caller-provided claimed counts. */
export function validateWhole144Program(program){
  if(!plain(program)||program.status!=='STRUCTURAL_CANDIDATE_ONLY'||!SHA.test(program.programDigest||''))return fail('PROGRAM_SHAPE_INVALID');
  const expected=buildWhole144Program({sourceEdition:program.sourceEdition,sourceDigest:program.sourceDigest});
  if(expected.status!=='STRUCTURAL_CANDIDATE_ONLY')return fail('PROGRAM_SOURCE_INVALID');
  if(JSON.stringify(program)!==JSON.stringify(expected))return fail('PROGRAM_TAMPERED_OR_STALE');
  return Object.freeze({schema:WHOLE_144_SCHEMA,status:'STRUCTURAL_VALID',
    programDigest:expected.programDigest,checkedCandidates:144,checkedNodeSlots:1728,
    verifiedGains:0,hostedVerified:false,canonEffect:'NONE',authorityEffect:'NONE'});
}

/** Work-only simulation, not feature implementation or independent evidence. */
export function locallyCheckWhole144(program){
  const checked=validateWhole144Program(program);
  if(checked.status!=='STRUCTURAL_VALID')return checked;
  const perHouse=[];let observedSlots=0;
  for(let h=1;h<=12;h++){
    const slice=program.tasks.slice((h-1)*12,h*12);
    if(slice.length!==12||slice.some((t,s)=>t.proposedPosition!==sphere(h,s+1)
      ||t.nodeSlots.length!==12||t.nodeSlots.some((n,i)=>n!==node(h,s+1,i+1))))return fail('HOUSE_NODE_COVERAGE_INVALID');
    observedSlots+=slice.reduce((sum,t)=>sum+t.nodeSlots.length,0);
    perHouse.push(Object.freeze({house:house(h),structuralChecksPassed:12,nodeAddressesChecked:144,
      checksType:'SYNTHETIC_COVERAGE_ONLY',implementedImprovements:0}));
  }
  return Object.freeze({schema:'atlas.one.whole-144-local-structural-receipt/v1',
    status:'LOCAL_STRUCTURE_PASS',programDigest:program.programDigest,
    candidateChecks:144,nodeAddressChecks:observedSlots,
    houseChecks:Object.freeze(perHouse),verifiedGains:0,realPeerReplies:0,
    hostRights:'NOT_VERIFIED',hostedVerified:false,canPublish:false,canonEffect:'NONE',
    receiptDigest:digest({programDigest:program.programDigest,candidates:144,nodes:observedSlots,perHouse})});
}

/** Source-only adapter to existing PR #19 bounded work-burst; no second runner. */
export function prepareWhole144WorkBursts(program){
  const checked=validateWhole144Program(program);
  if(checked.status!=='STRUCTURAL_VALID')return checked;
  return Object.freeze({schema:'atlas.one.whole-144-burst-plan/v1',status:'PREPARED_LOCAL_ONLY',
    programDigest:program.programDigest,maxTasksPerBurst:12,localOnly:true,
    batches:Object.freeze(Array.from({length:12},(_,hi)=>Object.freeze(program.tasks.slice(hi*12,hi*12+12).map(t=>({
      id:t.proposedPosition.toLowerCase().replace('.','-'),operator:'LOCAL_VERIFY_HSN_CANDIDATE',mode:'WORK',
      input:{candidateId:t.id,position:t.proposedPosition,programDigest:program.programDigest,nodeCount:12},
      evidenceRefs:['synthetic:whole144-structural-plan'],dependsOn:[]
    }))))),
    runPermission:'LOCAL_OPERATOR_ONLY',externalEffects:'NOT_AUTHORIZED',
    hostedVerified:false,canPublish:false,canonEffect:'NONE'});
}

/** An operator to hand to the existing work-burst package on trusted local input.
 * PASS_LOCAL proves only positional topology, not implementation or impact.
 */
export function checkWhole144BurstItem(program,input){
  if(validateWhole144Program(program).status!=='STRUCTURAL_VALID')
    return {status:'HOLD_LOCAL',resultTag:'HELD'};
  if(!plain(input)||!noExtra(input,['candidateId','position','programDigest','nodeCount'])
    ||input.programDigest!==program.programDigest||!ID.test(input.candidateId||'')
    ||!HS.test(input.position||'')||input.nodeCount!==12)
    return {status:'HOLD_LOCAL',resultTag:'HELD'};
  const selected=program.tasks.find(t=>t.id===input.candidateId);
  return selected&&selected.proposedPosition===input.position
    ?{status:'PASS_LOCAL',resultTag:'STRUCTURE',checks:12}
    :{status:'HOLD_LOCAL',resultTag:'HELD'};
}

/** Accept evidence for a *candidate* without mistaking it for trusted host grant.
 * No scoring, no auto promotion, no data from private modes, no signed-self-review.
 */
export function proposeNodeEvidence(program,claim={}){
  if(validateWhole144Program(program).status!=='STRUCTURAL_VALID')return fail('PROGRAM_NOT_VALID');
  if(!plain(claim)||!noExtra(claim,['candidateId','nodeCoordinate','mode','codeDigest','testDigest','sourceRefs','dissentRefs']))return fail('EVIDENCE_SHAPE_OR_PRIVATE_FIELD_INVALID');
  if(claim.mode!=='WORK')return fail('PRIVATE_OR_NONWORK_SOURCE_DENIED');
  if(!ID.test(claim.candidateId||'')||!HSN.test(claim.nodeCoordinate||'')
    ||!SHA.test(claim.codeDigest||'')||!SHA.test(claim.testDigest||'')
    ||!Array.isArray(claim.sourceRefs)||claim.sourceRefs.length===0||claim.sourceRefs.length>12||!claim.sourceRefs.every(validRef)
    ||claim.dissentRefs!==undefined&&(!Array.isArray(claim.dissentRefs)||claim.dissentRefs.length>12||!claim.dissentRefs.every(validRef)))
    return fail('EVIDENCE_INVALID');
  const task=program.tasks.find(x=>x.id===claim.candidateId);
  if(!task||!task.nodeSlots.includes(claim.nodeCoordinate))return fail('CROSS_POSITION_NODE_MISMATCH');
  const evidence={schema:'atlas.one.whole-144-node-evidence/v1',status:'SOURCE_AND_TEST_CANDIDATE_REVIEW_REQUIRED',
    candidateId:claim.candidateId,nodeCoordinate:claim.nodeCoordinate,sourceEdition:program.sourceEdition,
    programDigest:program.programDigest,codeDigest:claim.codeDigest,testDigest:claim.testDigest,
    sourceRefs:[...claim.sourceRefs],dissentRefs:[...(claim.dissentRefs??[])],
    privateModesImported:0,sourceNodeSemantics:'UNREVIEWED',testExecution:'CALLER_REPORTED',
    hostRights:'NOT_ATTESTED',independentReview:'NOT_PERFORMED',verifiedGain:false,
    canPublish:false,canonEffect:'NONE',authorityEffect:'NONE'};
  return Object.freeze({...evidence,evidenceDigest:digest(evidence)});
}
