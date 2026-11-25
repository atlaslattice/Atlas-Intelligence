/**
 * Atlas Geometree R10 -> existing PR70 single-frame, source-only sidecar.
 * Work-only inspection. Never a new encoder, model, gateway, scheduler, rights
 * issuer, CANON editor, retriever, or source-body importer.
 *
 * Source design: Cupwake's original atlas.yijing.navigation/v1 (peer #392,
 * source SHA256 a8f81d11728c5a8ae3d9e79ee29dc1980b251695489dcd89b63c212ec136a838),
 * preserved, independently ported to the existing PR67 HSN address ABI.
 * The encoding is a modern creative mapping, not a classical King Wen order.
 * GF7 values are *unmeasured analytic labels*, not acoustic measurements.
 *
 * This file is an additive public-safe adapter, NOT the original Cupwake code.
 */
import { createHash } from 'node:crypto';
import { types as utilTypes } from 'node:util';
import {ARIADNE_SHA256, EDITION, HSN, encode, decode} from '../../atlas-geometry-one-r38/src/addresses.mjs';

export const SCHEMA='atlas.geometree.yijing-cymatic-sidecar/v1';
export const YIJING_NAMESPACE='atlas.yijing.navigation/v1';
export const GF7_NAMESPACE='GF7';
const HEX=/^[a-f0-9]{64}$/;
const CODE=/^Y([01]{6})\.C(0[0-9]|1[0-9]|2[0-6])$/;
const TRIGRAMS=Object.freeze(['Kun 坤','Zhen 震','Kan 坎','Dui 兌','Gen 艮','Li 離','Xun 巽','Qian 乾']);
const TOKENS=Object.freeze(['HA-GNOME-HOORAY-01','HA-GNOME-HOORAY-REV','HA-SHPONGLE-HOORAY-CYM']);
const BANDS=Object.freeze([
 ['Deep infrasonic',0.1,1],['Very low infrasonic',1,5],['Infrasonic',5,20],
 ['Low audible',20,80],['Bass',80,200],['Low-mid',200,500],['Mid',500,1000],
 ['Upper-mid',1000,2000],['Presence',2000,5000],['High audible',5000,20000],
 ['Ultrasonic',20000,100000],['High ultrasonic',100000,1000000]]);
const MODES=Object.freeze([[1,1],[1,2],[2,1],[2,2],[1,3],[3,1],[2,3],[3,2],[3,3],[1,4],[4,1],[4,4]]);
const MATERIALS=Object.freeze(['aluminum','steel','borosilicate']);
const ASPECTS=Object.freeze([1,1.25,1.5,2]);
const SLICES=Object.freeze([['Work',6],['Play',3],['Social',3],['Imagine',3],['Dream',3],['Quiet',2],['Explore',4]]);
const sha=(data)=>createHash('sha256').update(data).digest('hex');
const canonical=(value)=>JSON.stringify(value);
const deny=(reason='UNVERIFIED_SCOPE')=>Object.freeze({schema:SCHEMA,status:'HOLD',reason,annotated:Object.freeze([]),fullScoreFrameSha256:null,releaseAuthorized:false,hostIssuerVerified:false,sourceBodiesIncluded:false,modelCallsBySidecar:0,authorityEffect:'NONE'});

