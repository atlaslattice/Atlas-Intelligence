/** Atlas HOME: reversible original HSN address geometry, no semantic projection. */
export const ARIADNE_SHA256 = '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
export const AXES = Object.freeze([12,12,12]);
export const HOUSES = 12, SPHERES = 144, NODES = 1728;
export const KNOWLEDGE_EDITION = 'ariadne-reader/v0.7';
const PATTERN=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const pad=n=>String(n).padStart(2,'0');
function axis(n){if(typeof n!=='number'||!Number.isInteger(n)||n<1||n>12)throw new TypeError('AXIS_OUT_OF_RANGE');return n;}
export function encode(h,s,n){return `H${pad(axis(h))}.S${pad(axis(s))}.N${pad(axis(n))}`;}
export function toIndex(h,s,n){return ((axis(h)-1)*12+(axis(s)-1))*12+(axis(n)-1);}
export function fromIndex(i){if(typeof i!=='number'||!Number.isInteger(i)||i<0||i>=1728)throw new TypeError('HSN_INDEX_OUT_OF_RANGE');return Object.freeze({h:Math.floor(i/144)+1,s:Math.floor(i/12)%12+1,n:i%12+1});}
export function decode(id){const m=typeof id==='string'?PATTERN.exec(id):null;if(!m)throw new TypeError('HSN_ADDRESS_INVALID');const [h,s,n]=m.slice(1).map(Number);return Object.freeze({h,s,n,index:toIndex(h,s,n),hsn:id});}
export const HSN=Object.freeze(Array.from({length:NODES},(_,i)=>{const x=fromIndex(i);return encode(x.h,x.s,x.n)}));
export function sourceKind(id){const {s}=decode(id);return s<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META';}
export function structuralRole(id){const x=decode(id);return Object.freeze({hsn:id,kind:sourceKind(id),house:`H${pad(x.h)}`,sphere:`H${pad(x.h)}.S${pad(x.s)}`,roleSourceEdition:KNOWLEDGE_EDITION,roleSourceSha256:ARIADNE_SHA256,semanticAccepted:false});}
export function methodSubjectCandidate(methodHsn,subjectHsn){const m=decode(methodHsn);if(m.s<=7)return Object.freeze({status:'NOT_A_METHOD',semanticallyReviewed:false});if(typeof subjectHsn!=='string')return Object.freeze({status:'HOLD_SUBJECT_REQUIRED',semanticallyReviewed:false});let s;try{s=decode(subjectHsn)}catch{return Object.freeze({status:'HOLD_SUBJECT_INVALID',semanticallyReviewed:false})}return Object.freeze({status:s.h===m.h&&s.s<=7?'STRUCTURAL_SUBJECT_CANDIDATE':'HOLD_SUBJECT_INVALID',semanticallyReviewed:false});}
export const ROLE_COUNTS=Object.freeze({DOMAIN_SPECIALIZATION:1008,EPISTEMIC_META:720,domainSpheres:84,methodSpheres:60});
export function houseNodes(h){axis(h);return HSN.slice((h-1)*144,h*144)}
export function sphereNodes(h,s){axis(h);axis(s);let i=toIndex(h,s,1);return HSN.slice(i,i+12)}
// P12 Cartesian adjacency: an optional navigational topology, never an evidence/physical network.
export function pathNeighbors(id){const {h,s,n}=decode(id),res=[];for(const [dimension,value] of [['h',h],['s',s],['n',n]])for(const step of [-1,1]){const v=value+step;if(v>=1&&v<=12){const x={h,s,n,[dimension]:v};res.push(encode(x.h,x.s,x.n))}}return Object.freeze(res)}
export const GRAPH_PROPS=Object.freeze({forestContainmentEdges:1872,path12CubedUndirectedEdges:4752,semanticInferenceFromDistance:false});
