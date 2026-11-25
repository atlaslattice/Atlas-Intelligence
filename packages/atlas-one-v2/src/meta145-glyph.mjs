/** Atlas ONE / AtlasGPT / SwarmChat META145 -- source-only optional adapter.
 * No new graph store, trusted publisher, A2A sender, resident Brain or running model.
 * Original Ariadne bytes and all review artifacts must be injected by the owner.
 */
import {createHash} from 'node:crypto';
import {AriadneRegistry,canonical,Hold} from './index.mjs';

export const SCHEMA='atlas.one.meta145-glyph.v2';
export const SOURCE_SHA='07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6';
const Q=['sala','sele','sili','solo','sulu','tara','tere','tiri','toro','turu','mara','mere'];
const S=['gal','gel','gil','gol','gul','nal','nel','nil','nol','nul','thal','thel'];
const COORD=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/;
const SPHERE=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])$/;
const GQ=/^KG8([QS]):([a-f0-9]{12}):([a-z]+)\.([a-z]+)\.([a-z]+)$/;
const GF7=/^GF7\.B(0[1-9]|1[0-2])\.M(0[1-9]|1[0-2])\.C(0[1-9]|1[0-2])$/;
const ROOM=/^[A-Za-z0-9_-]{3,80}$/;
const hash=b=>createHash('sha256').update(b).digest('hex');
function require_(ok,code){if(!ok)throw new Hold(code);}
function jsonDigest(value){return hash(Buffer.from(canonical(value),'utf8'));}
function withoutHash(o,k){const obj={...o};delete obj[k];return obj;}
function checkedRaw(name,files,manifest,max=10_000_000){
 const v=files[name];require_(Buffer.isBuffer(v),'EXPECTED_ARTIFACT_BUFFER_'+name);
 require_(v.length<max&&manifest.outputs?.[name]===hash(v),'ARTIFACT_DIGEST_MISMATCH_'+name);
 try{return JSON.parse(v.toString('utf8'));}catch{throw new Hold('ARTIFACT_JSON_INVALID_'+name);}
}
function glyph(h,s,n,voice){const arr=voice==='Q'?Q:S;return `KG8${voice}:${SOURCE_SHA.slice(0,12)}:${arr[h-1]}.${arr[s-1]}.${arr[n-1]}`;}
function plate(h,s,n){return `GF7.B${String(h).padStart(2,'0')}.M${String(s).padStart(2,'0')}.C${String(n).padStart(2,'0')}`;}
function handleAlias(alias){
 if(typeof alias!=='string')throw new Hold('INVALID_SOURCE_ALIAS');
 if(COORD.test(alias))return {coord:alias,namespace:'HSN'};
 const m=GQ.exec(alias);
 if(m){require_(m[2]===SOURCE_SHA.slice(0,12),'WRONG_GLYPH_EDITION');const l=m[1]==='Q'?Q:S;
   const ids=m.slice(3).map(x=>l.indexOf(x));require_(ids.every(i=>i>=0),'INVALID_GLYPH_LEXEME');
   return {coord:`H${String(ids[0]+1).padStart(2,'0')}.S${String(ids[1]+1).padStart(2,'0')}.N${String(ids[2]+1).padStart(2,'0')}`,namespace:'KG8'};}
 const g=GF7.exec(alias);if(g)return {coord:`H${g[1]}.S${g[2]}.N${g[3]}`,namespace:'GF7_VISUAL_ONLY'};
 throw new Hold('UNKNOWN_COORDINATE_NAMESPACE');
}
const flags=()=>({hostAuthenticated:false,rightsVerified:false,canonAuthority:false,workPosted:false,modelWeightsChanged:false,residentAuthenticated:false,sourceOnly:true});