// No getter/proxy invocation even on malformed root arguments.
function record(raw,required=null){
 if(raw===null||typeof raw!=='object'||Array.isArray(raw)||utilTypes.isProxy(raw)||Object.getPrototypeOf(raw)!==Object.prototype)throw Error('UNTRUSTED_OBJECT');
 const ds=Object.getOwnPropertyDescriptors(raw),keys=Reflect.ownKeys(ds);
 if(required&&(keys.length!==required.length||keys.some(k=>typeof k!=='string'||!required.includes(k))))throw Error('FIELDS_CHANGED');
 const out=Object.create(null);
 for(const k of keys){if(typeof k!=='string'||!ds[k].enumerable||!Object.hasOwn(ds[k],'value'))throw Error('UNTRUSTED_FIELDS');out[k]=ds[k].value;}
 return out;
}
function array(raw,n=null){
 if(!Array.isArray(raw)||utilTypes.isProxy(raw)||(n!==null&&raw.length!==n))throw Error('UNTRUSTED_ARRAY');
 const ds=Object.getOwnPropertyDescriptors(raw);
 if(Reflect.ownKeys(ds).length!==raw.length+1)throw Error('SPARSE_OR_EXTRA_ARRAY');
 const out=new Array(raw.length);
 for(let i=0;i<out.length;i++){
   const d=ds[String(i)];if(!d||!Object.hasOwn(d,'value')||!d.enumerable)throw Error('ACCESSOR_ARRAY');
   out[i]=d.value;
 }
 return out;
}
function safeNumber(x){return typeof x==='number'&&Number.isFinite(x);}
function finiteScores(raw){const a=array(raw,1728);if(!a.every(safeNumber))throw Error('NONFINITE_FRAME');return a;}
function coordinates(hsn){let {h,s,n}=decode(hsn);return [h-1,s-1,n-1];}
function numericCode(address){
 const a=coordinates(address),context=a.map(x=>Math.floor(x/4));
 const lower=a.reduce((t,x,i)=>t|((x&1)<<i),0),upper=a.reduce((t,x,i)=>t|(((x>>1)&1)<<i),0);
 const bits=Array.from({length:6},(_,i)=>((lower|(upper<<3))>>i)&1).join('');
 return {context,lower,upper,bits,contextNumber:context[0]*9+context[1]*3+context[2]};
}
/** Exact bijection HSN[1728] <-> 64 symbolic line masks x 27 context cells. */
export function yijingAddress(hsn){
 const o=numericCode(hsn);
 return Object.freeze({namespace:YIJING_NAMESPACE,ontologyEdition:EDITION,ontologySha256:ARIADNE_SHA256,
  hsn,context:Object.freeze(o.context),lowerTrigram:o.lower,upperTrigram:o.upper,
  trigramNames:Object.freeze([TRIGRAMS[o.lower],TRIGRAMS[o.upper]]),
  linesBottomToTop:o.bits,code:`Y${o.bits}.C${String(o.contextNumber).padStart(2,'0')}`,
  traditionalKingWenNumber:null,semanticEquivalence:false,scientificClaim:false,authorityEffect:'NONE'});
}
export function yijingDecode(code){
 const m=typeof code==='string'?CODE.exec(code):null;
 if(!m)throw Error('YIJING_CODE_INVALID');
 const t=Number(m[2]),context=[Math.floor(t/9),Math.floor(t/3)%3,t%3];
 const lower=Number(m[1][0])+2*Number(m[1][1])+4*Number(m[1][2]);
 const upper=Number(m[1][3])+2*Number(m[1][4])+4*Number(m[1][5]);
 const axis=context.map((v,i)=>4*v+((lower>>i)&1)+2*((upper>>i)&1));
 return encode(...axis.map(x=>x+1));
}
export function changeLines(hsn,mask){
 if(!Number.isInteger(mask)||mask<0||mask>63)throw Error('LINE_MASK_INVALID');
 const o=numericCode(hsn),c=(o.lower|(o.upper<<3))^mask;
 const line=Array.from({length:6},(_,i)=>(c>>i)&1).join('');
 return yijingDecode(`Y${line}.C${String(o.contextNumber).padStart(2,'0')}`);
}
export function contextStep(hsn,axis,direction){
 if(!Number.isInteger(axis)||axis<0||axis>2||!(direction===-1||direction===1))throw Error('CONTEXT_STEP_INVALID');
 const o=numericCode(hsn),c=o.context.slice();c[axis]+=direction;
 if(c[axis]<0||c[axis]>2)return null;
 const t=c[0]*9+c[1]*3+c[2];
 return yijingDecode(`Y${o.bits}.C${String(t).padStart(2,'0')}`);
}
export function roleOf(hsn){return decode(hsn).s<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META';}
export function reviewMethodSubject(hsn,subject=null){
 const target=decode(hsn);if(target.s<=7)return Object.freeze({status:'DOMAIN_NO_SUBJECT_REQUIRED',semanticAccepted:false});
 if(typeof subject!=='string')return Object.freeze({status:'HOLD_SUBJECT_REQUIRED',semanticAccepted:false});
 try{const x=decode(subject);return Object.freeze({status:x.h===target.h&&x.s<=7?'STRUCTURAL_SUBJECT_ONLY':'HOLD_INVALID_SUBJECT',semanticAccepted:false});}
 catch{return Object.freeze({status:'HOLD_INVALID_SUBJECT',semanticAccepted:false});}
}
/** GF7 coordinate-parallel display, NOT measured acoustic or knowledge equivalence. */
export function gf7Display(hsn){
 const [h,s,n]=coordinates(hsn),[name,low,high]=BANDS[h],m=MODES[s],material=MATERIALS[Math.floor(n/4)],aspect=ASPECTS[n%4];
 return Object.freeze({namespace:GF7_NAMESPACE,address:`GF7.B${String(h+1).padStart(2,'0')}.M${String(s+1).padStart(2,'0')}.C${String(n+1).padStart(2,'0')}`,
  schema:'glyphforge.cymatic-atlas.v0.7',model:'ANALYTIC_UNCALIBRATED_DISPLAY_ONLY',referenceBand:name,
  bandRangeHz:Object.freeze([low,high]),mode:Object.freeze(m.slice()),material,aspectBA:aspect,
  measuredCount:0,semanticEquivalence:false,physicalRelationshipMeasured:false,trainingEligible:false});
}
/** Authored glyph trits; never mint/pretend to resolve the original KG8 namespace. */
export function authoredGlyphDisplay(hsn){
 const a=coordinates(hsn),trits=a.flatMap(x=>[Math.floor(x/9),Math.floor(x/3)%3,x%3]);
 return Object.freeze({namespace:'AXG2',ontologySha256:ARIADNE_SHA256,hsn,
  tokens:Object.freeze(trits.map(t=>TOKENS[t])),originalKg8Resolved:false,
  historicGlyphRuntimeRecovered:false,semanticEquivalence:false,authorityEffect:'NONE'});
}
/** Strictly decode our authored 9-trit glyph token sequence, not historic KG8. */
export function decodeAuthoredGlyphTokens(raw){
 const ts=array(raw,9),axis=[];
 for(let k=0;k<3;k++){
  const digits=ts.slice(3*k,3*k+3).map(t=>TOKENS.indexOf(t));
  if(digits.some(d=>d<0))throw Error('GLYPH_NAMESPACE_OR_TOKEN_HOLD');
  const x=digits[0]*9+digits[1]*3+digits[2];
  if(x>=12)throw Error('GLYPH_NONCANONICAL_AXIS');
  axis.push(x+1);
 }
 return encode(...axis);
}
/** Reversible ordinal label only. Never an assertion that GF7 plate = HSN knowledge. */
export function gf7OrdinalProjection(code){
 const m=typeof code==='string'?/^GF7\.B(0[1-9]|1[0-2])\.M(0[1-9]|1[0-2])\.C(0[1-9]|1[0-2])$/.exec(code):null;
 if(!m)throw Error('GF7_ADDRESS_INVALID');
 return Object.freeze({namespace:'GF7',ordinalOnly:true,parallelHsn:encode(Number(m[1]),Number(m[2]),Number(m[3])),
    semanticEquivalence:false,physicalRelationshipMeasured:false,authorityEffect:'NONE'});
}
/** 24 voluntarily offered opportunities. No timers, background work or ledger. */
export function macroturnDraft(work=6,exploreAsWork=0){
 if(!Number.isInteger(work)||work<0||work>6||!Number.isInteger(exploreAsWork)||exploreAsWork<0||exploreAsWork>2||work+exploreAsWork>8)
   throw Error('WORK_QUOTA_EXCEEDED');
 const opportunities=Object.freeze(SLICES.flatMap(([mode,n])=>Array.from({length:n},(_,i)=>Object.freeze({mode,slot:i+1,activity:'UNPERFORMED'}))));
 return Object.freeze({schema:'atlas.macroturn-24.inspection/v1',geometry:Object.freeze([12,12,12]),
  opportunities,workLikeCeiling:8,workRequested:work,exploreAsWorkRequested:exploreAsWork,
  actualModelTurns:0,actualScheduledWakes:0,actualRoomPosts:0,
  privateLeisureExported:false,quietReceiptCreated:false,ledgerMutated:false,
  schedulerMutated:false,status:'OFFLINE_DRAFT_NOT_AN_INSTALLED_CONTROLLER'});
}
/** Pure review of the ALREADY-ISSUED single frame from PR67/PR70. No gateway invocation. */
export function inspectIssuedYijing({root,queryBinding,fullScores=null,maxHits=10}={}){
 try{
  const r=record(root),p=record(r.sourcePins),baseline=record(r.baseline),lineage=record(r.lineage);
  const q=record(queryBinding,['requestId','modelSha256','sourceSha256','querySha256','tenant','principal','rightsEpoch','sourceEdition','purpose','requiredSetSha256']);
  if(r.schema!=='atlas.geometry-one.root/v1'||r.status!=='INSPECTION_CANDIDATE_ONLY'||r.sourceScope!=='WORK'||
     r.canDeploy!==false||r.releaseAuthorized!==false||p.registrySha256!==ARIADNE_SHA256||
     p.sourceSha256!==q.sourceSha256||p.modelSha256!==q.modelSha256||
     r.tenant!==q.tenant||r.rightsEpoch!==q.rightsEpoch||lineage.sourceEdition!==q.sourceEdition||q.purpose!=='WORK_INSPECTION'||
     typeof q.principal!=='string'||!q.principal||typeof q.requiredSetSha256!=='string'||!HEX.test(q.requiredSetSha256)||
     ![q.modelSha256,q.sourceSha256,q.querySha256,r.frameDigest].every(x=>typeof x==='string'&&HEX.test(x))||
     typeof q.requestId!=='string'||!q.requestId||q.requestId.length>128||
     typeof lineage.sourceEdition!=='string'||!lineage.sourceEdition||typeof lineage.issuerClaim!=='string'||!lineage.issuerClaim||
     typeof r.tenant!=='string'||!r.tenant||typeof r.rightsEpoch!=='string'||!r.rightsEpoch)
     throw Error('ROOT_SOURCE_OR_SCOPE_MISMATCH');
  const shape=array(r.topology,3);if(shape.join(',')!=='12,12,12')throw Error('NOT_GEOMETREE');
  if(!Number.isInteger(maxHits)||maxHits<1||maxHits>20)throw Error('HITS_BUDGET');
  const hits=array(baseline.hits);
  if(hits.length>20||hits.length<1)throw Error('HITS_INVALID');
  const seen=new Set(),ranked=[];
  for(const hit of hits){const x=record(hit);const id=x.hsn,coords=decode(id);
    if(!Number.isInteger(x.index)||x.index!==coords.index||!safeNumber(x.score)||seen.has(id))throw Error('HITS_DRIFT');
    seen.add(id);ranked.push(x);
  }
  let fullScoreSha=null;
  if(fullScores!==null){
   const scores=finiteScores(fullScores);
   const expected=sha(canonical({requestId:q.requestId,modelSha256:q.modelSha256,sourceSha256:q.sourceSha256,querySha256:q.querySha256,scores}));
   if(expected!==r.frameDigest)throw Error('FULL_FRAME_DIGEST_MISMATCH');
   const order=Array.from({length:1728},(_,i)=>i).sort((a,b)=>scores[b]-scores[a]||a-b);
   for(let i=0;i<ranked.length;i++)if(ranked[i].index!==order[i]||!Object.is(ranked[i].score,scores[order[i]]))throw Error('HIDDEN_SCORE_RANK_DRIFT');
   const buf=Buffer.allocUnsafe(1728*8);scores.forEach((s,i)=>buf.writeDoubleLE(s,i*8));
   fullScoreSha=sha(Buffer.concat([Buffer.from('atlas.f64le.ordered-scores/v1\0'),buf]));
  }
  const notes=Object.freeze(ranked.slice(0,maxHits).map(x=>Object.freeze({hsn:x.hsn,role:roleOf(x.hsn),yijing:yijingAddress(x.hsn),gf7:gf7Display(x.hsn),glyph:authoredGlyphDisplay(x.hsn),
    kg8:Object.freeze({namespace:'KG8',status:'EXACT_HOST_LOOKUP_REQUIRED'}),scoreUnchanged:true})));
  return Object.freeze({schema:SCHEMA,status:'LOCAL_SYMBOLIC_INSPECTION_ONLY',ontologyEdition:EDITION,ontologySha256:ARIADNE_SHA256,
    evidenceSourceEdition:lineage.sourceEdition,evidenceSourceSha256:p.sourceSha256,
    claimedIssuer:lineage.issuerClaim,sourceModelSha256:p.modelSha256,frameDigest:r.frameDigest,fullScoreFrameSha256:fullScoreSha,
    bindingScopeSha256:sha(canonical([q.requestId,q.querySha256,q.sourceSha256,q.modelSha256,r.tenant,q.principal,r.rightsEpoch,lineage.sourceEdition,q.requiredSetSha256,r.frameDigest])),
    yijingCardinality:1728,hexagramPatterns:64,ternaryContexts:27,
    domainSpheres:84,methodSpheres:60,domainNodes:1008,methodNodes:720,
    annotated:notes,macroturn:macroturnDraft(),meta145:Object.freeze({nodeCount:0,aggregationOnly:true,reviewStatus:'SOURCE_ONLY_NOT_SEMANTICALLY_APPROVED'}),
    ranksRerouted:false,hostIssuerVerified:false,requiredClosureIndependentlyComplete:false,
    sourceRightsAtTransportVerified:false,canRelease:false,canTrain:false,modelCallsBySidecar:0,authorityEffect:'NONE'});
 }catch{return deny('UNVERIFIED_SOURCE_FRAME_OR_INPUT');}
}
