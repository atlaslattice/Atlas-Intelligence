/** Atlas META145 v09: 1728 source-bound LOCAL verification slices.
 * No backend, peer authentication, knowledge-gain attestation, source publication,
 * model calls, issuer, privileges, Work writes or CANON change. Existing Atlas
 * Excellence and SwarmChat retain control of source and execution rights.
 */
import {createHash} from 'node:crypto';
import {isVerifiedProgram,EXCELLENCE_PROGRAM_ID,ARIADNE_SOURCE_SHA256} from './excellence-program.mjs';
const SHA=/^[0-9a-f]{64}$/;
const NODE=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const TASK=/^EX\.W(0[1-9]|1[0-2])\.C(0[1-9]|1[0-2])\.P(0[1-9]|1[0-2])$/;
const ROOM=/^[a-zA-Z0-9_-]{3,80}$/;
const PLAN='47084b895a6317db16275a92c3878a340d31af15fb9ab479db7101953c18e49c';
const MODULES=['constraint-ledger','resource-closure','resilience-connectivity','observational-evidence-fence','typed-knowledge-edge','revocable-rights-lease','double-entry-governance','cultural-consent','dissent-preservation','sovereignty-consent','noncompensatory-rights','dimensional-feasibility'];
const N=1728;
const fail=code=>{throw Object.assign(new TypeError(code),{code});};
const guard=(ok,code)=>{if(!ok)fail(code);};
const sha=x=>createHash('sha256').update(x).digest('hex');
const idOf=i=>`H${String((i/144|0)+1).padStart(2,'0')}.S${String(((i%144)/12|0)+1).padStart(2,'0')}.N${String(i%12+1).padStart(2,'0')}`;
const roleOf=id=>Number(id.slice(5,7))<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META';
const exactObj=(v,fields)=>{
  try{
    if(v===null||typeof v!=='object'||Array.isArray(v)||(Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null))return null;
    const d=Object.getOwnPropertyDescriptors(v),names=Reflect.ownKeys(v);
    if(names.length!==fields.length||names.some(k=>typeof k!=='string'||!fields.includes(k)||!Object.hasOwn(d[k],'value')))return null;
    const x=Object.create(null);for(const k of fields){if(!Object.hasOwn(d,k))return null;x[k]=d[k].value;}
    return Object.freeze(x);
  }catch{return null;}
};
const DENSE=(a,n)=>{
 try{
  if(!Array.isArray(a)||Object.getPrototypeOf(a)!==Array.prototype||a.length!==n)return false;
  const k=Reflect.ownKeys(a);if(k.length!==n+1)return false;
  return k.every(x=>x==='length'||(typeof x==='string'&&/^(0|[1-9]\d*)$/.test(x)&&Number(x)<n))&&Array.from({length:n},(_,i)=>Object.hasOwn(a,i)).every(Boolean);
 }catch{return false;}
};
const FIELDS=['schema','id','sourceSha256','recordSha256','role','module','moduleOutputSha256','subjectNodeId','crossCandidateId','crossSimilarityBp','localStatus','hostStatus','negativeProbeHold','receiptSha256'];
const TOP=['schema','sourceSha256','slices','recordRoot','sphereRoot','houseRoot','metaRoot','exportRoot','localPass','hostedPass','workPosts','modelCalls','peerTurns','canonChanged','sourceOnly'];
const SOURCE_STATUS='SOURCE_PINNED_LOCAL_E2E_PASS',HOST_STATUS='HOLD_REAL_ISSUER_AND_WORK_ACL';

