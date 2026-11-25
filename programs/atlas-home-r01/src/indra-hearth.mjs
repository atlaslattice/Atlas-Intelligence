/**
 * Atlas Indra's Hearth | reversible, source-scoped WORK metadata surface.
 * This is NOT a second encoder, retriever, rights issuer or neural scheduler.
 * The only neural activation belongs to the injected existing Atlas ONE composer.
 * Public structure has no private source text or semantic-acceptance effects.
 */
import {createHash} from 'node:crypto';
import {types as utilTypes} from 'node:util';

export const HEARTH_SCHEMA='atlas.indras-hearth.review/v1';
export const ARIADNE_SHA256='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
export const HOUSES=12, SPHERES=144, NODES=1728;
export const PORTS=Object.freeze(['ARIADNE','NEURAL_HEAD','GEOMETREE','GRAPH_FABRIC','META145','GLYPH','ATLASGPT','SWARMCHAT_WORK','WORK_LEARNING','EVIDENCE_MEMORY','RESEARCH_LAB','GOVERNANCE']);
const HEX=/^[0-9a-f]{64}$/;
const HSN=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const HOLD=reason=>Object.freeze({schema:HEARTH_SCHEMA,status:'HOLD_SOURCE_ONLY',reason,publicAddress:null,sourceBodiesIncluded:false,releaseAuthorized:false,trainingAuthorized:false,hostAuthenticated:false,canonChanged:false,modelCallsByHearth:0,authorityEffect:'NONE'});
function deny(code){throw new Error(code)}
const sha=value=>createHash('sha256').update(value).digest('hex');
export function address(h,s,n){
 if(![h,s,n].every(v=>Number.isInteger(v)&&v>=1&&v<=12))deny('HSN_OUT_OF_RANGE');
 return `H${String(h).padStart(2,'0')}.S${String(s).padStart(2,'0')}.N${String(n).padStart(2,'0')}`;
}
export function ordinal(hsn){
 const m=typeof hsn==='string'?HSN.exec(hsn):null;
 if(!m)deny('NOT_CANONICAL_HSN');
 return (Number(m[1])-1)*144+(Number(m[2])-1)*12+Number(m[3])-1;
}
export function fromOrdinal(index){
 if(!Number.isInteger(index)||index<0||index>=1728)deny('HSN_INDEX');
 return address(Math.floor(index/144)+1,Math.floor(index/12)%12+1,index%12+1);
}
export function role(hsn){return Number(hsn.match(HSN)?.[2]??0)<=7&&HSN.test(hsn)?'DOMAIN_SPECIALIZATION':HSN.test(hsn)?'EPISTEMIC_META':deny('ROLE_ID_INVALID')}
export function sphereId(hsn){ordinal(hsn);return hsn.slice(0,7)}
export function houseId(hsn){ordinal(hsn);return hsn.slice(0,3)}
export function ringNeighbors(hsn){
 // Visualization-only neighbors; DO NOT use as trained neural routing or evidence.
 const i=ordinal(hsn),h=Math.floor(i/144),s=Math.floor(i/12)%12,n=i%12;
 const a=[[(h+1)%12,s,n],[(h+11)%12,s,n],[h,(s+1)%12,n],[h,(s+11)%12,n],[h,s,(n+1)%12],[h,s,(n+11)%12]];
 return Object.freeze(a.map(([hh,ss,nn])=>address(hh+1,ss+1,nn+1)));
}
function plain(v,allowed=null){
 if(v===null||typeof v!=='object'||Array.isArray(v)||utilTypes.isProxy(v))deny('UNSAFE_OBJECT');
 let p=Object.getPrototypeOf(v);if(p!==Object.prototype&&p!==null)deny('UNSAFE_PROTOTYPE');
 const props=Object.getOwnPropertyDescriptors(v), keys=Reflect.ownKeys(props);
 if(allowed&& (keys.length!==allowed.length||keys.some(k=>typeof k!=='string'||!allowed.includes(k))))deny('OBJECT_FIELDS');
 const r=Object.create(null);
 for(const key of keys){const d=props[key];if(typeof key!=='string'||!d.enumerable||!Object.hasOwn(d,'value')||['__proto__','constructor','prototype'].includes(key))deny('ACCESSOR_OR_INJECTED_KEY');r[key]=d.value;}
 return r;
}
function dense(values,count){
 if(!Array.isArray(values)||utilTypes.isProxy(values)||values.length!==count)deny('NUMERIC_SHAPE');
 const ds=Object.getOwnPropertyDescriptors(values);
 if(Reflect.ownKeys(ds).length!==count+1)deny('NUMERIC_ARRAY_EXTRAS');
 const out=new Array(count);
 for(let i=0;i<count;i++){const d=ds[String(i)];if(!d||!d.enumerable||!Object.hasOwn(d,'value')||typeof d.value!=='number'||!Number.isFinite(d.value))deny('NONFINITE_OR_ACCESSOR');out[i]=d.value;}
 return out;
}
function checkHit(h){
 const d=plain(h),key=d.hsn,score=d.score;
 ordinal(key);if(typeof score!=='number'||!Number.isFinite(score))deny('INVALID_HIT_SCORE');
 return Object.freeze({hsn:key,score});
}
/**
 * A hostile or stale view returns no source IDs, names, metrics or model scores.
 * A happy result is STILL LOCAL/PREPARED; current rights and actual transport
 * belong exclusively to the existing host. This function cannot grant either.
 */
