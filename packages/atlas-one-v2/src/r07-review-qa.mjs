/** SWARMCAST v36 R07 QA: read-only Workboard retry + quantum baseline.
 * Original implementation; no network, broker write, identity, or CANON authority.
 */
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';

export const SCHEMA='atlas.swarmcast.r07-qa/v1';
export const ARIADNE_SHA='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
export const R07_COORD='H01.S07.N12';
const ID=/^[A-Za-z0-9_-]{3,80}$/;
const SHA=/^[a-f0-9]{64}$/;
const GIT_COMMIT=/^[a-f0-9]{40}$/;
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const hex=x=>typeof x==='string'&&SHA.test(x);
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=reason=>({schema:SCHEMA,status:'HOLD',reason,sourceVerified:false,hostAuthenticated:false,canPublish:false,canonEffect:'NONE'});

/** UI helper: never send an empty or duplicated selection to the host tool. */
export function normalizeSelection(roomId,selectedItemIds){
  if(typeof roomId!=='string'||!ID.test(roomId)||!Array.isArray(selectedItemIds))return fail('INVALID_SELECTION');
  if(selectedItemIds.length===0)return {schema:SCHEMA,status:'EMPTY_SELECTION_NO_REQUEST',next:'CHOOSE_WORK_CARD',hostCallPerformed:false};
  if(selectedItemIds.length>32||selectedItemIds.some(x=>typeof x!=='string'||!ID.test(x))||new Set(selectedItemIds).size!==selectedItemIds.length)return fail('INVALID_SELECTION');
  return {schema:SCHEMA,status:'READY_TO_READ_SELECTED_WORK_CARDS',roomId,selectedItemIds:[...selectedItemIds],hostCallPerformed:false,authorityEffect:'NONE'};
}

/** An account-scoped host projection is data, never a proof of current rights.
 * Avoid interpolating raw Work record bodies into stable identity or return output.
 */
function inspectProjectionInner(result){
  if(!obj(result))return fail('REVIEW_UNAVAILABLE_RETRY_FRESH_READ');
  const sel=result.selection,p=result.projection?.provenance,s=result.projection?.snapshot;
  const receipt=result.receipt;
  if(result.schema!=='atlas.native-whiteboard.v1'||!obj(sel)||!obj(p)||!obj(s)||!obj(receipt)
    ||receipt.sourceKind!=='authorized-workspace'||!hex(receipt.bindingSha256))return fail('INVALID_SOURCE_PROJECTION');
  const norm=normalizeSelection(sel.roomId,sel.selectedItemIds);
  if(norm.status!=='READY_TO_READ_SELECTED_WORK_CARDS')return fail('INVALID_SOURCE_PROJECTION');
  if(p.schema!=='atlas.whiteboard.projection.candidate.v1'||!obj(p.source)||p.source.roomId!==sel.roomId
    ||p.source.roomKind!=='work'||!Array.isArray(p.source.selectedItemIds)
    ||JSON.stringify(p.source.selectedItemIds)!==JSON.stringify(sel.selectedItemIds)
    ||!Number.isSafeInteger(p.source.observedThroughSeq)||p.source.observedThroughSeq<0
    ||s.version!==p.source.observedThroughSeq||typeof s.reviewId!=='string'||!ID.test(s.reviewId)
    ||!hex(p.normalizedProjectionSha256)||!hex(p.documentSha256)||!hex(p.originalSelectedRecordsSha256)
    ||!obj(p.capabilities)||p.capabilities.readOnly!==true||p.capabilities.posts!==false||p.capabilities.grants!==false
    ||!Array.isArray(p.items)||p.items.length!==sel.selectedItemIds.length||!Array.isArray(p.origins)
    ||!Array.isArray(s.document))return fail('INVALID_SOURCE_PROJECTION');
  const selected=new Map();let revisionCount=0;
  for(const item of p.items){
    if(!obj(item)||typeof item.itemId!=='string'||!sel.selectedItemIds.includes(item.itemId)||selected.has(item.itemId)
      ||!Array.isArray(item.revisionSeqs)||item.revisionSeqs.length<1
      ||!Array.isArray(item.tipSeqs)||item.tipSeqs.length<1)return fail('INVALID_SOURCE_PROJECTION');
    const seqs=item.revisionSeqs;
    if(seqs.some(x=>!Number.isSafeInteger(x)||x<=0||x>p.source.observedThroughSeq)
      ||new Set(seqs).size!==seqs.length
      ||item.tipSeqs.some(x=>!seqs.includes(x)))return fail('INVALID_SOURCE_PROJECTION');
    selected.set(item.itemId,{itemId:item.itemId,tipSeqs:[...item.tipSeqs].sort((a,b)=>a-b),revisionSeqs:[...seqs].sort((a,b)=>a-b)});
    revisionCount+=seqs.length;
  }
  if(selected.size!==sel.selectedItemIds.length)return fail('INVALID_SOURCE_PROJECTION');
  const origins=new Set();
  for(const v of p.origins){
    const origin=v?.origin;
    if(!obj(origin)||origin.roomId!==sel.roomId||!selected.has(origin.itemId)
      ||!selected.get(origin.itemId).revisionSeqs.includes(origin.seq)||typeof origin.requestId!=='string'
      ||origin.requestId.length<3||origin.requestId.length>80)return fail('INVALID_SOURCE_PROJECTION');
    origins.add(origin.itemId+'\0'+origin.seq);
  }
  if(origins.size!==revisionCount)return fail('INVALID_SOURCE_PROJECTION');
  const items=[...selected.values()].sort((a,b)=>a.itemId.localeCompare(b.itemId));
  // No capture time, transient binding, source record body, or changing room watermark in the revision key.
  const sourceRevisionKey=sha({roomId:sel.roomId,items,originalSelectedRecordsSha256:p.originalSelectedRecordsSha256,
    originRefs:[...origins].sort()});
  const hostBuild=p.source.sourceCut?.builtSourceCommit;
  if(typeof hostBuild!=='string'||!GIT_COMMIT.test(hostBuild))return fail('INVALID_SOURCE_PROJECTION');
  return {schema:SCHEMA,status:'SOURCE_PROJECTION_OBSERVED_NOT_ATTESTED',roomId:sel.roomId,
    itemCount:items.length,items,roomCaptureWatermark:s.version,reviewId:s.reviewId,hostBuild,
    sourceRevisionKey,viewSha256:p.normalizedProjectionSha256,documentSha256:p.documentSha256,
    bindingIsEphemeral:true,bindingFingerprint:receipt.bindingSha256,
    sourceVerified:false,hostAuthenticated:false,canPublish:false,canonEffect:'NONE',
    noRecordBodiesReturned:true};
}