export function validateVerticalSliceManifest(rawBytes,expectedDigest){
 guard(typeof expectedDigest==='string'&&SHA.test(expectedDigest),'INDEPENDENT_PIN_REQUIRED');
 guard(typeof rawBytes==='string'||rawBytes instanceof Uint8Array,'RAW_SOURCE_REQUIRED');
 const bytes=Buffer.from(rawBytes);
 guard(bytes.length>200000&&bytes.length<5000000,'MANIFEST_SIZE_INVALID');
 guard(sha(bytes)===expectedDigest,'INDEPENDENT_PIN_MISMATCH');
 let json;try{json=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail('MANIFEST_PARSE_FAILED');}
 const r=exactObj(json,TOP);
 guard(r&&r.schema==='atlas.vertical.export/v09'&&r.sourceSha256===ARIADNE_SOURCE_SHA256&&r.localPass===N&&r.hostedPass===0&&r.workPosts===0&&r.modelCalls===0&&r.peerTurns===0&&r.canonChanged===false&&r.sourceOnly===true,'MANIFEST_CLAIMS_OR_SOURCE_INVALID');
 guard(DENSE(r.slices,N),'SLICE_COVERAGE_INVALID');
 const rows=[],seen=new Set();
 for(let i=0;i<N;i++){
  const z=exactObj(r.slices[i],FIELDS),id=idOf(i);
  guard(z&&z.schema==='atlas.vertical.source-bound-slice/v09'&&z.id===id&&z.sourceSha256===ARIADNE_SOURCE_SHA256&&typeof z.recordSha256==='string'&&SHA.test(z.recordSha256)&&typeof z.moduleOutputSha256==='string'&&SHA.test(z.moduleOutputSha256),'SLICE_OR_SOURCE_IDENTITY_INVALID');
  guard(z.role===roleOf(id)&&z.module===MODULES[i/144|0]&&z.localStatus===SOURCE_STATUS&&z.hostStatus===HOST_STATUS&&z.negativeProbeHold===true,'SLICE_AUTHORITY_OR_CONTRACT_INVALID');
  const house=id.slice(0,3),meta=z.role==='EPISTEMIC_META';
  guard(meta?z.subjectNodeId===house+'.S01.N01':z.subjectNodeId===null,'METHOD_SUBJECT_REQUIRED');
  guard(typeof z.crossSimilarityBp==='number'&&Number.isInteger(z.crossSimilarityBp)&&z.crossSimilarityBp>=0&&z.crossSimilarityBp<=10000,'SIMILARITY_INVALID');
  if(z.crossCandidateId!==null){guard(typeof z.crossCandidateId==='string'&&NODE.test(z.crossCandidateId)&&z.crossCandidateId.slice(0,3)!==house&&roleOf(z.crossCandidateId)===z.role&&z.crossSimilarityBp>0,'CROSS_HOUSE_CANDIDATE_INVALID');}
  else guard(z.crossSimilarityBp===0,'ORPHAN_SIMILARITY');
  const stamp=['ATLAS_VERTICAL_V09',id,ARIADNE_SOURCE_SHA256,z.recordSha256,z.role,z.module,z.moduleOutputSha256,z.subjectNodeId,z.crossCandidateId,z.crossSimilarityBp,z.localStatus,z.hostStatus,true];
  guard(typeof z.receiptSha256==='string'&&z.receiptSha256===sha(JSON.stringify(stamp)),'LEAF_RECEIPT_MISMATCH');
  if(seen.has(id))fail('DUPLICATE_SOURCE_ID');seen.add(id);
  rows.push(z);
 }
 const group=[];for(let sp=0;sp<144;sp++){
    const slice=rows.slice(sp*12,(sp+1)*12);group.push(sha(JSON.stringify(slice.map(x=>x.receiptSha256))));
 }
 const hr=[];for(let h=0;h<12;h++)hr.push(sha(JSON.stringify(group.slice(h*12,(h+1)*12))));
 const roots={recordRoot:sha(JSON.stringify(rows.map(x=>x.receiptSha256))),sphereRoot:sha(JSON.stringify(group)),houseRoot:sha(JSON.stringify(hr))};
 guard(Object.keys(roots).every(k=>r[k]===roots[k])&&typeof r.metaRoot==='string'&&SHA.test(r.metaRoot),'SOURCE_OR_GROUP_ROOT_MISMATCH');
 const exportRoot=sha(JSON.stringify(['ATLAS_VERTICAL_EXPORT_V09',ARIADNE_SOURCE_SHA256,roots.recordRoot,roots.sphereRoot,roots.houseRoot,1728,0]));
 guard(r.exportRoot===exportRoot,'EXPORT_META145_ROOT_MISMATCH');
 return Object.freeze({sourceSha256:ARIADNE_SOURCE_SHA256,pinnedBytesSha256:expectedDigest,rows:Object.freeze(rows),roots:Object.freeze(roots),metaRoot:r.metaRoot,exportRoot,localPass:1728,hostedPass:0});
}

