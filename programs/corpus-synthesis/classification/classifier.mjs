import {createHash} from 'node:crypto';

export const ARIADNE_SOURCE = Object.freeze({
  namespace: 'ARIADNE_HSN', edition: 'ariadne-reader/v0.7',
  sha256: '07533cf7a6b6f567259962bf73efee9b22b47cbacb429499787800e07864e5a6'
});
export const CLASSIFIER_VERSION = 'atlas.corpus.ariadne-candidates/1.0.0';
const HSN = /\bH(?:0[1-9]|1[0-2])\.S(?:0[1-9]|1[0-2])\.N(?:0[1-9]|1[0-2])\b/g;
const WORDS = /[\p{L}\p{N}]+/gu;
const compare = (a,b) => a < b ? -1 : a > b ? 1 : 0;
const normalized = x => x.normalize('NFKC').toLowerCase();
const phraseTokens = x => [...x.matchAll(WORDS)].map(m => normalized(m[0]));
const hash = x => createHash('sha256').update(x).digest('hex');
const canonical = x => Array.isArray(x) ? '['+x.map(canonical).join(',')+']' : x && typeof x === 'object'
  ? '{'+Object.keys(x).sort().map(k => JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}' : JSON.stringify(x);
const requireValue = (ok, code) => { if (!ok) throw Object.assign(new Error(code), {code}); };
const hasId = x => typeof x === 'string' && x.length > 0 && x.length <= 20000;
export const canonicalJsonSha256 = value => hash(canonical(value));
const domain = n => n.kind === 'DOMAIN_SPECIALIZATION';
const houseOf = coordinate => coordinate.slice(0,3);
const EFFECTS = Object.freeze({semanticEdgesAccepted:0,canonPromotions:0,modelCalls:0,trainingRuns:0,
  factualProbability:null,sourceTextIsInertData:true,domainExpertiseEstablished:false});

/** Token-level Aho-Corasick, with original UTF-16 offsets retained separately. */
class PhraseMatcher {
  states = [{next:new Map(),fail:0,out:[]}]; patterns = []; maxTokens = 1;
  add(text, metadata) {
    const tokens = phraseTokens(text); if (!tokens.length) return;
    let s=0; for (const token of tokens) {
      if (!this.states[s].next.has(token)) {this.states[s].next.set(token,this.states.length);this.states.push({next:new Map(),fail:0,out:[]});}
      s=this.states[s].next.get(token);
    }
    const p=this.patterns.length;this.patterns.push({...metadata,text,length:tokens.length});this.states[s].out.push(p);
    this.maxTokens=Math.max(this.maxTokens,tokens.length);
  }
  build() {
    const queue=[...this.states[0].next.values()];
    for(let q=0;q<queue.length;q++) {const r=queue[q];for(const [word,s] of this.states[r].next) {
      queue.push(s);let f=this.states[r].fail;
      while(f && !this.states[f].next.has(word)) f=this.states[f].fail;
      const next=this.states[f].next.get(word);this.states[s].fail=next===undefined||next===s?0:next;
      this.states[s].out.push(...this.states[this.states[s].fail].out);
    }}
  }
  scan(text, onMatch) {
    let state=0,ordinal=0,lastEnd=0;const ring=new Array(this.maxTokens);let tokens=0;
    const regex=new RegExp(WORDS.source,WORDS.flags);let m;
    while((m=regex.exec(text))) {
      // Avoid joining a phrase across a long unrelated separator or paragraph payload.
      if(m.index-lastEnd>40)state=0;
      const token=normalized(m[0]);lastEnd=m.index+m[0].length;ring[ordinal%ring.length]={start:m.index,end:lastEnd};
      while(state && !this.states[state].next.has(token))state=this.states[state].fail;
      state=this.states[state].next.get(token)??0;
      for(const p of this.states[state].out) {
        const pattern=this.patterns[p],start=ring[(ordinal-pattern.length+1+ring.length)%ring.length]?.start;
        if(start!==undefined && lastEnd-start<=Math.max(200,pattern.text.length*4))onMatch(pattern,start,lastEnd);
      }
      ordinal++;tokens++;
    }
    return tokens;
  }
}

