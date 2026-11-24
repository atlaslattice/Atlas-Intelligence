import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {ARIADNE_SOURCE} from './classifier.mjs';

const here=dirname(fileURLToPath(import.meta.url)),cli=join(here,'classify-corpus.mjs');
const sourcePath=process.env.ATLAS_ARIADNE_ORIGINAL_FILE;
const sourceTest=(name,fn)=>test(name,{skip:sourcePath?false:'Requires exact caller-supplied ATLAS_ARIADNE_ORIGINAL_FILE.'},fn);
const hash=x=>createHash('sha256').update(x).digest('hex');
const ownerId='invented-cli-owner',now='2026-11-24T00:00:00Z';
const ref=coordinate=>({coordinate,...ARIADNE_SOURCE});
const doc=(id,text,extra={})=>({id,sourceId:'invented:'+id,title:'Invented fixture '+id,
  sourceSha256:hash(text),sourceUri:'https://example.invalid/'+id,
  rights:{scope:'owner-private',allowed:true,ownerId},...extra});

test('public CLI requires explicit source, corpus, output and trusted owner arguments',()=>{
  const temp=mkdtempSync(join(tmpdir(),'atlas-classifier-cli-arguments-'));
  try {
    for(const missing of ['input','ontology','output','owner']){
      const values={input:'absent-input.json',ontology:'absent-source.json',output:'absent-output',owner:'invented-owner'};
      const args=Object.entries(values).filter(([key])=>key!==missing).flatMap(([key,value])=>['--'+key,value]);
      const result=spawnSync(process.execPath,[cli,...args],{cwd:temp,encoding:'utf8'});
      assert.notEqual(result.status,0);
      assert.match(result.stderr,new RegExp('REQUIRED_ARGUMENT: --'+missing));
      assert.equal(existsSync(join(temp,'absent-output')),false);
    }
  } finally {rmSync(temp,{recursive:true,force:true});}
});

