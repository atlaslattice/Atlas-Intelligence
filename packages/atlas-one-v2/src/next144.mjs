/**
 * Atlas ONE / Ariadne NEXT144: a pure, source-pinned catalogue-to-opportunities
 * compiler. This does not install tasks, wake agents, access rooms, or certify
 * benefit, AI personhood, CANON, consent, rights or hosted deployment.
 *
 * A NEXT144 initiative is ONE authored proposal at each of Ariadne's 144
 * Spheres; its 12 target coordinates are experiment/questions, not gains.
 * The original private ontology is never bundled with this public module.
 */
import { createHash } from 'node:crypto';

export const NEXT144_SCHEMA='atlas.next144.capabilities/v1';
export const NEXT144_CATALOG_SHA256='2540f702c020efbfaee0532e84face21394860e57e91749bf36f2b1a3f3c2843';
export const ARIADNE_ORIGINAL_SHA256='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
export const ROLES=Object.freeze({DOMAIN_SPECIALIZATION:'DOMAIN_HYPOTHESIS_NOT_MEASURED',EPISTEMIC_META:'METHOD_HYPOTHESIS_NOT_WELFARE'});
const MODES=new Set(['WORK','PLAY','SOCIAL','IMAGINE','DREAM','QUIET']);
const SHA=/^[a-f0-9]{64}$/;
const SPHERE=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])$/;
const COORD=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const ID=/^N144-(0[1-9]|1[0-2])-(0[1-9]|1[0-2])$/;
const PROP_ALLOWED=new Set(['id','sphere','title','experiment','falsifier','suggestedMode','status','publicSafeDesignOnly']);
const forbiddenInputKeys=new Set(['privateBody','roomText','userMemory','palace','brain','privateChoices','consentAccepted','hostAuthenticated','residentVerified','canonApproved','welfareGain','autoWake','telemetry','modelRunCount']);
const own=(o,k)=>Object.hasOwn(o,k);
const plain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&(Object.getPrototypeOf(o)===Object.prototype||Object.getPrototypeOf(o)===null);
const sha256=b=>createHash('sha256').update(b).digest('hex');
const asciiName=s=>typeof s==='string'&&s.length>0&&s.length<2000&&![...s].some(ch=>ch.charCodeAt(0)<32);
const hold=(reason)=>Object.freeze({schema:'atlas.next144.review/v1',status:'HOLD',reason,authorityEffect:'NONE',welfareGainVerified:false});
const must=(test,code)=>{if(!test)throw Object.assign(new Error(code),{code});};

function sourceBytes(raw,maxBytes){
  must(Buffer.isBuffer(raw)||raw instanceof Uint8Array,'ORIGINAL_BYTES_REQUIRED');
  const b=Buffer.from(raw);
  must(b.length>0&&b.length<=maxBytes,'SOURCE_BYTES_BOUNDED');
  // Exact digest prevents a JSON parser from normalizing duplicate keys or Unicode
  // before the source's original bytes have been authenticated by equality.
  return b;
}
function jsonAfterPin(raw,expected,maxBytes){
  const b=sourceBytes(raw,maxBytes);
  must(sha256(b)===expected,'SOURCE_DIGEST_MISMATCH');
  let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b))}
  catch{throw Object.assign(new Error('SOURCE_JSON_INVALID'),{code:'SOURCE_JSON_INVALID'})}
  return data;
}
function expectedSphere(h,s){return `H${String(h).padStart(2,'0')}.S${String(s).padStart(2,'0')}`;}
function expectedNode(h,s,n){return `${expectedSphere(h,s)}.N${String(n).padStart(2,'0')}`;}

