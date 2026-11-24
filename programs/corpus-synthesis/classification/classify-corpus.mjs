#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {performance} from 'node:perf_hooks';
import {AriadneCandidateClassifier,prepareCorpusGroups,createCorpusGrouper,candidateGraphRecords,validateCandidateEvidence,compactClassificationRecord,ARIADNE_SOURCE} from './classifier.mjs';
import {loadSourceText} from './text-files.mjs';
import {streamDocumentsMetadata,verifyDocumentsFileUnchanged} from './documents-file.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const digest=x=>createHash('sha256').update(x).digest('hex');
const args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){if(!args[i].startsWith('--')||args[i+1]===undefined)throw Error('EXPECTED_NAMED_ARGUMENT_VALUE');options[args[i].slice(2)]=args[i+1];}
for(const key of Object.keys(options))if(!['input','output','ontology','owner','now','max-candidates','max-pending','max-source-chars'].includes(key))throw Error('UNKNOWN_ARGUMENT:'+key);
for(const name of ['input','ontology','output','owner'])if(!options[name])throw Error('REQUIRED_ARGUMENT: --'+name+' <explicit-value>');
const inputPath=path.resolve(options.input);
const ontologyPath=path.resolve(options.ontology);
const checkedAt=options.now??new Date().toISOString(),started=performance.now();
const sourceFiles=['classifier.mjs','classify-corpus.mjs','text-files.mjs','documents-file.mjs'];
const codeSha256=Object.fromEntries(sourceFiles.map(name=>[name,digest(fs.readFileSync(path.join(here,name)))]));
let inputBytes=fs.readFileSync(inputPath);const corpusSha256=digest(inputBytes),bundle=JSON.parse(inputBytes.toString('utf8'));inputBytes=null;
const output=path.resolve(options.output);
if(fs.existsSync(path.join(output,'classification-summary.json')))throw Error('EXISTING_CLASSIFICATION_RELEASE_USE_NEW_OUTPUT');
fs.mkdirSync(output,{recursive:true});
const config={};if(options['max-candidates'])config.maxCandidatesPerText=Number(options['max-candidates']);if(options['max-pending'])config.maxPendingLenses=Number(options['max-pending']);if(options['max-source-chars'])config.maxSourceChars=Number(options['max-source-chars']);
const classifier=new AriadneCandidateClassifier({ontologyBytes:fs.readFileSync(ontologyPath),config});
let grouped,documentsFileReceipt=null;
if(bundle.documentsFile){
  if(bundle.documents!==undefined)throw Error('AMBIGUOUS_DOCUMENTS_INPUT');
  const grouper=createCorpusGrouper(bundle,{ownerId:options.owner,now:checkedAt});
  documentsFileReceipt=await streamDocumentsMetadata(bundle.documentsFile,{corpusDirectory:path.dirname(inputPath),onDocument:d=>grouper.addDocument(d)});
  grouped=grouper.finish();
}else grouped=prepareCorpusGroups(bundle,{ownerId:options.owner,now:checkedAt});
const outputs=new Map();
function stream(name){const file=path.join(output,name);fs.mkdirSync(path.dirname(file),{recursive:true});const s=fs.createWriteStream(file,{flags:'wx'});outputs.set(name,{file,stream:s,hash:createHash('sha256'),rows:0,bytes:0,finished:false});return name;}
async function write(name,text){const item=outputs.get(name);item.hash.update(text);item.bytes+=Buffer.byteLength(text);if(!item.stream.write(text))await once(item.stream,'drain');}
async function line(name,value){outputs.get(name).rows++;await write(name,JSON.stringify(value)+'\n');}
async function finish(name){const item=outputs.get(name);if(!item.finished){item.stream.end();await once(item.stream,'finish');item.receipt={sha256:item.hash.digest('hex'),rows:item.rows,bytes:item.bytes};item.finished=true;}return item.receipt;}
const candidates=stream('candidates.jsonl'),graph=stream('graph.jsonl'),nodes=stream('ontology-nodes.jsonl'),aliasesFile=stream('source-aliases.jsonl');
const shards={};let activePrefix=null,activeShard=null;
async function closeShard(){if(activeShard){await write(activeShard,'}}\n');const receipt=await finish(activeShard);shards[activePrefix]={path:activeShard,sha256:receipt.sha256,bytes:receipt.bytes,count:receipt.rows};activeShard=null;}}
async function indexRecord(sha,value){const prefix=sha.slice(0,2);
  if(prefix!==activePrefix){await closeShard();activePrefix=prefix;activeShard=stream('classification-index/'+prefix+'.json');
    await write(activeShard,JSON.stringify({schema:'atlas.corpus.classification-shard/v1',prefix,ontologySha256:ARIADNE_SOURCE.sha256}).slice(0,-1)+',"byTextSha256":{');}
  const state=outputs.get(activeShard);await write(activeShard,(state.rows?',':'')+JSON.stringify(sha)+':'+JSON.stringify(value));state.rows++;}
