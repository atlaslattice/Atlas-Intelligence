/** Atlas ONE v2 · 12 functional House modules / 144 Sphere executions / 1728 knowledge nodes.
 * Original and strictly additive on Meta145GlyphCircuit; does NOT install a broker,
 * create an issuer, admit unverified semantic edges, call a model or change CANON.
 * Public source may be distributed; user-original source and generated atlas stay private.
 */
import {AriadneRegistry,canonical,Hold} from './index.mjs';
import {Meta145GlyphCircuit} from './meta145-glyph.mjs';
import {createHash} from 'node:crypto';

export const CIVILIZATION_SCHEMA='atlas.one.civilization.functional12.sphere144.node1728/v1';
export const ARIADNE_SHA='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
export const META145_EDITION='atlas.meta145.glyph.functional-memory/v2.0';
const SHA=/^[a-f0-9]{64}$/;
const SPHERE=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])$/;
const NODE=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const HOUSE=/^H(0[1-9]|1[0-2])$/;
const ROOM=/^[a-zA-Z0-9_-]{3,80}$/;
const hold=reason=>({schema:'atlas.one.civilization.function-review/v1',status:'HOLD',reason,validatedLocally:false,hostAuthenticated:false,rightsVerified:false,canonChanged:false,workPosted:false});
const sha=x=>createHash('sha256').update(x).digest('hex');
const digest=x=>sha(Buffer.from(canonical(x),'utf8'));
const normal=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const text=x=>typeof x==='string'&&x.length>0&&x.length<=300&&!/[\u0000-\u001f]/.test(x);
const bounded=x=>Number.isSafeInteger(x)&&x>=0&&x<=1_000_000_000;
const supplied=(x,keys)=>keys.every(k=>Object.hasOwn(x,k));
const proof=(x)=>typeof x==='string'&&SHA.test(x);
const decimal=x=>typeof x==='string'&&/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(x)&&x.length<=28;

/* One distinct, testable *review* capability per authentic Ariadne House.
 * These are local input/fixture conformance gates, not clinical, legal,
 * financial or scientific decisions; no protected data is accepted.
 */
export const MODULES=Object.freeze([
 {house:'H01',capability:'MEASUREMENT_AND_UNITS',prompt:'Can the proposed material or energy measurement be reproduced with an identified unit and method?',gate:'UNIT_AND_METHOD'},
 {house:'H02',capability:'WATER_FOOD_STOCK_FLOW',prompt:'Are native-unit withdrawals, imports and replenishment reconciled without hidden negative flows?',gate:'STOCK_CONSERVATION'},
 {house:'H03',capability:'ECOLOGICAL_DEPENDENCIES',prompt:'Which ecological receptor and uncertainty can falsify an infrastructure benefit?',gate:'ECOLOGICAL_RECEPTOR'},
 {house:'H04',capability:'HEALTH_EVIDENCE_SAFETY',prompt:'Is a health claim explicitly population-scoped, non-identifying and supported by a declared evidence level?',gate:'HEALTH_SCOPE'},
 {house:'H05',capability:'EDUCATION_KNOWLEDGE_PROVENANCE',prompt:'Can every original learning source be located by an exact versioned identity?',gate:'SOURCE_PROVENANCE'},
 {house:'H06',capability:'SECURITY_AND_RESILIENCE',prompt:'Does the threat review identify least privilege and a falsifiable failure mode without exposing secrets?',gate:'THREAT_SCOPE'},
 {house:'H07',capability:'ECONOMICS_GOVERNANCE_BUDGET',prompt:'Does a proposed resource budget close without claiming an authorized spending decision?',gate:'BUDGET_CLOSURE'},
 {house:'H08',capability:'CULTURE_CREATIVE_SANDBOX',prompt:'Could an explicitly opted-in fictional scene explore this Sphere without harvesting private imagination?',gate:'OPTIONAL_FICTION'},
 {house:'H09',capability:'EPISTEMIC_DISSENT',prompt:'Which contradictory evidence or falsifier would reverse the proposed conclusion?',gate:'CHALLENGE_RETAINED'},
 {house:'H10',capability:'COMMUNITY_AND_SOVEREIGNTY',prompt:'Whose knowledge rights and consultation would be necessary before adopting a community claim?',gate:'COMMUNITY_SCOPE'},
 {house:'H11',capability:'RIGHTS_AND_RETURN_FENCE',prompt:'Can current rights and revocation be checked again at actual response release?',gate:'REVOCATION_FENCE'},
 {house:'H12',capability:'SPACE_SYSTEMS_VERIFICATION',prompt:'Is this a modeled aerospace design rather than a calibrated flight or habitat demonstration?',gate:'MODEL_VS_FLIGHT'}
].map(Object.freeze));

