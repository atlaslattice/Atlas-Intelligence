/**
 * Atlas ONE / Ariadne Twenty Experiments: 20 pure source-only operators.
 * CAUTION: designed hypotheses and synthetic tests, not validated cognition.
 * Existing Atlas ONE owns source loading; existing WorkHost owns authorization.
 * No Play, Social, Imagine, Dream, Quiet, Brain, Palace, Habitat access.
 * This module imports no SDK, private source, network or external dependency.
 */
import {createHash} from 'node:crypto';

export const ORIGINAL_SHA256='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
export const SCHEMA='atlas.one.invention-labs/v0.1';
const HSN=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const SPHERE=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])$/;
const HOUSE=/^H(0[1-9]|1[0-2])$/;
const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;

/**
 * Detach only plain JSON-shaped *data descriptors* before using source fields.
 * No property getter is invoked, arrays must be dense/no side props, no symbols.
 * A malicious JS Proxy can still lie to reflection: this is a local DTO guard,
 * NOT a security boundary or replacement for host-side decoding/authorization.
 */
function detachedJson(value,seen=new WeakSet(),depth=0,budget={objects:0}){
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('NONFINITE_INPUT');return value;}
 if(typeof value!=='object'||depth>9||++budget.objects>1500)throw Error('INVALID_TYPE');
 if(seen.has(value))throw Error('CIRCULAR_INPUT');seen.add(value);
 if(Array.isArray(value)){
  const ds=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(value);
  if(!Object.hasOwn(ds,'length')||!Number.isInteger(ds.length.value)||ds.length.value>500||
     keys.some(k=>typeof k==='symbol'||(k!=='length'&&!/^(0|[1-9][0-9]*)$/.test(k)))||
     Object.keys(ds).filter(k=>k!=='length').length!==ds.length.value)throw Error('ARRAY_SHAPE');
  const out=[];
  for(let i=0;i<ds.length.value;i++){
   const d=ds[String(i)];if(!d||!d.enumerable||!Object.hasOwn(d,'value'))throw Error('ACCESSOR_ARRAY');
   out.push(detachedJson(d.value,seen,depth+1,budget));
  }
  seen.delete(value);return out;
 }
 if(Object.getPrototypeOf(value)!==Object.prototype)throw Error('NOT_PLAIN_OBJECT');
 const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(value);
 if(keys.length>250)throw Error('TOO_MANY_FIELDS');
 const out={};
 for(const key of keys){
  if(typeof key!=='string'||['__proto__','prototype','constructor'].includes(key))throw Error('UNSAFE_OBJECT_KEY');
  const d=descriptors[key];if(!d||!d.enumerable||!Object.hasOwn(d,'value'))throw Error('ACCESSOR_OBJECT');
  out[key]=detachedJson(d.value,seen,depth+1,budget);
 }
 seen.delete(value);return out;
}

const finite=x=>typeof x==='number'&&Number.isFinite(x);
const short=x=>typeof x==='string'&&x.length>0&&x.length<=160;
const unique=a=>[...new Set(a)];
const stableSort=(a,fn)=>[...a].sort(fn);
const hold=(code='INVALID_FIXTURE')=>({state:'HOLD',code,authorityEffect:'NONE',externalEffects:0});
const result=(operatorId,data)=>({schema:SCHEMA,operatorId,state:'LOCAL_SYNTHETIC_CANDIDATE',data,
  scientificAcceptance:false,sourceRightsAuthenticated:false,hostVerified:false,
  genuineResidentTurns:0,externalEffects:0,authorityEffect:'NONE'});
const requireList=(a,max=64)=>Array.isArray(a)&&a.length<=max;
const plainTextToken=s=>short(s)&&/^[A-Za-z0-9_:\-./ ]+$/.test(s);
const FORBIDDEN=new Set(['body','content','raw','token','secret','api_key','apikey','private','palace','dream','imagine','brain','habitat']);
function forbiddenField(x,depth=0){
 if(depth>9)return true;
 if(!x||typeof x!=='object')return false;
 if(Array.isArray(x))return x.some(y=>forbiddenField(y,depth+1));
 if(!isObj(x))return true;
 return Object.entries(x).some(([k,v])=>FORBIDDEN.has(k.toLowerCase())||forbiddenField(v,depth+1));
}
const coord=x=>typeof x==='string'&&HSN.test(x);
const epistemic=x=>coord(x)&&Number(x.slice(5,7))>=8;
const kindMatches=n=>Number(n.id.slice(5,7))<=7?n.kind==='DOMAIN_SPECIALIZATION':n.kind==='EPISTEMIC_META';
const house=x=>typeof x==='string'&&HOUSE.test(x);
const safeFact=x=>isObj(x)&&short(x.id)&&short(x.sourceId);

