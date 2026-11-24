/** Owner-private, extractive corpus engine. Pure ESM: no I/O, provider, Node, DOM or storage dependency. */
import {sha256,canonical,tokens,normalize,chunkOffsets,deriveAliases,trigrams,trigramSimilarity,editDistanceAtMost} from './text.mjs';
export {sha256,chunkOffsets} from './text.mjs';
export {FEATURE_REGISTRY} from './features.mjs';
import {FEATURE_REGISTRY} from './features.mjs';

export const CORPUS_ENGINE_VERSION='atlas.corpus.engine/1.0.0';
const RELATIONS=new Set(['SUPPORTS','CHALLENGES','CONTRADICTS','REQUIRES','SUPERSEDES','VERSION_OF','CITES','RELATED_TO','DUPLICATE_OF']);
const COUNTER=new Set(['CHALLENGES','CONTRADICTS']);
const LINEAGE=new Set(['SUPERSEDES','VERSION_OF','DUPLICATE_OF']);
const HSN=/\bH(?:0[1-9]|1[0-2])\.S(?:0[1-9]|1[0-2])\.N(?:0[1-9]|1[0-2])\b/g;
const DEFAULTS=Object.freeze({targetChunkChars:900,maxChunkChars:1600,maxDocuments:10000,maxTotalChars:24000000,
  maxDocumentChars:8000000,maxQueryChars:12000,maxQueryTerms:64,maxVocabulary:250000,
  k1:1.2,b:.75,titleBoost:1.5,rrfK:60,lexicalWeight:1,noisyWeight:.35,idWeight:2,relationWeight:.2,
  minLexicalCoverage:.25,minNoisySimilarity:.6,minScore:0,maxFuzzyVocabulary:2048,maxFuzzyPerTerm:3,
  maxRelationExpansion:32,maxPerSource:1});
const DEFAULT_STATUS=Object.freeze({SOURCE_REPORTED:1,SOURCE_INSPECTED_UNREVIEWED:1,UNREVIEWED:1,
  PRIMARY_SOURCE:1.05,VERIFIED_REFERENCE:1.05,HYPOTHESIS:.85,DISPUTED:.85,RETRACTED:.5,SUPERSEDED:.85});
