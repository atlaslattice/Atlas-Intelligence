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

// Additive source-bound review ingress. The older positional APIs above retain
// their exact accepted fields and UNMAPPED semantics.
const PIN_FIELDS=['namespace','edition','nodeId','recordSha256','kind','registrySha256'];
const CANDIDATE_LINK_TYPES=new Set(['LEXICAL_CANDIDATE','REVIEW_CANDIDATE']);
const PROJECT_CONTEXTS=new Set(['GENERAL_WORK_REVIEW','IRON_EMPIRE_FICTION']);
const PIN_NAMESPACE=/^[A-Za-z][A-Za-z0-9._:/-]{2,95}$/;
function dataRecord(value,allowed){
  if(!plain(value))return null;
  const desc=Object.getOwnPropertyDescriptors(value),out=Object.create(null);
  for(const key of Reflect.ownKeys(desc)){
    if(typeof key!=='string'||!allowed.includes(key)||!('value' in desc[key]))return null;
    out[key]=desc[key].value;
  }
  return out;
}
function denseArray(value,max){
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)return null;
  const desc=Object.getOwnPropertyDescriptors(value),n=desc.length?.value;
  if(!Number.isSafeInteger(n)||n<0||n>max||Reflect.ownKeys(desc).length!==n+1)return null;
  const out=[];
  for(let i=0;i<n;i++){
    const d=desc[String(i)];
    if(!d||!('value' in d))return null;
    out.push(d.value);
  }
  return out;
}
function pinKey(pin){return JSON.stringify(PIN_FIELDS.map(key=>pin[key]));}
function nodePin(value,indexPin,allowLabel=false){
  const p=dataRecord(value,allowLabel?[...PIN_FIELDS,'label']:PIN_FIELDS);
  if(!p||typeof p.namespace!=='string'||!PIN_NAMESPACE.test(p.namespace)||
    p.namespace!==indexPin.namespace||p.edition!==indexPin.edition||
    p.registrySha256!==indexPin.registrySha256||typeof p.nodeId!=='string'||
    !NODE.test(p.nodeId)||typeof p.recordSha256!=='string'||!SHA.test(p.recordSha256))return null;
  const expectedKind=Number(p.nodeId.slice(5,7))<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META';
  if(p.kind!==expectedKind)return null;
  if(allowLabel&&p.label!==undefined&&(typeof p.label!=='string'||p.label.length>300||
      /[\u0000-\u001f\uD800-\uDFFF]/u.test(p.label)))return null;
  return Object.freeze(Object.fromEntries(PIN_FIELDS.map(key=>[key,p[key]])));
}
function reviewRefs(value,min=0){
  const a=denseArray(value,8);
  return a&&refs(a,{min,max:8})?Object.freeze(a):null;
}

/**
 * Bind review candidates to an independently supplied, explicitly pinned
 * source index. This compares caller-supplied pins; it cannot authenticate the
 * original registry bytes, current rights, semantics, or scientific truth.
 *
 * referenceIndex: {namespace,edition,registrySha256,records:[six-field node pin,
 *   optionally with label]}. Labels are never identity and are not returned.
 * input: {mode:'WORK',bindings:[{candidateId,node:pin}],links:[{from:pin,to:pin,
 *   relation:'LEXICAL_CANDIDATE'|'REVIEW_CANDIDATE',sourceRefs,dissentRefs?,rationale}],
 *   projectReviewContext?:'GENERAL_WORK_REVIEW'|'IRON_EMPIRE_FICTION'}.
 * Inputs must be inert, ordinary data. This is not a Proxy sandbox.
 */
