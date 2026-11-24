import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {loadSourceText} from './text-files.mjs';
import {prepareCorpusGroups} from './classifier.mjs';

const root=fs.mkdtempSync(path.join(tmpdir(),'atlas-classification-stream-')),hash=x=>createHash('sha256').update(x).digest('hex');
process.on('exit',()=>fs.rmSync(root,{recursive:true,force:true}));
function fixture(name,body){const dir=path.join(root,name);fs.mkdirSync(dir);const data=Buffer.from(body),sha=hash(data);fs.writeFileSync(path.join(dir,'body.txt'),data);return{dir,data,group:{sourceSha256:sha,textFile:{path:'body.txt',bytes:data.length,chars:typeof body==='string'?body.length:null},aliases:[]}};}

test('v3 stream preserves BOM and Unicode across byte chunks with exact UTF16/codepoint accounting',async()=>{
  const text='\uFEFF'+'a'.repeat(131068)+'🧭 Invented source material.';const f=fixture('unicode',text);
  const loaded=await loadSourceText(f.group,{corpusDirectory:f.dir,maxChars:200000});
  assert.equal(loaded.status,'TEXT_READY');assert.equal(loaded.text,text);assert.equal(loaded.accounting.utf16Chars,text.length);assert.equal(loaded.accounting.codepoints,[...text].length);
  assert.equal(loaded.accounting.bytes,f.data.length);assert.equal(loaded.accounting.sourceDigestVerified,true);assert.equal(loaded.accounting.scanTruncated,false);
});

test('oversized bodies are fully hashed/counted and held without partial classification text',async()=>{
  const text='🧭 source text exceeds a deliberately small bound.',f=fixture('size',text);
  const loaded=await loadSourceText(f.group,{corpusDirectory:f.dir,maxChars:4});
  assert.equal(loaded.status,'SOURCE_SIZE_HOLD');assert.equal(loaded.text,null);assert.equal(loaded.accounting.fullByteStreamRead,true);
  assert.equal(loaded.accounting.utf16Chars,text.length);assert.equal(loaded.accounting.codepoints,[...text].length);assert.equal(loaded.accounting.sourceDigestVerified,true);
});

test('wrong hashes and declared byte/UTF16/codepoint counts do not release source text',async()=>{
  const f=fixture('digest','A real source body.');
  const wrong=await loadSourceText({...f.group,sourceSha256:'0'.repeat(64)},{corpusDirectory:f.dir});assert.equal(wrong.status,'SOURCE_DIGEST_HOLD');assert.equal(wrong.text,null);
  const metadata=await loadSourceText({...f.group,textFile:{...f.group.textFile,bytes:f.data.length+1}},{corpusDirectory:f.dir});assert.equal(metadata.status,'SOURCE_METADATA_SIZE_HOLD');assert.equal(metadata.text,null);
  for(const spelling of ['charsUnit','charUnit']){
    const wrongChars=await loadSourceText({...f.group,textFile:{...f.group.textFile,chars:1,[spelling]:'UTF16_CODE_UNITS'}},{corpusDirectory:f.dir});assert.equal(wrongChars.status,'SOURCE_METADATA_CHARACTER_COUNT_HOLD');assert.equal(wrongChars.text,null);
    const rightChars=await loadSourceText({...f.group,textFile:{...f.group.textFile,[spelling]:'UTF16_CODE_UNITS'}},{corpusDirectory:f.dir});assert.equal(rightChars.status,'TEXT_READY');assert.equal(rightChars.accounting.declaredCharsVerified,true);
  }
  const wrongCodepoints=await loadSourceText({...f.group,textFile:{...f.group.textFile,chars:1,charsUnit:'UNICODE_CODEPOINTS'}},{corpusDirectory:f.dir});assert.equal(wrongCodepoints.status,'SOURCE_METADATA_CHARACTER_COUNT_HOLD');
});

test('invalid UTF8 is held while its complete raw-byte hash remains explicitly accounted',async()=>{
  const f=fixture('invalid',Buffer.from([0x61,0xff,0x62]));const loaded=await loadSourceText(f.group,{corpusDirectory:f.dir});
  assert.equal(loaded.status,'SOURCE_UNICODE_HOLD');assert.equal(loaded.text,null);assert.equal(loaded.accounting.sourceDigestVerified,true);
  assert.equal(loaded.accounting.utf8Valid,false);assert.equal(loaded.accounting.codepoints,null);
});

test('relative containment, symlink and regular-file boundaries reject unintended reads',async()=>{
  const f=fixture('paths','A permitted source.'),outside=path.join(root,'outside.txt');fs.writeFileSync(outside,'outside');
  await assert.rejects(loadSourceText({...f.group,textFile:{path:'../outside.txt'}},{corpusDirectory:f.dir}),/OUTSIDE_CORPUS/);
  await assert.rejects(loadSourceText({...f.group,textFile:{path:outside}},{corpusDirectory:f.dir}),/MUST_BE_RELATIVE/);
  fs.symlinkSync(outside,path.join(f.dir,'symlink.txt'));await assert.rejects(loadSourceText({...f.group,textFile:{path:'symlink.txt'}},{corpusDirectory:f.dir}),/SYMLINK_FORBIDDEN/);
  fs.mkdirSync(path.join(f.dir,'directory'));await assert.rejects(loadSourceText({...f.group,textFile:{path:'directory'}},{corpusDirectory:f.dir}),/REGULAR_FILE_REQUIRED/);
});

test('v3 grouping retains metadata aliases and defers all body reads until the unique loader call',async()=>{
  const f=fixture('groups','Invented source material.'),ownerId='stream-owner',base={sourceId:'a',sourceSha256:f.group.sourceSha256,title:'fixture',sourceUri:'https://example.test/a',rights:{scope:'owner-private',allowed:true,ownerId}};
  const grouped=prepareCorpusGroups({schema:'atlas.corpus.runtime-data/v3',documents:[{...base,id:'one'},{...base,id:'two',sourceId:'b'}],textFiles:{[base.sourceSha256]:f.group.textFile}},{ownerId,now:'2026-11-24T00:00:00Z'});
  assert.equal(grouped.groups.length,1);assert.equal(grouped.groups[0].aliases.length,2);assert.equal('text' in grouped.groups[0],false);
  assert.equal(grouped.summary.deferredFileGroups,1);assert.equal(grouped.summary.bodyVerificationCompleteAtGrouping,false);assert.equal(grouped.summary.verifiedUniqueUtf8Bytes,0);
  const loaded=await loadSourceText(grouped.groups[0],{corpusDirectory:f.dir});assert.equal(loaded.text,'Invented source material.');
});