const plain=x=>x!==null&&typeof x==='object'&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const need=(value,code)=>{if(!value)throw Object.assign(new Error(code),{code});};
const id=x=>typeof x==='string'&&x.length>0&&x.length<=1024&&!/[\u0000-\u001f]/.test(x);
const string=(x,max=4096)=>typeof x==='string'&&x.length<=max;
const unique=xs=>[...new Set(xs)];
const cmp=(a,b)=>a<b?-1:a>b?1:0;
const freeze=value=>{if(value&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;};
/** Capture plain JSON without executing accessors, toJSON, prototypes or instruction text. */
function capture(value){
  const seen=new Set();let n=0;
  function visit(v,depth){
    need(++n<=500000&&depth<=32,'CORPUS_DATA_BOUND');
    if(v===null||typeof v==='string'||typeof v==='boolean')return v;
    if(typeof v==='number'){need(Number.isFinite(v),'CORPUS_FINITE_DATA_REQUIRED');return v;}
    need(v&&typeof v==='object'&&!seen.has(v),'CORPUS_PLAIN_DATA_REQUIRED');seen.add(v);let out;
    if(Array.isArray(v)){need(v.length<=100000&&Reflect.ownKeys(v).length===v.length+1,'CORPUS_DENSE_ARRAY_REQUIRED');out=[];
      for(let i=0;i<v.length;i++){const d=Object.getOwnPropertyDescriptor(v,String(i));need(d&&Object.hasOwn(d,'value'),'CORPUS_ACCESSORS_FORBIDDEN');out.push(visit(d.value,depth+1));}}
    else{need(plain(v),'CORPUS_PLAIN_DATA_REQUIRED');out={};for(const k of Reflect.ownKeys(v)){const d=Object.getOwnPropertyDescriptor(v,k);
      need(typeof k==='string'&&d.enumerable&&Object.hasOwn(d,'value'),'CORPUS_ACCESSORS_FORBIDDEN');Object.defineProperty(out,k,{value:visit(d.value,depth+1),enumerable:true,writable:true,configurable:true});}}
    seen.delete(v);return out;
  }
  return visit(value,0);
}
function timeValue(value){const t=typeof value==='number'?value:Date.parse(value);need(Number.isFinite(t),'CORPUS_CLOCK_INVALID');return t;}
function reference(value){
  const r=capture(value);need(plain(r)&&id(r.coordinate)&&/^H(?:0[1-9]|1[0-2])\.S(?:0[1-9]|1[0-2])\.N(?:0[1-9]|1[0-2])$/.test(r.coordinate)&&id(r.namespace)&&id(r.edition),'QUALIFIED_HSN_REFERENCE_REQUIRED');
  const pin=r.sha256??r.sourceSha256??null;need(pin===null||/^[a-f0-9]{64}$/.test(pin),'HSN_SOURCE_PIN_INVALID');
  return{coordinate:r.coordinate,namespace:r.namespace,edition:r.edition,sha256:pin};
}
const refEqual=(a,b)=>a.coordinate===b.coordinate&&a.namespace===b.namespace&&a.edition===b.edition&&(!a.sha256||a.sha256===b.sha256);
const budgetValue=(v,fallback)=>{if(v===undefined)return fallback;need(Number.isSafeInteger(v)&&v>=1&&v<=1000000,'CORPUS_CHARACTER_BUDGET_INVALID');return v;};
const externalEffects=()=>({modelInvoked:false,modelTrainingPerformed:false,canonAdmitted:false,authorityEffect:'NONE',hostAuthenticated:false});

export class CorpusEngine{
  #docs=new Map();#list=[];#terms=[];#termIds=new Map();#postings=[];#titlePostings=[];
  #principal;#clock;#config;#statusWeights;#coverageInput;#ontology;#shard;
  #revokedDocs=new Set();#revokedSources=new Set();#revision=0;#lastDelta=null;
  constructor({documents,ontology=[],now,principal=null,config={},coverage=null,shard=null}={}){
    need(Array.isArray(documents),'CORPUS_DOCUMENTS_REQUIRED');
    this.#principal=freeze(capture(typeof principal==='string'?{id:principal,ownerId:principal}:principal));
    this.#clock=typeof now==='function'?now:()=>now===undefined?Date.now():now;this.#time();
    const c=capture(config);need(plain(c),'CORPUS_CONFIG_INVALID');this.#config={...DEFAULTS};
    for(const [k,v]of Object.entries(c)){if(k==='evidenceWeights')continue;need(Object.hasOwn(DEFAULTS,k)&&typeof v==='number'&&Number.isFinite(v),'CORPUS_CONFIG_INVALID');this.#config[k]=v;}
    const x=this.#config;need(x.targetChunkChars>=32&&x.maxChunkChars>=x.targetChunkChars&&x.maxChunkChars<=20000&&x.k1>0&&x.b>=0&&x.b<=1&&x.rrfK>=1&&
      x.minLexicalCoverage>=0&&x.minLexicalCoverage<=1&&x.minNoisySimilarity>=0&&x.minNoisySimilarity<=1&&x.minScore>=0&&x.maxDocuments>=1&&x.maxTotalChars>=1,'CORPUS_CONFIG_RANGE');
    for(const k of ['targetChunkChars','maxChunkChars','maxDocuments','maxTotalChars','maxDocumentChars','maxQueryChars','maxQueryTerms','maxVocabulary','maxFuzzyVocabulary','maxFuzzyPerTerm','maxRelationExpansion','maxPerSource'])need(Number.isSafeInteger(x[k])&&x[k]>0,'CORPUS_CONFIG_RANGE');
    for(const k of ['titleBoost','lexicalWeight','noisyWeight','idWeight','relationWeight'])need(x[k]>=0&&x[k]<=10,'CORPUS_CONFIG_RANGE');
    this.#statusWeights={...DEFAULT_STATUS,...(c.evidenceWeights??{})};need(plain(this.#statusWeights)&&Object.values(this.#statusWeights).every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=.1&&v<=2),'EVIDENCE_WEIGHT_INVALID');
    this.#coverageInput=coverage===null?null:freeze(capture(coverage));
    this.#shard=shard===null?null:freeze(capture(shard));if(this.#shard!==null)need(plain(this.#shard)&&id(this.#shard.id),'CORPUS_SHARD_METADATA_INVALID');
    const o=capture(ontology);this.#ontology=Array.isArray(o)?o:(plain(o)?Object.values(o.nodes??{}):[]);
    const pending=new Map(),next=new Map();for(const raw of documents){const d=this.#document(raw,pending,null);need(!next.has(d.id),'DUPLICATE_DOCUMENT_ID');next.set(d.id,d);}
    this.#bounds(next);this.#commitTerms(pending);this.#docs=next;this.#reindex();
  }
  #time(){return timeValue(this.#clock());}
  #owner(){return this.#principal?.ownerId??this.#principal?.id??null;}
  #owned(d){return !!d&&d.rights.scope==='owner-private'&&id(this.#owner())&&id(d.rights.ownerId)&&d.rights.ownerId===this.#owner();}
  #allowed(d,at=this.#time()){
    const r=d.rights,p=this.#principal;
    if(p?.allowed===false||p?.revoked===true||!this.#owned(d)||r.allowed!==true||r.revoked===true||this.#revokedDocs.has(d.id)||this.#revokedSources.has(d.sourceId))return false;
    if(r.expiresAt!==undefined&&r.expiresAt!==null){let expiry;try{expiry=timeValue(r.expiresAt);}catch{return false;}if(at>=expiry)return false;}
    if(r.allowedPrincipalIds!==undefined&&(!Array.isArray(r.allowedPrincipalIds)||!r.allowedPrincipalIds.some(x=>x===p?.id||x===this.#owner())))return false;
    return true;
  }
  #term(term,pending){let n=this.#termIds.get(term);if(n!==undefined)return n;if(pending.has(term))return pending.get(term);
    n=this.#terms.length+pending.size;need(n<this.#config.maxVocabulary,'CORPUS_VOCABULARY_BOUND');pending.set(term,n);return n;}
  #commitTerms(pending){for(const [term,n]of pending){this.#terms[n]=term;this.#termIds.set(term,n);}}
  #document(raw,pending,previous){
    const d=capture(raw);need(plain(d)&&id(d.id)&&id(d.sourceId)&&string(d.title,20000)&&typeof d.text==='string'&&d.text.length<=this.#config.maxDocumentChars&&string(d.sourceUri,20000),'CORPUS_DOCUMENT_SHAPE');
    const textSame=previous?.text===d.text;
    const digest=textSame?previous.sourceSha256:sha256(d.text);
    if(d.sourceSha256!==undefined)need(d.sourceSha256===digest,'CORPUS_SOURCE_DIGEST_MISMATCH');
    need(new TextDecoder().decode(new TextEncoder().encode(d.text))===d.text,'CORPUS_TEXT_MUST_BE_VALID_UNICODE');
    const rights=plain(d.rights)?d.rights:{scope:'unknown',allowed:false};
    need(rights.ownerId===undefined||id(rights.ownerId),'CORPUS_RIGHTS_OWNER_INVALID');
    const collection=d.collection??'unclassified';need(id(collection),'CORPUS_COLLECTION_INVALID');
    need(d.collections===undefined||Array.isArray(d.collections),'CORPUS_COLLECTION_INVALID');
    const collections=unique([collection,...(d.collections??[])]);need(collections.every(id),'CORPUS_COLLECTION_INVALID');
    need(d.version===undefined||d.version===null||string(d.version,4096)||Number.isFinite(d.version),'CORPUS_VERSION_INVALID');
    const version=d.version??null,memberPath=d.memberPath??'';need(string(memberPath,20000),'CORPUS_MEMBER_PATH_INVALID');
    let artifacts;
    if(textSame)artifacts=previous.artifacts;
    else{const ts=tokens(d.text),tf=new Map();for(const t of ts){const n=this.#term(t,pending);tf.set(n,(tf.get(n)??0)+1);}
      artifacts={length:ts.length,vector:Uint32Array.from([...tf].sort((a,b)=>a[0]-b[0]).flat()),
        chunks:chunkOffsets(d.text,{targetChars:this.#config.targetChunkChars,maxChars:this.#config.maxChunkChars})};}
    const titleTerms=unique(tokens(d.title)).map(t=>this.#term(t,pending));
    const aliases=deriveAliases(d.text,d.id,d.sourceId);let ignoredAliases=0;
    for(const a of d.aliases??[]){if(!plain(a)||!string(a.term,200)||!string(a.expansion,1000)||!Number.isSafeInteger(a.start)||!Number.isSafeInteger(a.end)||a.start<0||a.end<=a.start||a.end>d.text.length){ignoredAliases++;continue;}
      const quote=d.text.slice(a.start,a.end),norm=normalize(quote);if((a.quote!==undefined&&a.quote!==quote)||!norm.includes(normalize(a.term))||!norm.includes(normalize(a.expansion))){ignoredAliases++;continue;}
      aliases.push({term:a.term,expansion:a.expansion,documentId:d.id,sourceId:d.sourceId,start:a.start,end:a.end,quote,basis:'EXPLICIT_SOURCE_ALIAS_SPAN'});}
    const coordinates=[];for(const r of d.coordinates??[]){try{coordinates.push(reference(r));}catch{/* An unqualified candidate remains metadata, never exact authority. */}}
    if(id(d.namespace)&&id(d.edition))for(const coordinate of unique(d.text.match(HSN)??[]))coordinates.push(reference({coordinate,namespace:d.namespace,edition:d.edition,sha256:d.ontologySha256??null}));
    const relations=[];let ignoredRelations=0;
    for(const r of d.relations??[]){if(!plain(r)||!RELATIONS.has(r.type)||(!id(r.targetId)&&!id(r.targetSourceId))){ignoredRelations++;continue;}
      relations.push({type:r.type,...(r.targetId?{targetId:r.targetId}:{}),...(r.targetSourceId?{targetSourceId:r.targetSourceId}:{}),
        ...(string(r.note,4000)?{note:r.note}:{}),basis:'SUPPLIED_RELATION_NOT_ENTAILMENT'});}
    const evidenceStatus=string(d.evidenceStatus,200)&&d.evidenceStatus?d.evidenceStatus:'UNREVIEWED';
    const provenance={documentId:d.id,sourceId:d.sourceId,sourceUri:d.sourceUri,title:d.title,collection,collections,version,modifiedAt:d.modifiedAt??null,memberPath,sourceSha256:digest,
      digestBasis:'SHA256_UTF8_OF_SUPPLIED_EXTRACTED_TEXT',...(d.sourceBlobSha256?{sourceBlobSha256:d.sourceBlobSha256}:{})};
    return{id:d.id,sourceId:d.sourceId,title:d.title,text:d.text,sourceUri:d.sourceUri,collection,collections,version,memberPath,modifiedAt:d.modifiedAt??null,
      rights:freeze(rights),sourceSha256:digest,provenance:freeze(provenance),provenanceSha256:sha256(canonical(provenance)),evidenceStatus,
      aliases,ignoredAliases,coordinates,relations,ignoredRelations,artifacts,titleTerms};
  }
  #bounds(docs){need(docs.size<=this.#config.maxDocuments,'CORPUS_DOCUMENT_BOUND');let chars=0;for(const d of docs.values())chars+=d.text.length;need(chars<=this.#config.maxTotalChars,'CORPUS_TOTAL_TEXT_BOUND');}
  #reindex(){
    this.#list=[...this.#docs.values()].sort((a,b)=>cmp(a.id,b.id));const posting=[],titles=[];
    for(const [index,d]of this.#list.entries()){const vector=d.artifacts.vector;for(let j=0;j<vector.length;j+=2)(posting[vector[j]]??=[]).push(index,vector[j+1]);for(const t of d.titleTerms)(titles[t]??=[]).push(index);}
    this.#postings=posting.map(x=>Uint32Array.from(x));this.#titlePostings=titles.map(x=>Uint32Array.from(x));
  }
  #filters(d,filters){
    if(!filters)return true;
    if(filters.collection!==undefined&&!d.collections.includes(filters.collection))return false;
    if(filters.collections!==undefined&&!filters.collections.some(x=>d.collections.includes(x)))return false;
    if(filters.sourceId!==undefined&&d.sourceId!==filters.sourceId)return false;
    if(filters.sourceIds!==undefined&&!filters.sourceIds.includes(d.sourceId))return false;
    if(filters.documentIds!==undefined&&!filters.documentIds.includes(d.id))return false;
    if(filters.evidenceStatus!==undefined&&d.evidenceStatus!==filters.evidenceStatus)return false;
    return true;
  }
  #visible(filters,at=this.#time()){const set=new Set();for(const [i,d]of this.#list.entries())if(this.#allowed(d,at)&&this.#filters(d,filters)&&d.text.length)set.add(i);return set;}
  #coverage(at=this.#time()){
    const owned=this.#list.filter(d=>this.#owned(d)),visible=owned.filter(d=>this.#allowed(d,at)),sourceStats=this.#coverageInput?.sourceBaseline?.stats??{};
    return{scope:'SUPPLIED_OWNER_PRIVATE_DOCUMENTS_ONLY',suppliedOwnedDocuments:owned.length,authorizedDocuments:visible.length,
      searchableDocuments:visible.filter(d=>d.text.length).length,authorizedSources:new Set(visible.map(d=>d.sourceId)).size,
      distinctAuthorizedTexts:new Set(visible.filter(d=>d.text.length).map(d=>d.sourceSha256)).size,
      heldOwnedDocuments:owned.length-visible.length,emptyOwnedDocuments:visible.filter(d=>!d.text.length).length,
      enumerationComplete:false,contentComplete:false,universalCoverageClaim:false,canonPromotions:0,
      shard:!owned.length||this.#shard===null?null:structuredClone(this.#shard),rankingPopulation:'THIS_ENGINE_AUTHORIZED_FILTERED_DOCUMENTS_ONLY',crossShardGlobalRankingClaim:false,
      suppliedInventory:this.#coverageInput&&owned.length?{observedSources:sourceStats.sources_observed??null,indexedSources:sourceStats.indexed_sources??null,
        heldSources:sourceStats.held_sources??null,excludedSources:sourceStats.excluded_sources??null,
        callerReportedScope:this.#coverageInput.coverage?.scope??null,independentlyEnumeratedByEngine:false}:null};
  }
  #targets(d,visible){const out=[];for(const relation of d.relations)for(const j of visible){const target=this.#list[j];if((relation.targetId&&target.id===relation.targetId)||(relation.targetSourceId&&target.sourceId===relation.targetSourceId))out.push({targetIndex:j,...relation});}return out;}
  #relations(visible){
    const edges=[],pairs=new Map(),groups=new Map(),byId=new Map([...visible].map(i=>[this.#list[i].id,i]));
    const pair=(a,b,reason)=>{if(a===b)return;const key=[a,b].sort((x,y)=>x-y).join(':');if(!pairs.has(key))pairs.set(key,{a,b,reasons:[]});pairs.get(key).reasons.push(reason);};
    for(const i of visible){const d=this.#list[i];for(const edge of this.#targets(d,visible)){
      edges.push({from:i,to:edge.targetIndex,type:edge.type,note:edge.note??null});
      if(COUNTER.has(edge.type))pair(i,edge.targetIndex,edge.type);
      if(LINEAGE.has(edge.type)&&d.sourceSha256!==this.#list[edge.targetIndex].sourceSha256)pair(i,edge.targetIndex,'VERSION_DIFFERENCE_UNRESOLVED');
      if(['SUPPORTS','CHALLENGES','CONTRADICTS'].includes(edge.type)){const key=edge.targetIndex;if(!groups.has(key))groups.set(key,[]);groups.get(key).push({from:i,type:edge.type});}}
    }
    for(const [target,list]of groups)for(const a of list)for(const b of list)if(a.type==='SUPPORTS'&&COUNTER.has(b.type))pair(a.from,b.from,'OPPOSING_RELATIONS_TO_SHARED_TARGET');
    const versions=new Map();for(const i of visible){const d=this.#list[i];if(d.version===null)continue;const key=d.sourceId+'\0'+d.memberPath;(versions.get(key)??versions.set(key,[]).get(key)).push(i);}
    for(const indices of versions.values())for(let a=0;a<indices.length;a++)for(let b=a+1;b<indices.length;b++){const x=this.#list[indices[a]],y=this.#list[indices[b]];if(x.sourceSha256!==y.sourceSha256&&x.version!==y.version)pair(indices[a],indices[b],'VERSION_DIFFERENCE_UNRESOLVED');}
    return{edges,pairs:[...pairs.values()],byId};
  }
  #citation(d,start,end){const quote=d.text.slice(start,end);return{schema:'atlas.corpus.citation/v1',documentId:d.id,sourceId:d.sourceId,sourceUri:d.sourceUri,start,end,quote,
    quoteSha256:sha256(quote),sourceSha256:d.sourceSha256,version:d.version,offsetUnit:'UTF16_CODE_UNITS',digestBasis:'SHA256_UTF8_OF_SUPPLIED_EXTRACTED_TEXT'};}
  #bestChunk(d,queryTerms){let best=d.artifacts.chunks[0],bestScore=-1;
    for(const chunk of d.artifacts.chunks){const text=d.text.slice(chunk.start,chunk.end),ts=tokens(text),counts=new Map();for(const t of ts)counts.set(t,(counts.get(t)??0)+1);
      let score=0;for(const t of queryTerms)if(counts.has(t))score+=1+Math.log(1+counts.get(t));score/=1+Math.max(0,text.length-this.#config.targetChunkChars)/this.#config.targetChunkChars;
      if(score>bestScore){best=chunk;bestScore=score;}}
    return best;
  }
  #options(raw){const o=capture(raw??{});need(plain(o),'CORPUS_OPTIONS_INVALID');
    if(o.principal!==undefined)throw Error('PER_QUERY_PRINCIPAL_OVERRIDE_FORBIDDEN');
    const limit=o.limit??8;need(Number.isSafeInteger(limit)&&limit>=1&&limit<=100,'CORPUS_LIMIT_INVALID');
    if(o.filters!==undefined){need(plain(o.filters),'CORPUS_FILTERS_INVALID');for(const k of Object.keys(o.filters))need(['collection','collections','sourceId','sourceIds','documentIds','evidenceStatus'].includes(k),'CORPUS_FILTER_UNKNOWN');
      for(const k of ['collections','sourceIds','documentIds'])if(o.filters[k]!==undefined)need(Array.isArray(o.filters[k])&&o.filters[k].every(id),'CORPUS_FILTERS_INVALID');}
    need(o.strategy===undefined||['fusion','bm25'].includes(o.strategy),'CORPUS_STRATEGY_INVALID');
    return{...o,limit,budgetChars:budgetValue(o.budgetChars,1000000)};
  }
  search(query,rawOptions={}){
    need(typeof query==='string'&&query.length<=this.#config.maxQueryChars,'CORPUS_QUERY_INVALID');const options=this.#options(rawOptions),c=this.#config;
    const visible=this.#visible(options.filters),coverage=this.#coverage(),unknowns=[],original=unique(tokens(query));
    if(original.length>c.maxQueryTerms)unknowns.push({code:'QUERY_TERM_BOUND',used:c.maxQueryTerms,total:original.length});
    const queryTerms=original.slice(0,c.maxQueryTerms),expanded=new Set(queryTerms),aliasEvidence=[],aliasQueryGroups=[];
    const abstain=reason=>({schema:'atlas.corpus.search/v1',status:'ABSTAIN',query,results:[],coverage:this.#coverage(),unknowns:[...unknowns,{code:reason}],
      abstention:{abstained:true,reason,calibration:'UNVALIDATED_CONFIGURABLE_RETRIEVAL_HEURISTICS',factualConfidence:null},...externalEffects()});
    if(!queryTerms.length)return abstain('NO_SEARCHABLE_QUERY_TERMS');if(!visible.size)return abstain('NO_AUTHORIZED_SEARCHABLE_DOCUMENTS');
    if(options.aliases!==false&&options.strategy!=='bm25')for(const i of visible)for(const a of this.#list[i].aliases){
      const term=tokens(a.term),exp=tokens(a.expansion);if(term.length&&exp.length&&term.every(t=>queryTerms.includes(t))){for(const t of exp)expanded.add(t);aliasEvidence.push(a);aliasQueryGroups.push(exp);}
      else if(exp.length>1&&term.length&&exp.every(t=>queryTerms.includes(t))){for(const t of term)expanded.add(t);aliasEvidence.push(a);aliasQueryGroups.push(term);}}
    const scores=new Map(),matched=new Map(),titleMatches=new Set();let average=0;for(const i of visible)average+=this.#list[i].artifacts.length;average=average/visible.size||1;
    const add=(i,value,term)=>{scores.set(i,(scores.get(i)??0)+value);if(!matched.has(i))matched.set(i,new Set());matched.get(i).add(term);};
    const scoreTerm=(term,weight=1,destination=scores)=>{
      const token=this.#termIds.get(term);if(token===undefined)return;const postings=this.#postings[token]??[];let df=0;
      for(let j=0;j<postings.length;j+=2)if(visible.has(postings[j]))df++;
      const idf=Math.log(1+(visible.size-df+.5)/(df+.5));
      for(let j=0;j<postings.length;j+=2){const i=postings[j];if(!visible.has(i))continue;const tf=postings[j+1],length=this.#list[i].artifacts.length;
        const value=weight*idf*tf*(c.k1+1)/(tf+c.k1*(1-c.b+c.b*length/average));
        if(destination===scores)add(i,value,term);else destination.set(i,(destination.get(i)??0)+value);}
      for(const i of this.#titlePostings[token]??[]){if(!visible.has(i))continue;const value=weight*c.titleBoost*idf;
        if(destination===scores){add(i,value,term);titleMatches.add(i);}else destination.set(i,(destination.get(i)??0)+value);}
    };
    for(const t of expanded)scoreTerm(t,queryTerms.includes(t)?1:.65);
    const noisyScores=new Map(),noisyMatches=[];
    if(options.noisy!==false&&options.strategy!=='bm25')for(const term of queryTerms){
      const token=this.#termIds.get(term);let exact=false;for(const i of visible)if(matched.get(i)?.has(term)){exact=true;break;}if(exact||term.length<4)continue;
      const grams=trigrams(term),candidates=[];let inspected=0;
      for(let n=0;n<this.#titlePostings.length&&inspected<c.maxFuzzyVocabulary;n++){const titleDocs=this.#titlePostings[n];if(!titleDocs||!titleDocs.some(i=>visible.has(i)))continue;
        const word=this.#terms[n];if(Math.abs(word.length-term.length)>3||word.length<4)continue;inspected++;
        const similarity=trigramSimilarity(grams,trigrams(word));if(similarity>=c.minNoisySimilarity&&editDistanceAtMost(term,word,term.length>=8&&similarity>=.72?2:1))candidates.push({queryTerm:term,sourceTerm:word,similarity,method:'CHAR_TRIGRAM_WITH_BOUNDED_EDIT_CHECK_NOT_SEMANTIC_EQUIVALENCE'});}
      candidates.sort((a,b)=>b.similarity-a.similarity||cmp(a.sourceTerm,b.sourceTerm));
      for(const candidate of candidates.slice(0,c.maxFuzzyPerTerm)){noisyMatches.push(candidate);scoreTerm(candidate.sourceTerm,candidate.similarity,noisyScores);expanded.add(candidate.sourceTerm);}
    }
    const exactIds=new Map();let qualified=null;
    if(options.reference!==undefined){qualified=reference(options.reference);for(const i of visible)if(this.#list[i].coordinates.some(r=>refEqual(qualified,r)))exactIds.set(i,1);
      if(!exactIds.size)unknowns.push({code:'NO_MATCHING_QUALIFIED_HSN_SOURCE',coordinate:qualified.coordinate,namespace:qualified.namespace,edition:qualified.edition});}
    else if(query.match(HSN))unknowns.push({code:'UNQUALIFIED_HSN_REFERENCE',coordinates:unique(query.match(HSN)),resolutionBoostApplied:false});
    const ranking=m=>[...m].filter(([,score])=>score>0).sort((a,b)=>b[1]-a[1]||cmp(this.#list[a[0]].id,this.#list[b[0]].id));
    const lexical=ranking(scores),noisy=ranking(noisyScores),exact=ranking(exactIds),fused=new Map(),signals=new Map();
    const fuse=(list,weight,name)=>list.forEach(([i],rank)=>{fused.set(i,(fused.get(i)??0)+weight/(c.rrfK+rank+1));if(!signals.has(i))signals.set(i,{});signals.get(i)[name]={rank:rank+1,weight};});
    if(options.strategy==='bm25'){for(const [i,score]of lexical)fused.set(i,score);}else{fuse(lexical,c.lexicalWeight,'bm25');fuse(noisy,c.noisyWeight,'trigram');fuse(exact,c.idWeight,'qualifiedHsn');}
    const relationGraph=this.#relations(visible),direct=new Set(fused.keys()),relationExpanded=[];
    if(options.expandRelations!==false&&options.strategy!=='bm25')for(const edge of relationGraph.edges){if(!direct.has(edge.from)||direct.has(edge.to)||relationExpanded.length>=c.maxRelationExpansion)continue;
      relationExpanded.push(edge);fused.set(edge.to,(fused.get(edge.to)??0)+c.relationWeight/(c.rrfK+relationExpanded.length));}
    // Counterevidence and explicit version companions are mandatory for any included content group.
    const companion=new Map();for(const p of relationGraph.pairs){if(options.retainVersions===false&&p.reasons.every(x=>x==='VERSION_DIFFERENCE_UNRESOLVED'))continue;
      (companion.get(p.a)??companion.set(p.a,new Set()).get(p.a)).add(p.b);(companion.get(p.b)??companion.set(p.b,new Set()).get(p.b)).add(p.a);}
    const byHash=new Map();for(const i of visible){const d=this.#list[i];(byHash.get(d.sourceSha256)??byHash.set(d.sourceSha256,[]).get(d.sourceSha256)).push(i);}
    const groups=new Map();for(const [i,value]of fused){const d=this.#list[i],weight=this.#statusWeights[d.evidenceStatus]??1,score=value*weight;
      const old=groups.get(d.sourceSha256);if(!old||score>old.score||(score===old.score&&cmp(d.id,this.#list[old.index].id)<0))groups.set(d.sourceSha256,{index:i,score,statusWeight:weight});}
    const ordered=[...groups].sort((a,b)=>b[1].score-a[1].score||cmp(this.#list[a[1].index].id,this.#list[b[1].index].id));
    if(!ordered.length)return abstain('NO_RETRIEVAL_EVIDENCE');
    const originalCoverage=i=>queryTerms.filter(t=>matched.get(i)?.has(t)).length/queryTerms.length;
    const aliasUsed=i=>aliasQueryGroups.some(group=>group.every(term=>matched.get(i)?.has(term)));
    const eligible=([hash,g])=>exactIds.has(g.index)||((scores.get(g.index)??0)>0&&(originalCoverage(g.index)>=c.minLexicalCoverage||aliasUsed(g.index)))||((noisyScores.get(g.index)??0)>0&&noisyMatches.length>0);
    if(!ordered.some(entry=>eligible(entry)&&entry[1].score>=c.minScore))return abstain('BELOW_CONFIGURED_RETRIEVAL_THRESHOLD');
    const selected=[],selectedHashes=new Set(),sourceCounts=new Map(),chunkCache=new Map(),relatedIndices=new Set(relationExpanded.map(e=>e.to));let usedChars=0,deferred=0,pairHold=false;
    const getChunk=i=>{if(!chunkCache.has(i))chunkCache.set(i,this.#bestChunk(this.#list[i],expanded));return chunkCache.get(i);};
    const bundleFor=index=>{const pending=[index],seen=new Set(),hashes=new Map();while(pending.length){const i=pending.pop();if(seen.has(i))continue;seen.add(i);const d=this.#list[i];
      const representative=groups.get(d.sourceSha256)??{index:i,score:0,statusWeight:this.#statusWeights[d.evidenceStatus]??1};hashes.set(d.sourceSha256,representative);
      for(const duplicate of byHash.get(d.sourceSha256)??[])for(const j of companion.get(duplicate)??[])pending.push(j);}
      return [...hashes].filter(([hash])=>!selectedHashes.has(hash));};
    const addGroup=([hash,g])=>{selected.push([hash,g]);selectedHashes.add(hash);const d=this.#list[g.index];sourceCounts.set(d.sourceId,(sourceCounts.get(d.sourceId)??0)+1);const ch=getChunk(g.index);usedChars+=ch.end-ch.start;};
    const passes=[true,false];for(const diverse of passes)for(const entry of ordered){const [hash,g]=entry;if(selectedHashes.has(hash)||selected.length>=options.limit)continue;
      if((!eligible(entry)||g.score<c.minScore)&&!relatedIndices.has(g.index))continue;
      const d=this.#list[g.index];if(diverse&&options.diversity!==false&&(sourceCounts.get(d.sourceId)??0)>=c.maxPerSource)continue;
      const bundle=bundleFor(g.index);if(selected.length+bundle.length>options.limit){deferred++;if(!selected.length&&bundle.length>1)pairHold=true;continue;}
      const chars=bundle.reduce((n,[,v])=>{const ch=getChunk(v.index);return n+ch.end-ch.start;},0);
      if(usedChars+chars>options.budgetChars){deferred++;continue;}for(const b of bundle)addGroup(b);}
    if(!selected.length){if(pairHold)return{...abstain('COUNTEREVIDENCE_OR_VERSION_GROUP_EXCEEDS_LIMIT'),status:'EVIDENCE_LIMIT_HOLD'};return{...abstain('EXTRACTS_EXCEED_CHARACTER_BUDGET'),status:'CONTEXT_BUDGET_HOLD'};}
    const at=this.#time();if(selected.some(([,g])=>!this.#allowed(this.#list[g.index],at)))return{...abstain('ACCESS_CHANGED_BEFORE_OUTPUT'),status:'AUTHORIZATION_HOLD'};
    const resultHashes=new Set(selected.map(([hash])=>hash));
    const results=selected.map(([hash,g])=>{
      const d=this.#list[g.index],ch=getChunk(g.index),citation=this.#citation(d,ch.start,ch.end);
      const aliases=(byHash.get(hash)??[]).map(i=>this.#list[i]).filter(x=>this.#allowed(x,at)&&this.#filters(x,options.filters));
      const related=relationGraph.edges.filter(e=>e.from===g.index&&this.#allowed(this.#list[e.to],at)).map(e=>({type:e.type,targetId:this.#list[e.to].id,targetSourceId:this.#list[e.to].sourceId,basis:'SUPPLIED_RELATION_NOT_ENTAILMENT',expanded:resultHashes.has(this.#list[e.to].sourceSha256)}));
      const companions=relationGraph.pairs.filter(p=>[p.a,p.b].some(i=>this.#list[i].sourceSha256===hash)).map(p=>{const other=this.#list[p.a].sourceSha256===hash?p.b:p.a;return{documentId:this.#list[other].id,sourceId:this.#list[other].sourceId,reasons:p.reasons,retained:resultHashes.has(this.#list[other].sourceSha256)};}).filter(x=>this.#allowed(this.#docs.get(x.documentId),at));
      return{id:d.id,documentId:d.id,sourceId:d.sourceId,title:d.title,sourceUri:d.sourceUri,collection:d.collection,collections:[...d.collections],version:d.version,modifiedAt:d.modifiedAt,
        text:citation.quote,start:ch.start,end:ch.end,chunkBoundary:ch.boundary,sourceSha256:d.sourceSha256,quoteSha256:citation.quoteSha256,citation,
        provenance:structuredClone(d.provenance),provenanceSha256:d.provenanceSha256,
        score:g.score,scoreBasis:options.strategy==='bm25'?'BM25_TEXT_PLUS_TITLE_BOOST':'RECIPROCAL_RANK_FUSION_WITH_DECLARED_STATUS_WEIGHT',factualConfidence:null,
        scoreComponents:{bm25:scores.get(g.index)??0,trigram:noisyScores.get(g.index)??0,qualifiedHsn:exactIds.has(g.index),statusWeight:g.statusWeight,signals:signals.get(g.index)??{}},
        evidenceStatus:d.evidenceStatus,evidenceStatusBasis:'SUPPLIED_LABEL_NOT_FACT_VERIFICATION',matchedInTitle:titleMatches.has(g.index),
        provenanceAliases:aliases.map(x=>({id:x.id,documentId:x.id,sourceId:x.sourceId,title:x.title,sourceUri:x.sourceUri,version:x.version,sourceSha256:x.sourceSha256})),
        duplicateCount:aliases.length,relations:related,companions,versionStatus:companions.some(x=>x.reasons.includes('VERSION_DIFFERENCE_UNRESOLVED'))?'UNRESOLVED_VERSION_DIFFERENCE':'NO_DIFFERENCE_ASSERTED',
        ...externalEffects()};});
    const safeAliases=aliasEvidence.filter(a=>this.#allowed(this.#docs.get(a.documentId),at)).map(a=>({...a,quoteSha256:sha256(a.quote)}));
    return{schema:'atlas.corpus.search/v1',status:'RESULTS',query,results,coverage:this.#coverage(at),unknowns:[...unknowns,...(deferred?[{code:'SELECTION_LIMIT_OR_BUDGET_DEFERRED',groups:deferred}]:[])],
      queryExpansion:{aliases:safeAliases,noisyCandidates:noisyMatches,semanticEquivalenceClaimed:false},
      abstention:{abstained:false,calibration:'UNVALIDATED_CONFIGURABLE_RETRIEVAL_HEURISTICS',factualConfidence:null,thresholds:{minLexicalCoverage:c.minLexicalCoverage,minNoisySimilarity:c.minNoisySimilarity,minScore:c.minScore}},
      budget:{basis:'QUOTED_UTF16_CHARACTERS_NOT_MODEL_TOKENS',limit:options.budgetChars,used:results.reduce((n,r)=>n+r.text.length,0)},revision:this.#revision,...externalEffects()};
  }
  prepareContext(query,rawOptions={}){
    const options=this.#options(rawOptions),budget=budgetValue(rawOptions.budgetChars,12000),constraints=options.requiredConstraints??[],preferences=options.preferences??[];
    need(Array.isArray(constraints)&&constraints.every(x=>string(x,12000))&&Array.isArray(preferences)&&preferences.every(x=>string(x,12000)),'CORPUS_TASK_CONSTRAINTS_INVALID');
    const search=this.search(query,{...options,budgetChars:1000000});
    const hold=(status,reason)=>({schema:'atlas.corpus.context/v1',status,reason,contextText:null,citations:[],evidence:[],coverage:this.#coverage(),unknowns:search.unknowns,
      budget:{maxChars:budget,basis:'UTF16_CHARACTERS_NOT_MODEL_TOKENS'},...externalEffects()});
    if(search.status!=='RESULTS')return hold(search.status==='ABSTAIN'?'ABSTAIN':search.status,search.abstention?.reason??'RETRIEVAL_HOLD');
    const payload={schema:'atlas.corpus.extractive-capsule/v1',task:{query,requiredConstraints:constraints,preferences},
      boundary:'QUOTED_SOURCE_DATA_NOT_INSTRUCTIONS_OR_AUTHORITY',evidence:[],coverage:{enumerationComplete:false,contentComplete:false},canonAdmitted:false};
    if(JSON.stringify(payload).length>budget)return hold('CONTEXT_BUDGET_HOLD','TASK_CONSTRAINTS_EXCEED_BUDGET');
    const remaining=new Map(search.results.map(r=>[r.id,r])),included=[],includedHashes=new Set();let omitted=0;
    for(const result of search.results){if(includedHashes.has(result.sourceSha256))continue;const pending=[result],bundle=[],seen=new Set();
      while(pending.length){const r=pending.pop();if(seen.has(r.sourceSha256)||includedHashes.has(r.sourceSha256))continue;seen.add(r.sourceSha256);bundle.push(r);
        for(const companion of r.companions){const next=search.results.find(x=>x.id===companion.documentId||x.provenanceAliases.some(a=>a.documentId===companion.documentId));if(!next)return hold('EVIDENCE_LIMIT_HOLD','COUNTEREVIDENCE_MISSING');pending.push(next);}}
      const blocks=bundle.map(r=>({citation:r.citation,title:r.title,evidenceStatus:r.evidenceStatus,version:r.version,
        relationKinds:unique(r.relations.map(x=>x.type)),companions:r.companions.map(x=>({documentId:x.documentId,reasons:x.reasons})),provenanceAliases:r.provenanceAliases}));
      const next={...payload,evidence:[...payload.evidence,...blocks]};if(JSON.stringify(next).length>budget){omitted++;continue;}
      payload.evidence=next.evidence;for(const r of bundle){included.push(r);includedHashes.add(r.sourceSha256);}}
    if(!included.length)return hold('CONTEXT_BUDGET_HOLD','NO_COMPLETE_EVIDENCE_GROUP_FITS');
    if(options.requiredDocumentIds&&!options.requiredDocumentIds.every(id=>included.some(r=>r.provenanceAliases.some(a=>a.documentId===id))))return hold('CONTEXT_BUDGET_HOLD','REQUIRED_EVIDENCE_NOT_RETAINED');
    for(const r of included)if(!this.verifyCitation(r.citation).valid)return hold('AUTHORIZATION_HOLD','CITATION_STALE_OR_ACCESS_CHANGED');
    const contextText=JSON.stringify(payload);return{schema:'atlas.corpus.context/v1',status:'CONTEXT_READY',contextText,contextSha256:sha256(contextText),
      citations:included.map(r=>r.citation),evidence:included,coverage:this.#coverage(),unknowns:[...search.unknowns,...(omitted?[{code:'LOWER_RANKED_COMPLETE_GROUPS_OMITTED_FOR_BUDGET',groups:omitted}]:[])],
      budget:{maxChars:budget,usedChars:contextText.length,basis:'UTF16_CHARACTERS_NOT_MODEL_TOKENS',providerTokenLimitVerified:false},
      quality:{exactQuotes:true,declaredCounterevidenceRetained:true,requiredConstraintsRetained:constraints.length,modelAnswerQualityMeasured:false},...externalEffects()};
  }
  verifyCitation(raw){
    let c;try{c=capture(raw);}catch{return{valid:false,reasons:['CITATION_PLAIN_DATA_REQUIRED']};}
    const d=this.#docs.get(c?.documentId);if(!d||!this.#allowed(d))return{valid:false,reasons:['SOURCE_UNAVAILABLE_OR_ACCESS_DENIED']};
    const reasons=[];if(c.sourceId!==d.sourceId||c.sourceUri!==d.sourceUri)reasons.push('CITATION_SOURCE_IDENTITY_MISMATCH');
    if(c.sourceSha256!==d.sourceSha256)reasons.push('CITATION_SOURCE_HASH_MISMATCH');if((c.version??null)!==d.version)reasons.push('CITATION_VERSION_MISMATCH');
    if(!Number.isSafeInteger(c.start)||!Number.isSafeInteger(c.end)||c.start<0||c.end<=c.start||c.end>d.text.length)reasons.push('CITATION_OFFSETS_INVALID');
    else{const quote=d.text.slice(c.start,c.end);if(c.quote!==quote)reasons.push('CITATION_QUOTE_MISMATCH');if(c.quoteSha256!==sha256(quote))reasons.push('CITATION_QUOTE_HASH_MISMATCH');}
    if(c.offsetUnit!==undefined&&c.offsetUnit!=='UTF16_CODE_UNITS')reasons.push('CITATION_OFFSET_UNIT_MISMATCH');
    if(!this.#allowed(d))return{valid:false,reasons:['SOURCE_UNAVAILABLE_OR_ACCESS_DENIED']};
    return{valid:reasons.length===0,reasons,status:reasons.length?'INVALID_CITATION':'VERIFIED_EXACT_SOURCE_QUOTE',factualClaimVerified:false};
  }
  synthesize(raw){
    const input=capture(raw);need(plain(input)&&string(input.claim,12000)&&input.claim.trim()&&string(input.falsification,12000)&&input.falsification.trim(),'SYNTHESIS_CLAIM_AND_FALSIFICATION_REQUIRED');
    need(this.verifyCitation(input.aCitation).valid&&this.verifyCitation(input.bCitation).valid,'SYNTHESIS_CITATIONS_MUST_BE_CURRENT');
    const a=this.#docs.get(input.aCitation.documentId),b=this.#docs.get(input.bCitation.documentId);
    need(a.sourceId!==b.sourceId&&a.sourceSha256!==b.sourceSha256&&a.sourceUri!==b.sourceUri,'SYNTHESIS_INDEPENDENT_SOURCES_REQUIRED');
    const visible=this.#visible(),graph=this.#relations(visible),start=this.#list.indexOf(a),target=this.#list.indexOf(b),seen=new Set(),pending=[start];
    while(pending.length){const i=pending.pop();if(seen.has(i))continue;seen.add(i);for(const e of graph.edges)if(LINEAGE.has(e.type)){if(e.from===i)pending.push(e.to);if(e.to===i)pending.push(e.from);}}
    need(!seen.has(target),'SYNTHESIS_INDEPENDENT_SOURCES_REQUIRED');
    const record={schema:'atlas.corpus.hypothesis/v1',status:'HYPOTHESIS_NOT_VALIDATED',A:input.aCitation,B:input.bCitation,C:input.claim,
      falsification:input.falsification,synthesisMode:'CALLER_PROPOSED_COMBINATION',sourceIndependence:{distinctSourceIdentities:true,distinctContents:true,independentAuthorshipVerified:false,
        limitation:'Distinct supplied identities and contents do not prove independent authorship, causal independence or correctness.'},...externalEffects()};
    need(this.verifyCitation(input.aCitation).valid&&this.verifyCitation(input.bCitation).valid,'SYNTHESIS_ACCESS_CHANGED');
    return{id:'hypothesis:'+sha256(canonical(record)),...record};
  }
  compare(aId,bId){
    const a=this.#docs.get(aId),b=this.#docs.get(bId);if(!a||!b||!this.#allowed(a)||!this.#allowed(b))return{status:'AUTHORIZATION_HOLD',sources:[],...externalEffects()};
    const common=new Set(a.artifacts.vector.filter((_,i)=>i%2===0)),shared=[];for(let i=0;i<b.artifacts.vector.length;i+=2)if(common.has(b.artifacts.vector[i]))shared.push(this.#terms[b.artifacts.vector[i]]);
    if(!this.#allowed(a)||!this.#allowed(b))return{status:'AUTHORIZATION_HOLD',sources:[],...externalEffects()};
    return{status:'SOURCE_COMPARISON',sources:[structuredClone(a.provenance),structuredClone(b.provenance)],identicalText:a.text===b.text,
      sameSourceIdentity:a.sourceId===b.sourceId,sharedLexicalTerms:shared.sort().slice(0,100),semanticAgreementEstablished:false,...externalEffects()};
  }
  applyDelta(raw={}){
    const delta=capture(raw);need(plain(delta)&&Array.isArray(delta.upserts??[])&&Array.isArray(delta.removeIds??[]),'CORPUS_DELTA_INVALID');
    const pending=new Map(),next=new Map(this.#docs),seen=new Set();let inserted=0,updated=0,unchanged=0,reused=0,rebuilt=0,removed=0;
    for(const key of delta.removeIds??[]){need(id(key),'CORPUS_DELTA_ID_INVALID');if(next.delete(key))removed++;}
    for(const rawDoc of delta.upserts??[]){need(!seen.has(rawDoc?.id),'CORPUS_DELTA_DUPLICATE_ID');seen.add(rawDoc?.id);const previous=this.#docs.get(rawDoc?.id),d=this.#document(rawDoc,pending,previous);
      if(previous&&d.text===previous.text){reused++;if(canonical(d.provenance)===canonical(previous.provenance)&&canonical(d.rights)===canonical(previous.rights)&&canonical(d.relations)===canonical(previous.relations)&&canonical(d.aliases)===canonical(previous.aliases)&&canonical(d.coordinates)===canonical(previous.coordinates)&&d.evidenceStatus===previous.evidenceStatus)unchanged++;else updated++;}
      else{rebuilt++;previous?updated++:inserted++;}next.set(d.id,d);}
    this.#bounds(next);this.#commitTerms(pending);this.#docs=next;this.#reindex();this.#revision++;
    this.#lastDelta={status:'DELTA_APPLIED',inserted,updated,unchanged,removed,reusedContentArtifacts:reused,rebuiltContentArtifacts:rebuilt,revision:this.#revision};return{...this.#lastDelta,...externalEffects()};
  }
  revoke(raw){
    const r=typeof raw==='string'?{sourceIds:[raw]}:capture(raw);need(plain(r),'CORPUS_REVOCATION_INVALID');
    const sources=r.sourceIds??(r.sourceId?[r.sourceId]:[]),docs=r.documentIds??(r.documentId?[r.documentId]:[]);
    need(Array.isArray(sources)&&Array.isArray(docs)&&sources.every(id)&&docs.every(id)&&sources.length+docs.length>0,'CORPUS_REVOCATION_INVALID');
    for(const value of sources)this.#revokedSources.add(value);for(const value of docs)this.#revokedDocs.add(value);this.#revision++;
    return{status:'REVOKED',sourceRevocations:sources.length,documentRevocations:docs.length,revision:this.#revision,
      priorReleasedCopiesRetracted:false,limit:'Previously returned copies cannot be recalled; subsequent retrieval, context and citation checks enforce revocation.',...externalEffects()};
  }
  status(){
    const at=this.#time(),visible=this.#visible(undefined,at),owned=this.#list.filter(d=>this.#owned(d));let chunks=0;
    for(const i of visible)chunks+=this.#list[i].artifacts.chunks.length;
    return{schema:CORPUS_ENGINE_VERSION,status:'READY',revision:this.#revision,features:FEATURE_REGISTRY.map(f=>({number:f.number,id:f.id,implemented:true})),
      coverage:this.#coverage(at),index:{authorizedDocuments:visible.size,authorizedChunks:chunks,format:'DOCUMENT_BM25_TYPED_POSTINGS_WITH_OFFSET_ONLY_CHUNKS',allTextTrigramIndex:false},
      unknowns:[{code:'UNIVERSAL_SOURCE_UNIVERSE_NOT_ENUMERATED'},{code:'LEXICAL_MATCH_IS_NOT_FACTUAL_CONFIDENCE'},
        ...(owned.reduce((n,d)=>n+d.ignoredAliases,0)?[{code:'UNGROUNDED_ALIAS_INPUTS_IGNORED',count:owned.reduce((n,d)=>n+d.ignoredAliases,0)}]:[])],
      lastDelta:this.#lastDelta?{...this.#lastDelta}:null,authorizationBasis:'CALLER_SUPPLIED_OWNER_BINDING_WITH_CURRENT_LOCAL_FILTERS',...externalEffects()};
  }
}

export default CorpusEngine;