function sourceSpan(text,start,end,field,sourcePhrase) {
  const quote=text.slice(start,end);
  return {start,end,quote,quoteSha256:hash(quote),offsetUnit:'UTF16_CODE_UNITS',
    matchBasis:'NFKC_LOWERCASE_TOKEN_PHRASE_WITH_ORIGINAL_OFFSETS',ontologyField:field,ontologyPhrase:sourcePhrase};
}
function captureAlias(d) {
  const list = value => Array.isArray(value) ? structuredClone(value) : [];
  return {documentId:d.id,sourceId:d.sourceId,title:d.title??'',sourceUri:d.sourceUri??'',version:d.version??null,
    memberPath:d.memberPath??'',collections:[...new Set([d.collection,...(d.collections??[])].filter(Boolean))],
    sourceSha256:d.sourceSha256,sourceBlobSha256:d.sourceBlobSha256??null,evidenceStatus:d.evidenceStatus??'UNREVIEWED',
    rights:{scope:'owner-private',allowed:true,ownerId:d.rights.ownerId,expiresAt:d.rights.expiresAt??null},
    coordinates:list(d.coordinates),qualifiedHsnReferences:list(d.qualifiedHsnReferences),
    namespace:d.namespace??null,edition:d.edition??null,ontologySha256:d.ontologySha256??null,
    domainSubjects:list(d.domainSubjects??(d.domainSubject?[d.domainSubject]:[])),methodSubjects:list(d.methodSubjects)};
}

/** v1/v2 verify in-memory text; v3 groups metadata only and defers body checks to the streaming loader. */
export function createCorpusGrouper(bundle,{ownerId,now=new Date().toISOString()}={}) {
  requireValue(hasId(ownerId),'CLASSIFICATION_OWNER_REQUIRED');
  requireValue(bundle&&typeof bundle==='object','CLASSIFICATION_CORPUS_REQUIRED');
  const at=Date.parse(now);requireValue(Number.isFinite(at),'CLASSIFICATION_CLOCK_INVALID');
  const groups=new Map(),held={};let aliases=0,verifiedBytes=0,deferredFileGroups=0,documents=0,finished=false;
  const hold=reason=>{held[reason]=(held[reason]??0)+1;};
  const addDocument=d=>{
    requireValue(!finished,'CLASSIFICATION_GROUPER_ALREADY_FINISHED');documents++;
    const r=d?.rights;
    if(!r||r.scope!=='owner-private'||r.allowed!==true||r.revoked===true||r.ownerId!==ownerId)return hold('DENIED_OWNER_BINDING');
    const expiry=typeof r.expiresAt==='number'?r.expiresAt:Date.parse(r.expiresAt);
    if(r.expiresAt!==null&&r.expiresAt!==undefined&&(!Number.isFinite(expiry)||at>=expiry))return hold('RIGHTS_EXPIRED_OR_INVALID');
    if(r.allowedPrincipalIds!==undefined&&(!Array.isArray(r.allowedPrincipalIds)||!r.allowedPrincipalIds.includes(ownerId)))return hold('PRINCIPAL_NOT_ALLOWED');
    if(!hasId(d.id)||!hasId(d.sourceId)||!/^[a-f0-9]{64}$/.test(d.sourceSha256??''))return hold('DOCUMENT_ID_OR_DIGEST_INVALID');
    const text=d.text??bundle.texts?.[d.sourceSha256],file=bundle.textFiles?.[d.sourceSha256];
    const fileBacked=typeof text!=='string'&&file&&typeof file==='object'&&hasId(file.path);
    if(typeof text!=='string'&&!fileBacked)return hold('TEXT_NOT_AVAILABLE');
    const old=groups.get(d.sourceSha256);
    if(old) {if(!fileBacked&&old.text!==text)return hold('CLAIMED_HASH_CONTENT_CONFLICT');old.aliases.push(captureAlias(d));aliases++;return;}
    if(fileBacked){groups.set(d.sourceSha256,{sourceSha256:d.sourceSha256,textFile:structuredClone(file),aliases:[captureAlias(d)]});aliases++;deferredFileGroups++;return;}
    if(Buffer.from(text,'utf8').toString('utf8')!==text)return hold('INVALID_UNICODE');
    if(hash(text)!==d.sourceSha256)return hold('TEXT_DIGEST_MISMATCH');
    verifiedBytes+=Buffer.byteLength(text);groups.set(d.sourceSha256,{sourceSha256:d.sourceSha256,text,aliases:[captureAlias(d)]});aliases++;
  };
  const finish=()=>{
  requireValue(!finished,'CLASSIFICATION_GROUPER_ALREADY_FINISHED');finished=true;
  for(const g of groups.values())g.aliases.sort((a,b)=>compare(a.documentId,b.documentId));
  return {groups:[...groups.values()].sort((a,b)=>compare(a.sourceSha256,b.sourceSha256)),summary:{
    suppliedDocumentOccurrences:documents,authorizedSourceAliases:aliases,uniqueTexts:groups.size,
    duplicateOccurrencesReused:aliases-groups.size,verifiedUniqueUtf8Bytes:verifiedBytes,heldByReason:held,
    deferredFileGroups,bodyVerificationCompleteAtGrouping:deferredFileGroups===0,
    ownerId,authorizationCheckedAt:now,authorizationIsSnapshot:true,releaseRequiresCurrentRightsCheck:true,
    corpusEnumerationComplete:false,contentComplete:false,...EFFECTS}};};
  return {addDocument,finish};
}
export function prepareCorpusGroups(bundle,options={}) {
  requireValue(bundle&&Array.isArray(bundle.documents),'CLASSIFICATION_CORPUS_DOCUMENTS_REQUIRED');
  const grouper=createCorpusGrouper(bundle,options);for(const d of bundle.documents)grouper.addDocument(d);return grouper.finish();
}