export function inspectProjection(result){
  try{return inspectProjectionInner(result);}catch{return fail('INVALID_SOURCE_PROJECTION');}
}

/** Retry vs stale/change distinctions, without asserting host ACL or current access. */
export function compareReviewReads(first,second){
  const a=inspectProjection(first),b=inspectProjection(second);
  if(a.status!=='SOURCE_PROJECTION_OBSERVED_NOT_ATTESTED'||b.status!=='SOURCE_PROJECTION_OBSERVED_NOT_ATTESTED')
    return fail('REVIEW_UNAVAILABLE_RETRY_FRESH_READ');
  if(a.roomId!==b.roomId||JSON.stringify(a.items.map(x=>x.itemId))!==JSON.stringify(b.items.map(x=>x.itemId)))
    return fail('DIFFERENT_SELECTION_NOT_COMPARABLE');
  const common={schema:SCHEMA,roomId:a.roomId,sourceRevisionKey:b.sourceRevisionKey,hostAuthenticated:false,
    canPublish:false,sourceVerified:false,canonEffect:'NONE'};
  if(a.hostBuild!==b.hostBuild)return {...common,status:'HOST_BUILD_CHANGED_RECHECK_REQUIRED'};
  if(a.sourceRevisionKey!==b.sourceRevisionKey)return {...common,status:'REVISION_CHANGED_REVIEW_AGAIN'};
  if(a.viewSha256!==b.viewSha256||a.documentSha256!==b.documentSha256)return {...common,status:'PRESENTATION_CHANGED_RECHECK_SOURCE'};
  if(a.roomCaptureWatermark!==b.roomCaptureWatermark)return {...common,status:'SAME_REVISIONS_NEW_ROOM_CAPTURE'};
  return {...common,status:'SAME_REVISIONS_RETRY',bindingChanged:a.bindingFingerprint!==b.bindingFingerprint,
    note:'Binding SHA is per-read and is never a durable revision ID.'};
}

/** Cross-tool R07 source alignment. Statements in the message are not re-validated scientific results. */
function inspectR07HandoffInner({message,trace,review,node}={}){
  if(!obj(message)||!obj(trace)||!obj(review)||!obj(node))return fail('R07_EVIDENCE_UNAVAILABLE');
  const roomId=message.roomId,seq=message.seq,requestId=message.requestId;
  if(typeof roomId!=='string'||!ID.test(roomId)||!Number.isSafeInteger(seq)||seq<1
    ||typeof requestId!=='string'||requestId.length<3||requestId.length>80
    ||trace.found!==true||trace.source?.source?.roomId!==roomId||trace.source?.source?.seq!==seq
    ||trace.source?.source?.requestId!==requestId
    ||review.sourceId!==`swarmchat-work/${roomId}/${seq}`||review.seq!==seq
    ||review.identityStatus!=='SELF_DECLARED_NOT_RESIDENT_AUTHENTICATED'
    ||review.evidenceStatus!=='DECLARED_NOT_REPRODUCED_BY_THIS_TOOL'
    ||review.canonicalEffect!==false||review.codeDeployed!==false
    ||node.hsn!==R07_COORD||node.kindOfNode!=='DOMAIN_SPECIALIZATION'
    ||node.registry?.sha256!==ARIADNE_SHA||!hex(node.nodeRecordSha256))return fail('R07_LINEAGE_OR_EDITION_MISMATCH');
  if(!Array.isArray(trace.related)||trace.related.length>20)return fail('R07_LINEAGE_OR_EDITION_MISMATCH');
  const references=trace.related.map(x=>x?.source?.seq).filter(Number.isSafeInteger);
  return {schema:SCHEMA,status:'R07_SOURCE_TRAIL_LINKED_NOT_INDEPENDENTLY_REPRODUCED',
    roomId,seq,requestId,coordinate:R07_COORD,nodeRecordSha256:node.nodeRecordSha256,
    references:[...new Set(references)].sort((a,b)=>a-b),
    reviewDisposition:review.disposition,sourceEdition:'Ariadne v0.7',
    sourceVerified:false,hostAuthenticated:false,scientificResultVerified:false,
    canPublish:false,canonEffect:'NONE',contentCopied:false};
}