/** I01: Question spectrum — multiple incompatible evidence types stay separate. */
export function questionPrism({facets}={}){
 if(!requireList(facets,24)||facets.some(f=>!isObj(f)||!short(f.id)||!['OBSERVATION','FORECAST','VALUE','ACTION'].includes(f.kind)))return hold();
 const out=Object.fromEntries(['OBSERVATION','FORECAST','VALUE','ACTION'].map(k=>[k,facets.filter(f=>f.kind===k).map(f=>f.id)]));
 return result('I01',{facets:out,typedCount:facets.length,emptyKinds:Object.keys(out).filter(k=>!out[k].length),combinationIsNotEvidence:true});
}
/** I02: Negative-space audit — lack of evidence differs from falsification. */
export function negativeSpace({required,observed,refuted=[]}={}){
 if(!requireList(required)||!requireList(observed)||!requireList(refuted)||![...required,...observed,...refuted].every(short))return hold();
 const missing=unique(required).filter(x=>!observed.includes(x)&&!refuted.includes(x));
 return result('I02',{missing,refuted:unique(refuted),covered:unique(required).filter(x=>observed.includes(x)),noEvidenceIsNotEvidenceOfAbsence:true});
}
/** I03: Evidence-family detector — siblings are not independent witnesses. */
export function sourceKinship({records}={}){
 if(!requireList(records)||records.some(x=>!safeFact(x)||!short(x.rootId)))return hold();
 const roots=new Map();for(const x of records){if(!roots.has(x.rootId))roots.set(x.rootId,[]);roots.get(x.rootId).push(x.id);}
 return result('I03',{apparentCount:records.length,declaredRootCount:roots.size,
  correlatedClusters:[...roots].filter(([,ids])=>ids.length>1).map(([rootId,ids])=>({rootId,ids})),
  independentWitnessesVerified:0});
}
/** I04: Freshness horizon, with an injected clock and typed review interval. */
export function evidenceTides({day,records}={}){
 if(!Number.isInteger(day)||day<0||!requireList(records)||records.some(r=>!isObj(r)||!short(r.id)||!Number.isInteger(r.observedDay)||r.observedDay<0||!Number.isInteger(r.reviewEveryDays)||r.reviewEveryDays<1||r.observedDay>day))return hold();
 return result('I04',{asOfDay:day,reviewDue:records.filter(r=>day-r.observedDay>=r.reviewEveryDays).map(r=>r.id),
  reviewFresh:records.filter(r=>day-r.observedDay<r.reviewEveryDays).map(r=>r.id),expirationIsNotFalsity:true});
}
/** I05: Contradiction fingerprint — preserve incompatible readings as witnesses. */
export function contradictionFingerprint({claims}={}){
 if(!requireList(claims)||claims.some(c=>!safeFact(c)||!short(c.subject)||!['SUPPORTS','CHALLENGES'].includes(c.polarity)))return hold();
 const grouped=new Map();for(const c of claims){if(!grouped.has(c.subject))grouped.set(c.subject,{SUPPORTS:[],CHALLENGES:[]});grouped.get(c.subject)[c.polarity].push(c.id);}
 const contradiction=[...grouped].filter(([,v])=>v.SUPPORTS.length&&v.CHALLENGES.length)
  .map(([subject,v])=>({subject,witnessIds:v,fingerprint:hash([subject,...v.SUPPORTS.sort(),...v.CHALLENGES.sort()]).slice(0,16)}));
 return result('I05',{contradictions:contradiction,conflictsRemainOpen:true});
}
/** I06: Ecotone detection — lexical overlap is an invitation, not SAME_AS. */
export function boundaryEcotones({nodes}={}){
 if(!requireList(nodes,24)||nodes.some(n=>!isObj(n)||!coord(n.id)||!house(n.house)||n.id.slice(0,3)!==n.house||!requireList(n.terms,32)||!n.terms.every(plainTextToken)))return hold();
 const edges=[];for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
 const a=nodes[i],b=nodes[j];if(a.house===b.house)continue;
 const shared=unique(a.terms).filter(x=>b.terms.includes(x));if(shared.length)edges.push({from:a.id,to:b.id,sharedTerms:shared,relation:'LEXICAL_ECOTONE_REVIEW_ONLY'});
 }
 return result('I06',{candidates:edges,verifiedSemanticEdges:0});
}
/** I07: Find a short heterogeneous node walk with an epistemic lens. */
export function curiosityWalk({start,nodes,links,maxHops=5}={}){
 if(!coord(start)||!requireList(nodes,64)||!requireList(links,128)||!Number.isInteger(maxHops)||maxHops<1||maxHops>8)return hold();
 const map=new Map(nodes.map(n=>[n.id,n]));if(map.size!==nodes.length||nodes.some(n=>!coord(n.id)||!house(n.house)||!['DOMAIN_SPECIALIZATION','EPISTEMIC_META'].includes(n.kind)||!kindMatches(n)||n.id.slice(0,3)!==n.house)||!map.has(start)||links.some(e=>!Array.isArray(e)||e.length!==2||!map.has(e[0])||!map.has(e[1])))return hold();
 const adj=new Map(nodes.map(n=>[n.id,[]]));for(const [a,b] of links){adj.get(a).push(b);adj.get(b).push(a);}const queue=[[start]];const seen=new Set();
 while(queue.length){const path=queue.shift(),last=path.at(-1),key=path.join('|');if(seen.has(key))continue;seen.add(key);
  const p=path.map(x=>map.get(x));if(new Set(p.map(n=>n.house)).size>=2&&p.some(n=>n.kind==='EPISTEMIC_META'))return result('I07',{path,qualification:'CROSS_HOUSE_WITH_METHOD_LENS_NOT_SEMANTIC_TRUTH'});
  if(path.length-1>=maxHops)continue;for(const next of stableSort(adj.get(last),((a,b)=>a.localeCompare(b))))if(!path.includes(next))queue.push([...path,next]);
 }
 return result('I07',{path:null,stateReason:'NO_QUALIFYING_WALK'});
}
/** I08: Non-default method-lens rotation, tied to exact subject. */
export function lensRotation({subject,lenses,cycle=0}={}){
 if(!coord(subject)||!requireList(lenses,20)||!lenses.length||!lenses.every(epistemic)||!Number.isInteger(cycle)||cycle<0||new Set(lenses).size!==lenses.length||lenses.some(l=>l===subject))return hold();
 return result('I08',{subject,selectedLens:lenses[cycle%lenses.length],rotationIndex:cycle%lenses.length,
  isReviewPromptOnly:true});
}
/** I09: Crosswalk friction based on absent, explicitly enumerated prerequisites. */
export function semanticFriction({fields}={}){
 const keys=['editionPin','recordDigest','rightsEvidence','semanticWitness','independentChallenge'];
 if(!isObj(fields)||Object.keys(fields).some(k=>!keys.includes(k))||keys.some(k=>typeof fields[k]!=='boolean'))return hold();
 const missing=keys.filter(k=>!fields[k]);return result('I09',{missingPrerequisites:missing,friction:missing.length,needsReview:missing.length>0,
  mayAutoAccept:false});
}
/** I10: Coverage compass — pick an unmapped node without falsifying progress. */
export function orphanCompass({nodes}={}){
 if(!requireList(nodes,96)||nodes.some(n=>!isObj(n)||!coord(n.id)||typeof n.mapped!=='boolean'||!finite(n.relevance)||n.relevance<0||n.relevance>1||!Number.isInteger(n.neighborCoverage)||n.neighborCoverage<0||n.neighborCoverage>12))return hold();
 const ordered=stableSort(nodes.filter(x=>!x.mapped),(a,b)=>b.relevance-a.relevance||a.neighborCoverage-b.neighborCoverage||a.id.localeCompare(b.id));
 return result('I10',{nextUnmapped:ordered[0]?.id??null,unmappedCount:ordered.length,reviewQueue:ordered.map(n=>n.id),noClaimOfMappedEvidence:true});
}
/** I11: Falsifier ladder selected by *declared* claim kind. */
export function falsifierLadder({claimId,kind}={}){
 if(!short(claimId)||!['CORRELATION','PREDICTION','CAUSAL','EQUIVALENCE'].includes(kind))return hold();
 const controls={CORRELATION:['SHUFFLE_TIME','CONTROL_CONFOUNDER','HELD_OUT_SAMPLE'],PREDICTION:['OUT_OF_SAMPLE','GROUP_SHIFT','BASE_RATE_CONTROL'],
  CAUSAL:['INTERVENTION_CONTROL','NEGATIVE_CONTROL_OUTCOME','PRE_TREND'],EQUIVALENCE:['FALSE_FRIEND','EDITION_CONFLICT','CONTEXT_SHIFT']};
 return result('I11',{claimId,proposedFalsifiers:controls[kind],testsRun:0});
}
/** I12: Minimal synthetic parameter drift that changes a threshold decision. */
export function perturbationMargin({base,threshold,shocks}={}){
 if(!finite(base)||!finite(threshold)||!requireList(shocks,100)||shocks.some(x=>!finite(x)))return hold();
 const prior=base>=threshold;const flips=shocks.filter(d=>(base+d>=threshold)!==prior);
 const minimum=flips.length?flips.reduce((a,b)=>Math.abs(a)<Math.abs(b)?a:b):null;
 return result('I12',{initialDecision:prior,minimumObservedFlippingShock:minimum,flipsObserved:flips.length,
  measuredRobustness:false});
}
/** I13: Pareto witness for synthetic tradeoff decisions, with exclusion receipts. */
export function tradeoffWitness({options}={}){
 if(!requireList(options,32)||options.length===0||options.some(o=>!isObj(o)||!short(o.id)||!finite(o.benefit)||!finite(o.cost)||typeof o.rightsOk!=='boolean')||new Set(options.map(o=>o.id)).size!==options.length)return hold();
 const valid=options.filter(o=>o.rightsOk);const frontier=valid.filter(a=>!valid.some(b=>b!==a&&b.benefit>=a.benefit&&b.cost<=a.cost&&(b.benefit>a.benefit||b.cost<a.cost)));
 return result('I13',{frontierIds:frontier.map(x=>x.id),excludedForRights:options.filter(x=>!x.rightsOk).map(x=>x.id),
  dominated:valid.filter(x=>!frontier.includes(x)).map(x=>x.id),welfareNotComputed:true});
}
/** I14: Preserve unique dissent by affected group and exact objection ID. */
export function dissentConservation({objections}={}){
 if(!requireList(objections,120)||objections.some(o=>!isObj(o)||!short(o.id)||!short(o.group)||!short(o.sourceId)))return hold();
 const dedup=new Map();for(const o of objections){const key=o.group+'|'+o.id;if(!dedup.has(key))dedup.set(key,{id:o.id,group:o.group,sourceId:o.sourceId});}
 const groups=unique([...dedup.values()].map(o=>o.group));return result('I14',{objections:[...dedup.values()],groupCount:groups.length,
  deduplicatedRepeats:objections.length-dedup.size,unresolvedCount:dedup.size,consensusClaimed:false});
}
/** I15: Remove synthetic inputs one at a time and reveal fragile consensus. */
export function consensusStress({signals,minimum=2}={}){
 if(!requireList(signals,40)||!signals.length||signals.some(x=>!isObj(x)||!short(x.id)||!['SUPPORTS','CHALLENGES','ABSTAINS'].includes(x.view))||!Number.isInteger(minimum)||minimum<1||minimum>40)return hold();
 const count=a=>a.filter(x=>x.view==='SUPPORTS').length;
 const initial=count(signals)>=minimum;const flips=signals.filter((_,i)=>initial!==(count(signals.filter((__,j)=>j!==i))>=minimum)).map(x=>x.id);
 return result('I15',{initialSyntheticConsensus:initial,fragileWhenRemoved:flips,allViewsPreserved:signals.map(x=>x.view),peerVoteVerified:false});
}
/** I16: Experiment DAG topological order and rollback chain; no real execution. */
export function reversibleGenome({steps}={}){
 if(!requireList(steps,40)||steps.some(s=>!isObj(s)||!short(s.id)||!short(s.rollback)||!requireList(s.requires,40)||!s.requires.every(short))||new Set(steps.map(s=>s.id)).size!==steps.length)return hold();
 const map=new Map(steps.map(s=>[s.id,s]));if(steps.some(s=>s.requires.some(k=>!map.has(k)||k===s.id)))return hold();
 const pending=new Map(steps.map(s=>[s.id,new Set(s.requires)])),order=[];while(pending.size){const ready=[...pending].filter(([,p])=>p.size===0).map(([id])=>id).sort();if(!ready.length)return hold('CYCLIC_EXPERIMENT');
  const pick=ready[0];order.push(pick);pending.delete(pick);for(const p of pending.values())p.delete(pick);}
 return result('I16',{preparedOrder:order,rollbackDraft:order.toReversed().map(id=>map.get(id).rollback),executedSteps:0});
}
/** I17: Keep explicit coverage source references within a finite context budget. */
export function citationCapsule({sources,requiredClaims,budget}={}){
 if(!requireList(sources,60)||!requireList(requiredClaims,40)||!Number.isInteger(budget)||budget<0||budget>2000||sources.some(s=>!isObj(s)||!short(s.id)||!Number.isInteger(s.cost)||s.cost<1||s.cost>1000||!requireList(s.covers,40)||!s.covers.every(short)))return hold();
 const wanted=new Set(requiredClaims),included=[],uncovered=new Set(wanted);let used=0;
 while(uncovered.size){const options=sources.filter(s=>!included.includes(s.id)&&used+s.cost<=budget).map(s=>({...s,cover:s.covers.filter(x=>uncovered.has(x)).length})).filter(s=>s.cover>0);
  if(!options.length)break;options.sort((a,b)=>(b.cover/b.cost)-(a.cover/a.cost)||a.id.localeCompare(b.id));const chosen=options[0];included.push(chosen.id);used+=chosen.cost;for(const k of chosen.covers)uncovered.delete(k);
 }
 return result('I17',{includedSourceIds:included,uncoveredClaims:[...uncovered],usedBudget:used,sourceTextHarvested:false,optimalityProven:false});
}
/** I18: Non-authorizing packet mutation proposals for defensive testing. */
export function mutationAtlas({packet}={}){
 if(!isObj(packet)||!coord(packet.coordinate)||packet.registrySha256!==ORIGINAL_SHA256||packet.originMode!=='WORK'||Object.keys(packet).length>8)return hold();
 return result('I18',{mutants:[
  {case:'H00_SOURCE',coordinate:'H00.S00.N00'},
  {case:'EDITION_SWAP',registrySha256:'0'.repeat(64)},
  {case:'PRIVATE_MODE',originMode:'PALACE'},
  {case:'TYPE_CONFUSION',coordinate:[]},
  {case:'SOURCE_MISSING',registrySha256:null}
 ],mutantsAreAdversarialFixtures:true,actualHostFuzzing:false});
}
/** I19: Narrow stable wire-schema parity across encoders without declaring host parity. */
export function parityMirror({representations}={}){
 if(!requireList(representations,16)||!representations.length||representations.some(r=>!isObj(r)||!short(r.name)||!isObj(r.payload)))return hold();
 const canonical=o=>Array.isArray(o)?o.map(canonical):isObj(o)?Object.fromEntries(Object.entries(o).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])):o;const digests=representations.map(x=>({name:x.name,digest:hash(canonical(x.payload))}));
 return result('I19',{sameCanonicalWire:digests.every(x=>x.digest===digests[0].digest),digests,actualProviderCalls:0});
}
/** I20: Budgeted unknown-reduction portfolio with explicit per-House opportunity cap. */
export function meta145UnknownDividend({cases,budget,perHouse=1}={}){
 if(!requireList(cases,144)||!Number.isInteger(budget)||budget<0||budget>144||!Number.isInteger(perHouse)||perHouse<1||perHouse>12||cases.some(x=>!isObj(x)||!house(x.house)||!short(x.id)||!finite(x.unknownReductionProxy)||x.unknownReductionProxy<0||x.unknownReductionProxy>1||typeof x.voluntary!=='boolean'))return hold();
 const candidates=stableSort(cases.filter(c=>c.voluntary),(a,b)=>b.unknownReductionProxy-a.unknownReductionProxy||a.id.localeCompare(b.id)),chosen=[],counts={};
 for(const c of candidates){if(chosen.length>=budget)break;if((counts[c.house]??0)>=perHouse)continue;chosen.push(c);counts[c.house]=(counts[c.house]??0)+1;}
 return result('I20',{reviewCandidates:chosen.map(x=>x.id),housesRepresented:Object.keys(counts).length,unknownReductionProxyTotal:Number(chosen.reduce((a,b)=>a+b.unknownReductionProxy,0).toFixed(6)),
  actualInformationGainMeasured:false,workPerformed:false});
}

