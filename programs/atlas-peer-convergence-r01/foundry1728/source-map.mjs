/** Atlas R37 source-only original HSN source/job Work compiler.
 * No owner-private raw bytes, peer transcripts, credentials, model weights,
 * semantic acceptance or release authority are embedded here.
 * Original HSN is the sole identity. C12 / EX.WCP are different namespaces.
 */
import {createHash} from 'node:crypto';
import {types as utilTypes} from 'node:util';
export const ARIADNE_SHA='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
export const EXPLORER_SHA='24396d4acf8cb3b92277e9705192cdfe45d4eb1f39e97585f167b2fcb887752e';
const ADDRESS=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const DIGEST=/^[0-9a-f]{64}$/;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const pad=n=>String(n).padStart(2,'0');
export function hsnFromIndex(i) {
 if(typeof i!=='number'||!Number.isInteger(i)||i<0||i>=1728)throw Error('INVALID_INDEX');
 return 'H'+pad(Math.floor(i/144)+1)+'.S'+pad(Math.floor(i/12)%12+1)+'.N'+pad(i%12+1);
}
export function indexFromHsn(hsn) {
 const m=typeof hsn==='string'?ADDRESS.exec(hsn):null;
 if(!m)throw Error('INVALID_HSN');
 return (Number(m[1])-1)*144+(Number(m[2])-1)*12+Number(m[3])-1;
}
function originalBytes(value) {
 if(!Buffer.isBuffer(value)||utilTypes.isProxy(value))throw Error('NATIVE_INPUT_REQUIRED');
 return Buffer.from(value);
}
/** Enforce pinned source bytes BEFORE JSON.parse; every field is a source
 * declaration, not automatically a reviewed meaning or permission.
 */
export function makeOriginalWorkMap({registryBytes,explorerBytes}) {
 const a=originalBytes(registryBytes),e=originalBytes(explorerBytes);
 if(digest(a)!==ARIADNE_SHA||digest(e)!==EXPLORER_SHA)throw Error('ORIGINAL_SOURCE_PIN_MISMATCH');
 const source=JSON.parse(a.toString('utf8'));
 const html=e.toString('utf8'),m=/<script id="data" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
 if(!m)throw Error('JOB_SCRIPT_MISSING');
 const jobs=JSON.parse(m[1]);
 if(!source||typeof source!=='object'||!Array.isArray(jobs)||
  Object.keys(source.nodes||{}).length!==1728||Object.keys(source.spheres||{}).length!==144||
  Object.keys(source.houses||{}).length!==12||jobs.length!==1728)throw Error('WRONG_GEOMETRY');
 const byId=new Map();
 for(const j of jobs) {
  if(!j||typeof j!=='object'||typeof j.coordinate!=='string'||!ADDRESS.test(j.coordinate)||
    byId.has(j.coordinate))throw Error('DUPLICATE_OR_INVALID_JOB');
  byId.set(j.coordinate,j);
 }
 const orders=[];
 for(let i=0;i<1728;i++){
  const id=hsnFromIndex(i),n=source.nodes[id],j=byId.get(id);
  const s=Number(id.slice(5,7)),parent=id.slice(0,7),h=id.slice(0,3);
  const kind=s<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META';
  if(!n||!j||n.id!==id||n.parent!==parent||n.kind!==kind||
   source.spheres[parent]?.parent!==h||source.houses[h]?.id!==h||
   j.node_name!==n.name||j.node_kind!==kind||j.source_node_sha256!==n.source_record_sha256||
   !DIGEST.test(n.source_record_sha256)||j.job_id!=='SH-JOB-'+String(i+1).padStart(4,'0')||
   !ADDRESS.test(j.paired_candidate_coordinate)||j.semantic_review!=='NOT_ADJUDICATED'||
   j.host_status!=='NOT_DEPLOYED'||j.swarmhub_registration!=='NOT_REGISTERED')throw Error('ORIGINAL_ID_ROLE_JOB_DRIFT');
  orders.push(Object.freeze({id,sourceParent:parent,kind,originalSourceRecordSha:n.source_record_sha256,
   originalName:n.name,originalJob:j.job_id,sourceJobTitle:j.job_title,
   originalCandidate:j.paired_candidate_coordinate,candidateAccepted:false,
   subjectEvidenceAccepted:false,sourceValidatedLocally:true,
   hostedIntegrationVerified:false,workModeOnly:true}));
 }
 return Object.freeze({schema:'atlas.r37.source-map/v1',ariadneOriginalSha:ARIADNE_SHA,
  explorerOriginalSha:EXPLORER_SHA,shape:Object.freeze([12,12,12]),
  domainNodes:1008,methodNodes:720,orders:Object.freeze(orders),
  residentMacroTurnsCompleted:0,modelCalls:0,releaseAuthorized:false,
  semanticAccepted:false,authorityEffect:'NONE'});
}