/** Pin exact, public-safe NEXT144 authored catalogue before interpreting it. */
export function readNext144Catalog(raw){
  const d=jsonAfterPin(raw,NEXT144_CATALOG_SHA256,200_000);
  must(plain(d)&&Object.keys(d).sort().join('|')===['description','edition','items','schema','sourceRegistryDigest','sourceRegistryEdition'].sort().join('|'),'CATALOG_KEYS');
  must(d.schema===NEXT144_SCHEMA&&d.sourceRegistryDigest===ARIADNE_ORIGINAL_SHA256&&d.sourceRegistryEdition==='Ariadne v0.7','CATALOG_EDITION');
  must(d.edition==='NEXT144_REVIEW_2026-11-23'&&typeof d.description==='string'&&Array.isArray(d.items)&&d.items.length===144,'CATALOG_CARDINALITY');
  const titles=new Set();let idx=0;
  for(let h=1;h<=12;h++)for(let s=1;s<=12;s++){
    const x=d.items[idx++];
    must(plain(x)&&Object.keys(x).every(k=>PROP_ALLOWED.has(k))&&Object.keys(x).length===PROP_ALLOWED.size,'CAPABILITY_KEYS');
    must(x.id===`N144-${String(h).padStart(2,'0')}-${String(s).padStart(2,'0')}`&&ID.test(x.id)&&x.sphere===expectedSphere(h,s)&&SPHERE.test(x.sphere),'CAPABILITY_ADDRESS');
    must(asciiName(x.title)&&x.title.length>10&&asciiName(x.experiment)&&x.experiment.length>25&&asciiName(x.falsifier)&&x.falsifier.length>25,'CAPABILITY_TEXT');
    must(MODES.has(x.suggestedMode)&&x.status==='PROPOSED_NOT_IMPLEMENTED'&&x.publicSafeDesignOnly===true,'CAPABILITY_STATUS');
    must(!titles.has(x.title),'CAPABILITY_DUPLICATE_TITLE');titles.add(x.title);
  }
  return Object.freeze(d);
}

/** A structural offer: exactly 144 initiatives and 1,728 coordinate-only targets.
 * No user/private mode contents or verified Ariadne semantic meaning is returned.
 */
