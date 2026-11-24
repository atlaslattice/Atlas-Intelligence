import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {resolveCorpusFile} from './text-files.mjs';

const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
function descriptor(value){need(value&&typeof value.path==='string'&&/^[a-f0-9]{64}$/.test(value.sha256??'')&&Number.isSafeInteger(value.count)&&value.count>=0&&Number.isSafeInteger(value.bytes)&&value.bytes>=0,'DOCUMENTS_FILE_DESCRIPTOR_INVALID');return value;}
const inputStream=file=>fs.createReadStream(file,{highWaterMark:128*1024,flags:fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0)});

/** The callback receives one metadata row at a time; body strings are forbidden in this v3 path. */
export async function streamDocumentsMetadata(value,{corpusDirectory,onDocument,maxLineChars=16000000}={}) {
  const d=descriptor(value),file=resolveCorpusFile(corpusDirectory,d.path);
  need(typeof onDocument==='function','DOCUMENT_METADATA_CALLBACK_REQUIRED');need(Number.isSafeInteger(maxLineChars)&&maxLineChars>0,'DOCUMENT_LINE_BOUND_INVALID');
  const hash=createHash('sha256'),decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});let bytes=0,count=0,pending='';
  const accept=async text=>{pending+=text;let newline;
    while((newline=pending.indexOf('\n'))>=0){const line=pending.slice(0,newline);pending=pending.slice(newline+1);if(!line.trim())continue;
      need(line.length<=maxLineChars,'DOCUMENT_METADATA_LINE_BOUND');const row=JSON.parse(line);need(row&&typeof row==='object'&&!Array.isArray(row)&&!Object.hasOwn(row,'text'),'DOCUMENTS_FILE_MUST_BE_METADATA_ONLY');
      await onDocument(row);count++;}
    need(pending.length<=maxLineChars,'DOCUMENT_METADATA_LINE_BOUND');};
  for await(const chunk of inputStream(file)){bytes+=chunk.length;hash.update(chunk);await accept(decoder.decode(chunk,{stream:true}));}
  await accept(decoder.decode());if(pending.trim())await accept('\n');
  const sha256=hash.digest('hex');need(sha256===d.sha256,'DOCUMENTS_FILE_DIGEST_MISMATCH');need(bytes===d.bytes,'DOCUMENTS_FILE_BYTES_MISMATCH');need(count===d.count,'DOCUMENTS_FILE_COUNT_MISMATCH');
  return{path:d.path,sha256,bytes,count,metadataOnly:true,identityVerified:true,maxLineChars};
}

/** A final byte pass binds a long classification run to the same metadata input. */
export async function verifyDocumentsFileUnchanged(value,{corpusDirectory}={}) {
  const d=descriptor(value),file=resolveCorpusFile(corpusDirectory,d.path),hash=createHash('sha256');let bytes=0;
  for await(const chunk of inputStream(file)){bytes+=chunk.length;hash.update(chunk);}
  need(bytes===d.bytes&&hash.digest('hex')===d.sha256,'DOCUMENTS_FILE_CHANGED_DURING_RUN');
  return{unchanged:true,sha256:d.sha256,bytes,count:d.count};
}