for(const node of classifier.nodeRecords())await line(nodes,node);
for(const record of classifier.hierarchyRecords())await line(graph,record);
const counts={processedUniqueTexts:0,classifiedUniqueTexts:0,scannedUniqueTexts:0,sourceSizeHolds:0,sourceIntegrityOrReadHolds:0,
  verifiedUniqueTexts:0,verifiedUniqueUtf8Bytes:0,verifiedSourceUtf16Chars:0,verifiedSourceCodepoints:0,scannedUtf16Chars:0,scannedCodepoints:0,
  textsWithNodeCandidates:0,textsWithUnscopedLenses:0,textsWithoutCandidates:0,
  nodeCandidateEdges:0,domainCandidateEdges:0,pendingMethodEdges:0,subjectBoundMethodEdges:0,unscopedLensEdges:0,lexicalCandidatesDeferred:0,
  unscopedLensesDeferred:0,unqualifiedCoordinateMentions:0,validatedEvidenceSpans:0,invalidEvidenceSpans:0,sourceAliases:0};
const nodeCoverage=new Map(classifier.nodeRecords().map(r=>[r.node.id,{coordinate:r.node.id,role:r.role,contentGroups:0,sourceAliasOccurrences:0}]));
let lastProgress=performance.now();
for(const group of grouped.groups) {
  let loaded;
  if(group.textFile)try{loaded=await loadSourceText(group,{corpusDirectory:path.dirname(inputPath),maxChars:classifier.descriptor().bounds.maxSourceChars});}
    catch(error){loaded={status:'SOURCE_READ_HOLD',text:null,reason:error.code??error.message,accounting:{sourceDigestVerified:false,fullByteStreamRead:false,scanTruncated:false}};}
  else{let codepoints=0;for(const ignored of group.text)codepoints++;loaded={status:'TEXT_READY',text:group.text,
    accounting:{bytes:Buffer.byteLength(group.text),utf16Chars:group.text.length,codepoints,fullByteStreamRead:true,sourceDigestVerified:true,utf8Valid:true,scanTruncated:false}};}
  let record,check;
  if(loaded.status==='TEXT_READY') {record=classifier.classify({...group,text:loaded.text,includeSourceAliases:false});check=validateCandidateEvidence(record,loaded.text);if(record.scanComplete)counts.classifiedUniqueTexts++;}
  else {record={schema:'atlas.corpus.ariadne-candidates/v1',sourceSha256:group.sourceSha256,ontology:{...ARIADNE_SOURCE},sourceAliases:group.aliases,
    classificationStatus:'UNREVIEWED_CANDIDATES_ONLY',status:loaded.status,candidates:[],pendingLenses:[],unknowns:[{code:loaded.reason??loaded.status}],scanComplete:false,
    lexicalScoreIsProbability:false,semanticEdgesAccepted:0,canonPromotions:0,modelCalls:0,trainingRuns:0,factualProbability:null,domainExpertiseEstablished:false};check={valid:true,spansChecked:0,invalidSpans:0};}
  record.sourceAccounting=loaded.accounting;
  record.sourceAliases=[];record.sourceAliasesIncluded=false;record.sourceAliasCount=group.aliases.length;record.sourceAliasesArtifact='source-aliases.jsonl';
  if(!check.valid)throw Error('CLASSIFICATION_EVIDENCE_VALIDATION_FAILED:'+group.sourceSha256);
  counts.processedUniqueTexts++;counts.sourceAliases+=group.aliases.length;counts.validatedEvidenceSpans+=check.spansChecked;counts.invalidEvidenceSpans+=check.invalidSpans;
  if(loaded.accounting.sourceDigestVerified){counts.verifiedUniqueTexts++;counts.verifiedUniqueUtf8Bytes+=loaded.accounting.bytes??0;counts.verifiedSourceUtf16Chars+=loaded.accounting.utf16Chars??0;counts.verifiedSourceCodepoints+=loaded.accounting.codepoints??0;}
  if(record.scanComplete){counts.scannedUniqueTexts++;counts.scannedUtf16Chars+=loaded.accounting.utf16Chars;counts.scannedCodepoints+=loaded.accounting.codepoints;}
  else if(record.status==='SOURCE_SIZE_HOLD')counts.sourceSizeHolds++;else counts.sourceIntegrityOrReadHolds++;
  if(record.candidates.length)counts.textsWithNodeCandidates++;
  if(record.pendingLenses.length)counts.textsWithUnscopedLenses++;
  if(!record.candidates.length&&!record.pendingLenses.length)counts.textsWithoutCandidates++;
  for(const c of record.candidates) {
    counts.nodeCandidateEdges++;if(c.role==='DOMAIN')counts.domainCandidateEdges++;else if(c.status==='PENDING_LENS')counts.pendingMethodEdges++;else counts.subjectBoundMethodEdges++;
    const n=nodeCoverage.get(c.coordinate);n.contentGroups++;n.sourceAliasOccurrences+=group.aliases.length;
  }
  counts.unscopedLensEdges+=record.pendingLenses.length;counts.lexicalCandidatesDeferred+=record.counts?.deferredLexicalCandidates??0;
  counts.unscopedLensesDeferred+=record.counts?.deferredUnscopedLenses??0;counts.unqualifiedCoordinateMentions+=record.counts?.unqualifiedCoordinates??0;
  for(const alias of group.aliases){await line(aliasesFile,{sourceSha256:group.sourceSha256,alias});await line(graph,{recordType:'EDGE',type:'EXACT_TEXT_ALIAS',from:alias.documentId,to:'sha256:'+group.sourceSha256,sourceId:alias.sourceId,sourceSha256:group.sourceSha256});}
  await line(candidates,record);for(const edge of candidateGraphRecords(record))await line(graph,edge);
  await indexRecord(group.sourceSha256,compactClassificationRecord(record));
  if(performance.now()-lastProgress>5000){console.log(JSON.stringify({stage:'CLASSIFYING',done:counts.processedUniqueTexts,total:grouped.groups.length,nodeCandidateEdges:counts.nodeCandidateEdges}));lastProgress=performance.now();}
}
await closeShard();
const index=stream('classification-index.json');await line(index,{schema:'atlas.corpus.classification-index/v2',ontology:{...ARIADNE_SOURCE},corpusSha256,documentsFile:documentsFileReceipt,codeSha256,
  registry:'ontology-nodes.jsonl',sourceAliasesArtifact:'source-aliases.jsonl',lensTemplates:classifier.lensTemplates(),scoreIsProbability:false,semanticEdgesAccepted:0,canonPromotions:0,
  shards,counts,limits:{semanticClassificationValidated:false,allPossibleMappingsEnumerated:false,currentRightsMustBeRechecked:true}});