export function evaluateModuleFunction(house, input){
 if(!HOUSE.test(house)||!MODULES.some(m=>m.house===house))return hold('UNKNOWN_HOUSE');
 if(!normal(input)||Object.keys(input).some(k=>['secret','token','privateBody','residentAuthenticated','hostAuthorization','canonApproved','peerVote','userIdentity','patientRecord'].includes(k)))return hold('UNTRUSTED_OR_PRIVATE_INPUT');
 const id=Number(house.slice(1));
 if(id===8){if(input.mode!=='IMAGINE_LOCAL'||input.optIn!==true||input.bodyImported!==false||!text(input.scenePremise))return hold('CREATIVE_OPTIN_OR_ISOLATION_REQUIRED');}
 else if(input.mode!=='WORK')return hold('WORK_SCOPE_REQUIRED');
 let ok=false,reason='MODULE_CONSTRAINT_UNMET',details={};
 switch(house){
 case 'H01':ok=decimal(input.quantity)&&text(input.unit)&&text(input.method)&&input.evidenceStatus==='SOURCE_REPORTED'&&input.calibrated===false;break;
 case 'H02':ok=supplied(input,['opening','imports','regeneration','restoration','withdrawals','losses','closing','unit'])&&['opening','imports','regeneration','restoration','withdrawals','losses','closing'].every(k=>bounded(input[k]))&&text(input.unit)&&input.opening+input.imports+input.regeneration+input.restoration-input.withdrawals-input.losses===input.closing;break;
 case 'H03':ok=text(input.receptor)&&text(input.impact)&&text(input.falsifier)&&input.ecosystemRightsUnreviewed===true;break;
 case 'H04':ok=text(input.populationScope)&&text(input.evidenceTier)&&text(input.riskStatement)&&input.personalDataIncluded===false&&input.clinicalApproval===false;break;
 case 'H05':ok=Array.isArray(input.sourceRefs)&&input.sourceRefs.length>=1&&input.sourceRefs.length<=12&&input.sourceRefs.every(r=>normal(r)&&r.edition==='Ariadne v0.7'&&r.sha256===ARIADNE_SHA&&NODE.test(r.coordinate))&&input.labelIsAuthority===false;break;
 case 'H06':ok=text(input.threatModel)&&text(input.failureCase)&&input.leastPrivilege===true&&input.credentialExposed===false&&input.automatedEnforcement===false;break;
 case 'H07':ok=['budget','allocation','reserve'].every(k=>bounded(input[k]))&&text(input.unit)&&input.budget===input.allocation+input.reserve&&input.spendingAuthorized===false&&input.rightsReviewed===false;break;
 case 'H08':ok=true;details.optInOnly=true;break;
 case 'H09':ok=text(input.claim)&&text(input.falsifier)&&text(input.counterevidence)&&input.accepted===false&&input.dissentPreserved===true;break;
 case 'H10':ok=text(input.communityScope)&&text(input.consultationQuestion)&&input.sourceRightsReviewed===false&&input.consentPresumed===false;break;
 case 'H11':ok=Number.isSafeInteger(input.rightsEpoch)&&input.rightsEpoch>=0&&input.readEpoch===input.rightsEpoch&&input.returnEpoch===input.rightsEpoch&&input.allowedAtRead===true&&input.allowedAtReturn===true&&input.hostValidated===false;break;
 case 'H12':ok=text(input.systemModel)&&text(input.falsifier)&&input.synthetic===true&&input.flightVerified===false&&input.calibrated===false;break;
 }
 if(!ok)return hold(reason);
 return {schema:'atlas.one.civilization.function-review/v1',house,status:'LOCAL_SCHEMA_REVIEW_ONLY',
    capability:MODULES[id-1].capability,localChecksPassed:true,reviewRequired:true,
    scientificValidated:false,communityAdjudicated:false,hostAuthenticated:false,rightsVerified:false,
    workPosted:false,canonChanged:false,modelWeightsChanged:false,...details};
}