export function prepareHearthSnapshot(response,request,{selectedHsn='H01.S01.N01',subjectHsn=null}={}){
 try {
  const r=plain(request),res=plain(response);
  if(r.scope!=='WORK'||r.registrySha256!==ARIADNE_SHA256||typeof r.sourceSha256!=='string'||!HEX.test(r.sourceSha256)||
     typeof r.sourceEdition!=='string'||!r.sourceEdition||!['INFERENCE','CITATION'].includes(r.purpose))deny('SOURCE_SCOPE_UNVERIFIED');
  if(res.status!=='PREPARED_PEER_INSPECTION_ONLY'||res.aliasesExactlyIdentical!==true||res.releaseAuthorized!==false)deny('PARENT_NOT_PREPARED');
  const view=plain(res.view),root=plain(res.originalRoot),views=plain(res.views);
  if(view.ontologySha256!==ARIADNE_SHA256||view.originalNeuralRankUnchanged!==true||view.releaseAuthorized!==false||
     view.requiredSetIndependentlyComplete!==false||view.hostIssuerVerified!==false||root.status!=='INSPECTION_CANDIDATE_ONLY')deny('REVIEW_STATUS_DRIFT');
  const pins=plain(root.sourcePins);
  if(pins.registrySha256!==ARIADNE_SHA256||pins.sourceSha256!==r.sourceSha256||root.sourceScope!=='WORK')deny('ROOT_SOURCE_DRIFT');
  if(!HEX.test(view.frameDigest)||!HEX.test(view.fullScoreSha256)||root.frameDigest!==view.frameDigest)deny('FRAME_DIGEST_UNBOUND');
  if(!['atlasOne','atlasGPT','atlasIntelligence','swarmchat'].every(k=>views[k]===res.view))deny('MULTIPLE_ACTIVATIONS_OR_ALIASES');
  const hh=dense(view.houseMass,12),ss=dense(view.sphereMass,144);
  // Never use or return private source body or neural scores from these arrays.
  if(!Array.isArray(view.baselineHits)||view.baselineHits.length<1||view.baselineHits.length>20)deny('HIT_COUNT');
  const hits=view.baselineHits.map(checkHit),set=new Set(hits.map(x=>x.hsn));
  if(set.size!==hits.length)deny('DUPLICATE_HSN');
  for(let j=1;j<hits.length;j++)if(hits[j-1].score<hits[j].score)deny('RANK_ORDER');
  ordinal(selectedHsn);
  if(role(selectedHsn)==='EPISTEMIC_META'){
   if(typeof subjectHsn!=='string'||role(subjectHsn)!=='DOMAIN_SPECIALIZATION'||houseId(subjectHsn)!==houseId(selectedHsn))deny('METHOD_REQUIRES_SAME_HOUSE_DOMAIN_SUBJECT');
  }else if(subjectHsn!==null)deny('DOMAIN_SUBJECT_UNEXPECTED');
  return Object.freeze({schema:HEARTH_SCHEMA,status:'PREPARED_NOT_RELEASED',
   ontologySha256:ARIADNE_SHA256,originalCoordinate:selectedHsn,ordinal:ordinal(selectedHsn),
   sphere:sphereId(selectedHsn),house:houseId(selectedHsn),role:role(selectedHsn),
   subjectHsn:subjectHsn??null,sourceEdition:r.sourceEdition,
   frameDigest:view.frameDigest,fullScoreDigest:view.fullScoreSha256,
   selectionDigest:sha(JSON.stringify([selectedHsn,subjectHsn,view.frameDigest,view.fullScoreSha256])),
   geometryNeighbors:ringNeighbors(selectedHsn),
   sourceStatus:'SOURCE_PINNED_SHAPE_NOT_PERMISSION_ATTESTED',
   network:Object.freeze({houses:12,spheres:144,nodes:1728,domainNodes:1008,methodNodes:720,typedPorts:PORTS.length}),
   visibleHitCount:hits.length,originalNeuralRankChanged:false,peerAlternativesRetained:true,
   requiredSetIndependentlyComplete:false,trainingAuthorized:false,releaseAuthorized:false,hostAuthenticated:false,
   sourceBodiesIncluded:false,liveSynced:false,canonChanged:false,modelCallsByHearth:0,authorityEffect:'NONE'});
 }catch(e){return HOLD(e instanceof Error&&/^[A-Z0-9_]+$/.test(e.message)?e.message:'UNTRUSTED_INPUT');}
}
/** Only real host code can supply these callbacks. Mock responses in unit tests
    demonstrate local ordering, never authorized production disclosure. */
