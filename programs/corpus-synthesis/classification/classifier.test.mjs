import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {AriadneCandidateClassifier,ARIADNE_SOURCE,prepareCorpusGroups,candidateGraphRecords,validateCandidateEvidence,compactClassificationRecord,canonicalJsonSha256} from './classifier.mjs';

const sourcePath=process.env.ATLAS_ARIADNE_ORIGINAL_FILE;
const bytes=sourcePath?fs.readFileSync(sourcePath):null;
const original=bytes?JSON.parse(bytes.toString('utf8')):null;
const sourceTest=(name,fn)=>test(name,{skip:sourcePath?false:'Set ATLAS_ARIADNE_ORIGINAL_FILE to the exact caller-supplied source.'},fn);
const nodeName=id=>original.nodes[id].name;
const ownerId='synthetic-classification-owner',now='2026-11-24T00:00:00Z';
const sha=text=>createHash('sha256').update(text).digest('hex');
const classifier=bytes?new AriadneCandidateClassifier({ontologyBytes:bytes}):null;
const doc=(id,text,extra={})=>({id,sourceId:'source:'+id,title:'Synthetic fixture '+id,text,sourceUri:'https://example.test/'+id,
  sourceSha256:sha(text),rights:{scope:'owner-private',allowed:true,ownerId},...extra});
const ref=coordinate=>({coordinate,...ARIADNE_SOURCE});
const one=(text,extra={},c=classifier)=>c.classify(prepareCorpusGroups({documents:[doc('fixture',text,extra)]},{ownerId,now}).groups[0]);
const byId=(r,id)=>r.candidates.find(c=>c.coordinate===id);

sourceTest('canonical node digest agrees with known nested-array bytes and independent JSON serialization',()=>{
  const input={z:0,a:[{b:[2,3],a:1},[]]};
  assert.equal(canonicalJsonSha256(input),sha('{"a":[{"a":1,"b":[2,3]},[]],"z":0}'));
  const sorted=value=>Array.isArray(value)?value.map(sorted):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,sorted(value[k])])):value;
  for(const record of classifier.nodeRecords())assert.equal(record.nodeSha256,sha(JSON.stringify(sorted(record.node))));
});

sourceTest('source pin and all1728 exact original node scopes are retained',()=>{
  const nodes=classifier.nodeRecords();assert.equal(nodes.length,1728);assert.equal(nodes.filter(n=>n.role==='DOMAIN').length,1008);assert.equal(nodes.filter(n=>n.role==='METHOD').length,720);
  for(const n of nodes){assert.deepEqual(n.node,original.nodes[n.node.id]);assert.match(n.nodeSha256,/^[a-f0-9]{64}$/);assert.equal(n.ontology.sha256,ARIADNE_SOURCE.sha256);}
  nodes[0].node.excludes='tampered';assert.equal(classifier.nodeRecords()[0].node.excludes,original.nodes[nodes[0].node.id].excludes);
  assert.throws(()=>new AriadneCandidateClassifier({ontologyBytes:Buffer.from('{}')}),/SOURCE_PIN_MISMATCH/);
  const hierarchy=classifier.hierarchyRecords();assert.equal(hierarchy.filter(x=>x.type==='SOURCE_HOUSE_CONTAINS_SPHERE').length,144);assert.equal(hierarchy.filter(x=>x.type==='SOURCE_SPHERE_CONTAINS_NODE').length,1728);
});

sourceTest('full-body evidence, not title-only metadata, produces multiple grounded candidate links',()=>{
  const result=one(nodeName('H01.S01.N01')+' is discussed. '+nodeName('H02.S07.N11')+' is also discussed.');
  assert.ok(byId(result,'H01.S01.N01'));assert.ok(byId(result,'H02.S07.N11'));
  assert.ok(result.candidates.every(c=>c.evidence.length&&c.scopeReview.originalDefinitionIncludesAndExclusionsMustBeReviewed&&c.scopeReview.nodeSha256===classifier.nodeRecords().find(n=>n.node.id===c.coordinate).nodeSha256));
  const titleOnly=one('A source with no related body material.',{title:nodeName('H01.S01.N01')});assert.equal(byId(titleOnly,'H01.S01.N01'),undefined);
  assert.equal(result.semanticEdgesAccepted,0);assert.equal(result.domainExpertiseEstablished,false);
});

