/** Atlas ONE × Ariadne × Iron Empire SOURCE-ONLY Work bridge.
 * No private Play/Palace/Brain data, host operations, resident claims,
 * uploads, CANON ratification, or fictional-to-real science promotion.
 */
import { createHash } from 'node:crypto';
const SRC='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
const COORD=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const SHA=/^[a-f0-9]{64}$/;
const clean=(x)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
const sha=x=>createHash('sha256').update(x).digest('hex');
const hold=(reason)=>Object.freeze({status:'HOLD',reason,hostAuthenticated:false,canonEffect:'NONE',storyCanonEffect:'NONE'});
export const ARIADNE_V07_SHA256=SRC;
export const PUBLIC_FICTION_SOURCE_IDS=Object.freeze([
  'IRON-TREATMENT-20261030-v04','IRON-MARS-DELTA-20261106-v01',
  'IRON-QVERSE-20261030-v02','IRON-CONTINUUM-METHOD-20261030-v01',
  'IRON-ORCS-20261030-v02'
]);
export const IRON_HOUSE_REVIEW_LENSES=Object.freeze([
  ['physical units, energy and resource conservation','IRON-ORCS-20261030-v02','No free energy or invented scientific validation'],
  ['water/food and recovered agricultural knowledge','IRON-MARS-DELTA-20261106-v01','Do not move Film III restoration into Film II'],
  ['biosphere thresholds, restoration and infrastructure','IRON-MARS-DELTA-20261106-v01','No overnight ecological restoration without costs'],
  ['care, public health and biosafety boundaries','IRON-CONTINUUM-METHOD-20261030-v01','No fictional medical result presented as clinical proof'],
  ['knowledge transfer, education and lost archives','IRON-MARS-DELTA-20261106-v01','No knowledge recovery without source and chronology'],
  ['defensive resilience and nonlethal human oversight','IRON-TREATMENT-20261030-v04','No autonomous lethal authority conferred by fiction'],
  ['extraction, economics, reparations and governance','IRON-ORCS-20261030-v02','No imaginary grant/production certainty without provenance'],
  ['six-film cultural voices, art and continuity','IRON-TREATMENT-20261030-v04','Do not silently erase conflicting author corrections'],
  ['epistemology, plural values, Qverse personhood debates','IRON-QVERSE-20261030-v02','Do not claim actual AI consciousness from a story'],
  ['Martian community histories and collective agency','IRON-MARS-DELTA-20261106-v01','Do not fabricate authentic affected-party consent'],
  ['rights, dignity, due process and accountability','IRON-QVERSE-20261030-v02','Fictional law never grants real permissions'],
  ['stellar systems, relativity and deep-time habitats','IRON-TREATMENT-20261030-v04','Do not treat FTL or speculative biology as measured science']
]);

/** Publisher must independently own/read and authorize the full bytes before call.
 * A successful SHA pin validates source identity, NOT permissions or meaning.
 */
export function validatePinnedAriadneV07(originalBytes){
  if(!(Buffer.isBuffer(originalBytes)||originalBytes instanceof Uint8Array))return hold('ORIGINAL_BYTES_REQUIRED');
  const raw=Buffer.from(originalBytes);
  if(raw.length>5_000_000||sha(raw)!==SRC)return hold('SOURCE_DIGEST_MISMATCH');
  let v;try{v=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(raw));}catch{return hold('INVALID_REGISTRY_JSON')}
  if(!clean(v)||!clean(v.houses)||!clean(v.spheres)||!clean(v.nodes)||Object.keys(v.houses).length!==12||Object.keys(v.spheres).length!==144||Object.keys(v.nodes).length!==1728)return hold('REGISTRY_CARDINALITY_INVALID');
  let domain=0,method=0,domainSpheres=0,methodSpheres=0;
  for(let h=1;h<=12;h++){
    const hid=`H${String(h).padStart(2,'0')}`;if(!clean(v.houses[hid]))return hold('HOUSE_IDENTITY_INVALID');
    for(let s=1;s<=12;s++){
      const sid=`${hid}.S${String(s).padStart(2,'0')}`;
      const sphere=v.spheres[sid];if(!clean(sphere)||sphere.id!==sid||sphere.parent!==hid||!Array.isArray(sphere.children)||sphere.children.length!==12)return hold('SPHERE_IDENTITY_INVALID');
      const kind=sphere.lens===null?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META';
      if(kind==='DOMAIN_SPECIALIZATION')domainSpheres++;else methodSpheres++;
      for(let n=1;n<=12;n++){
        const id=`${sid}.N${String(n).padStart(2,'0')}`,node=v.nodes[id];
        if(!clean(node)||node.id!==id||node.parent!==sid||node.kind!==kind||!COORD.test(id)||!SHA.test(node.source_record_sha256||'')||typeof node.name!=='string'||node.name.length<2||!sphere.children.includes(id))return hold('NODE_ID_ROLE_DIGEST_INVALID');
        if(kind==='DOMAIN_SPECIALIZATION')domain++;else method++;
      }
    }
  }
  if(domain!==1008||method!==720||domainSpheres!==84||methodSpheres!==60)return hold('SPHERE_ROLE_DISTRIBUTION_INVALID');
  return Object.freeze({status:'EXACT_SOURCE_BYTES_VERIFIED',edition:'Ariadne v0.7',digest:SRC,
    domainNodes:1008,methodNodes:720,domainSpheres:84,methodSpheres:60,
    nodes:Object.freeze(v.nodes),spheres:Object.freeze(v.spheres),
    hostAuthenticated:false,canonEffect:'NONE',storyCanonEffect:'NONE',semanticReview:'NOT_PERFORMED'});
}