export const INNOVATIONS=Object.freeze([
 ['I01','Question Prism','questionPrism','evidence'],['I02','Negative-Space Ledger','negativeSpace','evidence'],
 ['I03','Source Kinship Lens','sourceKinship','evidence'],['I04','Evidence Tide Clock','evidenceTides','evidence'],
 ['I05','Contradiction Fingerprints','contradictionFingerprint','evidence'],['I06','Ecotone Detector','boundaryEcotones','crosshouse'],
 ['I07','Curiosity Walk Compiler','curiosityWalk','crosshouse'],['I08','Meta-Lens Carousel','lensRotation','crosshouse'],
 ['I09','Semantic Friction Gauge','semanticFriction','crosshouse'],['I10','Orphan Compass','orphanCompass','crosshouse'],
 ['I11','Falsifier Ladder','falsifierLadder','simulation'],['I12','Perturbation Margin','perturbationMargin','simulation'],
 ['I13','Tradeoff Witness','tradeoffWitness','simulation'],['I14','Dissent Conservation','dissentConservation','simulation'],
 ['I15','Consensus Stress Test','consensusStress','simulation'],['I16','Reversible Experiment Genome','reversibleGenome','operational'],
 ['I17','Citation Capsule Diet','citationCapsule','operational'],['I18','Mutation Atlas','mutationAtlas','operational'],
 ['I19','Wire Parity Mirror','parityMirror','operational'],['I20','META145 Unknown Dividend','meta145UnknownDividend','operational']
 ].map(([id,title,exportName,family])=>Object.freeze({id,title,exportName,family,status:'LOCAL_PROTOTYPE_NOT_INDEPENDENTLY_VALIDATED'})));