export function proposeSourceBoundCandidateGraph(program,referenceIndex,input={}){
  return sourceBoundGraph(program,referenceIndex,input);
}
// One graph implementation serves both APIs. Only the batch's private call can
// supply a detached context; public callers cannot skip fresh validation.
function sourceBoundGraph(program,referenceIndex,input,context){
  try{
    if(!context&&!valid(program))return hold('PROGRAM_UNVERIFIED');
    const index=context?context.index:dataRecord(referenceIndex,['namespace','edition','registrySha256','records']);
    const request=dataRecord(input,['mode','bindings','links','projectReviewContext']);
    if(!index||!request||typeof index.namespace!=='string'||!PIN_NAMESPACE.test(index.namespace)||
      index.edition!==program.sourceEdition||index.registrySha256!==program.sourceDigest||
      request.mode!=='WORK')return hold('SOURCE_BOUND_SCOPE_INVALID');
    const projectReviewContext=request.projectReviewContext===undefined?'GENERAL_WORK_REVIEW':request.projectReviewContext;
    if(!PROJECT_CONTEXTS.has(projectReviewContext))return hold('PROJECT_REVIEW_CONTEXT_INVALID');
    const records=context?context.records:denseArray(index.records,1728),bindings=denseArray(request.bindings,1728),
      links=denseArray(request.links===undefined?[]:request.links,6912);
    if(!records||!records.length||!bindings||!links)return hold('SOURCE_BOUND_COLLECTION_INVALID');
    const known=context?context.known:new Map();
    if(!context){
      for(const record of records){
        const pin=nodePin(record,index,true);
        if(!pin||known.has(pin.nodeId))return hold('SOURCE_INDEX_INVALID_OR_DUPLICATE');
        known.set(pin.nodeId,pin);
      }
    }
    const matchedPin=value=>{
      const pin=nodePin(value,index),expected=pin&&known.get(pin.nodeId);
      return expected&&pinKey(pin)===pinKey(expected)?pin:null;
    };
    const tasks=context?context.tasks:new Map(program.tasks.map(task=>[task.id,task]));
    const selected=new Map(),nodes=[];
    for(const binding of bindings){
      const b=dataRecord(binding,['candidateId','node']);
      const pin=b&&matchedPin(b.node),task=b&&tasks.get(b.candidateId);
      if(!pin||!task||!task.nodeSlots.includes(pin.nodeId))return hold('CANDIDATE_SOURCE_BINDING_INVALID');
      const key=pinKey(pin);
      if(selected.has(key))return hold('DUPLICATE_SOURCE_BINDING');
      const item=Object.freeze({candidateId:b.candidateId,node:pin,
        bindingType:'POSITIONAL_REVIEW_ONLY',sourceSemanticMatch:'UNMAPPED'});
      selected.set(key,item);nodes.push(item);
    }
    const out=[],seen=new Set();
    for(const link of links){
      const l=dataRecord(link,['from','to','relation','sourceRefs','dissentRefs','rationale']);
      const from=l&&matchedPin(l.from),to=l&&matchedPin(l.to);
      const sourceRefs=l&&reviewRefs(l.sourceRefs,1),dissentRefs=l&&reviewRefs(l.dissentRefs===undefined?[]:l.dissentRefs);
      if(!from||!to||!selected.has(pinKey(from))||!selected.has(pinKey(to))||
        pinKey(from)===pinKey(to)||!CANDIDATE_LINK_TYPES.has(l.relation)||!sourceRefs||!dissentRefs||
        typeof l.rationale!=='string'||l.rationale.trim().length<20||l.rationale.length>400||
        /[\u0000-\u001f\uD800-\uDFFF]/u.test(l.rationale))return hold('SOURCE_BOUND_LINK_INVALID');
      const key=JSON.stringify([pinKey(from),pinKey(to),l.relation]);
      if(seen.has(key))return hold('DUPLICATE_SOURCE_RELATION');
      seen.add(key);
      out.push(Object.freeze({from,to,relation:l.relation,sourceRefs,dissentRefs,
        rationale:l.rationale.trim(),epistemicStatus:'UNREVIEWED_CANDIDATE',authorityEffect:'NONE'}));
    }
    nodes.sort((a,b)=>pinKey(a.node).localeCompare(pinKey(b.node),'en'));
    out.sort((a,b)=>JSON.stringify([pinKey(a.from),pinKey(a.to),a.relation])
      .localeCompare(JSON.stringify([pinKey(b.from),pinKey(b.to),b.relation]),'en'));
    const core={schema:'atlas.one.whole-144-source-bound-candidate/v1',status:'SOURCE_BOUND_CANDIDATE_ONLY',
      programDigest:program.programDigest,mode:'WORK',sourcePin:Object.freeze({namespace:index.namespace,
        edition:index.edition,registrySha256:index.registrySha256}),projectReviewContext,
      evidenceModality:projectReviewContext==='IRON_EMPIRE_FICTION'?'FICTION_REVIEW':'WORK_REVIEW',
      nodes:Object.freeze(nodes),links:Object.freeze(out),nodeCount:nodes.length,linkCount:out.length,
      labelsUsedForIdentity:false,sourceIndexComparison:'CALLER_SUPPLIED_PIN_MATCH',
      sourceOriginalBytesVerified:false,sourceNodeSemantics:'UNREVIEWED',scientificEndorsement:false,
      semanticEquivalencesEstablished:0,actualResidentAssignments:0,verifiedGains:0,
      rightsVerified:false,hostedVerified:false,canPublish:false,authorityEffect:'NONE',canonEffect:'NONE'};
    return Object.freeze({...core,graphDigest:digest(core)});
  }catch(_){return hold('SOURCE_BOUND_INPUT_INVALID');}
}


