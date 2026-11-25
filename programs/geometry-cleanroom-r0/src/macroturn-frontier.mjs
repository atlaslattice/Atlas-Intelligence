/**
 * META145-facing *review-only* MacroTurn evolution: rank candidate work packets,
 * not knowledge nodes. No autonomous scheduler, no campaign ledger writes.
 * Scores are declared heuristic priorities, NEVER learned relevance or grants.
 */
import {types as utilTypes} from 'node:util';
const HEX=/^[a-f0-9]{64}$/;
const STATES=new Set(['SOURCE_PINNED_LOCAL','SOURCE_MISSING','RIGHTS_UNKNOWN','BLOCKED']);
const RISKS=new Map([['NUMERICAL_CANCEL',8],['RANK_NEAR_TIE',7],['SOURCE_CONTEXT_DIVERGENCE',7],['MISSING_NEGATIVE',9],['RIGHTS_NOT_ATTESTED',9],['NO_HELDOUT_LABELS',6],['CULTURAL_UNREVIEWED',5],['MISSING_SOURCE',8],['UNKNOWN_OPERATOR',5]]);
const hold=r=>Object.freeze({schema:'atlas.macroturn.review-frontier/v1',status:'HOLD',reason:r,macroturnCredit:0,executionAuthorized:false});
function record(x,fields){if(!x||typeof x!=='object'||Array.isArray(x)||utilTypes.isProxy(x)||Object.getPrototypeOf(x)!==Object.prototype)throw Error('BAD_OBJECT');const d=Object.getOwnPropertyDescriptors(x),keys=Reflect.ownKeys(d);if(keys.length!==fields.length||keys.some(k=>typeof k!=='string'||!fields.includes(k)))throw Error('BAD_FIELDS');const o={};for(const k of fields){if(!d[k]||!Object.hasOwn(d[k],'value')||!d[k].enumerable)throw Error('ACCESSOR');o[k]=d[k].value;}return o;}
function array(x,max){if(!Array.isArray(x)||utilTypes.isProxy(x)||x.length>max)throw Error('BAD_ARRAY');const d=Object.getOwnPropertyDescriptors(x);if(Reflect.ownKeys(d).length!==x.length+1)throw Error('SPARSE');return Array.from({length:x.length},(_,i)=>{if(!d[i]||!Object.hasOwn(d[i],'value'))throw Error('GETTER');return d[i].value;});}
export function compareMacroturnFrontiers(input){
 try{
 const x=record(input,['packets','sourceSnapshotSha256','verifiedPredecessorIds','maxCostUnits']);
 if(typeof x.sourceSnapshotSha256!=='string'||!HEX.test(x.sourceSnapshotSha256)||!Number.isInteger(x.maxCostUnits)||x.maxCostUnits<1||x.maxCostUnits>100)throw Error('BAD_SNAPSHOT');
 const done=array(x.verifiedPredecessorIds,50);
 if(done.some(id=>typeof id!=='string'||!/^GEO50-MT-\d{2}$/.test(id))||new Set(done).size!==done.length)throw Error('BAD_PREDECESSOR');
 const completed=new Set(done),packets=array(x.packets,50).map(raw=>{
  const p=record(raw,['id','sourceSha256','sourceState','dependencies','estimatedCostUnits','riskCodes','peerReviewSignal']);
  if(typeof p.id!=='string'||!/^GEO50-MT-\d{2}$/.test(p.id)||typeof p.sourceSha256!=='string'||!HEX.test(p.sourceSha256)||!STATES.has(p.sourceState)||
    !Number.isInteger(p.estimatedCostUnits)||p.estimatedCostUnits<1||p.estimatedCostUnits>100||!Number.isInteger(p.peerReviewSignal)||p.peerReviewSignal<0||p.peerReviewSignal>3)throw Error('BAD_PACKET');
  const dep=array(p.dependencies,50),risks=array(p.riskCodes,12);
  if(dep.some(id=>typeof id!=='string'||!/^GEO50-MT-\d{2}$/.test(id))||risks.some(r=>!RISKS.has(r))||new Set(dep).size!==dep.length||new Set(risks).size!==risks.length)throw Error('BAD_DEPENDENCY_OR_RISK');
  const reasons=[];if(p.sourceState!=='SOURCE_PINNED_LOCAL')reasons.push('UNAVAILABLE_SOURCE_OR_RIGHTS');
  if(dep.some(id=>!completed.has(id)))reasons.push('DEPENDENCY_NOT_VERIFIED');
  if(p.estimatedCostUnits>x.maxCostUnits)reasons.push('OVER_BUDGET');
  const high=Math.max(0,...risks.map(code=>RISKS.get(code)));
  return Object.freeze({id:p.id,sourceSha256:p.sourceSha256,eligible:reasons.length===0,reasons:Object.freeze(reasons),
    estimatedCostUnits:p.estimatedCostUnits,riskCodes:Object.freeze(risks),peerReviewSignal:p.peerReviewSignal,
    priority:Number(((high*2+p.peerReviewSignal)/p.estimatedCostUnits).toFixed(6)),
    scoreMeaning:'HEURISTIC_FOR_REVIEW_NOT_NEURAL_RANKING'});
 });
 if(new Set(packets.map(p=>p.id)).size!==packets.length)throw Error('DUPLICATE_PACKET_ID');
 const eligible=packets.filter(p=>p.eligible);
 const fifo=eligible.length?eligible[0].id:null;
 const improved=eligible.slice().sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id))[0]?.id??null;
 return Object.freeze({schema:'atlas.macroturn.review-frontier/v1',status:'CANDIDATE_SELECTION_ONLY',sourceSnapshotSha256:x.sourceSnapshotSha256,
    originalOrderBaseline:fifo,adversarialEvidencePriority:improved,packets:Object.freeze(packets),
    selectedPacketIsExecuted:false,verifiedPredecessorIdentitiesHostAttested:false,
    methodImprovementMeasured:false,macroturnCredit:0,executionAuthorized:false,schedulerCreated:false,
    modelUpdated:false,authorityEffect:'NONE'});
 }catch(e){return hold(String(e.message).slice(0,100));}
}
