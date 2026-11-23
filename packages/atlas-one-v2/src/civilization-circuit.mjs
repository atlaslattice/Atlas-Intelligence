/** Atlas ONE v2 / 1,728-dimensional civilizational perspective read adapter.
 * The original Ariadne bytes are required; derived output is a source-only
 * candidate index, never hosted authority or an authenticated agent record.
 * Original source must be injected by the OWNER at runtime and is never exported.
 * The sole SwarmChat broker and original CANON editions remain unchanged.
 */
import {AriadneRegistry,HSN_SHA256,Hold,requireValid,isObject,validCoord,digest} from './index.mjs';

export const CIRCUIT_SCHEMA='atlas.civilization.circuit/v1';
export const INDEX_SCHEMA='atlas.civilization.readonly-index/v1';
const HOUSE=/^H(?:0[1-9]|1[0-2])$/;
const SPHERE=/^H(?:0[1-9]|1[0-2])\.S(?:0[1-9]|1[0-2])$/;
const SHA=/^[a-f0-9]{64}$/;
const valid=x=>isObject(x);
const allowedRoles=new Set(['DOMAIN_SPECIALIZATION','EPISTEMIC_META']);
const ownSource=x=>x==='LOCAL_OWNER_SOURCE';
const noAuthority={hostAuthenticated:false,semanticAccepted:false,canonEffect:'NONE',workPosted:false,peerVerified:false};
function requireNames(obj,names,code){requireValid(valid(obj)&&names.every(n=>Object.hasOwn(obj,n)),code);}
function hold(reason){return {schema:'atlas.civilization.readonly-result/v1',status:'HOLD',reason, data:null,...noAuthority};}
function checkDigest(x){return typeof x==='string'&&SHA.test(x);}
function snapshot(value){
  try{return structuredClone(value);}
  catch{throw new Hold('CIRCUIT_INPUT_NOT_SNAPSHOTABLE');}
}

