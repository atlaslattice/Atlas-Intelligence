import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const inside=(root,target)=>target===root||target.startsWith(root+path.sep);

export function resolveCorpusFile(corpusDirectory,supplied) {
  need(typeof supplied==='string','TEXT_FILE_PATH_REQUIRED');
  const root=fs.realpathSync(corpusDirectory);
  need(!path.isAbsolute(supplied),'TEXT_FILE_PATH_MUST_BE_RELATIVE');
  const requested=path.resolve(root,supplied);need(inside(root,requested),'TEXT_FILE_PATH_OUTSIDE_CORPUS');
  // Refuse symlink traversal even when its destination would happen to be inside the corpus.
  let cursor=root;for(const part of path.relative(root,requested).split(path.sep)){cursor=path.join(cursor,part);need(!fs.lstatSync(cursor).isSymbolicLink(),'TEXT_FILE_SYMLINK_FORBIDDEN');}
  const resolved=fs.realpathSync(requested);need(inside(root,resolved),'TEXT_FILE_PATH_OUTSIDE_CORPUS');
  need(fs.statSync(resolved).isFile(),'TEXT_FILE_REGULAR_FILE_REQUIRED');
  return resolved;
}

/** Read one immutable UTF-8 body. Oversize content is counted/hashed but never retained or partly classified. */
export async function loadSourceText(group,{corpusDirectory,maxChars=64000000}={}) {
  need(Number.isSafeInteger(maxChars)&&maxChars>=1,'TEXT_CHARACTER_BOUND_INVALID');
  need(group?.textFile&&typeof group.textFile.path==='string'&&/^[a-f0-9]{64}$/.test(group.sourceSha256??''),'TEXT_FILE_DESCRIPTOR_REQUIRED');
  const resolved=resolveCorpusFile(corpusDirectory,group.textFile.path);
  const digest=createHash('sha256'),decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
  let bytes=0,utf16Chars=0,codepoints=0,oversize=false,chunks=[],decodeFailure=false;
  const accept=text=>{utf16Chars+=text.length;for(const ignored of text)codepoints++;
    if(utf16Chars>maxChars){oversize=true;chunks=[];}else if(!oversize)chunks.push(text);};
  const stream=fs.createReadStream(resolved,{highWaterMark:128*1024,flags:fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0)});
  for await(const chunk of stream){bytes+=chunk.length;digest.update(chunk);if(!decodeFailure)try{accept(decoder.decode(chunk,{stream:true}));}catch{decodeFailure=true;chunks=[];}}
  if(!decodeFailure)try{accept(decoder.decode());}catch{decodeFailure=true;chunks=[];}
  const actualSha256=digest.digest('hex'),verified=actualSha256===group.sourceSha256;
  const unitValue=group.textFile.charsUnit??group.textFile.charUnit??'UNSPECIFIED';
  const normalizedUnit=typeof unitValue==='string'?unitValue.toUpperCase().replace(/[-_ ]/g,''):'';
  const unitCount=['UTF16','UTF16CODEUNITS'].includes(normalizedUnit)?utf16Chars:
    ['CODEPOINTS','UNICODECODEPOINTS'].includes(normalizedUnit)?codepoints:null;
  const declaredChars=group.textFile.chars??null,hasDeclaredCount=declaredChars!==null;
  const countVerified=!decodeFailure&&unitCount!==null&&hasDeclaredCount&&Number.isSafeInteger(declaredChars)&&declaredChars===unitCount;
  const accounting={bytes,utf16Chars:decodeFailure?null:utf16Chars,codepoints:decodeFailure?null:codepoints,
    declaredBytes:group.textFile.bytes??null,declaredChars,declaredCharUnit:unitValue,declaredCharsVerified:countVerified,
    fullByteStreamRead:true,sourceDigestVerified:verified,utf8Valid:!decodeFailure,scanTruncated:false};
  if(!verified)return{status:'SOURCE_DIGEST_HOLD',text:null,actualSha256,accounting};
  if(group.textFile.bytes!==undefined&&group.textFile.bytes!==bytes)return{status:'SOURCE_METADATA_SIZE_HOLD',text:null,accounting};
  if(decodeFailure)return{status:'SOURCE_UNICODE_HOLD',text:null,accounting};
  if(hasDeclaredCount&&unitCount!==null&&!countVerified)return{status:'SOURCE_METADATA_CHARACTER_COUNT_HOLD',text:null,accounting};
  if(oversize)return{status:'SOURCE_SIZE_HOLD',text:null,accounting};
  return{status:'TEXT_READY',text:chunks.join(''),accounting};
}