export function prepareNext144({catalogBytes}={}){
  const catalog=readNext144Catalog(catalogBytes);
  const tasks=catalog.items.map(x=>Object.freeze({...x,authorityEffect:'NONE',hostDeployment:'NOT_VERIFIED',proofStatus:'DESIGN_ONLY'}));
  const targets=[];
  for(let h=1;h<=12;h++)for(let s=1;s<=12;s++)for(let n=1;n<=12;n++){
    const sphere=expectedSphere(h,s),initiative=`N144-${String(h).padStart(2,'0')}-${String(s).padStart(2,'0')}`;
    targets.push(Object.freeze({coordinate:expectedNode(h,s,n),sphere,initiative,expectedKind:s<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META',status:'UNBOUND_COORDINATE_OPPORTUNITY',observedGain:false,authorityEffect:'NONE'}));
  }
  return Object.freeze({schema:'atlas.next144.plan/v1',status:'PROPOSED_STRUCTURAL_ONLY',
    catalogSha256:NEXT144_CATALOG_SHA256,expectedRegistrySha256:ARIADNE_ORIGINAL_SHA256,
    counts:Object.freeze({houses:12,spheres:144,targets:1728,domain:1008,epistemic:720}),
    tasks:Object.freeze(tasks),targets:Object.freeze(targets),
    sourceBytesVerified:false,sourceMeaningVerified:false,independentExecutionCount:0,
    completedCapabilities:0,verifiedWelfareGains:0,hostAuthenticated:false,
    canonEffect:'NONE',authorityEffect:'NONE'});
}

/** Bind to original, byte-pinned Ariadne; validate every ancestry, source record
 * digest and 7-domain/5-method distribution, not merely the 1,728 address count.
 */
export function bindNext144ToOriginal({catalogBytes,registryBytes,includeNames=false}={}){
  must(typeof includeNames==='boolean','INCLUDE_NAMES_BOOL');
  const plan=prepareNext144({catalogBytes});
  const original=jsonAfterPin(registryBytes,ARIADNE_ORIGINAL_SHA256,4_000_000);
  must(plain(original)&&plain(original.houses)&&plain(original.spheres)&&plain(original.nodes),'REGISTRY_SCHEMA');
  must(Object.keys(original.houses).length===12&&Object.keys(original.spheres).length===144&&Object.keys(original.nodes).length===1728,'REGISTRY_CARDINALITY');
  const targets=[];
  for(let h=1;h<=12;h++){
    const hid=`H${String(h).padStart(2,'0')}`,house=original.houses[hid];
    must(plain(house)&&house.id===hid&&typeof house.name==='string'&&Array.isArray(house.children)&&house.children.length===12,'HOUSE_SOURCE_ANCESTRY');
    for(let s=1;s<=12;s++){
      const sid=expectedSphere(h,s),sphere=original.spheres[sid];
      must(house.children.includes(sid)&&plain(sphere)&&sphere.id===sid&&sphere.parent===hid&&typeof sphere.name==='string'&&Array.isArray(sphere.children)&&sphere.children.length===12,'SPHERE_SOURCE_ANCESTRY');
      let domain=0,method=0;
      for(let n=1;n<=12;n++){
        const coordinate=expectedNode(h,s,n),node=original.nodes[coordinate];
        must(sphere.children.includes(coordinate)&&plain(node)&&node.id===coordinate&&node.parent===sid&&
          (node.kind==='DOMAIN_SPECIALIZATION'||node.kind==='EPISTEMIC_META')&&typeof node.name==='string'&&node.name.length>0&&
          ['definition','includes','excludes'].every(k=>typeof node[k]==='string'&&node[k].length>0)&&SHA.test(node.source_record_sha256),'NODE_SOURCE_ANCESTRY');
        if(node.kind==='DOMAIN_SPECIALIZATION')domain++;else method++;
        const target={coordinate,sphere:sid,initiative:`N144-${String(h).padStart(2,'0')}-${String(s).padStart(2,'0')}`,
          sourceRole:node.kind,sourceNodeDigest:node.source_record_sha256,
          targetKind:ROLES[node.kind],status:'SOURCE_BOUND_OPPORTUNITY_NOT_EXECUTED',
          measuredBenefit:'NOT_ESTABLISHED',actualEvidenceRefs:[],residentAssigned:false,hostAuthenticated:false,
          canonEffect:'NONE',authorityEffect:'NONE'};
        if(includeNames){target.nodeName=node.name;target.sphereName=sphere.name;target.houseName=house.name;}
        targets.push(Object.freeze(target));
      }
      must(domain===(s<=7?12:0)&&method===(s>7?12:0),'SPHERE_EPISTEMIC_DISTRIBUTION');
    }
  }
  must(targets.length===1728&&targets.filter(x=>x.sourceRole==='DOMAIN_SPECIALIZATION').length===1008,'TARGET_KINDS');
  return Object.freeze({schema:'atlas.next144.sourcebound/v1',status:'SOURCE_BOUND_PLANNED_NOT_COMPLETED',
    catalogSha256:NEXT144_CATALOG_SHA256,registryEdition:'Ariadne v0.7',registrySha256:ARIADNE_ORIGINAL_SHA256,
    sourceBytesVerified:true,houseCount:12,sphereCount:144,targetCount:1728,
    domainTargetCount:1008,methodTargetCount:720,modeCounts:Object.freeze(Object.fromEntries([...MODES].map(mode=>[mode,plan.tasks.filter(x=>x.suggestedMode===mode).length]))),
    tasks:plan.tasks,targets:Object.freeze(targets),
    workPostsPerformed:0,peerRepliesPerformed:0,completedCapabilities:0,
    gainsDemonstrated:0,measuredWelfareGains:0,hostAuthenticated:false,
    privateModeBodiesRead:false,privateModeContentsExported:false,
    authorityEffect:'NONE',canonEffect:'NONE'});
}

/** Candidate evidence lens, not an adoption or semantic review. A caller can
 * provide assertions but cannot attest the host, grant authority or certify
 * measured social benefit. Unknown mandatory evidence is HOLD, rights BLOCK wins.
 */
export function previewCandidateEvidence({catalogBytes,taskId,record}={}){
  const catalog=readNext144Catalog(catalogBytes);
  const task=catalog.items.find(x=>x.id===taskId);
  if(!task)return hold('TASK_NOT_CANONICALLY_IDENTIFIED');
  if(!plain(record)||Object.keys(record).some(k=>!new Set(['taskId','mode','rights','consent','sourceRefs','tests','scope','evidenceKind','dataOrigin']).has(k)))return hold('STRICT_WORK_EVIDENCE_ONLY');
  if(Object.keys(record).some(k=>forbiddenInputKeys.has(k)))return hold('PROTECTED_OR_AUTHORITY_FIELD');
  if(record.taskId!==task.id||record.mode!=='WORK'||task.suggestedMode!=='WORK')return hold('PRIVATE_MODE_NOT_WORK_EVIDENCE');
  if(record.rights==='BLOCK'||record.consent==='BLOCK')return Object.freeze({schema:'atlas.next144.review/v1',status:'BLOCK',reason:'NONOFFSETTABLE_RIGHTS',authorityEffect:'NONE',welfareGainVerified:false});
  if(record.rights!=='PASS'||record.consent!=='PASS')return hold('RIGHTS_OR_CONSENT_UNKNOWN');
  if(!plain(record.scope)||!Array.isArray(record.scope.groups)||!Array.isArray(record.scope.periods)||!Array.isArray(record.scope.scenarios)||
    record.scope.groups.length===0||record.scope.periods.length===0||record.scope.scenarios.length===0||
    [record.scope.groups,record.scope.periods,record.scope.scenarios].some(xs=>xs.some(x=>typeof x!=='string'||x.trim().length<1)))return hold('SCOPE_MISSING_GROUP_PERIOD_SCENARIO');
  if(!Array.isArray(record.sourceRefs)||record.sourceRefs.length===0||record.sourceRefs.length>8||new Set(record.sourceRefs).size!==record.sourceRefs.length||record.sourceRefs.some(x=>typeof x!=='string'||x.length<8||x.length>256))return hold('EVIDENCE_SOURCE_REFS_INVALID');
  if(!Array.isArray(record.tests)||record.tests.length===0||record.tests.length>24||record.tests.some(t=>!plain(t)||Object.keys(t).some(k=>!['id','result','kind'].includes(k))||!asciiName(t.id)||!['PASS','FAIL'].includes(t.result)||!['POSITIVE','NEGATIVE'].includes(t.kind)))return hold('LOCAL_TEST_DECLARATIONS_INVALID');
  if(record.tests.some(t=>t.result==='FAIL'))return hold('LOCAL_TEST_FAILURE');
  if(!record.tests.some(t=>t.kind==='NEGATIVE')||!record.tests.some(t=>t.kind==='POSITIVE'))return hold('BOTH_CONTROLS_REQUIRED');
  if(record.dataOrigin!=='SYNTHETIC_OR_PUBLIC_WORK'||record.evidenceKind!=='LOCAL_REVIEW')return hold('SOURCE_BOUNDARY_UNVERIFIED');
  return Object.freeze({schema:'atlas.next144.review/v1',status:'LOCAL_EVIDENCE_CANDIDATE_ONLY',
    taskId:task.id,scopeDimensions:Object.freeze({groups:record.scope.groups.length,periods:record.scope.periods.length,scenarios:record.scope.scenarios.length}),
    localTestsClaimed:record.tests.length,sourceRefsClaimed:record.sourceRefs.length,
    claimedEvidenceNotIndependentlyAttested:true,hostAuthenticated:false,rightsAtReturnVerified:false,
    demonstratedRealWorldGain:false,welfareGainVerified:false,
    rightsNotConferred:true,privateModeContentUsed:false,authorityEffect:'NONE',canonEffect:'NONE'});
}