export class AriadneCandidateClassifier {
  #source;#nodes;#houses;#spheres;#matcher=new PhraseMatcher();#config;#nodeDigests=new Map();#methodTemplates=new Map();
  constructor({ontologyBytes,expectedOntologySha256=ARIADNE_SOURCE.sha256,config={}}={}) {
    requireValue(typeof ontologyBytes==='string'||ontologyBytes instanceof Uint8Array,'ONTOLOGY_BYTES_REQUIRED');
    const bytes=Buffer.from(ontologyBytes),sha=hash(bytes);requireValue(sha===expectedOntologySha256&&sha===ARIADNE_SOURCE.sha256,'ORIGINAL_ARIADNE_SOURCE_PIN_MISMATCH');
    const original=JSON.parse(bytes.toString('utf8'));this.#source=sha;this.#nodes=original.nodes;this.#houses=original.houses;this.#spheres=original.spheres;
    requireValue(Object.keys(this.#houses).length===12&&Object.keys(this.#spheres).length===144&&Object.keys(this.#nodes).length===1728,'ARIADNE_CENSUS_MISMATCH');
    requireValue(Object.values(this.#nodes).filter(domain).length===1008&&Object.values(this.#nodes).filter(n=>n.kind==='EPISTEMIC_META').length===720,'ARIADNE_ROLE_CENSUS_MISMATCH');
    this.#config={maxCandidatesPerText:24,maxPendingLenses:12,maxEvidenceSpans:3,maxSourceChars:64000000,...config};
    for(const [key,value] of Object.entries(this.#config))requireValue(['maxCandidatesPerText','maxPendingLenses','maxEvidenceSpans','maxSourceChars'].includes(key)&&Number.isSafeInteger(value)&&value>=1,'CLASSIFICATION_CONFIG_INVALID');
    requireValue(this.#config.maxCandidatesPerText<=1728&&this.#config.maxEvidenceSpans<=16,'CLASSIFICATION_CONFIG_BOUND');
    for(const h of Object.values(this.#houses))for(const text of [h.name,...(h.aliases??[])])this.#matcher.add(text,{type:'HOUSE',id:h.id,field:'house.name-or-source-alias'});
    for(const s of Object.values(this.#spheres))if(s.children.some(id=>domain(this.#nodes[id])))this.#matcher.add(s.name,{type:'SPHERE',id:s.id,field:'sphere.name'});
    for(const n of Object.values(this.#nodes)) {
      requireValue(typeof n.definition==='string'&&typeof n.includes==='string'&&typeof n.excludes==='string','ARIADNE_SCOPE_FIELDS_REQUIRED');
      this.#nodeDigests.set(n.id,canonicalJsonSha256(n));
      this.#matcher.add(n.name,{type:domain(n)?'DOMAIN_NAME':'METHOD_NAME',id:n.id,field:'node.name'});
      this.#matcher.add(n.excludes,{type:'EXCLUSION',id:n.id,field:'node.excludes'});
      if(domain(n)) {
        const prefix=n.name+' addresses ',end=n.definition.lastIndexOf(', within ');
        if(n.definition.startsWith(prefix)&&end>prefix.length)this.#matcher.add(n.definition.slice(prefix.length,end),{type:'DOMAIN_FOCUS',id:n.id,field:'node.definition.primary-focus'});
      } else {
        const colon=n.name.indexOf(': '),label=colon>=0?n.name.slice(colon+2):n.name,key=n.lens+'.'+n.id.split('.').at(-1);
        if(!this.#methodTemplates.has(key))this.#methodTemplates.set(key,{key,label,nodes:[]});this.#methodTemplates.get(key).nodes.push(n.id);
      }
    }
    for(const t of this.#methodTemplates.values())this.#matcher.add(t.label,{type:'METHOD_TEMPLATE',id:t.key,field:'node.name.source-lens-suffix'});
    this.#matcher.build();
  }
  descriptor(){return {schema:CLASSIFIER_VERSION,ontology:{...ARIADNE_SOURCE},counts:{houses:12,spheres:144,nodes:1728,domainNodes:1008,methodNodes:720},
    method:'SOURCE_DERIVED_TOKEN_PHRASE_MATCHING_NOT_SEMANTIC_VALIDATION',bounds:{...this.#config},
    tokenNormalization:'NFKC_LOWERCASE_FOR_MATCHING_ONLY',offsets:'UNCHANGED_SOURCE_UTF16',...EFFECTS};}
  nodeRecords(){return Object.values(this.#nodes).sort((a,b)=>compare(a.id,b.id)).map(n=>({schema:'atlas.ariadne.source-node/v1',
    ontology:{...ARIADNE_SOURCE},nodeSha256:this.#nodeDigests.get(n.id),nodeDigestBasis:'SHA256_CANONICAL_JSON_OF_EXACT_PARSED_NODE',
    sourceRecordSha256:n.source_record_sha256??null,role:domain(n)?'DOMAIN':'METHOD',node:structuredClone(n)}));}
  lensTemplates(){return [...this.#methodTemplates.values()].sort((a,b)=>compare(a.key,b.key)).map(t=>({lensKey:t.key,label:t.label,candidateNodeIds:[...t.nodes],ontologySha256:this.#source,houseAssignmentMade:false}));}
  hierarchyRecords(){return [
    ...Object.values(this.#houses).map(h=>({recordType:'SOURCE_HOUSE',sourceSha256:this.#source,value:structuredClone(h)})),
    ...Object.values(this.#spheres).map(s=>({recordType:'SOURCE_SPHERE',sourceSha256:this.#source,value:structuredClone(s)})),
    ...Object.values(this.#spheres).map(s=>({recordType:'EDGE',type:'SOURCE_HOUSE_CONTAINS_SPHERE',from:s.parent,to:s.id,sourceSha256:this.#source})),
    ...Object.values(this.#nodes).map(n=>({recordType:'EDGE',type:'SOURCE_SPHERE_CONTAINS_NODE',from:n.parent,to:n.id,sourceSha256:this.#source}))];}
  #qualified(r) {return !!r&&this.#nodes[r.coordinate]&&r.namespace===ARIADNE_SOURCE.namespace&&r.edition===ARIADNE_SOURCE.edition&&
    (r.sha256??r.ontologySha256??r.sourceSha256??null)===this.#source;}
  classify({text,sourceSha256,aliases=[],includeSourceAliases=true}) {
    requireValue(typeof text==='string'&&hash(text)===sourceSha256,'CLASSIFICATION_TEXT_DIGEST_MISMATCH');
    requireValue(typeof includeSourceAliases==='boolean','CLASSIFICATION_ALIAS_OUTPUT_OPTION_INVALID');
    requireValue(Array.isArray(aliases)&&aliases.every(a=>hasId(a.documentId)&&hasId(a.sourceId)&&a.sourceSha256===sourceSha256&&a.rights?.scope==='owner-private'&&a.rights.allowed===true&&hasId(a.rights.ownerId)),'CLASSIFICATION_ALIAS_BINDING_REQUIRED');
    const base={schema:'atlas.corpus.ariadne-candidates/v1',sourceSha256,ontology:{...ARIADNE_SOURCE},sourceAliases:includeSourceAliases?structuredClone(aliases):[],sourceAliasCount:aliases.length,sourceAliasesIncluded:includeSourceAliases,
      classificationStatus:'UNREVIEWED_CANDIDATES_ONLY',lexicalScoreIsProbability:false,...EFFECTS};
    if(text.length>this.#config.maxSourceChars)return {...base,status:'SOURCE_SIZE_HOLD',candidates:[],pendingLenses:[],unknowns:[{code:'SOURCE_EXCEEDS_BOUND',chars:text.length,bound:this.#config.maxSourceChars}],scanComplete:false};
    const hits=new Map(),houses=new Set(),spheres=new Set(),templates=new Map(),coordinates=new Map();
    const addHit=(map,id,p,start,end)=>{let entry=map.get(id);if(!entry){entry={types:new Set(),spans:[],occurrences:0};map.set(id,entry);}entry.types.add(p.type);entry.occurrences++;
      if(entry.spans.length<this.#config.maxEvidenceSpans&&!entry.spans.some(s=>s.start===start&&s.end===end))entry.spans.push(sourceSpan(text,start,end,p.field,p.text));};
    const tokens=this.#matcher.scan(text,(p,start,end)=>{
      if(p.type==='HOUSE')houses.add(p.id);else if(p.type==='SPHERE')spheres.add(p.id);
      else if(p.type==='METHOD_TEMPLATE')addHit(templates,p.id,p,start,end);else addHit(hits,p.id,p,start,end);
    });
    for(const m of text.matchAll(HSN)) {if(!coordinates.has(m[0]))coordinates.set(m[0],[]);if(coordinates.get(m[0]).length<this.#config.maxEvidenceSpans)coordinates.get(m[0]).push({start:m.index,end:m.index+m[0].length,quote:m[0],quoteSha256:hash(m[0]),offsetUnit:'UTF16_CODE_UNITS',matchBasis:'EXACT_COORDINATE_SPELLING_REQUIRES_QUALIFIER'});}
    const qualifiers=new Map(),subjects=new Map();let ignoredQualifiedReferences=0;
    const addQualifier=(id,alias,r)=>{if(!this.#qualified(r)||!coordinates.has(id)){ignoredQualifiedReferences++;return;}
      if(!qualifiers.has(id))qualifiers.set(id,[]);qualifiers.get(id).push({documentId:alias.documentId,sourceId:alias.sourceId,reference:structuredClone(r),coordinateEvidence:coordinates.get(id)[0]});};
    for(const alias of aliases) {
      for(const r of [...(alias.coordinates??[]),...(alias.qualifiedHsnReferences??[])])addQualifier(r.coordinate,alias,r);
      if(alias.namespace&&alias.edition&&alias.ontologySha256)for(const coordinate of coordinates.keys())addQualifier(coordinate,alias,{coordinate,namespace:alias.namespace,edition:alias.edition,sha256:alias.ontologySha256});
      for(const subject of alias.domainSubjects??[])if(this.#qualified(subject)&&domain(this.#nodes[subject.coordinate])&&coordinates.has(subject.coordinate)) {
        const key=alias.documentId+'\0'+houseOf(subject.coordinate);if(!subjects.has(key))subjects.set(key,[]);
        subjects.get(key).push({documentId:alias.documentId,sourceId:alias.sourceId,subject:structuredClone(subject),coordinateEvidence:coordinates.get(subject.coordinate)[0],bindingBasis:'EXPLICIT_DOCUMENT_DOMAIN_SUBJECT'});
      }
      for(const binding of alias.methodSubjects??[])if(this.#qualified(binding.method)&&this.#qualified(binding.subject)&&!domain(this.#nodes[binding.method.coordinate])&&domain(this.#nodes[binding.subject.coordinate])&&
        houseOf(binding.method.coordinate)===houseOf(binding.subject.coordinate)&&coordinates.has(binding.method.coordinate)&&coordinates.has(binding.subject.coordinate)) {
        const key=alias.documentId+'\0'+binding.method.coordinate;if(!subjects.has(key))subjects.set(key,[]);
        subjects.get(key).push({documentId:alias.documentId,sourceId:alias.sourceId,subject:structuredClone(binding.subject),method:structuredClone(binding.method),coordinateEvidence:coordinates.get(binding.subject.coordinate)[0],bindingBasis:'EXPLICIT_METHOD_SUBJECT_PAIR'});
        addQualifier(binding.method.coordinate,alias,binding.method);
      }
    }
    const candidateIds=new Set([...hits.keys(),...qualifiers.keys()]);
    const unscoped=[];
    for(const [key,hit] of templates) {
      const t=this.#methodTemplates.get(key);let bound=false;
      for(const id of t.nodes)if(houses.has(houseOf(id))||spheres.has(this.#nodes[id].parent)||aliases.some(a=>subjects.has(a.documentId+'\0'+houseOf(id)))) {
        candidateIds.add(id);bound=true;const previous=hits.get(id);
        if(!previous)hits.set(id,{types:new Set(['METHOD_TEMPLATE']),spans:hit.spans,occurrences:hit.occurrences});
      }
      if(!bound)unscoped.push({lensKey:key,label:t.label,status:'PENDING_UNSCOPED_LENS',candidateNodeIds:[...t.nodes],
        evidence:hit.spans,subjectGate:'EXPLICIT_SAME_HOUSE_DOMAIN_SUBJECT_REQUIRED',houseAssignmentMade:false,semanticRelationAccepted:false});
    }
    const candidates=[];let rejectedBroadMentions=0;
    for(const id of candidateIds) {
      const node=this.#nodes[id],hit=hits.get(id),types=hit?.types??new Set(),qualified=qualifiers.get(id)??[],isDomain=domain(node);
      if(isDomain&&!qualified.length&&!types.has('DOMAIN_FOCUS')&&!(types.has('DOMAIN_NAME')&&(phraseTokens(node.name).length>=2||houses.has(houseOf(id))||spheres.has(node.parent)))){rejectedBroadMentions++;continue;}
      if(!isDomain&&!qualified.length&&!types.has('METHOD_NAME')&&!types.has('METHOD_TEMPLATE'))continue;
      const subjectBindings=[];
      if(!isDomain)for(const a of aliases)for(const s of [...(subjects.get(a.documentId+'\0'+id)??[]),...(subjects.get(a.documentId+'\0'+houseOf(id))??[])])subjectBindings.push(s);
      const score=(qualified.length?100:0)+(types.has('DOMAIN_NAME')?8:0)+(types.has('DOMAIN_FOCUS')?6:0)+(types.has('METHOD_NAME')?8:0)+
        (types.has('METHOD_TEMPLATE')?3:0)+(houses.has(houseOf(id))?1:0)+(spheres.has(node.parent)?1:0)+Math.min(2,Math.log2(1+(hit?.occurrences??0)));
      const evidence=[...(qualified.length?coordinates.get(id)??[]:[]),...(hit?.spans??[])].slice(0,this.#config.maxEvidenceSpans);
      candidates.push({coordinate:id,role:isDomain?'DOMAIN':'METHOD',nodeName:node.name,houseId:houseOf(id),sphereId:node.parent,
        nodeSha256:this.#nodeDigests.get(id),sourceRecordSha256:node.source_record_sha256??null,
        status:isDomain?'UNREVIEWED_DOMAIN_CANDIDATE':subjectBindings.length?'UNREVIEWED_METHOD_CANDIDATE':'PENDING_LENS',
        score,scoreBasis:'DETERMINISTIC_SOURCE_PHRASE_AND_QUALIFIED_REFERENCE_HEURISTIC',scoreIsProbability:false,
        matchingSignals:[...types].sort(),evidence,qualifiedReferences:qualified,
        qualifiedForDocumentIds:[...new Set(qualified.map(q=>q.documentId))],
        subjectGate:isDomain?'NOT_APPLICABLE':subjectBindings.length?'EXPLICIT_SAME_HOUSE_SUBJECT_PRESENT_REQUIRES_REVIEW':'EXPLICIT_SAME_HOUSE_DOMAIN_SUBJECT_REQUIRED',
        domainSubjects:subjectBindings,subjectReadyForDocumentIds:[...new Set(subjectBindings.map(s=>s.documentId))],subjectBindingsApplyOnlyToListedDocuments:true,
        scopeReview:{sourceRegistry:'ontology-nodes.jsonl',coordinate:id,nodeSha256:this.#nodeDigests.get(id),originalDefinitionIncludesAndExclusionsMustBeReviewed:true,
          exclusionTextAlsoPresent:types.has('EXCLUSION'),sourceOnlyMentionDoesNotEstablishDomainKnowledge:true,semanticReviewRequired:true},
        semanticRelationAccepted:false,canonAdmitted:false});
    }
    candidates.sort((a,b)=>b.score-a.score||compare(a.coordinate,b.coordinate));unscoped.sort((a,b)=>compare(a.lensKey,b.lensKey));
    // Every explicitly qualified address is retained; the configured bound applies to lexical-only candidates.
    const exact=candidates.filter(c=>c.qualifiedReferences.length),lexical=candidates.filter(c=>!c.qualifiedReferences.length);
    const kept=[...exact,...lexical.slice(0,this.#config.maxCandidatesPerText)].sort((a,b)=>b.score-a.score||compare(a.coordinate,b.coordinate));
    const unqualified=[...coordinates].filter(([id])=>!qualifiers.has(id)).sort((a,b)=>compare(a[0],b[0]));
    return {...base,status:kept.length||unscoped.length?'CANDIDATES_READY_FOR_REVIEW':'NO_SOURCE_GROUNDED_CANDIDATES',scanComplete:true,
      scannedUtf16Chars:text.length,scannedTokens:tokens,candidates:kept,pendingLenses:unscoped.slice(0,this.#config.maxPendingLenses),
      counts:{eligibleNodeCandidates:candidates.length,retainedNodeCandidates:kept.length,deferredLexicalCandidates:Math.max(0,lexical.length-this.#config.maxCandidatesPerText),
        unscopedLenses:unscoped.length,deferredUnscopedLenses:Math.max(0,unscoped.length-this.#config.maxPendingLenses),unqualifiedCoordinates:unqualified.length,rejectedBroadMentions,ignoredQualifiedReferences},
      unqualifiedCoordinateMentions:unqualified.slice(0,16).map(([coordinate,evidence])=>({coordinate,evidence,status:'UNQUALIFIED_EDITION_NO_CANONICAL_MAPPING'})),
      unknowns:[{code:'LEXICAL_MENTION_IS_NOT_SEMANTIC_OR_DOMAIN_KNOWLEDGE_ACCEPTANCE'},{code:'UNDECLARED_RELATIONS_AND_PARAPHRASES_NOT_DISCOVERED'},
        ...(lexical.length>this.#config.maxCandidatesPerText?[{code:'LEXICAL_CANDIDATE_BOUND',deferred:lexical.length-this.#config.maxCandidatesPerText}]:[]),
        ...(unscoped.length>this.#config.maxPendingLenses?[{code:'PENDING_LENS_BOUND',deferred:unscoped.length-this.#config.maxPendingLenses}]:[])]};
  }
}

export function candidateGraphRecords(record) {
  const contentId='sha256:'+record.sourceSha256;
  return [{recordType:'SOURCE_CONTENT',id:contentId,sha256:record.sourceSha256},
    ...record.sourceAliases.map(a=>({recordType:'EDGE',type:'EXACT_TEXT_ALIAS',from:a.documentId,to:contentId,sourceId:a.sourceId,sourceSha256:record.sourceSha256})),
    ...record.candidates.map(c=>({recordType:'EDGE',type:c.status,from:contentId,to:c.coordinate,ontologySha256:ARIADNE_SOURCE.sha256,nodeSha256:c.nodeSha256,
      score:c.score,scoreIsProbability:false,subjectGate:c.subjectGate,subjectCoordinates:[...new Set(c.domainSubjects.map(d=>d.subject.coordinate))],
      qualifiedForDocumentIds:c.qualifiedForDocumentIds,subjectReadyForDocumentIds:c.subjectReadyForDocumentIds,subjectBindingsApplyOnlyToListedDocuments:true,
      evidence:c.evidence.map(s=>({start:s.start,end:s.end,quoteSha256:s.quoteSha256})),semanticRelationAccepted:false,canonAdmitted:false})),
    ...record.pendingLenses.map(l=>({recordType:'EDGE',type:'PENDING_UNSCOPED_LENS_MENTION',from:contentId,to:'lens-template:'+l.lensKey,
      candidateNodeIds:l.candidateNodeIds,houseAssignmentMade:false,semanticRelationAccepted:false,canonAdmitted:false}))];
}

export function validateCandidateEvidence(record,text) {
  if(hash(text)!==record.sourceSha256)return {valid:false,reason:'SOURCE_DIGEST_MISMATCH'};
  const spans=[...record.candidates.flatMap(c=>[...c.evidence,...c.qualifiedReferences.map(r=>r.coordinateEvidence),...c.domainSubjects.map(s=>s.coordinateEvidence)]),
    ...record.pendingLenses.flatMap(l=>l.evidence),...(record.unqualifiedCoordinateMentions??[]).flatMap(r=>r.evidence)];
  const invalid=spans.filter(s=>!Number.isSafeInteger(s.start)||!Number.isSafeInteger(s.end)||s.start<0||s.end<=s.start||s.end>text.length||text.slice(s.start,s.end)!==s.quote||hash(s.quote)!==s.quoteSha256);
  return {valid:invalid.length===0,spansChecked:spans.length,invalidSpans:invalid.length,semanticValidityEstablished:false};
}

/** Compact lookup for a host that separately verifies current rights and original parent-text hashes. */
export function compactClassificationRecord(record) {
  const evidence = spans => spans.map(s=>({start:s.start,end:s.end,quoteSha256:s.quoteSha256}));
  return {status:record.status,scanComplete:record.scanComplete,sourceAccounting:record.sourceAccounting??null,
    candidates:record.candidates.map(c=>({coordinate:c.coordinate,role:c.role,status:c.status,score:c.score,nodeSha256:c.nodeSha256,
      evidence:evidence(c.evidence),subjectGate:c.subjectGate,
      ...(c.qualifiedForDocumentIds.length?{qualifiedForDocumentIds:c.qualifiedForDocumentIds}:{}),
      ...(c.subjectReadyForDocumentIds.length?{subjectReadyForDocumentIds:c.subjectReadyForDocumentIds}:{}),
      ...(c.domainSubjects.length?{domainSubjects:c.domainSubjects.map(s=>({documentId:s.documentId,coordinate:s.subject.coordinate,evidence:evidence([s.coordinateEvidence])[0]}))}:{})})),
    pendingLenses:record.pendingLenses.map(l=>({lensKey:l.lensKey,status:l.status,evidence:evidence(l.evidence)})),
    counts:record.counts??null,semanticRelationsAccepted:0,canonPromotions:0};
}
