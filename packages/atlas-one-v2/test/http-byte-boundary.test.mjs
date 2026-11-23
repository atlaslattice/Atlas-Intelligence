import test from 'node:test';import assert from 'node:assert/strict';
import {request as httpRequest} from 'node:http';
import {createLocalPreviewServer,listenLocal} from '../src/http.mjs';
import {AriadneRegistry,parseStrictJson,Hold} from '../src/index.mjs';
const invalid=Buffer.concat([Buffer.from('{"title":"'),Buffer.from([0xff]),Buffer.from('"}')]);
const unicode=Buffer.from('{"title":"🪿"}');
const oldDecoded=Buffer.concat([Buffer.from('{"title":"'),Buffer.from([0xf0,0x9f]),Buffer.from([0xaa,0xbf]),Buffer.from('"}')]).toString('utf8');
async function post(chunks){const server=createLocalPreviewServer({registry:Object.create(AriadneRegistry.prototype)});const where=await listenLocal(server);try{return await new Promise((resolve,reject)=>{const r=httpRequest({host:'127.0.0.1',port:where.port,path:'/v2/research/preview',method:'POST',headers:{'content-type':'application/json'}},res=>{const a=[];res.on('data',v=>a.push(v));res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(a).toString())}))});r.on('error',reject);for(const c of chunks)r.write(c);r.end()})}finally{await new Promise(ok=>server.close(ok))}}
test('strict parser refuses invalid octet, not replacement',()=>assert.throws(()=>parseStrictJson(invalid),e=>e.code==='INVALID_UTF8_BYTES'));
test('formerly lossy decoder accepts replacement; negative fixture confirmed',()=>{const s=invalid.toString('utf8');assert.ok(s.includes('\uFFFD'));assert.equal(JSON.parse(s).title,'\uFFFD')});
test('valid emoji split bytes recover with one decode',()=>{const a=unicode.subarray(0,11),b=unicode.subarray(11);assert.equal(parseStrictJson(Buffer.concat([a,b])).title,'🪿');});
test('local server holds invalid UTF-8 before source preparation',async()=>{const r=await post([invalid.subarray(0,10),invalid.subarray(10)]);assert.equal(r.status,400);assert.equal(r.body.reason,'INVALID_UTF8_BYTES')});
test('local server parses valid split emoji, then holds unreviewed source',async()=>{const r=await post([Buffer.from('{"title":"'),Buffer.from([0xf0,0x9f]),Buffer.from([0xaa,0xbf]),Buffer.from('"}')]);assert.equal(r.status,400);assert.notEqual(r.body.reason,'INVALID_UTF8_BYTES')});
test('large raw body returns HTTP 413',async()=>{const r=await post([Buffer.alloc(65537,0x41)]);assert.equal(r.status,413);assert.equal(r.body.reason,'REQUEST_TOO_LARGE')});