export function createMeta145VerticalSliceBridge(program,rawBytes,expectedDigest){
 guard(isVerifiedProgram(program),'OFFICIAL_EXCELLENCE_REQUIRED');
 const d=program.descriptor();guard(d.programId===EXCELLENCE_PROGRAM_ID&&d.planSha256===PLAN&&d.ariadneSourceSha256===ARIADNE_SOURCE_SHA256&&d.plannedSteps===1728&&d.integratedSteps===0&&d.hostPermissionGranted===false,'OFFICIAL_EXCELLENCE_CHANGED');
 const manifest=validateVerticalSliceManifest(rawBytes,expectedDigest);
 const index=new Map(manifest.rows.map((x,i)=>[x.id,i]));
 const stats=()=>({schema:'atlas.meta145.vertical-status/v09',sourceSha256:ARIADNE_SOURCE_SHA256,sourceReceiptSha256:manifest.pinnedBytesSha256,sourceRoot:manifest.roots.recordRoot,metaRoot:manifest.metaRoot,exportRoot:manifest.exportRoot,
  slices:1728,spheres:144,houses:12,sourceMetrics:1728,localSourceComputePass:1728,realHostPass:0,awaitingTrustedWorkRights:1728,acceptedCrossDomainKnowledge:0,acceptedScience:0,actualModelInference:0,realPeerTurns:0,workPosts:0,canonChanged:false,productionIntegrated:false,status:'SOURCE_ONLY_LOCAL_PIPELINE_NOT_HOSTED'});
 const project=x=>({id:x.id,sourceRecordSha256:x.recordSha256,role:x.role,module:x.module,localStatus:x.localStatus,hostStatus:x.hostStatus,subjectNodeId:x.subjectNodeId,lexicalCrossHouseCandidate:x.crossCandidateId,lexicalSimilarityBp:x.crossSimilarityBp,acceptedSemanticRelation:false,hostAuthenticated:false});
 return Object.freeze({
  status:()=>stats(),
  inspectNode(id){guard(typeof id==='string'&&index.has(id),'NODE_UNKNOWN');return project(manifest.rows[index.get(id)]);},
  inspectSphere(id){guard(typeof id==='string'&&/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])$/.test(id),'SPHERE_UNKNOWN');const rows=manifest.rows.filter(x=>x.id.startsWith(id+'.'));return {sphereId:id,nodeCount:rows.length,sourceOnly:true,metrics:rows.map(project),hostedPass:0};},
  inspectHouse(id){guard(typeof id==='string'&&/^H(0[1-9]|1[0-2])$/.test(id),'HOUSE_UNKNOWN');return {houseId:id,spheres:12,nodes:144,sourceOnly:true,hostedPass:0};},
  prepareWorkSlice({hsn,taskId,roomId,mode='WORK'}={}){
   guard(mode==='WORK','PRIVATE_MODE_BLOCKED');guard(typeof hsn==='string'&&index.has(hsn),'NODE_UNKNOWN');
   guard(typeof taskId==='string'&&TASK.test(taskId)&&typeof roomId==='string'&&ROOM.test(roomId),'ENGINEERING_TASK_OR_ROOM_INVALID');
   const task=program.task(taskId),prep=program.prepareWorkTask(taskId,{roomId,mode});
   guard(prep.status==='PREPARED_NOT_POSTED'&&prep.workPosted===false&&prep.hostAuthenticated===false,'OFFICIAL_PREP_CHANGED');
   return {schema:'atlas.meta145.vertical-work-preview/v09',status:'PREPARED_NOT_POSTED',node:project(manifest.rows[index.get(hsn)]),taskId:task.id,roomId,
    relationship:'SOURCE_ONLY_PROPOSED_ASSOCIATION_NOT_SAME_AS',workPosted:false,executionAuthorized:false,issuerAuthenticated:false,readReturnIndependentlyVerified:false,canonChanged:false};
  }
 });
}
