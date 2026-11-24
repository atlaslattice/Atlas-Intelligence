import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {sha256,chunkOffsets,deriveAliases} from '../runtime/text.mjs';

test('portable SHA-256 agrees with Node crypto over padding boundaries and Unicode',()=>{
 const samples=['','a','abc','The quick brown fox jumps over the lazy dog','🧵\r\nnaïve café \u0000 e\u0301','\ud800','\udc00'];
 for(const n of [55,56,57,63,64,65,119,120,127,128,129,255,256,257,1023,1024,4095,4096,65535])samples.push('x'.repeat(n));
 let value=0x1728144;for(let i=0;i<128;i++){let s='';const n=(i*73)%1500;for(let j=0;j<n;j++){value=(Math.imul(value,1664525)+1013904223)>>>0;s+=String.fromCodePoint(value%0x110000);}samples.push(s);}
 for(const text of samples)assert.equal(sha256(text),createHash('sha256').update(text,'utf8').digest('hex'));
});
test('source chunks partition original UTF-16 text exactly without cutting surrogate pairs',()=>{
 for(const text of ['Hi. 🧵 This is sentence two.\n\nThree.','🧵'.repeat(2400),'x'.repeat(5000),'a\r\nb\r\nc '.repeat(800),'e\u0301'.repeat(5000)]){
  const chunks=chunkOffsets(text,{targetChars:64,maxChars:128});assert.equal(chunks.map(c=>text.slice(c.start,c.end)).join(''),text);assert.equal(chunks[0].start,0);assert.equal(chunks.at(-1).end,text.length);
  for(let i=0;i<chunks.length;i++){const c=chunks[i];assert.ok(c.end>c.start);assert.ok(c.end-c.start<=128);if(i)assert.equal(c.start,chunks[i-1].end);if(c.end<text.length)assert.ok(!(/[\uD800-\uDBFF]/.test(text[c.end-1])&&/[\uDC00-\uDFFF]/.test(text[c.end])));}
 }
});
test('acronym aliases require corresponding source words and preserve original quote spans',()=>{
 const text='The Reciprocal Rank Fusion (RRF) method combines rankings. Invented Name (SECRET) is not its acronym.';
 const aliases=deriveAliases(text,'fixture','source-fixture');assert.ok(aliases.some(a=>a.term==='RRF'&&a.expansion==='Reciprocal Rank Fusion'));assert.ok(!aliases.some(a=>a.term==='SECRET'));
 for(const a of aliases)assert.equal(text.slice(a.start,a.end),a.quote);
});