sourceTest('normalization never moves original Unicode or whitespace evidence offsets',()=>{
  const name=nodeName('H01.S01.N01'),unicodeName=String.fromCharCode(name.charCodeAt(0)+0xFEE0)+name.slice(1).replace(' ','\n ');
  const text='🧭 Prefix. '+unicodeName+': an invented discussion follows.';
  const result=one(text),candidate=byId(result,'H01.S01.N01');assert.ok(candidate);
  assert.equal(validateCandidateEvidence(result,text).valid,true);
  for(const span of candidate.evidence){assert.equal(text.slice(span.start,span.end),span.quote);assert.equal(sha(span.quote),span.quoteSha256);}
  assert.ok(candidate.evidence.some(s=>s.quote.includes(unicodeName)));
  const changed=structuredClone(result);changed.candidates[0].evidence[0].start++;
  assert.equal(validateCandidateEvidence(changed,text).valid,false);
});

sourceTest('generic software methods remain unscoped pending lenses without invented domain knowledge',()=>{
  const result=one(classifier.lensTemplates().slice(0,2).map(t=>t.label).join('. ')+'.');
  assert.equal(result.candidates.filter(c=>c.role==='DOMAIN').length,0);assert.ok(result.pendingLenses.length>=2);
  assert.ok(result.pendingLenses.every(l=>l.status==='PENDING_UNSCOPED_LENS'&&!l.houseAssignmentMade&&l.candidateNodeIds.length===12));
});

sourceTest('bare HSN and old-edition metadata do not become current-source qualified links',()=>{
  const coordinate='H01.S01.N01',text='This source mentions '+coordinate+'.';
  const bare=one(text);assert.equal(byId(bare,coordinate),undefined);assert.equal(bare.unqualifiedCoordinateMentions[0].status,'UNQUALIFIED_EDITION_NO_CANONICAL_MAPPING');
  const old=one(text,{coordinates:[{...ref(coordinate),edition:'ariadne-reader/v0.6'}]});assert.equal(byId(old,coordinate),undefined);
  const wrongHash=one(text,{coordinates:[{...ref(coordinate),sha256:'0'.repeat(64)}]});assert.equal(byId(wrongHash,coordinate),undefined);
  const missingText=one('No coordinate appears here.',{coordinates:[ref(coordinate)]});assert.equal(byId(missingText,coordinate),undefined);
});

sourceTest('qualified exact-ID candidates retain source pin and alias-specific declarations',()=>{
  const coordinate='H01.S01.N01',text='Qualified source address '+coordinate+'.';
  const docs=[doc('current',text,{coordinates:[ref(coordinate)]}),doc('old-copy',text,{coordinates:[{...ref(coordinate),edition:'ariadne-reader/v0.6'}]})];
  const grouped=prepareCorpusGroups({documents:docs},{ownerId,now}),result=classifier.classify(grouped.groups[0]),candidate=byId(result,coordinate);
  assert.equal(grouped.groups.length,1);assert.deepEqual(candidate.qualifiedForDocumentIds,['current']);assert.equal(result.sourceAliases.length,2);
  assert.ok(candidate.score>=100);assert.equal(candidate.scoreIsProbability,false);assert.equal(candidate.status,'UNREVIEWED_DOMAIN_CANDIDATE');
});

sourceTest('a method with no explicit domain subject remains pending despite a valid method address',()=>{
  const id='H01.S08.N01',text=id+' '+original.nodes[id].name;
  const result=one(text,{coordinates:[ref(id)]}),c=byId(result,id);assert.equal(c.status,'PENDING_LENS');assert.equal(c.domainSubjects.length,0);
  assert.equal(c.subjectGate,'EXPLICIT_SAME_HOUSE_DOMAIN_SUBJECT_REQUIRED');
});

sourceTest('explicit same-House source-qualified domain subjects permit only unreviewed method candidates',()=>{
  const method='H01.S08.N01',subject='H01.S01.N01',text=method+' '+subject+' '+original.nodes[method].name;
  const result=one(text,{methodSubjects:[{method:ref(method),subject:ref(subject)}]}),c=byId(result,method);
  assert.equal(c.status,'UNREVIEWED_METHOD_CANDIDATE');assert.equal(c.domainSubjects[0].subject.coordinate,subject);assert.deepEqual(c.subjectReadyForDocumentIds,['fixture']);assert.equal(c.canonAdmitted,false);
  const crossHouse='H02.S01.N01',wrongText=text+' '+crossHouse;
  const bad=one(wrongText,{methodSubjects:[{method:ref(method),subject:ref(crossHouse)}]});assert.equal(byId(bad,method).status,'PENDING_LENS');
  const badRole=one(text,{methodSubjects:[{method:ref(method),subject:ref(method)}]});assert.equal(byId(badRole,method).status,'PENDING_LENS');
  const badEdition=one(text,{domainSubjects:[{...ref(subject),edition:'ariadne-reader/v0.6'}]});assert.equal(byId(badEdition,method).status,'PENDING_LENS');
});

