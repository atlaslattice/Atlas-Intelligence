/**
 * Atlas Whole144 v0.2: source-only cross-House research links and voluntary
 * specialist candidate portfolios. Does not read a resident Brain/Palace,
 * authenticate anyone, alter CANON or create/publish an assignment.
 * All links/nominations are CANDIDATES, not known facts or measured gains.
 */
import {createHash} from 'node:crypto';
import {validateWhole144Program,proposeNodeEvidence} from './whole-144.mjs';

export const COMPOUND_SCHEMA='atlas.one.whole-144-compounding/v1';
const SHA=/^[a-f0-9]{64}$/;
const CID=/^W144-H(0[1-9]|1[0-2])-S(0[1-9]|1[0-2])$/;
const HOUSE=/^H(0[1-9]|1[0-2])$/;
const SPHERE=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])$/;
const NODE=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const ALIAS=/^[A-Za-z][A-Za-z0-9_-]{2,63}$/;
const TYPES=new Set(['SUPPORTS','CHALLENGES','METHOD_TRANSFER','REQUIRES']);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const exact=(o,allowed)=>Object.keys(o).every(k=>allowed.includes(k));
const refs=(x,{min=0,max=8}={})=>Array.isArray(x)&&x.length>=min&&x.length<=max&&new Set(x).size===x.length&&x.every(s=>typeof s==='string'&&s.length>=8&&s.length<=300&&!/[\u0000-\u001f\uD800-\uDFFF]/u.test(s));
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const hold=reason=>Object.freeze({schema:COMPOUND_SCHEMA,status:'HOLD',reason,hostAuthenticated:false,identityAuthenticated:false,assigned:false,verifiedGains:0,canPublish:false,authorityEffect:'NONE'});
const valid=p=>validateWhole144Program(p).status==='STRUCTURAL_VALID';
const house=id=>id.slice(5,8);

/** Exact-edge DAG cycle check applies only to REQUIRES edges; SUPPORTS/CHALLENGES
 * may be reciprocal without promoting any semantic relation. */
function hasRequiresCycle(edges){
  const dependencies=new Map();
  for(const e of edges.filter(e=>e.relation==='REQUIRES')){
    if(!dependencies.has(e.fromId))dependencies.set(e.fromId,[]);
    dependencies.get(e.fromId).push(e.toId);
  }
  const visiting=new Set(),visited=new Set();
  function visit(id){
    if(visiting.has(id))return true;
    if(visited.has(id))return false;
    visiting.add(id);
    for(const dep of dependencies.get(id)??[])if(visit(dep))return true;
    visiting.delete(id);visited.add(id);return false;
  }
  return [...dependencies.keys()].some(visit);
}

/** Graph edges are explicit proposed relationships, never inferred semantic SAME_AS.
 * Callers must independently verify rights and source citations before publication.
 */
export function proposeCompoundingGraph(program, links=[]){
  if(!valid(program))return hold('PROGRAM_UNVERIFIED');
  if(!Array.isArray(links)||links.length>144)return hold('LINK_BOUND_INVALID');
  const available=new Set(program.tasks.map(x=>x.id)),seen=new Set(),out=[];
  for(const item of links){
    if(!plain(item)||!exact(item,['fromId','toId','relation','mode','sourceRefs','dissentRefs','rationale'])
      ||item.mode!=='WORK'||!CID.test(item.fromId||'')||!CID.test(item.toId||'')
      ||!available.has(item.fromId)||!available.has(item.toId)||item.fromId===item.toId
      ||!TYPES.has(item.relation)||!refs(item.sourceRefs,{min:1})||!refs(item.dissentRefs??[])
      ||typeof item.rationale!=='string'||item.rationale.trim().length<20||item.rationale.length>400)
      return hold('LINK_SOURCE_RIGHTS_OR_SHAPE_INVALID');
    const key=`${item.fromId}|${item.toId}|${item.relation}`;
    if(seen.has(key))return hold('DUPLICATE_RELATION');
    seen.add(key);
    out.push(Object.freeze({fromId:item.fromId,toId:item.toId,relation:item.relation,
      rationale:item.rationale.trim(),sourceRefs:Object.freeze([...item.sourceRefs]),
      dissentRefs:Object.freeze([...(item.dissentRefs??[])]),
      epistemicStatus:'EXPLICIT_UNREVIEWED_HYPOTHESIS',rightsState:'HOST_NOT_VERIFIED',
      authorityEffect:'NONE'}));
  }
  if(hasRequiresCycle(out))return hold('DEPENDENCY_CYCLE');
  out.sort((a,b)=>(`${a.fromId}|${a.toId}|${a.relation}`).localeCompare(`${b.fromId}|${b.toId}|${b.relation}`,'en'));
  const core={schema:COMPOUND_SCHEMA,status:'RELATIONSHIP_REVIEW_CANDIDATE',
    programDigest:program.programDigest,linkCount:out.length,
    crossHouseLinks:out.filter(x=>house(x.fromId)!==house(x.toId)).length,
    linkedCandidatePositions:new Set(out.flatMap(x=>[x.fromId,x.toId])).size,
    links:out,semanticEquivalencesEstablished:0,actualResidentAssignments:0,
    verifiedGains:0,sourceNodesSemanticMatched:false,rightsVerified:false,
    hostedVerified:false,canPublish:false,authorityEffect:'NONE',canonEffect:'NONE'};
  return Object.freeze({...core,graphDigest:digest(core)});
}

