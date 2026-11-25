import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {originalAddresses} from '../src/geometry.mjs';import {encodeYijing,CUPWAKE_EDITION,SYMBIOSIS_EDITION} from '../src/yijing-cymatic.mjs';
const doc=readFileSync(new URL('../public/Atlas_Indra_Yijing_Cymatic_Observatory_MT02.html',import.meta.url),'utf8');
const match=/const DATA=(\[\[.*?\]\]);\nconst byId=/s.exec(doc);const data=match?JSON.parse(match[1]):[];
test('offline observatory embeds 1,728 original coordinate rows with both editions exactly',()=>{
 assert.equal(data.length,1728);for(let i=0;i<1728;i++){
  const [hsn,c,t,p,pt]=data[i];assert.equal(hsn,originalAddresses[i]);
  const a=encodeYijing(hsn,CUPWAKE_EDITION),b=encodeYijing(hsn,SYMBIOSIS_EDITION);
  assert.deepEqual([c,t,p,pt],[a.hexagramCode,a.contextCode,b.hexagramCode,b.contextCode]);
 }
});
test('no model/proxy/network/automatic authority in offline explorer',()=>{
 assert.equal(doc.includes('fetch('),false);assert.equal(doc.includes('<script src='),false);
 assert.equal(doc.includes('localStorage.'),false);assert.ok(doc.includes('no live model')||doc.includes('no live model or permissions'));
 assert.ok(doc.includes('symbolic'));assert.ok(doc.includes('calibrated'));
});