export class CivilizationCircuit {
  #registry;#nodes;#spheres;#houses;#houseSphere;#manifest;
  constructor({originalAriadneBytes,manifest,nodeRecords,sphereReviews,houseFollowups,houseSphereFollowups}={}){
    this.#registry=new AriadneRegistry(originalAriadneBytes);
    // The entire trusted hierarchy is read ONLY AFTER AriadneRegistry verified original bytes.
    const originalHierarchy=JSON.parse(Buffer.from(originalAriadneBytes).toString('utf8'));
    // Validate a detached copy so later caller mutation cannot rewrite receipts.
    ({manifest,nodeRecords,sphereReviews,houseFollowups,houseSphereFollowups}=snapshot(
      {manifest,nodeRecords,sphereReviews,houseFollowups,houseSphereFollowups}));
    const validReceipt=x=>{if(!valid(x)||!checkDigest(x.receiptSHA256))return false;const clone={...x};delete clone.receiptSHA256;return digest(clone)===x.receiptSHA256;};
    requireNames(manifest,['schema','originalSourceSHA256','pairEvaluations','nodePassRecords','sphereReviewRecords','houseFollowups'],'CIRCUIT_MANIFEST_SHAPE');
    requireValid(manifest.schema===CIRCUIT_SCHEMA&&manifest.originalSourceSHA256===HSN_SHA256
      &&manifest.pairEvaluations===248832&&manifest.homeStructural===1728
      &&manifest.externalPerspectiveEvaluations===247104
      &&manifest.nodePassRecords===1728&&manifest.sphereReviewRecords===144
      &&manifest.houseFollowups===12&&manifest.houseSphereFollowups===1728
      &&manifest.houseSphereReferencedPositionsNotFresh===2985984
      &&manifest.totalLogicalPositionsIncludingReusedHouseReferences===3234816
      &&manifest.domain===1008&&manifest.epistemicMeta===720
      &&manifest.genuineResidentMacroturns===0&&manifest.peerReviewsVerified===0
      &&manifest.semanticallyAcceptedCrossLinks===0&&manifest.siteDeployments===0,
      'CIRCUIT_MANIFEST_NOT_SOURCE_LOCKED');
    requireValid(Array.isArray(nodeRecords)&&nodeRecords.length===1728
      &&Array.isArray(sphereReviews)&&sphereReviews.length===144
      &&Array.isArray(houseFollowups)&&houseFollowups.length===12
      &&Array.isArray(houseSphereFollowups)&&houseSphereFollowups.length===1728,
      'CIRCUIT_REVIEW_INVENTORY_INCOMPLETE');
    const nmap=new Map(),smap=new Map(),hmap=new Map();
    for(let i=0;i<nodeRecords.length;i++){
      const n=nodeRecords[i];
      requireValid(valid(n)&&validCoord(n.nodeId)&&n.slot===i+1&&!nmap.has(n.nodeId)
        &&n.nodeKind&&allowedRoles.has(n.nodeKind)&&n.sourceRegistrySHA256===HSN_SHA256
        &&n.sourceEdition==='Ariadne v0.7'&&n.sourceNodeSHA256===this.#registry.lookup(n.nodeId).sourceNodeSHA256
        &&n.nodeName===this.#registry.lookup(n.nodeId).name
        &&n.nodeKind===this.#registry.lookup(n.nodeId).kind
        &&n.sourceDefinition===this.#registry.lookup(n.nodeId).definition
        &&n.sourceIncludes===this.#registry.lookup(n.nodeId).includes
        &&n.sourceExcludes===this.#registry.lookup(n.nodeId).excludes
        &&n.houseId===n.nodeId.slice(0,3)
        &&validReceipt(n)
        &&n.reviewState==='UNREVIEWED'&&n.workPosted===false&&n.canonEffect==='NONE'
        &&n.spherePerspectiveEvaluations===144&&n.sphereId===n.nodeId.slice(0,7)
        &&Array.isArray(n.candidatePerspectives)&&n.candidatePerspectives.length<=4
        &&n.candidatePerspectives.every(c=>valid(c)&&SPHERE.test(c.sphereId)&&c.status==='UNREVIEWED'),
        'CIRCUIT_NODE_SOURCE_OR_STATUS_CONFLICT');
      nmap.set(n.nodeId,n);
    }
    for(const s of sphereReviews){
      requireValid(valid(s)&&SPHERE.test(s.sphereId)&&!smap.has(s.sphereId)
        &&s.sourceSHA256===HSN_SHA256&&s.sphereName===originalHierarchy.spheres[s.sphereId]?.name
        &&s.houseName===originalHierarchy.houses[s.houseId]?.name&&s.houseId===s.sphereId.slice(0,3)
        &&validReceipt(s)&&s.evaluatedNodes===1728&&s.homeStructural===12
        &&s.externalEvaluated===1716&&Array.isArray(s.homeNodes)&&s.homeNodes.length===12
        &&s.homeNodes.every(n=>valid(n)&&validCoord(n.id)&&n.id.slice(0,7)===s.sphereId
            &&n.name===this.#registry.lookup(n.id).name&&n.kind===this.#registry.lookup(n.id).kind
            &&n.sourceNodeSHA256===this.#registry.lookup(n.id).sourceNodeSHA256)
        &&Array.isArray(s.shortlist)&&s.shortlist.length<=12
        &&s.shortlist.every(c=>valid(c)&&validCoord(c.node)&&c.relation==='CO_STUDY_CANDIDATE_NOT_EQUIVALENCE'
            &&c.semanticReview==='UNADJUDICATED'&&c.nodeKind==='DOMAIN_SPECIALIZATION'
            &&c.sourceNodeSHA256===this.#registry.lookup(c.node).sourceNodeSHA256
            &&c.nodeName===this.#registry.lookup(c.node).name)
        &&s.residentReviewCount===0&&s.hostedVerified===false&&s.canonEffect==='NONE',
        'CIRCUIT_SPHERE_SOURCE_OR_STATUS_CONFLICT');
      smap.set(s.sphereId,s);
    }
    for(const h of houseFollowups){
      requireValid(valid(h)&&HOUSE.test(h.houseId)&&!hmap.has(h.houseId)
        &&h.sourceSHA256===HSN_SHA256&&h.houseName===originalHierarchy.houses[h.houseId]?.name
        &&validReceipt(h)&&h.sphereReviews===12&&h.nodePasses===144
        &&h.residentReviewCount===0&&h.actualMacroturnsCompleted===0
        &&Array.isArray(h.sphereIds)&&h.sphereIds.length===12
        &&h.sphereIds.every(s=>SPHERE.test(s)&&s.startsWith(h.houseId+'.')&&smap.has(s))
        &&h.governance==='NO_AUTOMATIC_CANON_OR_RESIDENT_ASSIGNMENT',
        'CIRCUIT_HOUSE_SOURCE_OR_AUTHORITY_CONFLICT');
      hmap.set(h.houseId,h);
    }
    const fmap=new Map();
    for(const f of houseSphereFollowups){
      const key=typeof f?.sphereUnderReview==='string'&&typeof f?.housePerspective==='string'
        ?`${f.sphereUnderReview}::${f.housePerspective}`:null;
      const sphere=smap.get(f?.sphereUnderReview),house=hmap.get(f?.housePerspective);
      const exactRole=sphere?.roleCounts?.DOMAIN_SPECIALIZATION===12?'DOMAIN_SUBJECT':'EPISTEMIC_METHOD';
      requireValid(valid(f)&&key===f.followupId&&!fmap.has(key)&&sphere&&house
        &&f.sourceSHA256===HSN_SHA256&&f.sourceEdition==='Ariadne v0.7'
        &&f.sphereName===sphere.sphereName&&f.housePerspectiveName===house.houseName
        &&f.sphereReviewSHA256===sphere.receiptSHA256
        &&f.houseReviewSHA256===house.receiptSHA256
        &&f.sphereRole===exactRole&&f.homeNodeCount===12
        &&f.existingSphereEvidenceEvaluationsReferenced===1728
        &&f.referenceReusedNotFreshComputation===true
        &&f.semanticGate===(exactRole==='EPISTEMIC_METHOD'?'EPISTEMIC_METHOD_ONLY_NOT_SAME_AS':'DOMAIN_CANDIDATE_NOT_SAME_AS')
        &&f.humanReviewCount===0&&f.residentAuthenticated===false
        &&f.actualMacroturnCompleted===false&&f.workPostPerformed===false
        &&f.modelCallPerformed===false&&f.canonEffect==='NONE'
        &&f.creativeEffect==='NONE'&&validReceipt(f),
        'CIRCUIT_HOUSE_SPHERE_SOURCE_OR_AUTHORITY_CONFLICT');
      fmap.set(key,f);
    }
    requireValid(fmap.size===1728,'CIRCUIT_HOUSE_SPHERE_COVERAGE_INCOMPLETE');
    requireValid(nmap.size===1728&&smap.size===144&&hmap.size===12,'CIRCUIT_SOURCE_COVERAGE_INCOMPLETE');
    this.#manifest=manifest;this.#nodes=nmap;this.#spheres=smap;this.#houses=hmap;this.#houseSphere=fmap;
    Object.freeze(this);
  }
  status(){return {schema:'atlas.civilization.source-status/v1',sourceSHA256:HSN_SHA256,
    sourceEdition:'Ariadne v0.7',nodes:this.#nodes.size,spheres:this.#spheres.size,
    houses:this.#houses.size,comparisons:this.#manifest.pairEvaluations,
    houseSphereFollowups:this.#houseSphere.size,reusedPositionReferences:this.#manifest.houseSphereReferencedPositionsNotFresh,
    actualMacroturns:0,rights:'NO_HOSTED_IAM',workPosting:'DISABLED',
    science:'ALL_LEXICAL_CANDIDATES_UNREVIEWED',...noAuthority};}
  node(nodeId,{mode}={}){
    if(!ownSource(mode))return hold('OWNER_SOURCE_ONLY_NO_LIVE_WORK_RIGHTS');
    if(!validCoord(nodeId)||!this.#nodes.has(nodeId))return hold('INVALID_HSN_OR_NOT_IN_SOURCE');
    const n=snapshot(this.#nodes.get(nodeId));
    return {schema:'atlas.civilization.readonly-result/v1',status:'SOURCE_REVIEW_CARD_UNREVIEWED',data:{
      nodeId:n.nodeId,nodeName:n.nodeName,role:n.role,kind:n.nodeKind,houseId:n.houseId,
      sphereId:n.sphereId,sourceNodeSHA256:n.sourceNodeSHA256,
      sourceDefinition:n.sourceDefinition,studyQuestion:n.falsifier,
      candidates:n.candidatePerspectives,receiptSHA256:n.receiptSHA256},...noAuthority};
  }
  sphere(sphereId,{mode}={}){
    if(!ownSource(mode))return hold('OWNER_SOURCE_ONLY_NO_LIVE_WORK_RIGHTS');
    if(!SPHERE.test(sphereId)||!this.#spheres.has(sphereId))return hold('INVALID_SPHERE_OR_NOT_IN_SOURCE');
    const s=snapshot(this.#spheres.get(sphereId));
    return {schema:'atlas.civilization.readonly-result/v1',status:'SPHERE_COMPUTED_REVIEW_NOT_ADJUDICATED',data:{
      sphereId,houseId:s.houseId,name:s.sphereName,homeNodes:s.homeNodes,
      shortlist:s.shortlist,reviewQuestion:s.reviewQuestion,falsifiers:s.falsifiers,
      receiptSHA256:s.receiptSHA256,externalEvaluated:s.externalEvaluated},...noAuthority};
  }
  house(houseId,{mode}={}){
    if(!ownSource(mode))return hold('OWNER_SOURCE_ONLY_NO_LIVE_WORK_RIGHTS');
    if(!HOUSE.test(houseId)||!this.#houses.has(houseId))return hold('INVALID_HOUSE_OR_NOT_IN_SOURCE');
    const h=snapshot(this.#houses.get(houseId));
    return {schema:'atlas.civilization.readonly-result/v1',status:'HOUSE_FOLLOWUP_SOURCE_ONLY',data:{
      houseId,name:h.houseName,spheres:h.sphereIds,reviewQuestion:h.followupQuestion,
      rightsConcern:h.rightsConcern,physicalStockConcern:h.physicalStockConcern,
      contrastingHouseQuestions:h.contrastingHouseQuestions,receiptSHA256:h.receiptSHA256},...noAuthority};
  }
  houseSphereFollowup(sphereId,houseId,{mode}={}){
    if(!ownSource(mode))return hold('OWNER_SOURCE_ONLY_NO_LIVE_WORK_RIGHTS');
    const key=`${sphereId}::${houseId}`;
    if(!SPHERE.test(sphereId)||!HOUSE.test(houseId)||!this.#houseSphere.has(key))return hold('HOUSE_SPHERE_PAIR_NOT_IN_SOURCE');
    const f=snapshot(this.#houseSphere.get(key));
    return {schema:'atlas.civilization.readonly-result/v1',status:'HOUSE_SPHERE_FOLLOWUP_UNREVIEWED',data:{
      followupId:key,housePerspective:houseId,sphereUnderReview:sphereId,
      sphereRole:f.sphereRole,question:f.question,semanticGate:f.semanticGate,
      counterexample:f.counterexample,rightsGate:f.rightsGate,sourceSHA256:f.sourceSHA256,
      sphereReviewSHA256:f.sphereReviewSHA256,houseReviewSHA256:f.houseReviewSHA256,
      receiptSHA256:f.receiptSHA256,reusedPerspectiveDataNotNewComputation:true},...noAuthority};
  }
  prepareWorkProposal(nodeId,{roomId,mode}={}){
    // Even an owner's local request cannot grant host rights or write to broker.
    if(mode!=='LOCAL_OWNER_SOURCE'||typeof roomId!=='string'||!/^[A-Za-z0-9_-]{3,80}$/.test(roomId))
      return hold('LOCAL_SOURCE_AND_VALID_ROOM_REFERENCE_REQUIRED');
    if(!validCoord(nodeId)||!this.#nodes.has(nodeId))return hold('NODE_NOT_FOUND');
    const n=this.#nodes.get(nodeId);
    return {schema:'atlas.civilization.swarmchat-work-envelope/v1',status:'PREPARED_NOT_POSTED',
      roomId,sourceEdition:'Ariadne v0.7',sourceSHA256:HSN_SHA256,
      nodeId:n.nodeId,nodeSHA256:n.sourceNodeSHA256,receiptSHA256:n.receiptSHA256,
      mode:'WORK_REFERENCE_ONLY',hostReadReturnRequired:true,candidateStatus:'UNREVIEWED',
      noPrivateModeRead:true,posted:false,...noAuthority};
  }
  ironEmpireSeed(houseId,{mode,optIn}={}){
    if(mode!=='IMAGINE_LOCAL'||optIn!==true)return hold('VOLUNTARY_PRIVATE_CREATIVE_SCOPE_REQUIRED');
    if(!HOUSE.test(houseId)||!this.#houses.has(houseId))return hold('HOUSE_NOT_FOUND');
    const h=this.#houses.get(houseId);
    return {schema:'atlas.iron-empire.creative-opt-in/v1',status:'FICTIONAL_DRAFT_NOT_POSTED',
      mode:'IMAGINE_LOCAL',houseId,sourceEdition:'Ariadne v0.7',
      houseName:h.houseName,
      seed:`A fictional Iron Empire scenario: how would citizens independently govern ${h.houseName} without turning a civilization or person into an extractive resource?`,
      historicalContinuumCanon:'UNCHANGED',scienceStatus:'NOT_MEASURED',
      noWorkIndexing:true,noPrivateBodyImported:true,autoshare:false,posted:false,...noAuthority};
  }
}
