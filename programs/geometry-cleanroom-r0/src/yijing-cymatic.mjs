/**
 * Atlas I Ching/Yijing × Cymatic Glyph Bridge: optional, symbolic, read-only.
 * Owner-approved Work navigation over the ORIGINAL Ariadne 12×12×12.
 * No interpretation, King Wen numbering, actual acoustics, source rights,
 * provider calls, rankings, training or physical efficacy are implied.
 * Independently authored from the published peer contracts (#392, #414, #420).
 */
import {types as utilTypes} from 'node:util';
import {createHash} from 'node:crypto';
import {decodeAddress,encodeAddress,originalAddresses,ARIADNE_SHA256} from './geometry.mjs';

export const BRIDGE_SCHEMA='atlas.yijing-cymatic.bridge/v1';
export const CUPWAKE_EDITION='atlas.yijing.cupwake-r01';
export const SYMBIOSIS_EDITION='atlas.yijing.symbiosis-v03';
export const EDITIONS=Object.freeze([CUPWAKE_EDITION,SYMBIOSIS_EDITION]);
export const ORIGIN='H01.S01.N01';
export const MODES=Object.freeze([[1,1],[1,2],[2,1],[2,2],[1,3],[3,1],[2,3],[3,2],[3,3]].map(a=>Object.freeze(a)));
export const TRIGRAMS=Object.freeze(['Kun / Earth','Zhen / Thunder','Kan / Water','Dui / Lake','Gen / Mountain','Li / Fire','Xun / Wind','Qian / Heaven']);
const HEX=/^[a-f0-9]{64}$/;
const HSN=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const HOLD=(reason)=>Object.freeze({schema:BRIDGE_SCHEMA,status:'HOLD',reason,releaseAuthorized:false,modelUpdated:false,authorityEffect:'NONE'});
function int(v,lo,hi){return typeof v==='number'&&Number.isInteger(v)&&v>=lo&&v<=hi;}
function plain(v,keys){
  if(!v||typeof v!=='object'||Array.isArray(v)||utilTypes.isProxy(v)||Object.getPrototypeOf(v)!==Object.prototype)throw Error('BAD_OBJECT');
  const d=Object.getOwnPropertyDescriptors(v),k=Reflect.ownKeys(d);
  if(k.length!==keys.length||k.some(x=>typeof x!=='string'||!keys.includes(x)))throw Error('UNKNOWN_FIELDS');
  const out={};
  for(const key of keys){const x=d[key];if(!x||!x.enumerable||!Object.hasOwn(x,'value'))throw Error('ACCESSOR_NOT_ALLOWED');out[key]=x.value;}
  return out;
}
function array(v,size){
  if(!Array.isArray(v)||utilTypes.isProxy(v)||v.length!==size)throw Error('BAD_ARRAY');
  const desc=Object.getOwnPropertyDescriptors(v);
  if(Reflect.ownKeys(desc).length!==size+1)throw Error('SPARSE_OR_EXTRA_ARRAY');
  return Array.from({length:size},(_,i)=>{const d=desc[String(i)];if(!d||!d.enumerable||!Object.hasOwn(d,'value'))throw Error('ACCESSOR_IN_ARRAY');return d.value;});
}
function edition(v){if(!EDITIONS.includes(v))throw Error('EXPLICIT_EDITION_REQUIRED');}
function coordinates(hsn){const x=decodeAddress(hsn);return [x.h-1,x.s-1,x.n-1];}
function embedAxis(x,which){
  // Cupwake: x=4*t + b+2*c ; Symbiosis: x=3*(b+2*c)+t.
  const t=which===CUPWAKE_EDITION?Math.floor(x/4):x%3;
  const u=which===CUPWAKE_EDITION?x%4:Math.floor(x/3);
  return [t,u&1,(u>>1)&1];
}
function unembedAxis(t,b,c,which){return which===CUPWAKE_EDITION?4*t+b+2*c:3*(b+2*c)+t;}
export function encodeYijing(hsn,sourceEdition=CUPWAKE_EDITION){
  edition(sourceEdition);const xyz=coordinates(hsn),axis=xyz.map(x=>embedAxis(x,sourceEdition));
  const contextDigits=Object.freeze(axis.map(x=>x[0]));
  const lower=axis.reduce((v,a,i)=>v|(a[1]<<i),0),upper=axis.reduce((v,a,i)=>v|(a[2]<<i),0);
  const code=lower|(upper<<3),contextCode=contextDigits[0]*9+contextDigits[1]*3+contextDigits[2];
  return Object.freeze({schema:BRIDGE_SCHEMA,hsn,edition:sourceEdition,hexagramCode:code,lowerTrigram:lower,upperTrigram:upper,contextCode,contextDigits,registrySha256:ARIADNE_SHA256,kind:'REVERSIBLE_NAVIGATION_ONLY',kingWenNumber:null,releaseAuthorized:false});
}
export function decodeYijing(input){
  const x=plain(input,['edition','hexagramCode','contextCode']);edition(x.edition);
  if(!int(x.hexagramCode,0,63)||!int(x.contextCode,0,26))throw Error('BAD_SYMBOLIC_CODE');
  const t=[Math.floor(x.contextCode/9),Math.floor(x.contextCode/3)%3,x.contextCode%3];
  const idx=t.map((ti,i)=>unembedAxis(ti,(x.hexagramCode>>i)&1,(x.hexagramCode>>(i+3))&1,x.edition));
  return encodeAddress(idx[0]+1,idx[1]+1,idx[2]+1);
}
export function flipLine(input,line){
  const x=plain(input,['edition','hexagramCode','contextCode']);edition(x.edition);
  if(!int(line,1,6))throw Error('BAD_LINE');
  decodeYijing(x);
  const newCode=x.hexagramCode^(1<<(line-1));
  return encodeYijing(decodeYijing({edition:x.edition,hexagramCode:newCode,contextCode:x.contextCode}),x.edition);
}
export function stepContext(input,axis,direction){
  const x=plain(input,['edition','hexagramCode','contextCode']);decodeYijing(x);
  if(!int(axis,0,2)||![1,-1].includes(direction))throw Error('BAD_STEP');
  const t=[Math.floor(x.contextCode/9),Math.floor(x.contextCode/3)%3,x.contextCode%3];
  const v=t[axis]+direction;if(v<0||v>2)return HOLD('CONTEXT_BOUNDARY_NO_WRAP');
  t[axis]=v;
  return encodeYijing(decodeYijing({edition:x.edition,hexagramCode:x.hexagramCode,contextCode:t[0]*9+t[1]*3+t[2]}),x.edition);
}
export function glyphCoefficients(ych){
  const x=plain(ych,['edition','hexagramCode','contextCode']);decodeYijing(x);
  const t=[Math.floor(x.contextCode/9),Math.floor(x.contextCode/3)%3,x.contextCode%3];
  return Object.freeze([...Array.from({length:6},(_,i)=>(x.hexagramCode>>i)&1?1:-1),...t.map(n=>n-1)]);
}
export function decodeGlyphCoefficients(coef,sourceEdition=CUPWAKE_EDITION){
  edition(sourceEdition);const c=array(coef,9);
  if(c.slice(0,6).some(x=>x!==-1&&x!==1)||c.slice(6).some(x=>!int(x,-1,1)))throw Error('INVALID_NINE_COEFFICIENT_GLYPH');
  const code=c.slice(0,6).reduce((v,x,i)=>v|(x===1?1<<i:0),0);
  const ctx=c[6]*9+c[7]*3+c[8]+13;
  return decodeYijing({edition:sourceEdition,hexagramCode:code,contextCode:ctx});
}
export function glyphDigitalToken(ych){
  const x=plain(ych,['edition','hexagramCode','contextCode']);decodeYijing(x);
  return `YJC1:${ARIADNE_SHA256.slice(0,12)}:${x.edition}:${String(x.hexagramCode).padStart(2,'0')}:${String(x.contextCode).padStart(2,'0')}`;
}
export function analyticGlyphSample(coef,u,v){
  const c=array(coef,9);
  if(c.slice(0,6).some(x=>x!==-1&&x!==1)||c.slice(6).some(x=>!int(x,-1,1))||![u,v].every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1))throw Error('BAD_DIMENSIONLESS_FIELD');
  let total=0;for(let i=0;i<9;i++){const [m,n]=MODES[i];total+=c[i]*Math.sin(Math.PI*m*u)*Math.sin(Math.PI*n*v);}
  return Object.freeze({value:total/9,units:'DIMENSIONLESS',calibration:'NONE',physicalHz:null,measured:false});
}
export function dimensionlessGlyphGrid(ych,side=16){
  if(!int(side,2,64))throw Error('BAD_GRID_SIZE');
  const coef=glyphCoefficients(ych);const rows=[];
  for(let y=0;y<side;y++){const row=[];for(let x=0;x<side;x++)row.push(analyticGlyphSample(coef,x/(side-1),y/(side-1)).value);rows.push(Object.freeze(row));}
  return Object.freeze({schema:'atlas.cymatic.dimensionless-analytic/v1',rows:Object.freeze(rows),fieldUnits:'DIMENSIONLESS',frequencyHz:null,physicalCalibration:'NOT_PERFORMED',sourceMeaning:'SYMBOLIC_SYNTHETIC',releaseAuthorized:false});
}
/** Do not pretend KG8, META145, or WaveLattice encodings are interchangeable. */
export function inspectGlyphPointer(input){
  const x=plain(input,['hsn','namespace','sourceEdition','sourceSha256','token','mode','relationKind']);
  if(!HSN.test(x.hsn)||!['KG8Q','KG8S','META145_GLYPH','WAVELATTICE_PARITY','CYMATIC'].includes(x.namespace)||
     typeof x.sourceEdition!=='string'||!x.sourceEdition||x.sourceEdition.length>100||
     typeof x.sourceSha256!=='string'||!HEX.test(x.sourceSha256)||
     typeof x.token!=='string'||!x.token||x.token.length>200||
     x.mode!=='WORK'||!['COMPUTATIONAL_OPERATOR','SEMANTIC_CANDIDATE','UNKNOWN'].includes(x.relationKind))throw Error('GLYPH_POINTER_UNVERIFIED');
  return Object.freeze({schema:'atlas.glyph.pointer/v1',...x,sourceRightsVerified:false,semanticMappingVerified:false,wireCompatible:false,review:'PROPOSED_UNREVIEWED',releaseAuthorized:false,authorityEffect:'NONE'});
}
function ownValue(o,key){
  if(!o||typeof o!=='object'||Array.isArray(o)||utilTypes.isProxy(o)||Object.getPrototypeOf(o)!==Object.prototype)throw Error('UNSAFE_ISSUED_RECORD');
  const d=Object.getOwnPropertyDescriptor(o,key);
  if(!d||!Object.hasOwn(d,'value')||!d.enumerable)throw Error('ISSUED_ACCESSOR_OR_MISSING');
  return d.value;
}
function verifiedResult(r){
  if(ownValue(r,'status')!=='PREPARED_NOT_HOSTED'||ownValue(r,'neuralCalls')!==1)throw Error('NOT_ONE_PREPARED_NEURAL_RESULT');
  const p=ownValue(r,'result'),cons=ownValue(r,'consumers');
  if(ownValue(p,'schema')!=='atlas.geometry.cleanroom.result/v1'||
     ownValue(p,'releaseAuthorized')!==false||ownValue(p,'fallbackUsed')!==false||
     ownValue(p,'rankingMethod')!=='NEURAL_EXACT'||ownValue(p,'modelInvocations')!==1)throw Error('NOT_CANONICAL_NEURAL_RESULT');
  const source=ownValue(p,'source');
  if(ownValue(source,'registrySha256')!==ARIADNE_SHA256)throw Error('WRONG_ORIGINAL_REGISTRY');
  for(const name of ['requestSha256','modelSha256','sourceSha256'])if(!HEX.test(ownValue(source,name)))throw Error('UNPINNED_SOURCE');
  if(typeof ownValue(source,'issuer')!=='string'||!ownValue(source,'issuer'))throw Error('UNPINNED_ISSUER');
  for(const name of ['atlasOne','atlasIntelligence','atlasgpt','swarmchat'])if(ownValue(cons,name)!==p)throw Error('DIFFERENT_CONSUMER_RESULTS');
  const candidates=ownValue(p,'candidates');
  if(!Array.isArray(candidates)||utilTypes.isProxy(candidates)||candidates.length<1||candidates.length>1728)throw Error('WRONG_CANDIDATE_SIZE');
  const cd=Object.getOwnPropertyDescriptors(candidates);
  if(Reflect.ownKeys(cd).length!==candidates.length+1)throw Error('SPARSE_CANDIDATES');
  const seen=new Set();let previous=null;
  const rows=[];
  for(let i=0;i<candidates.length;i++){
    const item=cd[String(i)];if(!item||!Object.hasOwn(item,'value'))throw Error('ACCESSOR_CANDIDATE');
    const c=item.value,hsn=ownValue(c,'hsn'),score=ownValue(c,'score'),idx=ownValue(c,'index');
    if(typeof hsn!=='string'||!HSN.test(hsn)||seen.has(hsn)||decodeAddress(hsn).index!==idx||
       typeof score!=='number'||!Number.isFinite(score))throw Error('BAD_CANDIDATE');
    if(ownValue(c,'sourceSha256')!==ownValue(source,'sourceSha256')||ownValue(c,'sourceEdition')!==ownValue(source,'sourceEdition'))throw Error('SOURCE_DRIFT');
    if(previous && (score>previous.score||(score===previous.score&&idx<previous.index)))throw Error('RANK_DRIFT');
    previous={score,index:idx};seen.add(hsn);rows.push({hsn,score});
  }
  return {product:p,consumers:cons,candidates:rows,source};
}
/** Consume the SAME local prepared result; explicitly not a host identity/rights attestor. */
export function attachYijingGlyphs(prepared,sourceEdition=CUPWAKE_EDITION){
  try{
    edition(sourceEdition);
    const verified=verifiedResult(prepared);
    const p=verified.product;
    const projections=Object.freeze(verified.candidates.map((c,rank)=>{
      const e=encodeYijing(c.hsn,sourceEdition),key={edition:sourceEdition,hexagramCode:e.hexagramCode,contextCode:e.contextCode};
      return Object.freeze({hsn:c.hsn,rank:rank+1,originalScore:c.score,yijing:e,cymatic:Object.freeze({digitalToken:glyphDigitalToken(key),coefficients:glyphCoefficients(key),physicalHz:null,kind:'ANALYTIC_GLYPH_ONLY'})});
    }));
    return Object.freeze({schema:BRIDGE_SCHEMA,status:'PREPARED_SYMBOLIC_ONLY',originalResult:p,originalConsumers:verified.consumers,
      source:verified.source,projection:projections,rankOrder:Object.freeze(verified.candidates.map(c=>c.hsn)),
      modelInvocationsAdded:0,retrieverAdded:false,rankChanged:false,hostedExecutionVerified:false,
      sourceRightsAttested:false,trainingEligible:false,releaseAuthorized:false,authorityEffect:'NONE'});
  }catch{return HOLD('UNTRUSTED_RESULT_OR_GLYPH_INPUT');}
}
/** Pattern digest for human review only, never identity, permission or wave evidence. */
export function symbolicDigest(ych){const c=glyphCoefficients(ych);return createHash('sha256').update(JSON.stringify(c)).digest('hex');}
export function navigationCounts(){return Object.freeze({originalNodes:1728,hexagramPatterns:64,ternaryContexts:27,uniqueHexagramLineFlipEdges:5184,uniqueAdjacentTernaryContextEdges:3456});}