export class Meta145GlyphCircuit {
 #registry;#meta;#node;#perspectives;#reviews;#houses;#followups;#memory;
 constructor({originalAriadneBytes,metaBytes,artifactBytes,memoryPolicy=null}={}){
   require_(Buffer.isBuffer(originalAriadneBytes),'TRUSTED_ORIGINAL_BYTES_REQUIRED');
   this.#registry=new AriadneRegistry(originalAriadneBytes);
   require_(this.#registry.digest===SOURCE_SHA,'SOURCE_EDITION_CONFLICT');
   require_(Buffer.isBuffer(metaBytes)&&metaBytes.length<100000,'META_MANIFEST_BUFFER_REQUIRED');
   let m;try{m=JSON.parse(metaBytes.toString('utf8'));}catch{throw new Hold('META_MANIFEST_JSON_INVALID');}
   require_(m.sourceRegistrySHA256===SOURCE_SHA&&m.nodes===1728&&m.perspectives===144&&m.computedPairEvaluations===248832&&m.houseSphereFollowupReceipts===1728,'META_MANIFEST_SCOPE_MISMATCH');
   require_(jsonDigest(withoutHash(m,'meta145Digest'))===m.meta145Digest,'META_MANIFEST_SELF_DIGEST_MISMATCH');
   require_(artifactBytes&&typeof artifactBytes==='object'&&!Array.isArray(artifactBytes),'SOURCE_ARTIFACTS_REQUIRED');
   const nodes=checkedRaw('node_glyphs_1728.json',artifactBytes,m);
   const ps=checkedRaw('perspectives_144.json',artifactBytes,m);
   const reviews=checkedRaw('sphere_reviews_144.json',artifactBytes,m);
   const houses=checkedRaw('house_syntheses_12.json',artifactBytes,m);
   require_([nodes,ps,reviews,houses].every(Array.isArray),'DATA_ARRAYS_INVALID');
   require_(nodes.length===1728&&ps.length===144&&reviews.length===144&&houses.length===12,'DATA_CENSUS_INVALID');
   this.#node=new Map();this.#perspectives=new Map();this.#reviews=new Map();this.#houses=new Map();
   for(const n of nodes){const match=COORD.exec(n.coordinate);require_(match&&!this.#node.has(n.coordinate),'NODE_SOURCE_COORD_INVALID');
     const {sourceNodeSHA256,kind,name}=this.#registry.lookup(n.coordinate);let [h,s,k]=match.slice(1).map(Number);
     require_(sourceNodeSHA256===n.sourceRecordSha256&&kind===n.kind&&name===n.name,'NODE_SOURCE_SUBSTITUTION');
     require_(n.glyphQ===glyph(h,s,k,'Q')&&n.glyphS===glyph(h,s,k,'S')&&n.cymaticAddress===plate(h,s,k),'ALIAS_NAMESPACE_COLLISION');
     require_(n.semanticAccepted===false&&n.normativeAuthority===false,'SEMANTIC_PROMOTION_DENIED');
     this.#node.set(n.coordinate,Object.freeze({...n}));
   }
   for(const p of ps){require_(SPHERE.test(p.sphere)&&!this.#perspectives.has(p.sphere),'PERSPECTIVE_ID_INVALID');
     require_(p.homeNodes.length===12&&p.homeNodes.every((x,i)=>x===p.sphere+'.N'+String(i+1).padStart(2,'0')),'PERSPECTIVE_SOURCE_GROUP_CHANGED');
     require_(jsonDigest(withoutHash(p,'perspectiveSha256'))===p.perspectiveSha256,'PERSPECTIVE_DIGEST_INVALID');
     const role=Number(p.sphere.slice(5,7))<=7?'DOMAIN_SPECIALIZATION':'EPISTEMIC_META';
     require_(role===p.sourceRole&&p.homeNodes.every(c=>this.#node.get(c)?.kind===role),'PERSPECTIVE_ROLE_CHANGED');
     this.#perspectives.set(p.sphere,Object.freeze({...p}));
   }
   for(const r of reviews){require_(this.#perspectives.has(r.sphere)&&!this.#reviews.has(r.sphere),'SPHERE_REVIEW_MISMATCH');
     require_(r.semanticAccepted===0&&r.evaluatedNodeCount===1728,'SEMANTIC_REVIEW_FALSE_APPROVAL');
     this.#reviews.set(r.sphere,Object.freeze({...r}));
   }
   for(const h of houses){require_(/^H(0[1-9]|1[0-2])$/.test(h.house)&&!this.#houses.has(h.house),'HOUSE_REVIEW_MISMATCH');this.#houses.set(h.house,Object.freeze({...h}));}
   this.#followups=artifactBytes['house_sphere_followups_1728.jsonl'];
   require_(Buffer.isBuffer(this.#followups)&&hash(this.#followups)===m.outputs['house_sphere_followups_1728.jsonl'],'FOLLOWUP_DIGEST_INVALID');
   const records=this.#followups.toString('utf8').trim().split('\n');
   require_(records.length===1728,'FOLLOWUP_CENSUS_INVALID');
   for(let i=0;i<records.length;i++){
     const f=JSON.parse(records[i]),sp=ps[Math.floor(i/12)],house='H'+String(i%12+1).padStart(2,'0');
     require_(f.sourceSphere===sp.sphere&&f.reviewHouse===house&&f.reviewState==='FOLLOWUP_PROPOSED_NOT_PERFORMED'
       &&f.semanticStatus==='UNREVIEWED'&&!f.rightsGranted&&f.newIndependentEvaluations===0,'HOUSE_FOLLOWUP_FALSE_COMPLETION');
     require_(jsonDigest(withoutHash(f,'receiptSha256'))===f.receiptSha256,'FOLLOWUP_HASH_MISMATCH');
   }
   this.#memory=memoryPolicy;
   if(memoryPolicy)require_(memoryPolicy.selected==='POSTINGS_INDEX'&&memoryPolicy.sourceSHA256===SOURCE_SHA&&memoryPolicy.sourceInputDigest===m.meta145Digest&&memoryPolicy.siteDeployed===false,'MEMORY_SCOPE_INVALID');
   this.#meta=Object.freeze({...m});Object.freeze(this);
 }
 status(){return {schema:SCHEMA,status:'LOCAL_SOURCE_VERIFIED_CANDIDATE',sourceSHA256:SOURCE_SHA,perspectives:144,nodes:1728,
   evaluatedPairs:this.#meta.computedPairEvaluations,uniquePerspectiveDigests:this.#meta.uniquePerspectiveDigests,
   lexicalCandidateEdges:this.#meta.candidateEdges,sourceMeta145Digest:this.#meta.meta145Digest,
   houseSphereFollowupReceipts:this.#meta.houseSphereFollowupReceipts,
   verifiedJsonSourceBound:true,matrixSqliteIndependentlyReadByThisAdapter:false,learningMode:'LOCAL_REPLAY_ON_INVOCATION_ONLY',...flags()};}
 resolve(alias){const a=handleAlias(alias),source=this.#node.get(a.coord);require_(source,'ORIGINAL_NODE_NOT_FOUND');
   return {schema:SCHEMA,status:'SOURCE_LOCATED_NOT_SEMANTICALLY_ADJUDICATED',requestedNamespace:a.namespace,
     coordinate:source.coordinate,name:source.name,nodeKind:source.kind,sourceNodeSHA256:source.sourceRecordSha256,
     glyphQ:source.glyphQ,glyphS:source.glyphS,cymaticAddress:source.cymaticAddress,
     cymaticRelation:'POSITIONAL_VISUAL_INDEX_ONLY',physicalMeaningFromHSN:false,...flags()};}
 sphereReview(id){require_(SPHERE.test(id)&&this.#perspectives.has(id),'SPHERE_UNKNOWN');const p=this.#perspectives.get(id),r=this.#reviews.get(id);
   return {schema:SCHEMA,status:'COMPUTED_PERSPECTIVE_UNREVIEWED',sphere:id,perspectiveSha256:p.perspectiveSha256,
     role:p.sourceRole,anchorTerms:p.anchorTerms,homeNodes:p.homeNodes,
     candidateNodeRefs:r.topCandidateNodeIds,unreviewedCandidates:r.lexicalCandidates.length,
     semanticEdgesAccepted:0,...flags()};}
 houseReview(id){const h=this.#houses.get(id);require_(h,'HOUSE_UNKNOWN');return {schema:SCHEMA,status:'HOUSE_REVIEW_CANDIDATE',house:id,sphereCount:h.sphereIds.length,
  houseName:h.houseName,sourcePerspectiveDigests:h.sourcePerspectiveDigests,proposedCrossHouseQuestion:h.crossHouseQuestion,
  semanticEdgesAccepted:0,...flags()};}
 functionalMemory(){return {schema:SCHEMA,status:this.#memory?'VERIFIED_LOCAL_FEEDBACK_REPLAYED':'NO_VERIFIED_FEEDBACK_ATTACHED',
   sourceMeta145Digest:this.#meta.meta145Digest,selectedPolicy:this.#memory?.selected||'BASELINE_SCAN',
   evidenceEventIds:this.#memory?.evidenceEventIds||[],hasModifiedModelWeights:false,
   continuousBackgroundLearning:false,...flags()};}
 prepareWorkDraft(alias,roomId){require_(typeof roomId==='string'&&ROOM.test(roomId),'ROOM_ID_INVALID');const source=this.resolve(alias);
   return {schema:'atlas.one.meta145.work-review-draft/v1',status:'PREPARED_NOT_POSTED',mode:'WORK',roomId,
    sourceRef:{coordinate:source.coordinate,nodeSha256:source.sourceNodeSHA256,sourceEdition:'Ariadne v0.7',registrySha256:SOURCE_SHA},
    perspectiveSha256:this.#perspectives.get(source.coordinate.slice(0,7))?.perspectiveSha256,
    originNamespace:source.requestedNamespace,sourceStatus:'NOT_SEMANTICALLY_ADJUDICATED',
    canPost:false,sourceTextsReturned:false,contentIngested:false,rightsVerified:false,
    hostAuthenticated:false,privateModeIngested:false,canonEffect:'NONE'};}
}

/** Public-safe, reversible DISPLAY-only coordinate helpers. They have no
 * original-source permission, acoustic semantics, graph ingress or issuer role.
 */
export function meta145EncodeDisplayAliases(coordinate){
 const m=typeof coordinate==='string'?COORD.exec(coordinate):null;require_(m,'INVALID_CANONICAL_HSN');
 const [h,s,n]=m.slice(1).map(Number);
 return Object.freeze({coordinate,sourceSHA256:SOURCE_SHA,
   glyphQ:glyph(h,s,n,'Q'),glyphS:glyph(h,s,n,'S'),gf7VisualPosition:plate(h,s,n),
   bridgeType:'POSITIONAL_VISUAL_INDEX_ONLY',semanticEquivalence:false,
   physicalCoupling:false,authorityEffect:'NONE'});
}
export function meta145DecodeDisplayAlias(alias){
 const x=handleAlias(alias);
 return Object.freeze({coordinate:x.coord,namespace:x.namespace,
   bridgeType:x.namespace==='GF7_VISUAL_ONLY'?'POSITIONAL_VISUAL_INDEX_ONLY':'HSN_GLYPH_ALIAS_ONLY',
   originalRegistryBytesChecked:false,sourceSHA256:SOURCE_SHA,
   permissionGranted:false,semanticEquivalence:false,physicalCoupling:false,authorityEffect:'NONE'});
}