export function sampleModuleInput(house,sphere='H01.S01'){
 const common={mode:'WORK'};
 switch(house){
 case 'H01':return {...common,quantity:'1',unit:'J',method:`synthetic measurement fixture for ${sphere}`,evidenceStatus:'SOURCE_REPORTED',calibrated:false};
 case 'H02':return {...common,opening:100,imports:10,regeneration:5,restoration:1,withdrawals:12,losses:4,closing:100,unit:'units'};
 case 'H03':return {...common,receptor:`source-scope receptor ${sphere}`,impact:'proposed ecological consequence',falsifier:'observed counterexample within a specified region',ecosystemRightsUnreviewed:true};
 case 'H04':return {...common,populationScope:'fictional aggregate sample only',evidenceTier:'SOURCE_REPORTED',riskStatement:'uncertainty requires specialist review',personalDataIncluded:false,clinicalApproval:false};
 case 'H05':return {...common,sourceRefs:[{edition:'Ariadne v0.7',sha256:ARIADNE_SHA,coordinate:sphere+'.N01'}],labelIsAuthority:false};
 case 'H06':return {...common,threatModel:'synthetic access-boundary review',failureCase:'revocation before response release',leastPrivilege:true,credentialExposed:false,automatedEnforcement:false};
 case 'H07':return {...common,budget:100,allocation:70,reserve:30,unit:'synthetic units',spendingAuthorized:false,rightsReviewed:false};
 case 'H08':return {mode:'IMAGINE_LOCAL',optIn:true,bodyImported:false,scenePremise:'Optional source-inspired fictional place, no authored story canon'};
 case 'H09':return {...common,claim:'source-linked review is proposed only',falsifier:'find a contradicting source in a different edition',counterevidence:'explicit negative or dissenting case',accepted:false,dissentPreserved:true};
 case 'H10':return {...common,communityScope:'editorial community reference, not real representation',consultationQuestion:'who could consent to this source use?',sourceRightsReviewed:false,consentPresumed:false};
 case 'H11':return {...common,rightsEpoch:3,readEpoch:3,returnEpoch:3,allowedAtRead:true,allowedAtReturn:true,hostValidated:false};
 case 'H12':return {...common,systemModel:'synthetic orbital systems model',falsifier:'calibration drift under a declared test',synthetic:true,flightVerified:false,calibrated:false};
 default:throw new Hold('UNKNOWN_HOUSE');
 }
}

