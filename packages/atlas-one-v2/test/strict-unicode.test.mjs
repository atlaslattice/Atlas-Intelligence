import test from 'node:test';
import assert from 'node:assert/strict';
import {parseStrictJson,Hold} from '../src/index.mjs';

const fails=(raw,code)=>assert.throws(()=>parseStrictJson(raw),e=>e instanceof Hold && e.code===code);

test('reject invalid UTF-8 single byte',()=>fails(Buffer.from([123,34,120,34,58,34,255,34,125]),'INVALID_UTF8_BYTES'));
test('reject UTF-8 truncated multi-byte sequence',()=>fails(Buffer.from([123,34,120,34,58,34,226,130,34,125]),'INVALID_UTF8_BYTES'));
test('reject overlong UTF-8 sequence',()=>fails(Buffer.from([123,34,120,34,58,34,192,175,34,125]),'INVALID_UTF8_BYTES'));
test('reject unpaired high JSON surrogate',()=>fails('{"x":"\\ud800"}','INVALID_UNICODE_SCALAR'));
test('reject unpaired low JSON surrogate',()=>fails('{"x":"\\udc00"}','INVALID_UNICODE_SCALAR'));
test('reject unpaired surrogate in JSON key',()=>fails('{"\\ud800":"synthetic"}','INVALID_UNICODE_SCALAR'));
test('reject nested unpaired surrogate',()=>fails('{"x":["\\ud800"]}','INVALID_UNICODE_SCALAR'));
test('reject literal lone surrogate',()=>fails('{"x":"\ud800"}','INVALID_UNICODE_SCALAR'));
test('accept paired escaped emoji',()=>assert.equal(parseStrictJson('{"x":"\\ud83d\\ude80"}').x,'🚀'));
test('accept valid literal emoji',()=>assert.equal(parseStrictJson('{"x":"🚀"}').x,'🚀'));
test('accept explicit replacement character',()=>assert.equal(parseStrictJson(Buffer.from('{"x":"�"}')).x,'�'));
test('reject UTF-8 BOM as historical parser did',()=>assert.throws(()=>parseStrictJson(Buffer.from([239,187,191,123,125])),e=>e instanceof Hold));
test('retain existing NFC-duplicate key denial',()=>fails('{"e\\u0301":1,"\\u00e9":2}','DUPLICATE_OR_UNICODE_ALIAS_KEY'));
test('retain byte size cap',()=>assert.throws(()=>parseStrictJson(Buffer.from('{"x":"synthetic"}'),{maxBytes:8}),e=>e instanceof Hold && e.code==='JSON_SIZE_LIMIT'));
test('accept safe numeric JSON',()=>assert.equal(parseStrictJson('{"value":123}').value,123));
