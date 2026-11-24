import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {streamDocumentsMetadata,verifyDocumentsFileUnchanged} from './documents-file.mjs';
import {createCorpusGrouper,prepareCorpusGroups} from './classifier.mjs';

const root=fs.mkdtempSync(path.join(tmpdir(),'atlas-classification-documents-')),hash=x=>createHash('sha256').update(x).digest('hex');
process.on('exit',()=>fs.rmSync(root,{recursive:true,force:true}));
const ownerId='metadata-owner',now='2026-11-24T00:00:00Z';
const doc=id=>({id,sourceId:'source:'+id,title:'Metadata '+id,sourceUri:'https://example.test/'+id,sourceSha256:'a'.repeat(64),rights:{scope:'owner-private',allowed:true,ownerId}});
function fixture(name,bytes,count){const dir=path.join(root,name);fs.mkdirSync(dir);const raw=Buffer.from(bytes);fs.writeFileSync(path.join(dir,'documents.jsonl'),raw);return{dir,raw,descriptor:{path:'documents.jsonl',sha256:hash(raw),bytes:raw.length,count}};}

test('metadata JSONL streams exact Unicode rows and verifies bytes/hash/count without requiring a final newline',async()=>{
  const rows=[{...doc('one'),title:'🐚'.repeat(50000)},doc('two')],f=fixture('unicode',rows.map(JSON.stringify).join('\n'),2),seen=[];
  const result=await streamDocumentsMetadata(f.descriptor,{corpusDirectory:f.dir,onDocument:row=>seen.push(row)});
  assert.deepEqual(seen,rows);assert.equal(result.identityVerified,true);assert.equal(result.metadataOnly,true);assert.equal(result.count,2);assert.equal(result.bytes,f.raw.length);
  assert.equal((await verifyDocumentsFileUnchanged(f.descriptor,{corpusDirectory:f.dir})).unchanged,true);
});

test('wrong metadata digests, counts and byte declarations cannot yield a verified receipt',async()=>{
  const f=fixture('binding',JSON.stringify(doc('one'))+'\n',1);
  for(const patch of [{sha256:'0'.repeat(64)},{count:2},{bytes:f.raw.length+1}])await assert.rejects(streamDocumentsMetadata({...f.descriptor,...patch},{corpusDirectory:f.dir,onDocument:()=>{}}),/DOCUMENTS_FILE_(DIGEST|COUNT|BYTES)_MISMATCH/);
  fs.appendFileSync(path.join(f.dir,'documents.jsonl'),'\n');await assert.rejects(verifyDocumentsFileUnchanged(f.descriptor,{corpusDirectory:f.dir}),/CHANGED_DURING_RUN/);
});

test('metadata rows with inline bodies, malformed JSON or excessive line bounds are rejected',async()=>{
  const body=fixture('body',JSON.stringify({...doc('one'),text:'Do not load body strings through metadata JSONL.'})+'\n',1);
  await assert.rejects(streamDocumentsMetadata(body.descriptor,{corpusDirectory:body.dir,onDocument:()=>{}}),/METADATA_ONLY/);
  const malformed=fixture('bad-json','{"broken":\n',1);await assert.rejects(streamDocumentsMetadata(malformed.descriptor,{corpusDirectory:malformed.dir,onDocument:()=>{}}));
  const bounded=fixture('bounded',JSON.stringify(doc('one'))+'\n',1);await assert.rejects(streamDocumentsMetadata(bounded.descriptor,{corpusDirectory:bounded.dir,onDocument:()=>{},maxLineChars:8}),/LINE_BOUND/);
});

test('invalid UTF8 or an escaping metadata path fails before a success receipt',async()=>{
  const invalid=fixture('bad-utf8',Buffer.from([0xff,0x0a]),1);await assert.rejects(streamDocumentsMetadata(invalid.descriptor,{corpusDirectory:invalid.dir,onDocument:()=>{}}));
  const f=fixture('paths',JSON.stringify(doc('one'))+'\n',1);await assert.rejects(streamDocumentsMetadata({...f.descriptor,path:'../bad-utf8/documents.jsonl'},{corpusDirectory:f.dir,onDocument:()=>{}}),/OUTSIDE_CORPUS/);
});

test('incremental metadata grouping matches array grouping and rejects updates after finish',async()=>{
  const rows=[doc('one'),doc('two'),{...doc('denied'),rights:{scope:'owner-private',allowed:true,ownerId:'other'}}];
  const bundle={documents:rows,textFiles:{['a'.repeat(64)]:{path:'text/a.txt',bytes:0,chars:0}}};
  const expected=prepareCorpusGroups(bundle,{ownerId,now}),grouper=createCorpusGrouper(bundle,{ownerId,now});
  for(const row of rows)grouper.addDocument(row);const actual=grouper.finish();assert.deepEqual(actual,expected);assert.equal(actual.groups[0].aliases.length,2);
  assert.throws(()=>grouper.addDocument(doc('late')),/ALREADY_FINISHED/);assert.throws(()=>grouper.finish(),/ALREADY_FINISHED/);
});