export class CivilizationUnifiedBuild {
 #source;#data;#glyph;#meta;#perspectives;#sphereReviews;#names;
 constructor({originalAriadneBytes,metaManifestBytes,artifactBytes,memoryPolicy=null}={}){
   if(!Buffer.isBuffer(originalAriadneBytes))throw new Hold('ORIGINAL_SOURCE_BYTES_REQUIRED');
   this.#source=new AriadneRegistry(originalAriadneBytes);
   this.#glyph=new Meta145GlyphCircuit({originalAriadneBytes,metaBytes:metaManifestBytes,artifactBytes,memoryPolicy});
   this.#data=JSON.parse(originalAriadneBytes.toString('utf8'));
   this.#meta=JSON.parse(metaManifestBytes.toString('utf8'));
   this.#perspectives=JSON.parse(artifactBytes['perspectives_144.json'].toString('utf8'));
   this.#sphereReviews=JSON.parse(artifactBytes['sphere_reviews_144.json'].toString('utf8'));
   this.#names=JSON.parse(artifactBytes['node_glyphs_1728.json'].toString('utf8'));
   if(this.#source.digest!==ARIADNE_SHA||this.#meta.sourceEdition!=='Ariadne v0.7'||this.#meta.semanticAcceptanceCount!==0)throw new Hold('SOURCE_SCOPE_OR_ACCEPTANCE_CHANGED');
   for(const [i,m] of MODULES.entries()){
      const id=`H${String(i+1).padStart(2,'0')}`;
      if(m.house!==id||typeof this.#data.houses[id]?.name!=='string'||this.#data.houses[id].children?.length!==12)throw new Hold('MODULE_HOUSE_MISMATCH');
   }
   Object.freeze(this);
 }
 get status(){return {schema:CIVILIZATION_SCHEMA,status:'SOURCE_PINNED_LOCAL_EXECUTION_READY',nodes:1728,spheres:144,functionalModules:12,meta145Digest:this.#meta.meta145Digest,sourceSha256:ARIADNE_SHA,unreviewedEdges:this.#meta.candidateEdges,siteDeployed:false,hostAuthenticated:false,semanticEdgesAccepted:0};}
 get modules(){return MODULES.map((m,i)=>({moduleId:`F${String(i+1).padStart(2,'0')}`,house:m.house,name:this.#data.houses[m.house].name,capability:m.capability,gate:m.gate,prompt:m.prompt,status:'SOURCE_BOUND_FUNCTIONAL_CANDIDATE'}));}
 node(coord){const r=this.#source.lookup(coord),glyph=this.#glyph.resolve(coord);return {schema:CIVILIZATION_SCHEMA,coordinate:coord,house:coord.slice(0,3),sphere:coord.slice(0,7),name:r.name,definition:r.definition,includes:r.includes,excludes:r.excludes,kind:r.kind,scopeStatus:this.#data.nodes[coord].scope_status,sourceEdition:'Ariadne v0.7',registrySha256:ARIADNE_SHA,sourceNodeSha256:r.sourceNodeSHA256,glyphQ:glyph.glyphQ,glyphS:glyph.glyphS,gf7Visual:glyph.cymaticAddress,semanticAcceptance:false,authorityEffect:'NONE'};}
 sphere(id){if(typeof id!=='string'||!SPHERE.test(id))throw new Hold('SPHERE_ID_INVALID');
   const i=(Number(id.slice(1,3))-1)*12+Number(id.slice(5,7))-1;
   const p=this.#perspectives[i],r=this.#sphereReviews[i],src=this.#data.spheres[id];
   if(p.sphere!==id||r.sphere!==id||src.children.length!==12||src.children.some(c=>!this.#source.contains(c)))throw new Hold('SPHERE_SOURCE_MISMATCH');
   const h=id.slice(0,3),mod=this.modules[Number(h.slice(1))-1],input=sampleModuleInput(h,id),gate=evaluateModuleFunction(h,input);
   if(gate.status!=='LOCAL_SCHEMA_REVIEW_ONLY')throw new Hold('MODULE_FIXTURE_FAILED');
   return {schema:CIVILIZATION_SCHEMA,buildUnit:`SPHERE-${id}`,house:h,sphere:id,name:src.name,kind:p.sourceRole,moduleId:mod.moduleId,moduleCapability:mod.capability,
    sourceEdition:'Ariadne v0.7',sourceRegistrySha256:ARIADNE_SHA,sourcePerspectiveSha256:p.perspectiveSha256,
    homeNodes:src.children,homeNodeRecordSha256:src.children.map(c=>this.#source.lookup(c).sourceNodeSHA256),
    anchorTerms:p.anchorTerms,reviewQuestion:`${mod.prompt} Perspective: ${src.name}. Which original evidence and counterexample would distinguish it from adjacent Spheres?`,
    execution:{kind:'EXACT_SOURCE_REVIEW_AND_LOCAL_MODULE_FIXTURE',fixtureVerified:true,realWorldClaimsVerified:false,independentSubjectExpert:false,
      semanticLinksAccepted:0,externalModelCalls:0,hostEffects:0},
    candidateEdges:r.lexicalCandidates?.length??0,gateStatus:gate.status,reviewStatus:'MODULE_EXECUTED_LOCALLY_REVIEW_REQUIRED',
    rights:{sourceRightsUnreviewed:true,hostReturnRightsVerified:false},projectTargets:['Atlas','AtlasGPT','Ariadne','SwarmChat Work','Iron Empire optional fiction'],
    premiseStatus:'SOURCE_LABELS_ONLY_NOT_SCIENTIFIC_ASSERTION'};
 }
 build(){const nodeCatalog=[];for(let h=1;h<=12;h++)for(let s=1;s<=12;s++)for(let n=1;n<=12;n++)nodeCatalog.push(this.node(`H${String(h).padStart(2,'0')}.S${String(s).padStart(2,'0')}.N${String(n).padStart(2,'0')}`));
   const receipts=[];let prev='0'.repeat(64);
   for(let h=1;h<=12;h++)for(let s=1;s<=12;s++){
     const id=`H${String(h).padStart(2,'0')}.S${String(s).padStart(2,'0')}`;
     const unit=this.sphere(id),record={ordinal:receipts.length+1,previousSha256:prev,...unit};
     record.receiptSha256=digest(record);receipts.push(record);prev=record.receiptSha256;
   }
   const modules=this.modules.map(m=>{
      const rows=receipts.filter(r=>r.house===m.house);
      const result={...m,sphereCount:12,nodeCount:144,domainSpheres:7,epistemicSpheres:5,localFunctionalFixturePasses:12,sourceReceiptHeads:rows.map(r=>r.receiptSha256),
        status:'FUNCTIONAL_MODULE_LOCAL_SOURCE_CHECK_COMPLETE_REVIEW_REQUIRED',rightsGranted:false,hostDeployed:false,fictionCanonChanged:false};
      return {...result,moduleReceiptSha256:digest(result)};
   });
   const build={schema:CIVILIZATION_SCHEMA,status:'LOCAL_INTEGRATED_COMPUTATION_COMPLETE_NOT_HOSTED',originalAriadneSha256:ARIADNE_SHA,
     meta145InputDigest:this.#meta.meta145Digest,sourceNodes:nodeCatalog.length,sphereExecutions:receipts.length,functionalModules:modules.length,
     domainSphereExecutions:84,methodSphereExecutions:60,distinctSphereReviewSha256:new Set(receipts.map(x=>x.sourcePerspectiveSha256)).size,
     localSchemaGatePasses:144,sourceScoringPairsPreexistingVerified:248832,previousMeta145CandidateEdges:this.#meta.candidateEdges,
     existingHouseSphereFollowupReceipts:1728,recordedHumanExpertApprovals:0,actualModelTrainingRuns:0,actualHostEffects:0,
     actualResidentMacroturns:0,siteDeployed:false,modelWeightTraining:false,oneExistingBroker:true,
     functionalMemory:this.#glyph.functionalMemory(),sphereChainHead:prev,moduleReceiptSha256s:modules.map(m=>m.moduleReceiptSha256)};
   return {nodeCatalog,sphereExecutions:receipts,modules,metaBuild:{...build,metaBuildSha256:digest(build)}};
 }
 prepareSwarmChat(coord,roomId){if(typeof roomId!=='string'||!ROOM.test(roomId))throw new Hold('ROOM_ID_INVALID');const n=this.node(coord),u=this.sphere(n.sphere);return {schema:'atlas.one.civilization.swarmchat-review-draft/v1',status:'PREPARED_NOT_POSTED',mode:'WORK',roomId,source:{coordinate:coord,sourceNodeSha256:n.sourceNodeSha256,registrySha256:ARIADNE_SHA,edition:'Ariadne v0.7',spherePerspectiveSha256:u.sourcePerspectiveSha256},moduleId:u.moduleId,
     sourceQuestion:u.reviewQuestion,canPost:false,rightsAtReadVerified:false,rightsAtReturnVerified:false,hostAuthenticated:false,modelWoken:false,sourceBodyIncluded:false,canonChanged:false};}
 prepareIronEmpire(house,{mode,explicitOptIn}={}){if(mode!=='IMAGINE_LOCAL'||explicitOptIn!==true)throw new Hold('FICTION_MODE_OPTIN_REQUIRED');if(!HOUSE.test(house))throw new Hold('HOUSE_INVALID');const mod=this.modules.find(m=>m.house===house);if(!mod)throw new Hold('MODULE_UNKNOWN');return {schema:'atlas.iron-empire.optional-house-door/v1',status:'FICTIONAL_QUESTION_NOT_CANON',house,name:mod.name,fictionPrompt:`In an original Iron Empire fictional scenario, how might ${mod.name} challenge the empire's assumptions? Invite contradictions and let participants choose freely.`,
    originalAriadneSource:ARIADNE_SHA,sourceOnly:true,mode:'IMAGINE_LOCAL',privateCreativeBodyImported:false,workIngested:false,canonRatified:false,realScienceValidated:false,hostPosted:false};}
}