const artifacts={};for(const name of outputs.keys())artifacts[name]=await finish(name);
const afterCode=Object.fromEntries(sourceFiles.map(name=>[name,digest(fs.readFileSync(path.join(here,name)))]));
if(JSON.stringify(codeSha256)!==JSON.stringify(afterCode))throw Error('CLASSIFIER_CODE_CHANGED_DURING_RUN');
// Re-read only for byte identity; a changed acquisition snapshot cannot borrow this receipt.
if(digest(fs.readFileSync(inputPath))!==corpusSha256)throw Error('CORPUS_CHANGED_DURING_RUN');
if(bundle.documentsFile)await verifyDocumentsFileUnchanged(bundle.documentsFile,{corpusDirectory:path.dirname(inputPath)});
if(digest(fs.readFileSync(ontologyPath))!==ARIADNE_SOURCE.sha256)throw Error('ONTOLOGY_CHANGED_DURING_RUN');
const summary={schema:'atlas.corpus.classification-run/v1',status:'COMPLETED_UNREVIEWED_CLASSIFICATION',generatedAt:new Date().toISOString(),authorizationCheckedAt:checkedAt,
  input:{path:inputPath,sha256:corpusSha256,schema:bundle.schema??null,documentsFile:documentsFileReceipt},ontology:{path:ontologyPath,...ARIADNE_SOURCE},codeSha256,descriptor:classifier.descriptor(),
  corpusAdmission:grouped.summary,counts,artifacts,nodesWithCandidates:[...nodeCoverage.values()].filter(n=>n.contentGroups).length,
  nodeCoverage:[...nodeCoverage.values()],limits:{allInputBodyHashesVerifiedForAdmittedGroups:counts.verifiedUniqueTexts===grouped.groups.length,eachUniqueTextClassifiedAtMostOnce:true,
    bodyLoading:grouped.summary.deferredFileGroups?'ONE_UNIQUE_FILE_AT_A_TIME':'INLINE_LEGACY_CORPUS_ALREADY_IN_MEMORY',
    scanCompleteForAdmittedTexts:counts.scannedUniqueTexts===grouped.groups.length,noPartialSourceClassification:true,allPossibleMappingsEnumerated:false,semanticClassificationValidated:false,canonicalMappingAccepted:false,
    corpusEnumerationComplete:false,modelAnswerQualityMeasured:false,performanceGainClaim:false,quotedSpansAreNotProofOfDomainKnowledge:true},
  elapsedMs:performance.now()-started,resourceUsage:process.resourceUsage(),semanticEdgesAccepted:0,canonPromotions:0,modelCalls:0,trainingRuns:0};
const summaryPath=path.join(output,'classification-summary.json');fs.writeFileSync(summaryPath,JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
// This public runner writes only inside the caller's explicit output directory.
console.log(JSON.stringify({status:summary.status,output,counts,corpusSha256,elapsedMs:summary.elapsedMs,artifactFiles:Object.keys(artifacts).length,indexSha256:artifacts['classification-index.json'].sha256}));