sourceTest('synthetic v3 CLI artifacts bind exact source identity, aliases, spans and all original nodes',()=>{
  const temp=mkdtempSync(join(tmpdir(),'atlas-classifier-cli-replay-'));
  try {
    const textA='🧭 Invented reference H01.S01.N01 in this fixture.',textB='Invented method H01.S08.N01 has explicit subject H01.S01.N01.';
    const texts=[textA,textB],textFiles={};mkdirSync(join(temp,'texts'));
    for(const text of texts){const sha=hash(text),path='texts/'+sha+'.txt';writeFileSync(join(temp,path),text);textFiles[sha]={path,bytes:Buffer.byteLength(text),chars:text.length,charsUnit:'UTF16_CODE_UNITS'};}
    const documents=[
      doc('current',textA,{coordinates:[ref('H01.S01.N01')]}),
      doc('unqualified-copy',textA),
      doc('method',textB,{methodSubjects:[{method:ref('H01.S08.N01'),subject:ref('H01.S01.N01')}]}),
      doc('denied-marker',textA,{rights:{scope:'owner-private',allowed:true,ownerId:'unrelated'}})];
    const metadataBytes=Buffer.from(documents.map(JSON.stringify).join('\n')+'\n');writeFileSync(join(temp,'documents.jsonl'),metadataBytes);
    const input={schema:'atlas.corpus.runtime-data/v3',textFiles,documentsFile:{path:'documents.jsonl',sha256:hash(metadataBytes),bytes:metadataBytes.length,count:documents.length}};
    const inputPath=join(temp,'corpus.json'),output=join(temp,'result');writeFileSync(inputPath,JSON.stringify(input));
    const args=[cli,'--input',inputPath,'--ontology',sourcePath,'--output',output,'--owner',ownerId,'--now',now];
    const result=spawnSync(process.execPath,args,{cwd:temp,encoding:'utf8',maxBuffer:4*1024*1024});
    assert.equal(result.status,0,result.stderr);
    const summary=JSON.parse(readFileSync(join(output,'classification-summary.json'),'utf8'));
    assert.equal(summary.input.sha256,hash(readFileSync(inputPath)));
    assert.equal(summary.input.documentsFile.sha256,hash(metadataBytes));
    assert.equal(summary.input.documentsFile.identityVerified,true);
    assert.equal(summary.input.documentsFile.count,documents.length);
    assert.equal(summary.input.documentsFile.bytes,metadataBytes.length);
    assert.equal(summary.ontology.sha256,ARIADNE_SOURCE.sha256);
    assert.equal(summary.counts.processedUniqueTexts,2);
    assert.equal(summary.counts.scannedUniqueTexts,2);
    assert.equal(summary.counts.sourceAliases,3);
    assert.equal(summary.counts.verifiedUniqueUtf8Bytes,texts.reduce((sum,text)=>sum+Buffer.byteLength(text),0));
    assert.equal(summary.counts.invalidEvidenceSpans,0);
    assert.equal(summary.limits.bodyLoading,'ONE_UNIQUE_FILE_AT_A_TIME');
    assert.equal(summary.semanticEdgesAccepted,0);
    for(const [name,receipt]of Object.entries(summary.artifacts)){
      const bytes=readFileSync(join(output,name));assert.equal(hash(bytes),receipt.sha256);assert.equal(bytes.length,receipt.bytes);
    }
    const nodes=readFileSync(join(output,'ontology-nodes.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(nodes.length,1728);
    const original=JSON.parse(readFileSync(sourcePath,'utf8'));
    assert.deepEqual(nodes.find(r=>r.node.id==='H01.S01.N01').node,original.nodes['H01.S01.N01']);
    const records=readFileSync(join(output,'candidates.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
    const a=records.find(r=>r.sourceSha256===hash(textA));
    assert.equal(a.sourceAliases.length,0);
    assert.equal(a.sourceAliasesIncluded,false);
    assert.equal(a.sourceAliasCount,2);
    assert.equal(a.sourceAliasesArtifact,'source-aliases.jsonl');
    assert.deepEqual(a.candidates.find(c=>c.coordinate==='H01.S01.N01').qualifiedForDocumentIds,['current']);
    assert.ok(!JSON.stringify(records).includes('denied-marker'));
    for(const r of records){const text=texts.find(t=>hash(t)===r.sourceSha256);for(const c of r.candidates)for(const span of c.evidence){assert.equal(text.slice(span.start,span.end),span.quote);assert.equal(hash(span.quote),span.quoteSha256);}}
    const aliases=readFileSync(join(output,'source-aliases.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(aliases.length,3);assert.ok(!JSON.stringify(aliases).includes('denied-marker'));
    assert.deepEqual(aliases.filter(a=>a.sourceSha256===hash(textA)).map(a=>a.alias.documentId).sort(),['current','unqualified-copy']);
    const index=JSON.parse(readFileSync(join(output,'classification-index.json'),'utf8'));
    assert.equal(index.schema,'atlas.corpus.classification-index/v2');
    assert.equal(index.documentsFile.identityVerified,true);
    assert.equal('byTextSha256' in index,false);
    assert.equal(index.sourceAliasesArtifact,'source-aliases.jsonl');
    assert.equal(Object.keys(index.shards).length,2);
    assert.equal(Object.keys(summary.artifacts).length,5+Object.keys(index.shards).length);
    const indexedKeys=[];
    for(const [prefix,receipt]of Object.entries(index.shards)){
      const shardBytes=readFileSync(join(output,receipt.path));assert.equal(hash(shardBytes),receipt.sha256);assert.equal(shardBytes.length,receipt.bytes);
      const shard=JSON.parse(shardBytes);assert.equal(shard.schema,'atlas.corpus.classification-shard/v1');assert.equal(shard.prefix,prefix);assert.equal(shard.ontologySha256,ARIADNE_SOURCE.sha256);
      const keys=Object.keys(shard.byTextSha256);assert.equal(keys.length,receipt.count);assert.ok(keys.every(key=>key.startsWith(prefix)));indexedKeys.push(...keys);
      for(const value of Object.values(shard.byTextSha256))for(const candidate of value.candidates){assert.equal('definition' in candidate,false);for(const evidence of candidate.evidence)assert.equal('quote' in evidence,false);}
    }
    assert.deepEqual(indexedKeys.sort(),texts.map(hash).sort());
    assert.equal(index.semanticEdgesAccepted,0);
    assert.equal(existsSync(join(here,'latest.json')),false);
    const repeat=spawnSync(process.execPath,args,{cwd:temp,encoding:'utf8'});
    assert.notEqual(repeat.status,0);assert.match(repeat.stderr,/EXISTING_CLASSIFICATION_RELEASE_USE_NEW_OUTPUT/);
  } finally {rmSync(temp,{recursive:true,force:true});}
});

sourceTest('bad streamed metadata identity creates no classification artifact or completed receipt',()=>{
  const temp=mkdtempSync(join(tmpdir(),'atlas-classifier-cli-metadata-hold-'));
  try{
    const documents=[doc('fixture','Invented source.')],metadataBytes=Buffer.from(documents.map(JSON.stringify).join('\n')+'\n');
    writeFileSync(join(temp,'documents.jsonl'),metadataBytes);
    const input={schema:'atlas.corpus.runtime-data/v3',documentsFile:{path:'documents.jsonl',sha256:'0'.repeat(64),bytes:metadataBytes.length,count:documents.length},textFiles:{}};
    const inputPath=join(temp,'corpus.json'),output=join(temp,'result');writeFileSync(inputPath,JSON.stringify(input));
    const result=spawnSync(process.execPath,[cli,'--input',inputPath,'--ontology',sourcePath,'--output',output,'--owner',ownerId,'--now',now],{cwd:temp,encoding:'utf8'});
    assert.notEqual(result.status,0);assert.match(result.stderr,/DOCUMENTS_FILE_DIGEST_MISMATCH/);
    assert.equal(existsSync(join(output,'classification-summary.json')),false);
    assert.equal(existsSync(join(output,'candidates.jsonl')),false);
  }finally{rmSync(temp,{recursive:true,force:true});}
});

sourceTest('synthetic CLI holds oversized and unreadable sources without partial classification',()=>{
  const temp=mkdtempSync(join(tmpdir(),'atlas-classifier-cli-holds-'));
  try {
    const text='An invented large body with H01.S01.N01 exceeds the chosen test bound.',missing='invented unreadable body';
    writeFileSync(join(temp,'body.txt'),text);
    const input={schema:'atlas.corpus.runtime-data/v3',documents:[doc('oversize',text),doc('missing',missing)],textFiles:{
      [hash(text)]:{path:'body.txt',bytes:Buffer.byteLength(text),chars:text.length,charsUnit:'UTF16_CODE_UNITS'},
      [hash(missing)]:{path:'missing.txt',bytes:Buffer.byteLength(missing),chars:missing.length,charsUnit:'UTF16_CODE_UNITS'}}};
    const inputPath=join(temp,'corpus.json'),output=join(temp,'result');writeFileSync(inputPath,JSON.stringify(input));
    const result=spawnSync(process.execPath,[cli,'--input',inputPath,'--ontology',sourcePath,'--output',output,'--owner',ownerId,'--now',now,'--max-source-chars','16'],{cwd:temp,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    const summary=JSON.parse(readFileSync(join(output,'classification-summary.json'),'utf8'));
    assert.equal(summary.counts.sourceSizeHolds,1);
    assert.equal(summary.counts.sourceIntegrityOrReadHolds,1);
    assert.equal(summary.counts.scannedUniqueTexts,0);
    assert.equal(summary.limits.scanCompleteForAdmittedTexts,false);
    assert.equal(summary.limits.allInputBodyHashesVerifiedForAdmittedGroups,false);
    const records=readFileSync(join(output,'candidates.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
    assert.ok(records.every(r=>r.candidates.length===0&&!r.scanComplete));
    assert.ok(records.every(r=>r.sourceAccounting.scanTruncated===false));
  } finally {rmSync(temp,{recursive:true,force:true});}
});
