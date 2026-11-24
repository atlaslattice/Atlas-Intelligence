import {requireValue, shape, text, id, array, unique, snapshot, opaqueStore, seeded} from './b-support.mjs';

export const descriptor=Object.freeze({houseId:'H08',sphereId:'H08.S04',service:'typed_language_and_glyph_parser',contractVersion:'1',outputBoundBytes:786432,scope:'Lossless lexicon tokenization; lexical meanings remain candidates, with ambiguity retained. Oversized expanded output is refused without truncation.'});
const store=opaqueStore('H08');
const encoder=new TextEncoder();
function validate(data){
  const d=snapshot(data);shape(d,['grammarVersion','namespace','lexicon'],'dataset');id(d.grammarVersion);id(d.namespace);array(d.lexicon,'lexicon',4096,1);
  const surfaces=new Set();
  for(const entry of d.lexicon){shape(entry,['surface','type','meanings'],'lexicon entry');text(entry.surface,'surface',64);id(entry.type);unique(entry.meanings,'meanings',32,text);requireValue(entry.meanings.length>0&&!surfaces.has(entry.surface),'Duplicate or meaningless lexicon entry');surfaces.add(entry.surface);}
  return d;
}
function input(request,d){const r=snapshot(request);shape(r,['text','grammarVersion','namespace'],'request');requireValue(typeof r.text==='string'&&r.text.length<=32768,'Text exceeds parser bound');requireValue(r.grammarVersion===d.grammarVersion&&r.namespace===d.namespace,'Grammar or namespace differs from prepared edition');return r.text;}
function token(entry,surface,start,end){return {surface,start,end,type:entry?entry.type:'UNKNOWN',meanings:entry?[...entry.meanings]:[],ambiguous:Boolean(entry&&entry.meanings.length>1),semanticStatus:entry?'LEXICON_CANDIDATE':'UNRESOLVED'};}
function result(d,tokens){return {grammarVersion:d.grammarVersion,namespace:d.namespace,tokens,lossless:true,semanticCertaintyClaimed:false};}
function collector(d){const tokens=[];let bytes=encoder.encode(JSON.stringify(result(d,[]))).byteLength;return {tokens,push(value){const additional=encoder.encode(JSON.stringify(value)).byteLength+(tokens.length?1:0);requireValue(bytes+additional<=descriptor.outputBoundBytes,'Parser output exceeds 786432-byte bound');bytes+=additional;tokens.push(value);}};}
function slow(d,request){const source=input(request,d),out=collector(d);let pos=0;while(pos<source.length){let best=null;for(const entry of d.lexicon)if(source.startsWith(entry.surface,pos)&&(!best||entry.surface.length>best.surface.length))best=entry;const surface=best?best.surface:String.fromCodePoint(source.codePointAt(pos));out.push(token(best,surface,pos,pos+surface.length));pos+=surface.length;}return result(d,out.tokens);}
export function prepare(data){const d=validate(data),trie={next:new Map(),entry:null};for(const entry of d.lexicon){let node=trie;for(const point of entry.surface){if(!node.next.has(point))node.next.set(point,{next:new Map(),entry:null});node=node.next.get(point);}node.entry=entry;}return store.put({d,trie});}
export function reference(data,request){return slow(validate(data),request);}
export function referenceQuery(prepared,request){return slow(store.get(prepared).d,request);}
export function query(prepared,request){const {d,trie}=store.get(prepared),source=input(request,d),out=collector(d);let pos=0;while(pos<source.length){let cursor=pos,node=trie,best=null,end=pos;while(cursor<source.length){const point=String.fromCodePoint(source.codePointAt(cursor));node=node.next.get(point);if(!node)break;cursor+=point.length;if(node.entry){best=node.entry;end=cursor;}}if(!best)end=pos+String.fromCodePoint(source.codePointAt(pos)).length;out.push(token(best,source.slice(pos,end),pos,end));pos=end;}return result(d,out.tokens);}
export function fixture(seed=1,size=256){const random=seeded(seed,size),lexicon=Array.from({length:size},(_,i)=>({surface:'g'+i+'λ',type:'SYMBOL',meanings:i%37===0?['meaning'+i,'alternative'+i]:['meaning'+i]}));const dataset={grammarVersion:'g1',namespace:'synthetic',lexicon};const requests=Array.from({length:16},(_,j)=>({grammarVersion:'g1',namespace:'synthetic',text:Array.from({length:12},()=>lexicon[random(size)].surface).join(' ')+(j%4===0?' 🪿':'')}));return {dataset,requests};}
