import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
  ARIADNE_SOURCE, AriadneCandidateClassifier, prepareCorpusGroups,
  candidateGraphRecords, compactClassificationRecord, canonicalJsonSha256
} from '../../context-integration/classification.mjs';

// These admission fixtures are invented and need no original ontology.
const ownerId='invented-independent-owner',now='2026-11-24T00:00:00Z';
const sha=x=>createHash('sha256').update(x).digest('hex');
const make=(id,text,extra={})=>({id,sourceId:'invented-source:'+id,title:'Invented '+id,
  text,sourceSha256:sha(text),sourceUri:'https://example.invalid/'+id,
  rights:{scope:'owner-private',allowed:true,ownerId},...extra});
const ref=coordinate=>({coordinate,...ARIADNE_SOURCE});
const sourcePath=process.env.ATLAS_ARIADNE_ORIGINAL_FILE;
const sourceTest=(name,fn)=>test(name,{skip:sourcePath?false:'Requires exact caller-supplied ATLAS_ARIADNE_ORIGINAL_FILE.'},fn);
const classifier=sourcePath?new AriadneCandidateClassifier({ontologyBytes:readFileSync(sourcePath)}):null;

test('canonical digest matches independently specified nested JSON bytes without an ontology',()=>{
  assert.equal(canonicalJsonSha256({z:[3,{c:'é',a:[]},null],a:1}),sha('{"a":1,"z":[3,{"a":[],"c":"é"},null]}'));
  assert.notEqual(canonicalJsonSha256([1,23]),canonicalJsonSha256([12,3]));
});

test('independent admission strips unauthorized aliases before deduplication',()=>{
  const text='Invented cobalt catalog.',good=make('good',text);
  const rows=[good,make('duplicate',text),make('foreign',text,{rights:{...good.rights,ownerId:'unrelated'}}),
    make('revoked',text,{rights:{...good.rights,revoked:true}}),
    make('expired',text,{rights:{...good.rights,expiresAt:now}}),
    make('ownerless',text,{rights:{scope:'owner-private',allowed:true}}),
    make('wrong-principal',text,{rights:{...good.rights,allowedPrincipalIds:['other']}}),
    make('invalid-principal-list',text,{rights:{...good.rights,allowedPrincipalIds:'everyone'}})];
  const grouped=prepareCorpusGroups({documents:rows},{ownerId,now});
  assert.equal(grouped.groups.length,1);
  assert.deepEqual(grouped.groups[0].aliases.map(a=>a.documentId),['duplicate','good']);
  assert.equal(grouped.summary.authorizedSourceAliases,2);
  assert.equal(Object.values(grouped.summary.heldByReason).reduce((a,b)=>a+b,0),6);
  assert.equal(grouped.summary.authorizationIsSnapshot,true);
  assert.equal(grouped.summary.releaseRequiresCurrentRightsCheck,true);
});

test('independent inline admission rejects digest substitution and unpaired Unicode',()=>{
  const good=make('good','Invented original body.');
  const forged={...make('forged','Invented different body.'),sourceSha256:good.sourceSha256};
  const unicode=make('invalid-unicode','bad\ud800text');
  const result=prepareCorpusGroups({documents:[good,forged,unicode]},{ownerId,now});
  assert.equal(result.groups.length,1);
  assert.equal(result.groups[0].aliases.length,1);
  assert.equal(result.summary.heldByReason.CLAIMED_HASH_CONTENT_CONFLICT,1);
  assert.equal(result.summary.heldByReason.INVALID_UNICODE,1);
});

sourceTest('method subject declarations never transfer to an unbound exact-copy alias',()=>{
  const method='H01.S08.N01',subject='H01.S01.N01',text='Invented pair '+method+' with '+subject+'.';
  const documents=[make('declared',text,{methodSubjects:[{method:ref(method),subject:ref(subject)}]}),make('unbound-copy',text)];
  const grouped=prepareCorpusGroups({documents},{ownerId,now});
  const result=classifier.classify(grouped.groups[0]),candidate=result.candidates.find(c=>c.coordinate===method);
  assert.equal(result.sourceAliases.length,2);
  assert.equal(candidate.status,'UNREVIEWED_METHOD_CANDIDATE');
  assert.deepEqual(candidate.subjectReadyForDocumentIds,['declared']);
  assert.deepEqual(candidate.qualifiedForDocumentIds,['declared']);
  const edge=candidateGraphRecords(result).find(e=>e.to===method);
  assert.deepEqual(edge.subjectReadyForDocumentIds,['declared']);
  const compact=compactClassificationRecord(result).candidates.find(c=>c.coordinate===method);
  assert.deepEqual(compact.subjectReadyForDocumentIds,['declared']);
  assert.equal(edge.semanticRelationAccepted,false);
});

sourceTest('old-edition, wrong-namespace and method-as-subject declarations stay pending',()=>{
  const method='H01.S08.N01',subject='H01.S01.N01',text='Invented pair '+method+' with '+subject+'.';
  for(const declared of [{...ref(subject),edition:'ariadne-reader/v0.6'},{...ref(subject),namespace:'UNRELATED_NAMESPACE'},ref(method)]){
    const d=make('case',text,{coordinates:[ref(method)],methodSubjects:[{method:ref(method),subject:declared}]});
    const result=classifier.classify(prepareCorpusGroups({documents:[d]},{ownerId,now}).groups[0]);
    const candidate=result.candidates.find(c=>c.coordinate===method);
    assert.equal(candidate.status,'PENDING_LENS');
    assert.deepEqual(candidate.subjectReadyForDocumentIds,[]);
    assert.equal(result.semanticEdgesAccepted,0);
  }
});