/** Distinct source-bound Work node scenario, never a story event or real Macroturn. */
export function proposeIronEmpireNode({coordinate,nodeName,nodeDigest,sourceEdition='Ariadne v0.7',sourceRegistrySha256=SRC}={}){
  if(typeof coordinate!=='string'||!COORD.test(coordinate)||typeof nodeName!=='string'||nodeName.length<2||!SHA.test(nodeDigest||'')||sourceEdition!=='Ariadne v0.7'||sourceRegistrySha256!==SRC)return hold('EDITION_NODE_IDENTITY_REQUIRED');
  const hi=Number(coordinate.slice(1,3))-1;
  const [focus,fictionSource,negative]=IRON_HOUSE_REVIEW_LENSES[hi];
  return Object.freeze({schema:'atlas.one.iron-empire-work-candidate/v1',status:'SOURCE_ONLY_FICTION_WORK_CANDIDATE_NOT_CANON',
    coordinate,nodeName,nodeDigest,sourceEdition,sourceRegistrySha256,
    fictionSource,sourceContentsVerified:false,storyTopic:focus,
    question:`How might ${coordinate} (${nodeName}) change an Iron Empire research/continuity proposal about ${focus}?`,
    falsifier:negative,reviewerAccepted:false,realWorldScienceVerified:false,
    hostAuthenticated:false,actualWorkMacroturnCompleted:false,posted:false,fictionCanonAdopted:false,
    canonEffect:'NONE',storyCanonEffect:'NONE',requiredMode:'WORK',privateModeIngestion:'FORBIDDEN'});
}

/** Faithful source-only compiler with 1728 distinct entries; no real Work visit. */
export function compilePinnedIronEmpireCandidates(originalBytes){
  const validated=validatePinnedAriadneV07(originalBytes);
  if(validated.status!=='EXACT_SOURCE_BYTES_VERIFIED')return validated;
  const rows=[];
  for(let h=1;h<=12;h++)for(let s=1;s<=12;s++)for(let n=1;n<=12;n++){
    const coordinate=`H${String(h).padStart(2,'0')}.S${String(s).padStart(2,'0')}.N${String(n).padStart(2,'0')}`,node=validated.nodes[coordinate];
    const c=proposeIronEmpireNode({coordinate,nodeName:node.name,nodeDigest:node.source_record_sha256});
    if(c.status!=='SOURCE_ONLY_FICTION_WORK_CANDIDATE_NOT_CANON')return hold('CANDIDATE_COMPILE_FAILED');
    rows.push(c);
  }
  return Object.freeze({schema:'atlas.one.iron-empire-circuit/v1',status:'SOURCE_ONLY_COMPILATION_COMPLETE',count:1728,
    sourceRegistrySha256:SRC,candidates:rows,
    realMacroturnsExecuted:0,roomsJoined:0,hostActions:0,storyCanonEffect:'NONE',canonEffect:'NONE'});
}

/** Minimal negative-control for author-directed Iron Empire chronology and physics.
 * Source status remains preliminary. No story is written or promoted.
 */
export function previewIronEmpireContinuityEvent(event){
  if(!clean(event)||event.mode!=='WORK'||event.fictional!==true||!PUBLIC_FICTION_SOURCE_IDS.includes(event.sourceId)||typeof event.eventId!=='string'||!/^IE-[A-Za-z0-9-]{3,70}$/.test(event.eventId)||typeof event.chapter!=='string'||!['Film I','Film II','Film III','Film IV','Film V','Film VI','Prologue'].includes(event.chapter)||!Number.isSafeInteger(event.year)||event.year< -1_000_000_000||event.year>1_000_000_000)return hold('FICTION_EVENT_SOURCE_OR_SCOPE_INVALID');
  if(event.realWorldEstablished===true||event.canonApproved===true||event.hostAuthorized===true)return hold('CLIENT_CLAIMED_AUTHORITY_NOT_ALLOWED');
  if(event.kind==='MARS_MAIN_RESTORATION'&&event.chapter!=='Film III')return hold('MARS_RESTORATION_CHAPTER_CONFLICT');
  if(event.kind==='MARS_ANCIENT_PREQUEL'&&event.chapter!=='Film II')return hold('MARS_PREQUEL_CHAPTER_CONFLICT');
  if(event.kind==='MARS_MAIN_RESTORATION'&&event.year<2069)return hold('MARS_RESTORATION_FICTION_DATE_CONFLICT');
  if(event.kind==='FUTURE_FUSION'&&!['Prologue','Film I'].includes(event.chapter))return hold('FUSION_MILESTONE_CHAPTER_UNREVIEWED');
  return Object.freeze({status:'FICTION_CONTINUITY_CANDIDATE_UNREVIEWED',eventId:event.eventId,
    sourceId:event.sourceId,year:event.year,chapter:event.chapter,
    timelineAccepted:false,fictionCanonAdopted:false,realWorldScienceVerified:false,
    hostAuthenticated:false,canonEffect:'NONE',storyCanonEffect:'NONE'});
}