sourceTest('duplicate content is scanned once while all authorized version/source origins remain attached',()=>{
  const text=nodeName('H01.S01.N01')+' is a supplied synthetic topic.',a=doc('a',text,{version:'v1'}),b=doc('b',text,{version:'v2'});
  const inline=prepareCorpusGroups({documents:[a,b]},{ownerId,now});assert.equal(inline.groups.length,1);assert.equal(inline.summary.duplicateOccurrencesReused,1);
  const shared=prepareCorpusGroups({schema:'atlas.corpus.runtime-data/v2',texts:{[sha(text)]:text},documents:[a,b].map(({text,...rest})=>rest)},{ownerId,now});
  assert.deepEqual(shared.groups,inline.groups);assert.deepEqual(classifier.classify(shared.groups[0]),classifier.classify(inline.groups[0]));
  const wrong=prepareCorpusGroups({documents:[a,{...b,text:'Different content with a false claimed digest.'}]},{ownerId,now});assert.equal(wrong.summary.heldByReason.CLAIMED_HASH_CONTENT_CONFLICT,1);
});

sourceTest('denied, expired, ownerless, malformed rights and missing text stay unadmitted',()=>{
  const text=nodeName('H01.S01.N01')+'.',good=doc('good',text);
  const input={documents:[good,doc('foreign',text,{rights:{scope:'owner-private',allowed:true,ownerId:'other'}}),doc('ownerless',text,{rights:{scope:'owner-private',allowed:true}}),
    doc('expired',text,{rights:{...good.rights,expiresAt:'2020-01-01'}}),doc('bad-principals',text,{rights:{...good.rights,allowedPrincipalIds:'everyone'}}),{...doc('missing',text),text:undefined}]};
  const r=prepareCorpusGroups(input,{ownerId,now});assert.equal(r.groups.length,1);assert.equal(r.summary.authorizedSourceAliases,1);assert.equal(r.groups[0].aliases[0].documentId,'good');
  assert.throws(()=>prepareCorpusGroups(input),/OWNER_REQUIRED/);
});

sourceTest('bounds are explicit and qualified source links are never silently truncated',()=>{
  const bounded=new AriadneCandidateClassifier({ontologyBytes:bytes,config:{maxCandidatesPerText:1,maxPendingLenses:1}});
  const text=['H01.S01.N01','H02.S07.N11','H01.S01.N02'].map(nodeName).join('. ')+'.';
  const result=one(text,{},bounded);assert.equal(result.candidates.length,1);assert.ok(result.counts.deferredLexicalCandidates>=2);assert.ok(result.unknowns.some(u=>u.code==='LEXICAL_CANDIDATE_BOUND'));
  const ids=['H01.S01.N01','H02.S07.N11'];const exact=one(ids.join(' '),{coordinates:ids.map(ref)},bounded);assert.equal(exact.candidates.length,2);
  const size=new AriadneCandidateClassifier({ontologyBytes:bytes,config:{maxSourceChars:10}});const hold=one(text,{},size);assert.equal(hold.status,'SOURCE_SIZE_HOLD');assert.equal(hold.scanComplete,false);
});

sourceTest('graph export is deterministic, typed, digest-bound and never claims semantic admission',()=>{
  const text=nodeName('H01.S01.N01')+'. '+classifier.lensTemplates()[0].label+'.',result=one(text),again=one(text);assert.deepEqual(result,again);
  const graph=candidateGraphRecords(result);assert.ok(graph.some(r=>r.type==='EXACT_TEXT_ALIAS'));assert.ok(graph.some(r=>r.type==='UNREVIEWED_DOMAIN_CANDIDATE'));
  const compact=compactClassificationRecord(result);assert.equal(compact.candidates[0].nodeSha256,result.candidates[0].nodeSha256);assert.equal(compact.candidates[0].evidence[0].quoteSha256,result.candidates[0].evidence[0].quoteSha256);
  assert.equal('quote' in compact.candidates[0].evidence[0],false);assert.equal('excludes' in compact.candidates[0],false);assert.equal(classifier.lensTemplates().length,60);
  for(const edge of graph.filter(r=>r.nodeSha256)){assert.equal(edge.ontologySha256,ARIADNE_SOURCE.sha256);assert.equal(edge.semanticRelationAccepted,false);assert.equal(edge.canonAdmitted,false);}
  const invalid=structuredClone(prepareCorpusGroups({documents:[doc('bad-alias',text)]},{ownerId,now}).groups[0]);invalid.aliases[0].sourceSha256='0'.repeat(64);
  assert.throws(()=>classifier.classify(invalid),/ALIAS_BINDING_REQUIRED/);
});