function sourceBoundRequest(input){
  const request=dataRecord(input,['mode','bindings','links','projectReviewContext']);
  if(!request||request.mode!=='WORK')return hold('SOURCE_BOUND_SCOPE_INVALID');
  const projectReviewContext=request.projectReviewContext===undefined?'GENERAL_WORK_REVIEW':request.projectReviewContext;
  if(!PROJECT_CONTEXTS.has(projectReviewContext))return hold('PROJECT_REVIEW_CONTEXT_INVALID');
  const bindings=denseArray(request.bindings,1728),links=denseArray(request.links===undefined?[]:request.links,6912);
  if(!bindings||!links)return hold('SOURCE_BOUND_COLLECTION_INVALID');
  return {mode:'WORK',bindings,links,projectReviewContext};
}

/** Up to 144 ordered requests, sharing one freshly validated source snapshot.
 * Aggregate budgets: 1,728 bindings and 6,912 links. Each request still receives
 * its own exact single-call graph or HOLD; any HOLD is visible in the envelope.
 * This is local candidate review, not a runner, rights cache, or evolution count.
 */
export function proposeSourceBoundCandidateBatch(program,referenceIndex,inputs){
  try{
    if(!valid(program))return hold('PROGRAM_UNVERIFIED');
    const programDigest=program.programDigest,sourceEdition=program.sourceEdition,sourceDigest=program.sourceDigest;
    if(typeof programDigest!=='string'||typeof sourceEdition!=='string'||typeof sourceDigest!=='string')
      return hold('PROGRAM_UNVERIFIED');
    // Snapshot only once in the batch path. Single calls keep their original
    // preparation and algorithm; they do not build detached slot Sets/maps.
    const programSnapshot=Object.freeze({programDigest,sourceEdition,sourceDigest});
    const tasks=new Map(program.tasks.map(task=>[task.id,Object.freeze({id:task.id,
      nodeSlots:Object.freeze([...task.nodeSlots])})]));
    const index=dataRecord(referenceIndex,['namespace','edition','registrySha256','records']);
    if(!index||typeof index.namespace!=='string'||!PIN_NAMESPACE.test(index.namespace)||
      index.edition!==programSnapshot.sourceEdition||index.registrySha256!==programSnapshot.sourceDigest)
      return hold('SOURCE_BOUND_SCOPE_INVALID');
    const records=denseArray(index.records,1728);
    if(!records||!records.length)return hold('SOURCE_BOUND_COLLECTION_INVALID');
    const known=new Map();
    for(const record of records){
      const pin=nodePin(record,index,true);
      if(!pin||known.has(pin.nodeId))return hold('SOURCE_INDEX_INVALID_OR_DUPLICATE');
      known.set(pin.nodeId,pin);
    }
    const sourceRecords=Object.freeze([...known.values()]);
    const sourcePin=Object.freeze({namespace:index.namespace,edition:index.edition,registrySha256:index.registrySha256});
    const indexSnapshot=Object.freeze(dataRecord({...sourcePin,records:sourceRecords},
      ['namespace','edition','registrySha256','records']));
    const context={index:indexSnapshot,records:sourceRecords,known,tasks};
    const requests=denseArray(inputs,144);
    if(!requests||!requests.length)return hold('SOURCE_BOUND_BATCH_COLLECTION_INVALID');
    const prepared=[];let bindingCount=0,linkCount=0;
    for(const input of requests){
      let request;
      try{request=sourceBoundRequest(input);}catch{request=hold('SOURCE_BOUND_INPUT_INVALID');}
      if(request.status!=='HOLD'){
        bindingCount+=request.bindings.length;linkCount+=request.links.length;
        if(bindingCount>1728||linkCount>6912)return hold('SOURCE_BOUND_BATCH_BUDGET_EXCEEDED');
      }
      prepared.push(request);
    }
    const results=Object.freeze(prepared.map(request=>request.status==='HOLD'?request:
      sourceBoundGraph(programSnapshot,indexSnapshot,request,context)));
    const heldRequestCount=results.filter(result=>result.status==='HOLD').length;
    const core={schema:'atlas.one.whole-144-source-bound-candidate-batch/v1',
      status:heldRequestCount?'SOURCE_BOUND_BATCH_WITH_HOLDS':'SOURCE_BOUND_BATCH_CANDIDATE_ONLY',
      programDigest:programSnapshot.programDigest,mode:'WORK',sourcePin,
      results,requestCount:results.length,candidateGraphCount:results.length-heldRequestCount,heldRequestCount,
      sourceIndexComparison:'CALLER_SUPPLIED_PIN_MATCH',sourceOriginalBytesVerified:false,
      scientificEndorsement:false,semanticEquivalencesEstablished:0,actualResidentAssignments:0,verifiedGains:0,
      rightsVerified:false,hostedVerified:false,canPublish:false,authorityEffect:'NONE',canonEffect:'NONE'};
    return Object.freeze({...core,batchDigest:digest(core)});
  }catch{return hold('SOURCE_BOUND_INPUT_INVALID');}
}