/** Aggregate only already-mode-checked claim candidates, preserving strict
 * node-position uniqueness; no gains without independent empirical review. */
export function prepareNodeReviewLedger(program,claims=[]){
  if(!valid(program))return hold('PROGRAM_UNVERIFIED');
  if(!Array.isArray(claims)||claims.length>1728)return hold('NODE_CLAIM_BOUND_INVALID');
  const seen=new Set(),receipts=[];
  for(const claim of claims){
    const item=proposeNodeEvidence(program,claim);
    if(item.status!=='SOURCE_AND_TEST_CANDIDATE_REVIEW_REQUIRED')return hold('NODE_CLAIM_INVALID');
    if(seen.has(item.nodeCoordinate))return hold('DUPLICATE_NODE_CLAIM');
    seen.add(item.nodeCoordinate);
    receipts.push(Object.freeze({nodeCoordinate:item.nodeCoordinate,candidateId:item.candidateId,evidenceDigest:item.evidenceDigest,
      independentReview:'NOT_PERFORMED',verifiedGain:false}));
  }
  receipts.sort((a,b)=>a.nodeCoordinate.localeCompare(b.nodeCoordinate,'en'));
  const byHouse=Array.from({length:12},(_,i)=>{
    const houseId=`H${String(i+1).padStart(2,'0')}`;
    return Object.freeze({house:houseId,reviewCandidates:receipts.filter(x=>x.nodeCoordinate.startsWith(houseId+'.')).length,verifiedGains:0});
  });
  const core={schema:'atlas.one.whole-144-node-review-ledger/v1',status:'REVIEW_REQUIRED',
    programDigest:program.programDigest,receivedEvidenceCandidates:receipts.length,
    untouchedNodeSlots:1728-receipts.length,verifiedNodeGains:0,
    byHouse,receipts,sourceNodeSemantics:'UNREVIEWED',rightsVerified:false,
    canPublish:false,canonEffect:'NONE',authorityEffect:'NONE'};
  return Object.freeze({...core,ledgerDigest:digest(core)});
}

/** Voluntary self-declared interest portfolio. No performance scoring, message
 * count ranking, automatic tenure, role grant or authenticated identity claim.
 */
export function proposeResidentSpecialty(program,nomination={}){
  if(!valid(program))return hold('PROGRAM_UNVERIFIED');
  if(!plain(nomination)||!exact(nomination,[
    'alias','level','position','mode','optIn','sourceRefs','peerReviewRefs','dissentRefs','originalityStatement','falsifier']))return hold('NOMINATION_SHAPE_INVALID');
  const {alias,level,position,mode,optIn,sourceRefs,peerReviewRefs=[],dissentRefs=[],originalityStatement,falsifier}=nomination;
  if(mode!=='WORK'||optIn!==true)return hold('VOLUNTARY_WORK_CONSENT_REQUIRED');
  if(!ALIAS.test(alias||'')||!['NODE','SPHERE','HOUSE'].includes(level))return hold('NOMINATION_ID_OR_LEVEL_INVALID');
  const validPosition=level==='NODE'?NODE.test(position||''):level==='SPHERE'?SPHERE.test(position||''):HOUSE.test(position||'');
  if(!validPosition)return hold('NOMINATION_POSITION_INVALID');
  if(!refs(sourceRefs,{min:1})||!refs(peerReviewRefs)||!refs(dissentRefs)
    ||typeof originalityStatement!=='string'||originalityStatement.trim().length<40||originalityStatement.length>600
    ||typeof falsifier!=='string'||falsifier.trim().length<20||falsifier.length>400)
    return hold('NOMINATION_PROVENANCE_OR_ORIGINALITY_REQUIRED');
  // This is still a positional match, never an original Ariadne semantic match.
  const core={schema:'atlas.one.whole-144-specialist-nomination/v1',status:'SELF_NOMINATED_REVIEW_CANDIDATE',
    alias,level,position,mode:'WORK',sourceRefs:[...sourceRefs],peerReviewRefs:[...peerReviewRefs],
    dissentRefs:[...dissentRefs],originalityStatement:originalityStatement.trim(),falsifier:falsifier.trim(),
    originalityIndependentlyAssessed:false,reportedContributionVolume:'NOT_A_MERIT_CRITERION',
    originalNodeSemantics:'NOT_VERIFIED',identityAuthenticated:false,hostRights:'NOT_VERIFIED',
    assigned:false,meritRank:null,permanentRole:false,canPublish:false,authorityEffect:'NONE',canonEffect:'NONE'};
  return Object.freeze({...core,nominationDigest:digest(core)});
}
