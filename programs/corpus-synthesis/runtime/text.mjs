/** Pure ES2022 text primitives. Offsets always address the unchanged JS source string. */
const encoder=new TextEncoder();
const K=Uint32Array.from([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
const rotr=(v,n)=>(v>>>n)|(v<<(32-n));
/** Standard SHA-256 over UTF-8 of the exact supplied text; no source normalization. */
export function sha256(text){
  if(typeof text!=='string')throw Error('HASH_TEXT_REQUIRED');
  const input=encoder.encode(text),length=input.length,bytes=new Uint8Array(Math.ceil((length+9)/64)*64);
  bytes.set(input);bytes[length]=0x80;const view=new DataView(bytes.buffer);
  view.setUint32(bytes.length-8,Math.floor(length/0x20000000));view.setUint32(bytes.length-4,(length*8)>>>0);
  const h=Uint32Array.from([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]),w=new Uint32Array(64);
  for(let offset=0;offset<bytes.length;offset+=64){
    for(let i=0;i<16;i++)w[i]=view.getUint32(offset+i*4);
    for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];w[i]=(w[i-16]+(rotr(a,7)^rotr(a,18)^(a>>>3))+w[i-7]+(rotr(b,17)^rotr(b,19)^(b>>>10)))>>>0;}
    let [a,b,c,d,e,f,g,j]=h;
    for(let i=0;i<64;i++){const t1=(j+(rotr(e,6)^rotr(e,11)^rotr(e,25))+((e&f)^(~e&g))+K[i]+w[i])>>>0;
      const t2=((rotr(a,2)^rotr(a,13)^rotr(a,22))+((a&b)^(a&c)^(b&c)))>>>0;
      j=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
    for(const [i,value]of [a,b,c,d,e,f,g,j].entries())h[i]=(h[i]+value)>>>0;
  }
  return Array.from(h,v=>v.toString(16).padStart(8,'0')).join('');
}
export function canonical(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
}
const STOP=new Set('a an the and or of to in for on with by at from is are was were be been being as this that these those it its we you your our their they he she i me my us please find show what which who where when how about'.split(' '));
export const normalize=value=>value.normalize('NFKC').toLowerCase();
export function tokens(text,{stop=true}={}){return (normalize(text).match(/[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*/gu)||[]).filter(t=>t.length>1&&(!stop||!STOP.has(t)));}
export function trigrams(text){const chars=Array.from('^'+normalize(text)+'$'),result=new Set();for(let i=0;i+2<chars.length;i++)result.add(chars.slice(i,i+3).join(''));return result;}
export function trigramSimilarity(a,b){const x=typeof a==='string'?trigrams(a):a,y=typeof b==='string'?trigrams(b):b;if(!x.size||!y.size)return 0;let both=0;for(const t of x)if(y.has(t))both++;return 2*both/(x.size+y.size);}
/** Bounded Levenshtein distance is a spelling check, never a synonym assertion. */
export function editDistanceAtMost(a,b,max=1){
  const x=Array.from(a),y=Array.from(b);if(Math.abs(x.length-y.length)>max)return false;
  let previous=Array.from({length:y.length+1},(_,i)=>i);
  for(let i=1;i<=x.length;i++){const current=[i];let minimum=i;
    for(let j=1;j<=y.length;j++){current[j]=Math.min(current[j-1]+1,previous[j]+1,previous[j-1]+(x[i-1]===y[j-1]?0:1));minimum=Math.min(minimum,current[j]);}
    if(minimum>max)return false;previous=current;
  }
  return previous[y.length]<=max;
}
function safeEnd(text,end){return end>0&&end<text.length&&/[\uD800-\uDBFF]/.test(text[end-1])&&/[\uDC00-\uDFFF]/.test(text[end])?end-1:end;}
/** Sentence/paragraph boundaries are preferred; overlong sentences use an explicit bounded hard split. */
export function chunkOffsets(text,{targetChars=900,maxChars=1600}={}){
  if(typeof text!=='string'||!Number.isSafeInteger(targetChars)||!Number.isSafeInteger(maxChars)||targetChars<32||maxChars<targetChars)throw Error('CHUNK_OPTIONS_INVALID');
  if(!text.length)return[];
  const boundaries=[];const re=/[.!?。！？]["'”’\])}]*[ \t\r\n]+|\n[ \t]*\n+/gu;let m;
  while((m=re.exec(text)))boundaries.push(m.index+m[0].length);
  if(boundaries.at(-1)!==text.length)boundaries.push(text.length);
  const chunks=[];let start=0,bi=0;
  while(start<text.length){while(boundaries[bi]<=start)bi++;let end=null,kind='SENTENCE_BOUNDARY';
    for(let j=bi;j<boundaries.length&&boundaries[j]<=start+maxChars;j++){end=boundaries[j];if(end-start>=targetChars)break;}
    if(end===null){end=safeEnd(text,Math.min(text.length,start+maxChars));const floor=start+Math.floor(targetChars*.65);
      let split=end;while(split>floor&&!/\s/u.test(text[split-1]))split--;
      if(split>floor)end=split;kind='OVERLONG_SENTENCE_SPLIT';}
    if(end<=start)end=Math.min(text.length,start+maxChars);
    chunks.push({start,end,boundary:kind});start=end;
  }
  return chunks;
}
/** Alias candidates must be visibly stated in source, and acronym initials must match. */
export function deriveAliases(text,documentId,sourceId){
  const out=[],re=/([\p{L}][\p{L}\p{N}'’ -]{2,160})\s*\(([A-Z][A-Z0-9-]{1,11})\)/gu;let match;
  while((match=re.exec(text))&&out.length<128){const words=Array.from(match[1].matchAll(/[\p{L}\p{N}]+/gu));const acronym=match[2].replace(/-/g,'');
    for(let count=2;count<=Math.min(12,words.length);count++){const part=words.slice(-count);
      if(part.map(x=>x[0][0]).join('').toUpperCase()!==acronym)continue;
      const start=match.index+part[0].index,end=match.index+match[0].length;
      out.push({term:match[2],expansion:text.slice(start,match.index+match[1].length).trim(),documentId,sourceId,start,end,
        quote:text.slice(start,end),basis:'EXPLICIT_SOURCE_ACRONYM'});break;}
  }
  return out;
}