export function inspectR07Handoff(input){
  try{return inspectR07HandoffInner(input);}catch{return fail('R07_LINEAGE_OR_EDITION_MISMATCH');}
}

// Independent classical, real-valued two-qubit density-matrix reference.
// Two observables x 16 rho_ij * observable_ji terms = exactly 32 terms/state.
export const R07_CASES=Object.freeze(['BELL_PHI_PLUS','DEPHASED_MIXTURE','BELL_PHI_MINUS']);
export function densityMatrix(caseId){
  if(!R07_CASES.includes(caseId))return null;
  const rho=Array.from({length:4},()=>[0,0,0,0]);
  rho[0][0]=rho[3][3]=0.5;
  const sign=caseId==='DEPHASED_MIXTURE'?0:(caseId==='BELL_PHI_PLUS'?1:-1);
  rho[0][3]=rho[3][0]=sign*0.5;
  return rho;
}
const PAULI_ZZ=Object.freeze([[1,0,0,0],[0,-1,0,0],[0,0,-1,0],[0,0,0,1]]);
const PAULI_XX=Object.freeze([[0,0,0,1],[0,0,1,0],[0,1,0,0],[1,0,0,0]]);
export function traceProduct(rho,operator){
  let sum=0,terms=0;
  for(let i=0;i<4;i++)for(let j=0;j<4;j++){
    sum+=rho[i][j]*operator[j][i];terms++;
  }
  return {value:sum,terms};
}
export function verifyQuantumBaseline({selectedCases=R07_CASES,expectedTermsPerCase=32}={}){
  if(!Array.isArray(selectedCases)||selectedCases.length===0)return {schema:SCHEMA,status:'EMPTY_CASE_SELECTION_NO_COMPARISON',passed:0,modelCalls:0};
  if(selectedCases.length>3||selectedCases.some(x=>!R07_CASES.includes(x))||new Set(selectedCases).size!==selectedCases.length)
    return fail('INVALID_REFERENCE_SELECTION');
  if(expectedTermsPerCase!==32)return fail('UNEQUAL_OPERATION_BUDGET_NOT_COMPARABLE');
  const expectations={BELL_PHI_PLUS:{zz:1,xx:1},DEPHASED_MIXTURE:{zz:1,xx:0},BELL_PHI_MINUS:{zz:1,xx:-1}};
  const results=[];
  for(const caseId of selectedCases){
    const rho=densityMatrix(caseId),zz=traceProduct(rho,PAULI_ZZ),xx=traceProduct(rho,PAULI_XX),wanted=expectations[caseId];
    const passed=zz.value===wanted.zz&&xx.value===wanted.xx&&zz.terms+xx.terms===32;
    results.push({caseId,zz:zz.value,xx:xx.value,traceTerms:zz.terms+xx.terms,passed});
  }
  return {schema:SCHEMA,status:results.every(x=>x.passed)?'CLASSICAL_LOCAL_REFERENCE_PASS':'REFERENCE_MISMATCH',
    cases:results,passed:results.filter(x=>x.passed).length,
    comparisonHash:sha(results),modelCalls:0,hardwareCalls:0,scientificAdvantageClaimed:false,
    hostAuthenticated:false,canPublish:false,canonEffect:'NONE'};
}
export function benchmarkClassicalReference({repeats=2000}={}){
  if(!Number.isSafeInteger(repeats)||repeats<1||repeats>100000)return fail('INVALID_BENCHMARK_REPEATS');
  const startHeap=process.memoryUsage().heapUsed,start=performance.now();let checksum=0;
  for(let n=0;n<repeats;n++)for(const c of R07_CASES){const rho=densityMatrix(c);checksum+=traceProduct(rho,PAULI_ZZ).value+traceProduct(rho,PAULI_XX).value;}
  return {schema:SCHEMA,status:'LOCAL_CLASSICAL_MICROBENCHMARK_ONLY',repeats,statesPerRepeat:3,
    totalTraceTerms:repeats*3*32,checksum,elapsedMs:performance.now()-start,
    observedHeapDeltaBytes:process.memoryUsage().heapUsed-startHeap,
    timingIsNotHostLatency:true,notHardware:true,notQuantumAdvantage:true,modelCalls:0};
}