export function createIndrasHearth({composer,sourcePhase}={}){
 if(!composer||typeof composer.inspect!=='function')deny('EXISTING_COMPOSER_REQUIRED');
 if(typeof sourcePhase!=='function')deny('EXISTING_SOURCE_PORT_REQUIRED');
 let calls=0;
 async function inspect(request,binding,options={}){
  try{
   const q=plain(request),a=await sourcePhase('READ',q),before=plain(a,['allow','epoch']);
   if(before.allow!==true||typeof before.epoch!=='string'||!before.epoch)deny('CURRENT_READ_HOLD');
   calls++;
   const response=await composer.inspect(request,binding,options.composerOptions??{});
   let view=prepareHearthSnapshot(response,request,{selectedHsn:options.selectedHsn,subjectHsn:options.subjectHsn});
   if(view.status!=='PREPARED_NOT_RELEASED')return view;
   for(const phase of ['INFERENCE_USE',...(q.purpose==='CITATION'?['DISCLOSURE_RETURN']:[]),'RETURN']){
    const cur=plain(await sourcePhase(phase,q),['allow','epoch']);
    if(cur.allow!==true||cur.epoch!==before.epoch)deny('LATE_RIGHTS_OR_EPOCH_HOLD');
   }
   // Metadata-only local inspection. No egress/grant, even after mock ALLOW.
   return view;
  }catch(e){return HOLD(e instanceof Error&&/^[A-Z0-9_]+$/.test(e.message)?e.message:'HOST_PHASE_EXCEPTION');}
 }
 return Object.freeze({schema:HEARTH_SCHEMA,inspect,descriptor:()=>Object.freeze({localInspectCalls:calls,externalComposerRequired:true,neuralCallsAdded:0,hostVerified:false})});
}
export function publicManifest(){
 return Object.freeze({schema:'atlas.indras-hearth.public-geometry/v1',ontologySha256:ARIADNE_SHA256,
  houses:12,spheres:144,nodes:1728,domainNodes:1008,methodNodes:720,ports:PORTS,
  sourceNamesIncluded:false,meaningOfDeityAssignment:'NOT_INFERRED',
  status:'LOCAL_STRUCTURE_ONLY',liveSynced:false,releaseAuthorized:false});
}