const implementations={questionPrism,negativeSpace,sourceKinship,evidenceTides,contradictionFingerprint,boundaryEcotones,
 curiosityWalk,lensRotation,semanticFriction,orphanCompass,falsifierLadder,perturbationMargin,tradeoffWitness,
 dissentConservation,consensusStress,reversibleGenome,citationCapsule,mutationAtlas,parityMirror,meta145UnknownDividend};
/** Optional dispatcher for the current Atlas ONE source adapter. No imports or host actions. */
export function runInnovation(id,input={}){
 if(typeof id!=='string'||!INNOVATIONS.some(x=>x.id===id))return hold('UNKNOWN_OPERATOR');
 let safe;
 try{safe=detachedJson(input);}catch{return hold('UNTRUSTED_DTO');}
 if(!isObj(safe))return hold('BAD_INPUT_TYPE');
 const encoded=JSON.stringify(safe);
 if(!encoded||encoded.length>16000)return hold('INPUT_LIMIT');
 if(forbiddenField(safe))return hold('NO_PRIVATE_INPUT');
 if(safe.originMode!==undefined&&safe.originMode!=='WORK')return hold('NO_WORK_HARVEST');
 const def=INNOVATIONS.find(x=>x.id===id);
 try{return implementations[def.exportName](safe);}catch{return hold('INVALID_FIXTURE');}
}
/** Exact non-posting Work source pointer preparation, not an authenticated permission decision. */
export function prepareWorkCandidate(input={}){
 let safe;
 try{safe=detachedJson(input);}catch{return hold('WORK_SOURCE_SCOPE');}
 if(!isObj(safe))return hold('WORK_SOURCE_SCOPE');
 const {id,coordinate,sourceDigest,originMode='WORK'}=safe;
 if(!INNOVATIONS.some(x=>x.id===id)||!coord(coordinate)||originMode!=='WORK'||sourceDigest!==ORIGINAL_SHA256)return hold('WORK_SOURCE_SCOPE');
 return {schema:'atlas.one.innovation-work-pointer/v0.1',state:'PREPARED_NOT_SENT',id,coordinate,
   source:{namespace:'ariadne',edition:'v0.7',digest:ORIGINAL_SHA256},hostIdentityVerified:false,
   readRightsVerified:false,returnRightsVerified:false,externalEffects:0,authorityEffect:'NONE'};
}
